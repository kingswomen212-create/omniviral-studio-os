import json
import uuid
import httpx
from datetime import datetime, timedelta
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.core.database import get_conn, get_setting, set_setting, get_all_settings

router = APIRouter(prefix="/schedule", tags=["Autopilot Channels, Publishing & Settings"])

class ScheduleRequest(BaseModel):
    video_id: str
    video_title: Optional[str] = "Viral Faceless Short"
    video_url: Optional[str] = ""
    tags: Optional[List[str]] = []
    platforms: List[str] = ["youtube", "tiktok", "instagram"]
    publish_time: Optional[str] = None
    publish_now: bool = False

class ChannelRequest(BaseModel):
    name: str
    niche: str
    visual_style: str = "cinematic"
    voice_id: str = "en-US-ChristopherNeural"
    frequency: str = "Daily at 18:00"
    platforms: List[str] = ["youtube", "tiktok", "instagram"]

class SettingsUpdateRequest(BaseModel):
    watermark: Optional[str] = None
    publish_webhook_url: Optional[str] = None
    groq_api_key: Optional[str] = None
    pexels_api_key: Optional[str] = None
    pixabay_api_key: Optional[str] = None
    hf_api_token: Optional[str] = None
    fal_api_key: Optional[str] = None
    replicate_api_token: Optional[str] = None
    gemini_api_key: Optional[str] = None
    comfyui_url: Optional[str] = None

@router.post("")
async def create_scheduled_post(req: ScheduleRequest):
    post_id = f"sch_{str(uuid.uuid4())[:6]}"
    pub_time = datetime.now().strftime("%Y-%m-%d %H:%M") if req.publish_now else (req.publish_time or (datetime.now() + timedelta(hours=2)).strftime("%Y-%m-%d %H:%M"))
    status = "scheduled"
    webhook_msg = ""

    # If user wants to publish immediately and has a webhook configured, dispatch live HTTP POST
    if req.publish_now:
        webhook_url = get_setting("publish_webhook_url", "")
        if webhook_url:
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    await client.post(webhook_url, json={
                        "video_id": req.video_id,
                        "title": req.video_title,
                        "video_url": req.video_url,
                        "tags": req.tags,
                        "platforms": req.platforms,
                        "timestamp": pub_time
                    })
                status = "published_live"
                webhook_msg = "Dispatched to live publishing webhook!"
            except Exception as e:
                status = "webhook_failed"
                webhook_msg = str(e)
        else:
            status = "queued_no_webhook"
            webhook_msg = "Saved to queue. Add a Make/Zapier/n8n Webhook URL in Settings to auto-push live."

    conn = get_conn()
    conn.execute(
        "INSERT INTO scheduled_posts (id, video_id, video_title, platforms_json, publish_time, status, views_forecast) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (post_id, req.video_id, req.video_title, json.dumps(req.platforms), pub_time, status, "50K - 180K")
    )
    conn.commit()
    conn.close()

    return {
        "message": webhook_msg or "Video scheduled",
        "item": {
            "id": post_id,
            "video_id": req.video_id,
            "video_title": req.video_title,
            "platforms": req.platforms,
            "publish_time": pub_time,
            "status": status,
            "views_forecast": "50K - 180K"
        }
    }

@router.get("")
async def list_scheduled_posts():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM scheduled_posts ORDER BY publish_time DESC").fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "video_id": r["video_id"],
            "video_title": r["video_title"],
            "platforms": json.loads(r["platforms_json"] or "[]"),
            "publish_time": r["publish_time"],
            "status": r["status"],
            "views_forecast": r["views_forecast"]
        }
        for r in rows
    ]

@router.get("/channels")
async def list_autopilot_channels():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM channels").fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "niche": r["niche"],
            "visual_style": r["visual_style"],
            "voice_id": r["voice_id"],
            "frequency": r["frequency"],
            "platforms": json.loads(r["platforms_json"] or "[]"),
            "status": r["status"],
            "videos_published": r["videos_published"]
        }
        for r in rows
    ]

@router.post("/channels")
async def create_autopilot_channel(req: ChannelRequest):
    ch_id = f"ch_{str(uuid.uuid4())[:6]}"
    conn = get_conn()
    conn.execute(
        "INSERT INTO channels (id, name, niche, visual_style, voice_id, frequency, platforms_json, status, videos_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (ch_id, req.name, req.niche, req.visual_style, req.voice_id, req.frequency, json.dumps(req.platforms), "active", 0)
    )
    conn.commit()
    conn.close()
    return {
        "id": ch_id,
        "name": req.name,
        "niche": req.niche,
        "visual_style": req.visual_style,
        "voice_id": req.voice_id,
        "frequency": req.frequency,
        "platforms": req.platforms,
        "status": "active",
        "videos_published": 0
    }

@router.get("/settings")
async def read_settings():
    return get_all_settings()

@router.post("/settings")
async def update_settings(req: SettingsUpdateRequest):
    if req.watermark is not None:
        set_setting("watermark", req.watermark)
    if req.publish_webhook_url is not None:
        set_setting("publish_webhook_url", req.publish_webhook_url)
    if req.groq_api_key is not None:
        set_setting("groq_api_key", req.groq_api_key)
    if req.pexels_api_key is not None:
        set_setting("pexels_api_key", req.pexels_api_key)
    if req.pixabay_api_key is not None:
        set_setting("pixabay_api_key", req.pixabay_api_key)
    if req.hf_api_token is not None:
        set_setting("hf_api_token", req.hf_api_token)
    if req.fal_api_key is not None:
        set_setting("fal_api_key", req.fal_api_key)
    if req.replicate_api_token is not None:
        set_setting("replicate_api_token", req.replicate_api_token)
    if req.gemini_api_key is not None:
        set_setting("gemini_api_key", req.gemini_api_key)
    if req.comfyui_url is not None:
        set_setting("comfyui_url", req.comfyui_url)
    return {"status": "saved", "settings": get_all_settings()}
