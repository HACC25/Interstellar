import asyncio

from backend.api.application import get_degree_pathway_predictor
from backend.api.llm import get_query_builder

# predictor = get_degree_pathway_predictor()
# with open("../data/complete_path.json", "w") as f:
#     f.write(predictor.predict("hello").model_dump_json(indent=2))

qb = get_query_builder()
print("\n".join(q.model_dump_json(indent=2) for q in asyncio.run(qb.build_queries(["BIOL 171L or 172L (DY)"]))))
# print(str(["hi", "hello"]))