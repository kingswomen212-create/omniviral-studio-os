import subprocess
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.config import ASSETS_DIR, OUTPUT_DIR
from app.core.database import save_video
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

router = APIRouter(prefix="/engine", tags=["Cinema Render Engine v10.0, Agent Two & Pro Upscaler"])

# Mirroring modern multi-model creative studio architecture (100% $0.00 Local Active Defaults + BYOK Ready)
MODEL_ROUTER_MATRIX = {
    "video": [
        {"id": "omniviral_cinema_v10", "name": "OmniViral Cinema Engine v10 (Local GPU)", "cost": "$0.00", "status": "ACTIVE", "spec": "Parallel 24/30/60fps • BT.709 • Halation"},
        {"id": "seedance_2_5", "name": "Seedance 2.5 Cinema", "cost": "BYOK", "status": "READY", "spec": "Multi-shot commercial motion"},
        {"id": "kling_3_0", "name": "Kling 3.0 Pro", "cost": "BYOK", "status": "READY", "spec": "Physics-aware film shots"},
        {"id": "runway_gen_4_5", "name": "Runway Gen 4.5", "cost": "BYOK", "status": "READY", "spec": "Director camera control"},
        {"id": "minimax_h3", "name": "MiniMax H3 / Hailuo", "cost": "BYOK", "status": "READY", "spec": "Expressive character performance"},
        {"id": "gemini_omni_flash", "name": "Gemini Omni Flash", "cost": "BYOK", "status": "READY", "spec": "Ultra-fast multimodal video"},
    ],
    "image": [
        {"id": "openverse_pexels_hd", "name": "OmniViral HD Visuals + Vector 2x SSAA", "cost": "$0.00", "status": "ACTIVE", "spec": "800M+ HD assets + Pillow 2x SSAA"},
        {"id": "flux_2", "name": "Flux 2 Pro", "cost": "BYOK", "status": "READY", "spec": "Photoreal editorial frames"},
        {"id": "recraft", "name": "Recraft V3 Vector", "cost": "BYOK", "status": "READY", "spec": "Brand design & typography"},
        {"id": "nano_banana_3", "name": "Nano Banana 3 / Pro", "cost": "BYOK", "status": "READY", "spec": "Character consistency lock"},
        {"id": "gpt_image_2_5", "name": "GPT Image 2.5 / Qwen 2.0", "cost": "BYOK", "status": "READY", "spec": "Text-accurate ad visuals"},
    ],
    "audio": [
        {"id": "edge_tts_318", "name": "Edge-TTS Neural Studio (318 Voices)", "cost": "$0.00", "status": "ACTIVE", "spec": "70+ languages • 48kHz • -14 LUFS"},
        {"id": "elevenlabs", "name": "ElevenLabs / Voice Cloning", "cost": "BYOK", "status": "READY", "spec": "Ultra-expressive studio clone"},
        {"id": "sonic_3_5", "name": "Sonic 3.5 / Gemini 3.1 Flash TTS", "cost": "BYOK", "status": "READY", "spec": "Low-latency commercial narration"},
    ],
    "music": [
        {"id": "omniviral_dsp_synth", "name": "OmniViral Broadcast DSP & SFX Synth", "cost": "$0.00", "status": "ACTIVE", "spec": "6 moods + 10 SFX + Sidechain ducking"},
        {"id": "google_lyria", "name": "Google Lyria / Mureka / MiniMax Music", "cost": "BYOK", "status": "READY", "spec": "Full commercial scores"},
    ],
    "upscalers": [
        {"id": "omniviral_cas_pro", "name": "FidelityFX CAS + HQDN3D + 4K Optical Flow", "cost": "$0.00", "status": "ACTIVE", "spec": "2x/4K CAS sharpen + Deband + 60fps MCI"},
        {"id": "topaz_astra_2", "name": "Topaz Astra 2 / Topaz Video", "cost": "BYOK", "status": "READY", "spec": "Cloud neural video upscale"},
        {"id": "bytedance_upscale", "name": "ByteDance VOD Upscale / Magnific", "cost": "BYOK", "status": "READY", "spec": "Detail-preserving restoration"},
    ],
}


@router.get("/capabilities")
async def get_engine_capabilities():
    caps = detect_render_capabilities()
    return {
        "engine_version": "10.0.0",
        "hardware": caps,
        "grades": [{"id": k, **v} for k, v in CINEMA_MASTER_GRADES.items()],
        "use_cases": [
            {"id": k, "name": v["name"], "grade": v["grade"], "cadence": v["cadence"]}
            for k, v in USE_CASE_TEMPLATES.items()
        ],
        "models": MODEL_ROUTER_MATRIX,
    }


@router.post("/benchmark")
async def run_engine_benchmark():
    """Runs a real 1080p hardware GPU vs CPU x264 benchmark right on this machine."""
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


@router.post("/agent-two")
async def run_agent_two(req: AgentTwoRequest):
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
    if ext not in (".mp4", ".webm", ".mov", ".mkv"):
        raise HTTPException(status_code=400, detail="Supported formats: MP4, WEBM, MOV, MKV")
    fname = f"remaster_in_{uuid.uuid4().hex[:8]}{ext}"
    dest = UPLOAD_DIR / fname
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    return {"filename": fname, "size": len(content)}


class ProUpscaleRequest(BaseModel):
    source_filename: str
    profile: str = "cas_2x"  # cas_2x | uhd_4k | optical_flow_60 | halation_remaster
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
