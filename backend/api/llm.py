from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from backend.api.models import CourseQueryBase
from backend.api.settings import settings

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
""", output_type=CourseQueryBase)


def get_query_builder_agent():
    return query_builder_agent