import re

from fastapi import Body, Depends, FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from backend.api.application import DegreePathwayPredictor, get_degree_pathway_predictor
from backend.api.db import PathwayVectorDb, get_pathway_db
from backend.api.models import CompleteDegreePathway, DegreePathway
from backend.api.pdf import build_pathway_pdf
from backend.parse import FileParser, get_file_parser

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
    query: str = Form(...),
    files: list[UploadFile] | None = File(default=None),
    predictor: DegreePathwayPredictor = Depends(get_degree_pathway_predictor),
    file_parser: FileParser = Depends(get_file_parser),
) -> CompleteDegreePathway:
    parsed_text = await file_parser(files)
    combined_query = query
    if parsed_text:
        combined_query = f"{query.strip()}\n\n{parsed_text}"
    return await predictor.predict(combined_query.strip())


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


@app.get("/pathways/{pathway_id}", response_model=DegreePathway)
async def get_pathway_by_id(
    pathway_id: str,
    pathway_db: PathwayVectorDb = Depends(get_pathway_db),
) -> DegreePathway:
    pathway = pathway_db.get_pathway(pathway_id)
    if pathway is None:
        raise HTTPException(status_code=404, detail="Pathway not found")
    return pathway


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
