import subprocess
import uuid
import httpx
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from app.core.config import OUTPUT_DIR
from app.core.database import save_video
from app.services.voice_service import VoiceService
from app.services.subtitle_service import SubtitleService
from app.services.visual_service import VisualService
from app.services.composer_service import ComposerService
from app.services.script_service import ScriptService
from app.routers.studio_tools import TRANSLATE_VOICES

router = APIRouter(prefix="/super", tags=["CapCut, Eromify & HeyGen Super Suite"])

def _clean_txt(t: str, limit: int = 44) -> str:
    return t.replace("'", "").replace(":", " -").replace("%", "pct").replace("\n", " ")[:limit].strip()

# ==================== 1. EROMIFY CLIPPING AGENT ====================

@router.post("/clipping-agent")
async def clipping_agent(
    file: UploadFile = File(...),
    clip_length: int = Form(12),
    num_clips: int = Form(3),
    hook_prefix: str = Form("VIRAL MOMENT")
):
    """
    Eromify Clipping Agent: Long Video In -> Multiple 9:16 Viral Clips Out!
    Automatically slices an uploaded long video into vertical 1080x1920 shorts
    with blurred cinema background, top progress bar, and hook badge.
    """
    job_id = str(uuid.uuid4())[:8]
    in_path = OUTPUT_DIR / f"long_{job_id}_{file.filename.replace(' ', '_')}"
    with open(in_path, "wb") as f:
        f.write(await file.read())

    total_dur = ComposerService._get_duration(str(in_path), fallback=30.0)
    count = max(1, min(5, num_clips))
    seg_len = min(float(clip_length), max(3.0, total_dur / count))
    clips_out = []

    for i in range(count):
        start_t = min(max(0.0, (total_dur / count) * i), max(0.0, total_dur - seg_len))
        out_fn = f"vclip_{job_id}_{i+1}.mp4"
        out_path = OUTPUT_DIR / out_fn
        badge = _clean_txt(f"{hook_prefix} #{i+1}", 26).upper()

        fc = (
            f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:10[bg];"
            f"[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2[v0];"
            f"color=c=0xD9FF00:s=1080x10:d={seg_len:.2f}[pbar];"
            f"[v0][pbar]overlay=x='-W+(W*t/{seg_len:.2f})':y=0:shortest=1[v1];"
            f"[v1]drawtext=text='{badge}':fontcolor=0x050507:fontsize=42:box=1:boxcolor=0xD9FF00@0.95:boxborderw=14:x=(w-text_w)/2:y=140[outv]"
        )
        cmd = [
            "ffmpeg", "-y", "-ss", f"{start_t:.2f}", "-t", f"{seg_len:.2f}",
            "-i", str(in_path),
            "-filter_complex", fc,
            "-map", "[outv]", "-map", "0:a?",
            "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            str(out_path)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if out_path.exists():
            rec = {
                "id": f"{job_id}_{i+1}",
                "title": f"Viral Clip #{i+1} ({int(start_t)}s-{int(start_t+seg_len)}s)",
                "niche": "clipping_agent",
                "aspect_ratio": "9:16",
                "script": f"Auto-clipped viral segment #{i+1}",
                "duration": round(seg_len, 2),
                "filename": out_fn,
                "url": f"/api/videos/stream/{out_fn}",
                "tags": ["#clips", "#shorts", "#viral"]
            }
            save_video(rec)
            clips_out.append(rec)

    return {"source_duration": round(total_dur, 2), "clips": clips_out}

# ==================== 2. HEYGEN VIDEO AGENT (1-PROMPT AUTONOMOUS) ====================

class VideoAgentRequest(BaseModel):
    prompt: str

@router.post("/video-agent")
async def autonomous_video_agent(req: VideoAgentRequest):
    """
    HeyGen Video Agent: Single natural-language prompt -> autonomously chooses
    niche, aspect ratio, camera rig, LUT, voice, music mood, and renders complete MP4!
    """
    p = req.prompt.lower()
    aspect = "16:9" if any(k in p for k in ["youtube", "16:9", "landscape", "film", "documentary"]) else ("1:1" if "square" in p else "9:16")
    niche = "true_crime" if any(k in p for k in ["crime", "mystery", "murder", "detective"]) else (
        "cyberpunk_scifi" if any(k in p for k in ["cyberpunk", "future", "2050", "ai", "sci-fi"]) else (
        "stoicism" if any(k in p for k in ["stoic", "marcus", "discipline"]) else (
        "wealth_secrets" if any(k in p for k in ["money", "wealth", "rich", "business"]) else (
        "horror" if any(k in p for k in ["scary", "horror", "ghost"]) else (
        "motivational" if any(k in p for k in ["motivat", "grind", "gym"]) else "dark_psychology")))))
    lut = "noir" if niche in ("true_crime", "horror") else ("cyberpunk" if niche == "cyberpunk_scifi" else "teal_orange")
    move = "crash_zoom" if "fast" in p or "viral" in p else ("handheld" if niche == "horror" else "dolly_in")
    mood = "cyberpunk_synth" if niche == "cyberpunk_scifi" else ("true_crime_suspense" if niche in ("true_crime", "horror") else "dark_cinematic")

    job_id = str(uuid.uuid4())[:8]
    script_data = await ScriptService.generate_script(niche, req.prompt[:60], lut)
    voice_res = await VoiceService.synthesize_speech(script_data["full_script"], "en-US-ChristopherNeural", f"va_a_{job_id}.mp3", rate="+8%")
    sub_path = OUTPUT_DIR / f"va_sub_{job_id}.ass"
    SubtitleService.generate_ass_subtitles(voice_res["word_boundaries"], sub_path, style="volt", aspect_ratio=aspect)
    clips = await VisualService.fetch_or_generate_visuals(script_data["scenes"], voice_res["duration"], job_id, aspect, camera_move=move)
    thumb = VisualService.generate_thumbnail(Path(clips[0]), script_data["title"], f"va_thumb_{job_id}.jpg", aspect)

    comp = ComposerService.compose_video(
        clips, voice_res["audio_path"], str(sub_path), f"vagent_{job_id}.mp4",
        aspect_ratio=aspect, caption_style="volt", bg_music=True, music_mood=mood,
        transition="fade", color_fx=lut, progress_bar=True, hook_text=script_data.get("hook", ""),
        motion_graphics=True, sfx_whoosh=True
    )
    record = {
        "id": job_id, "title": f"Agent: {script_data['title']}", "niche": niche,
        "visual_style": lut, "aspect_ratio": aspect, "script": script_data["full_script"],
        "duration": comp["duration"], "filename": comp["filename"], "thumbnail_filename": thumb,
        "url": f"/api/videos/stream/{comp['filename']}", "thumbnail_url": f"/api/videos/stream/{thumb}",
        "tags": ["#videoagent", f"#{niche}", "#ai"], "agent_plan": {"niche": niche, "aspect_ratio": aspect, "lut": lut, "camera_move": move, "music_mood": mood},
        "status": "ready"
    }
    save_video(record)
    return record

# ==================== 3. HEYGEN PHOTO AVATAR / IMAGE TO VIDEO ====================

@router.post("/photo-avatar")
async def photo_avatar_endpoint(
    file: UploadFile = File(...),
    script: str = Form("Hello! I am your AI photo avatar speaking directly from a single portrait image."),
    voice_id: str = Form("en-US-AriaNeural"),
    aspect_ratio: str = Form("9:16")
):
    """
    HeyGen Photo Avatar / Image-to-Video:
    Drops in any portrait photo -> animates subtle breathing camera drift,
    audio-reactive speaking waveform ring, voiceover, and bold viral captions!
    """
    job_id = str(uuid.uuid4())[:8]
    in_img = OUTPUT_DIR / f"avatar_in_{job_id}_{file.filename.replace(' ', '_')}"
    with open(in_img, "wb") as f:
        f.write(await file.read())

    v_res = await VoiceService.synthesize_speech(script, voice_id, f"av_a_{job_id}.mp3", rate="+4%")
    dur = ComposerService._get_duration(v_res["audio_path"], fallback=v_res["duration"] or 8.0)
    sub_path = OUTPUT_DIR / f"av_sub_{job_id}.ass"
    SubtitleService.generate_ass_subtitles(v_res["word_boundaries"], sub_path, style="volt", aspect_ratio=aspect_ratio)

    w, h = VisualService.get_dimensions(aspect_ratio)
    anim_clip = OUTPUT_DIR / f"av_clip_{job_id}.mp4"
    VisualService._animate_camera_rig(in_img, anim_clip, dur + 0.3, w, h, "handheld", 0)

    out_fn = f"photo_avatar_{job_id}.mp4"
    out_path = OUTPUT_DIR / out_fn
    sub_esc = str(sub_path.resolve()).replace("\\", "/").replace(":", "\\:")

    fc = (
        f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},vignette=PI/4[v0];"
        f"[1:a]showwaves=s={w}x140:mode=cline:colors=0xD9FF00|0x38bdf8:rate=30[waves];"
        f"[v0][waves]overlay=0:{int(h*0.84)},subtitles='{sub_esc}'[vout]"
    )
    subprocess.run([
        "ffmpeg", "-y", "-i", str(anim_clip), "-i", v_res["audio_path"],
        "-filter_complex", fc, "-map", "[vout]", "-map", "1:a",
        "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-t", f"{dur:.2f}", str(out_path)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    rec = {
        "id": job_id, "title": "Photo Avatar Video", "niche": "photo_avatar",
        "aspect_ratio": aspect_ratio, "script": script, "duration": round(dur, 2),
        "filename": out_fn, "url": f"/api/videos/stream/{out_fn}", "tags": ["#avatar", "#ai"]
    }
    save_video(rec)
    return rec

# ==================== 4. HEYGEN VIDEO PODCAST GENERATOR ====================

class PodcastRequest(BaseModel):
    show_title: str = "THE AI SIGNAL PODCAST"
    host_a_name: str = "ALEX"
    host_b_name: str = "MAYA"
    host_a_voice: str = "en-US-ChristopherNeural"
    host_b_voice: str = "en-US-AriaNeural"
    dialogue: List[Dict[str, str]] = [
        {"host": "A", "text": "Welcome back to the studio. Today we're talking about how solo creators are replacing entire agencies with AI."},
        {"host": "B", "text": "It's wild. One person can now script, voice, color grade, and publish across six platforms before breakfast."},
        {"host": "A", "text": "And the biggest shift isn't speed—it's that broadcast quality is now completely free to run."}
    ]

@router.post("/video-podcast")
async def video_podcast_generator(req: PodcastRequest):
    """
    HeyGen Video Podcast Generator: Dual-host AI studio podcast with split-screen
    studio deck, host portraits, live waveform, dual neural voices, and captions!
    """
    job_id = str(uuid.uuid4())[:8]
    img_a = OUTPUT_DIR / await VisualService.generate_scene_image_preview("man podcast host studio microphone dark neon", "1:1")
    img_b = OUTPUT_DIR / await VisualService.generate_scene_image_preview("woman podcast host headphones studio microphone neon", "1:1")

    audio_parts = []
    wbs = []
    acc = 0.0
    for idx, turn in enumerate(req.dialogue):
        vid = req.host_a_voice if turn.get("host", "A").upper() == "A" else req.host_b_voice
        vr = await VoiceService.synthesize_speech(turn["text"], vid, f"pod_{job_id}_{idx}.mp3", rate="+5%")
        audio_parts.append(vr["audio_path"])
        for wb in vr["word_boundaries"]:
            wbs.append({"text": wb["text"], "start": round(wb["start"] + acc, 3), "end": round(wb["end"] + acc, 3), "duration": wb["duration"]})
        acc += ComposerService._get_duration(vr["audio_path"], fallback=vr["duration"] or 3.5)

    merged_a = OUTPUT_DIR / f"pod_merged_{job_id}.mp3"
    alist = OUTPUT_DIR / f"pod_alist_{job_id}.txt"
    with open(alist, "w", encoding="utf-8") as f:
        for ap in audio_parts:
            f.write(f"file '{str(Path(ap).resolve()).replace(chr(92), '/')}'\n")
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(alist), "-c:a", "libmp3lame", str(merged_a)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    sub_path = OUTPUT_DIR / f"pod_sub_{job_id}.ass"
    SubtitleService.generate_ass_subtitles(wbs, sub_path, style="hormozi", aspect_ratio="16:9")
    sub_esc = str(sub_path.resolve()).replace("\\", "/").replace(":", "\\:")

    out_fn = f"podcast_{job_id}.mp4"
    out_path = OUTPUT_DIR / out_fn
    show_clean = _clean_txt(req.show_title, 34).upper()
    ha = _clean_txt(req.host_a_name, 16).upper()
    hb = _clean_txt(req.host_b_name, 16).upper()

    fc = (
        f"color=c=0x07080D:s=1920x1080:d={acc:.2f}:r=30[bg];"
        f"[0:v]scale=780:560:force_original_aspect_ratio=increase,crop=780:560,pad=788:568:4:4:0xD9FF00[pa];"
        f"[1:v]scale=780:560:force_original_aspect_ratio=increase,crop=780:560,pad=788:568:4:4:0x38BDF8[pb];"
        f"[bg][pa]overlay=130:210[s1];[s1][pb]overlay=1002:210[s2];"
        f"[2:a]showwaves=s=1660x110:mode=cline:colors=0xD9FF00|0x38bdf8:rate=30[waves];"
        f"[s2][waves]overlay=130:815,"
        f"drawtext=text='{show_clean}':fontcolor=0xD9FF00:fontsize=44:x=(w-text_w)/2:y=70,"
        f"drawtext=text='HOST: {ha}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.8:boxborderw=10:x=150:y=720,"
        f"drawtext=text='HOST: {hb}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.8:boxborderw=10:x=1022:y=720,"
        f"subtitles='{sub_esc}'[vout]"
    )
    subprocess.run([
        "ffmpeg", "-y", "-loop", "1", "-i", str(img_a), "-loop", "1", "-i", str(img_b), "-i", str(merged_a),
        "-filter_complex", fc, "-map", "[vout]", "-map", "2:a",
        "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-t", f"{acc:.2f}", str(out_path)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    rec = {
        "id": job_id, "title": f"Podcast: {req.show_title}", "niche": "video_podcast",
        "aspect_ratio": "16:9", "script": " ".join(t["text"] for t in req.dialogue),
        "duration": round(acc, 2), "filename": out_fn, "url": f"/api/videos/stream/{out_fn}",
        "tags": ["#podcast", "#aihosts", "#video"]
    }
    save_video(rec)
    return rec

# ==================== 5. HEYGEN PPT / SLIDES TO VIDEO ====================

class SlideItem(BaseModel):
    title: str
    bullet: str
    notes: str

class PPTRequest(BaseModel):
    deck_title: str = "Q4 Growth Strategy"
    voice_id: str = "en-US-AriaNeural"
    slides: List[SlideItem] = [
        SlideItem(title="The Problem", bullet="Manual video production costs $3,000/month", notes="Traditional video agencies take weeks and charge thousands for basic social clips."),
        SlideItem(title="The Solution", bullet="Automated AI Cinema Studio at $0/render", notes="With automated pipelines, teams produce broadcast 60fps videos and ads in minutes."),
        SlideItem(title="The Result", bullet="10x output across 6 social platforms", notes="Launch daily channels on YouTube, TikTok, and Instagram with zero marginal cost.")
    ]

@router.post("/ppt-to-video")
async def ppt_to_video_endpoint(req: PPTRequest):
    """
    HeyGen PPT / Slides to Video: Turns slide decks into narrated 16:9 presentation MP4s!
    """
    job_id = str(uuid.uuid4())[:8]
    slide_clips = []
    audio_parts = []
    wbs = []
    acc = 0.0

    for idx, sl in enumerate(req.slides):
        vr = await VoiceService.synthesize_speech(sl.notes, req.voice_id, f"ppt_a_{job_id}_{idx}.mp3", rate="+4%")
        s_dur = ComposerService._get_duration(vr["audio_path"], fallback=vr["duration"] or 4.5)
        audio_parts.append(vr["audio_path"])
        for wb in vr["word_boundaries"]:
            wbs.append({"text": wb["text"], "start": round(wb["start"] + acc, 3), "end": round(wb["end"] + acc, 3), "duration": wb["duration"]})
        acc += s_dur

        clip_p = OUTPUT_DIR / f"ppt_s_{job_id}_{idx}.mp4"
        t_clean = _clean_txt(sl.title, 36).upper()
        b_clean = _clean_txt(sl.bullet, 52)
        d_clean = _clean_txt(req.deck_title, 32).upper()
        vf = (
            "drawgrid=width=96:height=96:thickness=1:color=white@0.04,"
            "drawbox=x=120:y=160:w=1680:h=680:color=0x0F111A@0.95:t=fill,"
            "drawbox=x=120:y=160:w=12:h=680:color=0xD9FF00:t=fill,"
            f"drawtext=text='{d_clean}  //  SLIDE 0{idx+1}':fontcolor=0xD9FF00:fontsize=28:x=180:y=220,"
            f"drawtext=text='{t_clean}':fontcolor=white:fontsize=78:x=180:y=320,"
            f"drawtext=text='{b_clean}':fontcolor=0xA6A6B8:fontsize=44:x=180:y=470"
        )
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c=0x050507:s=1920x1080:d={s_dur+0.5:.2f}:r=30",
            "-vf", vf, "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", str(clip_p)
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        slide_clips.append(str(clip_p))

    merged_a = OUTPUT_DIR / f"ppt_merged_{job_id}.mp3"
    alist = OUTPUT_DIR / f"ppt_alist_{job_id}.txt"
    with open(alist, "w", encoding="utf-8") as f:
        for ap in audio_parts:
            f.write(f"file '{str(Path(ap).resolve()).replace(chr(92), '/')}'\n")
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(alist), "-c:a", "libmp3lame", str(merged_a)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    sub_path = OUTPUT_DIR / f"ppt_sub_{job_id}.ass"
    SubtitleService.generate_ass_subtitles(wbs, sub_path, style="minimal", aspect_ratio="16:9")

    comp = ComposerService.compose_video(
        slide_clips, str(merged_a), str(sub_path), f"ppt_{job_id}.mp4",
        aspect_ratio="16:9", caption_style="minimal", bg_music=True, music_mood="lofi_chill",
        transition="wipeleft", color_fx="none", progress_bar=True, motion_graphics=False, sfx_whoosh=True
    )
    rec = {
        "id": job_id, "title": f"Slides: {req.deck_title}", "niche": "ppt_to_video",
        "aspect_ratio": "16:9", "script": " ".join(s.notes for s in req.slides),
        "duration": comp["duration"], "filename": comp["filename"],
        "url": f"/api/videos/stream/{comp['filename']}", "tags": ["#presentation", "#slides", "#explainer"]
    }
    save_video(rec)
    return rec

# ==================== 6. HEYGEN VIDEO TRANSLATE & AI DUBBING ====================

@router.post("/video-translate")
async def video_translate_dub(
    file: UploadFile = File(...),
    original_script: str = Form("Welcome to the next generation of AI video creation."),
    target_lang: str = Form("es")
):
    """
    HeyGen Video Translate & AI Dubbing:
    Translates script -> synthesizes native neural voice -> swaps video audio -> burns translated captions!
    """
    job_id = str(uuid.uuid4())[:8]
    in_vid = OUTPUT_DIR / f"vtr_in_{job_id}_{file.filename.replace(' ', '_')}"
    with open(in_vid, "wb") as f:
        f.write(await file.read())

    voice_id, lang_name = TRANSLATE_VOICES.get(target_lang, ("es-ES-AlvaroNeural", "Spanish"))
    translated = original_script
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get("https://api.mymemory.translated.net/get", params={"q": original_script[:480], "langpair": f"en|{target_lang}"})
            if r.status_code == 200 and r.json().get("responseData", {}).get("translatedText"):
                translated = r.json()["responseData"]["translatedText"]
    except Exception:
        pass

    vr = await VoiceService.synthesize_speech(translated, voice_id, f"vtr_a_{job_id}.mp3")
    sub_path = OUTPUT_DIR / f"vtr_sub_{job_id}.ass"
    SubtitleService.generate_ass_subtitles(vr["word_boundaries"], sub_path, style="volt", aspect_ratio="9:16")

    comp = ComposerService.compose_video(
        [str(in_vid)], vr["audio_path"], str(sub_path), f"dubbed_{target_lang}_{job_id}.mp4",
        aspect_ratio="9:16", caption_style="volt", bg_music=False, transition="none", color_fx="none",
        progress_bar=False, motion_graphics=False, sfx_whoosh=False
    )
    return {"id": job_id, "language": lang_name, "translated_text": translated, "filename": comp["filename"], "url": f"/api/videos/stream/{comp['filename']}"}

# ==================== 7. CAPCUT MEME MAKER ====================

@router.post("/meme-maker")
async def capcut_meme_maker(
    file: UploadFile = File(...),
    top_text: str = Form("WHEN AI EDITS YOUR VIDEO"),
    bottom_text: str = Form("IN 12 SECONDS FOR $0")
):
    job_id = str(uuid.uuid4())[:8]
    ext = Path(file.filename).suffix.lower() or ".jpg"
    in_path = OUTPUT_DIR / f"meme_in_{job_id}{ext}"
    with open(in_path, "wb") as f:
        f.write(await file.read())

    is_video = ext in (".mp4", ".mov", ".webm", ".mkv")
    out_fn = f"meme_{job_id}{'.mp4' if is_video else '.jpg'}"
    out_path = OUTPUT_DIR / out_fn

    t1 = _clean_txt(top_text, 34).upper()
    t2 = _clean_txt(bottom_text, 34).upper()
    vf = (
        f"drawtext=text='{t1}':fontcolor=white:fontsize=h/11:borderw=6:bordercolor=black:x=(w-text_w)/2:y=h*0.06,"
        f"drawtext=text='{t2}':fontcolor=white:fontsize=h/11:borderw=6:bordercolor=black:x=(w-text_w)/2:y=h-text_h-h*0.06"
    )
    if is_video:
        cmd = ["ffmpeg", "-y", "-i", str(in_path), "-vf", vf, "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "copy", str(out_path)]
    else:
        cmd = ["ffmpeg", "-y", "-i", str(in_path), "-vf", vf, "-frames:v", "1", str(out_path)]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return {"id": job_id, "is_video": is_video, "filename": out_fn, "url": f"/api/videos/stream/{out_fn}"}

# ==================== 8. CAPCUT AI LOGO GENERATOR (SVG + 1024PX PNG) ====================

class LogoRequest(BaseModel):
    brand_name: str = "OMNIVIRAL"
    tagline: str = "AI CINEMA OS"
    accent_hex: str = "D9FF00"
    style: str = "monogram"

@router.post("/logo-generator")
async def capcut_logo_generator(req: LogoRequest):
    job_id = str(uuid.uuid4())[:8]
    initials = "".join(w[0] for w in req.brand_name.split()[:2]).upper() or "AI"
    accent = f"#{req.accent_hex.lstrip('#')[:6]}"
    svg_fn = f"logo_{job_id}.svg"
    png_fn = f"logo_{job_id}.png"

    svg_code = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="g" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="{accent}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#050507" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" rx="220" fill="#050507"/>
  <rect width="1024" height="1024" rx="220" fill="url(#g)"/>
  <rect x="48" y="48" width="928" height="928" rx="184" fill="none" stroke="{accent}" stroke-width="10" stroke-opacity="0.45"/>
  <polygon points="512,180 710,300 710,540 512,660 314,540 314,300" fill="{accent}" fill-opacity="0.14" stroke="{accent}" stroke-width="16"/>
  <text x="512" y="475" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="210" font-weight="900" fill="{accent}">{initials}</text>
  <text x="512" y="795" text-anchor="middle" font-family="Arial, sans-serif" font-size="78" font-weight="700" letter-spacing="10" fill="#FFFFFF">{req.brand_name.upper()[:16]}</text>
  <text x="512" y="868" text-anchor="middle" font-family="monospace" font-size="36" letter-spacing="8" fill="#A6A6B8">{req.tagline.upper()[:24]}</text>
</svg>"""
    with open(OUTPUT_DIR / svg_fn, "w", encoding="utf-8") as f:
        f.write(svg_code)

    # Also render a crisp 1024x1024 PNG via FFmpeg drawbox/drawtext
    bn = _clean_txt(req.brand_name, 16).upper()
    tg = _clean_txt(req.tagline, 24).upper()
    hex_ff = f"0x{req.accent_hex.lstrip('#')[:6]}"
    vf = (
        f"drawbox=x=48:y=48:w=928:h=928:color={hex_ff}@0.5:t=12,"
        f"drawbox=x=312:y=200:w=400:h=400:color={hex_ff}@0.16:t=fill,"
        f"drawbox=x=312:y=200:w=400:h=400:color={hex_ff}:t=14,"
        f"drawtext=text='{initials}':fontcolor={hex_ff}:fontsize=210:x=(w-text_w)/2:y=300,"
        f"drawtext=text='{bn}':fontcolor=white:fontsize=76:x=(w-text_w)/2:y=710,"
        f"drawtext=text='{tg}':fontcolor=0xA6A6B8:fontsize=34:x=(w-text_w)/2:y=815"
    )
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=0x050507:s=1024x1024:d=1", "-vf", vf, "-frames:v", "1", str(OUTPUT_DIR / png_fn)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    return {"id": job_id, "svg_url": f"/api/videos/stream/{svg_fn}", "png_url": f"/api/videos/stream/{png_fn}", "svg_filename": svg_fn, "png_filename": png_fn}

# ==================== 9. CAPCUT REMOVE BACKGROUND (TRANSPARENT PNG) ====================

@router.post("/remove-bg")
async def capcut_remove_bg(
    file: UploadFile = File(...),
    key_color: str = Form("0x000000"),
    similarity: float = Form(0.22)
):
    job_id = str(uuid.uuid4())[:8]
    in_path = OUTPUT_DIR / f"rmbg_in_{job_id}_{file.filename.replace(' ', '_')}"
    with open(in_path, "wb") as f:
        f.write(await file.read())

    out_fn = f"transparent_{job_id}.png"
    out_path = OUTPUT_DIR / out_fn
    cmd = [
        "ffmpeg", "-y", "-i", str(in_path),
        "-vf", f"format=rgba,colorkey={key_color}:{similarity}:0.08",
        "-frames:v", "1", str(out_path)
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return {"id": job_id, "filename": out_fn, "url": f"/api/videos/stream/{out_fn}"}

# ==================== 10. CAPCUT CONVERT TO MP4 & COMPRESS VIDEO ====================

@router.post("/convert-compress")
async def capcut_convert_compress(
    file: UploadFile = File(...),
    level: str = Form("balanced")
):
    job_id = str(uuid.uuid4())[:8]
    in_path = OUTPUT_DIR / f"cc_in_{job_id}_{file.filename.replace(' ', '_')}"
    raw_bytes = await file.read()
    with open(in_path, "wb") as f:
        f.write(raw_bytes)

    orig_mb = round(len(raw_bytes) / (1024 * 1024), 2)
    crf = "30" if level == "web_light" else ("26" if level == "balanced" else "20")
    scale_f = "scale='min(720,iw)':-2" if level == "web_light" else "scale='min(1080,iw)':-2"

    out_fn = f"compressed_{job_id}.mp4"
    out_path = OUTPUT_DIR / out_fn
    cmd = [
        "ffmpeg", "-y", "-i", str(in_path),
        "-vf", scale_f,
        "-c:v", "libx264", "-preset", "fast", "-crf", crf, "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
        str(out_path)
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    new_mb = round(out_path.stat().st_size / (1024 * 1024), 2) if out_path.exists() else orig_mb
    saved_pct = round(max(0.0, (1 - new_mb / max(0.01, orig_mb)) * 100), 1)
    return {
        "id": job_id, "filename": out_fn, "url": f"/api/videos/stream/{out_fn}",
        "original_mb": orig_mb, "compressed_mb": new_mb, "saved_percent": saved_pct
    }
