from backend.api.application import get_degree_pathway_predictor
from backend.api.llm import get_query_builder

# predictor = get_degree_pathway_predictor()
# with open("../data/complete_path.json", "w") as f:
#     f.write(predictor.predict("hello").model_dump_json(indent=2))

qb = get_query_builder()
print("\n".join(q.model_dump_json(indent=2) for q in qb.build_queries(["CINE 255 (DH)", "ART 113", "FQ (or FW)", "FG (A/B/C)", "HSL 101"])))