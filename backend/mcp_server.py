#!/usr/bin/env python3
"""
OmniViral Studio OS — Official MCP Server (JSON-RPC 2.0 over stdio)
Compatible with Claude Desktop, Claude Code, Cursor, Windsurf, and ChatGPT MCP bridges.
"""
import sys
import json
import httpx

API_BASE = "http://127.0.0.1:8000"

TOOLS = [
    {
        "name": "generate_cinema_video",
        "description": "Generate a full faceless cinema video with Higgsfield camera rigs, LUTs, transitions, voiceover, and viral captions.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "niche": {"type": "string", "default": "dark_psychology"},
                "topic": {"type": "string"},
                "camera_move": {"type": "string", "default": "dolly_in"},
                "color_fx": {"type": "string", "default": "teal_orange"},
                "aspect_ratio": {"type": "string", "default": "9:16"}
            }
        }
    },
    {
        "name": "create_image",
        "description": "Generate a styled high-resolution image.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string"},
                "style": {"type": "string", "default": "teal_orange"},
                "aspect_ratio": {"type": "string", "default": "9:16"}
            },
            "required": ["prompt"]
        }
    },
    {
        "name": "click_to_ad",
        "description": "Turn a store URL and product name into a ready-to-launch vertical video ad.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "store_url": {"type": "string"},
                "product_name": {"type": "string"},
                "price": {"type": "string", "default": "$99"},
                "cta": {"type": "string", "default": "SHOP NOW"}
            },
            "required": ["product_name"]
        }
    },
    {
        "name": "create_manga_strip",
        "description": "Generate a 3-panel vertical Manga / Webtoon strip from story panel descriptions.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "panels": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["title", "panels"]
        }
    },
    {
        "name": "text_to_speech",
        "description": "Synthesize free neural speech across 318 global voices.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "voice_id": {"type": "string", "default": "en-US-ChristopherNeural"}
            },
            "required": ["text"]
        }
    }
]

def call_tool(name: str, args: dict):
    with httpx.Client(timeout=120.0) as client:
        if name == "generate_cinema_video":
            r = client.post(f"{API_BASE}/api/videos/generate", json=args)
        elif name == "create_image":
            r = client.post(f"{API_BASE}/api/tools/image/create", json=args)
        elif name == "click_to_ad":
            r = client.post(f"{API_BASE}/api/tools/video/click-to-ad", json=args)
        elif name == "create_manga_strip":
            r = client.post(f"{API_BASE}/api/tools/image/mangaka", json=args)
        elif name == "text_to_speech":
            r = client.post(f"{API_BASE}/api/tools/audio/tts", json=args)
        else:
            return {"error": f"Unknown tool: {name}"}
        return r.json()

def main():
    for line in sys.stdin:
        line = line.lstrip("\ufeff").strip()
        if not line:
            continue
        req = json.loads(line)
        req_id = req.get("id")
        method = req.get("method")

        if method == "initialize":
            resp = {
                "jsonrpc": "2.0", "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "omniviral-studio-mcp", "version": "4.0.0"}
                }
            }
        elif method == "tools/list":
            resp = {"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}}
        elif method == "tools/call":
            params = req.get("params", {})
            out = call_tool(params.get("name", ""), params.get("arguments", {}))
            resp = {
                "jsonrpc": "2.0", "id": req_id,
                "result": {"content": [{"type": "text", "text": json.dumps(out, indent=2)}]}
            }
        else:
            continue

        sys.stdout.write(json.dumps(resp) + "\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()
