from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.script_service import ScriptService

router = APIRouter(prefix="/scripts", tags=["Scripts & Ideas"])

class ScriptRequest(BaseModel):
    niche: str = "dark_psychology"
    topic: Optional[str] = None
    visual_style: str = "cinematic"

@router.get("/niches")
async def get_niches():
    return ScriptService.list_niches()

@router.get("/styles")
async def get_visual_styles():
    return ScriptService.list_visual_styles()

@router.get("/ideas")
async def get_trending_ideas(niche: str = "dark_psychology"):
    return await ScriptService.generate_ideas(niche)

@router.post("/generate")
async def generate_script_endpoint(req: ScriptRequest):
    return await ScriptService.generate_script(req.niche, req.topic, req.visual_style)
