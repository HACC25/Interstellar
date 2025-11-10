import re

from fastapi import Body, Depends, FastAPI, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.api.application import DegreePathwayPredictor, get_degree_pathway_predictor
from backend.api.models import CompleteDegreePathway
from backend.api.pdf import build_pathway_pdf

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


@app.post("/predict/{pathway_id}", response_model=CompleteDegreePathway)
async def predict_degree_pathway_by_id(
    pathway_id: str,
    query: str = Body(...),
    predictor: DegreePathwayPredictor = Depends(get_degree_pathway_predictor),
) -> CompleteDegreePathway:
    try:
        return await predictor.predict_by_pathway_id(pathway_id=pathway_id, query=query)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


def _export_filename(program_name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", program_name or "").strip("-").lower()
    if not slug:
        slug = "degree-pathway"
    return f"{slug}.pdf"


@app.post("/export", response_class=Response)
async def export_pathway_pdf(plan: CompleteDegreePathway = Body(...)) -> Response:
    pdf = build_pathway_pdf(plan)
    filename = _export_filename(plan.program_name)
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=pdf, media_type="application/pdf", headers=headers)
