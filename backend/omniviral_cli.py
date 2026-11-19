#!/usr/bin/env python3
"""
OmniViral Studio CLI — Generate videos, images, ads, manga, and audio from terminal.
Usage:
  python omniviral_cli.py video --niche true_crime --move crash_zoom --lut noir
  python omniviral_cli.py image --prompt "cyberpunk samurai in rain"
  python omniviral_cli.py ad --store mystore.com --product "Smart Ring" --price "$149"
"""
import argparse
import json
import httpx

API = "http://127.0.0.1:8000"

def main():
    parser = argparse.ArgumentParser(description="OmniViral Studio OS CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_vid = sub.add_parser("video")
    p_vid.add_argument("--niche", default="dark_psychology")
    p_vid.add_argument("--topic", default=None)
    p_vid.add_argument("--move", default="dolly_in")
    p_vid.add_argument("--lut", default="teal_orange")

    p_img = sub.add_parser("image")
    p_img.add_argument("--prompt", required=True)
    p_img.add_argument("--style", default="teal_orange")

    p_ad = sub.add_parser("ad")
    p_ad.add_argument("--store", default="yourstore.com")
    p_ad.add_argument("--product", required=True)
    p_ad.add_argument("--price", default="$99")

    args = parser.parse_args()
    with httpx.Client(timeout=180.0) as client:
        if args.cmd == "video":
            r = client.post(f"{API}/api/videos/generate", json={"niche": args.niche, "topic": args.topic, "camera_move": args.move, "color_fx": args.lut})
        elif args.cmd == "image":
            r = client.post(f"{API}/api/tools/image/create", json={"prompt": args.prompt, "style": args.style})
        elif args.cmd == "ad":
            r = client.post(f"{API}/api/tools/video/click-to-ad", json={"store_url": args.store, "product_name": args.product, "price": args.price})
        print(json.dumps(r.json(), indent=2))

if __name__ == "__main__":
    main()
