import asyncio
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.core.config import OUTPUT_DIR
from app.core.database import save_video, list_videos_db
from app.services.script_service import ScriptService, VISUAL_STYLES
from app.services.voice_service import VoiceService
from app.services.subtitle_service import SubtitleService
from app.services.visual_service import VisualService
from app.services.composer_service import ComposerService

router = APIRouter(prefix="/videos", tags=["Videos & Cinema Studio"])

class SceneItem(BaseModel):
    text: str
    query: Optional[str] = "cinematic aesthetic"
    visual_prompt: Optional[str] = None
    image_filename: Optional[str] = None
    camera_move: Optional[str] = None

class ScenePreviewRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "9:16"
    visual_style: str = "cinematic"

class StoryboardBuildRequest(BaseModel):
    niche: str = "dark_psychology"
    topic: Optional[str] = None
    visual_style: str = "cinematic"
    aspect_ratio: str = "9:16"
    camera_move: str = "dolly_in"

class VideoGenerateRequest(BaseModel):
    niche: str = "dark_psychology"
    topic: Optional[str] = None
    voice_id: Optional[str] = "en-US-ChristopherNeural"
    voice_rate: str = "+8%"
    visual_style: str = "cinematic"
    aspect_ratio: str = "9:16"
    caption_style: Optional[str] = "volt"
    bg_music: bool = True
    use_ai_images: bool = True
    transition: str = "fade"
    color_fx: str = "teal_orange"
    camera_move: str = "dolly_in"
    camera_body: str = "arri_alexa"
    lens_type: str = "clean_prime"
    progress_bar: bool = True
    watermark: str = ""
    hook_banner: bool = True
    split_screen: bool = False
    custom_script: Optional[str] = None
    scenes: Optional[List[SceneItem]] = None

@router.get("/camera-presets")
async def get_camera_presets():
    return VisualService.list_camera_movements()

@router.post("/storyboard-build")
async def build_visual_storyboard(req: StoryboardBuildRequest):
    """
    Higgsfield 'Hero Frame First' + AITuber Storyboard:
    Generates the script scenes AND fetches real high-res visual frames for every shot in parallel!
    """
    script_data = await ScriptService.generate_script(req.niche, req.topic, req.visual_style)
    scenes = script_data.get("scenes", [])

    async def fetch_one(sc: Dict[str, Any]):
        fn = await VisualService.generate_scene_image_preview(sc.get("query", "cinematic dark"), req.aspect_ratio)
        sc["image_filename"] = fn
        sc["image_url"] = f"/api/videos/stream/{fn}"
        sc["camera_move"] = req.camera_move
        return sc

    enriched = await asyncio.gather(*(fetch_one(s) for s in scenes))
    script_data["scenes"] = list(enriched)
    return script_data

@router.post("/scene-preview")
async def preview_scene_image(req: ScenePreviewRequest):
    filename = await VisualService.generate_scene_image_preview(req.prompt, req.aspect_ratio)
    return {
        "image_filename": filename,
        "image_url": f"/api/videos/stream/{filename}"
    }

@router.post("/generate")
async def generate_video_endpoint(req: VideoGenerateRequest):
    job_id = str(uuid.uuid4())[:8]

    # 1. Script or Storyboard
    if req.scenes and len(req.scenes) > 0:
        scenes_list = [s.model_dump() for s in req.scenes]
        full_script = " ".join([s["text"] for s in scenes_list])
        script_data = {
            "title": req.topic or f"{req.niche.replace('_', ' ').title()} Story",
            "hook": scenes_list[0]["text"],
            "full_script": full_script,
            "scenes": scenes_list,
            "tags": [f"#{req.niche}", "#viral", "#shorts"]
        }
    elif req.custom_script:
        script_data = {
            "title": req.topic or "Custom Cinema Short",
            "hook": req.custom_script[:45],
            "full_script": req.custom_script,
            "scenes": [{"text": req.custom_script, "query": "cinematic night city", "visual_prompt": req.custom_script}],
            "tags": ["#viral", "#shorts"]
        }
    else:
        script_data = await ScriptService.generate_script(req.niche, req.topic, req.visual_style)

    # 2. Voice with pacing rate
    audio_filename = f"audio_{job_id}.mp3"
    voice_res = await VoiceService.synthesize_speech(
        text=script_data["full_script"],
        voice_id=req.voice_id,
        output_filename=audio_filename,
        rate=req.voice_rate
    )

    # 3. Bold Viral Subtitles (.ass)
    sub_filename = f"sub_{job_id}.ass"
    sub_path = OUTPUT_DIR / sub_filename
    SubtitleService.generate_ass_subtitles(
        word_boundaries=voice_res["word_boundaries"],
        output_path=sub_path,
        style=req.caption_style or "volt",
        aspect_ratio=req.aspect_ratio
    )

    # 4. Real High-Res Visuals with Higgsfield Camera Rigs
    visual_paths = await VisualService.fetch_or_generate_visuals(
        scenes=script_data["scenes"],
        total_duration=voice_res["duration"],
        job_id=job_id,
        aspect_ratio=req.aspect_ratio,
        camera_move=req.camera_move,
        use_ai_images=req.use_ai_images
    )

    # 5. High-CTR Thumbnail from first real shot
    thumb_filename = f"thumb_{job_id}.jpg"
    if visual_paths:
        VisualService.generate_thumbnail(Path(visual_paths[0]), script_data["title"], thumb_filename, req.aspect_ratio)

    # 6. Cinema Studio FFmpeg Composition
    output_video_name = f"video_{job_id}.mp4"
    comp_res = ComposerService.compose_video(
        video_clips=visual_paths,
        audio_path=voice_res["audio_path"],
        subtitle_path=str(sub_path),
        output_filename=output_video_name,
        aspect_ratio=req.aspect_ratio,
        caption_style=req.caption_style or "volt",
        bg_music=req.bg_music,
        transition=req.transition,
        color_fx=req.color_fx,
        camera_body=req.camera_body,
        lens_type=req.lens_type,
        progress_bar=req.progress_bar,
        watermark=req.watermark,
        hook_text=script_data.get("hook", "") if req.hook_banner else "",
        split_screen=req.split_screen
    )

    video_record = {
        "id": job_id,
        "title": script_data["title"],
        "niche": req.niche,
        "visual_style": req.visual_style,
        "aspect_ratio": req.aspect_ratio,
        "script": script_data["full_script"],
        "duration": comp_res["duration"],
        "filename": output_video_name,
        "thumbnail_filename": thumb_filename,
        "url": f"/api/videos/stream/{output_video_name}",
        "thumbnail_url": f"/api/videos/stream/{thumb_filename}",
        "tags": script_data.get("tags", []),
        "status": "ready"
    }

    save_video(video_record)
    return video_record

@router.post("/visualizer")
async def generate_music_visualizer(
    file: UploadFile = File(...),
    title: str = Form("Spotify Visualizer"),
    aspect_ratio: str = Form("9:16")
):
    job_id = str(uuid.uuid4())[:8]
    in_audio = OUTPUT_DIR / f"upload_{job_id}_{file.filename}"
    with open(in_audio, "wb") as f:
        f.write(await file.read())

    out_name = f"viz_{job_id}.mp4"
    VisualService.generate_audio_visualizer(str(in_audio), out_name, title, aspect_ratio)

    record = {
        "id": job_id,
        "title": title,
        "niche": "music_visualizer",
        "visual_style": "visualizer",
        "aspect_ratio": aspect_ratio,
        "script": "Audio-reactive music visualizer",
        "duration": 0,
        "filename": out_name,
        "thumbnail_filename": "",
        "url": f"/api/videos/stream/{out_name}",
        "thumbnail_url": None,
        "tags": ["#music", "#visualizer", "#spotify"],
        "status": "ready"
    }
    save_video(record)
    return record

@router.get("")
async def list_videos():
    return list_videos_db()

@router.get("/stream/{filename}")
async def stream_file(filename: str):
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    ext = file_path.suffix.lower()
    media_type = "video/mp4" if ext == ".mp4" else ("image/jpeg" if ext in (".jpg", ".jpeg") else "audio/mpeg")
    return FileResponse(path=file_path, media_type=media_type, filename=filename)
