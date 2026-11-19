# OmniViral Studio OS v10.0

**All-in-One Zero-Cost (`$0.00/render`) GPU-Accelerated AI Cinema Render Engine, Agent Two Multi-Agent Director, 60fps Commercial Motion Graphics Studio, HyperFrames, Envato Assets & 3D Blender/Web OS.**

Built with **FastAPI**, **Next.js 14**, **FFmpeg 7.1 (Hardware GPU AMF/MF + AMD FidelityFX CAS + Deband + Optical Halation + BT.709 + 48kHz)**, **Pillow 2× SSAA Vector Graphics Engine**, **Edge-TTS (318 neural voices)**, **Openverse 800M+ HD visuals**, **Blender 4.x `bpy` Cycles**, **SQLite persistence**, and a **WCAG 2.2 AAA OLED Cinema Design System** (`Geist` + `Geist Mono`).

---

## Core Suites & Capabilities

### 1. GPU Cinema Render Engine & Agent Two Multi-Agent Director (v10.0)
- **Hardware GPU Acceleration**: Auto-detects verified GPU encoders (`h264_amf`, `h264_mf`, `h264_nvenc`, `h264_qsv`) + multi-threaded parallel `ThreadPoolExecutor` scene pre-rendering and live 1080p speed benchmarking (`POST /api/engine/benchmark`).
- **5-Agent Cinema Pipeline (`POST /api/engine/agent-two`)**: *01 Context & Prompt Director → 02 Casting & Parallel Asset Production → 03 3×3 Shot-to-Shot Continuity Storyboard Contact Sheet → 04 Parallel GPU Cinema Render (24p/30p/60p, Optical Film Halation Bloom, 180° Shutter Motion Blur, FidelityFX CAS, Deband, BT.709, 48kHz -14 LUFS) → 05 Self-Review & Auto-Correction QA Scorecard*.
- **7 Production Use Cases**: *Ad Filmmaking, Performance Marketing, Theatrical Filmmaking, Micro-Drama (A24), AI UGC, AI VFX (60fps), Pre-Viz*.
- **Topaz / ByteDance-Class Pro Super-Resolution (`POST /api/engine/upscale-pro`)**: Local 2× FidelityFX CAS detail restoration, 4K UHD mastering, 60fps bidirectional optical-flow interpolation (`minterpolate`), and dual-path optical film halation remastering with before/after telemetry.
- **Multi-Model Routing Matrix**: `$0.00` Local GPU Engine active defaults + pluggable BYOK slots across Video, Image, Audio, Music & Upscalers.

### 2. Commercial Motion Graphics & Studio Effects Engine (v9.0)
- **60fps Vector Commercial Ad Builder (`POST /api/motion/render`)**: Supersampled `2×` Pillow vector engine piped directly into FFmpeg for Google Ads / Apple Keynote-grade motion graphics:
  - Floating 3D studio hero with dynamic breathing ground contact shadow
  - Spring-bouncing elevated pill badges (`SALE`, `25% OFF`, `Next day delivery`, `PRICE DROP`, 5-Star gold rating) with real multi-layer Gaussian drop shadows
  - Sliding product card carousel & orbital multi-channel ring arc
  - Live typing Search Bar card, gliding pointer cursor + click ripple, stylized Vector Map card with bouncing location pin & overlapping circular portrait avatar
  - Morphing 4-point concave Bezier AI Sparkle finale + staggered typewriter CTA + synchronized UI pop/click foley
- **Live 60fps Interactive Canvas Preview** + **Studio Graphic Overlay Enhancer (`POST /api/motion/apply-overlay`)** to stamp shadowed floating pills onto any video (and automatically integrated into `ComposerService` hook banners!).

### 3. Envato Creative Assets, Chat-to-3D Blender & Interactive 3D Web (v8.0)
- **Chat-to-3D Blender Studio**: Interactive 360° drag-to-orbit viewport + executable **Blender 4.x `bpy` Cycles** `.py` export
- **Interactive 3D Website Builder**: Standalone mouse-reactive 3D `.html` landing pages with live preview
- **60fps Video Templates**, **10-Sound Royalty-Free SFX Soundboard**, **800M+ HD Openverse Stock Explorer**, and **Graphics/Banners Generator**

### 4. Cinema Studio, HyperFrames, Clipping Agent, Avatars, Image/Audio & MCP (v5.0–v7.0)
- **Cinema & HyperFrames Studio**: 7 camera rigs, 4 camera bodies, 3 lens optics, 6 LUTs, 24 niche generators, Script-to-Video AI, 10 art styles, Lyric Video Maker
- **Autonomous Agents & CapCut/HeyGen/Eromify Tools**: Clipping Agent, Autonomous Video Agent, Photo Avatar, Dual-Host AI Video Podcast, PPT-to-Video, Video Translate & Dub, AI Logo (SVG+PNG), Remove BG, Meme Maker, MP4 Compress
- **Image/Audio Suites & Native MCP Server**: 318 Edge-TTS voices, Voice Changer, Soul ID Vault, Mangaka Studio, JSON-RPC 2.0 MCP Server ([`backend/mcp_server.py`](backend/mcp_server.py)) + CLI ([`backend/omniviral_cli.py`](backend/omniviral_cli.py))

---

## Quick Start
```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
python -m pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000

# Frontend
cd frontend
npm install
npm run build
npm run start -- -p 3000
```
Open **Studio UI**: `http://localhost:3000` (press `Ctrl+K` for Command Palette) | **API Docs**: `http://127.0.0.1:8000/docs`
