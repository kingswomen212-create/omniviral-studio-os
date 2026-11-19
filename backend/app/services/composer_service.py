import re
import subprocess
from pathlib import Path
from typing import List, Dict, Any
from app.core.config import OUTPUT_DIR
from app.services.visual_service import VisualService

COLOR_LUT_FILTERS = {
    "teal_orange": "colorbalance=rs=.07:bs=-.07:rh=.11:bh=-.09,eq=contrast=1.14:saturation=1.22,unsharp=5:5:0.7",
    "moody_a24": "eq=contrast=1.18:brightness=-0.04:saturation=0.78,colorbalance=rm=.04:bm=-.04,vignette=PI/3.2",
    "noir": "hue=s=0,eq=contrast=1.35:brightness=-0.03,vignette=PI/3",
    "cyberpunk": "colorbalance=rs=.11:gs=-.08:bs=.16,eq=contrast=1.2:saturation=1.42",
    "kodak_2383": "curves=vintage,eq=contrast=1.1:saturation=1.15,noise=alls=9:allf=t",
    "bleach_bypass": "eq=contrast=1.32:saturation=0.55,unsharp=5:5:1.0",
    "none": ""
}

CAMERA_BODY_FILTERS = {
    "arri_alexa": "unsharp=5:5:0.6",
    "35mm_kodak": "noise=alls=8:allf=t+u,vignette=PI/4",
    "8mm_vintage": "noise=alls=18:allf=t+u,eq=contrast=1.12:saturation=0.85,vignette=PI/2.8",
    "vhs_cam": "rgbashift=rh=-4:bh=4,noise=alls=20:allf=t"
}

VALID_TRANSITIONS = {"fade", "wipeleft", "wiperight", "slideup", "zoomin", "circleopen", "dissolve"}

class ComposerService:
    @staticmethod
    def _get_duration(media_path: str, fallback: float = 5.0) -> float:
        cmd = ["ffmpeg", "-i", str(media_path)]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True)
            m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", res.stderr)
            if m:
                hrs, mins, secs = int(m.group(1)), int(m.group(2)), float(m.group(3))
                val = hrs * 3600 + mins * 60 + secs
                return val if val > 0 else fallback
        except Exception:
            pass
        return fallback

    @staticmethod
    def compose_video(
        video_clips: List[str],
        audio_path: str,
        subtitle_path: str,
        output_filename: str = "final_output.mp4",
        aspect_ratio: str = "9:16",
        caption_style: str = "volt",
        bg_music: bool = True,
        transition: str = "fade",
        color_fx: str = "teal_orange",
        camera_body: str = "arri_alexa",
        lens_type: str = "clean_prime",
        progress_bar: bool = True,
        watermark: str = "",
        hook_text: str = "",
        split_screen: bool = False
    ) -> Dict[str, Any]:
        """
        Higgsfield-Inspired Cinema Studio FFmpeg Compositor:
        - Uniform 30fps normalization + deterministic xfade transitions
        - Split-screen audio-reactive retention mode
        - Cinema Color LUTs + Camera Body texture + Anamorphic lens matte
        - Acid-Lime animated progress bar, 2.8s Hook Title Card, @Watermark, Viral ASS Captions
        - Warm multi-harmonic ambient synth bed
        """
        w, h = VisualService.get_dimensions(aspect_ratio)
        final_path = OUTPUT_DIR / output_filename
        total_duration = ComposerService._get_duration(audio_path, fallback=25.0)

        cmd = ["ffmpeg", "-y"]
        clip_durations = []
        for clip in video_clips:
            cmd.extend(["-i", str(clip)])
            clip_durations.append(ComposerService._get_duration(clip, fallback=total_duration / max(1, len(video_clips))))

        audio_idx = len(video_clips)
        cmd.extend(["-i", audio_path])

        filter_parts = []
        target_h = int(h * 0.58) if split_screen else h

        # 1. Normalize each input clip
        for i in range(len(video_clips)):
            filter_parts.append(
                f"[{i}:v]scale={w}:{target_h}:force_original_aspect_ratio=increase,"
                f"crop={w}:{target_h},fps=30,setsar=1,format=yuv420p[v{i}]"
            )

        # 2. Chain xfade transitions
        xfade_dur = 0.45
        if len(video_clips) == 1:
            last_v = "v0"
        elif transition in VALID_TRANSITIONS:
            current_offset = max(0.6, clip_durations[0] - xfade_dur)
            last_v = "v0"
            for i in range(1, len(video_clips)):
                out_lbl = f"vx{i}"
                filter_parts.append(
                    f"[{last_v}][v{i}]xfade=transition={transition}:duration={xfade_dur}:offset={current_offset:.3f}[{out_lbl}]"
                )
                last_v = out_lbl
                current_offset += max(0.6, clip_durations[i] - xfade_dur)
        else:
            inputs_str = "".join(f"[v{i}]" for i in range(len(video_clips)))
            filter_parts.append(f"{inputs_str}concat=n={len(video_clips)}:v=1:a=0[vcat]")
            last_v = "vcat"

        # 3. Split-screen wave mode
        if split_screen:
            bot_h = h - target_h
            filter_parts.append(
                f"[{audio_idx}:a]showwaves=s={w}x{bot_h}:mode=cline:colors=0xD9FF00|0x38bdf8:rate=30[waves];"
                f"color=c=0x050507:s={w}x{bot_h}:d={total_duration}[wbg];"
                f"[wbg][waves]overlay=0:0[bot];"
                f"[{last_v}][bot]vstack=inputs=2[vstacked]"
            )
            last_v = "vstacked"

        # 4. Color LUT + Camera Body + Lens Optics
        optics_chain = []
        if COLOR_LUT_FILTERS.get(color_fx):
            optics_chain.append(COLOR_LUT_FILTERS[color_fx])
        if CAMERA_BODY_FILTERS.get(camera_body):
            optics_chain.append(CAMERA_BODY_FILTERS[camera_body])
        if lens_type == "anamorphic":
            bar = int(h * 0.08)
            optics_chain.append(f"drawbox=x=0:y=0:w={w}:h={bar}:color=black:t=fill,drawbox=x=0:y={h-bar}:w={w}:h={bar}:color=black:t=fill")
        elif lens_type == "halation_glow":
            optics_chain.append("eq=gamma=1.08:contrast=1.08,vignette=PI/3.5")

        if optics_chain:
            filter_parts.append(f"[{last_v}]{','.join(optics_chain)}[vfx]")
            last_v = "vfx"

        # 5. Acid-Lime Animated Progress Bar
        if progress_bar:
            bar_h = 10
            filter_parts.append(
                f"color=c=0xD9FF00:s={w}x{bar_h}:d={total_duration}[pbar];"
                f"[{last_v}][pbar]overlay=x='-W+(W*t/{total_duration:.2f})':y=0:shortest=1[vbar]"
            )
            last_v = "vbar"

        # 6. Cinema Hook Banner (first 2.8 seconds)
        if hook_text:
            safe_hook = hook_text.replace("'", "").replace(":", " -").replace("%", "pct")[:38].upper()
            h_font = int(w * 0.048)
            filter_parts.append(
                f"[{last_v}]drawtext=text='{safe_hook}':fontcolor=0xD9FF00:fontsize={h_font}:borderw=4:bordercolor=black:"
                f"box=1:boxcolor=0x050507@0.82:boxborderw=18:x=(w-text_w)/2:y={int(h*0.14)}:enable='between(t,0.1,2.8)'[vhook]"
            )
            last_v = "vhook"

        # 7. Subtle Brand Watermark
        if watermark and watermark.strip():
            safe_wm = watermark.strip().replace("'", "").replace(":", "")[:28]
            wm_font = int(w * 0.032)
            filter_parts.append(
                f"[{last_v}]drawtext=text='{safe_wm}':fontcolor=white@0.65:fontsize={wm_font}:borderw=2:bordercolor=black@0.7:"
                f"x=(w-text_w)/2:y={int(h*0.045)}[vwm]"
            )
            last_v = "vwm"

        # 8. Burn Viral ASS Captions
        if caption_style != "none":
            sub_path_escaped = str(Path(subtitle_path).resolve()).replace("\\", "/").replace(":", "\\:")
            filter_parts.append(f"[{last_v}]subtitles='{sub_path_escaped}'[vout]")
        else:
            filter_parts.append(f"[{last_v}]null[vout]")

        # 9. Audio Mix (Voice + Ambient Synth Pad)
        if bg_music:
            pad_idx = audio_idx + 1
            cmd.extend([
                "-f", "lavfi", "-i",
                f"aevalsrc=0.35*sin(2*PI*110*t)+0.25*sin(2*PI*164.81*t)+0.2*sin(2*PI*220*t)+0.15*sin(2*PI*261.63*t):s=44100:d={total_duration}"
            ])
            filter_parts.append(
                f"[{audio_idx}:a]volume=1.0[voice];"
                f"[{pad_idx}:a]lowpass=f=320,volume=0.08[pad];"
                f"[voice][pad]amix=inputs=2:duration=first[aout]"
            )
            audio_map = "[aout]"
        else:
            audio_map = f"{audio_idx}:a"

        filter_complex = ";".join(filter_parts)
        cmd.extend([
            "-filter_complex", filter_complex,
            "-map", "[vout]", "-map", audio_map,
            "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-t", str(total_duration),
            str(final_path)
        ])

        process = subprocess.run(cmd, capture_output=True, text=True)
        if process.returncode != 0:
            print(f"FFmpeg Composer error: {process.stderr}")
            raise RuntimeError(f"FFmpeg failed: {process.stderr[-500:]}")

        return {
            "status": "completed",
            "video_path": str(final_path),
            "filename": output_filename,
            "duration": round(total_duration, 2),
            "aspect_ratio": aspect_ratio
        }
