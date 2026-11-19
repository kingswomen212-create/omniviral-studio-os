import random
import subprocess
import urllib.parse
import httpx
from pathlib import Path
from typing import List, Dict, Any, Tuple
from app.core.config import OUTPUT_DIR, settings
from app.core.database import get_setting

ASPECT_DIMENSIONS = {
    "9:16": (1080, 1920),
    "16:9": (1920, 1080),
    "1:1": (1080, 1080)
}

CAMERA_MOVEMENTS = [
    {"id": "dolly_in", "name": "Dolly In", "tag": "PUSH", "desc": "Smooth cinema push toward subject"},
    {"id": "crash_zoom", "name": "Crash Zoom", "tag": "PUNCH", "desc": "Rapid dramatic punch-in impact"},
    {"id": "dolly_out", "name": "Dolly Out", "tag": "REVEAL", "desc": "Slow pull-back wide reveal"},
    {"id": "pan_left", "name": "Pan Left", "tag": "SWEEP", "desc": "Horizontal cinema dolly sweep left"},
    {"id": "pan_right", "name": "Pan Right", "tag": "SWEEP", "desc": "Horizontal cinema dolly sweep right"},
    {"id": "handheld", "name": "Handheld FPV", "tag": "RAW", "desc": "Organic handheld camera motion"},
    {"id": "orbit_drift", "name": "Orbit Drift", "tag": "FLOAT", "desc": "Diagonal floating cinema drift"}
]

class VisualService:
    @staticmethod
    def list_camera_movements() -> List[Dict[str, str]]:
        return CAMERA_MOVEMENTS

    @staticmethod
    def get_dimensions(aspect_ratio: str = "9:16") -> Tuple[int, int]:
        return ASPECT_DIMENSIONS.get(aspect_ratio, (1080, 1920))

    @staticmethod
    async def generate_scene_image_preview(
        prompt: str,
        aspect_ratio: str = "9:16",
        seed: int = None
    ) -> str:
        """
        Fetches a REAL, high-resolution, keyword-matched visual for the scene:
        1. Pexels Photo API (if user added free Pexels key in Settings)
        2. Openverse API (800M+ real HD photos/art, 100% free, zero API key!)
        3. Picsum HD photography fallback (never a blank solid color box!)
        """
        seed_val = seed if seed is not None else random.randint(1000, 999999)
        img_filename = f"scene_img_{seed_val}.jpg"
        img_path = OUTPUT_DIR / img_filename

        # Clean search keywords from prompt (strip style suffixes for crisp photo search)
        clean_query = prompt.split(",")[0].strip()
        if not clean_query:
            clean_query = "cinematic dark night city"

        # 1. Try Pexels Photos if key exists
        pexels_key = get_setting("pexels_api_key", "") or settings.PEXELS_API_KEY
        if pexels_key:
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    orient = "portrait" if aspect_ratio == "9:16" else ("landscape" if aspect_ratio == "16:9" else "square")
                    r = await client.get(
                        "https://api.pexels.com/v1/search",
                        headers={"Authorization": pexels_key},
                        params={"query": clean_query, "orientation": orient, "per_page": 6}
                    )
                    if r.status_code == 200:
                        photos = r.json().get("photos", [])
                        if photos:
                            chosen = random.choice(photos)
                            img_url = chosen["src"].get("large2x") or chosen["src"].get("large")
                            img_r = await client.get(img_url, follow_redirects=True)
                            if img_r.status_code == 200 and len(img_r.content) > 10000:
                                with open(img_path, "wb") as f:
                                    f.write(img_r.content)
                                return img_filename
            except Exception as e:
                print(f"Pexels photo error: {e}")

        # 2. Openverse API (100% Free, Zero Key, Real High-Res Photography & Art)
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers={"User-Agent": "OmniViralCinema/3.0"}) as client:
                q_encoded = urllib.parse.quote(clean_query)
                r = await client.get(f"https://api.openverse.org/v1/images/?q={q_encoded}&page_size=12")
                if r.status_code == 200:
                    results = r.json().get("results", [])
                    # Filter for decent resolution JPG/PNG images
                    good = [
                        item for item in results
                        if (item.get("width") or 0) >= 600 and item.get("url")
                        and not item["url"].lower().endswith(".svg")
                    ]
                    random.shuffle(good)
                    for item in good[:5]:
                        try:
                            img_r = await client.get(item["url"], timeout=12.0)
                            ct = img_r.headers.get("content-type", "")
                            if img_r.status_code == 200 and "image" in ct and len(img_r.content) > 15000:
                                with open(img_path, "wb") as f:
                                    f.write(img_r.content)
                                return img_filename
                        except Exception:
                            continue
        except Exception as e:
            print(f"Openverse fetch error: {e}")

        # 3. Picsum High-Res Photography Fallback (always returns a crisp real photograph)
        try:
            w, h = VisualService.get_dimensions(aspect_ratio)
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                r = await client.get(f"https://picsum.photos/seed/{seed_val}/{min(w,1080)}/{min(h,1920)}")
                if r.status_code == 200 and len(r.content) > 10000:
                    with open(img_path, "wb") as f:
                        f.write(r.content)
                    return img_filename
        except Exception as e:
            print(f"Picsum fallback error: {e}")

        # Final offline fallback
        w, h = VisualService.get_dimensions(aspect_ratio)
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", f"color=c=0x141E30:s={w}x{h}:d=1",
            "-frames:v", "1", str(img_path)
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return img_filename

    @staticmethod
    async def fetch_or_generate_visuals(
        scenes: List[Dict[str, Any]],
        total_duration: float,
        job_id: str,
        aspect_ratio: str = "9:16",
        camera_move: str = "dolly_in",
        use_ai_images: bool = True
    ) -> List[str]:
        """
        Generates real cinematic video clips for every scene with deterministic
        Higgsfield-inspired camera movements (Dolly In, Crash Zoom, Pan, Handheld, Orbit).
        """
        w, h = VisualService.get_dimensions(aspect_ratio)
        video_paths = []
        # Add +0.55s buffer per clip so xfade transitions (0.45s) align seamlessly
        clip_duration = max(3.5, (total_duration / max(1, len(scenes))) + 0.55)

        for idx, scene in enumerate(scenes):
            clip_name = f"clip_{job_id}_{idx}.mp4"
            clip_path = OUTPUT_DIR / clip_name
            prompt = scene.get("visual_prompt") or scene.get("query") or "cinematic night city"
            shot_move = scene.get("camera_move") or camera_move

            existing_img = scene.get("image_filename")
            img_path = OUTPUT_DIR / existing_img if existing_img else None

            if not img_path or not img_path.exists():
                img_filename = await VisualService.generate_scene_image_preview(prompt, aspect_ratio)
                img_path = OUTPUT_DIR / img_filename

            VisualService._animate_camera_rig(img_path, clip_path, clip_duration, w, h, shot_move, idx)
            video_paths.append(str(clip_path))

        return video_paths

    @staticmethod
    def _animate_camera_rig(img_path: Path, target_path: Path, duration: float, w: int, h: int, camera_move: str, idx: int):
        """
        Higgsfield-inspired deterministic camera rig motion paths using FFmpeg zoompan.
        """
        fps = 30
        frames = max(30, int(duration * fps))
        # Upscale input cleanly to prevent jitter during zoompan
        up_w, up_h = int(w * 1.6), int(h * 1.6)

        if camera_move == "crash_zoom":
            # Fast dramatic punch-in during first 24 frames, then subtle creep
            zp = f"zoompan=z='if(lt(on,24),1.0+0.26*(on/24),1.26+0.0008*(on-24))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
        elif camera_move == "dolly_out":
            zp = f"zoompan=z='max(1.0,1.24-0.24*(on/{frames}))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
        elif camera_move == "pan_left":
            zp = f"zoompan=z='1.22':x='(iw-iw/zoom)*(1-on/{frames})':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
        elif camera_move == "pan_right":
            zp = f"zoompan=z='1.22':x='(iw-iw/zoom)*(on/{frames})':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
        elif camera_move == "handheld":
            zp = f"zoompan=z='1.12+0.02*sin(on/12)':x='iw/2-(iw/zoom/2)+18*sin(on/9)':y='ih/2-(ih/zoom/2)+14*cos(on/11)':d={frames}:s={w}x{h}:fps={fps}"
        elif camera_move == "orbit_drift":
            zp = f"zoompan=z='1.12+0.12*(on/{frames})':x='(iw-iw/zoom)*(0.2+0.6*(on/{frames}))':y='(ih-ih/zoom)*(0.3+0.4*(on/{frames}))':d={frames}:s={w}x{h}:fps={fps}"
        else:
            # Default dolly_in (alternate subtle pan direction per shot for cinema continuity)
            if idx % 2 == 0:
                zp = f"zoompan=z='min(1.24,1.0+0.24*(on/{frames}))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"
            else:
                zp = f"zoompan=z='max(1.0,1.22-0.22*(on/{frames}))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={fps}"

        cmd = [
            "ffmpeg", "-y",
            "-i", str(img_path),
            "-vf", f"scale={up_w}:{up_h}:force_original_aspect_ratio=increase,crop={up_w}:{up_h},{zp}",
            "-t", str(duration),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "ultrafast",
            str(target_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if res.returncode != 0 or not target_path.exists():
            # Clean static scale fallback if zoompan fails on weird image format
            subprocess.run([
                "ffmpeg", "-y", "-loop", "1", "-i", str(img_path),
                "-vf", f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}",
                "-t", str(duration), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "ultrafast",
                str(target_path)
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    @staticmethod
    def generate_thumbnail(first_clip_or_img: Path, title_text: str, output_filename: str, aspect_ratio: str = "9:16") -> str:
        w, h = VisualService.get_dimensions(aspect_ratio)
        out_path = OUTPUT_DIR / output_filename
        safe_title = title_text.replace("'", "").replace(":", " -").replace("%", "pct")[:38].upper()
        font_size = int(w * 0.072)

        cmd = [
            "ffmpeg", "-y",
            "-i", str(first_clip_or_img),
            "-frames:v", "1",
            "-vf", (
                f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
                f"eq=contrast=1.18:saturation=1.25,"
                f"drawbox=x=0:y={int(h*0.36)}:w={w}:h={int(h*0.24)}:color=black@0.72:t=fill,"
                f"drawtext=text='{safe_title}':fontcolor=0xD9FF00:fontsize={font_size}:borderw=5:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2"
            ),
            str(out_path)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return output_filename

    @staticmethod
    def generate_audio_visualizer(audio_path: str, output_filename: str, title: str = "AI Beat", aspect_ratio: str = "9:16") -> str:
        w, h = VisualService.get_dimensions(aspect_ratio)
        out_path = OUTPUT_DIR / output_filename

        filter_complex = (
            f"color=c=0x050507:s={w}x{h}[bg];"
            f"[0:a]showwaves=s={w}x{int(h*0.38)}:mode=cline:colors=0xD9FF00|0x38bdf8:rate=30[waves];"
            f"[bg][waves]overlay=(W-w)/2:(H-h)/2,vignette=PI/4[outv]"
        )

        cmd = [
            "ffmpeg", "-y",
            "-i", audio_path,
            "-filter_complex", filter_complex,
            "-map", "[outv]", "-map", "0:a",
            "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            str(out_path)
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"Visualizer FFmpeg error: {res.stderr[-400:]}")
        return str(out_path)
