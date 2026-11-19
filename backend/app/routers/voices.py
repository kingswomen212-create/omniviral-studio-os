from fastapi import APIRouter, Query
from fastapi.responses import FileResponse
from typing import Optional
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/voices", tags=["Voices"])

@router.get("")
async def get_voices():
    return VoiceService.list_voices()

@router.get("/all")
async def get_all_voices(locale: Optional[str] = Query(None, description="Filter by language/locale e.g. en, es, hi, ar, fr")):
    return await VoiceService.list_all_voices(locale)

@router.get("/preview")
async def preview_voice(voice_id: str = "en-US-ChristopherNeural", text: str = "This is how your viral faceless video will sound."):
    path = await VoiceService.synthesize_preview(voice_id, text)
    return FileResponse(path=path, media_type="audio/mpeg")
