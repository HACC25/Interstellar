import asyncio
import uuid

from backend.api.db import get_course_db, get_pathway_db
from backend.api.llm import get_query_builder, agent
from backend.api.models import (
    CompleteDegreePathway,
    DegreePathway,
    PathwayCourse,
    UHCoursePlan,
    CreditsRange,
)

class DegreePathwayPredictor:
    def __init__(self):
        self._course_db = get_course_db()
        self._pathway_db = get_pathway_db()
        self._query_builder = get_query_builder()

    async def predict(self, query: str) -> CompleteDegreePathway:
        pathways = self._pathway_db.get_similar_pathways(query=query)
        return await self._complete_pathway(query, pathways)

    async def predict_by_pathway_id(self, pathway_id: str, query: str) -> CompleteDegreePathway:
        pathway = self._pathway_db.get_pathway(pathway_id)
        if pathway is None:
            raise ValueError(f"Pathway '{pathway_id}' not found")

        similar = self._pathway_db.get_similar_pathways(query=query)
        combined_pathways: list[DegreePathway] = [pathway]
        combined_pathways.extend(p for p in similar if p.pathway_id != pathway.pathway_id)

        return await self._complete_pathway(query, combined_pathways)

    async def _complete_pathway(self, query: str, pathways: list[DegreePathway]) -> CompleteDegreePathway:
        pathway = pathways[0]
        base = pathway.model_dump()

        completed_years: list[dict] = []

        course_names: list[str] = []
        flattened_courses: list[PathwayCourse] = []
        for y in pathway.years:
            for s in y.semesters:
                for c in s.courses:
                    course_names.append(c.name)
                    flattened_courses.append(c)

        course_queries = await self._query_builder.build_queries(course_names)

        if len(course_names) != len(course_queries):
            print(f"WARNING: queries do not match courses length, courses {len(course_names)}, queries {len(course_queries)}")


        query_coros = [
            self._course_db.query(text=query, query=course_query, pathway_course=pathway_course)
            for course_query, pathway_course in zip(course_queries, flattened_courses)
        ]
        course_query_results = await asyncio.gather(*query_coros) if query_coros else []

        all_courses_no_candidates = []
        i = 0
        for year in pathway.years:
            completed_semesters: list[dict] = []

            for sem in year.semesters:
                completed_courses: list[dict] = []

                for c in sem.courses:
                    courses = course_query_results[i] if i < len(course_query_results) else []
                    i += 1

                    if courses:
                        course = UHCoursePlan(**courses[0].model_dump(), candidates=courses)
                        all_courses_no_candidates.append((courses[0].model_dump_json(indent=2)))
                    else:
                        course = self._build_placeholder_course(c)

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
        base["candidates"] = [
            {
                "name": c.program_name,
                "pathway_id": c.pathway_id,
            }
            for c in pathways
        ]
        summary = await agent.run(f"COURSES: {'\n'.join(all_courses_no_candidates)}\n\n\n\n explain in 8 sentences how these courses resonate well with this query. QUERY: '{query}' Your tone should be like you are speaking to the person who wrote the query (you speak as if you are the college counselor). do not use em dashes. Do not start with a greeting. Just go to the summary straight away.")
        base["summary"] = str(summary.output)
        # base["summary"] = "hello"


        # Re-validate as CompleteDegreePathway (this will build all nested models)
        return CompleteDegreePathway.model_validate(base)

    def _build_placeholder_course(self, pathway_course: PathwayCourse) -> UHCoursePlan:
        """Fallback when no matching UH course is found."""
        credits = pathway_course.credits
        return UHCoursePlan(
            course_id=str(uuid.uuid4()),
            subject_code="TBD",
            course_number=0,
            course_suffix=None,
            course_title=f"{pathway_course.name} (no match found)",
            course_desc="No matching UH course was found for this requirement.",
            num_units=CreditsRange(min=credits, max=credits),
            dept_name="Unknown",
            inst_ipeds=0,
            metadata="",
            designations=[],
            candidates=[],
        )

def get_degree_pathway_predictor():
    return DegreePathwayPredictor()
