@echo off
echo Starting AI Faceless Video Backend Engine...
cd /d "%~dp0backend"
set PYTHONPATH=%~dp0backend
call venv\Scripts\activate.bat
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
