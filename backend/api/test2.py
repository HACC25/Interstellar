from backend.api.application import get_degree_pathway_predictor

predictor = get_degree_pathway_predictor()
with open("../data/complete_path.json", "w") as f:
    f.write(predictor.predict("hello").model_dump_json(indent=2))