import lancedb
from lancedb.embeddings import get_registry, EmbeddingFunction
from lancedb import DBConnection

from backend.api.models import UHCourse
from backend.api.settings import settings

from models import DegreePathway

_db = lancedb.connect(settings.lancedb_storage_path)
_func = get_registry().get("openai").create()

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

class CourseVectorDb:
    def __init__(self, db: DBConnection, func: EmbeddingFunction):
        self.db = db
        self.func = func

    def get_similar_courses(self, query: str) -> list[UHCourse]:
        table = self.db.open_table("courses")
        results = table.search(query).limit(3).to_pydantic(DegreePathwayLance)

    def clear(self):
        self.db.drop_table("courses")

    def add_courses(self, courses: list[UHCourse]):
        self.db.create_table()

    # def populate(self, list[UHCourse]):

def get_course_db() -> CourseVectorDb:
    return CourseVectorDb(_db, _func)