import asyncio
from backend.api.llm import get_query_builder
from backend.api.models import CourseQueryBase
from models import DegreePathways
from pydantic import BaseModel

class Query(BaseModel):
    name: str
    course_query: CourseQueryBase

class Queries(BaseModel):
    queries: list[Query]

with open("../data/manoa_degree_pathways_formatted.json", "r") as f:
    pathways_json = f.read()
pathways = DegreePathways.model_validate_json(pathways_json)

with open("../data/queries.json", "r") as f:
    queries_json = f.read()
queries = Queries.model_validate_json(queries_json)

names = set()

for pathway in pathways.root:
    for year in pathway.years:
        for semester in year.semesters:
            for course in semester.courses:
                names.add(course.name)

names = list(names)

query_builder = get_query_builder()


queries = asyncio.run(query_builder.build_queries(names, batch_size=100))

all_queries = []
for name, query in zip(names, queries):
    all_queries.append(Query(name=name, course_query=query))

q = Queries(queries=all_queries)

