import re
import edge_tts
from typing import Dict, Any, List, Optional
from app.core.config import OUTPUT_DIR, settings

VOICE_CATALOG = [
    {
        "id": "en-US-ChristopherNeural",
        "name": "Christopher (Deep Viral Authority)",
        "gender": "Male",
        "locale": "en-US",
        "description": "Deep, confident, commanding documentary narrator. #1 for Dark Psychology & Stoicism."
    },
    {
        "id": "en-US-GuyNeural",
        "name": "Guy (Dynamic Storyteller)",
        "gender": "Male",
        "locale": "en-US",
        "description": "Energetic, engaging, great for facts and viral stories."
    },
    {
        "id": "en-US-EricNeural",
        "name": "Eric (Intense & Mysterious)",
        "gender": "Male",
        "locale": "en-US",
        "description": "Dramatic, serious, ideal for True Crime and Sci-Fi."
    },
    {
        "id": "en-US-AriaNeural",
        "name": "Aria (Clear & Articulate)",
        "gender": "Female",
        "locale": "en-US",
        "description": "Modern, crisp, great for Wealth and Tech secrets."
    },
    {
        "id": "en-US-AvaNeural",
        "name": "Ava (Warm & Natural)",
        "gender": "Female",
        "locale": "en-US",
        "description": "Warm, authentic, podcast and lifestyle feel."
    },
    {
        "id": "en-GB-RyanNeural",
        "name": "Ryan (British Intellect)",
        "gender": "Male",
        "locale": "en-GB",
        "description": "Sophisticated, historical and anime/mythology lore."
    }
]

_ALL_VOICES_CACHE: Optional[List[Dict[str, str]]] = None

class VoiceService:
    @staticmethod
    def list_voices() -> List[Dict[str, str]]:
        return VOICE_CATALOG

    @staticmethod
    async def list_all_voices(locale_filter: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Fetches 300+ free neural voices across 70+ languages from Microsoft Edge-TTS.
        """
        global _ALL_VOICES_CACHE
        if _ALL_VOICES_CACHE is None:
            try:
                raw_voices = await edge_tts.list_voices()
                _ALL_VOICES_CACHE = [
                    {
                        "id": v["ShortName"],
                        "name": f"{v['FriendlyName'].replace('Microsoft ', '').replace(' Online (Natural)', '')}",
                        "gender": v["Gender"],
                        "locale": v["Locale"],
                        "description": f"{v['Locale']} Neural Voice"
                    }
                    for v in raw_voices
                ]
            except Exception as e:
                print(f"Could not fetch full voice list: {e}")
                _ALL_VOICES_CACHE = VOICE_CATALOG

        voices = _ALL_VOICES_CACHE
        if locale_filter:
            lf = locale_filter.lower()
            voices = [v for v in voices if lf in v["locale"].lower() or lf in v["name"].lower()]
        return voices

    @staticmethod
    async def synthesize_preview(voice_id: str, text: str = "This is how your viral faceless video will sound.") -> str:
        safe_id = re.sub(r'[^a-zA-Z0-9_-]', '_', voice_id)
        out_path = OUTPUT_DIR / f"preview_{safe_id}.mp3"
        if not out_path.exists():
            communicate = edge_tts.Communicate(text=text, voice=voice_id)
            await communicate.save(str(out_path))
        return str(out_path)

    @staticmethod
    async def synthesize_speech(
        text: str,
        voice_id: Optional[str] = None,
        output_filename: str = "voiceover.mp3",
        rate: str = "+5%"
    ) -> Dict[str, Any]:
        """
        Synthesizes speech using Edge-TTS (100% free, natural neural voices)
        with configurable pacing rate (e.g. +10% for high-retention Shorts)
        and extracts word-level timing boundaries for animated viral subtitles.
        """
        voice = voice_id or settings.DEFAULT_VOICE
        out_path = OUTPUT_DIR / output_filename

        communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate)

        word_boundaries = []
        audio_bytes = bytearray()

        async for chunk in communicate.stream():
            chunk_type = chunk.get("type")
            if chunk_type == "audio":
                audio_bytes.extend(chunk["data"])
            elif chunk_type in ("WordBoundary", "SentenceBoundary"):
                offset_sec = chunk["offset"] / 10_000_000.0
                duration_sec = chunk["duration"] / 10_000_000.0
                text_content = chunk.get("text", "").strip()

                if chunk_type == "WordBoundary":
                    word_boundaries.append({
                        "text": text_content,
                        "start": round(offset_sec, 3),
                        "end": round(offset_sec + duration_sec, 3),
                        "duration": round(duration_sec, 3)
                    })
                elif chunk_type == "SentenceBoundary" and text_content:
                    words = [w for w in re.split(r'\s+', text_content) if w]
                    if words:
                        per_word_dur = duration_sec / len(words)
                        current_t = offset_sec
                        for w in words:
                            word_boundaries.append({
                                "text": w,
                                "start": round(current_t, 3),
                                "end": round(current_t + per_word_dur, 3),
                                "duration": round(per_word_dur, 3)
                            })
                            current_t += per_word_dur

        with open(out_path, "wb") as f:
            f.write(audio_bytes)

        total_duration = word_boundaries[-1]["end"] if word_boundaries else 0.0

        return {
            "audio_path": str(out_path),
            "filename": output_filename,
            "duration": total_duration,
            "word_boundaries": word_boundaries,
            "voice": voice
        }
