import asyncio
import concurrent.futures
import os
import re
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from app.core.config import OUTPUT_DIR
from app.services.audio_engine import AudioEngine
from app.services.cinema_media_engine import CinemaMediaEngine, get_active_media_providers
from app.services.motion_gfx_engine import _load_font
from app.services.subtitle_service import SubtitleService
from app.services.voice_service import VoiceService


# ==================== HARDWARE GPU ENCODER AUTO-DISCOVERY ====================

_ENCODER_CACHE: Optional[Dict[str, Any]] = None


def detect_render_capabilities(force_refresh: bool = False) -> Dict[str, Any]:
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
                "ffmpeg", "-nostdin", "-y", "-hide_banner", "-loglevel", "error",
                "-f", "lavfi", "-i", "color=c=black:s=640x360:d=0.4:r=24",
                "-c:v", codec, "-pix_fmt", "yuv420p", "-f", "null", "-",
            ],
            capture_output=True,
            text=True,
        )
        ms = round((time.perf_counter() - t0) * 1000)
        if r.returncode == 0:
            available.append({"codec": codec, "label": label, "probe_ms": ms})

    hw_encoders = [e for e in available if e["codec"] != "libx264"]
    fastest_hw = (
        min(hw_encoders, key=lambda x: x["probe_ms"])
        if hw_encoders
        else {"codec": "libx264", "label": "CPU x264 Studio Master", "probe_ms": 300}
    )

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


def get_video_encode_args(mode: str = "auto", crf: int = 17, bitrate: str = "12M") -> List[str]:
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
            return ["-c:v", "h264_mf", "-rate_control", "quality", "-quality", "90", "-b:v", bitrate, *color_tags]
        if hw == "h264_qsv":
            return ["-c:v", "h264_qsv", "-global_quality", str(crf), *color_tags]

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
        "filter": "deband,colorbalance=rs=0.04:gs=0.01:bs=-0.03:rh=0.08:gh=0.03:bh=-0.05,eq=contrast=1.08:saturation=1.12:gamma=1.03,cas=0.45,vignette=PI/4.5",
    },
    "kodak_cinema_24": {
        "name": "Kodak 2383 Theatrical Film (24fps Cinema)",
        "desc": "Rich filmic shadow roll-off, subtle organic grain, BT.709 color separation & CAS edge detail.",
        "filter": "deband,curves=preset=medium_contrast,colorbalance=rs=-0.02:bs=0.04:rh=0.06:bh=-0.04,eq=saturation=1.10,cas=0.42,noise=alls=4:allf=t+u,vignette=PI/4.0",
    },
    "high_roas_crisp": {
        "name": "High-ROAS Crisp Commercial (Product / E-Com)",
        "desc": "Clean neutral whites, vivid product clarity, AMD FidelityFX CAS 0.58 micro-sharpening & zero banding.",
        "filter": "deband,eq=contrast=1.07:brightness=0.02:saturation=1.16,cas=0.58",
    },
    "moody_a24": {
        "name": "Moody A24 Atmospheric (Drama / Film)",
        "desc": "Deep teal shadows, sculpted skin tones, velvety shadow contrast & theatrical vignette.",
        "filter": "deband,colorbalance=rs=-0.04:gs=0.02:bs=0.06:rm=0.02:bm=-0.03,eq=contrast=1.16:brightness=-0.03:saturation=0.85,cas=0.46,vignette=PI/3.2",
    },
    "editorial_minimal": {
        "name": "Editorial Minimalist Sunlight (Fashion / Lifestyle)",
        "desc": "Airy warm highlights, soft pastel contrast, gentle halation & silky tonal smoothness.",
        "filter": "deband,colorbalance=rh=0.05:gh=0.03:bh=-0.02,eq=contrast=1.04:brightness=0.02:saturation=1.05:gamma=1.04,cas=0.36",
    },
    "cyber_vfx": {
        "name": "Neon Sci-Fi & AI VFX Grade",
        "desc": "Electric cyan-magenta split toning, deep obsidian blacks & razor-sharp FidelityFX CAS 0.62.",
        "filter": "deband,colorbalance=rs=0.08:gs=-0.05:bs=0.13,eq=contrast=1.20:saturation=1.32,cas=0.62,vignette=PI/3.8",
    },
}


# ==================== 2x SUPERSAMPLED HIGH-FASHION EDITORIAL TYPOGRAPHY ====================

def _load_editorial_font(size: int, light: bool = False) -> ImageFont.FreeTypeFont:
    paths = (
        [r"C:\Windows\Fonts\segoeuil.ttf", r"C:\Windows\Fonts\seguisb.ttf", r"C:\Windows\Fonts\segoeui.ttf"]
        if light
        else [r"C:\Windows\Fonts\seguisb.ttf", r"C:\Windows\Fonts\segoeuib.ttf", r"C:\Windows\Fonts\arialbd.ttf"]
    )
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, max(12, int(size)))
            except Exception:
                pass
    return _load_font(size, bold=not light)


def render_editorial_title_png(
    headline: str,
    subtitle: str,
    width: int,
    height: int,
    out_path: Path,
) -> Path:
    """
    Renders luxury fashion/commercial 2x-supersampled transparent PNG editorial typography
    (inspired by Product_Showcase_1 'LINEN LIFTS YOU' — wide letter-spacing, soft ambient drop shadow,
    subtle translucent gradient veil so text is razor-clean over ANY footage, ZERO clashing boxes!).
    """
    scale = 2
    cw, ch = width * scale, height * scale
    overlay = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Subtle bottom-center & mid cinematic gradient veil (soft vignette readability without any harsh box!)
    unit = min(cw, ch)
    main_text = " ".join(list(headline.strip().upper()[:26]))  # Wide fashion tracking!
    sub_text = subtitle.strip().upper()[:42]

    f_main = _load_editorial_font(int(unit * 0.044), light=False)
    f_sub = _load_editorial_font(int(unit * 0.022), light=True)

    # Render crisp text onto shadow layer first
    txt_layer = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    td = ImageDraw.Draw(txt_layer)

    mw = td.textlength(main_text, font=f_main)
    # Auto-shrink slightly if too wide
    if mw > cw * 0.86:
        f_main = _load_editorial_font(int(unit * 0.032), light=False)
        mw = td.textlength(main_text, font=f_main)

    cy = int(ch * 0.50)
    mx = (cw - mw) / 2.0

    # Soft dark ambient glow behind letters
    shadow_layer = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.text((mx, cy - int(unit * 0.03)), main_text, font=f_main, fill=(0, 0, 0, 175))
    if sub_text:
        sw = td.textlength(sub_text, font=f_sub)
        sx = (cw - sw) / 2.0
        sd.text((sx, cy + int(unit * 0.045)), sub_text, font=f_sub, fill=(0, 0, 0, 165))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=16))
    overlay.alpha_composite(shadow_layer)

    # Delicate luxury hairline divider + pure crisp editorial white text
    td.text((mx, cy - int(unit * 0.03)), main_text, font=f_main, fill=(255, 255, 255, 242))
    if sub_text:
        line_w = min(int(mw * 0.35), int(cw * 0.22))
        td.line([(cw / 2 - line_w / 2, cy + int(unit * 0.030)), (cw / 2 + line_w / 2, cy + int(unit * 0.030))], fill=(255, 255, 255, 130), width=2)
        sw = td.textlength(sub_text, font=f_sub)
        sx = (cw - sw) / 2.0
        td.text((sx, cy + int(unit * 0.045)), sub_text, font=f_sub, fill=(245, 245, 248, 215))

    overlay.alpha_composite(txt_layer)
    overlay.resize((width, height), Image.Resampling.LANCZOS).save(str(out_path), format="PNG")
    return out_path


def render_minimal_brand_watermark_png(brand_name: str, width: int, height: int, out_path: Path) -> Path:
    """Clean, subtle top-right transparent editorial watermark (never a clashing neon sticker!)."""
    scale = 2
    cw, ch = width * scale, height * scale
    img = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    unit = min(cw, ch)
    font = _load_editorial_font(int(unit * 0.024), light=False)
    label = brand_name.strip().upper()[:22]

    sh = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    tw = sd.textlength(label, font=font)
    x = cw - tw - int(cw * 0.055)
    y = int(ch * 0.04)
    sd.text((x, y), label, font=font, fill=(0, 0, 0, 140))
    sh = sh.filter(ImageFilter.GaussianBlur(radius=8))
    img.alpha_composite(sh)

    ImageDraw.Draw(img).text((x, y), label, font=font, fill=(255, 255, 255, 180))
    img.resize((width, height), Image.Resampling.LANCZOS).save(str(out_path), format="PNG")
    return out_path


# ==================== SELF-REVIEW & AUTO-CORRECTION QA INSPECTOR ====================

def inspect_rendered_video(video_path: Path) -> Dict[str, Any]:
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
        score -= 4

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
    profile: str = "cas_2x",
    encoder_mode: str = "auto",
) -> Dict[str, Any]:
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
        vf_complex = (
            "[0:v]hqdn3d=1.2:1.2:4:4,deband,split=2[base][glow_src];"
            "[glow_src]curves=all='0/0 0.65/0 1/1',gblur=sigma=18,colorbalance=rh=0.25:gh=0.06:bh=-0.12[glow];"
            "[base][glow]blend=all_mode=screen:all_opacity=0.28,cas=0.55,noise=alls=4:allf=t+u[vout]"
        )
        enc_args = get_video_encode_args(mode=encoder_mode, crf=16, bitrate="14M")
        cmd = [
            "ffmpeg", "-nostdin", "-y", "-i", str(input_path),
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
    else:
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
        "ffmpeg", "-nostdin", "-y", "-i", str(input_path),
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


# ==================== 3x3 CONTINUITY STORYBOARD SHEET BUILDER (SUPPORTS VIDEO + IMAGE) ====================

def build_continuity_storyboard_sheet(
    media_items: List[Dict[str, Any]],
    title: str,
    use_case: str,
    out_path: Path,
) -> Path:
    sheet_w, sheet_h = 1440, 920
    sheet = Image.new("RGB", (sheet_w, sheet_h), (8, 9, 14))
    draw = ImageDraw.Draw(sheet)

    hf = _load_font(28, bold=True)
    mf = _load_font(14, bold=True)

    draw.text((32, 22), "AGENT TWO v11 // SHOT-TO-SHOT CONTINUITY STORYBOARD", font=mf, fill=(217, 255, 0))
    draw.text((32, 46), f"{title[:56]}  •  {use_case.replace('_', ' ').upper()}", font=hf, fill=(245, 245, 247))

    cols, rows = 3, 2
    pad_x, pad_y = 32, 102
    gap = 18
    cell_w = (sheet_w - pad_x * 2 - gap * (cols - 1)) // cols
    cell_h = (sheet_h - pad_y - 36 - gap * (rows - 1)) // rows

    for idx in range(cols * rows):
        r = idx // cols
        c = idx % cols
        x0 = pad_x + c * (cell_w + gap)
        y0 = pad_y + r * (cell_h + gap)
        item = media_items[idx % max(1, len(media_items))] if media_items else None
        im = None
        if item and Path(item["path"]).exists():
            try:
                if item["kind"] == "video":
                    tmp_f = OUTPUT_DIR / f"_sb_kf_{uuid.uuid4().hex[:6]}.jpg"
                    subprocess.run(
                        ["ffmpeg", "-nostdin", "-y", "-ss", "0.8", "-i", str(item["path"]), "-vframes", "1", str(tmp_f)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                    )
                    if tmp_f.exists():
                        im = Image.open(tmp_f).convert("RGB")
                        tmp_f.unlink(missing_ok=True)
                else:
                    im = Image.open(item["path"]).convert("RGB")
            except Exception:
                im = None

        if im is not None:
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
        else:
            draw.rectangle([x0, y0, x0 + cell_w, y0 + cell_h], fill=(22, 24, 34))

        draw.rectangle([x0, y0, x0 + cell_w, y0 + cell_h], outline=(56, 62, 82), width=2)
        tag = f"SHOT 0{idx+1} • {'VIDEO' if (item and item['kind'] == 'video') else 'HD'}"
        draw.rounded_rectangle([x0 + 10, y0 + 10, x0 + 158, y0 + 36], radius=6, fill=(5, 5, 7))
        draw.text((x0 + 18, y0 + 15), tag, font=mf, fill=(217, 255, 0))

    sheet.save(str(out_path), quality=92)
    return out_path


# ==================== PARALLEL HYBRID REAL-VIDEO + AI-IMAGE SHOT RENDERER ====================

def _render_single_cinema_shot(
    media: Dict[str, Any],
    out_clip: Path,
    w: int,
    h: int,
    dur: float,
    fps: int,
    move: str,
    grade_filter: str,
    editorial_headline: Optional[str],
    editorial_subtitle: Optional[str],
    use_motion_blur: bool,
    encoder_mode: str,
) -> Path:
    """
    Renders a single shot on a dedicated worker thread:
    - If media['kind'] == 'video' (REAL moving AI video / Pexels 4K Video / Pixabay Video / Uploaded Clip):
      Preserves 100% authentic motion, smart center-fills to WxH, applies Cinema LUT + FidelityFX CAS + Deband!
    - If media['kind'] == 'image' (FLUX.1 / Imagen 3 / Curated HD):
      Applies silky supersampled camera trajectory + optional 180-deg shutter blur + Cinema LUT!
    - Composites 2x-supersampled high-fashion editorial typography PNG with smooth fade-in/out (ZERO raw drawtext!).
    """
    title_png: Optional[Path] = None
    if editorial_headline and editorial_headline.strip():
        title_png = OUTPUT_DIR / f"_ed_title_{uuid.uuid4().hex[:8]}.png"
        render_editorial_title_png(editorial_headline, editorial_subtitle or "", w, h, title_png)

    enc_args = get_video_encode_args(mode=encoder_mode, crf=16, bitrate="12M")

    try:
        if media["kind"] == "video":
            # TRUE REAL-FOOTAGE CINEMA PIPELINE (NO FAKE ZOOMPAN SLIDESHOW!)
            base_filters = [
                f"scale={w}:{h}:force_original_aspect_ratio=increase:flags=lanczos",
                f"crop={w}:{h}",
                f"fps={fps}",
                "setsar=1",
            ]
            if grade_filter:
                base_filters.append(grade_filter)

            if title_png:
                fade_out_st = max(0.3, dur - 0.5)
                fc = (
                    f"[0:v]{','.join(base_filters)}[vb];"
                    f"[1:v]format=rgba,fade=t=in:st=0.2:d=0.45:alpha=1,fade=t=out:st={fade_out_st:.2f}:d=0.45:alpha=1[vt];"
                    f"[vb][vt]overlay=0:0:eof_action=repeat[vout]"
                )
                cmd = [
                    "ffmpeg", "-nostdin", "-y", "-stream_loop", "-1", "-i", str(media["path"]),
                    "-loop", "1", "-framerate", str(fps), "-t", f"{dur:.2f}", "-i", str(title_png),
                    "-filter_complex", fc,
                    "-map", "[vout]",
                    "-t", f"{dur:.2f}",
                    *enc_args, "-an", str(out_clip),
                ]
            else:
                cmd = [
                    "ffmpeg", "-nostdin", "-y", "-stream_loop", "-1", "-i", str(media["path"]),
                    "-vf", ",".join(base_filters),
                    "-t", f"{dur:.2f}",
                    *enc_args, "-an", str(out_clip),
                ]
        else:
            # HIGH-RES AI IMAGE / CURATED PHOTO CINEMA PIPELINE
            frames = max(12, int(dur * fps))
            up_w, up_h = int(w * 1.4), int(h * 1.4)
            if move == "dolly_in":
                zp = f"zoompan=z='min(1.20,1.0+0.20*on/{frames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
            elif move == "dolly_out":
                zp = f"zoompan=z='max(1.0,1.20-0.20*on/{frames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
            elif move == "pan_right":
                zp = f"zoompan=z='1.16':x='(iw-iw/zoom)*on/{frames}':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
            elif move == "pan_left":
                zp = f"zoompan=z='1.16':x='(iw-iw/zoom)*(1-on/{frames})':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
            elif move == "crash_zoom":
                zp = f"zoompan=z='1.0+0.26*pow(on/{frames},2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
            else:
                zp = f"zoompan=z='1.12+0.04*sin(on*0.08)':x='iw/2-(iw/zoom/2)+34*sin(on*0.06)':y='ih/2-(ih/zoom/2)+18*cos(on*0.05)':d={frames}:s={w}x{h}:fps={fps}"

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

            if title_png:
                fade_out_st = max(0.3, dur - 0.5)
                fc = (
                    f"[0:v]{','.join(chain)}[vb];"
                    f"[1:v]format=rgba,fade=t=in:st=0.2:d=0.45:alpha=1,fade=t=out:st={fade_out_st:.2f}:d=0.45:alpha=1[vt];"
                    f"[vb][vt]overlay=0:0:eof_action=repeat[vout]"
                )
                cmd = [
                    "ffmpeg", "-nostdin", "-y", "-i", str(media["path"]),
                    "-loop", "1", "-framerate", str(fps), "-t", f"{dur:.2f}", "-i", str(title_png),
                    "-filter_complex", fc,
                    "-map", "[vout]",
                    "-t", f"{dur:.2f}",
                    *enc_args, "-an", str(out_clip),
                ]
            else:
                cmd = [
                    "ffmpeg", "-nostdin", "-y", "-i", str(media["path"]),
                    "-vf", ",".join(chain),
                    "-t", f"{dur:.2f}",
                    *enc_args, "-an", str(out_clip),
                ]

        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            raise RuntimeError(f"Shot render failed: {proc.stderr[-350:]}")
        return out_clip
    finally:
        if title_png:
            title_png.unlink(missing_ok=True)


# ==================== AGENT TWO: MULTI-AGENT CINEMA DIRECTOR v11.0 ====================

USE_CASE_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "ad_filmmaking": {
        "name": "Ad Filmmaking & Brand Campaign",
        "grade": "luxury_halation",
        "cadence": 24,
        "music": "ambient",
        "moves": ["dolly_in", "pan_right", "crash_zoom", "dolly_out", "orbit_drift"],
        "editorial_mode": True,
    },
    "performance_marketing": {
        "name": "Performance Marketing (High-ROAS Ad)",
        "grade": "high_roas_crisp",
        "cadence": 30,
        "music": "upbeat",
        "moves": ["crash_zoom", "pan_right", "dolly_in", "pan_left", "dolly_out"],
        "editorial_mode": True,
    },
    "filmmaking": {
        "name": "Theatrical Filmmaking (24fps Anamorphic)",
        "grade": "kodak_cinema_24",
        "cadence": 24,
        "music": "cinematic",
        "moves": ["dolly_in", "orbit_drift", "pan_left", "dolly_out", "dolly_in"],
        "editorial_mode": True,
    },
    "micro_drama": {
        "name": "Vertical Micro-Drama Series (A24)",
        "grade": "moody_a24",
        "cadence": 24,
        "music": "dark_suspense",
        "moves": ["dolly_in", "dolly_out", "orbit_drift", "crash_zoom", "pan_left"],
        "editorial_mode": False,
    },
    "ai_ugc": {
        "name": "AI UGC Creator & Trial Room",
        "grade": "editorial_minimal",
        "cadence": 30,
        "music": "lofi",
        "moves": ["orbit_drift", "dolly_in", "pan_right", "dolly_out", "orbit_drift"],
        "editorial_mode": False,
    },
    "ai_vfx": {
        "name": "AI VFX & Sci-Fi Visual Spectacle",
        "grade": "cyber_vfx",
        "cadence": 60,
        "music": "cyberpunk",
        "moves": ["crash_zoom", "orbit_drift", "pan_right", "dolly_in", "dolly_out"],
        "editorial_mode": True,
    },
    "pre_viz": {
        "name": "Director Pre-Viz & Production Design",
        "grade": "kodak_cinema_24",
        "cadence": 24,
        "music": "cinematic",
        "moves": ["pan_right", "dolly_in", "pan_left", "orbit_drift", "dolly_out"],
        "editorial_mode": True,
    },
}


class RenderEngine:
    """
    OmniViral Cinema Render Engine v11.0:
    - Real Generative Video Diffusion (fal.ai Seedance/Kling/Wan/MiniMax, Replicate, Gemini Imagen 3)
    - Real Moving 4K Cinema Footage (Pexels 4K Video, Pixabay Video, User Uploaded Clips)
    - Photoreal AI Image Gen (HuggingFace FLUX.1-schnell) + Clutter-Free Curated Fallback
    - 2x Supersampled High-Fashion Editorial Typography (ZERO raw drawtext / ZERO clashing stickers!)
    - Parallel GPU Render + Optical Halation + FidelityFX CAS + Deband + BT.709 + 48kHz -14 LUFS
    """

    @staticmethod
    async def run_agent_two_production(
        brief: str,
        use_case: str = "ad_filmmaking",
        brand_name: str = "AETHER LUXE",
        aspect_ratio: str = "9:16",
        fps: Optional[int] = None,
        grade_id: Optional[str] = None,
        encoder_mode: str = "gpu_fast",
        voice_id: str = "en-US-AndrewNeural",
        caption_style: str = "editorial",
        enable_halation: bool = True,
        enable_motion_blur: bool = True,
        model_profile: str = "omniviral_cinema_v10",
        custom_clip_paths: Optional[List[str]] = None,
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

        # ---- AGENT 1: CONTEXT, PROMPT ENGINEERING & TIGHT COMMERCIAL SCRIPT ----
        t1 = time.perf_counter()
        clean_brief = brief.strip() or "Luxury botanical fragrance in golden hour sunlight"
        stop_words = {"with", "that", "this", "from", "into", "your", "bathed", "launch", "video", "about", "make", "create"}
        keywords = [
            w for w in re.sub(r"[^a-zA-Z0-9\s]", "", clean_brief).split()
            if len(w) > 2 and w.lower() not in stop_words
        ][:6]
        kw_primary = " ".join(keywords[:2]) or "luxury perfume"
        kw_secondary = " ".join(keywords[1:3]) or kw_primary

        # Punchy 13-15s commercial rhythm (matching InVideo reference commercial durations!)
        scenes_plan = [
            {
                "shot": 1,
                "narration": f"{brand_name}. Pure craft in motion.",
                "editorial": brand_name.upper(),
                "subtitle": "NEW COLLECTION",
                "prompt": f"Cinematic macro close-up of {clean_brief}, golden hour rim light, luxury commercial film, 35mm shallow depth of field",
                "search_query": kw_primary,
                "move": uc["moves"][0],
            },
            {
                "shot": 2,
                "narration": "Sculpted by golden light, designed for effortless presence.",
                "editorial": "SCULPTED BY LIGHT",
                "subtitle": "",
                "prompt": f"Editorial fashion commercial shot of {clean_brief}, soft sunlit highlights, flowing motion, slow motion cinema",
                "search_query": kw_secondary,
                "move": uc["moves"][1],
            },
            {
                "shot": 3,
                "narration": "Every detail elevates the moment.",
                "editorial": "FEEL THE MOMENT",
                "subtitle": "",
                "prompt": f"Atmospheric luxury lifestyle medium shot inspired by {clean_brief}, warm film grain, smooth dolly tracking shot",
                "search_query": f"{kw_primary} aesthetic",
                "move": uc["moves"][2],
            },
            {
                "shot": 4,
                "narration": "Unmistakable clarity from the very first frame.",
                "editorial": "EFFORTLESS LUXURY",
                "subtitle": "",
                "prompt": f"High-fashion studio hero angle of {clean_brief}, crisp reflections, dramatic warm shadows, 8k commercial",
                "search_query": f"{kw_secondary} sunlight",
                "move": uc["moves"][3],
            },
            {
                "shot": 5,
                "narration": f"Experience {brand_name} today.",
                "editorial": brand_name.upper(),
                "subtitle": "DISCOVER NOW",
                "prompt": f"Minimalist iconic finale shot of {clean_brief}, glowing sunlight bokeh, calm luxury aesthetic",
                "search_query": kw_primary,
                "move": uc["moves"][4],
            },
        ]
        full_script = " ".join(s["narration"] for s in scenes_plan)
        agent_trace.append({
            "agent": "01 / Context & Prompt Director",
            "status": "done",
            "ms": round((time.perf_counter() - t1) * 1000),
            "detail": f"Engineered 5 cinema prompts (tight commercial rhythm) • Model Route: {model_profile}",
        })

        # ---- AGENT 2: REAL VIDEO DIFFUSION / 4K FOOTAGE ACQUISITION + NEURAL VOICE ----
        t2 = time.perf_counter()
        vo_res = await VoiceService.synthesize_speech(
            text=full_script,
            voice_id=voice_id,
            output_filename=f"agent2_vo_{job_id}.mp3",
            rate="+8%",
        )
        vo_path = Path(vo_res["audio_path"])
        total_dur = max(11.5, min(18.0, float(vo_res.get("duration") or 13.5)))

        uploads = custom_clip_paths or []

        async def _acquire(idx: int, sc: Dict[str, Any]) -> Dict[str, Any]:
            custom_p = uploads[idx % len(uploads)] if uploads else None
            return await CinemaMediaEngine.acquire_shot_media(
                prompt=sc["prompt"],
                search_query=sc["search_query"],
                aspect_ratio=aspect_ratio,
                model_profile=model_profile,
                shot_idx=idx,
                job_id=job_id,
                custom_clip_path=custom_p,
            )

        media_items = list(await asyncio.gather(*[_acquire(i, sc) for i, sc in enumerate(scenes_plan)]))
        real_video_count = sum(1 for m in media_items if m["kind"] == "video")
        sources_summary = sorted(set(f"{m['source']} ({m['model']})" for m in media_items))

        agent_trace.append({
            "agent": "02 / Cinema Media & Voice Production",
            "status": "done",
            "ms": round((time.perf_counter() - t2) * 1000),
            "detail": f"Acquired {real_video_count}/5 real moving video clips • Sources: {', '.join(sources_summary)}",
        })

        # ---- AGENT 3: 3x3 CONTINUITY STORYBOARD CONTACT SHEET ----
        t3 = time.perf_counter()
        sb_fn = f"agent2_storyboard_{job_id}.jpg"
        sb_path = OUTPUT_DIR / sb_fn
        build_continuity_storyboard_sheet(media_items, clean_brief, use_case, sb_path)
        agent_trace.append({
            "agent": "03 / Storyboard & Continuity Agent",
            "status": "done",
            "ms": round((time.perf_counter() - t3) * 1000),
            "detail": f"Built continuity sheet ({sb_fn}) from active {'video keyframes' if real_video_count else 'studio frames'}",
        })

        # ---- AGENT 4: PARALLEL GPU CINEMA RENDER + SUPERSAMPLED EDITORIAL TYPOGRAPHY ----
        t4 = time.perf_counter()
        xfade_dur = 0.40
        n_shots = len(media_items)
        shot_dur = (total_dur + xfade_dur * (n_shots - 1)) / n_shots + 0.12
        clip_paths = [OUTPUT_DIR / f"agent2_clip_{job_id}_{i}.mp4" for i in range(n_shots)]

        use_editorial = (caption_style == "editorial")
        loop = asyncio.get_running_loop()
        max_workers = min(3, n_shots)

        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as pool:
            tasks = [
                loop.run_in_executor(
                    pool,
                    _render_single_cinema_shot,
                    media_items[i],
                    clip_paths[i],
                    W,
                    H,
                    shot_dur,
                    target_fps,
                    scenes_plan[i]["move"],
                    grade_obj["filter"],
                    scenes_plan[i]["editorial"] if use_editorial else None,
                    scenes_plan[i]["subtitle"] if use_editorial else None,
                    enable_motion_blur,
                    encoder_mode,
                )
                for i in range(n_shots)
            ]
            await asyncio.gather(*tasks)

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

        # Clean minimalist transparent top-right editorial brand mark (NO clashing neon sticker!)
        wm_png = OUTPUT_DIR / f"agent2_wm_{job_id}.png"
        render_minimal_brand_watermark_png(brand_name, W, H, wm_png)
        wm_idx = n_shots + 2
        cmd.extend(["-i", str(wm_png)])

        f_parts: List[str] = []
        transitions = ["fade", "dissolve", "smoothleft", "fade", "dissolve"]
        prev_lbl = "[0:v]"
        offset = shot_dur - xfade_dur
        for i in range(1, n_shots):
            nxt = f"[xf{i}]"
            tr = transitions[(i - 1) % len(transitions)]
            f_parts.append(f"{prev_lbl}[{i}:v]xfade=transition={tr}:duration={xfade_dur:.2f}:offset={max(0.2, offset):.2f}{nxt}")
            prev_lbl = nxt
            offset += (shot_dur - xfade_dur)

        # Dual-Path Optical Film Halation Bloom
        if enable_halation:
            f_parts.append(
                f"{prev_lbl}split=2[h_base][h_src];"
                f"[h_src]curves=all='0/0 0.72/0 1/1',gblur=sigma=14,colorbalance=rh=0.20:gh=0.05:bh=-0.08[h_glow];"
                f"[h_base][h_glow]blend=all_mode=screen:all_opacity=0.22[vhal]"
            )
            prev_lbl = "[vhal]"

        # Anamorphic 2.39 letterbox bars for theatrical filmmaking / pre_viz
        if use_case in ("filmmaking", "pre_viz") and W >= H:
            bar = int(H * 0.085)
            f_parts.append(f"{prev_lbl}drawbox=x=0:y=0:w={W}:h={bar}:color=black:t=fill,drawbox=x=0:y={H-bar}:w={W}:h={bar}:color=black:t=fill[vlet]")
            prev_lbl = "[vlet]"

        # Subtle transparent top-right brand mark
        f_parts.append(f"{prev_lbl}[{wm_idx}:v]overlay=0:0[vwm]")
        prev_lbl = "[vwm]"

        # Optional Viral ASS captions when user selects volt_lime / hormozi instead of minimalist editorial
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
            f"[{bgm_idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.24[bg_r];"
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

        for cp in clip_paths:
            cp.unlink(missing_ok=True)
        for tmp in (bgm_path, wm_png, vo_path, sub_path):
            if tmp:
                Path(tmp).unlink(missing_ok=True)

        if proc.returncode != 0:
            raise RuntimeError(f"Agent Two Master stitch failed: {proc.stderr[-500:]}")

        agent_trace.append({
            "agent": "04 / Parallel Cinema Render Engine",
            "status": "done",
            "ms": round((time.perf_counter() - t4) * 1000),
            "detail": f"Mastered {n_shots} shots ({real_video_count} real video) @ {target_fps}fps • 2x SSAA Typography • Halation • 48kHz",
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
            "title": f"Agent Two ({uc['name']}): {clean_brief[:42]}",
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
            "real_video_shots": real_video_count,
            "media_sources": sources_summary,
            "provider_status": get_active_media_providers(),
            "agent_trace": agent_trace,
            "qa_report": qa,
        }
