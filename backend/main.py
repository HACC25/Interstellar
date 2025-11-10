import re

from fastapi import Body, Depends, FastAPI, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.api.application import DegreePathwayPredictor, get_degree_pathway_predictor
from backend.api.db import PathwayVectorDb, get_pathway_db
from backend.api.models import CompleteDegreePathway, DegreePathway
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


@app.get("/pathways/text-search", response_model=list[DegreePathway])
async def pathway_text_search(
    query: str,
    limit: int = 8,
    pathway_db: PathwayVectorDb = Depends(get_pathway_db),
) -> list[DegreePathway]:
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty")
    return pathway_db.text_search(query=query, limit=limit)


@app.get("/pathways/similar", response_model=list[DegreePathway])
async def pathway_similarity_search(
    query: str,
    limit: int = 8,
    pathway_db: PathwayVectorDb = Depends(get_pathway_db),
) -> list[DegreePathway]:
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty")
    return pathway_db.get_similar_pathways(query=query, limit=limit)


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
