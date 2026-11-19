from pathlib import Path
from typing import List, Dict, Any

# ASS colors are &HAABBGGRR (BGR order)
STYLE_CONFIGS = {
    "volt": {"highlight": "&H0000FFD9&", "primary": "&H00FFFFFF&", "font": "Impact", "size": 122},      # Higgsfield Acid Lime #D9FF00
    "hormozi": {"highlight": "&H0000E6FF&", "primary": "&H00FFFFFF&", "font": "Impact", "size": 122},   # Hormozi Gold #FFE600
    "cyan": {"highlight": "&H00FFF000&", "primary": "&H00FFFFFF&", "font": "Impact", "size": 118},      # Neon Cyan #00F0FF
    "crimson": {"highlight": "&H00542EFF&", "primary": "&H00FFFFFF&", "font": "Arial Black", "size": 114}, # Crimson Red #FF2E54
    "minimal": {"highlight": "&H00FFFFFF&", "primary": "&H00D4D4D8&", "font": "Arial", "size": 92}
}

class SubtitleService:
    @staticmethod
    def _smart_group_words(word_boundaries: List[Dict[str, Any]], max_words: int = 3, max_chars: int = 18) -> List[List[Dict[str, Any]]]:
        """
        Groups words into punchy viral phrases (never stranding tiny words like 'IS A' alone).
        """
        chunks: List[List[Dict[str, Any]]] = []
        current: List[Dict[str, Any]] = []
        current_chars = 0

        for w in word_boundaries:
            w_len = len(w["text"])
            if current and (len(current) >= max_words or (current_chars + w_len + 1 > max_chars and len(current) >= 2)):
                chunks.append(current)
                current = [w]
                current_chars = w_len
            else:
                current.append(w)
                current_chars += w_len + 1
                # Break cleanly on sentence-ending punctuation
                if w["text"].endswith((".", "!", "?")):
                    chunks.append(current)
                    current = []
                    current_chars = 0

        if current:
            chunks.append(current)
        return chunks

    @staticmethod
    def generate_ass_subtitles(
        word_boundaries: List[Dict[str, Any]],
        output_path: Path,
        style: str = "volt",
        aspect_ratio: str = "9:16"
    ) -> str:
        """
        Creates bold, high-retention viral ASS subtitles with word-by-word pop highlights.
        """
        cfg = STYLE_CONFIGS.get(style, STYLE_CONFIGS["volt"])
        highlight_color = cfg["highlight"]
        primary_color = cfg["primary"]

        if aspect_ratio == "16:9":
            res_x, res_y, margin_v, font_size = 1920, 1080, 110, int(cfg["size"] * 0.78)
        elif aspect_ratio == "1:1":
            res_x, res_y, margin_v, font_size = 1080, 1080, 160, int(cfg["size"] * 0.85)
        else:
            res_x, res_y, margin_v, font_size = 1080, 1920, 520, cfg["size"]

        ass_header = f"""[Script Info]
Title: Viral Cinema Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: {res_x}
PlayResY: {res_y}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{cfg['font']},{font_size},{primary_color},&H000000FF&,&H00000000&,&H96000000&,-1,0,0,0,100,100,2,0,1,11,6,2,60,60,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        events = []
        if style != "none":
            chunks = SubtitleService._smart_group_words(word_boundaries)
            for chunk in chunks:
                for active_idx, word in enumerate(chunk):
                    start_str = SubtitleService._format_timestamp(word["start"])
                    end_str = SubtitleService._format_timestamp(word["end"])

                    display_parts = []
                    for idx, w in enumerate(chunk):
                        w_text = w["text"].upper()
                        if idx == active_idx:
                            display_parts.append(f"{{\\c{highlight_color}\\fscx116\\fscy116}}{w_text}{{\\r}}")
                        else:
                            display_parts.append(f"{{\\c{primary_color}\\fscx100\\fscy100}}{w_text}{{\\r}}")

                    line_text = " ".join(display_parts)
                    events.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{line_text}")

        full_content = ass_header + "\n".join(events) + "\n"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(full_content)

        return str(output_path)

    @staticmethod
    def _format_timestamp(seconds: float) -> str:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        centisecs = int(round((seconds - int(seconds)) * 100))
        if centisecs >= 100:
            centisecs = 99
        return f"{hours}:{minutes:02d}:{secs:02d}.{centisecs:02d}"
