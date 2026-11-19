import asyncio
import json
import subprocess
import uuid
import httpx
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.config import OUTPUT_DIR, MUSIC_DIR
from app.core.database import get_conn, save_video
from app.services.visual_service import VisualService
from app.services.voice_service import VoiceService
from app.services.subtitle_service import SubtitleService
from app.services.composer_service import ComposerService, COLOR_LUT_FILTERS
from app.services.audio_engine import AudioEngine

router = APIRouter(prefix="/tools", tags=["Image, Video, Audio & Studios Suite"])

# ==================== IMAGE SUITE ====================

class ImageCreateRequest(BaseModel):
    prompt: str
    style: str = "teal_orange"
    aspect_ratio: str = "9:16"
    model: str = "soul_2"

class MangakaRequest(BaseModel):
    title: str = "Shadow Blade"
    panels: List[str] = [
        "A lone samurai stands in neon rain",
        "He draws a glowing katana as shadows close in",
        "A blinding flash cuts the night sky in half"
    ]
    style: str = "noir"

class CharacterCreateRequest(BaseModel):
    name: str
    hairstyle: str = "Silver Wolf Cut"
    outfit: str = "Black Techwear Trench"
    ethnicity: str = "East Asian"
    vibe: str = "Cyberpunk Fashion Model"

@router.post("/image/create")
async def create_image_endpoint(req: ImageCreateRequest):
    job_id = str(uuid.uuid4())[:8]
    raw_fn = await VisualService.generate_scene_image_preview(req.prompt, req.aspect_ratio)
    raw_path = OUTPUT_DIR / raw_fn
    out_fn = f"img_{job_id}.jpg"
    out_path = OUTPUT_DIR / out_fn
    w, h = VisualService.get_dimensions(req.aspect_ratio)

    lut = COLOR_LUT_FILTERS.get(req.style, COLOR_LUT_FILTERS["teal_orange"])
    vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"
    if lut:
        vf += f",{lut}"

    subprocess.run(["ffmpeg", "-y", "-i", str(raw_path), "-vf", vf, "-frames:v", "1", str(out_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    conn = get_conn()
    conn.execute(
        "INSERT INTO media_assets (id, asset_type, title, prompt, filename, meta_json) VALUES (?, ?, ?, ?, ?, ?)",
        (job_id, "image", req.prompt[:40], req.prompt, out_fn, json.dumps({"model": req.model, "style": req.style, "aspect_ratio": req.aspect_ratio}))
    )
    conn.commit()
    conn.close()

    return {"id": job_id, "filename": out_fn, "url": f"/api/videos/stream/{out_fn}", "model": req.model}

@router.post("/image/edit")
async def edit_image_endpoint(
    file: UploadFile = File(...),
    lut: str = Form("teal_orange"),
    brightness: float = Form(0.0),
    contrast: float = Form(1.1),
    saturation: float = Form(1.15),
    overlay_text: str = Form("")
):
    job_id = str(uuid.uuid4())[:8]
    in_path = OUTPUT_DIR / f"in_img_{job_id}_{file.filename}"
    with open(in_path, "wb") as f:
        f.write(await file.read())

    out_fn = f"edited_{job_id}.jpg"
    out_path = OUTPUT_DIR / out_fn

    filters = [f"eq=brightness={brightness}:contrast={contrast}:saturation={saturation}"]
    if COLOR_LUT_FILTERS.get(lut):
        filters.append(COLOR_LUT_FILTERS[lut])
    if overlay_text.strip():
        safe = overlay_text.strip().replace("'", "").replace(":", "")[:42].upper()
        filters.append(f"drawtext=text='{safe}':fontcolor=0xD9FF00:fontsize=72:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h-140")

    res = subprocess.run(["ffmpeg", "-y", "-i", str(in_path), "-vf", ",".join(filters), "-frames:v", "1", str(out_path)], capture_output=True, text=True)
    if res.returncode != 0:
        raise HTTPException(status_code=500, detail=res.stderr[-300:])
    return {"id": job_id, "filename": out_fn, "url": f"/api/videos/stream/{out_fn}"}

@router.post("/image/upscale")
async def upscale_image_endpoint(file: UploadFile = File(...), scale: int = Form(2)):
    job_id = str(uuid.uuid4())[:8]
    in_path = OUTPUT_DIR / f"up_in_{job_id}_{file.filename}"
    with open(in_path, "wb") as f:
        f.write(await file.read())

    out_fn = f"upscaled_{scale}x_{job_id}.jpg"
    out_path = OUTPUT_DIR / out_fn
    factor = 4 if scale >= 4 else 2
    vf = f"scale=iw*{factor}:ih*{factor}:flags=lanczos,unsharp=5:5:1.1:5:5:0.4"
    subprocess.run(["ffmpeg", "-y", "-i", str(in_path), "-vf", vf, "-q:v", "2", "-frames:v", "1", str(out_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return {"id": job_id, "filename": out_fn, "url": f"/api/videos/stream/{out_fn}", "scale": f"{factor}x"}

@router.post("/image/mangaka")
async def create_manga_strip(req: MangakaRequest):
    """
    Mangaka Studio: Turns any story into a 3-panel vertical Manga / Comic / Webtoon strip.
    """
    job_id = str(uuid.uuid4())[:8]
    panels = req.panels[:3] if req.panels else ["Dramatic manga hero in rain", "Close up fierce eyes", "Final sword strike"]
    panel_files = []

    for idx, p_text in enumerate(panels):
        raw = await VisualService.generate_scene_image_preview(f"{p_text} dramatic scene", "16:9")
        raw_path = OUTPUT_DIR / raw
        styled = OUTPUT_DIR / f"manga_p_{job_id}_{idx}.jpg"
        safe_txt = p_text.replace("'", "").replace(":", "")[:44].upper()
        # High-contrast comic/manga ink look + white comic border + speech caption box
        vf = (
            "scale=960:540:force_original_aspect_ratio=increase,crop=960:540,"
            "hue=s=0.15,eq=contrast=1.45:brightness=0.02,unsharp=5:5:1.2,"
            "pad=1000:580:20:20:white,"
            f"drawbox=x=30:y=460:w=940:h=88:color=white@0.92:t=fill,"
            f"drawtext=text='{safe_txt}':fontcolor=black:fontsize=32:x=(w-text_w)/2:y=490"
        )
        subprocess.run(["ffmpeg", "-y", "-i", str(raw_path), "-vf", vf, "-frames:v", "1", str(styled)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        panel_files.append(str(styled))

    out_fn = f"manga_strip_{job_id}.jpg"
    out_path = OUTPUT_DIR / out_fn
    cmd = ["ffmpeg", "-y"]
    for pf in panel_files:
        cmd.extend(["-i", pf])
    inputs = "".join(f"[{i}:v]" for i in range(len(panel_files)))
    cmd.extend(["-filter_complex", f"{inputs}vstack=inputs={len(panel_files)}[out]", "-map", "[out]", "-frames:v", "1", str(out_path)])
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return {"id": job_id, "title": req.title, "filename": out_fn, "url": f"/api/videos/stream/{out_fn}"}

@router.get("/characters")
async def list_characters():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM characters ORDER BY created_at DESC").fetchall()
    conn.close()
    return [
        {
            "id": r["id"], "name": r["name"], "hairstyle": r["hairstyle"],
            "outfit": r["outfit"], "ethnicity": r["ethnicity"], "vibe": r["vibe"],
            "image_url": f"/api/videos/stream/{r['image_filename']}"
        }
        for r in rows
    ]

@router.post("/characters")
async def create_character(req: CharacterCreateRequest):
    cid = f"soul_{str(uuid.uuid4())[:6]}"
    query = f"portrait {req.ethnicity} {req.vibe} {req.outfit} studio lighting"
    img_fn = await VisualService.generate_scene_image_preview(query, "1:1")
    conn = get_conn()
    conn.execute(
        "INSERT INTO characters (id, name, hairstyle, outfit, ethnicity, vibe, image_filename) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (cid, req.name, req.hairstyle, req.outfit, req.ethnicity, req.vibe, img_fn)
    )
    conn.commit()
    conn.close()
    return {
        "id": cid, "name": req.name, "hairstyle": req.hairstyle,
        "outfit": req.outfit, "ethnicity": req.ethnicity, "vibe": req.vibe,
        "image_url": f"/api/videos/stream/{img_fn}"
    }

# ==================== VIDEO PRO TOOLS ====================

@router.post("/video/edit")
async def edit_uploaded_video(
    file: UploadFile = File(...),
    trim_start: float = Form(0.0),
    trim_duration: float = Form(15.0),
    speed: float = Form(1.0),
    lut: str = Form("teal_orange"),
    watermark: str = Form("")
):
    job_id = str(uuid.uuid4())[:8]
    in_path = OUTPUT_DIR / f"edit_in_{job_id}_{file.filename}"
    with open(in_path, "wb") as f:
        f.write(await file.read())

    out_fn = f"edited_vid_{job_id}.mp4"
    out_path = OUTPUT_DIR / out_fn

    v_filters = [f"setpts={1.0/max(0.5, min(2.0, speed)):.3f}*PTS"]
    if COLOR_LUT_FILTERS.get(lut):
        v_filters.append(COLOR_LUT_FILTERS[lut])
    if watermark.strip():
        safe = watermark.strip().replace("'", "").replace(":", "")[:28]
        v_filters.append(f"drawtext=text='{safe}':fontcolor=white@0.7:fontsize=36:borderw=2:bordercolor=black:x=40:y=40")

    a_speed = max(0.5, min(2.0, speed))
    cmd = [
        "ffmpeg", "-y", "-ss", str(trim_start), "-t", str(trim_duration),
        "-i", str(in_path),
        "-vf", ",".join(v_filters),
        "-af", f"atempo={a_speed}",
        "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", str(out_path)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise HTTPException(status_code=500, detail=res.stderr[-300:])
    return {"id": job_id, "filename": out_fn, "url": f"/api/videos/stream/{out_fn}"}

@router.post("/video/upscale")
async def upscale_video_endpoint(file: UploadFile = File(...), target: str = Form("4k")):
    job_id = str(uuid.uuid4())[:8]
    in_path = OUTPUT_DIR / f"upv_in_{job_id}_{file.filename}"
    with open(in_path, "wb") as f:
        f.write(await file.read())

    out_fn = f"upscaled_{target}_{job_id}.mp4"
    out_path = OUTPUT_DIR / out_fn
    scale_expr = "scale=2160:-2:flags=lanczos" if target == "4k" else "scale=1080:-2:flags=lanczos"
    cmd = [
        "ffmpeg", "-y", "-i", str(in_path),
        "-vf", f"{scale_expr},unsharp=5:5:0.9:5:5:0.3",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "copy", str(out_path)
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return {"id": job_id, "filename": out_fn, "url": f"/api/videos/stream/{out_fn}", "target": target}

@router.post("/video/reframe")
async def reframe_video_endpoint(
    file: UploadFile = File(...),
    aspect_ratio: str = Form("9:16"),
    mode: str = Form("blur_bg")
):
    """
    Higgsfield Reframe: Smartly converts any video to 9:16, 16:9, or 1:1
    with either blurred cinema background fill or center crop.
    """
    job_id = str(uuid.uuid4())[:8]
    in_path = OUTPUT_DIR / f"ref_in_{job_id}_{file.filename}"
    with open(in_path, "wb") as f:
        f.write(await file.read())

    out_fn = f"reframed_{job_id}.mp4"
    out_path = OUTPUT_DIR / out_fn
    w, h = VisualService.get_dimensions(aspect_ratio)

    if mode == "blur_bg":
        fc = (
            f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},boxblur=28:10[bg];"
            f"[0:v]scale={w}:{h}:force_original_aspect_ratio=decrease[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2[outv]"
        )
        cmd = ["ffmpeg", "-y", "-i", str(in_path), "-filter_complex", fc, "-map", "[outv]", "-map", "0:a?", "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "aac", str(out_path)]
    else:
        cmd = ["ffmpeg", "-y", "-i", str(in_path), "-vf", f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}", "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "aac", str(out_path)]

    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return {"id": job_id, "filename": out_fn, "url": f"/api/videos/stream/{out_fn}", "aspect_ratio": aspect_ratio}

class ClickToAdRequest(BaseModel):
    store_url: str = "yourstore.com"
    product_name: str = "Aura Pro Smart Ring"
    price: str = "$149"
    cta: str = "SHOP NOW - 40% OFF"
    voice_id: str = "en-US-AriaNeural"
    aspect_ratio: str = "9:16"

@router.post("/video/click-to-ad")
async def click_to_ad_endpoint(req: ClickToAdRequest):
    """
    Marketing Studio / Click-to-Ad: Turn any store URL / product into a ready-to-launch video ad!
    """
    job_id = str(uuid.uuid4())[:8]
    scenes = [
        {"text": f"Stop scrolling! Meet the {req.product_name}.", "query": f"{req.product_name} luxury product studio"},
        {"text": f"Engineered to upgrade your daily life in seconds.", "query": f"modern lifestyle minimal aesthetic luxury"},
        {"text": f"Grab yours today for just {req.price} at {req.store_url}. {req.cta}!", "query": f"futuristic sleek tech gadget close up"}
    ]
    full_script = " ".join(s["text"] for s in scenes)
    voice_res = await VoiceService.synthesize_speech(full_script, req.voice_id, f"ad_audio_{job_id}.mp3", rate="+10%")
    sub_path = OUTPUT_DIR / f"ad_sub_{job_id}.ass"
    SubtitleService.generate_ass_subtitles(voice_res["word_boundaries"], sub_path, style="volt", aspect_ratio=req.aspect_ratio)
    clips = await VisualService.fetch_or_generate_visuals(scenes, voice_res["duration"], job_id, req.aspect_ratio, camera_move="crash_zoom")
    thumb = VisualService.generate_thumbnail(Path(clips[0]), f"{req.product_name} {req.price}", f"ad_thumb_{job_id}.jpg", req.aspect_ratio)

    comp = ComposerService.compose_video(
        clips, voice_res["audio_path"], str(sub_path), f"ad_{job_id}.mp4",
        aspect_ratio=req.aspect_ratio, caption_style="volt", bg_music=True,
        transition="wipeleft", color_fx="teal_orange", progress_bar=True,
        watermark=req.store_url, hook_text=f"{req.cta} ({req.price})"
    )
    record = {
        "id": job_id, "title": f"AD: {req.product_name}", "niche": "marketing_ad",
        "visual_style": "teal_orange", "aspect_ratio": req.aspect_ratio, "script": full_script,
        "duration": comp["duration"], "filename": comp["filename"], "thumbnail_filename": thumb,
        "url": f"/api/videos/stream/{comp['filename']}", "thumbnail_url": f"/api/videos/stream/{thumb}",
        "tags": ["#ad", "#ecommerce", "#viral"], "status": "ready"
    }
    save_video(record)
    return record

class ShortDramaRequest(BaseModel):
    title: str = "Midnight Betrayal"
    char_a_voice: str = "en-US-ChristopherNeural"
    char_b_voice: str = "en-US-AriaNeural"
    lines: List[Dict[str, str]] = [
        {"speaker": "A", "text": "You told me nobody else knew about the vault.", "query": "dark luxury office night shadow man"},
        {"speaker": "B", "text": "I never lied to you. I just didn't tell you who opened it.", "query": "mysterious woman silhouette neon window"},
        {"speaker": "A", "text": "Then why is your keycard on the security log?", "query": "glowing security screen red alert"}
    ]

@router.post("/video/short-drama")
async def short_drama_endpoint(req: ShortDramaRequest):
    """
    Short Drama Studio: Multi-character episodic vertical drama with distinct neural voices per actor!
    """
    job_id = str(uuid.uuid4())[:8]
    audio_parts = []
    word_boundaries = []
    offset_acc = 0.0
    scenes = []

    for idx, line in enumerate(req.lines):
        v_id = req.char_a_voice if line.get("speaker", "A").upper() == "A" else req.char_b_voice
        v_res = await VoiceService.synthesize_speech(line["text"], v_id, f"drama_{job_id}_{idx}.mp3", rate="+6%")
        audio_parts.append(v_res["audio_path"])
        for wb in v_res["word_boundaries"]:
            word_boundaries.append({
                "text": wb["text"],
                "start": round(wb["start"] + offset_acc, 3),
                "end": round(wb["end"] + offset_acc, 3),
                "duration": wb["duration"]
            })
        offset_acc += ComposerService._get_duration(v_res["audio_path"], fallback=v_res["duration"] or 3.0)
        scenes.append({"text": line["text"], "query": line.get("query", "dramatic cinema scene")})

    # Concatenate multi-actor audio tracks cleanly
    merged_audio = OUTPUT_DIR / f"drama_merged_{job_id}.mp3"
    list_txt = OUTPUT_DIR / f"drama_alist_{job_id}.txt"
    with open(list_txt, "w", encoding="utf-8") as f:
        for ap in audio_parts:
            clean = str(Path(ap).resolve()).replace("\\", "/")
            f.write(f"file '{clean}'\n")
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_txt), "-c:a", "libmp3lame", str(merged_audio)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    sub_path = OUTPUT_DIR / f"drama_sub_{job_id}.ass"
    SubtitleService.generate_ass_subtitles(word_boundaries, sub_path, style="hormozi", aspect_ratio="9:16")
    clips = await VisualService.fetch_or_generate_visuals(scenes, offset_acc, job_id, "9:16", camera_move="handheld")
    thumb = VisualService.generate_thumbnail(Path(clips[0]), req.title, f"drama_thumb_{job_id}.jpg", "9:16")

    comp = ComposerService.compose_video(
        clips, str(merged_audio), str(sub_path), f"drama_{job_id}.mp4",
        aspect_ratio="9:16", caption_style="hormozi", bg_music=True,
        transition="fade", color_fx="moody_a24", camera_body="35mm_kodak",
        lens_type="anamorphic", progress_bar=True, hook_text=f"EP. 1: {req.title}"
    )
    record = {
        "id": job_id, "title": f"Drama: {req.title}", "niche": "short_drama",
        "visual_style": "moody_a24", "aspect_ratio": "9:16", "script": " ".join(l["text"] for l in req.lines),
        "duration": comp["duration"], "filename": comp["filename"], "thumbnail_filename": thumb,
        "url": f"/api/videos/stream/{comp['filename']}", "thumbnail_url": f"/api/videos/stream/{thumb}",
        "tags": ["#shortdrama", "#series", "#cinema"], "status": "ready"
    }
    save_video(record)
    return record

@router.post("/video/genjutsu-remake")
async def genjutsu_lipsync_remake(
    file: UploadFile = File(...),
    new_script: str = Form("This is your reference video remade with cinema LUTs and AI dubbing."),
    voice_id: str = Form("en-US-ChristopherNeural"),
    color_fx: str = Form("cyberpunk"),
    camera_body: str = Form("35mm_kodak")
):
    """
    Genjutsu / Lipsync Remake: Preserves original video timing & motion while replacing audio + applying Cinema remake grade + captions.
    """
    job_id = str(uuid.uuid4())[:8]
    in_path = OUTPUT_DIR / f"genj_in_{job_id}_{file.filename}"
    with open(in_path, "wb") as f:
        f.write(await file.read())

    v_res = await VoiceService.synthesize_speech(new_script, voice_id, f"genj_a_{job_id}.mp3", rate="+5%")
    sub_path = OUTPUT_DIR / f"genj_sub_{job_id}.ass"
    SubtitleService.generate_ass_subtitles(v_res["word_boundaries"], sub_path, style="volt", aspect_ratio="9:16")

    comp = ComposerService.compose_video(
        [str(in_path)], v_res["audio_path"], str(sub_path), f"genjutsu_{job_id}.mp4",
        aspect_ratio="9:16", caption_style="volt", bg_music=True,
        transition="none", color_fx=color_fx, camera_body=camera_body, progress_bar=True
    )
    return {"id": job_id, "filename": comp["filename"], "url": f"/api/videos/stream/{comp['filename']}", "duration": comp["duration"]}

# ==================== AUDIO SUITE ====================

class TTSRequest(BaseModel):
    text: str
    voice_id: str = "en-US-ChristopherNeural"
    rate: str = "+0%"

@router.post("/audio/tts")
async def audio_tts_studio(req: TTSRequest):
    job_id = str(uuid.uuid4())[:8]
    res = await VoiceService.synthesize_speech(req.text, req.voice_id, f"tts_{job_id}.mp3", rate=req.rate)
    return {
        "id": job_id,
        "filename": res["filename"],
        "url": f"/api/videos/stream/{res['filename']}",
        "duration": res["duration"],
        "voice": res["voice"]
    }

VOICE_CHANGE_FILTERS = {
    "deep_trailer": "asetrate=44100*0.80,aresample=44100,atempo=1.25,bass=g=8",
    "studio_radio": "highpass=f=80,lowpass=f=8000,acompressor=threshold=-18dB:ratio=4,bass=g=4",
    "cyber_robot": "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)',aecho=0.8:0.88:60:0.4",
    "high_energetic": "asetrate=44100*1.22,aresample=44100,atempo=0.82",
    "vintage_phone": "highpass=f=350,lowpass=f=3200,acrusher=bits=8:mode=log",
    "ethereal_echo": "aecho=0.8:0.9:400|800:0.35|0.2"
}

@router.post("/audio/voice-change")
async def voice_change_endpoint(file: UploadFile = File(...), preset: str = Form("deep_trailer")):
    job_id = str(uuid.uuid4())[:8]
    in_path = OUTPUT_DIR / f"vc_in_{job_id}_{file.filename}"
    with open(in_path, "wb") as f:
        f.write(await file.read())

    out_fn = f"vc_{preset}_{job_id}.mp3"
    out_path = OUTPUT_DIR / out_fn
    af = VOICE_CHANGE_FILTERS.get(preset, VOICE_CHANGE_FILTERS["deep_trailer"])
    subprocess.run(["ffmpeg", "-y", "-i", str(in_path), "-af", af, "-c:a", "libmp3lame", str(out_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return {"id": job_id, "filename": out_fn, "url": f"/api/videos/stream/{out_fn}", "preset": preset}

TRANSLATE_VOICES = {
    "es": ("es-ES-AlvaroNeural", "Spanish"),
    "fr": ("fr-FR-HenriNeural", "French"),
    "de": ("de-DE-ConradNeural", "German"),
    "it": ("it-IT-DiegoNeural", "Italian"),
    "hi": ("hi-IN-MadhurNeural", "Hindi"),
    "ar": ("ar-SA-HamedNeural", "Arabic"),
    "ja": ("ja-JP-KeitaNeural", "Japanese"),
    "ko": ("ko-KR-InJoonNeural", "Korean"),
    "pt": ("pt-BR-AntonioNeural", "Portuguese")
}

class TranslateDubRequest(BaseModel):
    text: str
    target_lang: str = "es"

@router.post("/audio/translate-dub")
async def translate_and_dub(req: TranslateDubRequest):
    """
    Translates text via free MyMemory API (zero key!) and synthesizes a native neural voice dub!
    """
    job_id = str(uuid.uuid4())[:8]
    voice_id, lang_name = TRANSLATE_VOICES.get(req.target_lang, ("es-ES-AlvaroNeural", "Spanish"))
    translated = req.text

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get("https://api.mymemory.translated.net/get", params={"q": req.text[:480], "langpair": f"en|{req.target_lang}"})
            if r.status_code == 200:
                t = r.json().get("responseData", {}).get("translatedText")
                if t:
                    translated = t
    except Exception as e:
        print(f"Translate fallback: {e}")

    res = await VoiceService.synthesize_speech(translated, voice_id, f"dub_{req.target_lang}_{job_id}.mp3")
    return {
        "id": job_id,
        "language": lang_name,
        "translated_text": translated,
        "voice": voice_id,
        "filename": res["filename"],
        "url": f"/api/videos/stream/{res['filename']}"
    }

# ==================== BUILT-IN MUSIC LIBRARY & CUSTOM UPLOAD ====================

@router.get("/audio/music-library")
async def get_music_library():
    return AudioEngine.list_music()

@router.get("/audio/music-preview")
async def preview_music_mood(mood: str = "dark_cinematic"):
    path = AudioEngine.generate_music_preview(mood)
    return FileResponse(path=path, media_type="audio/mpeg")

@router.post("/audio/music-upload")
async def upload_custom_music(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())[:8]
    safe_name = f"custom_bgm_{job_id}_{file.filename.replace(' ', '_')}"
    target = OUTPUT_DIR / safe_name
    with open(target, "wb") as f:
        f.write(await file.read())
    return {"filename": safe_name, "url": f"/api/videos/stream/{safe_name}"}

# ==================== HYPERFRAMES MOTION GRAPHICS ENGINE (60FPS) ====================

class HyperFramesRequest(BaseModel):
    headline: str = "AI VIDEO EDITING 2.0"
    stat_value: str = "10X FASTER"
    stat_label: str = "BROADCAST 60FPS PIPELINE"
    bullets: List[str] = [
        "Programmatic Kinetic Typography",
        "Automated Ducking & Whoosh SFX",
        "Broadcast -14 LUFS & 4K Export"
    ]
    narration: str = "Stop spending six hours on manual keyframes. Programmatic motion graphics render crisp kinetic typography, animated stat cards, and broadcast audio in seconds."
    accent_hex: str = "D9FF00"
    voice_id: str = "en-US-ChristopherNeural"
    music_mood: str = "cyberpunk_synth"
    aspect_ratio: str = "9:16"

@router.post("/video/hyperframes")
async def render_hyperframes_motion_reel(req: HyperFramesRequest):
    """
    HyperFrames-inspired deterministic 60fps programmatic motion graphics engine:
    Renders kinetic typography, eased sliding stat cards, glowing OLED grid,
    animated beat bars, synchronized Whoosh SFX, ducked music, and -14 LUFS mastering.
    """
    job_id = str(uuid.uuid4())[:8]
    w, h = VisualService.get_dimensions(req.aspect_ratio)
    accent = f"0x{req.accent_hex.lstrip('#')[:6]}"

    # 1. Synthesize Voiceover + Subtitles
    v_res = await VoiceService.synthesize_speech(req.narration, req.voice_id, f"hf_a_{job_id}.mp3", rate="+8%")
    dur = ComposerService._get_duration(v_res["audio_path"], fallback=v_res["duration"] or 14.0)
    sub_path = OUTPUT_DIR / f"hf_sub_{job_id}.ass"
    SubtitleService.generate_ass_subtitles(v_res["word_boundaries"], sub_path, style="volt", aspect_ratio=req.aspect_ratio)

    # 2. Generate Music Bed + Whoosh SFX
    bgm_path = OUTPUT_DIR / f"hf_bgm_{job_id}.mp3"
    AudioEngine.generate_music_track(req.music_mood, dur + 1.0, bgm_path)
    whoosh_path = AudioEngine.generate_whoosh_sfx(MUSIC_DIR / "sfx_whoosh.mp3")

    # Clean text for FFmpeg drawtext
    def clean(t: str, limit: int = 34) -> str:
        return t.replace("'", "").replace(":", " -").replace("%", "pct")[:limit].upper()

    hl = clean(req.headline, 28)
    sv = clean(req.stat_value, 18)
    sl = clean(req.stat_label, 30)
    b_list = [clean(b, 34) for b in (req.bullets[:3] or ["Kinetic Motion", "Broadcast Audio", "Zero Cost"])]

    sub_esc = str(sub_path.resolve()).replace("\\", "/").replace(":", "\\:")
    out_fn = f"hyperframes_{job_id}.mp4"
    out_path = OUTPUT_DIR / out_fn

    # Build 60fps deterministic vector motion-graphics filtergraph
    v_chain = (
        f"color=c=0x050507:s={w}x{h}:d={dur:.2f}:r=60[bg];"
        f"[0:a]showwaves=s={w}x200:mode=cline:colors={accent}|0x38bdf8:rate=60[waves];"
        f"[bg][waves]overlay=0:{int(h*0.78)}[base];"
        # Top sliding progress bar
        f"color=c={accent}:s={w}x10:d={dur:.2f}:r=60[pbar];"
        f"[base][pbar]overlay=x='-W+(W*t/{dur:.2f})':y=0:shortest=1[v0];"
        # Kinetic Header Card (slides from top y=-120 -> y=160)
        f"[v0]drawgrid=width=90:height=90:thickness=1:color=white@0.05,"
        f"drawbox=x=56:y='min({int(h*0.10)},-160+950*t)':w={w-112}:h=180:color=0x0F111A@0.92:t=fill,"
        f"drawbox=x=56:y='min({int(h*0.10)},-160+950*t)':w=10:h=180:color={accent}:t=fill,"
        f"drawtext=text='HYPERFRAMES MOTION ENGINE':fontcolor={accent}:fontsize=26:x=96:y='min({int(h*0.10)+30},-130+950*t)',"
        f"drawtext=text='{hl}':fontcolor=white:fontsize=54:x=96:y='min({int(h*0.10)+76},-84+950*t)',"
        # Big Stat Pop Card (appears at t=1.2s sliding in from right)
        f"drawbox=x='max(56,{w}-1800*(t-1.2))':y={int(h*0.24)}:w={w-112}:h=210:color=0x151824@0.95:t=fill:enable='gte(t,1.2)',"
        f"drawtext=text='{sv}':fontcolor={accent}:fontsize=84:x='max(96,{w}+40-1800*(t-1.2))':y={int(h*0.24)+36}:enable='gte(t,1.2)',"
        f"drawtext=text='{sl}':fontcolor=0xA6A6B8:fontsize=30:x='max(96,{w}+40-1800*(t-1.2))':y={int(h*0.24)+136}:enable='gte(t,1.2)',"
        # Staggered Kinetic Bullet Cards (t=2.8s, 4.4s, 6.0s)
        f"drawtext=text='01  {b_list[0]}':fontcolor=white:fontsize=38:box=1:boxcolor=0x0D0D14@0.9:boxborderw=18:x='min(64,-700+1600*(t-2.8))':y={int(h*0.40)}:enable='gte(t,2.8)',"
        f"drawtext=text='02  {b_list[1] if len(b_list)>1 else b_list[0]}':fontcolor=white:fontsize=38:box=1:boxcolor=0x0D0D14@0.9:boxborderw=18:x='min(64,-700+1600*(t-4.4))':y={int(h*0.47)}:enable='gte(t,4.4)',"
        f"drawtext=text='03  {b_list[2] if len(b_list)>2 else b_list[0]}':fontcolor={accent}:fontsize=38:box=1:boxcolor=0x0D0D14@0.9:boxborderw=18:x='min(64,-700+1600*(t-6.0))':y={int(h*0.54)}:enable='gte(t,6.0)',"
        f"subtitles='{sub_esc}'[vout];"
        # Broadcast audio mastering with sidechain ducking + whoosh SFX at card entrances
        f"[0:a]aformat=sample_rates=44100:channel_layouts=stereo,asplit=2[vm][vsc];"
        f"[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.25[bm];"
        f"[bm][vsc]sidechaincompress=threshold=0.03:ratio=6:attack=25:release=250[bd];"
        f"[2:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=1100|1100,volume=0.45[w1];"
        f"[3:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=2700|2700,volume=0.40[w2];"
        f"[vm][bd][w1][w2]amix=inputs=4:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[aout]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", v_res["audio_path"],
        "-i", str(bgm_path),
        "-i", str(whoosh_path),
        "-i", str(whoosh_path),
        "-filter_complex", v_chain,
        "-map", "[vout]", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "256k",
        "-t", f"{dur:.2f}",
        str(out_path)
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise HTTPException(status_code=500, detail=f"HyperFrames FFmpeg error: {proc.stderr[-500:]}")

    thumb_fn = f"hf_thumb_{job_id}.jpg"
    subprocess.run(["ffmpeg", "-y", "-ss", "3.2", "-i", str(out_path), "-frames:v", "1", str(OUTPUT_DIR / thumb_fn)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    record = {
        "id": job_id, "title": f"Motion Reel: {req.headline}", "niche": "hyperframes",
        "visual_style": "hyperframes_60fps", "aspect_ratio": req.aspect_ratio, "script": req.narration,
        "duration": round(dur, 2), "filename": out_fn, "thumbnail_filename": thumb_fn,
        "url": f"/api/videos/stream/{out_fn}", "thumbnail_url": f"/api/videos/stream/{thumb_fn}",
        "tags": ["#hyperframes", "#motiongraphics", "#60fps", "#ai"], "status": "ready"
    }
    save_video(record)
    return record

# ==================== LYRIC VIDEO MAKER (AITuber Toolkit) ====================

@router.post("/video/lyric-video")
async def create_lyric_video(
    file: UploadFile = File(...),
    title: str = Form("Midnight Echoes"),
    lyrics: str = Form("Lights fade into neon rain\nEvery beat rewrites the night\nFeel the pulse inside the frame"),
    aspect_ratio: str = Form("9:16")
):
    job_id = str(uuid.uuid4())[:8]
    in_audio = OUTPUT_DIR / f"lyr_a_{job_id}_{file.filename}"
    with open(in_audio, "wb") as f:
        f.write(await file.read())

    dur = ComposerService._get_duration(str(in_audio), fallback=20.0)
    lines = [ln.strip() for ln in lyrics.splitlines() if ln.strip()] or [title]
    per_line = dur / max(1, len(lines))

    # Build timed word boundaries for bold lyric captions
    wbs = []
    for idx, ln in enumerate(lines):
        words = ln.split()
        t0 = idx * per_line
        pw = per_line / max(1, len(words))
        for wi, w_str in enumerate(words):
            wbs.append({"text": w_str, "start": round(t0 + wi * pw, 3), "end": round(t0 + (wi + 1) * pw, 3), "duration": round(pw, 3)})

    sub_path = OUTPUT_DIR / f"lyr_sub_{job_id}.ass"
    SubtitleService.generate_ass_subtitles(wbs, sub_path, style="volt", aspect_ratio=aspect_ratio)
    w, h = VisualService.get_dimensions(aspect_ratio)
    out_fn = f"lyric_{job_id}.mp4"
    out_path = OUTPUT_DIR / out_fn
    sub_esc = str(sub_path.resolve()).replace("\\", "/").replace(":", "\\:")

    fc = (
        f"color=c=0x050507:s={w}x{h}:d={dur:.2f}[bg];"
        f"[0:a]showwaves=s={w}x{int(h*0.32)}:mode=cline:colors=0xD9FF00|0x38bdf8:rate=30[waves];"
        f"[bg][waves]overlay=0:{int(h*0.62)},vignette=PI/3.5,subtitles='{sub_esc}'[outv]"
    )
    subprocess.run([
        "ffmpeg", "-y", "-i", str(in_audio), "-filter_complex", fc,
        "-map", "[outv]", "-map", "0:a",
        "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "256k", "-t", f"{dur:.2f}", str(out_path)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    record = {
        "id": job_id, "title": f"Lyric Video: {title}", "niche": "lyric_video",
        "visual_style": "visualizer", "aspect_ratio": aspect_ratio, "script": lyrics,
        "duration": round(dur, 2), "filename": out_fn, "thumbnail_filename": "",
        "url": f"/api/videos/stream/{out_fn}", "thumbnail_url": None,
        "tags": ["#lyrics", "#musicvideo", "#spotify"], "status": "ready"
    }
    save_video(record)
    return record
