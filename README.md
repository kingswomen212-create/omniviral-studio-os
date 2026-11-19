# OmniViral Studio OS v8.0

**All-in-One Zero-Cost (`$0.00/render`) AI Cinema Studio, HyperFrames 60fps Motion Graphics, Autonomous Agents, CapCut/HeyGen/Eromify Tools, Envato Creative Assets, Chat-to-3D Blender Studio & Interactive 3D Web Builder.**

Built with **FastAPI**, **Next.js 14**, **FFmpeg 7.1**, **Edge-TTS (318 neural voices)**, **Openverse 800M+ HD visuals**, **Blender 4.x `bpy` Cycles**, **SQLite persistence**, and a **WCAG 2.2 AAA verified OLED Cinema Design System** (`Geist` + `Geist Mono`).

---

## Core Suites & Capabilities

### 1. Video, Cinema & HyperFrames 60fps Motion Graphics Studio
- **Deterministic Camera Rigs**: *Dolly In, Crash Zoom, Dolly Out, Pan Left, Pan Right, Handheld FPV, Orbit Drift*
- **Camera Body & Lens Optics**: *ARRI Alexa 35, 35mm Kodak, 8mm Super, VHS Hi8* + *35mm Prime, Anamorphic 2.39, Halation Glow*
- **Cinema Color LUTs**: *Teal & Orange, Moody A24, Film Noir, Cyber Neon, Kodak 2383, Bleach Grit*
- **Broadcast Audio Mastering**: FFmpeg `sidechaincompress` music ducking, `-14 LUFS loudnorm`, synthesized transition Whoosh SFX, 6 royalty-free moods, and custom MP3 upload
- **3 Render Quality Tiers**: `1080p_30` (Fast), `1080p_60` (HyperFrames 60fps), and `4k_uhd` (`2160x3840` / `3840x2160`)
- **HyperFrames Motion Studio**: 60fps Kinetic Typography, Animated Stat Counter, Product Launch Reveal & Social Hook cards
- **All 24 AI Video Generators & Script-to-Video AI**: Full AITuber-inspired niche generator directory, 10 art styles, Global Voice Flag Chips, and AI Lyric Video Maker

### 2. Autonomous Agents, Clipping, Avatars & CapCut Studio (v7.0)
- **Clipping Agent (Eromify-style)**: Long video in -> viral 9:16 captioned clips out
- **Autonomous Video Agent & Photo Avatar (HeyGen-style)**: Single prompt to full multi-scene video + talking avatar compositor
- **AI Video Podcast Studio**: Dual-host alternating neural voices & split waveform visuals
- **PPT / Slides to Video & Video Translate/Dub**: Slide deck narration + 9-language translation & dubbing
- **CapCut Creative Utilities**: AI Logo Generator (SVG + PNG), Remove Background (Transparent PNG), Meme Maker, and Convert/Compress MP4

### 3. Envato Creative Asset Toolkit, Chat-to-3D Blender & Interactive 3D Web Builder (v8.0)
- **Chat-to-3D Blender Studio**: Interactive 360-degree drag-to-orbit 3D viewport + downloadable **Blender 4.x `bpy` Cycles** Python scripts (`.py`) generated from natural language prompts
- **Interactive 3D Website Builder**: Generate standalone, mouse-reactive 3D landing pages (`.html`) with live sandboxed preview and instant download
- **60fps Video Templates & Motion Graphics**: *Logo Reveal, Lower Third, Breaking News Stinger, Trailer Title, VJ Loop, Infographic* rendered directly to MP4 with synchronized SFX
- **10-Sound Royalty-Free SFX Soundboard**: FFmpeg-synthesized *Whoosh, Impact Boom, Sub Riser, UI Click, Social Pop, Retro Coin, Sci-Fi Laser, Breaking News Stinger, Glitch Static, Midnight Rain*
- **Stock Asset Explorer & Graphics Generator**: Live Openverse 800M+ HD asset search plus Mesh Gradients, Film Dust Overlays, 1200x630 Social Banners & Color Palette Cards

### 4. Image Suite, Audio Suite, MCP Server & CLI
- **Image Suite**: Create Image, Edit Image, 4K Image Upscaler, Soul ID & AI Influencer Vault, and 3-panel Mangaka Studio
- **Audio Suite**: 318 Edge-TTS neural voices, 6-preset AI Voice Changer, Global Translate & Dub, and Music Visualizer
- **Native MCP Server & CLI**: JSON-RPC 2.0 MCP Server ([`backend/mcp_server.py`](backend/mcp_server.py)) + Headless CLI ([`backend/omniviral_cli.py`](backend/omniviral_cli.py))

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
npm run build
npm run start -- -p 3000
```

---

## Design System & Accessibility
- Formal tokens defined in [`frontend/design/tokens.json`](frontend/design/tokens.json)
- Verified WCAG 2.2 AA/AAA contrast (`14/14` pairs pass AA, `12/12` text pairs pass AAA)
- Full keyboard navigation (`Ctrl+K` Command Palette, visible focus rings, `role="switch"`, `prefers-reduced-motion`)
