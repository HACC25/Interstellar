from backend.api.db import get_course_db, get_pathway_db
from backend.api.llm import get_query_builder
from backend.api.models import CompleteDegreePathway, DegreePathway, UHCoursePlan

class DegreePathwayPredictor:
    def __init__(self):
        self._course_db = get_course_db()
        self._pathway_db = get_pathway_db()
        self._query_builder = get_query_builder()

    async def predict(self, query: str) -> CompleteDegreePathway:
        pathways = self._pathway_db.get_similar_pathways(query=query)
        return await self._complete_pathway(query, pathways)

    async def _complete_pathway(self, query: str, pathways: list[DegreePathway]) -> CompleteDegreePathway:
        pathway = pathways[0]
        base = pathway.model_dump()

        completed_years: list[dict] = []

        course_names: list[str] = []
        for y in pathway.years:
            for s in y.semesters:
                for c in s.courses:
                    course_names.append(c.name)

        course_queries = await self._query_builder.build_queries(course_names)

        i = 0
        for year in pathway.years:
            completed_semesters: list[dict] = []

            for sem in year.semesters:
                completed_courses: list[dict] = []

                for c in sem.courses:
                    courses = self._course_db.query(text=query, query=course_queries[i], pathway_course=c)
                    i += 1

                    course = UHCoursePlan(**courses[0].model_dump(), candidates=courses)

                    completed_courses.append(course.model_dump())

                completed_semesters.append(
                    {
                        "semester_name": sem.semester_name,
                        "credits": sem.credits,
                        "courses": completed_courses,
                    }
                )

            completed_years.append(
                {
                    "year_number": year.year_number,
                    "semesters": completed_semesters,
                }
            )

        # Replace years with the completed structure
        base["years"] = completed_years
        base["candidates"] = [c.program_name for c in pathways]

        # Re-validate as CompleteDegreePathway (this will build all nested models)
        return CompleteDegreePathway.model_validate(base)

def get_degree_pathway_predictor():
    return DegreePathwayPredictor()
