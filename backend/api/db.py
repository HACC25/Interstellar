from typing import Optional

import lancedb
from lancedb.embeddings import get_registry, EmbeddingFunction
from lancedb import DBConnection

from backend.api.llm import get_query_builder_agent
from backend.api.models import UHCourse, PathwayCourse, CourseQuery, CourseQueryBase
from backend.api.settings import settings

from backend.api.models import DegreePathway

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
        results = table.search(query).limit(8).to_pydantic(DegreePathwayLance)
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

    def query(self, text: str, query: CourseQueryBase, pathway_course: PathwayCourse, k: int = 10, n: int = 1):
        # return self.get_similar_courses(query=CourseQuery(course_number_gte=100, k=k, n=n))

        # agent = get_query_builder_agent()
        query_base: CourseQueryBase = query

        query = CourseQuery(
            subject_code=query_base.subject_code,
            course_number=query_base.course_number,
            course_number_gte=query_base.course_number_gte,
            course_suffix=query_base.course_suffix,
            designations=query_base.designations,
            query=text,
            credits=pathway_course.credits,
            k=k,
            n=n,
        )
        # print(query)
        # print(query.model_dump_json(indent=2))

        return self.get_similar_courses(query=query)

    def get_similar_courses(self, query: CourseQuery) -> list[UHCourse]:
        table = self.db.open_table("courses")
        q = None

        if query.query:
            q = table.search(query.query, query_type="vector")
        else:
            q = table.search()

        wheres: list[str] = []
        if query.credits:
            wheres.append(f"num_units.min <= {query.credits} AND num_units.max >= {query.credits}")
        if query.subject_code:
            wheres.append(f"subject_code = '{query.subject_code}'")
        if query.course_number:
            wheres.append(f"course_number = {query.course_number}")
        if query.course_number_gte:
            wheres.append(f"course_number >= {query.course_number_gte}")
        if query.course_suffix:
            wheres.append(f"course_suffix = '{query.course_suffix}'")
        if query.designations:
            lits = ", ".join(f"'{s}'" for s in query.designations)
            wheres.append(f"array_has_any(designations, [{lits}])")
        where_clause = " AND ".join(wheres)
        q = q.where(where_clause)

        k = query.k or 10
        results = q.limit(k).to_pydantic(UHCourseLance)

        return [UHCourse.model_validate_json(r.model_dump_json(), extra="ignore") for r in results]

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