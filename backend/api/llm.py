import json
from pathlib import Path
from typing import runtime_checkable, Protocol, Dict

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic import BaseModel, ValidationError
from backend.api.models import CourseQueryBase
from backend.api.settings import settings
from pydantic_ai.models.openai import OpenAIResponsesModel, OpenAIResponsesModelSettings
import asyncio

class Query(BaseModel):
    name: str
    course_query: CourseQueryBase

class Queries(BaseModel):
    queries: list[Query]

model = OpenAIChatModel(model_name=settings.openai_llm, provider=OpenAIProvider(api_key=settings.openai_api_key))
agent = Agent(model)

query_builder_agent = Agent(model, system_prompt="""Your job is to build up a query to search through a catalog of courses.
Here are some examples.

subject_code is the course identifier
course_number is a 3 digit number for the course
course_number_gte is a filter to search for course_numbers higher than that.
course_suffix is a one letter capital letter
designations is an array of 0 or more of the following [DA DB DH DL DP DS DY FGA FGB FGC FQ FS FW HSL]

Notes:
- Sometimes designations are written in shorthand like FG (A/B/C) this should be designations = ['FGA', 'FGB', 'FGC'] and usually they are in parens
- if you see a number like 300+ put 300 in course_number_gte
- if its an elective that can be any course.
- Sometimes multiple courses suffixes/course numbers exist, right now, search does not support multiple courses so just choose the first course to parse. for example
    - MEDT 331 (E, W) would search for 331 since at the moment search doesnt handle multiple course suffixes.
    - If you encounter a course name like "BIOL 171L or 172L (DY)" just choose the first one. the output list should have exactly the same number of elements as the input list.
you will be given a list of course names, return a list of queries. the queries must be in the same order as the input list.
""", output_type=CourseQueryBase)

def chunked(seq: list[str], size: int) -> list[list[str]]:
    return [seq[i:i + size] for i in range(0, len(seq), size)]

@runtime_checkable
class QueryBuilderProtocol(Protocol):
    async def build_queries(self, course_names: list[str]) -> list[CourseQueryBase]:
        ...

class LLMQueryBuilder(QueryBuilderProtocol):
    def __init__(self, batch_size=5):
        self.batch_size = batch_size
        self.agent = get_query_builder_agent()

    async def build_queries(
            self,
            course_names: list[str],
    ) -> list[CourseQueryBase]:
        class Ret(BaseModel):
            queries: list[CourseQueryBase]

        async def process_batch(batch: list[str]) -> list[CourseQueryBase]:
            # single agent call per batch
            result = await self.agent.run(f"Here is a list of {len(batch)} queries to build. your output must have exactly that many items in the queries array" + str(batch), output_type=Ret)
            return result.output.queries

        # create a task per batch
        tasks = [
            asyncio.create_task(process_batch(batch))
            for batch in chunked(course_names, self.batch_size)
        ]

        # run all batches concurrently
        batches_results: list[list[CourseQueryBase]] = await asyncio.gather(*tasks)

        # flatten [[...], [...]] -> [...]
        return [q for batch in batches_results for q in batch]

class CachedQueryBuilder(QueryBuilderProtocol):
    """
    Strict file-backed cache. All lookups must exist.
    If any requested course name is not present in the cache, raises ValueError.
    """

    def __init__(self, cache_path: str | Path = settings.course_query_cache_path, *, preload: bool = True):
        self.cache_path = Path(cache_path)
        self._map: Dict[str, CourseQueryBase] = {}
        if preload:
            self._load_cache()

    def _load_cache(self) -> None:
        print("loading query cache")
        if not self.cache_path.exists():
            raise FileNotFoundError(f"Cache file not found: {self.cache_path}")

        with self.cache_path.open("r", encoding="utf-8") as f:
            raw = json.load(f)

        try:
            cache = Queries.model_validate(raw)
        except ValidationError as e:
            raise ValueError(f"Cache file has invalid structure: {e}") from e

        # Exact-match map (no normalization). If you want normalization, add it here.
        self._map = {q.name: q.course_query for q in cache.queries}

    async def build_queries(self, course_names: list[str]) -> list[CourseQueryBase]:
        # Lazy load if not preloaded
        if not self._map:
            self._load_cache()

        missing: list[str] = [name for name in course_names if name not in self._map]
        if missing:
            raise ValueError(f"Missing queries for: {missing}")

        # Preserve input order
        return [self._map[name] for name in course_names]

def get_query_builder_agent():
    return query_builder_agent

def get_query_builder():
    return CachedQueryBuilder(cache_path=settings.course_query_cache_path)
