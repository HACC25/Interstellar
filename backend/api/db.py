from typing import Optional

import lancedb
from lancedb.embeddings import get_registry, EmbeddingFunction
from lancedb import DBConnection

from backend.api.models import UHCourse
from backend.api.settings import settings

from models import DegreePathway

_db = lancedb.connect(settings.lancedb_storage_path)
_func = get_registry().get("openai").create()

# print(_func.generate_embeddings(["hello"]))

from lancedb.pydantic import LanceModel, Vector

class DegreePathwayLance(LanceModel):
    pathway_id: str
    text: str = _func.SourceField()
    vector: Vector(_func.ndims()) = _func.VectorField()

class PathwayVectorDb:
    def __init__(self, db: DBConnection, func: EmbeddingFunction):
        self.db = db
        self.func = func

    def get_similar_pathways(self, query: str) -> list[DegreePathway]:
        table = self.db.open_table("pathways")
        results = table.search(query).limit(3).to_pydantic(DegreePathwayLance)
        return [DegreePathway.model_validate_json(r.text) for r in results]

def get_pathway_db() -> PathwayVectorDb:
    return PathwayVectorDb(_db, _func)

class UHCourseLance(UHCourse, LanceModel):
    text: str = _func.SourceField()
    vector: Vector(_func.ndims()) = _func.VectorField()

class UHCourseAdd(UHCourse):
    text: str

def course_to_lance(course: UHCourse) -> UHCourseLance:
    return UHCourseAdd(**course.model_dump(), text=course.model_dump_json(indent=2))

class CourseVectorDb:
    def __init__(self, db: DBConnection, func: EmbeddingFunction):
        self.db = db
        self.func = func

        if "courses" not in self.db.table_names():
            self.db.create_table("courses", schema=UHCourseLance)
            print("Created Course Vector DB")

    def get_similar_courses(
            self,
            query: str,
            *,
            course_credits: Optional[float] = None,
            course_prefix: Optional[str] = None,
            course_number: Optional[int] = None,
            designation: Optional[list[str]] = None,
            limit: int = 10,
    ) -> list[UHCourse]:
        """
        Vector search by `query` (required) with optional structured filters.

        Args:
            query: Free-text semantic query (required).
            course_credits: If provided, matches courses whose [min, max] credit range covers this number.
            course_prefix: Exact match on course_prefix (e.g., "ICS").
            course_number: Exact match on course_number (e.g., "111").
            designation: Extra keywords to *bias* the embedding (e.g., ["ethics", "writing intensive"]).
            limit: Max results to return (default: 10).

        Returns:
            A list[UHCourse] ranked by vector similarity, pre-filtered if filters are supplied.
        """
        table = self.db.open_table("courses")

        # Enrich the semantic query with any designation keywords to steer the embedding.
        enriched_query = " ".join([query, *designation]) if designation else query

        q = table.search(enriched_query, query_type="vector")

        # Build optional WHERE filters
        where_clauses: list[str] = []

        def esc(val: str) -> str:
            # naive SQL-literal escape for single quotes in string filters
            return val.replace("'", "''").strip()

        if course_prefix:
            where_clauses.append(f"course_prefix = '{esc(course_prefix)}'")
        if course_number:
            where_clauses.append(f"course_number = {course_number}")
        if course_credits is not None:
            # Match any course whose normalized range [min, max] includes the given credit value.
            c = float(course_credits)
            where_clauses.append(f"num_units.min <= {c} AND num_units.max >= {c}")

        if where_clauses:
            q = q.where(" AND ".join(where_clauses))

        # Try vector search first
        results = q.limit(limit).to_pydantic(UHCourseLance)

        # Fallback: if nothing found via vector search, try text search (helps when the vector index is cold/empty)
        if not results:
            results = table.search(enriched_query).limit(limit).to_pydantic(UHCourseLance)

        # Reconstruct clean UHCourse objects from the stored JSON payload
        return [UHCourse.model_validate_json(r.text) for r in results]

    def clear(self):
        self.db.drop_table("courses")

    def add_courses(self, courses: list[UHCourse], chunk_size: int = 1000):
        chunks = [courses[i:i + chunk_size] for i in range(0, len(courses), chunk_size)]
        table = self.db.open_table("courses")
        for chunk in chunks:
            table.add([course_to_lance(c).model_dump() for c in chunk])
            print(".", end="")
        print()

def get_course_db() -> CourseVectorDb:
    return CourseVectorDb(_db, _func)