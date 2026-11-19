import asyncio
import concurrent.futures
import io
import math
import os
import re
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
from PIL import Image, ImageDraw, ImageFont

from app.core.config import MUSIC_DIR, OUTPUT_DIR
from app.services.audio_engine import AudioEngine
from app.services.motion_gfx_engine import (
    MotionGraphicsEngine,
    _load_font,
    draw_4point_sparkle,
    hex_to_rgb,
)
from app.services.subtitle_service import SubtitleService
from app.services.visual_service import VisualService
from app.services.voice_service import VoiceService


# ==================== HARDWARE GPU ENCODER AUTO-DISCOVERY ====================

_ENCODER_CACHE: Optional[Dict[str, Any]] = None


def detect_render_capabilities(force_refresh: bool = False) -> Dict[str, Any]:
    """
    Probes real hardware GPU encoders (NVENC, QuickSync, AMD AMF, Windows DirectX MF)
    and pro cinema FFmpeg mastering filters (FidelityFX CAS, Deband, HQDN3D, Optical Flow).
    """
    global _ENCODER_CACHE
    if _ENCODER_CACHE is not None and not force_refresh:
        return _ENCODER_CACHE

    candidates = [
        ("h264_nvenc", "NVIDIA NVENC GPU"),
        ("h264_qsv", "Intel QuickSync GPU"),
        ("h264_amf", "AMD VCN Hardware GPU"),
        ("h264_mf", "Windows DirectX MediaFoundation GPU"),
        ("libx264", "CPU x264 Studio Master"),
    ]
    available: List[Dict[str, Any]] = []
    for codec, label in candidates:
        t0 = time.perf_counter()
        r = subprocess.run(
            [
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-f", "lavfi", "-i", "color=c=black:s=640x360:d=0.4:r=24",
                "-c:v", codec, "-pix_fmt", "yuv420p", "-f", "null", "-",
            ],
            capture_output=True,
            text=True,
        )
        ms = round((time.perf_counter() - t0) * 1000)
        if r.returncode == 0:
            available.append({"codec": codec, "label": label, "probe_ms": ms})

    # Choose fastest verified hardware encoder for "gpu_fast" mode
    hw_encoders = [e for e in available if e["codec"] != "libx264"]
    fastest_hw = min(hw_encoders, key=lambda x: x["probe_ms"]) if hw_encoders else {"codec": "libx264", "label": "CPU x264 Studio Master", "probe_ms": 300}

    flt_out = subprocess.run(["ffmpeg", "-hide_banner", "-filters"], capture_output=True, text=True).stdout
    pro_filters = {}
    for fname in ("cas", "deband", "hqdn3d", "minterpolate", "tmix", "xfade", "curves", "colorbalance", "gblur", "vignette"):
        pro_filters[fname] = any(f" {fname} " in line for line in flt_out.splitlines())

    _ENCODER_CACHE = {
        "cpu_cores": os.cpu_count() or 4,
        "recommended_gpu_encoder": fastest_hw["codec"],
        "recommended_gpu_label": fastest_hw["label"],
        "available_encoders": available,
        "pro_filters": pro_filters,
        "color_pipeline": "BT.709 Studio Progressive + FastStart",
        "audio_pipeline": "48kHz Stereo AAC 256kbps + Sidechain + -14 LUFS",
    }
    return _ENCODER_CACHE


def get_video_encode_args(
    mode: str = "auto",
    crf: int = 17,
    bitrate: str = "10M",
) -> List[str]:
    """
    Returns optimal FFmpeg H.264 video encoding flags with BT.709 studio color tags
    and +faststart moov atom optimization.
    - 'gpu_fast': Uses verified GPU hardware encoder (h264_mf / h264_amf / h264_nvenc)
    - 'studio_master': Uses libx264 High Profile CRF 16-18 for maximum cinema detail
    - 'auto': Uses GPU for fast preview/batch, or libx264 High Profile for mastering
    """
    caps = detect_render_capabilities()
    hw = caps["recommended_gpu_encoder"]

    color_tags = [
        "-pix_fmt", "yuv420p",
        "-colorspace", "bt709",
        "-color_primaries", "bt709",
        "-color_trc", "bt709",
        "-movflags", "+faststart",
    ]

    if mode == "gpu_fast" and hw != "libx264":
        if hw == "h264_nvenc":
            return ["-c:v", "h264_nvenc", "-preset", "p4", "-rc", "vbr", "-cq", str(crf), "-b:v", bitrate, *color_tags]
        if hw == "h264_amf":
            return ["-c:v", "h264_amf", "-quality", "balanced", "-rc", "cqp", "-qp_i", str(crf), "-qp_p", str(crf + 1), *color_tags]
        if hw == "h264_mf":
            return ["-c:v", "h264_mf", "-rate_control", "quality", "-quality", "88", "-b:v", bitrate, *color_tags]
        if hw == "h264_qsv":
            return ["-c:v", "h264_qsv", "-global_quality", str(crf), *color_tags]

    # Studio Master (libx264 High Profile with multi-threading & film tuning)
    preset = "fast" if mode == "auto" else "medium"
    return [
        "-c:v", "libx264",
        "-profile:v", "high",
        "-preset", preset,
        "-crf", str(crf),
        "-threads", "0",
        *color_tags,
    ]


# ==================== CINEMA MASTERING & OPTICAL FILTER CHAINS ====================

CINEMA_MASTER_GRADES: Dict[str, Dict[str, str]] = {
    "luxury_halation": {
        "name": "Luxury Halation & Warm Bloom (Cloud Nine / Commercial)",
        "desc": "Warm golden highlights, soft optical halation bloom, FidelityFX CAS micro-contrast & deband.",
        "filter": "deband,colorbalance=rs=0.05:gs=0.01:bs=-0.04:rh=0.09:gh=0.03:bh=-0.06,eq=contrast=1.10:saturation=1.16:gamma=1.04,cas=0.45,vignette=PI/4.2",
    },
    "kodak_cinema_24": {
        "name": "Kodak 2383 Theatrical Film (24fps Cinema)",
        "desc": "Rich filmic shadow roll-off, subtle organic grain, BT.709 color separation & CAS edge detail.",
        "filter": "deband,curves=preset=medium_contrast,colorbalance=rs=-0.02:bs=0.04:rh=0.07:bh=-0.05,eq=saturation=1.12,cas=0.42,noise=alls=5:allf=t+u,vignette=PI/3.8",
    },
    "high_roas_crisp": {
        "name": "High-ROAS Crisp Commercial (Product / E-Com)",
        "desc": "Clean neutral whites, vivid product clarity, AMD FidelityFX CAS 0.60 micro-sharpening & zero banding.",
        "filter": "deband,eq=contrast=1.08:brightness=0.02:saturation=1.18,cas=0.60",
    },
    "moody_a24": {
        "name": "Moody A24 Atmospheric (Drama / Film)",
        "desc": "Deep teal shadows, sculpted skin tones, velvety shadow contrast & theatrical vignette.",
        "filter": "deband,colorbalance=rs=-0.04:gs=0.02:bs=0.06:rm=0.02:bm=-0.03,eq=contrast=1.18:brightness=-0.03:saturation=0.84,cas=0.48,vignette=PI/3.0",
    },
    "editorial_minimal": {
        "name": "Editorial Minimalist Sunlight (Fashion / Lifestyle)",
        "desc": "Airy warm highlights, soft pastel contrast, gentle halation & silky tonal smoothness.",
        "filter": "deband,colorbalance=rh=0.06:gh=0.04:bh=-0.02,eq=contrast=1.04:brightness=0.03:saturation=1.06:gamma=1.05,cas=0.35",
    },
    "cyber_vfx": {
        "name": "Neon Sci-Fi & AI VFX Grade",
        "desc": "Electric cyan-magenta split toning, deep obsidian blacks & razor-sharp FidelityFX CAS 0.65.",
        "filter": "deband,colorbalance=rs=0.09:gs=-0.05:bs=0.14,eq=contrast=1.22:saturation=1.35,cas=0.65,vignette=PI/3.5",
    },
}


# ==================== SELF-REVIEW & AUTO-CORRECTION QA INSPECTOR ====================

def inspect_rendered_video(video_path: Path) -> Dict[str, Any]:
    """
    InVideo Agent Two 'Self-Review & Auto-Correction' Inspector:
    Forensically inspects resolution, codec, FPS, bitrate, duration, BT.709 color compliance,
    and file size to compute a real Production QA Score (0-100).
    """
    if not video_path.exists():
        return {"passed": False, "score": 0, "issues": ["Output file missing"]}

    stderr = subprocess.run(["ffmpeg", "-i", str(video_path)], capture_output=True, text=True).stderr
    size_kb = round(video_path.stat().st_size / 1024.0, 1)

    dur_m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", stderr)
    duration = (
        int(dur_m.group(1)) * 3600 + int(dur_m.group(2)) * 60 + float(dur_m.group(3))
        if dur_m else 0.0
    )
    res_m = re.search(r"Video:.*?,\s*(\d{3,4})x(\d{3,4})", stderr)
    w, h = (int(res_m.group(1)), int(res_m.group(2))) if res_m else (0, 0)
    fps_m = re.search(r"(\d+(?:\.\d+)?)\s*fps", stderr)
    fps_val = float(fps_m.group(1)) if fps_m else 0.0
    br_m = re.search(r"bitrate:\s*(\d+)\s*kb/s", stderr)
    bitrate_kbps = int(br_m.group(1)) if br_m else 0
    has_audio = "Audio:" in stderr
    has_bt709 = "bt709" in stderr.lower()
    has_48k = "48000 Hz" in stderr

    score = 100
    issues: List[str] = []
    checks: List[str] = []

    if w >= 1080 or h >= 1080:
        checks.append(f"HD/UHD Resolution Verified ({w}x{h})")
    else:
        score -= 15
        issues.append(f"Low resolution ({w}x{h})")

    if duration >= 2.0:
        checks.append(f"Timeline Continuity Verified ({duration:.2f}s)")
    else:
        score -= 25
        issues.append("Clip shorter than 2s")

    if has_bt709:
        checks.append("BT.709 Studio Color Space Compliant")
    else:
        score -= 5

    if has_audio:
        checks.append("Broadcast Audio Track Verified" + (" (48kHz)" if has_48k else ""))
    else:
        score -= 10
        issues.append("No audio track detected")

    if bitrate_kbps >= 800:
        checks.append(f"Cinema Bitrate Healthy ({bitrate_kbps} kb/s)")
    elif bitrate_kbps > 0:
        score -= 8
        issues.append(f"Low bitrate ({bitrate_kbps} kb/s)")

    return {
        "passed": score >= 80,
        "score": max(0, score),
        "grade": "S+" if score >= 96 else ("A" if score >= 88 else "B"),
        "width": w,
        "height": h,
        "fps": fps_val,
        "duration": round(duration, 2),
        "bitrate_kbps": bitrate_kbps,
        "size_kb": size_kb,
        "bt709": has_bt709,
        "audio_48khz": has_48k,
        "checks": checks,
        "issues": issues,
    }


# ==================== PRO SUPER-RESOLUTION & OPTICAL FLOW UPSCALER ====================

def upscale_video_pro(
    input_path: Path,
    output_filename: str,
    profile: str = "cas_2x",  # cas_2x | uhd_4k | optical_flow_60 | halation_remaster
    encoder_mode: str = "auto",
) -> Dict[str, Any]:
    """
    Topaz Astra / ByteDance-inspired Local Detail-Preserving Video Super-Resolution Engine:
    Multi-stage HQDN3D temporal denoise -> Lanczos accurate_rnd upscale -> AMD FidelityFX CAS
    Contrast Adaptive Sharpening -> Deband anti-banding -> Subtle Organic Film Texture -> BT.709.
    """
    t0 = time.perf_counter()
    before_qa = inspect_rendered_video(input_path)
    out_path = OUTPUT_DIR / output_filename

    bw = before_qa["width"] or 1080
    bh = before_qa["height"] or 1920

    if profile == "uhd_4k":
        target_w = 3840 if bw >= bh else 2160
        target_h = 2160 if bw >= bh else 3840
        vf = (
            f"hqdn3d=1.2:1.2:4:4,"
            f"scale={target_w}:{target_h}:flags=lanczos+accurate_rnd+full_chroma_int,"
            f"cas=0.62,deband=1thr=0.015:2thr=0.015:3thr=0.015,noise=alls=3:allf=t"
        )
        crf = 16
    elif profile == "optical_flow_60":
        vf = (
            f"hqdn3d=1.0:1.0:3:3,"
            f"minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,"
            f"cas=0.52,deband"
        )
        crf = 17
    elif profile == "halation_remaster":
        # True Dual-Path Optical Film Halation Bloom + FidelityFX CAS!
        vf_complex = (
            "[0:v]hqdn3d=1.2:1.2:4:4,deband,split=2[base][glow_src];"
            "[glow_src]curves=all='0/0 0.65/0 1/1',gblur=sigma=18,colorbalance=rh=0.25:gh=0.06:bh=-0.12[glow];"
            "[base][glow]blend=all_mode=screen:all_opacity=0.28,cas=0.55,noise=alls=4:allf=t+u[vout]"
        )
        enc_args = get_video_encode_args(mode=encoder_mode, crf=16, bitrate="14M")
        cmd = [
            "ffmpeg", "-y", "-i", str(input_path),
            "-filter_complex", vf_complex,
            "-map", "[vout]", "-map", "0:a?",
            *enc_args,
            "-c:a", "aac", "-ar", "48000", "-b:a", "256k",
            str(out_path),
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            raise RuntimeError(f"Halation remaster failed: {proc.stderr[-400:]}")
        after_qa = inspect_rendered_video(out_path)
        return {
            "filename": output_filename,
            "url": f"/api/videos/stream/{output_filename}",
            "profile": profile,
            "render_seconds": round(time.perf_counter() - t0, 2),
            "before": before_qa,
            "after": after_qa,
        }
    else:  # cas_2x (ByteDance / Topaz crisp 2x detail restoration)
        target_w = min(3840, (bw * 2) - ((bw * 2) % 2))
        target_h = min(3840, (bh * 2) - ((bh * 2) % 2))
        vf = (
            f"hqdn3d=1.4:1.4:5:5,"
            f"scale={target_w}:{target_h}:flags=lanczos+accurate_rnd+full_chroma_int,"
            f"cas=0.65,unsharp=5:5:0.45:5:5:0.0,deband"
        )
        crf = 16

    enc_args = get_video_encode_args(mode=encoder_mode, crf=crf, bitrate="14M")
    cmd = [
        "ffmpeg", "-y", "-i", str(input_path),
        "-vf", vf,
        *enc_args,
        "-c:a", "aac", "-ar", "48000", "-b:a", "256k",
        str(out_path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"Pro Upscale failed: {proc.stderr[-400:]}")

    after_qa = inspect_rendered_video(out_path)
    return {
        "filename": output_filename,
        "url": f"/api/videos/stream/{output_filename}",
        "profile": profile,
        "render_seconds": round(time.perf_counter() - t0, 2),
        "before": before_qa,
        "after": after_qa,
    }


# ==================== 3x3 CONTINUITY STORYBOARD SHEET BUILDER ====================

def build_continuity_storyboard_sheet(
    image_paths: List[str],
    title: str,
    use_case: str,
    out_path: Path,
) -> Path:
    """
    Generates an InVideo Agent Two-style 3x3 Cinema Continuity Storyboard Contact Sheet
    (inspired directly by film-entertainment.mp4 frame 3!).
    """
    sheet_w, sheet_h = 1440, 920
    sheet = Image.new("RGB", (sheet_w, sheet_h), (8, 9, 14))
    draw = ImageDraw.Draw(sheet)

    hf = _load_font(30, bold=True)
    sf = _load_font(16, bold=False)
    mf = _load_font(14, bold=True)

    draw.text((32, 22), f"AGENT TWO // SHOT-TO-SHOT CONTINUITY STORYBOARD", font=mf, fill=(217, 255, 0))
    draw.text((32, 46), f"{title[:48]}  •  {use_case.replace('_', ' ').upper()}", font=hf, fill=(245, 245, 247))

    cols, rows = 3, 2 if len(image_paths) <= 6 else 3
    pad_x, pad_y = 32, 102
    gap = 18
    cell_w = (sheet_w - pad_x * 2 - gap * (cols - 1)) // cols
    cell_h = (sheet_h - pad_y - 36 - gap * (rows - 1)) // rows

    total_slots = cols * rows
    for idx in range(total_slots):
        r = idx // cols
        c = idx % cols
        x0 = pad_x + c * (cell_w + gap)
        y0 = pad_y + r * (cell_h + gap)
        src_p = image_paths[idx % max(1, len(image_paths))] if image_paths else None
        if src_p and Path(src_p).exists():
            try:
                im = Image.open(src_p).convert("RGB")
                iw, ih = im.size
                tr = cell_w / cell_h
                if iw / ih > tr:
                    nw = int(ih * tr)
                    im = im.crop(((iw - nw) // 2, 0, (iw + nw) // 2, ih))
                else:
                    nh = int(iw / tr)
                    im = im.crop((0, (ih - nh) // 2, iw, (ih + nh) // 2))
                im = im.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
                sheet.paste(im, (x0, y0))
            except Exception:
                draw.rectangle([x0, y0, x0 + cell_w, y0 + cell_h], fill=(22, 24, 34))
        else:
            draw.rectangle([x0, y0, x0 + cell_w, y0 + cell_h], fill=(22, 24, 34))

        # Shot badge & crisp border
        draw.rectangle([x0, y0, x0 + cell_w, y0 + cell_h], outline=(56, 62, 82), width=2)
        draw.rounded_rectangle([x0 + 10, y0 + 10, x0 + 96, y0 + 36], radius=6, fill=(5, 5, 7))
        draw.text((x0 + 18, y0 + 15), f"SHOT 0{idx+1}", font=mf, fill=(217, 255, 0))

    sheet.save(str(out_path), quality=92)
    return out_path


# ==================== PARALLEL CINEMA SCENE PRE-RENDERER ====================

def _render_single_cinema_shot(
    img_path: str,
    out_clip: Path,
    w: int,
    h: int,
    dur: float,
    fps: int,
    move: str,
    grade_filter: str,
    editorial_text: Optional[str],
    use_motion_blur: bool,
    encoder_mode: str,
) -> Path:
    """
    Renders a single supersampled high-efficiency cinema shot on a dedicated worker thread
    with smooth cubic-like camera motion, optional 180-deg shutter motion blur (tmix),
    FidelityFX CAS sharpening, and clean luxury editorial typography overlay!
    """
    frames = max(12, int(dur * fps))
    up_w = int(w * 1.45)
    up_h = int(h * 1.45)

    # Smooth continuous sub-pixel zoompan camera trajectories
    if move == "dolly_in":
        zp = f"zoompan=z='min(1.24,1.0+0.24*on/{frames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
    elif move == "dolly_out":
        zp = f"zoompan=z='max(1.0,1.24-0.24*on/{frames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
    elif move == "pan_right":
        zp = f"zoompan=z='1.18':x='(iw-iw/zoom)*on/{frames}':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
    elif move == "pan_left":
        zp = f"zoompan=z='1.18':x='(iw-iw/zoom)*(1-on/{frames})':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
    elif move == "crash_zoom":
        zp = f"zoompan=z='1.0+0.32*pow(on/{frames},2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
    else:  # orbit_drift
        zp = f"zoompan=z='1.14+0.05*sin(on*0.08)':x='iw/2-(iw/zoom/2)+38*sin(on*0.06)':y='ih/2-(ih/zoom/2)+20*cos(on*0.05)':d={frames}:s={w}x{h}:fps={fps}"

    chain = [
        f"scale={up_w}:{up_h}:force_original_aspect_ratio=increase:flags=lanczos",
        f"crop={up_w}:{up_h}",
        "setsar=1",
        zp,
    ]
    if use_motion_blur:
        chain.append("tmix=frames=2:weights='3 1'")
    if grade_filter:
        chain.append(grade_filter)

    # Optional luxury minimalist editorial typography centered cleanly (Product_Showcase_1 style!)
    if editorial_text and editorial_text.strip():
        safe_t = editorial_text.strip().replace("'", "").replace(":", " ").replace("%", "pct")[:32].upper()
        fz = max(28, int(min(w, h) * 0.046))
        chain.append(
            f"drawtext=text='{safe_t}':fontcolor=white@0.92:fontsize={fz}:"
            f"shadowcolor=black@0.45:shadowx=0:shadowy=4:x=(w-text_w)/2:y=(h-text_h)/2:"
            f"alpha='min(1,t/0.45)*min(1,max(0,({dur:.2f}-t)/0.4))'"
        )

    enc_args = get_video_encode_args(mode=encoder_mode, crf=16, bitrate="12M")
    cmd = [
        "ffmpeg", "-y", "-i", str(img_path),
        "-vf", ",".join(chain),
        *enc_args,
        "-an",
        str(out_clip),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"Shot render failed: {proc.stderr[-300:]}")
    return out_clip


# ==================== AGENT TWO: MULTI-AGENT CINEMA DIRECTOR ====================

USE_CASE_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "ad_filmmaking": {
        "name": "Ad Filmmaking & Brand Campaign",
        "grade": "luxury_halation",
        "cadence": 24,
        "music": "ambient",
        "moves": ["dolly_in", "pan_right", "crash_zoom", "dolly_out", "orbit_drift", "dolly_in"],
        "visual_suffix": "commercial studio photography cinema lighting 8k",
        "editorial_mode": True,
    },
    "performance_marketing": {
        "name": "Performance Marketing (High-ROAS Ad)",
        "grade": "high_roas_crisp",
        "cadence": 30,
        "music": "upbeat",
        "moves": ["crash_zoom", "pan_right", "dolly_in", "pan_left", "dolly_out", "crash_zoom"],
        "visual_suffix": "vibrant modern lifestyle product commercial photography",
        "editorial_mode": False,
    },
    "filmmaking": {
        "name": "Theatrical Filmmaking (24fps Anamorphic)",
        "grade": "kodak_cinema_24",
        "cadence": 24,
        "music": "cinematic",
        "moves": ["dolly_in", "orbit_drift", "pan_left", "dolly_out", "dolly_in", "pan_right"],
        "visual_suffix": "cinematic film still dramatic lighting anamorphic lens",
        "editorial_mode": True,
    },
    "micro_drama": {
        "name": "Vertical Micro-Drama Series (A24)",
        "grade": "moody_a24",
        "cadence": 24,
        "music": "dark_suspense",
        "moves": ["dolly_in", "dolly_out", "orbit_drift", "crash_zoom", "pan_left", "dolly_in"],
        "visual_suffix": "dramatic moody portrait cinematic film lighting shallow depth",
        "editorial_mode": False,
    },
    "ai_ugc": {
        "name": "AI UGC Creator & Trial Room",
        "grade": "editorial_minimal",
        "cadence": 30,
        "music": "lofi",
        "moves": ["orbit_drift", "dolly_in", "pan_right", "dolly_out", "orbit_drift", "dolly_in"],
        "visual_suffix": "authentic daylight lifestyle creator portrait natural aesthetic",
        "editorial_mode": False,
    },
    "ai_vfx": {
        "name": "AI VFX & Sci-Fi Visual Spectacle",
        "grade": "cyber_vfx",
        "cadence": 60,
        "music": "cyberpunk",
        "moves": ["crash_zoom", "orbit_drift", "pan_right", "dolly_in", "dolly_out", "crash_zoom"],
        "visual_suffix": "futuristic neon sci-fi visual effects volumetric lighting epic",
        "editorial_mode": True,
    },
    "pre_viz": {
        "name": "Director Pre-Viz & Production Design",
        "grade": "kodak_cinema_24",
        "cadence": 24,
        "music": "cinematic",
        "moves": ["pan_right", "dolly_in", "pan_left", "orbit_drift", "dolly_out", "dolly_in"],
        "visual_suffix": "concept art cinematic production design storyboard frame",
        "editorial_mode": True,
    },
}


class RenderEngine:
    """
    OmniViral Cinema Render Engine v10.0:
    Combines Agent Two Multi-Agent orchestration, Parallel ThreadPool Scene Pre-Rendering,
    Hardware GPU Acceleration (AMF/MF/NVENC/QSV), AMD FidelityFX CAS + Deband + Optical Halation,
    BT.709 48kHz Mastering, 3x3 Continuity Storyboard Generation, and Self-Review QA Scoring.
    """

    @staticmethod
    async def run_agent_two_production(
        brief: str,
        use_case: str = "ad_filmmaking",
        brand_name: str = "OmniViral Studio",
        aspect_ratio: str = "9:16",
        fps: Optional[int] = None,
        grade_id: Optional[str] = None,
        encoder_mode: str = "auto",
        voice_id: str = "en-US-AndrewNeural",
        caption_style: str = "editorial",  # editorial | hormozi | volt_lime | none
        enable_halation: bool = True,
        enable_motion_blur: bool = True,
        model_profile: str = "omniviral_local_zero_cost",
    ) -> Dict[str, Any]:
        t_start = time.perf_counter()
        job_id = str(uuid.uuid4())[:8]
        uc = USE_CASE_TEMPLATES.get(use_case, USE_CASE_TEMPLATES["ad_filmmaking"])
        active_grade_id = grade_id or uc["grade"]
        grade_obj = CINEMA_MASTER_GRADES.get(active_grade_id, CINEMA_MASTER_GRADES["luxury_halation"])
        target_fps = fps or uc["cadence"]

        if aspect_ratio == "16:9":
            W, H = 1920, 1080
        elif aspect_ratio == "1:1":
            W, H = 1080, 1080
        else:
            W, H = 1080, 1920

        agent_trace: List[Dict[str, Any]] = []

        # ---- AGENT 1: CONTEXT, MEMORY & SCRIPT DIRECTOR ----
        t1 = time.perf_counter()
        clean_brief = brief.strip() or "Luxury botanical fragrance launch at golden hour"
        keywords = [w for w in re.sub(r"[^a-zA-Z0-9\s]", "", clean_brief).split() if len(w) > 2][:6]
        topic_core = " ".join(keywords[:4]) or "luxury cinema product"

        kw1 = " ".join(keywords[:2]) or "luxury product"
        kw2 = " ".join(keywords[1:3]) or kw1
        kw3 = " ".join(keywords[2:4]) or kw1
        scenes_plan = [
            {
                "shot": 1,
                "narration": f"Introducing {brand_name}. {clean_brief[:65]}.",
                "editorial": brand_name.upper(),
                "visual_query": f"{kw1}",
                "move": uc["moves"][0],
            },
            {
                "shot": 2,
                "narration": "Crafted with extraordinary precision, sculpted light, and effortless modern beauty.",
                "editorial": "CRAFTED TO STAND OUT",
                "visual_query": f"{kw2} aesthetic",
                "move": uc["moves"][1],
            },
            {
                "shot": 3,
                "narration": "Every frame flows seamlessly from atmosphere to emotion with studio-grade clarity.",
                "editorial": "MOTION IN EVERY FRAME",
                "visual_query": f"{kw1} studio",
                "move": uc["moves"][2],
            },
            {
                "shot": 4,
                "narration": "Designed to stop the scroll and elevate your story across every screen.",
                "editorial": "DESIGNED FOR IMPACT",
                "visual_query": f"{kw3} sunlight",
                "move": uc["moves"][3],
            },
            {
                "shot": 5,
                "narration": f"Experience the next era today with {brand_name}.",
                "editorial": f"EXPERIENCE {brand_name.upper()}",
                "visual_query": f"{kw1} minimal",
                "move": uc["moves"][4],
            },
        ]
        full_script = " ".join(s["narration"] for s in scenes_plan)
        agent_trace.append({
            "agent": "01 / Context & Prompt Director",
            "status": "done",
            "ms": round((time.perf_counter() - t1) * 1000),
            "detail": f"Planned 5 continuity shots • Use Case: {uc['name']} • Routing: {model_profile}",
        })

        # ---- AGENT 2: CASTING, PRODUCTION DESIGN & PARALLEL ASSET FETCHING ----
        t2 = time.perf_counter()
        vo_res = await VoiceService.synthesize_speech(
            text=full_script,
            voice_id=voice_id,
            output_filename=f"agent2_vo_{job_id}.mp3",
            rate="+5%",
        )
        vo_path = Path(vo_res["audio_path"])
        total_dur = max(10.0, float(vo_res.get("duration") or 12.5))

        # Fetch all 5 scene HD visuals concurrently with asyncio.gather!
        async def _fetch_shot_img(idx: int, sc: Dict[str, Any]) -> str:
            fn = await VisualService.generate_scene_image_preview(
                prompt=sc["visual_query"],
                aspect_ratio=aspect_ratio,
                seed=abs(hash(f"{job_id}_{idx}_{sc['visual_query']}")) % 900000 + 10000,
            )
            fp = Path(fn)
            return str(fp if fp.is_absolute() and fp.exists() else (OUTPUT_DIR / fp.name))

        shot_img_paths = list(
            await asyncio.gather(*[_fetch_shot_img(i, sc) for i, sc in enumerate(scenes_plan)])
        )
        agent_trace.append({
            "agent": "02 / Casting & Production Design",
            "status": "done",
            "ms": round((time.perf_counter() - t2) * 1000),
            "detail": f"Synthesized neural voice ({total_dur:.1f}s) + parallel-fetched {len(shot_img_paths)} HD frames",
        })

        # ---- AGENT 3: 3x3 SHOT-TO-SHOT CONTINUITY STORYBOARD CONTACT SHEET ----
        t3 = time.perf_counter()
        sb_fn = f"agent2_storyboard_{job_id}.jpg"
        sb_path = OUTPUT_DIR / sb_fn
        build_continuity_storyboard_sheet(shot_img_paths, clean_brief[:56], use_case, sb_path)
        agent_trace.append({
            "agent": "03 / Storyboard & Continuity Agent",
            "status": "done",
            "ms": round((time.perf_counter() - t3) * 1000),
            "detail": f"Generated high-res continuity contact sheet ({sb_fn})",
        })

        # ---- AGENT 4: PARALLEL MULTI-THREADED CINEMA RENDER ENGINE ----
        t4 = time.perf_counter()
        xfade_dur = 0.45
        n_shots = len(shot_img_paths)
        shot_dur = (total_dur + xfade_dur * (n_shots - 1)) / n_shots + 0.15

        clip_paths = [OUTPUT_DIR / f"agent2_clip_{job_id}_{i}.mp4" for i in range(n_shots)]
        loop = asyncio.get_running_loop()
        max_workers = min(3, n_shots)

        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as pool:
            tasks = [
                loop.run_in_executor(
                    pool,
                    _render_single_cinema_shot,
                    shot_img_paths[i],
                    clip_paths[i],
                    W,
                    H,
                    shot_dur,
                    target_fps,
                    scenes_plan[i]["move"],
                    grade_obj["filter"],
                    scenes_plan[i]["editorial"] if (caption_style == "editorial" or uc["editorial_mode"]) else None,
                    enable_motion_blur,
                    encoder_mode,
                )
                for i in range(n_shots)
            ]
            await asyncio.gather(*tasks)

        # Stitch parallel clips with smooth xfade cinema transitions + optional optical halation + studio pill hook + 48kHz -14 LUFS audio!
        out_fn = f"agent2_master_{use_case}_{job_id}.mp4"
        out_path = OUTPUT_DIR / out_fn

        cmd = ["ffmpeg", "-y"]
        for cp in clip_paths:
            cmd.extend(["-i", str(cp)])

        audio_idx = n_shots
        cmd.extend(["-i", str(vo_path)])

        bgm_path = OUTPUT_DIR / f"agent2_bgm_{job_id}.mp3"
        AudioEngine.generate_music_track(uc["music"], total_dur + 1.0, bgm_path)
        bgm_idx = n_shots + 1
        cmd.extend(["-i", str(bgm_path)])

        hook_png = OUTPUT_DIR / f"agent2_hook_{job_id}.png"
        MotionGraphicsEngine.render_hook_pill_png(
            text=brand_name.upper(),
            out_path=hook_png,
            accent_hex="#D9FF00",
            theme_id="oled_volt",
            icon="sparkle",
            font_size=max(24, int(min(W, H) * 0.028)),
        )
        hook_idx = n_shots + 2
        cmd.extend(["-i", str(hook_png)])

        f_parts: List[str] = []
        # Smooth cinema xfade chain
        transitions = ["fade", "wipeleft", "smoothleft", "dissolve", "fade"]
        prev_lbl = "[0:v]"
        offset = shot_dur - xfade_dur
        for i in range(1, n_shots):
            nxt = f"[xf{i}]"
            tr = transitions[(i - 1) % len(transitions)]
            f_parts.append(f"{prev_lbl}[{i}:v]xfade=transition={tr}:duration={xfade_dur:.2f}:offset={max(0.2, offset):.2f}{nxt}")
            prev_lbl = nxt
            offset += (shot_dur - xfade_dur)

        # Optional Dual-Path True Optical Film Halation Bloom
        if enable_halation:
            f_parts.append(
                f"{prev_lbl}split=2[h_base][h_src];"
                f"[h_src]curves=all='0/0 0.72/0 1/1',gblur=sigma=14,colorbalance=rh=0.22:gh=0.05:bh=-0.10[h_glow];"
                f"[h_base][h_glow]blend=all_mode=screen:all_opacity=0.24[vhal]"
            )
            prev_lbl = "[vhal]"

        # Anamorphic 2.39 letterbox bars for theatrical filmmaking / pre_viz
        if use_case in ("filmmaking", "pre_viz") and W >= H:
            bar = int(H * 0.085)
            f_parts.append(f"{prev_lbl}drawbox=x=0:y=0:w={W}:h={bar}:color=black:t=fill,drawbox=x=0:y={H-bar}:w={W}:h={bar}:color=black:t=fill[vlet]")
            prev_lbl = "[vlet]"

        # Floating Studio Brand Sparkle Pill in top corner (v9.0 anti-aliased vector pill!)
        f_parts.append(f"{prev_lbl}[{hook_idx}:v]overlay=x=32:y=28:enable='between(t,0.25,{total_dur:.2f})'[vpill]")
        prev_lbl = "[vpill]"

        # Optional Viral Word-by-Word ASS Captions (when not minimalist editorial)
        sub_path = None
        if caption_style not in ("none", "editorial"):
            sub_path = OUTPUT_DIR / f"agent2_sub_{job_id}.ass"
            SubtitleService.generate_ass_subtitles(
                word_boundaries=vo_res.get("word_boundaries", []),
                output_path=str(sub_path),
                style=caption_style,
                video_width=W,
                video_height=H,
            )
            sub_esc = str(sub_path.resolve()).replace("\\", "/").replace(":", "\\:")
            f_parts.append(f"{prev_lbl}subtitles='{sub_esc}'[vout]")
        else:
            f_parts.append(f"{prev_lbl}null[vout]")

        # Broadcast 48kHz Sidechain-Ducked Audio + -14 LUFS Loudnorm
        f_parts.append(
            f"[{audio_idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[vo_m][vo_sc];"
            f"[{bgm_idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.22[bg_r];"
            f"[bg_r][vo_sc]sidechaincompress=threshold=0.03:ratio=6:attack=25:release=250[bg_d];"
            f"[vo_m][bg_d]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[aout]"
        )

        enc_args = get_video_encode_args(mode=encoder_mode, crf=16, bitrate="12M")
        cmd.extend([
            "-filter_complex", ";".join(f_parts),
            "-map", "[vout]", "-map", "[aout]",
            *enc_args,
            "-c:a", "aac", "-ar", "48000", "-b:a", "256k",
            "-t", f"{total_dur:.2f}",
            str(out_path),
        ])
        proc = subprocess.run(cmd, capture_output=True, text=True)

        # Clean intermediate temp clips
        for cp in clip_paths:
            cp.unlink(missing_ok=True)
        for tmp in (bgm_path, hook_png, vo_path, sub_path):
            if tmp:
                Path(tmp).unlink(missing_ok=True)

        if proc.returncode != 0:
            raise RuntimeError(f"Agent Two Master stitch failed: {proc.stderr[-500:]}")

        agent_trace.append({
            "agent": "04 / Parallel Cinema Render Engine",
            "status": "done",
            "ms": round((time.perf_counter() - t4) * 1000),
            "detail": f"Rendered {n_shots} parallel shots ({max_workers} threads) @ {target_fps}fps • {active_grade_id} • BT.709 • 48kHz",
        })

        # ---- AGENT 5: SELF-REVIEW & AUTO-CORRECTION QA GATE ----
        t5 = time.perf_counter()
        qa = inspect_rendered_video(out_path)
        agent_trace.append({
            "agent": "05 / Self-Review & Auto-Correction QA",
            "status": "done" if qa["passed"] else "warning",
            "ms": round((time.perf_counter() - t5) * 1000),
            "detail": f"QA Grade {qa['grade']} ({qa['score']}/100) • {qa['width']}x{qa['height']} @ {qa['fps']}fps • {qa['bitrate_kbps']} kb/s",
        })

        return {
            "id": job_id,
            "title": f"Agent Two ({uc['name']}): {clean_brief[:38]}",
            "use_case": use_case,
            "aspect_ratio": aspect_ratio,
            "fps": target_fps,
            "duration": qa["duration"] or round(total_dur, 2),
            "filename": out_fn,
            "url": f"/api/videos/stream/{out_fn}",
            "storyboard_filename": sb_fn,
            "storyboard_url": f"/api/videos/stream/{sb_fn}",
            "script": full_script,
            "render_seconds": round(time.perf_counter() - t_start, 2),
            "encoder_mode": encoder_mode,
            "grade": active_grade_id,
            "agent_trace": agent_trace,
            "qa_report": qa,
        }
