# OmniViral Studio OS v5.0

**All-in-One Zero-Cost AI Cinema Studio, Faceless Video Autopilot, Image/Audio Suite & Native MCP Server.**

Built with **FastAPI**, **Next.js 14**, **FFmpeg 7.1**, **Edge-TTS (318 neural voices)**, **Openverse/Pexels HD visuals**, **SQLite persistence**, and a **WCAG 2.2 AAA verified OLED Cinema Design System** (`Geist` + `Geist Mono`).

---

## Core Suites & Capabilities

### 1. Video & Cinema Studio
- **Deterministic Camera Rigs**: *Dolly In, Crash Zoom, Dolly Out, Pan Left, Pan Right, Handheld FPV, Orbit Drift*
- **Camera Body & Lens Optics**: *ARRI Alexa 35, 35mm Kodak, 8mm Super, VHS Hi8* + *35mm Prime, Anamorphic 2.39, Halation Glow*
- **Cinema Color LUTs**: *Teal & Orange, Moody A24, Film Noir, Cyber Neon, Kodak 2383, Bleach Grit*
- **7 Smooth Scene Transitions (`xfade`)**: *Crossfade, Wipe Left, Slide Up, Zoom Cut, Iris Open, Dissolve, Hard Cut*
- **Viral Captions (`.ass`)**: 122px bold word-by-word animated captions (*Volt Lime, Hormozi Gold, Electric Cyan, Crimson, Minimal*)
- **Pro Video Tools**: Edit Video (Trim/Speed/LUT), 4K Video Upscaler, Smart Reframe (`9:16` / `16:9` / `1:1`), **Click to Ad (Marketing Studio)**, **Genjutsu & Lipsync Remake**, **Short Drama (Dual-Actor)**, and **Content Factory (3x Batch)**.

### 2. Image Suite
- **Create Image**: Multi-model cinema visual pipeline with LUT presets & aspect ratios
- **Edit Image**: Live FFmpeg LUT grading, contrast/saturation controls & poster typography
- **4K Image Upscaler**: 2x / 4x Lanczos + adaptive unsharp super-resolution
- **Soul ID & AI Influencer Vault**: Persistent SQLite character cast (hairstyle, outfit, ethnicity, persona)
- **Mangaka Studio**: 3-panel vertical high-contrast Manga / Webtoon strip builder

### 3. Audio Suite
- **Text to Speech**: 318 neural voices across 70+ languages at `$0.00` cost
- **AI Voice Changer**: 6 FFmpeg DSP presets (*Deep Trailer, Studio Radio, Cyber Robot, High Energy, Vintage Phone, Ethereal Echo*)
- **Global Translate & Dub**: Live translation + native neural voice dubbing across 9+ languages
- **Spotify & Music Visualizer**: Audio-reactive vertical waveform generator

### 4. MCP Server, CLI & Autopilot
- **JSON-RPC 2.0 MCP Server** ([`backend/mcp_server.py`](backend/mcp_server.py)) for **Claude Desktop, Claude Code, ChatGPT, Cursor & Telegram**
- **CLI** ([`backend/omniviral_cli.py`](backend/omniviral_cli.py)) for headless automation
- **Autopilot Channels & Live Webhook Publishing**: SQLite-backed channel manager & Make/Zapier/n8n webhook dispatch

---

## Quick Start

### Windows 1-Click
Double-click `start_all.bat`, then open:
- **Studio UI**: `http://localhost:3000` (press `Ctrl+K` for Command Palette)
- **API Docs**: `http://127.0.0.1:8000/docs`

### Manual Setup
```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

---

## Design System & Accessibility
- Tokens defined in [`frontend/design/tokens.json`](frontend/design/tokens.json)
- Verified with `contrast.py`: **14/14 pairs pass WCAG 2.2 AA (12/12 text pairs pass AAA)**
- Full keyboard navigation (`Ctrl+K` Spotlight Command Palette, visible focus rings, `role="switch"` controls, `prefers-reduced-motion`)
