# AI‑Powered Faceless Video Automation Platform

This repository is the starter code for a SaaS that automatically creates, schedules, and publishes faceless videos to TikTok, Instagram, and YouTube.

## Architecture Overview
- **Frontend** – Next.js (React, TypeScript) – UI for account setup, niche selection, video preview, scheduling, analytics.
- **Backend API** – FastAPI (Python) – orchestrates AI generation, video assembly, storage and social‑media publishing.
- **Background Workers** – Celery + Redis – long‑running AI/script generation and FFmpeg encoding.
- **Database** – PostgreSQL (hosted via Supabase/Railway).
- **Auth** – Supabase Auth (OAuth, email/password).
- **AI Services** – OpenAI GPT‑4o for script & thumbnail, ElevenLabs for TTS.
- **Video Assembly** – FFmpeg (run in Docker container).
- **Storage** – AWS S3 (or Cloudflare R2) for generated MP4s.
- **Payments** – Stripe Checkout for subscription plans.

## Quick Start
1. Install Docker Desktop.
2. Run `docker compose up --build` – brings up API, worker, Redis, and PostgreSQL.
3. In another terminal, `cd frontend && npm install && npm run dev`.
4. Create a Supabase project and add the URL/anon‑key to `.env`.
5. Add OpenAI, ElevenLabs, Stripe keys to `.env`.

## Development Scripts
- `scripts/generate_video.py` – Celery task that calls OpenAI → ElevenLabs → FFmpeg.
- `scripts/publish_social.py` – Handles OAuth token refresh and API calls to TikTok/IG/YouTube.

---
*This is only the scaffold – the actual AI logic, UI components and payment integration will be added in subsequent steps.*