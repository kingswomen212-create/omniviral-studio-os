import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.core.config import BASE_DIR

DB_PATH = BASE_DIR / "omniviral.db"

def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        title TEXT,
        niche TEXT,
        visual_style TEXT,
        aspect_ratio TEXT,
        script TEXT,
        duration REAL,
        filename TEXT,
        thumbnail_filename TEXT,
        tags_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        name TEXT,
        niche TEXT,
        visual_style TEXT,
        voice_id TEXT,
        frequency TEXT,
        platforms_json TEXT,
        status TEXT,
        videos_published INTEGER DEFAULT 0
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS scheduled_posts (
        id TEXT PRIMARY KEY,
        video_id TEXT,
        video_title TEXT,
        platforms_json TEXT,
        publish_time TEXT,
        status TEXT,
        views_forecast TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        name TEXT,
        hairstyle TEXT,
        outfit TEXT,
        ethnicity TEXT,
        vibe TEXT,
        image_filename TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS media_assets (
        id TEXT PRIMARY KEY,
        asset_type TEXT,
        title TEXT,
        prompt TEXT,
        filename TEXT,
        meta_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Seed default channels if empty
    cur.execute("SELECT COUNT(*) FROM channels")
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO channels (id, name, niche, visual_style, voice_id, frequency, platforms_json, status, videos_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("ch_1", "Dark Mind Daily", "dark_psychology", "noir", "en-US-ChristopherNeural", "Daily at 18:00", json.dumps(["youtube", "tiktok", "instagram"]), "active", 24)
        )
        cur.execute(
            "INSERT INTO channels (id, name, niche, visual_style, voice_id, frequency, platforms_json, status, videos_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("ch_2", "Stoic Fortress", "stoicism", "cinematic", "en-US-ChristopherNeural", "Every 2 Days", json.dumps(["youtube", "x", "threads"]), "active", 12)
        )

    conn.commit()
    conn.close()

def save_video(v: Dict[str, Any]):
    conn = get_conn()
    conn.execute(
        """INSERT OR REPLACE INTO videos
        (id, title, niche, visual_style, aspect_ratio, script, duration, filename, thumbnail_filename, tags_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            v["id"], v["title"], v["niche"], v.get("visual_style", "cinematic"),
            v.get("aspect_ratio", "9:16"), v["script"], v["duration"],
            v["filename"], v.get("thumbnail_filename", ""), json.dumps(v.get("tags", []))
        )
    )
    conn.commit()
    conn.close()

def list_videos_db() -> List[Dict[str, Any]]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM videos ORDER BY created_at DESC").fetchall()
    conn.close()
    res = []
    for r in rows:
        res.append({
            "id": r["id"],
            "title": r["title"],
            "niche": r["niche"],
            "visual_style": r["visual_style"],
            "aspect_ratio": r["aspect_ratio"],
            "script": r["script"],
            "duration": r["duration"],
            "filename": r["filename"],
            "url": f"/api/videos/stream/{r['filename']}",
            "thumbnail_url": f"/api/videos/stream/{r['thumbnail_filename']}" if r["thumbnail_filename"] else None,
            "tags": json.loads(r["tags_json"] or "[]"),
            "status": "ready"
        })
    return res

def get_setting(key: str, default: str = "") -> str:
    conn = get_conn()
    row = conn.execute("SELECT value FROM app_settings WHERE key = ?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else default

def set_setting(key: str, value: str):
    conn = get_conn()
    conn.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

def get_all_settings() -> Dict[str, str]:
    conn = get_conn()
    rows = conn.execute("SELECT key, value FROM app_settings").fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}

init_db()
