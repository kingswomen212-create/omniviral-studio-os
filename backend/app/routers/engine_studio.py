import subprocess
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.config import ASSETS_DIR, OUTPUT_DIR
from app.core.database import get_all_settings, save_video, set_setting
from app.services.cinema_media_engine import get_active_media_providers
from app.services.render_engine import (
    CINEMA_MASTER_GRADES,
    RenderEngine,
    USE_CASE_TEMPLATES,
    detect_render_capabilities,
    get_video_encode_args,
    upscale_video_pro,
)

UPLOAD_DIR = ASSETS_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/engine", tags=["Cinema Render Engine v11.0, Real Video Diffusion & Pro Upscaler"])


def _build_live_model_matrix() -> Dict[str, List[Dict[str, Any]]]:
    mp = get_active_media_providers()["providers"]
    fal_on = mp["fal_ai"]["configured"]
    rep_on = mp["replicate"]["configured"]
    gem_on = mp["gemini"]["configured"]
    px_on = mp["pexels_video"]["configured"]
    pb_on = mp["pixabay_video"]["configured"]
    hf_on = mp["huggingface_flux"]["configured"]

    return {
        "video": [
            {"id": "seedance_2_5", "name": "Seedance Pro (fal.ai)", "cost": "fal_api_key", "status": "ACTIVE" if fal_on else "ADD KEY", "spec": "Real generative cinema motion video"},
            {"id": "kling_3_0", "name": "Kling 2.1 Master (fal.ai / Replicate)", "cost": "fal / rep key", "status": "ACTIVE" if (fal_on or rep_on) else "ADD KEY", "spec": "Physics-aware film shots & product ads"},
            {"id": "minimax_h3", "name": "MiniMax Hailuo Video-01", "cost": "fal / rep key", "status": "ACTIVE" if (fal_on or rep_on) else "ADD KEY", "spec": "Expressive human & UGC video"},
            {"id": "pexels_4k_video", "name": "Pexels 4K Moving Cinema Video", "cost": "FREE KEY", "status": "ACTIVE" if px_on else "FREE KEY", "spec": "Real 4K/1080p moving camera footage"},
            {"id": "pixabay_video", "name": "Pixabay HD/4K Moving Video", "cost": "FREE KEY", "status": "ACTIVE" if pb_on else "FREE KEY", "spec": "Real moving cinema stock B-roll"},
            {"id": "omniviral_cinema_v10", "name": "Auto Best-Available Cinema Router", "cost": "$0.00+", "status": "ACTIVE", "spec": "Auto-selects AI Video -> 4K Video -> FLUX -> Editorial"},
        ],
        "image": [
            {"id": "hf_flux", "name": "FLUX.1-schnell (HuggingFace)", "cost": "FREE KEY", "status": "ACTIVE" if hf_on else "FREE KEY", "spec": "Bespoke photoreal studio photography"},
            {"id": "imagen_3", "name": "Google Imagen 3 (Gemini API)", "cost": "gemini key", "status": "ACTIVE" if gem_on else "ADD KEY", "spec": "Luxury commercial product frames"},
            {"id": "openverse_curated", "name": "Curated Clutter-Free Editorial + 2x SSAA", "cost": "$0.00", "status": "ACTIVE", "spec": "Zero-key filtered stock + Pillow 2x SSAA"},
        ],
        "audio": [
            {"id": "edge_tts_318", "name": "Edge-TTS Neural Studio (318 Voices)", "cost": "$0.00", "status": "ACTIVE", "spec": "70+ languages • 48kHz • -14 LUFS"},
            {"id": "omniviral_dsp_synth", "name": "Broadcast DSP Music & UI Foley Synth", "cost": "$0.00", "status": "ACTIVE", "spec": "6 moods + 10 SFX + Sidechain ducking"},
        ],
        "upscalers": [
            {"id": "omniviral_cas_pro", "name": "FidelityFX CAS + HQDN3D + 4K Optical Flow", "cost": "$0.00", "status": "ACTIVE", "spec": "2x/4K CAS sharpen + Deband + 60fps MCI"},
            {"id": "halation_remaster", "name": "Dual-Path Optical Film Halation Bloom", "cost": "$0.00", "status": "ACTIVE", "spec": "Highlight screen bloom + Kodak grain"},
        ],
    }


@router.get("/capabilities")
async def get_engine_capabilities():
    caps = detect_render_capabilities()
    return {
        "engine_version": "11.0.0",
        "hardware": caps,
        "media_providers": get_active_media_providers(),
        "grades": [{"id": k, **v} for k, v in CINEMA_MASTER_GRADES.items()],
        "use_cases": [
            {"id": k, "name": v["name"], "grade": v["grade"], "cadence": v["cadence"]}
            for k, v in USE_CASE_TEMPLATES.items()
        ],
        "models": _build_live_model_matrix(),
    }


class ProviderKeysRequest(BaseModel):
    pexels_api_key: Optional[str] = None
    pixabay_api_key: Optional[str] = None
    hf_api_token: Optional[str] = None
    fal_api_key: Optional[str] = None
    replicate_api_token: Optional[str] = None
    gemini_api_key: Optional[str] = None
    comfyui_url: Optional[str] = None


@router.post("/providers")
async def save_provider_keys(req: ProviderKeysRequest):
    mapping = {
        "pexels_api_key": req.pexels_api_key,
        "pixabay_api_key": req.pixabay_api_key,
        "hf_api_token": req.hf_api_token,
        "fal_api_key": req.fal_api_key,
        "replicate_api_token": req.replicate_api_token,
        "gemini_api_key": req.gemini_api_key,
        "comfyui_url": req.comfyui_url,
    }
    for k, v in mapping.items():
        if v is not None:
            set_setting(k, v.strip())
    return {
        "status": "saved",
        "media_providers": get_active_media_providers(),
        "models": _build_live_model_matrix(),
    }


@router.post("/benchmark")
async def run_engine_benchmark():
    results = []
    for mode, label in [("gpu_fast", "Hardware GPU Fast"), ("auto", "Auto Balanced"), ("studio_master", "Studio Master CRF 16")]:
        args = get_video_encode_args(mode=mode, crf=17, bitrate="10M")
        t0 = time.perf_counter()
        r = subprocess.run(
            [
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-f", "lavfi", "-i", "testsrc2=duration=2.0:size=1920x1080:rate=30",
                "-vf", "deband,cas=0.5",
                *args, "-f", "null", "-",
            ],
            capture_output=True,
            text=True,
        )
        elapsed_ms = round((time.perf_counter() - t0) * 1000)
        eff_fps = round(60.0 / max(0.05, elapsed_ms / 1000.0), 1)
        results.append({
            "mode": mode,
            "label": label,
            "codec": args[1],
            "elapsed_ms": elapsed_ms,
            "effective_fps": eff_fps,
            "ok": r.returncode == 0,
        })
    return {"resolution": "1920x1080 (60 frames + Deband + FidelityFX CAS)", "results": results}


class AgentTwoRequest(BaseModel):
    brief: str = "Luxury botanical fragrance launch bathed in golden hour sunlight"
    use_case: str = "ad_filmmaking"
    brand_name: str = "AETHER LUXE"
    aspect_ratio: str = "9:16"
    fps: Optional[int] = None
    grade_id: Optional[str] = None
    encoder_mode: str = "gpu_fast"
    voice_id: str = "en-US-AndrewNeural"
    caption_style: str = "editorial"
    enable_halation: bool = True
    enable_motion_blur: bool = True
    model_profile: str = "omniviral_cinema_v10"
    custom_clip_filenames: Optional[List[str]] = None


@router.post("/agent-two")
async def run_agent_two(req: AgentTwoRequest):
    resolved_clips: List[str] = []
    for fn in (req.custom_clip_filenames or []):
        name = Path(fn).name
        p = UPLOAD_DIR / name
        if not p.exists():
            p = OUTPUT_DIR / name
        if p.exists():
            resolved_clips.append(str(p))

    res = await RenderEngine.run_agent_two_production(
        brief=req.brief,
        use_case=req.use_case,
        brand_name=req.brand_name,
        aspect_ratio=req.aspect_ratio,
        fps=req.fps,
        grade_id=req.grade_id,
        encoder_mode=req.encoder_mode,
        voice_id=req.voice_id,
        caption_style=req.caption_style,
        enable_halation=req.enable_halation,
        enable_motion_blur=req.enable_motion_blur,
        model_profile=req.model_profile,
        custom_clip_paths=resolved_clips or None,
    )
    save_video({
        "id": res["id"],
        "title": res["title"],
        "niche": f"agent_two_{req.use_case}",
        "aspect_ratio": res["aspect_ratio"],
        "script": res["script"],
        "duration": res["duration"],
        "filename": res["filename"],
        "url": res["url"],
        "tags": ["#agenttwo", "#cinema", f"#{req.use_case}", "#bt709"],
    })
    return res


@router.post("/upload-video")
async def upload_video_for_remaster(file: UploadFile = File(...)):
    ext = Path(file.filename or "clip.mp4").suffix.lower() or ".mp4"
    if ext not in (".mp4", ".webm", ".mov", ".mkv", ".png", ".jpg", ".jpeg"):
        raise HTTPException(status_code=400, detail="Supported formats: MP4, WEBM, MOV, MKV, PNG, JPG")
    fname = f"clip_in_{uuid.uuid4().hex[:8]}{ext}"
    dest = UPLOAD_DIR / fname
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    return {"filename": fname, "original_name": file.filename, "size": len(content)}


class ProUpscaleRequest(BaseModel):
    source_filename: str
    profile: str = "cas_2x"
    encoder_mode: str = "gpu_fast"


@router.post("/upscale-pro")
async def run_pro_upscale(req: ProUpscaleRequest):
    name = Path(req.source_filename).name
    src = OUTPUT_DIR / name
    if not src.exists():
        src = UPLOAD_DIR / name
    if not src.exists():
        raise HTTPException(status_code=404, detail=f"Video not found: {name}")

    out_fn = f"pro_remaster_{req.profile}_{uuid.uuid4().hex[:8]}.mp4"
    res = upscale_video_pro(
        input_path=src,
        output_filename=out_fn,
        profile=req.profile,
        encoder_mode=req.encoder_mode,
    )
    save_video({
        "id": uuid.uuid4().hex[:8],
        "title": f"Pro Remaster ({req.profile}): {name[:24]}",
        "niche": "pro_upscale",
        "aspect_ratio": "16:9" if (res["after"]["width"] >= res["after"]["height"]) else "9:16",
        "script": f"Upscaled via {req.profile} in {res['render_seconds']}s",
        "duration": res["after"]["duration"],
        "filename": out_fn,
        "url": res["url"],
        "tags": ["#upscale", "#fidelityfx", "#bt709"],
    })
    return res
