import asyncio
import json
import subprocess
import uuid
import httpx
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from app.core.config import OUTPUT_DIR
from app.core.database import get_conn, save_video
from app.services.visual_service import VisualService
from app.services.voice_service import VoiceService
from app.services.subtitle_service import SubtitleService
from app.services.composer_service import ComposerService, COLOR_LUT_FILTERS

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
