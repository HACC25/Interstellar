from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic import RootModel, BaseModel
from backend.api.models import CourseQueryBase
from backend.api.settings import settings
import asyncio

model = OpenAIChatModel(model_name=settings.openai_llm, provider=OpenAIProvider(api_key=settings.openai_api_key))
agent = Agent(model)

query_builder_agent = Agent(model, system_prompt="""Your job is to build up a query to search through a catalog of courses.
Here are some examples.

subject_code is a 3 letter all caps code for the course
course_number is a 3 digit number for the course
course_number_gte is a filter to search for course_numbers higher than that.
course_suffix is a one letter capital letter
designation is a two or more capital letters code that determines what category the course is in (courses dont need this)

if you see a number like 300+ put 300 in course_number_gte
usually the designations are in parens (DY), sometimes its more complicated like FG (A/B/C) this should be designations = ['FGA', 'FGB', 'FGC']
if its an elective that can be any course.
designations are two or more letters long. this will help determine if its a designation vs a course_suffix.
MEDT 331 (E, W) would search for 331 since at the moment search doesnt handle multiple course suffixes.
If you encounter a course name like "BIOL 171L or 172L (DY)" just choose the first one. the output list should have exactly the same number of elements as the input list.

you will be given a list of course names, return a list of queries. the queries must be in the same order as the input list.
""", output_type=CourseQueryBase)

def chunked(seq: list[str], size: int) -> list[list[str]]:
    return [seq[i:i + size] for i in range(0, len(seq), size)]

class QueryBuilder:
    def __init__(self):
        self.agent = get_query_builder_agent()

    async def build_queries(
            self,
            course_names: list[str],
            batch_size: int = 5,
    ) -> list[CourseQueryBase]:
        class Ret(BaseModel):
            queries: list[CourseQueryBase]

        async def process_batch(batch: list[str]) -> list[CourseQueryBase]:
            # single agent call per batch
            result = await self.agent.run(str(batch), output_type=Ret)
            return result.output.queries

        # create a task per batch
        tasks = [
            asyncio.create_task(process_batch(batch))
            for batch in chunked(course_names, batch_size)
        ]

        # run all batches concurrently
        batches_results: list[list[CourseQueryBase]] = await asyncio.gather(*tasks)

        # flatten [[...], [...]] -> [...]
        return [q for batch in batches_results for q in batch]

def get_query_builder_agent():
    return query_builder_agent

def get_query_builder():
    return QueryBuilder()