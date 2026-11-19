@echo off
echo ========================================================
echo  Starting AI-Powered Faceless Video Automation Platform
echo  Zero-Cost Engine (Edge-TTS + FFmpeg + Groq/Templates)
echo ========================================================
start "OmniViral Backend API (FastAPI)" "%~dp0start_backend.bat"
start "OmniViral Studio (Next.js)" "%~dp0start_frontend.bat"
echo Services launched!
echo API docs: http://localhost:8000/docs
echo Web Studio: http://localhost:3000
pause
