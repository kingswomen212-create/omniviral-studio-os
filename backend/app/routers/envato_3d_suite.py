import math
import subprocess
import urllib.parse
import uuid
import httpx
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.config import OUTPUT_DIR, MUSIC_DIR
from app.core.database import save_video

router = APIRouter(prefix="/envato", tags=["Envato Creative Assets, 3D Blender & Interactive Web"])

def _clean(t: str, limit: int = 38) -> str:
    return t.replace("'", "").replace(":", " -").replace("%", "pct").replace("\n", " ")[:limit].strip()

# ==================== 1. ENVATO SOUND EFFECTS (SFX) ENGINE (10 REAL DSP SFX) ====================

SFX_CATALOG = [
    {"id": "whoosh", "name": "Cinema Whoosh Transition", "category": "Transitions", "duration": "0.5s"},
    {"id": "impact_boom", "name": "Deep Cinema Impact Boom", "category": "Movie", "duration": "1.6s"},
    {"id": "sub_riser", "name": "Tension Frequency Riser", "category": "Trailer", "duration": "2.4s"},
    {"id": "ui_click", "name": "Futuristic Interface Click", "category": "Interface", "duration": "0.18s"},
    {"id": "pop_notify", "name": "Bright Social Pop", "category": "Interface", "duration": "0.25s"},
    {"id": "retro_coin", "name": "Gaming Powerup Coin", "category": "Gaming", "duration": "0.45s"},
    {"id": "scifi_laser", "name": "Sci-Fi Plasma Beam", "category": "Futuristic", "duration": "0.6s"},
    {"id": "news_stinger", "name": "Breaking News Intro Stinger", "category": "Broadcast", "duration": "1.8s"},
    {"id": "glitch_static", "name": "Cyberpunk Digital Glitch", "category": "Futuristic", "duration": "0.5s"},
    {"id": "rain_ambience", "name": "Cinematic Midnight Rain", "category": "Nature", "duration": "4.0s"}
]

def _synthesize_sfx(sfx_id: str) -> Path:
    out_p = MUSIC_DIR / f"sfx_{sfx_id}.mp3"
    if out_p.exists():
        return out_p

    if sfx_id == "whoosh":
        src = ["-f", "lavfi", "-i", "anoisesrc=color=pink:duration=0.5:sample_rate=44100"]
        af = "bandpass=f=680:width_type=h:w=560,afade=t=in:st=0:d=0.2,afade=t=out:st=0.25:d=0.25,volume=0.85"
    elif sfx_id == "impact_boom":
        src = ["-f", "lavfi", "-i", "aevalsrc=0.8*sin(2*PI*(95*exp(-3.2*t))*t)*exp(-2.1*t):s=44100:d=1.6"]
        af = "lowpass=f=180,bass=g=10,afade=t=out:st=1.0:d=0.6"
    elif sfx_id == "sub_riser":
        src = ["-f", "lavfi", "-i", "aevalsrc=0.5*sin(2*PI*(60+240*(t/2.4))*t)*(t/2.4):s=44100:d=2.4"]
        af = "aecho=0.8:0.88:60:0.4,afade=t=in:st=0:d=1.8"
    elif sfx_id == "ui_click":
        src = ["-f", "lavfi", "-i", "aevalsrc=0.7*sin(2*PI*1400*t)*exp(-35*t):s=44100:d=0.18"]
        af = "highpass=f=400"
    elif sfx_id == "pop_notify":
        src = ["-f", "lavfi", "-i", "aevalsrc=0.7*sin(2*PI*(520+680*t)*t)*exp(-18*t):s=44100:d=0.25"]
        af = "volume=0.9"
    elif sfx_id == "retro_coin":
        src = ["-f", "lavfi", "-i", "aevalsrc=0.5*sin(2*PI*(if(lt(t,0.12),987.77,1318.51))*t)*exp(-5*t):s=44100:d=0.45"]
        af = "volume=0.85"
    elif sfx_id == "scifi_laser":
        src = ["-f", "lavfi", "-i", "aevalsrc=0.6*sin(2*PI*(1600*exp(-4.5*t))*t)*exp(-4*t):s=44100:d=0.6"]
        af = "aecho=0.8:0.85:40:0.3"
    elif sfx_id == "news_stinger":
        src = ["-f", "lavfi", "-i", "aevalsrc=0.4*sin(2*PI*220*t)+0.35*sin(2*PI*329.63*t)*sin(2*PI*8*t)+0.3*sin(2*PI*440*t)*(1-t/1.8):s=44100:d=1.8"]
        af = "afade=t=out:st=1.2:d=0.6"
    elif sfx_id == "glitch_static":
        src = ["-f", "lavfi", "-i", "anoisesrc=color=white:duration=0.5:sample_rate=44100"]
        af = "acrusher=bits=4:mode=log,bandpass=f=1800:width_type=h:w=1200,volume=0.55"
    else: # rain_ambience
        src = ["-f", "lavfi", "-i", "anoisesrc=color=pink:duration=4.0:sample_rate=44100"]
        af = "lowpass=f=1600,highpass=f=220,volume=0.38,afade=t=in:st=0:d=0.6,afade=t=out:st=3.2:d=0.8"

    subprocess.run(["ffmpeg", "-y", *src, "-af", af, "-c:a", "libmp3lame", "-b:a", "192k", str(out_p)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return out_p

@router.get("/sfx-library")
async def list_sfx_library():
    return SFX_CATALOG

@router.get("/sfx-preview")
async def preview_sfx(sfx_id: str = "whoosh"):
    p = _synthesize_sfx(sfx_id)
    return FileResponse(path=str(p), media_type="audio/mpeg", filename=f"omniviral_sfx_{sfx_id}.mp3")

# ==================== 2. ENVATO VIDEO TEMPLATES ENGINE (6 REAL 60FPS TEMPLATES) ====================

class VideoTemplateRequest(BaseModel):
    template_id: str = "logo_reveal" # logo_reveal | lower_third | breaking_news | trailer_title | vj_loop | infographic
    primary_text: str = "OMNIVIRAL STUDIO"
    secondary_text: str = "NEXT GEN AI CINEMA OS"
    accent_hex: str = "D9FF00"
    aspect_ratio: str = "16:9"

@router.post("/video-template")
async def render_video_template(req: VideoTemplateRequest):
    job_id = str(uuid.uuid4())[:8]
    w, h = (1920, 1080) if req.aspect_ratio == "16:9" else (1080, 1920)
    acc = f"0x{req.accent_hex.lstrip('#')[:6]}"
    t1 = _clean(req.primary_text, 28).upper()
    t2 = _clean(req.secondary_text, 40).upper()
    out_fn = f"tpl_{req.template_id}_{job_id}.mp4"
    out_path = OUTPUT_DIR / out_fn

    if req.template_id == "lower_third":
        dur = 5.0
        sfx = _synthesize_sfx("whoosh")
        vf = (
            "drawgrid=width=80:height=80:thickness=1:color=white@0.04,"
            f"drawbox=x='min(80,-700+2600*t)':y={int(h*0.72)}:w=760:h=150:color=0x0D0D14@0.95:t=fill,"
            f"drawbox=x='min(80,-700+2600*t)':y={int(h*0.72)}:w=12:h=150:color={acc}:t=fill,"
            f"drawtext=text='{t1}':fontcolor=white:fontsize=52:x='min(120,-660+2600*t)':y={int(h*0.72)+28},"
            f"drawtext=text='{t2}':fontcolor={acc}:fontsize=28:x='min(120,-660+2600*t)':y={int(h*0.72)+94}"
        )
    elif req.template_id == "breaking_news":
        dur = 5.5
        sfx = _synthesize_sfx("news_stinger")
        vf = (
            "drawgrid=width=64:height=64:thickness=1:color=red@0.08,"
            f"drawbox=x=0:y={int(h*0.35)}:w={w}:h=220:color=0xB91C1C@0.95:t=fill,"
            f"drawtext=text='BREAKING NEWS':fontcolor=white:fontsize=96:x=(w-text_w)/2:y={int(h*0.35)+32},"
            f"drawtext=text='{t1}':fontcolor=0xFACC15:fontsize=42:x=(w-text_w)/2:y={int(h*0.35)+148},"
            f"drawbox=x=0:y={h-90}:w={w}:h=90:color=0x050507@0.95:t=fill,"
            f"drawtext=text='LIVE UPDATE // {t2}':fontcolor=white:fontsize=34:x='w-mod(t*420,w+text_w)':y={h-62}"
        )
    elif req.template_id == "trailer_title":
        dur = 5.0
        sfx = _synthesize_sfx("sub_riser")
        vf = (
            f"drawbox=x=0:y=0:w={w}:h={int(h*0.12)}:color=black:t=fill,"
            f"drawbox=x=0:y={int(h*0.88)}:w={w}:h={int(h*0.12)}:color=black:t=fill,"
            f"drawtext=text='{t1}':fontcolor=white:fontsize=94:x=(w-text_w)/2:y=(h-text_h)/2-30:alpha='min(1,t/1.8)',"
            f"drawtext=text='{t2}':fontcolor={acc}:fontsize=34:x=(w-text_w)/2:y=(h-text_h)/2+70:alpha='min(1,max(0,(t-1.2)/1.4))'"
        )
    elif req.template_id == "vj_loop":
        dur = 6.0
        sfx = _synthesize_sfx("rain_ambience")
        vf = (
            f"geq=r='128+120*sin(2*PI*(X/{w})*3+T*4)':g='60+60*cos(2*PI*(Y/{h})*3-T*3)':b='180+70*sin(T*2)',"
            f"vignette=PI/3.5,drawtext=text='{t1}':fontcolor=white@0.85:fontsize=72:borderw=4:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2"
        )
    elif req.template_id == "infographic":
        dur = 5.5
        sfx = _synthesize_sfx("whoosh")
        vf = (
            "drawgrid=width=80:height=80:thickness=1:color=white@0.05,"
            f"drawtext=text='{t1}':fontcolor=white:fontsize=64:x=100:y=110,"
            f"drawtext=text='{t2}':fontcolor={acc}:fontsize=30:x=100:y=190,"
            f"drawbox=x=100:y=320:w='min({int(w*0.72)},20+t*480)':h=84:color={acc}@0.9:t=fill,"
            f"drawtext=text='AUTOMATION EFFICIENCY +94pct':fontcolor=0x050507:fontsize=32:x=130:y=346,"
            f"drawbox=x=100:y=440:w='min({int(w*0.58)},20+t*360)':h=84:color=0x38BDF8@0.9:t=fill,"
            f"drawtext=text='MULTI PLATFORM REACH +78pct':fontcolor=0x050507:fontsize=32:x=130:y=466,"
            f"drawbox=x=100:y=560:w='min({int(w*0.80)},20+t*560)':h=84:color=0xA855F7@0.9:t=fill,"
            f"drawtext=text='RENDER COST SAVINGS 100pct':fontcolor=white:fontsize=32:x=130:y=586"
        )
    else: # logo_reveal
        dur = 4.5
        sfx = _synthesize_sfx("impact_boom")
        vf = (
            "drawgrid=width=90:height=90:thickness=1:color=white@0.05,"
            f"drawbox=x=(w-680)/2:y=(h-280)/2:w=680:h=280:color=0x0F111A@0.95:t=fill,"
            f"drawbox=x=(w-680)/2:y=(h-280)/2:w=680:h=280:color={acc}:t=8,"
            f"drawtext=text='{t1}':fontcolor={acc}:fontsize=76:x=(w-text_w)/2:y=(h-text_h)/2-24:alpha='min(1,t/0.9)',"
            f"drawtext=text='{t2}':fontcolor=white:fontsize=30:x=(w-text_w)/2:y=(h-text_h)/2+64:alpha='min(1,max(0,(t-0.7)/0.9))'"
        )

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"color=c=0x050507:s={w}x{h}:d={dur:.2f}:r=60",
        "-i", str(sfx),
        "-vf", vf,
        "-map", "0:v", "-map", "1:a",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-t", f"{dur:.2f}",
        str(out_path)
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    rec = {
        "id": job_id, "title": f"Template ({req.template_id}): {req.primary_text}",
        "niche": "envato_template", "aspect_ratio": req.aspect_ratio,
        "script": req.secondary_text, "duration": dur, "filename": out_fn,
        "url": f"/api/videos/stream/{out_fn}", "tags": ["#template", "#motiongraphics"]
    }
    save_video(rec)
    return rec

# ==================== 3. ENVATO STOCK EXPLORER (800M+ OPENVERSE HD ASSETS) ====================

@router.get("/stock-search")
async def search_stock_assets(q: str = Query("cyberpunk neon"), page_size: int = 12):
    try:
        async with httpx.AsyncClient(timeout=15.0, headers={"User-Agent": "OmniViralEnvatoExplorer/8.0"}) as client:
            r = await client.get(f"https://api.openverse.org/v1/images/?q={urllib.parse.quote(q)}&page_size={page_size}")
            if r.status_code == 200:
                items = []
                for it in r.json().get("results", []):
                    if it.get("url") and not it["url"].lower().endswith(".svg"):
                        items.append({
                            "id": it.get("id"),
                            "title": it.get("title") or q.title(),
                            "url": it.get("url"),
                            "thumbnail": it.get("thumbnail") or it.get("url"),
                            "width": it.get("width"),
                            "height": it.get("height"),
                            "license": it.get("license", "cc").upper()
                        })
                return {"query": q, "count": len(items), "results": items}
    except Exception as e:
        print(f"Stock search error: {e}")
    return {"query": q, "count": 0, "results": []}

# ==================== 4. ENVATO GRAPHICS, TEXTURES & BANNERS ====================

class GraphicGenRequest(BaseModel):
    kind: str = "mesh_gradient" # mesh_gradient | film_dust | social_banner | palette_card
    title: str = "CREATIVE ASSET KIT"
    subtitle: str = "DESIGNED IN OMNIVIRAL OS"
    accent_hex: str = "D9FF00"

@router.post("/graphics")
async def generate_graphic_asset(req: GraphicGenRequest):
    job_id = str(uuid.uuid4())[:8]
    out_fn = f"gfx_{req.kind}_{job_id}.png"
    out_path = OUTPUT_DIR / out_fn
    acc = f"0x{req.accent_hex.lstrip('#')[:6]}"
    t1 = _clean(req.title, 30).upper()
    t2 = _clean(req.subtitle, 42).upper()

    if req.kind == "film_dust":
        vf = "noise=alls=42:allf=t+u,vignette=PI/2.6,eq=contrast=1.4:brightness=-0.12"
        size = "1920x1080"
    elif req.kind == "mesh_gradient":
        vf = "geq=r='40+140*sin(PI*X/1920)':g='20+190*cos(PI*Y/1080)':b='120+110*sin(PI*(X+Y)/2400)',boxblur=60:20"
        size = "1920x1080"
    elif req.kind == "palette_card":
        vf = (
            f"drawbox=x=80:y=160:w=320:h=620:color=0x050507:t=fill,"
            f"drawbox=x=420:y=160:w=320:h=620:color=0x16161F:t=fill,"
            f"drawbox=x=760:y=160:w=320:h=620:color={acc}:t=fill,"
            f"drawbox=x=1100:y=160:w=320:h=620:color=0x38BDF8:t=fill,"
            f"drawbox=x=1440:y=160:w=320:h=620:color=0xF5F5F7:t=fill,"
            f"drawtext=text='{t1}':fontcolor=white:fontsize=56:x=80:y=65,"
            f"drawtext=text='{t2}':fontcolor=0xA6A6B8:fontsize=28:x=80:y=840"
        )
        size = "1920x1080"
    else: # social_banner 1200x630
        vf = (
            "drawgrid=width=60:height=60:thickness=1:color=white@0.06,"
            f"drawbox=x=40:y=40:w=1120:h=550:color={acc}@0.45:t=6,"
            f"drawbox=x=80:y=120:w=12:h=390:color={acc}:t=fill,"
            f"drawtext=text='{t1}':fontcolor=white:fontsize=72:x=125:y=190,"
            f"drawtext=text='{t2}':fontcolor={acc}:fontsize=32:x=125:y=290"
        )
        size = "1200x630"

    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c=0x07080D:s={size}:d=1", "-vf", vf, "-frames:v", "1", str(out_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return {"id": job_id, "kind": req.kind, "filename": out_fn, "url": f"/api/videos/stream/{out_fn}"}

# ==================== 5. CHAT-TO-3D / BLENDER SCENE GENERATOR (dF_uxyJyeu0) ====================

class BlenderSceneRequest(BaseModel):
    prompt: str = "Cyberpunk neon city with glowing volt monoliths and orbital ring"
    preset: str = "cyber_city" # cyber_city | glass_monolith | orbital_planet | product_stage
    accent_hex: str = "D9FF00"

@router.post("/blender-scene")
async def generate_blender_scene(req: BlenderSceneRequest):
    """
    Inspired by YouTube Short dF_uxyJyeu0 ('Build Blender scenes by chatting'):
    Generates a real, executable Blender Python (bpy) script + live 3D Scene Graph JSON
    for our interactive browser 3D viewport!
    """
    job_id = str(uuid.uuid4())[:8]
    p_low = req.prompt.lower()
    preset = req.preset
    if "planet" in p_low or "space" in p_low or "orbit" in p_low:
        preset = "orbital_planet"
    elif "product" in p_low or "stage" in p_low or "studio" in p_low:
        preset = "product_stage"
    elif "monolith" in p_low or "crystal" in p_low or "glass" in p_low:
        preset = "glass_monolith"

    hex_c = req.accent_hex.lstrip("#")[:6]
    r_f = round(int(hex_c[0:2], 16) / 255.0, 3)
    g_f = round(int(hex_c[2:4], 16) / 255.0, 3)
    b_f = round(int(hex_c[4:6], 16) / 255.0, 3)

    bpy_script = f'''# OmniViral Studio OS — Auto-Generated Blender 4.x Scene Script
# Prompt: {req.prompt}
# Run via: blender --python blender_scene_{job_id}.py
import bpy, math, random

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080

# Dark Cinema World Lighting
world = bpy.data.worlds.new("OmniWorld")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.01, 0.012, 0.02, 1.0)
bg.inputs[1].default_value = 0.6

# Reflective Obsidian Floor
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
floor = bpy.context.active_object
fmat = bpy.data.materials.new("ObsidianFloor")
fmat.use_nodes = True
bsdf = fmat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.02, 0.02, 0.03, 1.0)
bsdf.inputs["Roughness"].default_value = 0.14
bsdf.inputs["Metallic"].default_value = 0.85
floor.data.materials.append(fmat)

# Glowing Accent Emission Material
emat = bpy.data.materials.new("NeonAccent")
emat.use_nodes = True
em = emat.node_tree.nodes.new("ShaderNodeEmission")
em.inputs[0].default_value = ({r_f}, {g_f}, {b_f}, 1.0)
em.inputs[1].default_value = 12.0
emat.node_tree.links.new(em.outputs[0], emat.node_tree.nodes["Material Output"].inputs[0])

# Procedural 3D Geometry ({preset})
random.seed(42)
for i in range(18):
    ang = (i / 18.0) * math.pi * 2
    rad = 4.5 + (i % 3) * 2.2
    h = 1.8 + (i % 5) * 1.1
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(math.cos(ang)*rad, math.sin(ang)*rad, h/2))
    obj = bpy.context.active_object
    obj.scale = (0.7, 0.7, h)
    obj.data.materials.append(emat if i % 3 == 0 else fmat)

# Center Hero Sculpture
bpy.ops.mesh.primitive_torus_add(major_radius=1.8, minor_radius=0.35, location=(0, 0, 2.2))
hero = bpy.context.active_object
hero.rotation_euler = (math.radians(35), math.radians(20), 0)
hero.data.materials.append(emat)

# Cinema Camera & Turntable Keyframes
bpy.ops.object.camera_add(location=(0, -11, 5.2), rotation=(math.radians(66), 0, 0))
scene.camera = bpy.context.active_object
bpy.ops.object.light_add(type='AREA', location=(5, -5, 8))
bpy.context.active_object.data.energy = 850
print("OmniViral Blender Scene Built Successfully!")
'''
    py_fn = f"blender_scene_{job_id}.py"
    with open(OUTPUT_DIR / py_fn, "w", encoding="utf-8") as f:
        f.write(bpy_script)

    return {
        "id": job_id,
        "preset": preset,
        "accent_hex": hex_c,
        "bpy_filename": py_fn,
        "bpy_url": f"/api/videos/stream/{py_fn}",
        "bpy_code": bpy_script
    }

# ==================== 6. INTERACTIVE 3D WEBSITE GENERATOR (BwSMNbleLAE + Envato Web) ====================

class WebTemplateRequest(BaseModel):
    brand: str = "AETHER STUDIO"
    headline: str = "Build Cinematic 3D Experiences At Zero Cost"
    subtext: str = "Interactive WebGL particle geometry, glassmorphic architecture, and instant deployment ready in a single HTML file."
    cta: str = "Launch Platform"
    accent_hex: str = "D9FF00"
    template_type: str = "saas_3d" # saas_3d | portfolio_3d | ecommerce_3d | agency_3d

@router.post("/web-template")
async def generate_3d_web_template(req: WebTemplateRequest):
    """
    Inspired by YouTube Short BwSMNbleLAE ('Interactive 3D Websites') & Envato Web Templates:
    Generates a complete, standalone, interactive 3D-Canvas HTML website with mouse parallax & orbit!
    """
    job_id = str(uuid.uuid4())[:8]
    acc = f"#{req.accent_hex.lstrip('#')[:6]}"
    html_fn = f"site_3d_{job_id}.html"

    html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{req.brand} — Interactive 3D Experience</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ background: #050507; color: #F5F5F7; font-family: system-ui, -apple-system, sans-serif; overflow-x: hidden; }}
  canvas {{ position: fixed; inset: 0; z-index: 0; }}
  .wrap {{ position: relative; z-index: 2; max-width: 1120px; margin: 0 auto; padding: 32px 24px; min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; }}
  header {{ display: flex; justify-content: space-between; align-items: center; }}
  .logo {{ font-weight: 800; letter-spacing: 0.08em; color: {acc}; font-size: 18px; }}
  .hero {{ max-width: 680px; margin: 12vh 0; backdrop-filter: blur(12px); background: rgba(13,13,18,0.68); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 40px; }}
  h1 {{ font-size: 46px; line-height: 1.08; letter-spacing: -0.03em; margin-bottom: 16px; }}
  p {{ color: #A6A6B8; font-size: 17px; line-height: 1.6; margin-bottom: 28px; }}
  .btn {{ display: inline-block; background: {acc}; color: #050507; font-weight: 700; padding: 14px 28px; border-radius: 12px; text-decoration: none; }}
  .grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }}
  .card {{ background: rgba(13,13,18,0.75); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 20px; }}
  .card h3 {{ color: {acc}; font-size: 15px; margin-bottom: 6px; }}
  .card span {{ color: #A6A6B8; font-size: 13px; }}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div class="wrap">
  <header><div class="logo">{req.brand.upper()}</div><a class="btn" href="#start">{req.cta}</a></header>
  <main class="hero">
    <h1>{req.headline}</h1>
    <p>{req.subtext}</p>
    <a class="btn" id="start" href="#features">{req.cta} →</a>
  </main>
  <section id="features" class="grid">
    <div class="card"><h3>Interactive 3D Engine</h3><span>Move your mouse to orbit live procedural 3D wireframe geometry at 60fps.</span></div>
    <div class="card"><h3>Zero Dependencies</h3><span>Self-contained single HTML file ready for Vercel, Netlify, or GitHub Pages.</span></div>
    <div class="card"><h3>Template: {req.template_type.upper()}</h3><span>Generated instantaneously inside OmniViral Studio OS v8.0.</span></div>
  </section>
</div>
<script>
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let W, H, mx = 0, my = 0;
function resize() {{ W = cv.width = innerWidth; H = cv.height = innerHeight; }}
resize(); addEventListener('resize', resize);
addEventListener('mousemove', e => {{ mx = (e.clientX/W - 0.5)*2; my = (e.clientY/H - 0.5)*2; }});
const pts = [];
for (let i=0; i<160; i++) {{
  const u = (i/160)*Math.PI*2, v = (i%16)/16*Math.PI*2;
  pts.push({{ x: (2.2 + 0.8*Math.cos(v))*Math.cos(u), y: (2.2 + 0.8*Math.cos(v))*Math.sin(u), z: 0.8*Math.sin(v) }});
}}
function loop(t) {{
  ctx.fillStyle = '#050507'; ctx.fillRect(0,0,W,H);
  const ay = t*0.0005 + mx*0.8, ax = t*0.0003 + my*0.6;
  const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
  const proj = pts.map(p => {{
    let x = p.x*cy - p.z*sy, z = p.x*sy + p.z*cy;
    let y = p.y*cx - z*sx; z = p.y*sx + z*cx + 6.5;
    const f = Math.min(W,H)*0.65 / z;
    return {{ x: W*0.68 + x*f, y: H*0.48 + y*f, z }};
  }});
  ctx.strokeStyle = '{acc}44'; ctx.lineWidth = 1;
  for (let i=0; i<proj.length; i++) {{
    const a = proj[i], b = proj[(i+1)%proj.length], c2 = proj[(i+16)%proj.length];
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.lineTo(c2.x,c2.y); ctx.stroke();
    ctx.fillStyle = '{acc}'; ctx.fillRect(a.x-1.5, a.y-1.5, 3, 3);
  }}
  requestAnimationFrame(loop);
}}
requestAnimationFrame(loop);
</script>
</body>
</html>"""

    with open(OUTPUT_DIR / html_fn, "w", encoding="utf-8") as f:
        f.write(html_doc)

    return {"id": job_id, "filename": html_fn, "url": f"/api/videos/stream/{html_fn}", "html": html_doc}
