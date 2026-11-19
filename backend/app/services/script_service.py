import json
import random
import httpx
from typing import Dict, Any, List, Optional
from app.core.config import settings

VISUAL_STYLES = {
    "cinematic": "cinematic lighting, 8k, photorealistic, dramatic shadows, film grain, ultra detailed",
    "anime": "studio ghibli anime style, vibrant colors, crisp lineart, dramatic anime scene",
    "realistic": "hyperrealistic photography, shot on 35mm lens, shallow depth of field, natural lighting",
    "3d_cartoon": "pixar 3d animation style, stylized 3d render, octane render, vibrant lighting",
    "cyberpunk": "cyberpunk neon city, futuristic, glowing magenta and cyan, dark rain, blade runner style",
    "fantasy": "epic dark fantasy concept art, magical atmosphere, glowing runes, painterly",
    "noir": "black and white film noir, high contrast shadows, moody detective aesthetic, 1940s",
    "watercolor": "ethereal watercolor painting, soft brush strokes, artistic illustration",
    "comic": "bold comic book art style, ink outlines, halftone dots, dynamic action framing"
}

NICHE_CATALOG = [
    {
        "id": "dark_psychology",
        "name": "Dark Psychology & Mind Tricks",
        "description": "Curiosity triggers, social dominance, subtle human behavior.",
        "default_style": "noir",
        "default_voice": "en-US-ChristopherNeural",
        "viral_score": 98
    },
    {
        "id": "true_crime",
        "name": "True Crime & Unsolved Mysteries",
        "description": "Chilling cold cases, detective stories, suspenseful narration.",
        "default_style": "noir",
        "default_voice": "en-US-EricNeural",
        "viral_score": 97
    },
    {
        "id": "skeleton_anatomy",
        "name": "3D Anatomy & Body Facts",
        "description": "Viral medical mysteries, glowing 3D skeleton/organ explanations.",
        "default_style": "3d_cartoon",
        "default_voice": "en-US-GuyNeural",
        "viral_score": 96
    },
    {
        "id": "stoicism",
        "name": "Stoicism & Ancient Discipline",
        "description": "Marcus Aurelius, emotional endurance, conquering internal weakness.",
        "default_style": "cinematic",
        "default_voice": "en-US-ChristopherNeural",
        "viral_score": 95
    },
    {
        "id": "unbelievable_facts",
        "name": "Mind-Bending Facts & Space",
        "description": "Deep ocean, outer space, bizarre scientific phenomena.",
        "default_style": "realistic",
        "default_voice": "en-US-GuyNeural",
        "viral_score": 96
    },
    {
        "id": "wealth_secrets",
        "name": "The 1% Wealth & Business",
        "description": "Asymmetric leverage, passive systems, breaking out of the 9-5.",
        "default_style": "cinematic",
        "default_voice": "en-US-AriaNeural",
        "viral_score": 97
    },
    {
        "id": "anime_lore",
        "name": "Anime & Mythology Lore",
        "description": "Epic battles, hidden lore, dark fantasy storytelling.",
        "default_style": "anime",
        "default_voice": "en-GB-RyanNeural",
        "viral_score": 94
    },
    {
        "id": "cyberpunk_scifi",
        "name": "Future Tech & Sci-Fi",
        "description": "AI singularity, 2050 predictions, dystopian futures.",
        "default_style": "cyberpunk",
        "default_voice": "en-US-EricNeural",
        "viral_score": 95
    }
]

NICHE_TEMPLATES = {
    "dark_psychology": [
        {
            "hook": "99% of people have no idea when they are being manipulated.",
            "scenes": [
                {"text": "Here is a psychological trick that makes anyone trust you immediately.", "query": "mysterious silhouette in dark hallway"},
                {"text": "It's called the Benjamin Franklin Effect. When someone does a small favor for you, their brain rewires to like you.", "query": "glowing human brain neural connections"},
                {"text": "They rationalize that they must like you, otherwise why would they help you?", "query": "two shadows talking in moody room"},
                {"text": "Use this wisely. The strongest power in human psychology is subtle.", "query": "confident person looking over dark city"}
            ],
            "title": "The Franklin Effect: Dark Psychology Trick #1",
            "tags": ["#psychology", "#darkpsychology", "#mindset", "#facts", "#viral"]
        },
        {
            "hook": "If someone insults you, pause for 2 seconds and ask this one question.",
            "scenes": [
                {"text": "Look them dead in the eye, remain completely calm, and ask: Are you okay?", "query": "close up dramatic eyes in shadow"},
                {"text": "This instantly flips the social dynamic. You remain in control while exposing their insecurity.", "query": "chess king piece dramatic spotlight"},
                {"text": "Never react with anger. Silence and calm detachment destroy arrogance every single time.", "query": "stoic marble statue in dark mist"},
                {"text": "Master your emotional control, and you master the room.", "query": "luxury skyline at midnight"}
            ],
            "title": "How To Instantly Neutralize Any Insult",
            "tags": ["#stoicism", "#psychologyhacks", "#respect", "#shorts"]
        }
    ],
    "true_crime": [
        {
            "hook": "In 1994, a routine police call uncovered a secret nobody was meant to find.",
            "scenes": [
                {"text": "At 2:14 AM, dispatchers received a silent call from an abandoned highway diner.", "query": "abandoned retro diner in foggy night rain"},
                {"text": "When officers arrived, the coffee was still steaming, and every clock inside had stopped at 2:10.", "query": "vintage wall clock stopped in dark room"},
                {"text": "Security footage showed a lone figure walk in, look straight at the camera, and vanish without using the door.", "query": "grainy security camera hallway mystery"},
                {"text": "To this day, the case file remains sealed. What really happened in those four minutes?", "query": "detective desk with red string evidence board"}
            ],
            "title": "The 2:14 AM Diner Disappearance",
            "tags": ["#truecrime", "#mystery", "#unsolved", "#storytime"]
        }
    ],
    "skeleton_anatomy": [
        {
            "hook": "Here is what actually happens to your skeleton if you crack your knuckles every day.",
            "scenes": [
                {"text": "That loud popping sound isn't your bones grinding together.", "query": "glowing x-ray human hand skeleton bones"},
                {"text": "It is actually tiny nitrogen gas bubbles collapsing inside the joint fluid.", "query": "3d medical animation glowing blue joint fluid"},
                {"text": "A doctor famously cracked only his left hand for 60 years to test if it caused arthritis.", "query": "3d skeleton doctor inspecting hand"},
                {"text": "The result? Zero difference between both hands. Your knuckles are safe.", "query": "glowing healthy human skeleton standing"}
            ],
            "title": "What Cracking Your Knuckles Actually Does",
            "tags": ["#anatomy", "#skeleton", "#science", "#healthfacts"]
        }
    ],
    "stoicism": [
        {
            "hook": "Marcus Aurelius wrote this 2,000 years ago, and it still hits hard today.",
            "scenes": [
                {"text": "You have power over your mind, not outside events. Realize this, and you will find unstoppable strength.", "query": "ancient roman marble statue dramatic storm"},
                {"text": "Most suffering does not come from reality, but from your expectations of how things should be.", "query": "lone warrior standing in misty forest"},
                {"text": "When you stop caring about what you cannot control, anxiety completely vanishes.", "query": "calm mountain peak above golden clouds"},
                {"text": "Choose not to be harmed, and you haven't been harmed.", "query": "ancient roman colosseum epic sunset"}
            ],
            "title": "The Stoic Rule That Kills All Anxiety",
            "tags": ["#stoicism", "#marcusaurelius", "#philosophy", "#discipline"]
        }
    ],
    "unbelievable_facts": [
        {
            "hook": "Scientists discovered something deep under the ocean that shouldn't exist.",
            "scenes": [
                {"text": "Over 80 percent of the ocean remains completely unmapped and unexplored.", "query": "deep dark ocean underwater abyss"},
                {"text": "At the Mariana Trench, the water pressure is equivalent to 100 elephants standing on your head.", "query": "bioluminescent deep sea creature glowing"},
                {"text": "Yet, bizarre creatures thrive there in pitch black darkness and freezing water.", "query": "deep sea submarine spotlight in dark water"},
                {"text": "We know more about the surface of Mars than the bottom of our own planet.", "query": "deep outer space nebula galaxy stars"}
            ],
            "title": "Terrifying Ocean Secrets Scientists Can't Explain",
            "tags": ["#facts", "#ocean", "#unbelievable", "#science"]
        }
    ],
    "wealth_secrets": [
        {
            "hook": "The rich don't work for money. Here is the secret they never teach in school.",
            "scenes": [
                {"text": "Poor and middle-class people trade their limited time for dollars.", "query": "busy city crowd walking fast motion blur"},
                {"text": "The wealthy build systems, digital assets, and cash-flowing businesses that pay them while they sleep.", "query": "luxury modern glass penthouse overlooking city"},
                {"text": "If you don't find a way to make money while you sleep, you will work until you die.", "query": "gold bars and luxury watch on dark desk"},
                {"text": "Start building your digital leverage today. Follow for more game.", "query": "glowing financial growth chart futuristic"}
            ],
            "title": "The One Rule The Top 1% Never Break",
            "tags": ["#wealth", "#money", "#business", "#entrepreneur"]
        }
    ],
    "anime_lore": [
        {
            "hook": "This forgotten samurai technique was banned for being too lethal.",
            "scenes": [
                {"text": "Deep in the mountains of feudal Japan, a lone swordsman perfected a strike faster than the eye could track.", "query": "lone anime samurai standing in cherry blossom rain"},
                {"text": "Instead of swinging with brute force, he channeled breath and gravity into a single millisecond draw.", "query": "glowing katana blade unsheathing energy"},
                {"text": "Rival dojos feared the technique so much that every scroll describing it was burned.", "query": "burning ancient japanese temple at night"},
                {"text": "Only whispers of the phantom draw survive in legend today.", "query": "samurai silhouette under giant red moon"}
            ],
            "title": "The Banned Samurai Technique",
            "tags": ["#anime", "#samurai", "#lore", "#story"]
        }
    ],
    "cyberpunk_scifi": [
        {
            "hook": "By 2035, your smartphone will be completely obsolete. Here is what replaces it.",
            "scenes": [
                {"text": "Tech giants are quietly racing to put neural interfaces into everyday eyewear.", "query": "futuristic neon augmented reality glasses portrait"},
                {"text": "Instead of typing on glass, AI agents will project live overlays directly onto your vision.", "query": "cyberpunk street with glowing holographic displays"},
                {"text": "Every conversation will have real-time translation, memory recall, and instant data.", "query": "glowing cybernetic eye macro detail"},
                {"text": "The screen era is ending. The ambient computing era has already begun.", "query": "futuristic neon megacity skyline night"}
            ],
            "title": "Why Smartphones Die By 2035",
            "tags": ["#cyberpunk", "#future", "#ai", "#tech"]
        }
    ]
}

IDEA_BANK = {
    "dark_psychology": [
        {"title": "3 Body Language Signs Someone Secretly Dislikes You", "hook": "Watch their feet when they talk to you—they never lie.", "viral_score": 98},
        {"title": "The 'Door-in-the-Face' Persuasion Hack", "hook": "Ask for something outrageous first, and watch them say yes to your real request.", "viral_score": 95},
        {"title": "Why Mirroring Makes Anyone Instantly Trust You", "hook": "Subtly match their posture for 30 seconds and watch what happens.", "viral_score": 94},
        {"title": "The Silence Trick Used By FBI Interrogators", "hook": "Say nothing for 4 seconds after they answer, and they will confess everything.", "viral_score": 99}
    ],
    "true_crime": [
        {"title": "The Unsolved Mystery of the Somerton Man", "hook": "A well-dressed man found on an Australian beach with a secret code in his pocket.", "viral_score": 97},
        {"title": "The Ghost Ship Mary Celeste", "hook": "A full crew vanished mid-meal with the lifeboat missing and cargo untouched.", "viral_score": 96},
        {"title": "The Hinterkaifeck Farmstead Case", "hook": "Footprints led into the snow toward the house—but none ever came back out.", "viral_score": 98}
    ],
    "skeleton_anatomy": [
        {"title": "Why You Are Taller In The Morning", "hook": "Gravity literally shrinks your spine every single day.", "viral_score": 97},
        {"title": "What Happens To Your Heart During A Nightmare", "hook": "Your brain tricks your body into an adrenaline surge while paralyzed.", "viral_score": 95},
        {"title": "The Strongest Bone In The Human Body", "hook": "It can withstand more pressure per square inch than concrete.", "viral_score": 96}
    ],
    "stoicism": [
        {"title": "Seneca's Cure For Overthinking", "hook": "We suffer more often in imagination than in reality.", "viral_score": 97},
        {"title": "How Epictetus Stayed Unbreakable", "hook": "It's not what happens to you, but how you react to it that matters.", "viral_score": 95},
        {"title": "Memento Mori: The Ancient Productivity Secret", "hook": "You could leave life right now. Let that determine what you do and say.", "viral_score": 98}
    ]
}

class ScriptService:
    @staticmethod
    def list_niches() -> List[Dict[str, Any]]:
        return NICHE_CATALOG

    @staticmethod
    def list_visual_styles() -> List[Dict[str, str]]:
        return [{"id": k, "name": k.replace("_", " ").title(), "prompt_suffix": v} for k, v in VISUAL_STYLES.items()]

    @staticmethod
    async def generate_ideas(niche: str = "dark_psychology") -> List[Dict[str, Any]]:
        if settings.GROQ_API_KEY:
            try:
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
                prompt = (
                    f"Generate 4 viral YouTube Shorts / TikTok video ideas for the niche '{niche}'. "
                    f"Return JSON: {{\"ideas\": [{{\"title\": \"...\", \"hook\": \"...\", \"viral_score\": 95}}]}}"
                )
                payload = {
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"}
                }
                async with httpx.AsyncClient(timeout=20.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    data = resp.json()
                    parsed = json.loads(data["choices"][0]["message"]["content"])
                    if parsed.get("ideas"):
                        return parsed["ideas"]
            except Exception as e:
                print(f"Idea generation Groq fallback: {e}")
        return IDEA_BANK.get(niche, IDEA_BANK["dark_psychology"])

    @staticmethod
    async def generate_script(
        niche: str = "dark_psychology",
        custom_topic: Optional[str] = None,
        visual_style: str = "cinematic"
    ) -> Dict[str, Any]:
        """
        Generates a scene-by-scene viral script.
        Uses Groq / OpenAI if configured, otherwise high-converting built-in templates.
        """
        style_suffix = VISUAL_STYLES.get(visual_style, VISUAL_STYLES["cinematic"])

        if settings.GROQ_API_KEY:
            try:
                res = await ScriptService._generate_with_groq(niche, custom_topic)
                for s in res.get("scenes", []):
                    s["visual_prompt"] = f"{s.get('query', 'cinematic scene')}, {style_suffix}"
                res["visual_style"] = visual_style
                return res
            except Exception as e:
                print(f"Groq API error: {e}, falling back to template")

        if settings.OPENAI_API_KEY:
            try:
                res = await ScriptService._generate_with_openai(niche, custom_topic)
                for s in res.get("scenes", []):
                    s["visual_prompt"] = f"{s.get('query', 'cinematic scene')}, {style_suffix}"
                res["visual_style"] = visual_style
                return res
            except Exception as e:
                print(f"OpenAI API error: {e}, falling back to template")

        return ScriptService._generate_from_templates(niche, custom_topic, visual_style, style_suffix)

    @staticmethod
    def _generate_from_templates(
        niche: str,
        custom_topic: Optional[str],
        visual_style: str,
        style_suffix: str
    ) -> Dict[str, Any]:
        templates = NICHE_TEMPLATES.get(niche, NICHE_TEMPLATES["dark_psychology"])
        template = random.choice(templates)

        scenes = []
        # Include hook as first scene for clean storyboard editing
        scenes.append({
            "text": template["hook"],
            "query": template["scenes"][0]["query"],
            "visual_prompt": f"{template['scenes'][0]['query']}, {style_suffix}"
        })
        for s in template["scenes"]:
            scenes.append({
                "text": s["text"],
                "query": s["query"],
                "visual_prompt": f"{s['query']}, {style_suffix}"
            })

        full_text = " ".join([s["text"] for s in scenes])

        return {
            "niche": niche,
            "visual_style": visual_style,
            "topic": custom_topic or template["title"],
            "title": custom_topic or template["title"],
            "hook": template["hook"],
            "full_script": full_text,
            "scenes": scenes,
            "tags": template["tags"]
        }

    @staticmethod
    async def _generate_with_groq(niche: str, custom_topic: Optional[str] = None) -> Dict[str, Any]:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
        prompt = (
            f"You are a viral YouTube Shorts and TikTok creator. Write an addictive 35-second faceless video script.\n"
            f"Niche: {niche}. Topic: {custom_topic or 'Surprising viral insight'}.\n"
            f"Return JSON with format:\n"
            f'{{"title": "...", "hook": "...", "scenes": [{{"text": "...", "query": "vivid visual scene description"}}], "tags": ["#tag1", "#tag2"]}}'
        )
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "You output only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"}
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            data = resp.json()
            parsed = json.loads(data["choices"][0]["message"]["content"])
            scenes = parsed.get("scenes", [])
            if parsed.get("hook") and scenes and parsed["hook"] not in scenes[0]["text"]:
                scenes.insert(0, {"text": parsed["hook"], "query": scenes[0].get("query", "dramatic opener")})
            parsed["scenes"] = scenes
            parsed["full_script"] = " ".join([s["text"] for s in scenes])
            parsed["niche"] = niche
            parsed["topic"] = custom_topic or parsed.get("title")
            return parsed

    @staticmethod
    async def _generate_with_openai(niche: str, custom_topic: Optional[str] = None) -> Dict[str, Any]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}", "Content-Type": "application/json"}
        prompt = (
            f"You are a viral YouTube Shorts and TikTok creator. Write an addictive 35-second faceless video script.\n"
            f"Niche: {niche}. Topic: {custom_topic or 'Surprising viral insight'}.\n"
            f"Return JSON format:\n"
            f'{{"title": "...", "hook": "...", "scenes": [{{"text": "...", "query": "vivid visual scene description"}}], "tags": ["#viral"]}}'
        )
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You output only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"}
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            data = resp.json()
            parsed = json.loads(data["choices"][0]["message"]["content"])
            scenes = parsed.get("scenes", [])
            parsed["full_script"] = " ".join([s["text"] for s in scenes])
            parsed["niche"] = niche
            parsed["topic"] = custom_topic or parsed.get("title")
            return parsed
