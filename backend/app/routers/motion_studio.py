import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.config import ASSETS_DIR, OUTPUT_DIR
from app.core.database import save_video
from app.services.motion_gfx_engine import MotionGraphicsEngine, STUDIO_THEMES
from app.services.voice_service import VoiceService

UPLOAD_DIR = ASSETS_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/motion", tags=["Commercial Motion Graphics & Studio Effects (v9.0)"])

MOTION_PRESETS = [
    {
        "id": "product_offer_showcase",
        "name": "Product & Offer Showcase (Google Ads 9:16)",
        "tag": "TOP",
        "desc": "Floating 3D studio hero with dynamic ground shadow + spring-bouncing SALE / 25% OFF / Next day delivery / 5-Star offer pills + Map & AI Sparkle finale.",
        "defaults": {
            "theme_id": "studio_white",
            "aspect_ratio": "9:16",
            "accent_hex": "#2563EB",
            "brand_name": "OmniViral Ads",
            "headline_1": "Convert more",
            "highlight_1": "holiday shoppers",
            "headline_2": "Stand out with",
            "highlight_2": "your best offers",
            "cta_line1": "Put Studio AI",
            "cta_line2": "to work for you",
            "pills": ["SALE", "25% OFF", "Next day delivery", "PRICE DROP"],
            "search_query": "Running shoes",
            "shop_name": "Velocity Store",
        },
    },
    {
        "id": "ai_realtime_ui_ad",
        "name": "AI Real-Time UI & Map Showcase (Square / Vertical)",
        "tag": "NEW",
        "desc": "Sliding product card carousel, orbital multi-channel ring, live typing Search bar, gliding mouse cursor click ripple, Vector Map pin + circular customer avatar & morphing 4-point AI Sparkle.",
        "defaults": {
            "theme_id": "studio_white",
            "aspect_ratio": "1:1",
            "accent_hex": "#3B82F6",
            "brand_name": "OmniViral AI",
            "headline_1": "help you",
            "highlight_1": "find more",
            "headline_2": "valuable",
            "highlight_2": "customers",
            "cta_line1": "Put Studio AI",
            "cta_line2": "to work for you",
            "pills": ["LIVE NOW", "AI POWERED", "Instant reach", "TOP RATED"],
            "search_query": "Indoor plants",
            "shop_name": "Plant Shop",
        },
    },
    {
        "id": "saas_kinetic_launch",
        "name": "SaaS & App Keynote Launch (OLED Volt)",
        "tag": "60FPS",
        "desc": "Dark OLED glass aesthetic with electric volt typography, interactive typing UI card, animated pointer ripple, and glowing 4-point sparkle reveal.",
        "defaults": {
            "theme_id": "oled_volt",
            "aspect_ratio": "16:9",
            "accent_hex": "#D9FF00",
            "brand_name": "OmniViral OS",
            "headline_1": "Ship faster with",
            "highlight_1": "autonomous AI",
            "headline_2": "Zero-cost",
            "highlight_2": "60fps studio",
            "cta_line1": "Launch your studio",
            "cta_line2": "in 60 seconds",
            "pills": ["v9.0 LIVE", "60FPS PRO", "Zero render cost", "4K READY"],
            "search_query": "AI video studio",
            "shop_name": "OmniViral Cloud",
        },
    },
    {
        "id": "ecommerce_flash_drop",
        "name": "E-Commerce Flash Drop (High-ROAS Reel)",
        "tag": "ADS",
        "desc": "High-conversion Meta Reels / TikTok Shop commercial with floating discount pills, 5-star social proof, dynamic product hover, and crisp checkout CTA.",
        "defaults": {
            "theme_id": "warm_editorial",
            "aspect_ratio": "9:16",
            "accent_hex": "#EA580C",
            "brand_name": "Aura Goods",
            "headline_1": "Limited season",
            "highlight_1": "flash collection",
            "headline_2": "Unlock today's",
            "highlight_2": "exclusive drop",
            "cta_line1": "Claim 40% off",
            "cta_line2": "before midnight",
            "pills": ["FLASH DROP", "40% OFF", "Free express ship", "LIMITED"],
            "search_query": "Luxury ceramics",
            "shop_name": "Aura Flagship",
        },
    },
]


@router.get("/presets")
async def get_motion_presets():
    return {
        "presets": MOTION_PRESETS,
        "themes": [
            {"id": k, "name": v["name"], "default_accent": v["default_accent"]}
            for k, v in STUDIO_THEMES.items()
        ],
    }


class MotionRenderRequest(BaseModel):
    preset: str = "product_offer_showcase"
    theme_id: str = "studio_white"
    aspect_ratio: str = "9:16"
    fps: int = 60
    brand_name: str = "OmniViral Ads"
    accent_hex: str = "#2563EB"
    headline_1: str = "Convert more"
    highlight_1: str = "holiday shoppers"
    headline_2: str = "Stand out with"
    highlight_2: str = "your best offers"
    cta_line1: str = "Put Studio AI"
    cta_line2: str = "to work for you"
    pills: List[str] = ["SALE", "25% OFF", "Next day delivery", "PRICE DROP"]
    search_query: str = "Indoor plants"
    shop_name: str = "Plant Shop"
    product_image_filename: Optional[str] = None
    avatar_image_filename: Optional[str] = None
    voiceover_script: Optional[str] = None
    voice_id: str = "en-US-AndrewNeural"


@router.post("/render")
async def render_commercial_motion_ad(req: MotionRenderRequest):
    vo_path: Optional[Path] = None
    if req.voiceover_script and req.voiceover_script.strip():
        job_vo = str(uuid.uuid4())[:8]
        vo_fn = f"motion_vo_{job_vo}.mp3"
        try:
            res_vo = await VoiceService.synthesize_speech(
                text=req.voiceover_script.strip(),
                voice_id=req.voice_id,
                output_filename=vo_fn,
                rate="+6%",
            )
            vo_path = Path(res_vo["audio_path"])
        except Exception as e:
            print(f"Motion voiceover fallback (continuing with foley bed): {e}")

    prod_path = str(UPLOAD_DIR / req.product_image_filename) if req.product_image_filename else None
    av_path = str(UPLOAD_DIR / req.avatar_image_filename) if req.avatar_image_filename else None

    result = await MotionGraphicsEngine.render_commercial_ad(
        preset=req.preset,
        theme_id=req.theme_id,
        aspect_ratio=req.aspect_ratio,
        fps=req.fps,
        brand_name=req.brand_name,
        accent_hex=req.accent_hex,
        headline_1=req.headline_1,
        highlight_1=req.highlight_1,
        headline_2=req.headline_2,
        highlight_2=req.highlight_2,
        cta_line1=req.cta_line1,
        cta_line2=req.cta_line2,
        pills=req.pills,
        search_query=req.search_query,
        shop_name=req.shop_name,
        product_image_path=prod_path,
        avatar_image_path=av_path,
        voiceover_path=vo_path,
    )

    if vo_path:
        try:
            vo_path.unlink(missing_ok=True)
        except Exception:
            pass

    rec = {
        "id": result["id"],
        "title": result["title"],
        "niche": "commercial_motion",
        "aspect_ratio": req.aspect_ratio,
        "script": f"{req.headline_1} {req.highlight_1} — {req.headline_2} {req.highlight_2}",
        "duration": result["duration"],
        "filename": result["filename"],
        "url": result["url"],
        "tags": ["#commercial", "#motiongraphics", "#60fps", f"#{req.preset}"],
    }
    save_video(rec)
    return {**rec, "fps": result["fps"], "theme": result["theme"], "preset": result["preset"]}


@router.post("/upload-asset")
async def upload_motion_asset(file: UploadFile = File(...)):
    ext = Path(file.filename or "asset.png").suffix.lower() or ".png"
    if ext not in (".png", ".jpg", ".jpeg", ".webp"):
        raise HTTPException(status_code=400, detail="Only PNG, JPG, or WEBP images supported")
    fname = f"motion_asset_{uuid.uuid4().hex[:8]}{ext}"
    dest = UPLOAD_DIR / fname
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    return {"filename": fname, "size": len(content)}


class OverlayEnhanceRequest(BaseModel):
    source_filename: str
    top_pill: str = "LIMITED OFFER"
    offer_pill: str = "25% OFF"
    brand_tag: str = "OmniViral Studio"
    accent_hex: str = "#2563EB"
    theme_id: str = "studio_white"
    show_stars: bool = True


@router.post("/apply-overlay")
async def apply_studio_overlay(req: OverlayEnhanceRequest):
    src = OUTPUT_DIR / Path(req.source_filename).name
    if not src.exists():
        src_up = UPLOAD_DIR / Path(req.source_filename).name
        if src_up.exists():
            src = src_up
        else:
            raise HTTPException(status_code=404, detail=f"Video not found: {req.source_filename}")

    out_fn = f"enhanced_gfx_{uuid.uuid4().hex[:8]}.mp4"
    res = MotionGraphicsEngine.apply_studio_overlay_to_video(
        input_video_path=src,
        output_filename=out_fn,
        top_pill=req.top_pill,
        offer_pill=req.offer_pill,
        brand_tag=req.brand_tag,
        accent_hex=req.accent_hex,
        theme_id=req.theme_id,
        show_stars=req.show_stars,
    )
    rec = {
        "id": res["id"],
        "title": res["title"],
        "niche": "studio_overlay",
        "aspect_ratio": "9:16",
        "script": f"{req.top_pill} | {req.offer_pill}",
        "duration": 10.0,
        "filename": res["filename"],
        "url": res["url"],
        "tags": ["#motionoverlay", "#studiographics"],
    }
    save_video(rec)
    return rec


class BadgePreviewRequest(BaseModel):
    text: str = "25% OFF"
    accent_hex: str = "#2563EB"
    theme_id: str = "studio_white"
    icon: str = "tag"


@router.post("/badge-preview")
async def generate_badge_png(req: BadgePreviewRequest):
    job_id = str(uuid.uuid4())[:8]
    fn = f"studio_badge_{job_id}.png"
    MotionGraphicsEngine.render_hook_pill_png(
        text=req.text,
        out_path=OUTPUT_DIR / fn,
        accent_hex=req.accent_hex,
        theme_id=req.theme_id,
        icon=req.icon,
    )
    return {"id": job_id, "filename": fn, "url": f"/api/videos/stream/{fn}"}
