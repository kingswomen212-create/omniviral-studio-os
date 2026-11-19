from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import videos, scripts, voices, schedule, studio_tools, super_suite

app = FastAPI(
    title="OmniViral Studio OS v7.0 — Higgsfield × AITuber × HyperFrames × CapCut × Eromify × HeyGen",
    description="Zero-Cost All-in-One Creative AI Operating System & MCP Engine.",
    version="7.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videos.router, prefix="/api")
app.include_router(scripts.router, prefix="/api")
app.include_router(voices.router, prefix="/api")
app.include_router(schedule.router, prefix="/api")
app.include_router(studio_tools.router, prefix="/api")
app.include_router(super_suite.router, prefix="/api")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "7.0.0",
        "suites": ["image", "video", "audio", "studios", "hyperframes", "agents", "utilities", "mcp"],
        "zero_cost_tts": "edge-tts (318 voices)",
        "video_renderer": "ffmpeg 7.1 + 60fps + 4K + sidechain + -14 LUFS"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
