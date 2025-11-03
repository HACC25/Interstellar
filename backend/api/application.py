from backend.api.db import get_course_db, get_pathway_db
from backend.api.models import CompleteDegreePathway, DegreePathway, UHCoursePlan, DegreePathways


class DegreePathwayPredictor:
    def __init__(self):
        self._course_db = get_course_db()
        self._pathway_db = get_pathway_db()

    def predict(self, query: str) -> CompleteDegreePathway:
        pathways = self._pathway_db.get_similar_pathways(query=query)
        return self._complete_pathway(query, pathways)

    def _complete_pathway(self, query: str, pathways: list[DegreePathway]) -> CompleteDegreePathway:
        pathway = pathways[0]
        base = pathway.model_dump()

        completed_years: list[dict] = []

        for year in pathway.years:
            completed_semesters: list[dict] = []

            for sem in year.semesters:
                completed_courses: list[dict] = []

                for c in sem.courses:
                    courses = self._course_db.query(query=query, pathway_course=c)
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