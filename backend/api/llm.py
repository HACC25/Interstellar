from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from backend.api.settings import settings

model = OpenAIChatModel(model_name=settings.openai_llm, provider=OpenAIProvider(api_key=settings.openai_api_key))
agent = Agent(model)

query_builder_agent = Agent(model, system_prompt="")


def get_query_builder_agent():
    return query_builder_agent