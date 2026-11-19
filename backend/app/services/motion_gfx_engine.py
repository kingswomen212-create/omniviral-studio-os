import io
import math
import os
import subprocess
import urllib.parse
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from app.core.config import MUSIC_DIR, OUTPUT_DIR

# ==================== FONTS & COLOR HELPERS ====================

_FONT_CANDIDATES_BOLD = [
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\bahnschrift.ttf",
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\calibrib.ttf",
]
_FONT_CANDIDATES_SEMI = [
    r"C:\Windows\Fonts\seguisb.ttf",
    r"C:\Windows\Fonts\segoeui.ttf",
    r"C:\Windows\Fonts\arial.ttf",
]


def _load_font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    candidates = _FONT_CANDIDATES_BOLD if bold else _FONT_CANDIDATES_SEMI
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, max(10, int(size)))
            except Exception:
                pass
    return ImageFont.load_default()


def hex_to_rgb(hex_color: str, default: Tuple[int, int, int] = (26, 115, 232)) -> Tuple[int, int, int]:
    try:
        c = hex_color.strip().lstrip("#")
        if len(c) == 3:
            c = "".join(ch * 2 for ch in c)
        return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16))
    except Exception:
        return default


def hex_to_rgba(hex_color: str, alpha: int = 255) -> Tuple[int, int, int, int]:
    r, g, b = hex_to_rgb(hex_color)
    return (r, g, b, alpha)


def contrast_text_rgb(bg_rgb: Tuple[int, int, int]) -> Tuple[int, int, int]:
    lum = 0.299 * bg_rgb[0] + 0.587 * bg_rgb[1] + 0.114 * bg_rgb[2]
    return (15, 17, 23) if lum > 158 else (255, 255, 255)


# ==================== SPRING & EASING CURVES ====================

def clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else (1.0 if x > 1.0 else x)


def ease_out_cubic(t: float) -> float:
    t = clamp01(t)
    return 1.0 - (1.0 - t) ** 3


def ease_out_back(t: float, overshoot: float = 1.65) -> float:
    t = clamp01(t)
    c3 = overshoot + 1.0
    return 1.0 + c3 * ((t - 1.0) ** 3) + overshoot * ((t - 1.0) ** 2)


def ease_in_out_cubic(t: float) -> float:
    t = clamp01(t)
    return 4 * t * t * t if t < 0.5 else 1 - ((-2 * t + 2) ** 3) / 2


# ==================== STUDIO THEMES ====================

STUDIO_THEMES: Dict[str, Dict[str, Any]] = {
    "studio_white": {
        "name": "Studio White (Google / Apple Commercial)",
        "bg": (255, 255, 255),
        "bg_alt": (246, 248, 252),
        "surface": (255, 255, 255),
        "surface_border": (228, 232, 240, 255),
        "ink": (18, 20, 26),
        "muted": (95, 102, 118),
        "shadow_alpha": 46,
        "default_accent": "#2563EB",
        "map_bg": (236, 240, 246),
        "map_park": (197, 235, 204),
        "map_water": (203, 224, 252),
        "map_road": (255, 255, 255),
    },
    "oled_volt": {
        "name": "OLED Cinema Dark & Electric Volt",
        "bg": (7, 8, 12),
        "bg_alt": (15, 17, 25),
        "surface": (22, 25, 36),
        "surface_border": (55, 62, 82, 255),
        "ink": (246, 247, 251),
        "muted": (156, 163, 184),
        "shadow_alpha": 120,
        "default_accent": "#D9FF00",
        "map_bg": (26, 30, 44),
        "map_park": (28, 66, 52),
        "map_water": (24, 48, 86),
        "map_road": (48, 55, 76),
    },
    "midnight_cobalt": {
        "name": "Midnight Glass & Electric Cobalt",
        "bg": (10, 16, 34),
        "bg_alt": (16, 24, 48),
        "surface": (23, 33, 62),
        "surface_border": (64, 92, 148, 255),
        "ink": (244, 248, 255),
        "muted": (152, 172, 208),
        "shadow_alpha": 130,
        "default_accent": "#38BDF8",
        "map_bg": (20, 32, 62),
        "map_park": (22, 74, 72),
        "map_water": (18, 56, 112),
        "map_road": (46, 66, 108),
    },
    "warm_editorial": {
        "name": "Warm Luxury Editorial Cream",
        "bg": (250, 247, 242),
        "bg_alt": (242, 236, 226),
        "surface": (255, 255, 255),
        "surface_border": (228, 220, 208, 255),
        "ink": (26, 23, 20),
        "muted": (110, 102, 92),
        "shadow_alpha": 42,
        "default_accent": "#EA580C",
        "map_bg": (242, 236, 226),
        "map_park": (206, 230, 198),
        "map_water": (198, 222, 244),
        "map_road": (255, 253, 249),
    },
}


# ==================== SUPERSAMPLED VECTOR SPRITE BUILDERS ====================

def add_soft_shadow(
    sprite: Image.Image,
    offset: Tuple[int, int] = (0, 14),
    blur_radius: int = 22,
    shadow_alpha: int = 50,
    pad: int = 44,
) -> Image.Image:
    """Wraps an RGBA sprite with a smooth, studio-grade Gaussian drop shadow."""
    sw, sh = sprite.size
    out = Image.new("RGBA", (sw + pad * 2, sh + pad * 2), (0, 0, 0, 0))
    alpha = sprite.getchannel("A")
    shadow_mask = alpha.point(lambda p: int(p * (shadow_alpha / 255.0)))
    shadow_layer = Image.new("RGBA", (sw + pad * 2, sh + pad * 2), (0, 0, 0, 0))
    shadow_color = Image.new("RGBA", (sw, sh), (10, 14, 24, 255))
    shadow_color.putalpha(shadow_mask)
    shadow_layer.paste(shadow_color, (pad + offset[0], pad + offset[1]))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    out.alpha_composite(shadow_layer)
    out.alpha_composite(sprite, (pad, pad))
    return out


def _draw_vector_icon(
    draw: ImageDraw.ImageDraw,
    icon: str,
    cx: float,
    cy: float,
    size: float,
    color: Tuple[int, int, int, int],
):
    """Draws crisp anti-aliased micro-icons inside floating pill badges."""
    r = size * 0.45
    if icon == "tag":
        # Price tag polygon + hole
        pts = [
            (cx - r, cy - r * 0.2),
            (cx - r * 0.15, cy - r),
            (cx + r, cy + r * 0.15),
            (cx + r * 0.15, cy + r),
            (cx - r, cy - r * 0.2),
        ]
        draw.line(pts, fill=color, width=max(2, int(size * 0.12)), joint="curve")
        draw.ellipse(
            [cx - r * 0.45, cy - r * 0.45, cx - r * 0.1, cy - r * 0.1],
            fill=color,
        )
    elif icon == "truck":
        # Minimal delivery truck outline
        draw.rounded_rectangle(
            [cx - r, cy - r * 0.55, cx + r * 0.25, cy + r * 0.35],
            radius=max(2, int(size * 0.1)),
            outline=color,
            width=max(2, int(size * 0.11)),
        )
        draw.rounded_rectangle(
            [cx + r * 0.2, cy - r * 0.22, cx + r * 0.95, cy + r * 0.35],
            radius=max(2, int(size * 0.08)),
            outline=color,
            width=max(2, int(size * 0.11)),
        )
        wr = r * 0.22
        draw.ellipse([cx - r * 0.65 - wr, cy + r * 0.35 - wr, cx - r * 0.65 + wr, cy + r * 0.35 + wr], fill=color)
        draw.ellipse([cx + r * 0.55 - wr, cy + r * 0.35 - wr, cx + r * 0.55 + wr, cy + r * 0.35 + wr], fill=color)
    elif icon == "sparkle":
        pts = []
        for i in range(8):
            ang = i * (math.pi / 4.0) - math.pi / 2.0
            rad = r if i % 2 == 0 else r * 0.28
            pts.append((cx + math.cos(ang) * rad, cy + math.sin(ang) * rad))
        draw.polygon(pts, fill=color)
    elif icon == "check":
        draw.line(
            [(cx - r * 0.6, cy + r * 0.05), (cx - r * 0.1, cy + r * 0.55), (cx + r * 0.75, cy - r * 0.55)],
            fill=color,
            width=max(2, int(size * 0.15)),
            joint="curve",
        )
    elif icon == "search":
        draw.ellipse(
            [cx - r * 0.7, cy - r * 0.7, cx + r * 0.35, cy + r * 0.35],
            outline=color,
            width=max(2, int(size * 0.13)),
        )
        draw.line(
            [(cx + r * 0.2, cy + r * 0.2), (cx + r * 0.85, cy + r * 0.85)],
            fill=color,
            width=max(2, int(size * 0.14)),
        )
    elif icon == "stars":
        # 5 gold rating stars drawn cleanly side by side
        gold = (245, 176, 15, 255)
        sr = size * 0.36
        spacing = size * 0.84
        start_x = cx - spacing * 2
        for k in range(5):
            sx = start_x + k * spacing
            pts = []
            for j in range(10):
                ang = j * (math.pi / 5.0) - math.pi / 2.0
                rad = sr if j % 2 == 0 else sr * 0.44
                pts.append((sx + math.cos(ang) * rad, cy + math.sin(ang) * rad))
            draw.polygon(pts, fill=gold)


def render_pill_badge_sprite(
    text: str,
    accent_rgb: Tuple[int, int, int],
    theme: Dict[str, Any],
    filled: bool = False,
    icon: Optional[str] = None,
    font_size: int = 34,
    pad_x: int = 34,
    pad_y: int = 18,
) -> Image.Image:
    """
    Renders a 2x-supersampled floating Studio Pill Badge (Google Ads mn7It1KAU80 style)
    with crisp rounded corners, optional vector icon / 5-stars, and soft Gaussian drop shadow.
    """
    scale = 2
    font = _load_font(font_size * scale, bold=True)
    dummy = Image.new("RGBA", (10, 10))
    dd = ImageDraw.Draw(dummy)

    is_stars_only = (icon == "stars" and not text.strip())
    if is_stars_only:
        tw, th = int(font_size * scale * 4.4), int(font_size * scale * 1.15)
    else:
        bbox = dd.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]

    icon_gap = int(font_size * scale * 1.15) if (icon and not is_stars_only) else 0
    w = tw + icon_gap + pad_x * 2 * scale
    h = max(th + pad_y * 2 * scale, int(font_size * scale * 2.0))

    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)

    if filled:
        bg_col = (*accent_rgb, 255)
        fg_rgb = contrast_text_rgb(accent_rgb)
        fg_col = (*fg_rgb, 255)
        border_col = None
    else:
        bg_col = (*theme["surface"], 255)
        fg_col = (*accent_rgb, 255) if icon in ("tag", "truck", "sparkle") else (*theme["ink"], 255)
        border_col = theme["surface_border"]

    d.rounded_rectangle(
        [0, 0, w - 1, h - 1],
        radius=h // 2,
        fill=bg_col,
        outline=border_col,
        width=2 if border_col else 0,
    )

    if is_stars_only:
        _draw_vector_icon(d, "stars", w / 2.0, h / 2.0, font_size * scale * 0.9, fg_col)
    else:
        cur_x = pad_x * scale
        if icon:
            _draw_vector_icon(d, icon, cur_x + font_size * scale * 0.42, h / 2.0, font_size * scale * 0.92, fg_col)
            cur_x += icon_gap
        bbox = d.textbbox((0, 0), text, font=font)
        tx = cur_x - bbox[0]
        ty = (h - (bbox[3] - bbox[1])) / 2.0 - bbox[1]
        d.text((tx, ty), text, font=font, fill=fg_col)

    down = card.resize((w // scale, h // scale), Image.Resampling.LANCZOS)
    return add_soft_shadow(
        down,
        offset=(0, 12),
        blur_radius=18,
        shadow_alpha=theme["shadow_alpha"] + (14 if filled else 4),
        pad=32,
    )


def render_3d_studio_gift_box(size: int = 440, box_hex: str = "#1E7D45", ribbon_hex: str = "#D92626") -> Image.Image:
    """
    Renders a crisp, studio-lit 3D isometric gift box with satin ribbon and double bow
    (directly inspired by mn7It1KAU80's floating floating-shadow hero!).
    """
    s = size * 2
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    br, bg, bb = hex_to_rgb(box_hex, (30, 125, 69))
    rr, rg, rb = hex_to_rgb(ribbon_hex, (217, 38, 38))

    left_col = (max(0, br - 18), max(0, bg - 18), max(0, bb - 18), 255)
    right_col = (min(255, br + 18), min(255, bg + 18), min(255, bb + 18), 255)
    lid_left = (max(0, br - 6), max(0, bg - 6), max(0, bb - 6), 255)
    lid_right = (min(255, br + 30), min(255, bg + 30), min(255, bb + 30), 255)
    top_col = (min(255, br + 42), min(255, bg + 42), min(255, bb + 42), 255)

    rib_dark = (max(0, rr - 34), max(0, rg - 20), max(0, rb - 20), 255)
    rib_mid = (rr, rg, rb, 255)
    rib_hi = (min(255, rr + 48), min(255, rg + 34), min(255, rb + 34), 255)

    cx = s * 0.5
    top_y = s * 0.34
    bot_y = s * 0.78
    lid_h = s * 0.105
    w_half = s * 0.36
    depth_y = s * 0.055

    # Body left face
    d.polygon([
        (cx - w_half * 0.94, top_y + lid_h),
        (cx, top_y + lid_h + depth_y),
        (cx, bot_y + depth_y),
        (cx - w_half * 0.94, bot_y),
    ], fill=left_col)
    # Body right face
    d.polygon([
        (cx, top_y + lid_h + depth_y),
        (cx + w_half * 0.94, top_y + lid_h),
        (cx + w_half * 0.94, bot_y),
        (cx, bot_y + depth_y),
    ], fill=right_col)

    # Subtle ambient occlusion stripe right beneath the lid overhang
    d.polygon([
        (cx - w_half * 0.94, top_y + lid_h),
        (cx, top_y + lid_h + depth_y),
        (cx + w_half * 0.94, top_y + lid_h),
        (cx + w_half * 0.94, top_y + lid_h + 18),
        (cx, top_y + lid_h + depth_y + 20),
        (cx - w_half * 0.94, top_y + lid_h + 18),
    ], fill=(0, 0, 0, 48))

    # Vertical Ribbons on body
    rw = s * 0.072
    lx = cx - w_half * 0.48
    rx = cx + w_half * 0.48
    d.polygon([
        (lx - rw / 2, top_y + lid_h + depth_y * 0.44),
        (lx + rw / 2, top_y + lid_h + depth_y * 0.56),
        (lx + rw / 2, bot_y + depth_y * 0.56),
        (lx - rw / 2, bot_y + depth_y * 0.44),
    ], fill=rib_dark)
    d.polygon([
        (rx - rw / 2, top_y + lid_h + depth_y * 0.56),
        (rx + rw / 2, top_y + lid_h + depth_y * 0.44),
        (rx + rw / 2, bot_y + depth_y * 0.44),
        (rx - rw / 2, bot_y + depth_y * 0.56),
    ], fill=rib_mid)

    # Lid Top Diamond
    d.polygon([
        (cx, top_y - depth_y),
        (cx + w_half, top_y),
        (cx, top_y + depth_y),
        (cx - w_half, top_y),
    ], fill=top_col)
    # Lid Left Front
    d.polygon([
        (cx - w_half, top_y),
        (cx, top_y + depth_y),
        (cx, top_y + lid_h + depth_y),
        (cx - w_half, top_y + lid_h),
    ], fill=lid_left)
    # Lid Right Front
    d.polygon([
        (cx, top_y + depth_y),
        (cx + w_half, top_y),
        (cx + w_half, top_y + lid_h),
        (cx, top_y + lid_h + depth_y),
    ], fill=lid_right)

    # Ribbons wrapping lid
    d.polygon([
        (lx - rw / 2, top_y + depth_y * 0.45),
        (lx + rw / 2, top_y + depth_y * 0.57),
        (lx + rw / 2, top_y + lid_h + depth_y * 0.57),
        (lx - rw / 2, top_y + lid_h + depth_y * 0.45),
    ], fill=rib_mid)
    d.polygon([
        (rx - rw / 2, top_y + depth_y * 0.57),
        (rx + rw / 2, top_y + depth_y * 0.45),
        (rx + rw / 2, top_y + lid_h + depth_y * 0.45),
        (rx - rw / 2, top_y + lid_h + depth_y * 0.57),
    ], fill=rib_hi)

    # Satin Bow Loops on Top
    bow_y = top_y - s * 0.015
    d.ellipse([cx - s * 0.19, bow_y - s * 0.13, cx + s * 0.01, bow_y + s * 0.025], fill=rib_dark, outline=rib_hi, width=10)
    d.ellipse([cx - s * 0.01, bow_y - s * 0.13, cx + s * 0.19, bow_y + s * 0.025], fill=rib_mid, outline=rib_hi, width=10)
    # Inner bow shadows
    d.ellipse([cx - s * 0.13, bow_y - s * 0.085, cx - s * 0.03, bow_y - s * 0.015], fill=(95, 12, 16, 200))
    d.ellipse([cx + s * 0.03, bow_y - s * 0.085, cx + s * 0.13, bow_y - s * 0.015], fill=(95, 12, 16, 200))
    # Center knot
    d.rounded_rectangle([cx - s * 0.042, bow_y - s * 0.045, cx + s * 0.042, bow_y + s * 0.03], radius=22, fill=rib_hi)

    return img.resize((size, size), Image.Resampling.LANCZOS)


def render_circular_avatar_sprite(
    photo: Optional[Image.Image],
    diameter: int,
    accent_rgb: Tuple[int, int, int],
    theme: Dict[str, Any],
) -> Image.Image:
    """Renders a crisp circular portrait cutout with white ring & soft elevation shadow."""
    s = diameter * 2
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    if photo is not None:
        pw, ph = photo.size
        side = min(pw, ph)
        crop = photo.crop(((pw - side) // 2, (ph - side) // 2, (pw + side) // 2, (ph + side) // 2))
        crop = crop.resize((s - 16, s - 16), Image.Resampling.LANCZOS).convert("RGBA")
        mask = Image.new("L", (s - 16, s - 16), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, s - 17, s - 17], fill=255)
        d = ImageDraw.Draw(img)
        d.ellipse([0, 0, s - 1, s - 1], fill=(255, 255, 255, 255))
        img.paste(crop, (8, 8), mask)
    else:
        # Clean stylized geometric portrait fallback
        d = ImageDraw.Draw(img)
        d.ellipse([0, 0, s - 1, s - 1], fill=(255, 255, 255, 255))
        d.ellipse([10, 10, s - 11, s - 11], fill=(*accent_rgb, 255))
        d.ellipse([s * 0.34, s * 0.24, s * 0.66, s * 0.56], fill=(255, 255, 255, 235))
        d.pieslice([s * 0.16, s * 0.56, s * 0.84, s * 1.15], 180, 360, fill=(255, 255, 255, 235))

    down = img.resize((diameter, diameter), Image.Resampling.LANCZOS)
    return add_soft_shadow(down, offset=(0, 14), blur_radius=20, shadow_alpha=theme["shadow_alpha"] + 16, pad=36)


def render_floating_channel_node(
    label_kind: str,
    diameter: int,
    theme: Dict[str, Any],
) -> Image.Image:
    """Renders circular floating platform/channel badges (Search G, Video Play, Map Pin, Sparkle)."""
    s = diameter * 2
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([0, 0, s - 1, s - 1], fill=(255, 255, 255, 255), outline=(230, 234, 242, 255), width=3)

    cx, cy = s / 2.0, s / 2.0
    if label_kind == "video":
        d.rounded_rectangle([cx - s * 0.26, cy - s * 0.18, cx + s * 0.26, cy + s * 0.18], radius=int(s * 0.08), fill=(239, 68, 68, 255))
        d.polygon([(cx - s * 0.07, cy - s * 0.09), (cx - s * 0.07, cy + s * 0.09), (cx + s * 0.11, cy)], fill=(255, 255, 255, 255))
    elif label_kind == "map":
        # Stylized multi-color teardrop map pin
        pr = s * 0.21
        d.ellipse([cx - pr, cy - pr * 1.25, cx + pr, cy + pr * 0.75], fill=(37, 99, 235, 255))
        d.polygon([(cx - pr * 0.82, cy + pr * 0.25), (cx + pr * 0.82, cy + pr * 0.25), (cx, cy + pr * 1.4)], fill=(34, 197, 94, 255))
        d.pieslice([cx - pr, cy - pr * 1.25, cx + pr, cy + pr * 0.75], 195, 345, fill=(234, 67, 53, 255))
        d.ellipse([cx - pr * 0.42, cy - pr * 0.67, cx + pr * 0.42, cy + pr * 0.17], fill=(255, 255, 255, 255))
    elif label_kind == "shop":
        d.rounded_rectangle([cx - s * 0.2, cy - s * 0.14, cx + s * 0.2, cy + s * 0.22], radius=int(s * 0.06), fill=(16, 185, 129, 255))
        d.arc([cx - s * 0.11, cy - s * 0.26, cx + s * 0.11, cy - s * 0.04], 180, 360, fill=(16, 185, 129, 255), width=max(4, s // 20))
    else:  # search / ai
        # 4-color ring + center sparkle
        r = s * 0.24
        w = max(6, int(s * 0.09))
        d.arc([cx - r, cy - r, cx + r, cy + r], 315, 45, fill=(66, 133, 244, 255), width=w)
        d.arc([cx - r, cy - r, cx + r, cy + r], 45, 145, fill=(52, 168, 83, 255), width=w)
        d.arc([cx - r, cy - r, cx + r, cy + r], 145, 225, fill=(251, 188, 5, 255), width=w)
        d.arc([cx - r, cy - r, cx + r, cy + r], 225, 315, fill=(234, 67, 53, 255), width=w)
        d.line([(cx, cy), (cx + r * 0.95, cy)], fill=(66, 133, 244, 255), width=w)

    down = img.resize((diameter, diameter), Image.Resampling.LANCZOS)
    return add_soft_shadow(down, offset=(0, 10), blur_radius=16, shadow_alpha=theme["shadow_alpha"] + 8, pad=28)


def render_product_card_sprite(
    photo: Optional[Image.Image],
    card_w: int,
    card_h: int,
    accent_rgb: Tuple[int, int, int],
    theme: Dict[str, Any],
    label: str = "",
) -> Image.Image:
    """Rounded studio product showcase card for horizontal sliding carousels."""
    s = 2
    w, h = card_w * s, card_h * s
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle(
        [0, 0, w - 1, h - 1],
        radius=36,
        fill=(*theme["surface"], 255),
        outline=theme["surface_border"],
        width=2,
    )

    if photo is not None:
        pw, ph = photo.size
        target_ratio = w / h
        if pw / ph > target_ratio:
            nw = int(ph * target_ratio)
            crop = photo.crop(((pw - nw) // 2, 0, (pw + nw) // 2, ph))
        else:
            nh = int(pw / target_ratio)
            crop = photo.crop((0, (ph - nh) // 2, pw, (ph + nh) // 2))
        crop = crop.resize((w - 16, h - 16), Image.Resampling.LANCZOS).convert("RGBA")
        mask = Image.new("L", (w - 16, h - 16), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 17, h - 17], radius=30, fill=255)
        card.paste(crop, (8, 8), mask)
    else:
        # Clean studio gradient graphic fallback
        d.rounded_rectangle([16, 16, w - 17, h - 17], radius=28, fill=(*theme["bg_alt"], 255))
        d.ellipse([w * 0.25, h * 0.2, w * 0.75, h * 0.7], fill=(*accent_rgb, 60))
        _draw_vector_icon(d, "sparkle", w * 0.5, h * 0.45, w * 0.34, (*accent_rgb, 255))

    if label:
        f = _load_font(22 * s, bold=True)
        d.rounded_rectangle([20, h - 72, w - 20, h - 18], radius=16, fill=(10, 12, 18, 195))
        d.text((36, h - 62), label[:18], font=f, fill=(255, 255, 255, 255))

    down = card.resize((card_w, card_h), Image.Resampling.LANCZOS)
    return add_soft_shadow(down, offset=(0, 14), blur_radius=20, shadow_alpha=theme["shadow_alpha"], pad=32)


def render_vector_map_card_sprite(
    card_w: int,
    card_h: int,
    search_text: str,
    shop_name: str,
    accent_rgb: Tuple[int, int, int],
    theme: Dict[str, Any],
) -> Image.Image:
    """
    Renders the crisp Google-Maps-style stylized UI card from kMi6Yb0e4t0
    (diagonal roads, green parks, blue river, search pill header, and local Ad card).
    """
    s = 2
    w, h = card_w * s, card_h * s
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)

    # Rounded outer card mask
    inner = Image.new("RGBA", (w, h), (*theme["map_bg"], 255))
    idraw = ImageDraw.Draw(inner)

    # Pastel Parks
    idraw.polygon([(0, h * 0.12), (w * 0.44, 0), (w * 0.62, h * 0.48), (w * 0.16, h * 0.62)], fill=(*theme["map_park"], 255))
    idraw.polygon([(w * 0.64, h * 0.42), (w, h * 0.32), (w, h * 0.68), (w * 0.72, h * 0.72)], fill=(*theme["map_park"], 255))
    # Waterway / River block
    idraw.polygon([(w * 0.62, 0), (w, 0), (w, h * 0.42), (w * 0.75, h * 0.46)], fill=(*theme["map_water"], 255))

    # Crisp diagonal vector roads
    road = (*theme["map_road"], 255)
    idraw.line([(0, h * 0.30), (w, h * 0.14)], fill=road, width=26)
    idraw.line([(0, h * 0.62), (w, h * 0.36)], fill=road, width=32)
    idraw.line([(w * 0.24, 0), (w * 0.56, h * 0.72)], fill=road, width=28)
    idraw.line([(w * 0.66, 0), (w * 0.86, h * 0.72)], fill=road, width=20)

    # Floating Search Bar Pill inside top of Map
    sb_pad = int(w * 0.06)
    sb_h = int(h * 0.115)
    sb_y = int(h * 0.055)
    idraw.rounded_rectangle(
        [sb_pad, sb_y, w - sb_pad, sb_y + sb_h],
        radius=sb_h // 2,
        fill=(*theme["surface"], 255),
        outline=theme["surface_border"],
        width=3,
    )
    _draw_vector_icon(idraw, "search", sb_pad + sb_h * 0.52, sb_y + sb_h * 0.5, sb_h * 0.52, (*theme["muted"], 255))
    sf = _load_font(int(sb_h * 0.44), bold=False)
    idraw.text((sb_pad + sb_h * 0.92, sb_y + sb_h * 0.22), search_text[:24], font=sf, fill=(*theme["ink"], 255))

    # Bottom Local Ad Result Card overlay
    ad_top = int(h * 0.64)
    idraw.rounded_rectangle(
        [0, ad_top, w, h],
        radius=36,
        fill=(*theme["surface"], 255),
    )
    title_f = _load_font(int(h * 0.044), bold=True)
    badge_f = _load_font(int(h * 0.03), bold=True)
    idraw.text((int(w * 0.075), ad_top + int(h * 0.05)), shop_name[:22], font=title_f, fill=(*accent_rgb, 255))
    # Green "Ad" micro badge + skeleton bars
    bx = int(w * 0.075)
    by = ad_top + int(h * 0.125)
    idraw.rounded_rectangle([bx, by, bx + 64, by + 38], radius=8, fill=(22, 163, 74, 255))
    idraw.text((bx + 12, by + 4), "Ad", font=badge_f, fill=(255, 255, 255, 255))
    idraw.rounded_rectangle([bx + 80, by + 10, int(w * 0.58), by + 28], radius=9, fill=(*theme["muted"], 95))
    idraw.rounded_rectangle([bx, by + 56, int(w * 0.66), by + 72], radius=8, fill=(*theme["muted"], 65))
    idraw.rounded_rectangle([bx, by + 88, int(w * 0.46), by + 104], radius=8, fill=(*accent_rgb, 170))

    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=44, fill=255)
    card.paste(inner, (0, 0), mask)
    ImageDraw.Draw(card).rounded_rectangle([0, 0, w - 1, h - 1], radius=44, outline=theme["surface_border"], width=3)

    down = card.resize((card_w, card_h), Image.Resampling.LANCZOS)
    return add_soft_shadow(down, offset=(0, 18), blur_radius=26, shadow_alpha=theme["shadow_alpha"] + 12, pad=40)


def draw_4point_sparkle(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    radius: float,
    color: Tuple[int, int, int, int],
    rotation: float = 0.0,
    hollow: bool = False,
):
    """Draws a razor-smooth concave 4-point Gemini/Google AI Sparkle star."""
    if radius < 2:
        return
    pts = []
    steps = 64
    cos_r, sin_r = math.cos(rotation), math.sin(rotation)
    for i in range(steps):
        th = (i / steps) * 2.0 * math.pi
        # Superellipse / astroid curve |x/r|^0.55 + |y/r|^0.55 = 1
        ct, st = math.cos(th), math.sin(th)
        px = (abs(ct) ** 2.6) * (1 if ct >= 0 else -1) * radius
        py = (abs(st) ** 2.6) * (1 if st >= 0 else -1) * radius
        rx = cx + px * cos_r - py * sin_r
        ry = cy + px * sin_r + py * cos_r
        pts.append((rx, ry))
    if hollow:
        draw.polygon(pts, outline=color)
        # Thicken outline by drawing inner/outer stroke
        for dr in (-2, -1, 1, 2):
            pts2 = []
            rr = max(2.0, radius + dr)
            for i in range(steps):
                th = (i / steps) * 2.0 * math.pi
                ct, st = math.cos(th), math.sin(th)
                px = (abs(ct) ** 2.6) * (1 if ct >= 0 else -1) * rr
                py = (abs(st) ** 2.6) * (1 if st >= 0 else -1) * rr
                pts2.append((cx + px * cos_r - py * sin_r, cy + px * sin_r + py * cos_r))
            draw.polygon(pts2, outline=color)
    else:
        draw.polygon(pts, fill=color)


def draw_pointer_cursor(draw: ImageDraw.ImageDraw, x: float, y: float, scale: float = 1.0):
    """Draws a clean modern OS pointer cursor with dark outline + crisp white fill."""
    base_pts = [
        (0, 0),
        (0, 44),
        (11, 34),
        (20, 50),
        (27, 46),
        (18, 30),
        (33, 30),
    ]
    pts = [(x + px * scale, y + py * scale) for px, py in base_pts]
    # Subtle drop shadow
    s_pts = [(px + 3, py + 5) for px, py in pts]
    draw.polygon(s_pts, fill=(0, 0, 0, 70))
    draw.polygon(pts, fill=(255, 255, 255, 255), outline=(18, 20, 26, 255))
    draw.line(pts + [pts[0]], fill=(18, 20, 26, 255), width=max(2, int(2.6 * scale)), joint="curve")


def paste_scaled_centered(
    canvas: Image.Image,
    sprite: Image.Image,
    cx: float,
    cy: float,
    scale: float = 1.0,
    opacity: float = 1.0,
    angle: float = 0.0,
):
    """Alpha-composites a cached sprite centered at (cx, cy) with spring scale, tilt & opacity."""
    if scale <= 0.02 or opacity <= 0.02:
        return
    sp = sprite
    if abs(scale - 1.0) > 0.01:
        nw = max(2, int(sp.width * scale))
        nh = max(2, int(sp.height * scale))
        sp = sp.resize((nw, nh), Image.Resampling.BILINEAR)
    if abs(angle) > 0.2:
        sp = sp.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    if opacity < 0.99:
        sp = sp.copy()
        a = sp.getchannel("A").point(lambda p: int(p * clamp01(opacity)))
        sp.putalpha(a)

    px = int(cx - sp.width / 2.0)
    py = int(cy - sp.height / 2.0)
    # Safe clipping onto canvas
    cw, ch = canvas.size
    if px >= cw or py >= ch or px + sp.width <= 0 or py + sp.height <= 0:
        return
    sx0 = max(0, -px)
    sy0 = max(0, -py)
    sx1 = min(sp.width, cw - px)
    sy1 = min(sp.height, ch - py)
    if sx1 <= sx0 or sy1 <= sy0:
        return
    cropped = sp.crop((sx0, sy0, sx1, sy1))
    canvas.paste(cropped, (max(0, px), max(0, py)), cropped)


def draw_two_tone_kinetic_headline(
    canvas: Image.Image,
    line1_black: str,
    line1_accent: str,
    line2_black: str,
    line2_accent: str,
    cx: float,
    cy: float,
    font_size: int,
    theme: Dict[str, Any],
    accent_rgb: Tuple[int, int, int],
    local_t: float,
    typewriter: bool = False,
):
    """
    Renders crisp Google/Apple two-tone kinetic display typography with staggered spring rise
    or smooth typewriter reveal.
    """
    font = _load_font(font_size, bold=True)
    draw = ImageDraw.Draw(canvas, "RGBA")
    ink = theme["ink"]
    lines = []
    if line1_black or line1_accent:
        lines.append([(line1_black, ink), (line1_accent, accent_rgb)])
    if line2_black or line2_accent:
        lines.append([(line2_black, ink), (line2_accent, accent_rgb)])

    line_h = int(font_size * 1.18)
    start_y = cy - (len(lines) * line_h) / 2.0

    if typewriter:
        full_chars = sum(len(seg[0]) for ln in lines for seg in ln)
        visible_chars = int(clamp01(local_t / 1.35) * full_chars)
        consumed = 0
        for li, segs in enumerate(lines):
            # Measure total line width (target width so layout doesn't jump!)
            full_str = "".join(s[0] for s in segs)
            total_w = draw.textlength(full_str, font=font)
            cur_x = cx - total_w / 2.0
            y = start_y + li * line_h
            for text_part, col in segs:
                if not text_part:
                    continue
                rem = max(0, visible_chars - consumed)
                shown = text_part[:rem]
                if shown:
                    draw.text((cur_x, y), shown, font=font, fill=(*col, 255))
                cur_x += draw.textlength(text_part, font=font)
                consumed += len(text_part)
        return

    # Staggered word spring rise
    word_idx = 0
    for li, segs in enumerate(lines):
        # Flatten into (word_with_space, color)
        tokens: List[Tuple[str, Tuple[int, int, int]]] = []
        for seg_text, col in segs:
            for w_tok in seg_text.split(" "):
                if w_tok:
                    tokens.append((w_tok, col))
        if not tokens:
            continue
        space_w = draw.textlength(" ", font=font)
        widths = [draw.textlength(tok, font=font) for tok, _ in tokens]
        total_w = sum(widths) + space_w * max(0, len(tokens) - 1)
        cur_x = cx - total_w / 2.0
        base_y = start_y + li * line_h

        for (tok, col), tw in zip(tokens, widths):
            delay = word_idx * 0.085
            p = clamp01((local_t - delay) / 0.42)
            ep = ease_out_cubic(p)
            y_off = (1.0 - ep) * (font_size * 0.45)
            alpha = int(255 * clamp01(p * 1.4))
            if alpha > 4:
                draw.text((cur_x, base_y + y_off), tok, font=font, fill=(*col, alpha))
            cur_x += tw + space_w
            word_idx += 1


# ==================== LIVE OPENVERSE ASSET FETCHER ====================

async def fetch_studio_image(query: str) -> Optional[Image.Image]:
    """Fetches a clean HD image from Openverse (zero API key, $0 cost)."""
    try:
        async with httpx.AsyncClient(timeout=8.0, headers={"User-Agent": "OmniViralMotionEngine/9.0"}) as client:
            r = await client.get(f"https://api.openverse.org/v1/images/?q={urllib.parse.quote(query)}&page_size=6")
            if r.status_code == 200:
                for it in r.json().get("results", []):
                    u = it.get("thumbnail") or it.get("url")
                    if u and not u.lower().endswith(".svg"):
                        ir = await client.get(u, follow_redirects=True)
                        if ir.status_code == 200 and len(ir.content) > 2500:
                            return Image.open(io.BytesIO(ir.content)).convert("RGBA")
    except Exception:
        pass
    return None


async def fetch_studio_carousel(query: str, count: int = 3) -> List[Image.Image]:
    imgs: List[Image.Image] = []
    try:
        async with httpx.AsyncClient(timeout=8.0, headers={"User-Agent": "OmniViralMotionEngine/9.0"}) as client:
            r = await client.get(f"https://api.openverse.org/v1/images/?q={urllib.parse.quote(query)}&page_size=10")
            if r.status_code == 200:
                for it in r.json().get("results", []):
                    u = it.get("thumbnail") or it.get("url")
                    if u and not u.lower().endswith(".svg"):
                        try:
                            ir = await client.get(u, follow_redirects=True)
                            if ir.status_code == 200 and len(ir.content) > 2500:
                                imgs.append(Image.open(io.BytesIO(ir.content)).convert("RGBA"))
                                if len(imgs) >= count:
                                    break
                        except Exception:
                            continue
    except Exception:
        pass
    return imgs


# ==================== COMMERCIAL AUDIO & UI FOLEY SYNTHESIZER ====================

def synthesize_commercial_soundtrack(
    duration: float,
    pop_times: List[float],
    click_times: List[float],
    out_path: Path,
    voiceover_path: Optional[Path] = None,
) -> Path:
    """
    Synthesizes a sleek modern commercial tech groove + bright UI pop chimes & click foley
    timed to exact animation beats (optionally mixing & sidechain-ducking under Edge-TTS voiceover!).
    """
    # 1. Warm bright minimalist commercial pad + subtle rhythmic pulse
    bed_path = out_path.with_name(out_path.stem + "_bed.wav")
    bed_expr = (
        "0.14*sin(2*PI*261.63*t)*(0.6+0.4*sin(2*PI*2*t))"
        "+0.11*sin(2*PI*329.63*t)*(0.5+0.5*cos(2*PI*1*t))"
        "+0.10*sin(2*PI*392.00*t)*(0.6+0.4*sin(2*PI*0.5*t))"
        "+0.08*sin(2*PI*523.25*t)*exp(-4*mod(t\\,0.5))"
        "+0.14*sin(2*PI*130.81*t)*exp(-5*mod(t\\,0.5))"
    )
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", f"aevalsrc={bed_expr}:s=44100:d={duration:.2f}",
        "-af", f"lowpass=f=2400,aecho=0.8:0.85:60:0.25,afade=t=in:st=0:d=0.4,afade=t=out:st={max(0.2, duration-0.7):.2f}:d=0.7,volume=0.55",
        str(bed_path),
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 2. Bright UI Pop chime & Crisp Click SFX (cached)
    pop_sfx = MUSIC_DIR / "sfx_studio_pop.wav"
    if not pop_sfx.exists():
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", "aevalsrc=0.65*sin(2*PI*(640+760*t)*t)*exp(-22*t):s=44100:d=0.22",
            str(pop_sfx),
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    click_sfx = MUSIC_DIR / "sfx_studio_click.wav"
    if not click_sfx.exists():
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", "aevalsrc=0.75*sin(2*PI*1750*t)*exp(-45*t):s=44100:d=0.14",
            str(click_sfx),
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    cmd = ["ffmpeg", "-y", "-i", str(bed_path)]
    filters = ["[0:a]aformat=sample_rates=44100:channel_layouts=stereo[bed]"]
    mix_labels = []
    idx = 1

    if voiceover_path and voiceover_path.exists():
        cmd.extend(["-i", str(voiceover_path)])
        filters.append(f"[{idx}:a]aformat=sample_rates=44100:channel_layouts=stereo,asplit=2[vo_main][vo_sc]")
        filters.append("[bed][vo_sc]sidechaincompress=threshold=0.03:ratio=5:attack=25:release=240[bed_duck]")
        mix_labels.extend(["[vo_main]", "[bed_duck]"])
        idx += 1
    else:
        mix_labels.append("[bed]")

    for pt in pop_times[:10]:
        if 0.0 <= pt < duration - 0.15:
            cmd.extend(["-i", str(pop_sfx)])
            ms = int(pt * 1000)
            lbl = f"[p{idx}]"
            filters.append(f"[{idx}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay={ms}|{ms},volume=0.36{lbl}")
            mix_labels.append(lbl)
            idx += 1

    for ct in click_times[:6]:
        if 0.0 <= ct < duration - 0.1:
            cmd.extend(["-i", str(click_sfx)])
            ms = int(ct * 1000)
            lbl = f"[c{idx}]"
            filters.append(f"[{idx}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay={ms}|{ms},volume=0.52{lbl}")
            mix_labels.append(lbl)
            idx += 1

    if len(mix_labels) > 1:
        filters.append(f"{''.join(mix_labels)}amix=inputs={len(mix_labels)}:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[aout]")
    else:
        filters.append("[bed]loudnorm=I=-14:TP=-1.5:LRA=11[aout]")

    cmd.extend(["-filter_complex", ";".join(filters), "-map", "[aout]", "-c:a", "aac", "-ar", "48000", "-b:a", "256k", "-t", f"{duration:.2f}", str(out_path)])
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        bed_path.unlink(missing_ok=True)
    except Exception:
        pass
    return out_path


# ==================== MASTER 60FPS COMMERCIAL MOTION GRAPHICS ENGINE ====================

class MotionGraphicsEngine:
    """
    Renders 60fps Apple / Google Commercial Motion Graphics (mn7It1KAU80 & kMi6Yb0e4t0 caliber):
    - Floating 3D studio hero with dynamic breathing contact shadow
    - Spring-bouncing elevated pill badges (SALE, 25% OFF, Next day delivery, 5 Stars)
    - Sliding product card carousel + orbital multi-channel ring arc
    - Live typing Search Bar UI card + animated pointer cursor + click ripple
    - Stylized Vector Map card + bouncing location pin + circular portrait avatar pop-out
    - 4-Point morphing AI Sparkle + staggered typewriter CTA + persistent brand lockup
    """

    @staticmethod
    async def render_commercial_ad(
        preset: str = "product_offer_showcase",
        theme_id: str = "studio_white",
        aspect_ratio: str = "9:16",
        fps: int = 60,
        brand_name: str = "OmniViral Ads",
        accent_hex: str = "#2563EB",
        headline_1: str = "Convert more",
        highlight_1: str = "holiday shoppers",
        headline_2: str = "Stand out with",
        highlight_2: str = "your best offers",
        cta_line1: str = "Put Studio AI",
        cta_line2: str = "to work for you",
        pills: Optional[List[str]] = None,
        search_query: str = "Indoor plants",
        shop_name: str = "Botanical Studio",
        product_image_path: Optional[str] = None,
        avatar_image_path: Optional[str] = None,
        voiceover_path: Optional[Path] = None,
        output_filename: Optional[str] = None,
    ) -> Dict[str, Any]:
        job_id = str(uuid.uuid4())[:8]
        out_fn = output_filename or f"motion_{preset}_{job_id}.mp4"
        out_path = OUTPUT_DIR / out_fn

        theme = STUDIO_THEMES.get(theme_id, STUDIO_THEMES["studio_white"])
        accent_rgb = hex_to_rgb(accent_hex or theme["default_accent"], hex_to_rgb(theme["default_accent"]))
        offer_pills = pills if (pills and len(pills) >= 4) else ["SALE", "25% OFF", "Next day delivery", "PRICE DROP"]

        # Canvas dimensions (crisp Full HD aspect-matched!)
        if aspect_ratio == "1:1":
            W, H = 1080, 1080
        elif aspect_ratio == "16:9":
            W, H = 1920, 1080
        else:
            W, H = 1080, 1920
        fps = 60 if fps >= 45 else 30
        duration = 12.0
        total_frames = int(duration * fps)
        unit = min(W, H)

        # ---- 1. Fetch or load photography (100% zero-cost Openverse + custom upload support) ----
        product_img: Optional[Image.Image] = None
        if product_image_path and Path(product_image_path).exists():
            try:
                product_img = Image.open(product_image_path).convert("RGBA")
            except Exception:
                product_img = None

        avatar_img: Optional[Image.Image] = None
        if avatar_image_path and Path(avatar_image_path).exists():
            try:
                avatar_img = Image.open(avatar_image_path).convert("RGBA")
            except Exception:
                avatar_img = None
        if avatar_img is None:
            avatar_img = await fetch_studio_image("smiling person portrait headshot")

        carousel_photos: List[Image.Image] = []
        if preset in ("ai_realtime_ui_ad", "saas_kinetic_launch", "ecommerce_flash_drop"):
            carousel_photos = await fetch_studio_carousel(search_query or "minimalist product", count=3)

        # ---- 2. Pre-render 2x-supersampled vector sprites ONCE for ultra-fast 60fps piping ----
        hero_size = int(unit * 0.48)
        if product_img is not None:
            # Frame user product photo cleanly inside a floating studio card
            hero_sprite = render_product_card_sprite(product_img, hero_size, int(hero_size * 0.85), accent_rgb, theme)
        else:
            hero_sprite = render_3d_studio_gift_box(
                size=hero_size,
                box_hex="#1E7D45" if theme_id != "oled_volt" else "#1A2236",
                ribbon_hex="#D92626" if theme_id != "oled_volt" else accent_hex,
            )

        p_font = max(24, int(unit * 0.031))
        pill_sale = render_pill_badge_sprite(offer_pills[0], accent_rgb, theme, filled=True, font_size=p_font)
        pill_off = render_pill_badge_sprite(offer_pills[1], accent_rgb, theme, filled=False, icon="tag", font_size=p_font)
        pill_off_filled = render_pill_badge_sprite(offer_pills[1], accent_rgb, theme, filled=True, icon="tag", font_size=int(p_font * 0.92))
        pill_ship = render_pill_badge_sprite(offer_pills[2], accent_rgb, theme, filled=False, icon="truck", font_size=int(p_font * 0.92))
        pill_drop = render_pill_badge_sprite(offer_pills[3], accent_rgb, theme, filled=False, font_size=int(p_font * 0.88))
        pill_stars = render_pill_badge_sprite("", accent_rgb, theme, filled=False, icon="stars", font_size=int(p_font * 0.92))
        pill_cta_final = render_pill_badge_sprite(f"Try {brand_name}", accent_rgb, theme, filled=True, icon="sparkle", font_size=int(unit * 0.032))

        # Carousel cards
        cw_card, ch_card = int(unit * 0.30), int(unit * 0.28)
        carousel_sprites = []
        for idx_c in range(3):
            ph = carousel_photos[idx_c] if idx_c < len(carousel_photos) else None
            carousel_sprites.append(render_product_card_sprite(ph, cw_card, ch_card, accent_rgb, theme))

        # Vector Map UI Card + Circular Avatar + Channel Nodes
        map_w, map_h = int(unit * 0.56), int(unit * 0.56)
        map_sprite = render_vector_map_card_sprite(map_w, map_h, search_query, shop_name, accent_rgb, theme)
        avatar_sprite = render_circular_avatar_sprite(avatar_img, int(unit * 0.22), accent_rgb, theme)

        node_d = int(unit * 0.115)
        node_search = render_floating_channel_node("search", node_d, theme)
        node_video = render_floating_channel_node("video", node_d, theme)
        node_map = render_floating_channel_node("map", node_d, theme)
        node_shop = render_floating_channel_node("shop", node_d, theme)

        # Persistent Brand Lockup Sprite (clean crisp footer like "Google Ads")
        brand_font = _load_font(int(unit * 0.044), bold=True)
        bg_base = Image.new("RGBA", (W, H), (*theme["bg"], 255))
        # Subtle editorial radial studio gradient on base canvas
        y_grid, x_grid = np.ogrid[:H, :W]
        dist = np.sqrt(((x_grid - W / 2.0) / (W * 0.65)) ** 2 + ((y_grid - H * 0.45) / (H * 0.65)) ** 2)
        vig = np.clip(dist, 0.0, 1.0)
        bg_arr = np.zeros((H, W, 4), dtype=np.uint8)
        for ch_i in range(3):
            c0 = theme["bg"][ch_i]
            c1 = theme["bg_alt"][ch_i]
            bg_arr[:, :, ch_i] = np.clip(c0 * (1.0 - vig * 0.55) + c1 * (vig * 0.55), 0, 255).astype(np.uint8)
        bg_arr[:, :, 3] = 255
        bg_base = Image.fromarray(bg_arr[:, :, :3], mode="RGB")

        # Pre-render soft elliptical ground contact shadow sprite ONCE (50x faster than per-frame Gaussian blur!)
        sh_w, sh_h = int(hero_size * 0.96), int(hero_size * 0.24)
        ground_shadow_sprite = Image.new("RGBA", (sh_w, sh_h), (0, 0, 0, 0))
        ImageDraw.Draw(ground_shadow_sprite).ellipse(
            [24, 24, sh_w - 24, sh_h - 24],
            fill=(10, 14, 24, min(210, theme["shadow_alpha"] + 40)),
        )
        ground_shadow_sprite = ground_shadow_sprite.filter(ImageFilter.GaussianBlur(radius=14))

        # ---- 3. Synthesize synchronized commercial soundtrack + UI pop/click foley ----
        pop_times = [0.35, 0.75, 3.45, 3.72, 3.98, 4.25, 6.75, 7.15, 9.75]
        click_times = [4.95, 7.65] if preset in ("ai_realtime_ui_ad", "saas_kinetic_launch") else [3.95, 7.25]
        audio_path = OUTPUT_DIR / f"motion_audio_{job_id}.m4a"
        synthesize_commercial_soundtrack(duration, pop_times, click_times, audio_path, voiceover_path=voiceover_path)

        # ---- 4. Launch FFmpeg rawvideo stdin pipe for blazing 60fps encoding ----
        err_log_path = OUTPUT_DIR / f"motion_err_{job_id}.log"
        ff_cmd = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "pipe:0",
            "-i", str(audio_path),
            "-map", "0:v", "-map", "1:a",
            "-c:v", "libx264", "-profile:v", "high", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", "-threads", "0",
            "-c:a", "aac", "-ar", "48000", "-b:a", "256k",
            "-shortest",
            str(out_path),
        ]
        err_fh = open(err_log_path, "wb")
        proc = subprocess.Popen(ff_cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=err_fh)

        hl_size = int(unit * 0.074)
        sub_font = _load_font(int(unit * 0.032), bold=False)
        small_bold = _load_font(int(unit * 0.028), bold=True)

        # Precompute split point for scene variants
        is_ui_focused = preset in ("ai_realtime_ui_ad", "saas_kinetic_launch")

        try:
            for f_idx in range(total_frames):
                t = f_idx / float(fps)
                frame = bg_base.copy()
                draw = ImageDraw.Draw(frame, "RGBA")

                # ==================== BEAT 1 (0.0s -> 3.2s) ====================
                if t < 3.2:
                    lt = t
                    exit_fade = 1.0 - ease_in_out_cubic((lt - 2.75) / 0.45)

                    if is_ui_focused:
                        # Google AI kMi6Yb0e4t0 Beat 1: Sliding Product Carousel + Two-Tone Headline + Orbital Channel Ring
                        slide_x = -unit * 0.18 + ease_out_cubic(lt / 2.9) * (unit * 0.34)
                        cy_car = H * 0.20
                        for idx_c, sp_c in enumerate(carousel_sprites):
                            cx_c = W * 0.5 + (idx_c - 1) * (cw_card + 28) + slide_x
                            sc = ease_out_back(clamp01((lt - idx_c * 0.12) / 0.55)) * exit_fade
                            paste_scaled_centered(frame, sp_c, cx_c, cy_car, scale=sc, opacity=exit_fade)

                        draw_two_tone_kinetic_headline(
                            frame, headline_1, "", "", highlight_1,
                            W * 0.5, H * 0.48, hl_size, theme, accent_rgb, lt
                        )

                        # Orbital Arc + Orbiting Channel Badges
                        orb_r = unit * 0.38
                        orb_cx, orb_cy = W * 0.5, H * 0.92
                        arc_box = [orb_cx - orb_r, orb_cy - orb_r, orb_cx + orb_r, orb_cy + orb_r]
                        draw.arc(arc_box, 195, 345, fill=(*theme["muted"], int(60 * exit_fade)), width=4)
                        sweep = ease_out_cubic(lt / 1.4) * 55
                        draw.arc(arc_box, 200, 200 + sweep, fill=(251, 188, 5, int(240 * exit_fade)), width=6)
                        draw.arc(arc_box, 340 - sweep, 340, fill=(*accent_rgb, int(240 * exit_fade)), width=6)

                        ang1 = math.radians(225 + lt * 12)
                        ang2 = math.radians(315 - lt * 10)
                        paste_scaled_centered(
                            frame, node_search,
                            orb_cx + math.cos(ang1) * orb_r, orb_cy + math.sin(ang1) * orb_r,
                            scale=ease_out_back(clamp01((lt - 0.35) / 0.5)) * exit_fade, opacity=exit_fade
                        )
                        paste_scaled_centered(
                            frame, node_video,
                            orb_cx + math.cos(ang2) * orb_r, orb_cy + math.sin(ang2) * orb_r,
                            scale=ease_out_back(clamp01((lt - 0.55) / 0.5)) * exit_fade, opacity=exit_fade
                        )
                    else:
                        # Google Ads mn7It1KAU80 Beat 1: Headline + Floating Offer Pill + Levitating Hero & Dynamic Shadow
                        draw_two_tone_kinetic_headline(
                            frame, headline_1, "", "", highlight_1,
                            W * 0.5, H * 0.22, hl_size, theme, accent_rgb, lt
                        )

                        # Floating 25% OFF pill popping in above hero
                        pill_sc = ease_out_back(clamp01((lt - 0.35) / 0.45)) * exit_fade
                        pill_bob = math.sin(lt * 3.5) * 6.0
                        paste_scaled_centered(frame, pill_off, W * 0.5, H * 0.36 + pill_bob, scale=pill_sc, opacity=exit_fade)

                        # Floating Hero + Dynamic Breathing Ground Shadow
                        enter_sc = ease_out_back(clamp01(lt / 0.65), overshoot=1.3) * exit_fade
                        hover_y = math.sin(lt * 3.2) * 18.0
                        hero_cy = H * 0.58 + hover_y
                        # Ground contact shadow shrinks & lightens as object rises!
                        sh_factor = 1.0 - (hover_y / 18.0) * 0.14
                        sh_rx = hero_size * 0.36 * sh_factor * clamp01(enter_sc)
                        sh_ry = hero_size * 0.055 * sh_factor * clamp01(enter_sc)
                        sh_alpha = int((theme["shadow_alpha"] + 25) * (1.0 + (hover_y / 18.0) * 0.2) * exit_fade)
                        if sh_rx > 4 and sh_ry > 2:
                            paste_scaled_centered(
                                frame,
                                ground_shadow_sprite,
                                W * 0.5,
                                H * 0.74,
                                scale=sh_factor * clamp01(enter_sc),
                                opacity=clamp01((1.0 + (hover_y / 18.0) * 0.2) * exit_fade),
                            )

                        paste_scaled_centered(
                            frame, hero_sprite, W * 0.5, hero_cy,
                            scale=enter_sc, opacity=exit_fade, angle=math.sin(lt * 2.1) * 2.2
                        )

                # ==================== BEAT 2 (3.2s -> 6.5s) ====================
                elif t < 6.5:
                    lt = t - 3.2
                    exit_fade = 1.0 - ease_in_out_cubic((lt - 2.85) / 0.45)

                    if is_ui_focused:
                        # kMi6Yb0e4t0 Beat 2: Two-Tone Headline + Live Typing Search Bar + Ad Card + Gliding Pointer Click + Circular Avatar
                        draw_two_tone_kinetic_headline(
                            frame, "", headline_2, highlight_2, "",
                            W * 0.5, H * 0.24, hl_size, theme, accent_rgb, lt
                        )

                        # Elevated Typing Search Bar Card
                        sb_w, sb_h = int(unit * 0.68), int(unit * 0.105)
                        sb_x0, sb_y0 = int(W * 0.5 - sb_w / 2), int(H * 0.40)
                        card_sc = ease_out_back(clamp01(lt / 0.45)) * exit_fade
                        if card_sc > 0.05:
                            sb_box = [sb_x0, sb_y0, sb_x0 + sb_w, sb_y0 + sb_h]
                            draw.rounded_rectangle(
                                [sb_x0, sb_y0 + 10, sb_x0 + sb_w, sb_y0 + sb_h + 10],
                                radius=sb_h // 2, fill=(10, 14, 24, int(theme["shadow_alpha"] * 0.5 * exit_fade))
                            )
                            draw.rounded_rectangle(
                                sb_box, radius=sb_h // 2,
                                fill=(*theme["surface"], int(255 * exit_fade)),
                                outline=theme["surface_border"], width=2
                            )
                            _draw_vector_icon(draw, "search", sb_x0 + sb_h * 0.55, sb_y0 + sb_h * 0.5, sb_h * 0.48, (*theme["muted"], int(255 * exit_fade)))
                            typed_n = int(clamp01((lt - 0.25) / 1.1) * len(search_query))
                            caret = "|" if int(lt * 3) % 2 == 0 and lt < 1.9 else ""
                            draw.text(
                                (sb_x0 + sb_h * 0.95, sb_y0 + sb_h * 0.26),
                                search_query[:typed_n] + caret,
                                font=sub_font, fill=(*theme["ink"], int(255 * exit_fade))
                            )

                        # Sponsored Ad Preview Card below Search Bar
                        ad_w, ad_h = int(unit * 0.66), int(unit * 0.22)
                        ad_x0, ad_y0 = int(W * 0.5 - ad_w / 2), int(H * 0.53)
                        ad_p = ease_out_cubic(clamp01((lt - 0.55) / 0.45)) * exit_fade
                        if ad_p > 0.05:
                            oy = int((1.0 - ad_p) * 35)
                            draw.rounded_rectangle(
                                [ad_x0, ad_y0 + oy + 12, ad_x0 + ad_w, ad_y0 + oy + ad_h + 12],
                                radius=26, fill=(10, 14, 24, int(theme["shadow_alpha"] * 0.55 * exit_fade))
                            )
                            draw.rounded_rectangle(
                                [ad_x0, ad_y0 + oy, ad_x0 + ad_w, ad_y0 + oy + ad_h],
                                radius=26, fill=(*theme["surface"], int(255 * ad_p)),
                                outline=theme["surface_border"], width=2
                            )
                            draw.rounded_rectangle([ad_x0 + 28, ad_y0 + oy + 26, ad_x0 + 76, ad_y0 + oy + 56], radius=8, fill=(22, 163, 74, int(255 * ad_p)))
                            draw.text((ad_x0 + 38, ad_y0 + oy + 29), "Ad", font=small_bold, fill=(255, 255, 255, int(255 * ad_p)))
                            draw.text((ad_x0 + 92, ad_y0 + oy + 26), f"{shop_name} — Official", font=sub_font, fill=(*accent_rgb, int(255 * ad_p)))
                            draw.rounded_rectangle([ad_x0 + 28, ad_y0 + oy + 86, ad_x0 + int(ad_w * 0.72), ad_y0 + oy + 104], radius=9, fill=(*theme["muted"], int(95 * ad_p)))
                            draw.rounded_rectangle([ad_x0 + 28, ad_y0 + oy + 122, ad_x0 + int(ad_w * 0.52), ad_y0 + oy + 138], radius=8, fill=(*theme["muted"], int(65 * ad_p)))

                            # Circular Avatar + Floating Search Icon overlapping corners!
                            paste_scaled_centered(
                                frame, avatar_sprite,
                                ad_x0 + ad_w - 20, ad_y0 + oy + ad_h * 0.5,
                                scale=ease_out_back(clamp01((lt - 0.85) / 0.5)) * exit_fade, opacity=exit_fade
                            )
                            paste_scaled_centered(
                                frame, node_search,
                                ad_x0 + 18, ad_y0 + oy + ad_h - 14,
                                scale=ease_out_back(clamp01((lt - 0.95) / 0.45)) * exit_fade, opacity=exit_fade
                            )

                            # Animated Mouse Pointer gliding to click Ad Card + Ripple Ring!
                            cp = ease_in_out_cubic(clamp01((lt - 1.05) / 0.72))
                            cx_cur = W * 0.76 + (ad_x0 + ad_w * 0.42 - W * 0.76) * cp
                            cy_cur = H * 0.82 + (ad_y0 + oy + ad_h * 0.52 - H * 0.82) * cp
                            click_t = lt - 1.75
                            if click_t > 0:
                                rip_p = clamp01(click_t / 0.55)
                                rip_r = 12 + rip_p * 65
                                rip_a = int((1.0 - rip_p) * 210 * exit_fade)
                                draw.ellipse(
                                    [cx_cur - rip_r, cy_cur - rip_r, cx_cur + rip_r, cy_cur + rip_r],
                                    outline=(*accent_rgb, rip_a), width=4
                                )
                            cur_sc = 0.88 if (0.0 <= click_t <= 0.14) else 1.05
                            if lt > 1.0:
                                draw_pointer_cursor(draw, cx_cur, cy_cur, scale=cur_sc * exit_fade)
                    else:
                        # mn7It1KAU80 Beat 2 (hq3.jpg!): Kinetic Bold Headline surrounded by 5 Spring-Popping Offer Pill Badges!
                        draw_two_tone_kinetic_headline(
                            frame, headline_2, "", "", highlight_2,
                            W * 0.5, H * 0.46, int(hl_size * 1.12), theme, accent_rgb, lt
                        )

                        # 5 staggered floating badges orbiting/overlapping the headline edges (exact mn7It1KAU80 composition!)
                        badges_layout = [
                            (pill_sale, W * 0.23, H * 0.34, 0.25, -4.0),
                            (pill_ship, W * 0.72, H * 0.33, 0.45, 2.5),
                            (pill_off_filled, W * 0.78, H * 0.50, 0.65, -2.5),
                            (pill_drop, W * 0.28, H * 0.59, 0.85, 3.0),
                            (pill_stars, W * 0.70, H * 0.59, 1.05, -2.0),
                        ]
                        for sp_b, bx, by, delay, tilt in badges_layout:
                            sc_b = ease_out_back(clamp01((lt - delay) / 0.42), overshoot=1.8) * exit_fade
                            bob_y = math.sin((lt + delay * 3) * 3.2) * 7.0
                            paste_scaled_centered(frame, sp_b, bx, by + bob_y, scale=sc_b, opacity=exit_fade, angle=tilt)

                # ==================== BEAT 3 (6.5s -> 9.5s) ====================
                elif t < 9.5:
                    lt = t - 6.5
                    exit_fade = 1.0 - ease_in_out_cubic((lt - 2.55) / 0.45)

                    # Signature kMi6Yb0e4t0 Map UI + Bouncing Red Pin + Circular Avatar & Map Badge!
                    draw_two_tone_kinetic_headline(
                        frame, "in ", "real time", "", "",
                        W * 0.5, H * 0.20, int(hl_size * 1.08), theme, accent_rgb, lt
                    )

                    map_cy = H * 0.54
                    map_sc = ease_out_back(clamp01(lt / 0.55), overshoot=1.2) * exit_fade
                    paste_scaled_centered(frame, map_sprite, W * 0.5, map_cy, scale=map_sc, opacity=exit_fade)

                    # Animated Bouncing Red Teardrop Map Pin + Pulse Ring on Map Center!
                    if lt > 0.35:
                        pin_p = ease_out_back(clamp01((lt - 0.35) / 0.45), overshoot=2.1) * exit_fade
                        pin_bounce = abs(math.sin((lt - 0.35) * 4.2)) * 12.0 * math.exp(-(lt - 0.35) * 0.8)
                        px = W * 0.48
                        py = map_cy - map_h * 0.08 - pin_bounce
                        # Radar pulse under pin
                        pulse_p = (lt * 0.9) % 1.0
                        pr_ring = 14 + pulse_p * 52
                        draw.ellipse(
                            [px - pr_ring, map_cy - map_h * 0.01 - pr_ring * 0.45, px + pr_ring, map_cy - map_h * 0.01 + pr_ring * 0.45],
                            outline=(234, 67, 53, int((1.0 - pulse_p) * 190 * exit_fade)), width=4
                        )
                        pr = 26 * pin_p
                        if pr > 3:
                            draw.ellipse([px - pr, py - pr * 1.35, px + pr, py + pr * 0.65], fill=(234, 67, 53, int(255 * exit_fade)))
                            draw.polygon([(px - pr * 0.85, py + pr * 0.15), (px + pr * 0.85, py + pr * 0.15), (px, py + pr * 1.55)], fill=(234, 67, 53, int(255 * exit_fade)))
                            draw.ellipse([px - pr * 0.38, py - pr * 0.72, px + pr * 0.38, py + pr * 0.04], fill=(140, 22, 22, int(255 * exit_fade)))

                    # Overlapping Circular Map Icon (left) & Circular Portrait Avatar (right)
                    paste_scaled_centered(
                        frame, node_map,
                        W * 0.5 - map_w * 0.48, map_cy + map_h * 0.04,
                        scale=ease_out_back(clamp01((lt - 0.45) / 0.48)) * exit_fade, opacity=exit_fade
                    )
                    paste_scaled_centered(
                        frame, avatar_sprite,
                        W * 0.5 + map_w * 0.44, map_cy + map_h * 0.12,
                        scale=ease_out_back(clamp01((lt - 0.62) / 0.5)) * exit_fade, opacity=exit_fade
                    )

                # ==================== BEAT 4 (9.5s -> 12.0s) ====================
                else:
                    lt = t - 9.5
                    # kMi6Yb0e4t0 hq3.jpg Finale: Morphing 4-Point AI Sparkle Star + Typewriter CTA + Crisp Brand Pill
                    sp_sc = ease_out_back(clamp01(lt / 0.55), overshoot=1.7)
                    sp_r = unit * 0.095 * sp_sc * (1.0 + 0.06 * math.sin(lt * 5.0))
                    rot = ease_out_cubic(lt / 0.9) * (math.pi / 2.0) + lt * 0.25
                    # Outer crisp sparkle outline + soft inner glow sparkle
                    draw_4point_sparkle(draw, W * 0.5, H * 0.34, sp_r * 1.22, (*accent_rgb, 65), rotation=rot, hollow=False)
                    draw_4point_sparkle(draw, W * 0.5, H * 0.34, sp_r, (*accent_rgb, 255), rotation=rot, hollow=True)
                    draw_4point_sparkle(draw, W * 0.5, H * 0.34, sp_r * 0.45, (*accent_rgb, 255), rotation=-rot, hollow=False)

                    draw_two_tone_kinetic_headline(
                        frame, cta_line1, "", cta_line2, "",
                        W * 0.5, H * 0.54, int(hl_size * 1.05), theme, accent_rgb, lt, typewriter=True
                    )

                    # Floating Brand CTA Pill
                    cta_pill_sc = ease_out_back(clamp01((lt - 0.85) / 0.45))
                    if cta_pill_sc > 0.05:
                        paste_scaled_centered(frame, pill_cta_final, W * 0.5, H * 0.72, scale=cta_pill_sc)

                # ==================== PERSISTENT BRAND LOCKUP (Footer) ====================
                if brand_name.strip():
                    bw = draw.textlength(brand_name, font=brand_font)
                    # Subtle accent sparkle dot beside brand lockup
                    bx = W * 0.5 - bw / 2.0
                    by = H * 0.895
                    draw_4point_sparkle(draw, bx - 22, by + int(unit * 0.023), 12, (*accent_rgb, 255))
                    draw.text((bx, by), brand_name, font=brand_font, fill=(*theme["ink"], 220))

                # Write raw RGB24 frame directly into FFmpeg pipe
                assert proc.stdin is not None
                proc.stdin.write(frame.tobytes())

            assert proc.stdin is not None
            proc.stdin.close()
            proc.wait(timeout=120)
        finally:
            try:
                err_fh.close()
            except Exception:
                pass
            try:
                audio_path.unlink(missing_ok=True)
            except Exception:
                pass

        err_txt = err_log_path.read_text(encoding="utf-8", errors="ignore") if err_log_path.exists() else ""
        err_log_path.unlink(missing_ok=True)
        if proc.returncode != 0:
            raise RuntimeError(f"MotionGraphicsEngine FFmpeg failed: {err_txt[-500:]}")

        return {
            "id": job_id,
            "preset": preset,
            "theme": theme_id,
            "aspect_ratio": aspect_ratio,
            "fps": fps,
            "duration": duration,
            "filename": out_fn,
            "url": f"/api/videos/stream/{out_fn}",
            "title": f"Studio Motion ({preset}): {headline_1} {highlight_1}",
        }

    @staticmethod
    def render_hook_pill_png(
        text: str,
        out_path: Path,
        accent_hex: str = "#D9FF00",
        theme_id: str = "oled_volt",
        icon: str = "sparkle",
        font_size: int = 38,
    ) -> Path:
        """
        Generates a razor-sharp transparent RGBA PNG pill badge with soft Gaussian drop shadow.
        Used both by the Studio Graphic Overlay Enhancer AND by ComposerService across all videos!
        """
        theme = STUDIO_THEMES.get(theme_id, STUDIO_THEMES["oled_volt"])
        accent_rgb = hex_to_rgb(accent_hex, (217, 255, 0))
        sp = render_pill_badge_sprite(
            text=text[:42],
            accent_rgb=accent_rgb,
            theme=theme,
            filled=(theme_id != "studio_white"),
            icon=icon,
            font_size=font_size,
            pad_x=38,
            pad_y=20,
        )
        sp.save(str(out_path), format="PNG")
        return out_path

    @staticmethod
    def apply_studio_overlay_to_video(
        input_video_path: Path,
        output_filename: str,
        top_pill: str = "TRENDING NOW",
        offer_pill: str = "25% OFF",
        brand_tag: str = "OmniViral Studio",
        accent_hex: str = "#D9FF00",
        theme_id: str = "studio_white",
        show_stars: bool = True,
    ) -> Dict[str, Any]:
        """
        Stamps real anti-aliased floating Studio Pill Badges, 5-star social proof & brand sparkle
        with soft Gaussian drop shadows & smooth slide/pop entrance directly onto ANY existing MP4!
        """
        job_id = str(uuid.uuid4())[:8]
        out_path = OUTPUT_DIR / output_filename
        theme = STUDIO_THEMES.get(theme_id, STUDIO_THEMES["studio_white"])
        accent_rgb = hex_to_rgb(accent_hex, (37, 99, 235))

        p1 = OUTPUT_DIR / f"ov_p1_{job_id}.png"
        p2 = OUTPUT_DIR / f"ov_p2_{job_id}.png"
        p3 = OUTPUT_DIR / f"ov_p3_{job_id}.png"
        p4 = OUTPUT_DIR / f"ov_p4_{job_id}.png"

        render_pill_badge_sprite(top_pill, accent_rgb, theme, filled=True, icon="sparkle", font_size=32).save(str(p1))
        render_pill_badge_sprite(offer_pill, accent_rgb, theme, filled=False, icon="tag", font_size=30).save(str(p2))
        render_pill_badge_sprite("", accent_rgb, theme, filled=False, icon="stars", font_size=28).save(str(p3))
        render_pill_badge_sprite(brand_tag, accent_rgb, theme, filled=False, icon="check", font_size=24).save(str(p4))

        inputs = ["-i", str(input_video_path), "-i", str(p1), "-i", str(p2)]
        fc = [
            # Top Hook Pill drops in smoothly from y=-120 to y=64 during 0.2s..4.5s
            "[0:v][1:v]overlay=x=(W-w)/2:y='min(64,-120+900*max(0,t-0.2))':enable='between(t,0.2,4.5)'[v1]",
            # Offer Pill slides in cleanly from right edge during 0.6s..5.5s
            "[v1][2:v]overlay=x='max(W-w-36,W+40-1800*max(0,t-0.6))':y=195+8*sin(t*3):enable='between(t,0.6,5.5)'[v2]",
        ]
        last = "v2"
        idx = 3
        if show_stars:
            inputs.extend(["-i", str(p3)])
            fc.append(f"[{last}][{idx}:v]overlay=x='min(36,-400+1800*max(0,t-1.0))':y=H-h-145+6*cos(t*3):enable='between(t,1.0,6.5)'[v3]")
            last = "v3"
            idx += 1

        inputs.extend(["-i", str(p4)])
        fc.append(f"[{last}][{idx}:v]overlay=x=(W-w)/2:y=H-h-36[vout]")

        cmd = [
            "ffmpeg", "-y", *inputs,
            "-filter_complex", ";".join(fc),
            "-map", "[vout]", "-map", "0:a?",
            "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p",
            "-c:a", "copy",
            str(out_path),
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        for tmp in (p1, p2, p3, p4):
            tmp.unlink(missing_ok=True)
        if proc.returncode != 0:
            raise RuntimeError(f"Overlay FFmpeg failed: {proc.stderr[-400:]}")

        return {
            "id": job_id,
            "filename": output_filename,
            "url": f"/api/videos/stream/{output_filename}",
            "title": f"Studio Graphics Enhanced: {top_pill}",
        }
