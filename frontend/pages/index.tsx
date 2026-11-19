import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import {
  Film, Sparkles, Camera, Sliders, Volume2, Download,
  Share2, Zap, Layers, Wand2, Plus, Trash2, RefreshCw,
  Check, Copy, Aperture, Globe, Image as ImageIcon,
  ChevronDown, Search, Compass, ArrowRight, Music
} from 'lucide-react';
import ToolSuites, { ActiveTool } from '../components/ToolSuites';
import HyperGenerators, { GeneratorPreset, GLOBAL_VOICE_CHIPS } from '../components/HyperGenerators';
import SuperSuite from '../components/SuperSuite';
import Envato3DSuite from '../components/Envato3DSuite';
import { CommercialMotionStudio } from '../components/CommercialMotionStudio';
import { RenderEngineAgentStudio } from '../components/RenderEngineAgentStudio';
import {
  DotGridLoader,
  AccessibleSwitch,
  ToastBanner,
  CommandPalette,
  ExploreShowcase
} from '../components/ui/StudioPrimitives';

interface Niche {
  id: string;
  name: string;
  description: string;
  default_style: string;
  default_voice: string;
  viral_score: number;
}

interface Voice {
  id: string;
  name: string;
  gender: string;
  locale: string;
}

interface Scene {
  text: string;
  query: string;
  visual_prompt: string;
  image_filename?: string;
  image_url?: string;
  camera_move?: string;
  loading_preview?: boolean;
}

interface VideoResult {
  id: string;
  title: string;
  niche: string;
  visual_style?: string;
  aspect_ratio?: string;
  script: string;
  duration: number;
  filename: string;
  url: string;
  thumbnail_url?: string;
  tags: string[];
}

const API_BASE = 'http://127.0.0.1:8000';

const CAMERA_MOVES = [
  { id: 'dolly_in', name: 'Dolly In', tag: 'PUSH', desc: 'Smooth cinema push' },
  { id: 'crash_zoom', name: 'Crash Zoom', tag: 'IMPACT', desc: 'Rapid viral punch' },
  { id: 'dolly_out', name: 'Dolly Out', tag: 'REVEAL', desc: 'Slow wide reveal' },
  { id: 'pan_left', name: 'Pan Left', tag: 'SWEEP', desc: 'Horizontal sweep' },
  { id: 'pan_right', name: 'Pan Right', tag: 'SWEEP', desc: 'Reverse track' },
  { id: 'handheld', name: 'Handheld FPV', tag: 'RAW', desc: 'Organic action shake' },
  { id: 'orbit_drift', name: 'Orbit Drift', tag: 'FLOAT', desc: 'Diagonal cinema float' }
];

const CAMERA_BODIES = [
  { id: 'arri_alexa', name: 'ARRI Alexa 35', tag: 'DIGITAL' },
  { id: '35mm_kodak', name: '35mm Kodak', tag: 'FILM' },
  { id: '8mm_vintage', name: '8mm Super', tag: 'RETRO' },
  { id: 'vhs_cam', name: 'VHS Hi8', tag: 'GLITCH' }
];

const LENS_OPTICS = [
  { id: 'clean_prime', name: '35mm Prime' },
  { id: 'anamorphic', name: 'Anamorphic 2.39' },
  { id: 'halation_glow', name: 'Halation Glow' }
];

const COLOR_LUTS = [
  { id: 'teal_orange', name: 'Teal & Orange', grad: 'linear-gradient(135deg, #0ea5e9, #f97316)' },
  { id: 'moody_a24', name: 'Moody A24', grad: 'linear-gradient(135deg, #1e293b, #78716c)' },
  { id: 'noir', name: 'Film Noir', grad: 'linear-gradient(135deg, #09090b, #a1a1aa)' },
  { id: 'cyberpunk', name: 'Cyber Neon', grad: 'linear-gradient(135deg, #ec4899, #06b6d4)' },
  { id: 'kodak_2383', name: 'Kodak 2383', grad: 'linear-gradient(135deg, #b45309, #fde68a)' },
  { id: 'bleach_bypass', name: 'Bleach Grit', grad: 'linear-gradient(135deg, #27272a, #e4e4e7)' }
];

const TRANSITIONS = [
  { id: 'fade', name: 'Crossfade' },
  { id: 'wipeleft', name: 'Wipe Left' },
  { id: 'slideup', name: 'Slide Up' },
  { id: 'zoomin', name: 'Zoom Cut' },
  { id: 'circleopen', name: 'Iris Open' },
  { id: 'dissolve', name: 'Dissolve' },
  { id: 'none', name: 'Hard Cut' }
];

const CAPTION_PRESETS = [
  { id: 'volt', name: 'Volt Lime', sample: 'VIRAL', accent: '#D9FF00' },
  { id: 'hormozi', name: 'Hormozi', sample: 'MONEY', accent: '#FFE600' },
  { id: 'cyan', name: 'Electric', sample: 'FOCUS', accent: '#00F0FF' },
  { id: 'crimson', name: 'Crimson', sample: 'ALERT', accent: '#FF2E54' },
  { id: 'minimal', name: 'Clean', sample: 'STORY', accent: '#E4E4E7' },
  { id: 'none', name: 'Off', sample: 'OFF', accent: '#A6A6B8' }
];

const MEGA_MENUS: Record<string, { title: string; items: { id: ActiveTool; name: string; desc: string; tag?: string }[] }> = {
  image: {
    title: 'IMAGE SUITE',
    items: [
      { id: 'image_create', name: 'Create Image', desc: 'Soul 2.0, Nano Banana, Seedream & Kling models', tag: 'TOP' },
      { id: 'image_edit', name: 'Edit Image', desc: 'Cinema LUTs, contrast, saturation & poster titles' },
      { id: 'soul_character', name: 'Soul ID & AI Influencer', desc: 'Consistent characters: hairstyle, outfit & cast vault', tag: 'NEW' },
      { id: 'image_upscale', name: '4K Image Upscale', desc: '2x and 4x Lanczos super resolution enhancer' },
      { id: 'mangaka', name: 'Mangaka Studio', desc: 'Turn ideas into 3 panel vertical Manga / Webtoons', tag: 'NEW' },
      { id: 'logo_generator', name: 'AI Logo Generator', desc: 'Scalable SVG & 1024px PNG channel logo kits', tag: 'CAPCUT' },
      { id: 'remove_bg', name: 'Remove Background', desc: 'Extract clean transparent RGBA PNG cutouts' },
      { id: 'meme_maker', name: 'Meme Maker', desc: 'Bold top & bottom viral captions for images or MP4s' }
    ]
  },
  video: {
    title: 'VIDEO SUITE',
    items: [
      { id: 'agent_two_engine', name: 'Agent Two & GPU Render Engine', desc: '5-Agent film director, 3x3 storyboard, FidelityFX CAS 4K & Halation', tag: 'v10 GPU' },
      { id: 'commercial_motion', name: 'Commercial Motion & Effects Studio', desc: 'Google/Apple 60fps spring pills, Map/Search UI & AI Sparkle', tag: 'v9.0' },
      { id: 'cinema_studio', name: 'Cinema Studio & Faceless', desc: 'Camera rigs, LUTs, Hero Storyboard & Viral Captions', tag: 'FLAGSHIP' },
      { id: 'hyperframes_studio', name: 'HyperFrames 60fps Motion', desc: 'Code driven kinetic typography, stat cards & SFX', tag: '60FPS' },
      { id: 'script_to_video', name: 'Script to Video AI', desc: 'Paste any script for auto scene split & 4K render', tag: '4K' },
      { id: 'all_generators', name: 'All 24 Niche Generators', desc: 'True Crime, POV, Documentary, Kids, Anatomy & more', tag: '24 TOOLS' },
      { id: 'video_edit', name: 'Edit Video', desc: 'Trim, speed control, Cinema LUTs & watermark' },
      { id: 'video_upscale', name: '4K Video Upscale', desc: 'Upscale any video to sharp 2160p cinema quality' },
      { id: 'video_reframe', name: 'Smart Reframe', desc: 'Convert 16:9, 9:16 & 1:1 with blurred fill' },
      { id: 'click_to_ad', name: 'Click to Ad', desc: 'Store URL & product into high converting ad video', tag: 'E-COM' },
      { id: 'genjutsu', name: 'Genjutsu & Lipsync', desc: 'Remake reference video preserving motion & timing', tag: 'NEW' },
      { id: 'clipping_agent', name: 'Clipping Agent', desc: 'Long video in → viral 9:16 clips out automatically', tag: 'EROMIFY' },
      { id: 'video_translate', name: 'Video Translate & Dub', desc: 'Translate & dub any MP4 into 9+ languages', tag: 'HEYGEN' },
      { id: 'convert_compress', name: 'Convert & Compress MP4', desc: 'MOV/MKV/WEBM → optimized small H.264 MP4', tag: 'CAPCUT' }
    ]
  },
  audio: {
    title: 'AUDIO SUITE',
    items: [
      { id: 'audio_tts', name: 'Text to Speech', desc: '318 neural voices across 70+ languages ($0 cost)', tag: 'TOP' },
      { id: 'audio_voice_change', name: 'Voice Change', desc: 'Deep Trailer, Radio, Cyber Robot & LoFi presets' },
      { id: 'audio_translate', name: 'Translate & Dub', desc: 'Translate & dub in Spanish, Hindi, Arabic, Japanese+' },
      { id: 'audio_visualizer', name: 'Spotify Visualizer', desc: 'Audio reactive vertical waveform video generator' },
      { id: 'lyric_video', name: 'Lyric Video Maker', desc: 'Sync bold lyrics over reactive audio waveforms', tag: 'NEW' }
    ]
  },
  studios: {
    title: 'SPECIALIZED STUDIOS',
    items: [
      { id: 'studios_hub', name: 'All Studios Hub', desc: 'Browse Cinema, Marketing, Shorts & Film studios' },
      { id: 'cinema_studio', name: 'Cinema & Shorts Studio', desc: 'End to end viral short & cinema production' },
      { id: 'click_to_ad', name: 'Marketing Studio', desc: 'Commerce URL to Ad commercial video builder' },
      { id: 'autopilot', name: 'Faceless Studio (Autopilot)', desc: 'Multi channel automated publishing workspace' },
      { id: 'short_drama', name: 'Short Drama Studio', desc: 'Dual actor vertical drama episodes in Anamorphic', tag: 'NEW' },
      { id: 'content_factory', name: 'Content Factory', desc: 'Batch render 3 complete videos in one click', tag: 'SCALE' },
      { id: 'video_agent', name: 'Autonomous Video Agent', desc: 'One plain English prompt → full directed cinema MP4', tag: 'AGENT' },
      { id: 'photo_avatar', name: 'Photo Avatar Studio', desc: 'Bring any portrait photo to life with voice & motion', tag: 'HEYGEN' },
      { id: 'video_podcast', name: 'AI Video Podcast Studio', desc: 'Dual host 16:9 studio podcast with synced captions', tag: '2 HOSTS' },
      { id: 'ppt_to_video', name: 'PPT & Slides to Video', desc: 'Turn presentation slides into narrated 16:9 videos', tag: 'SLIDES' }
    ]
  },
  assets: {
    title: 'ENVATO ASSETS, 3D BLENDER & 3D WEB',
    items: [
      { id: 'blender_3d', name: 'Chat to 3D & Blender (bpy)', desc: 'Live 360 degree 3D viewport + Blender Cycles script', tag: '3D' },
      { id: 'web_3d_builder', name: 'Interactive 3D Website Builder', desc: 'Standalone mouse reactive 3D HTML landing pages', tag: 'WEB 3D' },
      { id: 'envato_templates', name: '60fps Video Templates', desc: 'Logo Reveals, Lower Thirds, Breaking News & VJ Loops', tag: '60FPS' },
      { id: 'envato_sfx', name: 'Sound Effects (SFX) Board', desc: '10 synthesized cinema, gaming, UI & trailer SFX', tag: 'SFX' },
      { id: 'envato_stock', name: 'Stock Photos & B-Roll Search', desc: '800M+ free high res photos, backgrounds & textures' },
      { id: 'envato_graphics', name: 'Graphics, Overlays & Banners', desc: 'Mesh gradients, film dust, palettes & 1200x630 covers' }
    ]
  }
};

export default function Home() {
  const [activeTool, setActiveTool] = useState<ActiveTool>('cinema_studio');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [niches, setNiches] = useState<Niche[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [allVoicesMode, setAllVoicesMode] = useState(false);
  const [voiceFilter, setVoiceFilter] = useState('');

  const [selectedNiche, setSelectedNiche] = useState('dark_psychology');
  const [customTopic, setCustomTopic] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [cameraMove, setCameraMove] = useState('dolly_in');
  const [cameraBody, setCameraBody] = useState('arri_alexa');
  const [lensType, setLensType] = useState('clean_prime');
  const [colorFx, setColorFx] = useState('teal_orange');
  const [transition, setTransition] = useState('fade');
  const [captionStyle, setCaptionStyle] = useState('volt');
  const [selectedVoice, setSelectedVoice] = useState('en-US-ChristopherNeural');
  const [voiceRate, setVoiceRate] = useState('+8%');

  const [progressBar, setProgressBar] = useState(true);
  const [hookBanner, setHookBanner] = useState(true);
  const [splitScreen, setSplitScreen] = useState(false);
  const [bgMusic, setBgMusic] = useState(true);
  const [musicMood, setMusicMood] = useState('dark_cinematic');
  const [customMusicFilename, setCustomMusicFilename] = useState<string | null>(null);
  const [motionGraphics, setMotionGraphics] = useState(true);
  const [sfxWhoosh, setSfxWhoosh] = useState(true);
  const [renderQuality, setRenderQuality] = useState('1080p_30');
  const [watermark, setWatermark] = useState('@OmniViral');

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedShotIdx, setSelectedShotIdx] = useState<number>(0);
  const [buildingStoryboard, setBuildingStoryboard] = useState(false);
  const [viewportMode, setViewportMode] = useState<'video' | 'hero'>('video');

  const [generating, setGenerating] = useState(false);
  const [renderStep, setRenderStep] = useState('');
  const [currentVideo, setCurrentVideo] = useState<VideoResult | null>(null);
  const [videoList, setVideoList] = useState<VideoResult[]>([]);
  const [copiedSeo, setCopiedSeo] = useState(false);

  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const [ideas, setIdeas] = useState<any[]>([]);
  const [vizFile, setVizFile] = useState<File | null>(null);
  const [vizTitle, setVizTitle] = useState('Midnight Synthwave Visualizer');
  const [vizLoading, setVizLoading] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [selectedPlatforms] = useState<string[]>(['youtube', 'tiktok', 'instagram']);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [pexelsKey, setPexelsKey] = useState('');

  const notify = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/scripts/niches`).then(r => r.json()).then(setNiches).catch(() => {});
    fetch(`${API_BASE}/api/voices`).then(r => r.json()).then(setVoices).catch(() => {});
    fetch(`${API_BASE}/api/videos`).then(r => r.json()).then(d => {
      setVideoList(d);
      if (d.length > 0) setCurrentVideo(d[0]);
    }).catch(() => {});
    fetch(`${API_BASE}/api/schedule`).then(r => r.json()).then(setScheduledPosts).catch(() => {});
    fetch(`${API_BASE}/api/schedule/channels`).then(r => r.json()).then(setChannels).catch(() => {});
    fetch(`${API_BASE}/api/schedule/settings`).then(r => r.json()).then(cfg => {
      if (cfg.watermark) setWatermark(cfg.watermark);
      if (cfg.publish_webhook_url) setWebhookUrl(cfg.publish_webhook_url);
      if (cfg.groq_api_key) setGroqKey(cfg.groq_api_key);
      if (cfg.pexels_api_key) setPexelsKey(cfg.pexels_api_key);
    }).catch(() => {});
    loadIdeas('dark_psychology');
  }, []);

  const toggleAllVoices = async () => {
    const next = !allVoicesMode;
    setAllVoicesMode(next);
    const res = await fetch(next ? `${API_BASE}/api/voices/all` : `${API_BASE}/api/voices`);
    setVoices(await res.json());
  };

  const handleSelectGenerator = (g: GeneratorPreset) => {
    if (g.niche) setSelectedNiche(g.niche);
    if (g.lut) setColorFx(g.lut);
    if (g.cameraMove) setCameraMove(g.cameraMove);
    if (g.cameraBody) setCameraBody(g.cameraBody);
    if (g.voice) setSelectedVoice(g.voice);
    if (g.musicMood) setMusicMood(g.musicMood);
    setScenes([]);
    setCustomTopic('');
    setActiveTool(g.targetTool);
    notify('success', `Loaded ${g.name}`);
  };

  const handlePreviewMusic = () => {
    if (audioPreviewRef.current && musicMood !== 'none') {
      audioPreviewRef.current.src = `${API_BASE}/api/tools/audio/music-preview?mood=${musicMood}`;
      audioPreviewRef.current.play().catch(() => {});
    }
  };

  const handleUploadCustomMusic = async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch(`${API_BASE}/api/tools/audio/music-upload`, { method: 'POST', body: fd });
      const d = await r.json();
      setCustomMusicFilename(d.filename);
      notify('success', `Custom track "${file.name}" attached`);
    } catch { notify('error', 'Failed to upload music track'); }
  };

  const handleAuditionVoice = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.src = `${API_BASE}/api/voices/preview?voice_id=${encodeURIComponent(selectedVoice)}`;
      audioPreviewRef.current.play().catch(() => {});
    }
  };

  const handleBuildVisualStoryboard = async () => {
    setBuildingStoryboard(true);
    try {
      const resp = await fetch(`${API_BASE}/api/videos/storyboard-build`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: selectedNiche, topic: customTopic || undefined, visual_style: colorFx, aspect_ratio: aspectRatio, camera_move: cameraMove })
      });
      const data = await resp.json();
      setScenes(data.scenes || []);
      setSelectedShotIdx(0);
      setViewportMode('hero');
      if (!customTopic && data.title) setCustomTopic(data.title);
      notify('success', `Loaded ${data.scenes?.length || 0} Hero Shots onto filmstrip`);
    } catch { notify('error', 'Failed to build Hero Shots'); }
    finally { setBuildingStoryboard(false); }
  };

  const handleRerollShot = async (idx: number) => {
    setScenes(prev => prev.map((s, i) => i === idx ? { ...s, loading_preview: true } : s));
    try {
      const resp = await fetch(`${API_BASE}/api/videos/scene-preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: scenes[idx].query || scenes[idx].visual_prompt, aspect_ratio: aspectRatio, visual_style: colorFx })
      });
      const data = await resp.json();
      setScenes(prev => prev.map((s, i) => i === idx ? { ...s, image_filename: data.image_filename, image_url: data.image_url, loading_preview: false } : s));
      notify('success', `Shot 0${idx + 1} visual updated`);
    } catch {
      setScenes(prev => prev.map((s, i) => i === idx ? { ...s, loading_preview: false } : s));
      notify('error', 'Failed to refresh shot');
    }
  };

  const handleRenderCinemaVideo = async () => {
    setGenerating(true);
    setRenderStep('SYNTHESIZING NEURAL VOICEOVER');
    try {
      setTimeout(() => setRenderStep('ANIMATING CAMERA RIG MOTION'), 2200);
      setTimeout(() => setRenderStep(`GRADING ${colorFx.toUpperCase()} LUT`), 5500);
      setTimeout(() => setRenderStep('MASTERING CAPTIONS & MP4'), 9000);
      const resp = await fetch(`${API_BASE}/api/videos/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: selectedNiche, topic: customTopic || undefined, voice_id: selectedVoice, voice_rate: voiceRate,
          visual_style: colorFx, aspect_ratio: aspectRatio, caption_style: captionStyle, bg_music: bgMusic,
          use_ai_images: true, transition, color_fx: colorFx, camera_move: cameraMove, camera_body: cameraBody,
          lens_type: lensType, progress_bar: progressBar, watermark, hook_banner: hookBanner, split_screen: splitScreen,
          music_mood: musicMood, custom_music_filename: customMusicFilename, motion_graphics: motionGraphics,
          sfx_whoosh: sfxWhoosh, render_quality: renderQuality,
          scenes: scenes.length > 0 ? scenes : undefined
        })
      });
      if (!resp.ok) throw new Error('Render failed');
      const data = await resp.json();
      setCurrentVideo(data);
      setVideoList(prev => [data, ...prev]);
      setViewportMode('video');
      notify('success', `Rendered "${data.title}" (${data.duration}s)`);
    } catch (e: any) {
      notify('error', e.message || 'Cinema render failed');
    } finally {
      setGenerating(false);
      setRenderStep('');
    }
  };

  const loadIdeas = async (nicheId: string) => {
    try {
      const r = await fetch(`${API_BASE}/api/scripts/ideas?niche=${nicheId}`);
      setIdeas(await r.json());
    } catch { setIdeas([]); }
  };

  const handlePublish = async (publishNow: boolean) => {
    if (!currentVideo) return;
    try {
      const resp = await fetch(`${API_BASE}/api/schedule`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: currentVideo.id, video_title: currentVideo.title, video_url: `${API_BASE}${currentVideo.url}`, tags: currentVideo.tags, platforms: selectedPlatforms, publish_now: publishNow })
      });
      const data = await resp.json();
      setScheduledPosts(prev => [data.item, ...prev]);
      notify('success', data.message || 'Added to publishing queue');
    } catch { notify('error', 'Publishing request failed'); }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return notify('error', 'Enter a channel name first');
    const resp = await fetch(`${API_BASE}/api/schedule/channels`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newChannelName, niche: selectedNiche, visual_style: colorFx, voice_id: selectedVoice, frequency: 'Daily at 18:00', platforms: selectedPlatforms })
    });
    const ch = await resp.json();
    setChannels(prev => [ch, ...prev]);
    setNewChannelName('');
    notify('success', `Autopilot channel "${ch.name}" launched`);
  };

  const handleGenerateVisualizer = async () => {
    if (!vizFile) return notify('error', 'Select an MP3 or WAV audio file first');
    setVizLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', vizFile);
      fd.append('title', vizTitle);
      fd.append('aspect_ratio', aspectRatio);
      const resp = await fetch(`${API_BASE}/api/videos/visualizer`, { method: 'POST', body: fd });
      const data = await resp.json();
      setCurrentVideo(data);
      setVideoList(prev => [data, ...prev]);
      setViewportMode('video');
      setActiveTool('cinema_studio');
      notify('success', 'Audio visualizer rendered');
    } catch { notify('error', 'Visualizer failed'); }
    finally { setVizLoading(false); }
  };

  const handleSaveSettings = async () => {
    await fetch(`${API_BASE}/api/schedule/settings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watermark, publish_webhook_url: webhookUrl, groq_api_key: groqKey, pexels_api_key: pexelsKey })
    });
    notify('success', 'Connectors saved persistently in SQLite');
  };

  const activeShot = scenes[selectedShotIdx];
  const filteredVoices = voices.filter(v =>
    !voiceFilter || v.name.toLowerCase().includes(voiceFilter.toLowerCase()) || v.locale.toLowerCase().includes(voiceFilter.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>OmniViral Studio OS | AI Cinema, Image, Audio & MCP</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <audio ref={audioPreviewRef} style={{ display: 'none' }} />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onSelect={setActiveTool} />
      <ToastBanner toast={toast} onClose={() => setToast(null)} />

      <div className="studio-shell" onClick={() => openMenu && setOpenMenu(null)}>
        {/* TOP MEGA-MENU HEADER */}
        <header style={{
          height: '64px', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)', background: 'rgba(5,5,7,0.92)', backdropFilter: 'blur(20px)',
          position: 'sticky', top: 0, zIndex: 50, gap: '12px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTool('explore')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent)', color: 'var(--on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Film size={19} strokeWidth={2.5} />
            </div>
            <div>
              <div className="title-3" style={{ fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
                OMNIVIRAL <span style={{ color: 'var(--accent)' }}>OS</span>
              </div>
              <div className="mono caption-4" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>STUDIO v11.0</div>
            </div>
          </button>

          <nav aria-label="Main navigation" style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => { setActiveTool('explore'); setOpenMenu(null); }} className={`pill-btn ${activeTool === 'explore' ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '13px' }}>
              <Compass size={14} /> Explore
            </button>

            {(['image', 'video', 'audio', 'studios', 'assets'] as const).map(key => (
              <div key={key} style={{ position: 'relative' }}>
                <button
                  type="button"
                  aria-expanded={openMenu === key}
                  onClick={() => setOpenMenu(openMenu === key ? null : key)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 12px', borderRadius: '8px',
                    border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, textTransform: 'capitalize',
                    background: openMenu === key ? 'rgba(217,255,0,0.12)' : 'transparent',
                    color: openMenu === key ? 'var(--accent)' : 'var(--text)'
                  }}
                >
                  {key} <ChevronDown size={13} />
                </button>

                {openMenu === key && (
                  <div className="glass-panel" style={{
                    position: 'absolute', top: '48px', left: '-40px', width: '500px', padding: '16px',
                    background: 'var(--surface)', border: '1px solid var(--border-strong)', boxShadow: '0 24px 64px rgba(0,0,0,0.92)',
                    zIndex: 100
                  }}>
                    <div className="mono caption-3" style={{ color: 'var(--accent)', marginBottom: '12px', letterSpacing: '0.08em' }}>
                      {MEGA_MENUS[key].title}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {MEGA_MENUS[key].items.map(it => (
                        <button
                          key={it.name}
                          type="button"
                          onClick={() => { setActiveTool(it.id); setOpenMenu(null); }}
                          className="camera-card"
                          style={{ padding: '12px' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span className="title-4" style={{ color: 'var(--text)', fontWeight: 600 }}>{it.name}</span>
                            {it.tag && <span className="mono" style={{ fontSize: '10px', background: 'var(--accent)', color: 'var(--on-accent)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{it.tag}</span>}
                          </div>
                          <div className="caption-4">{it.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button type="button" onClick={() => { setActiveTool('all_generators'); setOpenMenu(null); }} className={`pill-btn ${activeTool === 'all_generators' ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '13px' }}>24 Generators</button>
            <button type="button" onClick={() => { setActiveTool('hyperframes_studio'); setOpenMenu(null); }} className={`pill-btn ${activeTool === 'hyperframes_studio' ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '13px' }}>HyperFrames</button>
            <button type="button" onClick={() => { setActiveTool('mcp_hub'); setOpenMenu(null); }} className={`pill-btn ${activeTool === 'mcp_hub' ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '13px' }}>MCP & CLI</button>
            <button type="button" onClick={() => { setActiveTool('ideas'); setOpenMenu(null); }} className={`pill-btn ${activeTool === 'ideas' ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '13px' }}>Ideas</button>
            <button type="button" onClick={() => { setActiveTool('settings'); setOpenMenu(null); }} className={`pill-btn ${activeTool === 'settings' ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '13px' }}>API & Keys</button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
              className="pill-btn"
              style={{ padding: '7px 12px', fontSize: '13px', color: 'var(--text)' }}
            >
              <Search size={14} />
              <span className="caption-4">Search tools</span>
              <kbd className="mono" style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '5px', border: '1px solid var(--border)' }}>Ctrl K</kbd>
            </button>
          </div>
        </header>

        {/* EXPLORE SHOWCASE HUB */}
        {activeTool === 'explore' && (
          <ExploreShowcase
            videos={videoList}
            onLaunchTool={setActiveTool}
            onSelectVideo={(v) => { setCurrentVideo(v); setViewportMode('video'); }}
          />
        )}

        {/* 24 GENERATORS, HYPERFRAMES 60FPS, SCRIPT-TO-VIDEO & LYRIC VIDEO */}
        <HyperGenerators
          activeTool={activeTool}
          onSelectGenerator={handleSelectGenerator}
          onNotify={notify}
          onVideoCreated={(v) => { setCurrentVideo(v); setVideoList(prev => [v, ...prev]); }}
        />

        {/* ENVATO ASSETS, 3D BLENDER & INTERACTIVE 3D WEB SUITE */}
        <Envato3DSuite
          activeTool={activeTool}
          onNotify={notify}
          onVideoCreated={(v) => { setCurrentVideo(v); setVideoList(prev => [v, ...prev]); }}
        />

        {/* AGENT TWO MULTI-AGENT DIRECTOR & GPU CINEMA RENDER ENGINE v10.0 */}
        {activeTool === 'agent_two_engine' && (
          <main style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '28px 24px' }}>
            <RenderEngineAgentStudio
              apiBase={`${API_BASE}/api`}
              savedVideos={videoList}
              voices={voices}
              onNotify={notify}
              onMediaCreated={(v) => { setCurrentVideo(v); setVideoList(prev => [v, ...prev]); }}
            />
          </main>
        )}

        {/* COMMERCIAL MOTION GRAPHICS & STUDIO EFFECTS v9.0 */}
        {activeTool === 'commercial_motion' && (
          <main style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '28px 24px' }}>
            <CommercialMotionStudio
              apiBase={`${API_BASE}/api`}
              savedVideos={videoList}
              onNotify={notify}
              onMediaCreated={(v) => { setCurrentVideo(v); setVideoList(prev => [v, ...prev]); }}
            />
          </main>
        )}

        {/* CAPCUT, EROMIFY & HEYGEN SUPER SUITE (10 TOOLS) */}
        <SuperSuite
          activeTool={activeTool}
          voices={voices}
          onNotify={notify}
          onVideoCreated={(v) => { setCurrentVideo(v); setVideoList(prev => [v, ...prev]); }}
        />

        {/* SPECIALIZED SUITES */}
        <ToolSuites
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          voices={voices}
          onNotify={notify}
          onVideoCreated={(v) => { setCurrentVideo(v); setVideoList(prev => [v, ...prev]); }}
        />

        {/* FLAGSHIP CINEMA STUDIO */}
        {activeTool === 'cinema_studio' && (
          <div className="studio-workspace-grid">
            {/* LEFT DOCK: DIRECTOR'S RIG */}
            <aside className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: 'calc(100vh - 96px)', overflowY: 'auto' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="mono caption-3" style={{ color: 'var(--accent)', letterSpacing: '0.08em' }}>01 / CAMERA MOTION</span>
                  <Camera size={14} color="var(--text-muted)" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {CAMERA_MOVES.map(m => (
                    <button key={m.id} type="button" onClick={() => setCameraMove(m.id)} className={`camera-card ${cameraMove === m.id ? 'active' : ''}`} style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span className="caption-3" style={{ color: 'var(--text)' }}>{m.name}</span>
                        <span className="mono" style={{ fontSize: '10px', color: cameraMove === m.id ? 'var(--accent)' : 'var(--text-muted)' }}>{m.tag}</span>
                      </div>
                      <div className="caption-4" style={{ fontSize: '11px' }}>{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="mono caption-3" style={{ color: 'var(--accent)', letterSpacing: '0.08em' }}>02 / CAMERA BODY & LENS</span>
                  <Aperture size={14} color="var(--text-muted)" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  {CAMERA_BODIES.map(cb => (
                    <button key={cb.id} type="button" onClick={() => setCameraBody(cb.id)} className={`pill-btn ${cameraBody === cb.id ? 'active' : ''}`} style={{ padding: '8px 10px', fontSize: '12px', justifyContent: 'space-between' }}>
                      <span>{cb.name}</span><span className="mono" style={{ fontSize: '10px', opacity: 0.75 }}>{cb.tag}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {LENS_OPTICS.map(l => (
                    <button key={l.id} type="button" onClick={() => setLensType(l.id)} className={`pill-btn ${lensType === l.id ? 'active' : ''}`} style={{ padding: '8px 4px', fontSize: '11px' }}>{l.name}</button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="mono caption-3" style={{ color: 'var(--accent)', letterSpacing: '0.08em' }}>03 / COLOR LUT GRADE</span>
                  <Sliders size={14} color="var(--text-muted)" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {COLOR_LUTS.map(lut => (
                    <button key={lut.id} type="button" onClick={() => setColorFx(lut.id)} className={`camera-card ${colorFx === lut.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px' }}>
                      <span style={{ width: '18px', height: '18px', borderRadius: '5px', background: lut.grad, flexShrink: 0, border: '1px solid var(--border-strong)' }} />
                      <span className="caption-3" style={{ color: 'var(--text)' }}>{lut.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="mono caption-3" style={{ color: 'var(--accent)', letterSpacing: '0.08em' }}>04 / SCENE TRANSITION</span>
                  <Layers size={14} color="var(--text-muted)" />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {TRANSITIONS.map(t => (
                    <button key={t.id} type="button" onClick={() => setTransition(t.id)} className={`pill-btn ${transition === t.id ? 'active' : ''}`} style={{ padding: '7px 10px', fontSize: '12px' }}>{t.name}</button>
                  ))}
                </div>
              </div>
            </aside>

            {/* CENTER STAGE */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
              <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                  {niches.map(n => (
                    <button key={n.id} type="button" onClick={() => { setSelectedNiche(n.id); if (n.default_voice) setSelectedVoice(n.default_voice); }} className={`pill-btn ${selectedNiche === n.id ? 'active' : ''}`} style={{ padding: '7px 12px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                      {n.name.split('&')[0]} <span className="mono" style={{ fontSize: '11px', opacity: 0.75 }}>{n.viral_score}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" className="studio-input" placeholder="Direct your viral story or leave blank for trending script..." value={customTopic} onChange={e => setCustomTopic(e.target.value)} />
                  <button type="button" onClick={handleBuildVisualStoryboard} disabled={buildingStoryboard} className="pill-btn" style={{ padding: '0 16px', whiteSpace: 'nowrap', color: 'var(--text)', minHeight: '42px' }}>
                    <Wand2 size={15} color="var(--accent)" /> {buildingStoryboard ? 'Building...' : 'Build Hero Shots'}
                  </button>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setViewportMode('video')} className={`pill-btn ${viewportMode === 'video' ? 'active' : ''}`} style={{ padding: '6px 12px', fontSize: '12px' }}>Final Render</button>
                    <button type="button" onClick={() => setViewportMode('hero')} className={`pill-btn ${viewportMode === 'hero' ? 'active' : ''}`} style={{ padding: '6px 12px', fontSize: '12px' }}>Hero Frame {scenes.length > 0 ? `(${scenes.length})` : ''}</button>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['9:16', '16:9', '1:1'].map(ar => (
                      <button key={ar} type="button" onClick={() => setAspectRatio(ar)} className={`pill-btn mono ${aspectRatio === ar ? 'active' : ''}`} style={{ padding: '5px 10px', fontSize: '12px' }}>{ar}</button>
                    ))}
                  </div>
                </div>

                <div style={{
                  width: aspectRatio === '16:9' ? '100%' : (aspectRatio === '1:1' ? '340px' : '270px'),
                  height: aspectRatio === '16:9' ? '340px' : (aspectRatio === '1:1' ? '340px' : '480px'),
                  background: '#000', borderRadius: '18px', border: '1px solid var(--border)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.85)', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {viewportMode === 'hero' && activeShot?.image_url ? (
                    <>
                      <img src={`${API_BASE}${activeShot.image_url}`} alt="Hero frame preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: '18%', left: '12px', right: '12px', textAlign: 'center', fontWeight: 700, fontSize: '18px', color: 'var(--accent)', textShadow: '0 3px 12px #000', textTransform: 'uppercase' }}>
                        {activeShot.text.slice(0, 48)}
                      </div>
                    </>
                  ) : currentVideo ? (
                    <video key={currentVideo.url} src={`${API_BASE}${currentVideo.url}`} controls autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px' }} className="body-5">
                      <Film size={32} color="var(--text-muted)" />
                      <div style={{ marginTop: '10px' }}>Ready to Render</div>
                    </div>
                  )}

                  {generating && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,7,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                      <DotGridLoader label={renderStep || 'MASTERING CINEMA VIDEO'} />
                    </div>
                  )}
                </div>

                {currentVideo && (
                  <div style={{ width: '100%', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div className="title-4" style={{ color: 'var(--text)', fontWeight: 600 }}>{currentVideo.title}</div>
                      <div className="mono caption-4">{currentVideo.aspect_ratio || '9:16'} • {currentVideo.duration}s</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <a href={`${API_BASE}${currentVideo.url}`} download={currentVideo.filename} className="pill-btn" style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text)' }}><Download size={14} /> MP4</a>
                      {currentVideo.thumbnail_url && <a href={`${API_BASE}${currentVideo.thumbnail_url}`} download={`thumb_${currentVideo.id}.jpg`} className="pill-btn" style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text)' }}><ImageIcon size={14} /> Thumb</a>}
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(`${currentVideo.title}\n\n${currentVideo.script}\n\n${currentVideo.tags.join(' ')}`); setCopiedSeo(true); notify('success', 'SEO title and tags copied'); setTimeout(() => setCopiedSeo(false), 2500); }}
                        className="pill-btn"
                        style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text)' }}
                      >
                        {copiedSeo ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />} SEO
                      </button>
                      <button type="button" onClick={() => handlePublish(true)} className="volt-btn" style={{ minHeight: '36px', padding: '0 14px', fontSize: '13px' }}><Share2 size={14} /> Publish Live</button>
                    </div>
                  </div>
                )}
              </div>

              {/* FILMSTRIP TIMELINE */}
              <div className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span className="mono caption-3" style={{ color: 'var(--accent)', letterSpacing: '0.08em' }}>TIMELINE FILMSTRIP {scenes.length > 0 ? `(${scenes.length} SHOTS)` : ''}</span>
                  <button type="button" onClick={() => setScenes(prev => [...prev, { text: 'New dramatic reveal...', query: 'cinematic dark city night neon', visual_prompt: 'cinematic dark city night neon' }])} className="pill-btn" style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--text)' }}><Plus size={13} /> Add Shot</button>
                </div>
                {scenes.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px' }} className="body-5">
                    Click <strong style={{ color: 'var(--text)' }}>Build Hero Shots</strong> to inspect and re-roll scenes, or press <strong style={{ color: 'var(--accent)' }}>Render Cinema Video</strong>.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '6px' }}>
                      {scenes.map((sc, idx) => (
                        <div key={idx} onClick={() => { setSelectedShotIdx(idx); setViewportMode('hero'); }} className={`shot-card ${selectedShotIdx === idx ? 'active' : ''}`}>
                          <div style={{ height: '96px', background: 'var(--bg)', position: 'relative' }}>
                            {sc.image_url ? <img src={`${API_BASE}${sc.image_url}`} alt={`Shot ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="caption-4">No Frame</div>}
                            <span className="mono" style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(5,5,7,0.8)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: 'var(--accent)' }}>0{idx + 1}</span>
                            <button type="button" aria-label={`Re-roll shot ${idx + 1}`} onClick={e => { e.stopPropagation(); handleRerollShot(idx); }} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(5,5,7,0.8)', border: 'none', color: 'var(--text)', borderRadius: '5px', padding: '5px', cursor: 'pointer' }}><RefreshCw size={12} /></button>
                          </div>
                          <div className="caption-4" style={{ padding: '8px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sc.text}</div>
                        </div>
                      ))}
                    </div>
                    {activeShot && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
                        <input className="studio-input" value={activeShot.text} onChange={e => setScenes(prev => prev.map((it, i) => i === selectedShotIdx ? { ...it, text: e.target.value } : it))} aria-label="Shot narration" />
                        <input className="studio-input" value={activeShot.query} onChange={e => setScenes(prev => prev.map((it, i) => i === selectedShotIdx ? { ...it, query: e.target.value, visual_prompt: e.target.value } : it))} aria-label="Shot visual query" />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button type="button" aria-label="Re-roll selected shot" onClick={() => handleRerollShot(selectedShotIdx)} className="pill-btn" style={{ padding: '0 12px', color: 'var(--accent)' }}><RefreshCw size={14} /></button>
                          <button type="button" aria-label="Delete selected shot" onClick={() => { setScenes(prev => prev.filter((_, i) => i !== selectedShotIdx)); setSelectedShotIdx(0); }} className="pill-btn" style={{ padding: '0 12px', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* RIGHT INSPECTOR */}
            <aside className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: 'calc(100vh - 96px)', overflowY: 'auto' }}>
              <div>
                <div className="mono caption-3" style={{ color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: '10px' }}>05 / VIRAL CAPTIONS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {CAPTION_PRESETS.map(cp => (
                    <button key={cp.id} type="button" onClick={() => setCaptionStyle(cp.id)} className={`camera-card ${captionStyle === cp.id ? 'active' : ''}`} style={{ textAlign: 'center', padding: '10px 6px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: cp.accent, textShadow: '0 2px 6px #000' }}>{cp.sample}</div>
                      <div className="caption-4" style={{ marginTop: '3px', fontSize: '11px' }}>{cp.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="mono caption-3" style={{ color: 'var(--accent)', letterSpacing: '0.08em' }}>06 / VOICE DIRECTOR</span>
                  <button type="button" onClick={toggleAllVoices} style={{ background: 'none', border: 'none', color: 'var(--info)', fontSize: '12px', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Globe size={12} /> {allVoicesMode ? 'Top 6' : 'All 318'}
                  </button>
                </div>
                {allVoicesMode && <input className="studio-input" placeholder="Filter language (en, es, hi, ar)..." value={voiceFilter} onChange={e => setVoiceFilter(e.target.value)} style={{ marginBottom: '8px' }} />}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {GLOBAL_VOICE_CHIPS.slice(0, 8).map(vc => (
                    <button
                      key={vc.id}
                      type="button"
                      onClick={() => { setSelectedVoice(vc.id); if (audioPreviewRef.current) { audioPreviewRef.current.src = `${API_BASE}/api/voices/preview?voice_id=${encodeURIComponent(vc.id)}`; audioPreviewRef.current.play().catch(() => {}); } }}
                      className={`pill-btn ${selectedVoice === vc.id ? 'active' : ''}`}
                      style={{ padding: '4px 7px', fontSize: '11px' }}
                    >
                      <span className="mono" style={{ fontSize: '9px', opacity: 0.7 }}>{vc.flag}</span> {vc.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <select className="studio-input" value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} style={{ flex: 1 }} aria-label="Select voice">
                    {filteredVoices.slice(0, 100).map(v => <option key={v.id} value={v.id}>{v.name} ({v.locale})</option>)}
                  </select>
                  <button type="button" onClick={handleAuditionVoice} aria-label="Audition selected voice" className="pill-btn" style={{ padding: '0 12px', color: 'var(--accent)' }}><Volume2 size={16} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[{ r: '+0%', l: '1.0x' }, { r: '+8%', l: '1.08x' }, { r: '+15%', l: '1.15x' }, { r: '+22%', l: '1.22x' }].map(sp => (
                    <button key={sp.r} type="button" onClick={() => setVoiceRate(sp.r)} className={`pill-btn mono ${voiceRate === sp.r ? 'active' : ''}`} style={{ padding: '6px', fontSize: '12px' }}>{sp.l}</button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mono caption-3" style={{ color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: '6px' }}>07 / RETENTION & BRAND</div>
                <AccessibleSwitch label="Acid Lime Progress Bar" checked={progressBar} onChange={setProgressBar} />
                <AccessibleSwitch label="2.8s Hook Title Card" checked={hookBanner} onChange={setHookBanner} />
                <AccessibleSwitch label="Split Screen Wave Mode" checked={splitScreen} onChange={setSplitScreen} />
                <AccessibleSwitch label="HyperFrames Beat Badges" checked={motionGraphics} onChange={setMotionGraphics} />
                <AccessibleSwitch label="Transition Whoosh SFX" checked={sfxWhoosh} onChange={setSfxWhoosh} />
                <AccessibleSwitch label="Cinematic Music Bed" checked={bgMusic} onChange={setBgMusic} />
                {bgMusic && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '6px 0 8px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <select className="studio-input" value={musicMood} onChange={e => { setMusicMood(e.target.value); setCustomMusicFilename(null); }} style={{ flex: 1, padding: '7px 8px', fontSize: '12px' }} aria-label="Background music mood">
                        <option value="dark_cinematic">Dark Cinematic Pulse</option>
                        <option value="lofi_chill">LoFi Study Warmth</option>
                        <option value="epic_hans">Epic Brass Drone</option>
                        <option value="cyberpunk_synth">Cyberpunk Synthwave</option>
                        <option value="true_crime_suspense">Midnight Suspense</option>
                        <option value="motivational_rise">Uplifting Horizon</option>
                      </select>
                      <button type="button" onClick={handlePreviewMusic} aria-label="Preview music track" className="pill-btn" style={{ padding: '0 10px', color: 'var(--accent)' }}><Volume2 size={14} /></button>
                    </div>
                    <label className="pill-btn caption-4" style={{ padding: '6px 10px', justifyContent: 'center', fontSize: '11px' }}>
                      <Music size={12} /> {customMusicFilename ? 'Custom Track Ready' : 'Upload Own MP3/WAV'}
                      <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => handleUploadCustomMusic(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                )}
                <div style={{ marginTop: '8px' }}>
                  <div className="mono caption-4" style={{ marginBottom: '4px' }}>MASTER QUALITY (-14 LUFS)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                    {[{ id: '1080p_30', l: '1080p' }, { id: '1080p_60', l: '60fps Pro' }, { id: '4k_uhd', l: '4K UHD' }].map(q => (
                      <button key={q.id} type="button" onClick={() => setRenderQuality(q.id)} className={`pill-btn mono ${renderQuality === q.id ? 'active' : ''}`} style={{ padding: '6px 4px', fontSize: '11px' }}>{q.l}</button>
                    ))}
                  </div>
                </div>
                <input className="studio-input" value={watermark} onChange={e => setWatermark(e.target.value)} placeholder="@ChannelHandle" style={{ marginTop: '8px' }} aria-label="Channel watermark" />
              </div>

              <button type="button" onClick={handleRenderCinemaVideo} disabled={generating} className="volt-btn" style={{ width: '100%', minHeight: '48px' }}>
                <Zap size={16} fill="var(--on-accent)" /> {generating ? 'Rendering...' : 'Render Cinema Video'}
              </button>

              {videoList.length > 0 && (
                <div>
                  <div className="mono caption-4" style={{ marginBottom: '8px' }}>LIBRARY ({videoList.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                    {videoList.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => { setCurrentVideo(v); setViewportMode('video'); }}
                        style={{
                          padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                          background: currentVideo?.id === v.id ? 'rgba(217,255,0,0.1)' : 'rgba(255,255,255,0.03)',
                          border: currentVideo?.id === v.id ? '1px solid rgba(217,255,0,0.4)' : '1px solid transparent',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'
                        }}
                      >
                        <span className="caption-3" style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{v.title}</span>
                        <span className="mono caption-4" style={{ color: 'var(--accent)' }}>{v.duration}s</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* AUTOPILOT CHANNELS */}
        {activeTool === 'autopilot' && (
          <div style={{ maxWidth: '1240px', width: '100%', margin: '24px auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 className="heading-5" style={{ marginBottom: '16px' }}>Faceless Autopilot Channels</h2>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input className="studio-input" placeholder="Channel Name..." value={newChannelName} onChange={e => setNewChannelName(e.target.value)} />
                <button type="button" onClick={handleCreateChannel} className="volt-btn" style={{ whiteSpace: 'nowrap' }}>Launch Channel</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {channels.map(ch => (
                  <div key={ch.id} className="camera-card" style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="title-4" style={{ color: 'var(--text)', fontWeight: 600 }}>{ch.name}</span>
                      <span className="mono caption-3" style={{ color: 'var(--accent)' }}>{ch.status.toUpperCase()}</span>
                    </div>
                    <div className="caption-4">{ch.niche} • {ch.frequency} • {ch.platforms.join(', ').toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 className="heading-5" style={{ marginBottom: '16px' }}>Live Publishing Queue</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {scheduledPosts.map(p => (
                  <div key={p.id} className="camera-card" style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="title-4" style={{ color: 'var(--text)', fontWeight: 600 }}>{p.video_title}</span>
                      <span className="mono caption-3" style={{ color: 'var(--accent)' }}>{p.status.toUpperCase()}</span>
                    </div>
                    <div className="mono caption-4" style={{ marginTop: '4px' }}>{p.publish_time} • {p.platforms.join(', ').toUpperCase()}</div>
                  </div>
                ))}
                {scheduledPosts.length === 0 && <div className="body-5">No scheduled posts yet.</div>}
              </div>
            </div>
          </div>
        )}

        {/* IDEAS */}
        {activeTool === 'ideas' && (
          <div style={{ maxWidth: '1160px', width: '100%', margin: '24px auto', padding: '0 24px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 className="heading-5" style={{ marginBottom: '16px' }}>Viral Topic & Hook Engine</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {niches.map(n => <button key={n.id} type="button" onClick={() => loadIdeas(n.id)} className="pill-btn" style={{ padding: '8px 14px', fontSize: '13px', color: 'var(--text)' }}>{n.name}</button>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {ideas.map((idea, i) => (
                  <div key={i} className="camera-card" style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="title-3" style={{ color: 'var(--text)', fontWeight: 600 }}>{idea.title}</span>
                      <span className="mono caption-3" style={{ color: 'var(--accent)' }}>{idea.viral_score}%</span>
                    </div>
                    <p className="body-5" style={{ margin: '0 0 16px' }}>"{idea.hook}"</p>
                    <button type="button" onClick={() => { setCustomTopic(idea.title); setScenes([]); setActiveTool('cinema_studio'); }} className="volt-btn">
                      Direct Story <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AUDIO VISUALIZER */}
        {activeTool === 'audio_visualizer' && (
          <div style={{ maxWidth: '640px', width: '100%', margin: '32px auto', padding: '0 24px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 className="heading-5" style={{ marginBottom: '8px' }}>Spotify & Music Audio Visualizer</h2>
              <p className="body-5" style={{ margin: '0 0 16px' }}>Upload an MP3 or WAV track to render an audio reactive vertical waveform video.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input className="studio-input" value={vizTitle} onChange={e => setVizTitle(e.target.value)} />
                <input className="studio-input" type="file" accept="audio/*" onChange={e => setVizFile(e.target.files?.[0] || null)} />
                <button type="button" onClick={handleGenerateVisualizer} disabled={vizLoading} className="volt-btn">
                  <Music size={16} /> {vizLoading ? 'Rendering Waveform...' : 'Render Audio Visualizer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTool === 'settings' && (
          <div style={{ maxWidth: '720px', width: '100%', margin: '24px auto', padding: '0 24px' }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h2 className="heading-5">Live Publishing Webhooks & API Keys</h2>
              <p className="body-5" style={{ margin: 0 }}>Saved persistently in SQLite. Connect Make, Zapier, or n8n to push rendered videos live.</p>
              <input className="studio-input" value={watermark} onChange={e => setWatermark(e.target.value)} placeholder="Default Watermark (@handle)" />
              <input className="studio-input" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="Live Publish Webhook (Make / Zapier / n8n)" />
              <input className="studio-input" type="password" value={pexelsKey} onChange={e => setPexelsKey(e.target.value)} placeholder="Pexels Free API Key (Optional)" />
              <input className="studio-input" type="password" value={groqKey} onChange={e => setGroqKey(e.target.value)} placeholder="Groq Free API Key (Optional)" />
              <button type="button" onClick={handleSaveSettings} className="volt-btn">Save Persistent Connectors</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
