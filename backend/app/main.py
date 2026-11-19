from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import videos, scripts, voices, schedule, studio_tools, super_suite, envato_3d_suite, motion_studio, engine_studio

app = FastAPI(
    title="OmniViral Studio OS v11.0 — Real AI Video Diffusion, 4K Cinema Footage & GPU Render OS",
    description="All-in-One Creative AI OS: Real Generative Video Diffusion (Seedance/Kling/Wan/MiniMax), 4K Moving Stock Video (Pexels/Pixabay), FLUX.1, 60fps Commercial Motion, GPU Render Engine & Agent Two.",
    version="11.0.0"
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
app.include_router(envato_3d_suite.router, prefix="/api")
app.include_router(motion_studio.router, prefix="/api")
app.include_router(engine_studio.router, prefix="/api")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "11.0.0",
        "suites": [
            "image", "video", "audio", "studios", "hyperframes", "agents",
            "utilities", "envato_assets", "3d_blender", "3d_web",
            "commercial_motion", "agent_two_render_engine", "pro_upscaler", "mcp"
        ],
        "zero_cost_tts": "edge-tts (318 voices)",
        "video_renderer": "GPU Hardware (AMF/MF) + FidelityFX CAS + Deband + Halation + BT.709 + 48kHz -14 LUFS"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
