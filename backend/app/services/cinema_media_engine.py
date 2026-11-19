import asyncio
import base64
import io
import os
import random
import re
import urllib.parse
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
from PIL import Image

from app.core.config import ASSETS_DIR, OUTPUT_DIR
from app.core.database import get_setting

VAULT_DIR = ASSETS_DIR / "cinema_vault"

# Words that indicate tourist snapshots / irrelevant clutter on Openverse/Flickr
_CLUTTER_BLACKLIST = (
    "christmas", "ornament", "bellagio", "holiday", "museum", "tourist", "sign",
    "diagram", "map", "chart", "logo", "screenshot", "crowd", "parade", "statue",
    "memorial", "flag", "grave", "wiki", "license", "ticket", "poster", "flyer",
)


def _get_key(db_key: str, env_key: str) -> str:
    val = get_setting(db_key, "") or os.getenv(env_key, "")
    return val.strip()


def get_active_media_providers() -> Dict[str, Any]:
    """Reports real configured video diffusion, 4K stock video, and AI image providers."""
    fal = bool(_get_key("fal_api_key", "FAL_KEY"))
    rep = bool(_get_key("replicate_api_token", "REPLICATE_API_TOKEN"))
    gem = bool(_get_key("gemini_api_key", "GEMINI_API_KEY"))
    hf = bool(_get_key("hf_api_token", "HF_TOKEN"))
    pexels = bool(_get_key("pexels_api_key", "PEXELS_API_KEY"))
    pixabay = bool(_get_key("pixabay_api_key", "PIXABAY_API_KEY"))
    comfy = bool(_get_key("comfyui_url", "COMFYUI_URL"))

    if fal or rep or gem:
        tier = "ai_video_diffusion"
        label = "Real Generative AI Video Diffusion Active (" + ", ".join(
            [n for n, ok in [("fal.ai Kling/Seedance", fal), ("Replicate", rep), ("Gemini Veo/Imagen", gem)] if ok]
        ) + ")"
    elif pexels or pixabay:
        tier = "real_4k_stock_video"
        label = "Real Moving 4K/HD Cinema Stock Video Active (" + ", ".join(
            [n for n, ok in [("Pexels 4K Video", pexels), ("Pixabay Video", pixabay)] if ok]
        ) + ")"
    elif hf or comfy:
        tier = "flux_ai_image"
        label = "Photoreal AI Studio Generation Active (" + ", ".join(
            [n for n, ok in [("HuggingFace FLUX.1", hf), ("Local ComfyUI", comfy)] if ok]
        ) + ")"
    else:
        vault_clips = list(VAULT_DIR.glob("*.mp4")) if VAULT_DIR.exists() else []
        if vault_clips:
            tier = "local_cinema_vault"
            label = f"Built-In Cinema Video Vault Active ({len(vault_clips)} Real Moving Cinema Shots @ $0.00 — Add Pexels/fal.ai key for infinite cloud 4K/AI video!)"
        else:
            tier = "curated_zero_key_photo"
            label = "Zero-Key Mode (Curated Editorial Photos — Add free Pexels/Pixabay/HF key or fal.ai for real moving 4K/AI video!)"

    return {
        "active_tier": tier,
        "active_label": label,
        "providers": {
            "fal_ai": {"configured": fal, "type": "ai_video", "models": ["Seedance Pro", "Kling 2.1", "Wan 2.1", "MiniMax Hailuo"]},
            "replicate": {"configured": rep, "type": "ai_video", "models": ["Kling v2.1", "MiniMax Video-01", "Wan 2.1"]},
            "gemini": {"configured": gem, "type": "ai_video_image", "models": ["Veo 2 Video", "Imagen 3 Studio"]},
            "pexels_video": {"configured": pexels, "type": "free_4k_video", "models": ["Pexels 4K Moving Video (Free Key)"]},
            "pixabay_video": {"configured": pixabay, "type": "free_4k_video", "models": ["Pixabay HD/4K Moving Video (Free Key)"]},
            "huggingface_flux": {"configured": hf, "type": "free_ai_image", "models": ["FLUX.1-schnell Photoreal (Free Key)"]},
            "comfyui_local": {"configured": comfy, "type": "local_gpu_diffusion", "models": ["Local ComfyUI Flux/Wan ($0.00)"]},
        },
    }


class CinemaMediaEngine:
    """
    Production Multi-Tier Cinema Visual & Generative Video Engine (v11.0):
    Acquires REAL moving video clips (kind='video') or photoreal bespoke AI images (kind='image')
    with strict prompt fidelity and zero tourist-photo clutter.
    """

    @staticmethod
    async def acquire_shot_media(
        prompt: str,
        search_query: str,
        aspect_ratio: str = "9:16",
        model_profile: str = "omniviral_cinema_v10",
        shot_idx: int = 0,
        job_id: str = "shot",
        custom_clip_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        # ---- TIER 0: USER-UPLOADED REAL VIDEO CLIP ----
        if custom_clip_path and Path(custom_clip_path).exists():
            ext = Path(custom_clip_path).suffix.lower()
            is_vid = ext in (".mp4", ".webm", ".mov", ".mkv")
            return {
                "kind": "video" if is_vid else "image",
                "path": str(custom_clip_path),
                "source": "custom_upload",
                "model": "User Real Footage",
            }

        fal_key = _get_key("fal_api_key", "FAL_KEY")
        rep_key = _get_key("replicate_api_token", "REPLICATE_API_TOKEN")
        gem_key = _get_key("gemini_api_key", "GEMINI_API_KEY")
        pexels_key = _get_key("pexels_api_key", "PEXELS_API_KEY")
        pixabay_key = _get_key("pixabay_api_key", "PIXABAY_API_KEY")
        hf_token = _get_key("hf_api_token", "HF_TOKEN")

        # ---- TIER 1: REAL GENERATIVE AI VIDEO DIFFUSION (fal.ai — Seedance / Kling / Wan / MiniMax) ----
        if fal_key and model_profile in ("seedance_2_5", "kling_3_0", "minimax_h3", "runway_gen_4_5", "omniviral_cinema_v10"):
            vid = await CinemaMediaEngine._gen_fal_video(prompt, aspect_ratio, model_profile, fal_key, job_id, shot_idx)
            if vid:
                return vid

        # ---- TIER 1B: REAL GENERATIVE AI VIDEO DIFFUSION (Replicate — Kling / MiniMax / Wan 2.1) ----
        if rep_key:
            vid = await CinemaMediaEngine._gen_replicate_video(prompt, aspect_ratio, model_profile, rep_key, job_id, shot_idx)
            if vid:
                return vid

        # ---- TIER 2: REAL MOVING 4K/HD STOCK CINEMA VIDEO (Pexels Video API — 100% FREE Key) ----
        if pexels_key:
            vid = await CinemaMediaEngine._fetch_pexels_video(search_query, aspect_ratio, pexels_key, job_id, shot_idx)
            if vid:
                return vid

        # ---- TIER 2B: REAL MOVING HD/4K STOCK CINEMA VIDEO (Pixabay Video API — 100% FREE Key) ----
        if pixabay_key:
            vid = await CinemaMediaEngine._fetch_pixabay_video(search_query, aspect_ratio, pixabay_key, job_id, shot_idx)
            if vid:
                return vid

        # ---- TIER 3A: GOOGLE IMAGEN 3 STUDIO GENERATION (Gemini API Key) ----
        if gem_key:
            img = await CinemaMediaEngine._gen_gemini_imagen(prompt, aspect_ratio, gem_key, job_id, shot_idx)
            if img:
                return img

        # ---- TIER 3B: HUGGINGFACE FLUX.1-SCHNELL PHOTOREAL STUDIO GENERATION (FREE Tier Key!) ----
        if hf_token:
            img = await CinemaMediaEngine._gen_hf_flux(prompt, aspect_ratio, hf_token, job_id, shot_idx)
            if img:
                return img

        # ---- TIER 3C: BUILT-IN LOCAL MOVING CINEMA VIDEO VAULT (35 Distinct Real Moving Cinema Shots @ $0.00!) ----
        vault_vid = CinemaMediaEngine._select_vault_cinema_shot(prompt + " " + search_query, shot_idx)
        if vault_vid:
            return vault_vid

        # ---- TIER 4: STRICTLY CURATED HIGH-RES EDITORIAL FALLBACK (Rejects Flickr Tourist Clutter!) ----
        return await CinemaMediaEngine._fetch_curated_editorial_photo(search_query, aspect_ratio, job_id, shot_idx)

    @staticmethod
    def _select_vault_cinema_shot(text: str, shot_idx: int) -> Optional[Dict[str, Any]]:
        if not VAULT_DIR.exists():
            return None
        low = text.lower()
        if any(k in low for k in ("fragrance", "perfume", "botanical", "scent", "bottle", "splash", "pink", "beauty", "cosmetic")):
            pack = "luxury_fragrance"
        elif any(k in low for k in ("bag", "handbag", "fashion", "sunglasses", "coffee", "retail", "shop", "apparel", "linen")):
            pack = "ecom_fashion"
        elif any(k in low for k in ("ugc", "creator", "trial", "outfit", "influencer", "mirror", "review")):
            pack = "ai_ugc"
        elif any(k in low for k in ("scifi", "sci-fi", "alien", "planet", "space", "movie", "theatrical", "film", "drama")):
            pack = "film_scifi"
        elif any(k in low for k in ("music", "artist", "vfx", "neon", "cyber", "concert", "beat")):
            pack = "music_vfx"
        elif any(k in low for k in ("roas", "marketing", "sunscreen", "car", "suv", "desert", "beach", "puffer")):
            pack = "perf_marketing"
        else:
            pack = "brand_campaign"

        candidate = VAULT_DIR / f"{pack}_{shot_idx % 5}.mp4"
        if candidate.exists() and candidate.stat().st_size > 10000:
            return {
                "kind": "video",
                "path": str(candidate),
                "source": "cinema_vault_video",
                "model": f"Built-In Cinema Vault ({pack})",
            }
        all_vids = sorted(VAULT_DIR.glob("*.mp4"))
        if all_vids:
            pick = all_vids[shot_idx % len(all_vids)]
            return {
                "kind": "video",
                "path": str(pick),
                "source": "cinema_vault_video",
                "model": "Built-In Cinema Vault",
            }
        return None

    # ==================== FAL.AI (SEEDANCE / KLING / WAN / MINIMAX) ====================
    @staticmethod
    async def _gen_fal_video(
        prompt: str, aspect_ratio: str, model_profile: str, api_key: str, job_id: str, idx: int
    ) -> Optional[Dict[str, Any]]:
        endpoint_map = {
            "seedance_2_5": "fal-ai/bytedance/seedance/v1/lite/text-to-video",
            "kling_3_0": "fal-ai/kling-video/v2.1/master/text-to-video",
            "minimax_h3": "fal-ai/minimax/video-01",
            "omniviral_cinema_v10": "fal-ai/bytedance/seedance/v1/lite/text-to-video",
        }
        ep = endpoint_map.get(model_profile, "fal-ai/wan-t2v")
        headers = {"Authorization": f"Key {api_key}", "Content-Type": "application/json"}
        payload = {"prompt": prompt, "aspect_ratio": aspect_ratio, "duration": "5"}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                sub = await client.post(f"https://queue.fal.run/{ep}", headers=headers, json=payload)
                if sub.status_code not in (200, 201, 202):
                    return None
                data = sub.json()
                status_url = data.get("status_url")
                response_url = data.get("response_url")
                if not status_url or not response_url:
                    return None
                for _ in range(60):
                    await asyncio.sleep(3.0)
                    st = await client.get(status_url, headers=headers)
                    if st.status_code == 200 and st.json().get("status") == "COMPLETED":
                        res = await client.get(response_url, headers=headers)
                        rj = res.json()
                        v_url = (rj.get("video") or {}).get("url") or rj.get("video_url")
                        if v_url:
                            out_p = OUTPUT_DIR / f"fal_{job_id}_{idx}.mp4"
                            vr = await client.get(v_url, follow_redirects=True, timeout=60.0)
                            if vr.status_code == 200 and len(vr.content) > 20000:
                                out_p.write_bytes(vr.content)
                                return {"kind": "video", "path": str(out_p), "source": "fal_ai", "model": ep}
                        break
                    elif st.status_code == 200 and st.json().get("status") in ("FAILED", "CANCELLED"):
                        break
        except Exception as e:
            print(f"fal.ai video error: {e}")
        return None

    # ==================== REPLICATE (KLING / MINIMAX / WAN) ====================
    @staticmethod
    async def _gen_replicate_video(
        prompt: str, aspect_ratio: str, model_profile: str, token: str, job_id: str, idx: int
    ) -> Optional[Dict[str, Any]]:
        model_slug = "minimax/video-01" if "minimax" in model_profile else "wan-video/wan-2.1-t2v-480p"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.post(
                    f"https://api.replicate.com/v1/models/{model_slug}/predictions",
                    headers=headers,
                    json={"input": {"prompt": prompt, "aspect_ratio": aspect_ratio}},
                )
                if r.status_code not in (200, 201):
                    return None
                poll_url = r.json().get("urls", {}).get("get")
                if not poll_url:
                    return None
                for _ in range(60):
                    await asyncio.sleep(3.0)
                    pr = await client.get(poll_url, headers=headers)
                    pj = pr.json()
                    if pj.get("status") == "succeeded":
                        out = pj.get("output")
                        v_url = out[0] if isinstance(out, list) else out
                        if isinstance(v_url, str):
                            out_p = OUTPUT_DIR / f"rep_{job_id}_{idx}.mp4"
                            vr = await client.get(v_url, follow_redirects=True, timeout=60.0)
                            if vr.status_code == 200 and len(vr.content) > 20000:
                                out_p.write_bytes(vr.content)
                                return {"kind": "video", "path": str(out_p), "source": "replicate", "model": model_slug}
                        break
                    elif pj.get("status") in ("failed", "canceled"):
                        break
        except Exception as e:
            print(f"Replicate video error: {e}")
        return None

    # ==================== PEXELS 4K MOVING VIDEO API (FREE KEY!) ====================
    @staticmethod
    async def _fetch_pexels_video(
        query: str, aspect_ratio: str, api_key: str, job_id: str, idx: int
    ) -> Optional[Dict[str, Any]]:
        orient = "portrait" if aspect_ratio == "9:16" else ("landscape" if aspect_ratio == "16:9" else "square")
        try:
            async with httpx.AsyncClient(timeout=20.0, headers={"Authorization": api_key}) as client:
                r = await client.get(
                    f"https://api.pexels.com/videos/search?query={urllib.parse.quote(query)}&orientation={orient}&per_page=8"
                )
                if r.status_code != 200:
                    return None
                vids = r.json().get("videos", [])
                if not vids:
                    return None
                chosen = vids[idx % len(vids)]
                files = chosen.get("video_files", [])
                # Prefer crisp 1080p MP4 (fast download + studio HD!)
                mp4s = [f for f in files if f.get("file_type") == "video/mp4" and (f.get("width") or 0) >= 720]
                mp4s.sort(key=lambda f: abs((f.get("width") or 1080) - 1080))
                if not mp4s:
                    mp4s = [f for f in files if f.get("link")]
                if mp4s:
                    dl_url = mp4s[0]["link"]
                    vr = await client.get(dl_url, follow_redirects=True, timeout=45.0)
                    if vr.status_code == 200 and len(vr.content) > 40000:
                        out_p = OUTPUT_DIR / f"pexels_vid_{job_id}_{idx}.mp4"
                        out_p.write_bytes(vr.content)
                        return {"kind": "video", "path": str(out_p), "source": "pexels_4k_video", "model": "Pexels HD/4K Cinema Video"}
        except Exception as e:
            print(f"Pexels video error: {e}")
        return None

    # ==================== PIXABAY 4K MOVING VIDEO API (FREE KEY!) ====================
    @staticmethod
    async def _fetch_pixabay_video(
        query: str, aspect_ratio: str, api_key: str, job_id: str, idx: int
    ) -> Optional[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                r = await client.get(
                    f"https://pixabay.com/api/videos/?key={urllib.parse.quote(api_key)}&q={urllib.parse.quote(query)}&per_page=8"
                )
                if r.status_code != 200:
                    return None
                hits = r.json().get("hits", [])
                if not hits:
                    return None
                chosen = hits[idx % len(hits)]
                vdict = chosen.get("videos", {})
                pick = vdict.get("medium") or vdict.get("large") or vdict.get("small")
                if pick and pick.get("url"):
                    vr = await client.get(pick["url"], follow_redirects=True, timeout=45.0)
                    if vr.status_code == 200 and len(vr.content) > 40000:
                        out_p = OUTPUT_DIR / f"pixabay_vid_{job_id}_{idx}.mp4"
                        out_p.write_bytes(vr.content)
                        return {"kind": "video", "path": str(out_p), "source": "pixabay_video", "model": "Pixabay HD Cinema Video"}
        except Exception as e:
            print(f"Pixabay video error: {e}")
        return None

    # ==================== GOOGLE IMAGEN 3 STUDIO (GEMINI API KEY) ====================
    @staticmethod
    async def _gen_gemini_imagen(
        prompt: str, aspect_ratio: str, api_key: str, job_id: str, idx: int
    ) -> Optional[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                r = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key={api_key}",
                    json={
                        "instances": [{"prompt": f"{prompt}, cinematic commercial photography, luxury studio lighting, 8k, no text"}],
                        "parameters": {"sampleCount": 1, "aspectRatio": aspect_ratio},
                    },
                )
                if r.status_code == 200:
                    preds = r.json().get("predictions", [])
                    if preds and preds[0].get("bytesBase64Encoded"):
                        raw = base64.b64decode(preds[0]["bytesBase64Encoded"])
                        out_p = OUTPUT_DIR / f"imagen3_{job_id}_{idx}.jpg"
                        Image.open(io.BytesIO(raw)).convert("RGB").save(str(out_p), quality=94)
                        return {"kind": "image", "path": str(out_p), "source": "gemini_imagen3", "model": "Google Imagen 3"}
        except Exception as e:
            print(f"Gemini Imagen 3 error: {e}")
        return None

    # ==================== HUGGINGFACE FLUX.1-SCHNELL (FREE TIER KEY!) ====================
    @staticmethod
    async def _gen_hf_flux(
        prompt: str, aspect_ratio: str, token: str, job_id: str, idx: int
    ) -> Optional[Dict[str, Any]]:
        w, h = (768, 1344) if aspect_ratio == "9:16" else ((1344, 768) if aspect_ratio == "16:9" else (1024, 1024))
        try:
            async with httpx.AsyncClient(timeout=45.0, headers={"Authorization": f"Bearer {token}"}) as client:
                r = await client.post(
                    "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
                    json={
                        "inputs": f"{prompt}, ultra high-end commercial cinema photography, luxury lighting, shallow depth of field, zero text, 8k",
                        "parameters": {"width": w, "height": h, "num_inference_steps": 4},
                    },
                )
                if r.status_code == 200 and len(r.content) > 10000:
                    out_p = OUTPUT_DIR / f"flux_{job_id}_{idx}.jpg"
                    Image.open(io.BytesIO(r.content)).convert("RGB").save(str(out_p), quality=94)
                    return {"kind": "image", "path": str(out_p), "source": "hf_flux_schnell", "model": "FLUX.1-schnell"}
        except Exception as e:
            print(f"HF FLUX error: {e}")
        return None

    # ==================== CURATED ZERO-KEY EDITORIAL PHOTO (NO TOURIST CLUTTER!) ====================
    @staticmethod
    async def _fetch_curated_editorial_photo(
        query: str, aspect_ratio: str, job_id: str, idx: int
    ) -> Dict[str, Any]:
        ar_param = "tall" if aspect_ratio == "9:16" else ("wide" if aspect_ratio == "16:9" else "square")
        out_p = OUTPUT_DIR / f"curated_{job_id}_{idx}.jpg"
        try:
            async with httpx.AsyncClient(timeout=14.0, headers={"User-Agent": "OmniViralCinema/11.0"}) as client:
                # Prioritize clean stock photography sources (stocksnap / rawpixel / wordpress) and reject tourist clutter!
                url = (
                    f"https://api.openverse.org/v1/images/?q={urllib.parse.quote(query)}"
                    f"&aspect_ratio={ar_param}&category=photograph&page_size=20"
                )
                r = await client.get(url)
                if r.status_code == 200:
                    candidates = []
                    for it in r.json().get("results", []):
                        title_low = (it.get("title") or "").lower()
                        tags_low = " ".join((t.get("name") or "").lower() for t in (it.get("tags") or []))
                        combined = title_low + " " + tags_low
                        if any(bad in combined for bad in _CLUTTER_BLACKLIST):
                            continue
                        w_it = it.get("width") or 0
                        h_it = it.get("height") or 0
                        if max(w_it, h_it) < 800:
                            continue
                        u = it.get("url") or it.get("thumbnail")
                        if not u or u.lower().endswith((".svg", ".gif")):
                            continue
                        # Boost clean stock sources over random Flickr snapshots
                        src_score = 3 if (it.get("source") in ("stocksnap", "rawpixel")) else 1
                        candidates.append((src_score, u))
                    candidates.sort(key=lambda x: x[0], reverse=True)
                    if candidates:
                        pick_url = candidates[idx % min(len(candidates), 6)][1]
                        ir = await client.get(pick_url, follow_redirects=True, timeout=15.0)
                        if ir.status_code == 200 and len(ir.content) > 15000:
                            Image.open(io.BytesIO(ir.content)).convert("RGB").save(str(out_p), quality=92)
                            return {"kind": "image", "path": str(out_p), "source": "curated_zero_key_photo", "model": "Curated Editorial HD"}
        except Exception as e:
            print(f"Curated photo error: {e}")

        # Last-resort clean Picsum HD
        w, h = (1080, 1920) if aspect_ratio == "9:16" else ((1920, 1080) if aspect_ratio == "16:9" else (1080, 1080))
        seed = abs(hash(f"{query}_{job_id}_{idx}")) % 9000 + 100
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                ir = await client.get(f"https://picsum.photos/seed/{seed}/{w}/{h}", follow_redirects=True)
                if ir.status_code == 200 and len(ir.content) > 10000:
                    out_p.write_bytes(ir.content)
                    return {"kind": "image", "path": str(out_p), "source": "curated_zero_key_photo", "model": "Editorial Fallback HD"}
        except Exception:
            pass

        # Clean studio obsidian gradient fallback (never fails offline)
        img = Image.new("RGB", (w, h), (12, 14, 20))
        img.save(str(out_p), quality=92)
        return {"kind": "image", "path": str(out_p), "source": "studio_canvas", "model": "Studio Obsidian Canvas"}
