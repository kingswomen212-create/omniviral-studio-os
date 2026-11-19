import re
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.core.config import OUTPUT_DIR, MUSIC_DIR
from app.services.visual_service import VisualService
from app.services.audio_engine import AudioEngine
from app.services.motion_gfx_engine import MotionGraphicsEngine

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
        music_mood: str = "dark_cinematic",
        custom_music_path: Optional[str] = None,
        transition: str = "fade",
        color_fx: str = "teal_orange",
        camera_body: str = "arri_alexa",
        lens_type: str = "clean_prime",
        progress_bar: bool = True,
        watermark: str = "",
        hook_text: str = "",
        split_screen: bool = False,
        motion_graphics: bool = True,
        sfx_whoosh: bool = True,
        render_quality: str = "1080p_30"
    ) -> Dict[str, Any]:
        """
        Broadcast-Grade Cinema & HyperFrames FFmpeg Compositor:
        - Supports 1080p 30fps, 1080p 60fps (Silky Pro), and 4K UHD 2160p
        - Deterministic xfade transitions + synchronized Whoosh SFX at every cut
        - HyperFrames Animated Scene Chapter Badges (eased slide-in on every scene beat)
        - Built-in 6-mood royalty-free music synthesizer OR custom uploaded MP3 track
        - True Sidechain Audio Ducking + -14 LUFS Broadcast Loudness Mastering
        """
        w, h = VisualService.get_dimensions(aspect_ratio)
        target_fps = 60 if render_quality == "1080p_60" else 30
        crf_val = "17" if render_quality == "4k_uhd" else ("18" if render_quality == "1080p_60" else "20")

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
                f"crop={w}:{target_h},fps={target_fps},setsar=1,format=yuv420p[v{i}]"
            )

        # 2. Chain xfade transitions & track exact transition timestamps for SFX + Motion Badges
        xfade_dur = 0.45
        transition_times: List[float] = []
        if len(video_clips) == 1:
            last_v = "v0"
        elif transition in VALID_TRANSITIONS:
            current_offset = max(0.6, clip_durations[0] - xfade_dur)
            last_v = "v0"
            for i in range(1, len(video_clips)):
                transition_times.append(current_offset)
                out_lbl = f"vx{i}"
                filter_parts.append(
                    f"[{last_v}][v{i}]xfade=transition={transition}:duration={xfade_dur}:offset={current_offset:.3f}[{out_lbl}]"
                )
                last_v = out_lbl
                current_offset += max(0.6, clip_durations[i] - xfade_dur)
        else:
            acc = 0.0
            for d in clip_durations[:-1]:
                acc += d
                transition_times.append(acc)
            inputs_str = "".join(f"[v{i}]" for i in range(len(video_clips)))
            filter_parts.append(f"{inputs_str}concat=n={len(video_clips)}:v=1:a=0[vcat]")
            last_v = "vcat"

        # 3. Split-screen wave mode
        if split_screen:
            bot_h = h - target_h
            filter_parts.append(
                f"[{audio_idx}:a]showwaves=s={w}x{bot_h}:mode=cline:colors=0xD9FF00|0x38bdf8:rate={target_fps}[waves];"
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

        # 5. HyperFrames Kinetic Motion Graphics Overlay (Eased Slide-in Beat Badges per Scene!)
        if motion_graphics and len(video_clips) >= 1:
            beat_starts = [0.2] + [t + 0.15 for t in transition_times]
            mg_chain = []
            badge_font = int(w * 0.028)
            for idx, t0 in enumerate(beat_starts[:6]):
                t1 = min(total_duration, t0 + 2.2)
                # Smooth slide-in from left edge into x=44 with clamped easing
                mg_chain.append(
                    f"drawtext=text='SCENE 0{idx+1}':fontcolor=0x050507:fontsize={badge_font}:"
                    f"box=1:boxcolor=0xD9FF00@0.95:boxborderw=12:"
                    f"x='min(44,-220+1100*(t-{t0:.2f}))':y={int(h*0.085)}:enable='between(t,{t0:.2f},{t1:.2f})'"
                )
            if mg_chain:
                filter_parts.append(f"[{last_v}]{','.join(mg_chain)}[vmg]")
                last_v = "vmg"

        # 6. Acid-Lime Animated Progress Bar
        if progress_bar:
            bar_h = 10
            filter_parts.append(
                f"color=c=0xD9FF00:s={w}x{bar_h}:d={total_duration}[pbar];"
                f"[{last_v}][pbar]overlay=x='-W+(W*t/{total_duration:.2f})':y=0:shortest=1[vbar]"
            )
            last_v = "vbar"

        next_in_idx = audio_idx + 1
        hook_png_path = None
        # 7. Studio Vector Floating Pill Hook Card (v9.0 anti-aliased rounded pill + Gaussian shadow!)
        if hook_text:
            try:
                hook_png_path = OUTPUT_DIR / f"hook_pill_{output_filename}.png"
                MotionGraphicsEngine.render_hook_pill_png(
                    text=hook_text[:36].upper(),
                    out_path=hook_png_path,
                    accent_hex="#D9FF00",
                    theme_id="oled_volt",
                    icon="sparkle",
                    font_size=max(26, int(w * 0.034)),
                )
                cmd.extend(["-i", str(hook_png_path)])
                hk_idx = next_in_idx
                next_in_idx += 1
                target_y = int(h * 0.13)
                filter_parts.append(
                    f"[{last_v}][{hk_idx}:v]overlay=x=(W-w)/2:y='min({target_y},-140+1500*max(0,t-0.1))':enable='between(t,0.1,3.0)'[vhook]"
                )
                last_v = "vhook"
            except Exception:
                safe_hook = hook_text.replace("'", "").replace(":", " -").replace("%", "pct")[:38].upper()
                h_font = int(w * 0.048)
                filter_parts.append(
                    f"[{last_v}]drawtext=text='{safe_hook}':fontcolor=0xD9FF00:fontsize={h_font}:borderw=4:bordercolor=black:"
                    f"box=1:boxcolor=0x050507@0.85:boxborderw=18:x=(w-text_w)/2:y={int(h*0.16)}:enable='between(t,0.1,2.8)'[vhook]"
                )
                last_v = "vhook"

        # 8. Brand Watermark
        if watermark and watermark.strip():
            safe_wm = watermark.strip().replace("'", "").replace(":", "")[:28]
            wm_font = int(w * 0.032)
            filter_parts.append(
                f"[{last_v}]drawtext=text='{safe_wm}':fontcolor=white@0.65:fontsize={wm_font}:borderw=2:bordercolor=black@0.7:"
                f"x=(w-text_w)/2:y={int(h*0.045)}[vwm]"
            )
            last_v = "vwm"

        # 9. Burn Viral ASS Captions
        if caption_style != "none":
            sub_path_escaped = str(Path(subtitle_path).resolve()).replace("\\", "/").replace(":", "\\:")
            filter_parts.append(f"[{last_v}]subtitles='{sub_path_escaped}'[vsub]")
            last_v = "vsub"

        # 10. Optional 4K UHD Upscale Mastering Pass
        if render_quality == "4k_uhd":
            w4k, h4k = w * 2, h * 2
            filter_parts.append(f"[{last_v}]hqdn3d=1.2:1.2:4:4,scale={w4k}:{h4k}:flags=lanczos+accurate_rnd,cas=0.60,deband[vout]")
        else:
            filter_parts.append(f"[{last_v}]deband,cas=0.42[vout]")

        # 11. Broadcast Audio Mastering (Sidechain Ducking + Transition Whoosh SFX + -14 LUFS Loudnorm)
        audio_mix_labels = ["[voice_main]"]
        filter_parts.append(f"[{audio_idx}:a]aformat=sample_rates=44100:channel_layouts=stereo,asplit=2[voice_main][voice_sc]")

        # Background Music (Custom uploaded track OR built-in synthesized mood track)
        if bg_music and music_mood != "none":
            if custom_music_path and Path(custom_music_path).exists():
                music_file = Path(custom_music_path)
                cmd.extend(["-stream_loop", "-1", "-i", str(music_file)])
            else:
                music_file = OUTPUT_DIR / f"bgm_{output_filename}.mp3"
                AudioEngine.generate_music_track(music_mood, total_duration + 1.0, music_file)
                cmd.extend(["-i", str(music_file)])

            bgm_idx = next_in_idx
            next_in_idx += 1
            # True sidechain ducking: music automatically dips when narrator speaks!
            filter_parts.append(
                f"[{bgm_idx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.22[bgm_raw];"
                f"[bgm_raw][voice_sc]sidechaincompress=threshold=0.03:ratio=6:attack=25:release=260[bgm_ducked]"
            )
            audio_mix_labels.append("[bgm_ducked]")
        else:
            # Consume unused voice_sc cleanly
            filter_parts.append("[voice_sc]anullsink")

        # Synthesized Whoosh SFX at every scene transition!
        if sfx_whoosh and transition_times:
            whoosh_path = AudioEngine.generate_whoosh_sfx(MUSIC_DIR / "sfx_whoosh.mp3")
            for t_idx, t_sec in enumerate(transition_times[:5]):
                cmd.extend(["-i", str(whoosh_path)])
                w_idx = next_in_idx
                next_in_idx += 1
                delay_ms = max(0, int((t_sec - 0.15) * 1000))
                lbl = f"[sfx{t_idx}]"
                filter_parts.append(
                    f"[{w_idx}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay={delay_ms}|{delay_ms},volume=0.38{lbl}"
                )
                audio_mix_labels.append(lbl)

        if len(audio_mix_labels) > 1:
            filter_parts.append(
                f"{''.join(audio_mix_labels)}amix=inputs={len(audio_mix_labels)}:duration=first:normalize=0,"
                f"loudnorm=I=-14:TP=-1.5:LRA=11[aout]"
            )
        else:
            filter_parts.append("[voice_main]loudnorm=I=-14:TP=-1.5:LRA=11[aout]")

        filter_complex = ";".join(filter_parts)
        cmd.extend([
            "-filter_complex", filter_complex,
            "-map", "[vout]", "-map", "[aout]",
            "-c:v", "libx264", "-profile:v", "high", "-preset", "fast", "-crf", crf_val, "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", "-threads", "0",
            "-c:a", "aac", "-ar", "48000", "-b:a", "256k",
            "-t", str(total_duration),
            str(final_path)
        ])

        process = subprocess.run(cmd, capture_output=True, text=True)
        if hook_png_path:
            hook_png_path.unlink(missing_ok=True)
        if process.returncode != 0:
            print(f"FFmpeg Composer error: {process.stderr}")
            raise RuntimeError(f"FFmpeg failed: {process.stderr[-600:]}")

        return {
            "status": "completed",
            "video_path": str(final_path),
            "filename": output_filename,
            "duration": round(total_duration, 2),
            "aspect_ratio": aspect_ratio,
            "quality": render_quality
        }
