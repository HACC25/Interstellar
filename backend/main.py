from fastapi import Body, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.application import DegreePathwayPredictor, get_degree_pathway_predictor
from backend.api.models import CompleteDegreePathway

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/predict", response_model=CompleteDegreePathway)
async def predict_degree_pathway(
    query: str = Body(...),
    predictor: DegreePathwayPredictor = Depends(get_degree_pathway_predictor),
) -> CompleteDegreePathway:
    return await predictor.predict(query)
