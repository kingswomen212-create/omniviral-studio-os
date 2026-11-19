import subprocess
from pathlib import Path
from typing import List, Dict
from app.core.config import OUTPUT_DIR, MUSIC_DIR

MUSIC_LIBRARY = [
    {"id": "dark_cinematic", "name": "Dark Cinematic Pulse", "mood": "Tension & Psychology", "bpm": 85},
    {"id": "lofi_chill", "name": "LoFi Study Warmth", "mood": "Explainers & Calm", "bpm": 78},
    {"id": "epic_hans", "name": "Epic Brass Drone", "mood": "Stoicism & Documentary", "bpm": 70},
    {"id": "cyberpunk_synth", "name": "Cyberpunk Synthwave", "mood": "Sci-Fi & Tech", "bpm": 110},
    {"id": "true_crime_suspense", "name": "Midnight Suspense", "mood": "True Crime & Horror", "bpm": 68},
    {"id": "motivational_rise", "name": "Uplifting Horizon", "mood": "Motivation & Wealth", "bpm": 96},
    {"id": "none", "name": "No Background Music", "mood": "Voice Only", "bpm": 0}
]

# Rich harmonic + rhythmic FFmpeg aevalsrc synthesis formulas (100% royalty-free, zero external dependencies)
SYNTH_FORMULAS = {
    "dark_cinematic": (
        "0.28*sin(2*PI*55*t)*(0.7+0.3*sin(2*PI*0.5*t))+"
        "0.20*sin(2*PI*110*t)+0.16*sin(2*PI*130.81*t)+0.14*sin(2*PI*164.81*t)*"
        "(0.6+0.4*sin(2*PI*1.4*t))"
    ),
    "lofi_chill": (
        "0.24*sin(2*PI*174.61*t)+0.20*sin(2*PI*220*t)+0.18*sin(2*PI*261.63*t)+"
        "0.14*sin(2*PI*329.63*t)*(0.75+0.25*sin(2*PI*0.65*t))"
    ),
    "epic_hans": (
        "0.36*sin(2*PI*73.42*t)*(0.8+0.2*sin(2*PI*0.25*t))+"
        "0.24*sin(2*PI*146.83*t)+0.18*sin(2*PI*220*t)+0.12*sin(2*PI*293.66*t)"
    ),
    "cyberpunk_synth": (
        "0.28*sin(2*PI*82.41*t)*(0.5+0.5*sin(2*PI*3.6*t))+"
        "0.18*sin(2*PI*164.81*t)+0.14*sin(2*PI*246.94*t)*(0.5+0.5*cos(2*PI*1.8*t))"
    ),
    "true_crime_suspense": (
        "0.30*sin(2*PI*65.41*t)+0.20*sin(2*PI*69.30*t)*(0.4+0.6*sin(2*PI*0.35*t))+"
        "0.15*sin(2*PI*130.81*t)"
    ),
    "motivational_rise": (
        "0.24*sin(2*PI*130.81*t)+0.22*sin(2*PI*196.00*t)+0.20*sin(2*PI*246.94*t)+"
        "0.16*sin(2*PI*329.63*t)*(0.7+0.3*sin(2*PI*0.8*t))"
    )
}

class AudioEngine:
    @staticmethod
    def list_music() -> List[Dict]:
        return MUSIC_LIBRARY

    @staticmethod
    def generate_music_track(mood: str, duration: float, target_path: Path) -> Path:
        """
        Synthesizes a warm, filtered, royalty-free stereo musical bed of exact duration.
        """
        formula = SYNTH_FORMULAS.get(mood, SYNTH_FORMULAS["dark_cinematic"])
        fade_out_start = max(0.5, duration - 1.5)
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", f"aevalsrc={formula}:s=44100:d={duration:.2f}",
            "-af", f"lowpass=f=680,highpass=f=45,aecho=0.8:0.88:120:0.35,afade=t=in:st=0:d=1.2,afade=t=out:st={fade_out_start:.2f}:d=1.4",
            "-c:a", "libmp3lame", "-b:a", "192k",
            str(target_path)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return target_path

    @staticmethod
    def generate_music_preview(mood: str) -> str:
        out_path = MUSIC_DIR / f"preview_{mood}.mp3"
        if not out_path.exists():
            AudioEngine.generate_music_track(mood, 8.0, out_path)
        return str(out_path)

    @staticmethod
    def generate_whoosh_sfx(target_path: Path) -> Path:
        """
        Synthesizes a crisp cinematic transition 'Whoosh' SFX (0.45s filtered pink-noise swell).
        """
        if target_path.exists():
            return target_path
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "anoisesrc=color=pink:duration=0.45:sample_rate=44100",
            "-af", "bandpass=f=650:width_type=h:w=550,afade=t=in:st=0:d=0.18,afade=t=out:st=0.22:d=0.23,volume=0.55",
            "-c:a", "libmp3lame",
            str(target_path)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return target_path
