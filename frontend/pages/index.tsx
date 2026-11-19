import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import {
  Film, Sparkles, Camera, Sliders, Volume2, Download,
  Share2, Zap, Layers, Wand2, Plus, Trash2, RefreshCw,
  Check, Copy, Music, Lightbulb, Settings, Aperture, Globe,
  Radio, Image as ImageIcon, ChevronDown
} from 'lucide-react';
import ToolSuites, { ActiveTool } from '../components/ToolSuites';

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
  { id: 'dolly_in', name: 'Dolly In', tag: 'PUSH', desc: 'Smooth cinema push-in' },
  { id: 'crash_zoom', name: 'Crash Zoom', tag: 'IMPACT', desc: 'Rapid viral punch-in' },
  { id: 'dolly_out', name: 'Dolly Out', tag: 'REVEAL', desc: 'Slow wide reveal' },
  { id: 'pan_left', name: 'Pan Left', tag: 'SWEEP', desc: 'Horizontal cinema sweep' },
  { id: 'pan_right', name: 'Pan Right', tag: 'SWEEP', desc: 'Reverse dolly track' },
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
  { id: 'none', name: 'Off', sample: '—', accent: '#52525B' }
];

const MEGA_MENUS: Record<string, { title: string; items: { id: ActiveTool; name: string; desc: string; tag?: string }[] }> = {
  image: {
    title: 'IMAGE SUITE',
    items: [
      { id: 'image_create', name: 'Create Image', desc: 'Soul 2.0, Nano Banana, Seedream & Kling models', tag: 'TOP' },
      { id: 'image_edit', name: 'Edit Image', desc: 'Cinema LUTs, contrast, saturation & poster titles' },
      { id: 'soul_character', name: 'Soul ID & AI Influencer', desc: 'Consistent characters: hairstyle, outfit & cast vault', tag: 'NEW' },
      { id: 'image_upscale', name: '4K Image Upscale', desc: '2x / 4x Lanczos super-resolution enhancer' },
      { id: 'mangaka', name: 'Mangaka Studio', desc: 'Turn ideas into 3-panel vertical Manga / Webtoons', tag: 'NEW' }
    ]
  },
  video: {
    title: 'VIDEO SUITE',
    items: [
      { id: 'cinema_studio', name: 'Cinema Studio & Faceless', desc: 'Camera rigs, LUTs, Hero Storyboard & Viral Captions', tag: 'FLAGSHIP' },
      { id: 'video_edit', name: 'Edit Video', desc: 'Trim, speed control, Cinema LUTs & watermark' },
      { id: 'video_upscale', name: '4K Video Upscale', desc: 'Upscale any video to sharp 2160p cinema quality' },
      { id: 'video_reframe', name: 'Smart Reframe', desc: 'Convert 16:9 ↔ 9:16 ↔ 1:1 with blurred fill' },
      { id: 'click_to_ad', name: 'Click to Ad', desc: 'Store URL & product → high-converting ad video', tag: 'E-COM' },
      { id: 'genjutsu', name: 'Genjutsu & Lipsync', desc: 'Remake reference video preserving motion & timing', tag: 'NEW' }
    ]
  },
  audio: {
    title: 'AUDIO SUITE',
    items: [
      { id: 'audio_tts', name: 'Text to Speech', desc: '318 neural voices across 70+ languages ($0 cost)', tag: 'TOP' },
      { id: 'audio_voice_change', name: 'Voice Change', desc: 'Deep Trailer, Radio, Cyber Robot & Lo-Fi presets' },
      { id: 'audio_translate', name: 'Translate & Dub', desc: 'Translate & dub in Spanish, Hindi, Arabic, Japanese+' },
      { id: 'audio_visualizer', name: 'Spotify Visualizer', desc: 'Audio-reactive vertical waveform video generator' }
    ]
  },
  studios: {
    title: 'SPECIALIZED STUDIOS',
    items: [
      { id: 'studios_hub', name: 'All Studios Hub', desc: 'Browse Cinema, Marketing, Shorts & Film studios' },
      { id: 'cinema_studio', name: 'Cinema & Shorts Studio', desc: 'End-to-end viral short & cinema production' },
      { id: 'click_to_ad', name: 'Marketing Studio', desc: 'E-commerce URL-to-Ad video commercial builder' },
      { id: 'autopilot', name: 'Faceless Studio (Autopilot)', desc: 'AITuber-style multi-channel auto-publisher' },
      { id: 'short_drama', name: 'Short Drama Studio', desc: 'Dual-actor vertical drama episodes in Anamorphic', tag: 'NEW' },
      { id: 'content_factory', name: 'Content Factory', desc: 'Batch-render 3 complete videos in one click', tag: 'SCALE' }
    ]
  }
};

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', cursor: 'pointer' }}>
      <span style={{ fontSize: '0.8rem', color: checked ? '#f4f4f5' : '#a1a1aa', fontWeight: 500 }}>{label}</span>
      <button type="button" className={`toggle-switch ${checked ? 'on' : ''}`}><span className="toggle-knob" /></button>
    </div>
  );
}

export default function Home() {
  const [activeTool, setActiveTool] = useState<ActiveTool>('cinema_studio');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Catalogs
  const [niches, setNiches] = useState<Niche[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [allVoicesMode, setAllVoicesMode] = useState(false);
  const [voiceFilter, setVoiceFilter] = useState('');

  // Cinema & AITuber Parameters
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
  const [publishFeedback, setPublishFeedback] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [pexelsKey, setPexelsKey] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

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
    } finally { setBuildingStoryboard(false); }
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
    } catch {
      setScenes(prev => prev.map((s, i) => i === idx ? { ...s, loading_preview: false } : s));
    }
  };

  const handleRenderCinemaVideo = async () => {
    setGenerating(true);
    setRenderStep('Synthesizing neural narration & word boundaries...');
    try {
      setTimeout(() => setRenderStep('Fetching high-res cinema shots & camera rig motion...'), 2000);
      setTimeout(() => setRenderStep(`Applying ${colorFx.toUpperCase()} LUT, ${transition} transitions & ${cameraBody}...`), 5000);
      setTimeout(() => setRenderStep('Burning viral captions, progress bar & mastering MP4...'), 8500);
      const resp = await fetch(`${API_BASE}/api/videos/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: selectedNiche, topic: customTopic || undefined, voice_id: selectedVoice, voice_rate: voiceRate,
          visual_style: colorFx, aspect_ratio: aspectRatio, caption_style: captionStyle, bg_music: bgMusic,
          use_ai_images: true, transition, color_fx: colorFx, camera_move: cameraMove, camera_body: cameraBody,
          lens_type: lensType, progress_bar: progressBar, watermark, hook_banner: hookBanner, split_screen: splitScreen,
          scenes: scenes.length > 0 ? scenes : undefined
        })
      });
      if (!resp.ok) throw new Error('Render failed');
      const data = await resp.json();
      setCurrentVideo(data);
      setVideoList(prev => [data, ...prev]);
      setViewportMode('video');
      setRenderStep('');
    } catch (e: any) {
      setRenderStep('Error: ' + e.message);
    } finally { setGenerating(false); }
  };

  const loadIdeas = async (nicheId: string) => {
    try {
      const r = await fetch(`${API_BASE}/api/scripts/ideas?niche=${nicheId}`);
      setIdeas(await r.json());
    } catch { setIdeas([]); }
  };

  const handlePublish = async (publishNow: boolean) => {
    if (!currentVideo) return;
    const resp = await fetch(`${API_BASE}/api/schedule`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_id: currentVideo.id, video_title: currentVideo.title, video_url: `${API_BASE}${currentVideo.url}`, tags: currentVideo.tags, platforms: selectedPlatforms, publish_now: publishNow })
    });
    const data = await resp.json();
    setScheduledPosts(prev => [data.item, ...prev]);
    setPublishFeedback(data.message || 'Queued!');
    setTimeout(() => setPublishFeedback(''), 4500);
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    const resp = await fetch(`${API_BASE}/api/schedule/channels`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newChannelName, niche: selectedNiche, visual_style: colorFx, voice_id: selectedVoice, frequency: 'Daily at 18:00', platforms: selectedPlatforms })
    });
    const ch = await resp.json();
    setChannels(prev => [ch, ...prev]);
    setNewChannelName('');
  };

  const handleGenerateVisualizer = async () => {
    if (!vizFile) return alert('Select an MP3/WAV file first');
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
    } finally { setVizLoading(false); }
  };

  const handleSaveSettings = async () => {
    await fetch(`${API_BASE}/api/schedule/settings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watermark, publish_webhook_url: webhookUrl, groq_api_key: groqKey, pexels_api_key: pexelsKey })
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const activeShot = scenes[selectedShotIdx];
  const filteredVoices = voices.filter(v =>
    !voiceFilter || v.name.toLowerCase().includes(voiceFilter.toLowerCase()) || v.locale.toLowerCase().includes(voiceFilter.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>OMNIVIRAL OS | Image • Video • Audio • Studios • MCP</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <audio ref={audioPreviewRef} style={{ display: 'none' }} />

      <div className="studio-shell" onClick={() => openMenu && setOpenMenu(null)}>
        {/* HIGGSFIELD-STYLE MEGA-MENU TOP BAR */}
        <header style={{
          height: '62px', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,8,11,0.94)', backdropFilter: 'blur(18px)',
          position: 'sticky', top: 0, zIndex: 50
        }}>
          <div onClick={() => setActiveTool('cinema_studio')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#D9FF00', color: '#050507', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Film size={19} strokeWidth={2.5} />
            </div>
            <div>
              <div className="heading-font" style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', lineHeight: 1.05 }}>
                OMNIVIRAL <span style={{ color: '#D9FF00' }}>OS</span>
              </div>
              <div className="mono" style={{ fontSize: '0.6rem', color: '#71717a', letterSpacing: '0.06em' }}>IMAGE • VIDEO • AUDIO • MCP</div>
            </div>
          </div>

          {/* Center Mega-Menu Nav */}
          <nav style={{ display: 'flex', gap: '4px', alignItems: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
            {(['image', 'video', 'audio', 'studios'] as const).map(key => (
              <div key={key} style={{ position: 'relative' }}>
                <button
                  onClick={() => setOpenMenu(openMenu === key ? null : key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 13px', borderRadius: '9px',
                    border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textTransform: 'capitalize',
                    background: openMenu === key ? 'rgba(217,255,0,0.14)' : 'transparent',
                    color: openMenu === key ? '#D9FF00' : '#e4e4e7'
                  }}
                >
                  {key} <ChevronDown size={13} />
                </button>

                {openMenu === key && (
                  <div className="glass-panel" style={{
                    position: 'absolute', top: '46px', left: '-40px', width: '480px', padding: '14px',
                    background: '#0d0d12', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 24px 64px rgba(0,0,0,0.9)',
                    zIndex: 100
                  }}>
                    <div className="mono" style={{ fontSize: '0.65rem', color: '#D9FF00', marginBottom: '10px', letterSpacing: '0.08em' }}>
                      {MEGA_MENUS[key].title}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {MEGA_MENUS[key].items.map(it => (
                        <button
                          key={it.name}
                          onClick={() => { setActiveTool(it.id); setOpenMenu(null); }}
                          className="camera-card"
                          style={{ padding: '10px' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                            <strong style={{ color: '#fff', fontSize: '0.8rem' }}>{it.name}</strong>
                            {it.tag && <span className="mono" style={{ fontSize: '0.56rem', background: '#D9FF00', color: '#050507', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>{it.tag}</span>}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#a1a1aa', lineHeight: 1.3 }}>{it.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button onClick={() => { setActiveTool('mcp_hub'); setOpenMenu(null); }} className={`pill-btn ${activeTool === 'mcp_hub' ? 'active' : ''}`} style={{ padding: '7px 12px', fontSize: '0.8rem', fontWeight: 600 }}>MCP & CLI</button>
            <button onClick={() => { setActiveTool('ideas'); setOpenMenu(null); }} className={`pill-btn ${activeTool === 'ideas' ? 'active' : ''}`} style={{ padding: '7px 12px', fontSize: '0.8rem', fontWeight: 600 }}>Ideas</button>
            <button onClick={() => { setActiveTool('settings'); setOpenMenu(null); }} className={`pill-btn ${activeTool === 'settings' ? 'active' : ''}`} style={{ padding: '7px 12px', fontSize: '0.8rem', fontWeight: 600 }}>API & Keys</button>
          </nav>

          <div className="mono" style={{ fontSize: '0.68rem', color: '#D9FF00', background: 'rgba(217,255,0,0.08)', border: '1px solid rgba(217,255,0,0.22)', padding: '5px 10px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="live-dot" /> ALL SUITES • $0.00
          </div>
        </header>

        {/* RENDER SPECIALIZED SUITES (IMAGE, VIDEO PRO TOOLS, AUDIO, STUDIOS, MCP) */}
        <ToolSuites
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          voices={voices}
          onVideoCreated={(v) => { setCurrentVideo(v); setVideoList(prev => [v, ...prev]); }}
        />

        {/* FLAGSHIP CINEMA STUDIO */}
        {activeTool === 'cinema_studio' && (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '310px 1fr 330px', gap: '14px', padding: '14px', maxWidth: '1760px', width: '100%', margin: '0 auto', alignItems: 'start' }}>
            {/* LEFT DOCK */}
            <aside className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(100vh - 90px)', overflowY: 'auto' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="mono" style={{ fontSize: '0.7rem', color: '#D9FF00', letterSpacing: '0.08em' }}>01 / CAMERA MOTION</span>
                  <Camera size={14} color="#71717a" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                  {CAMERA_MOVES.map(m => (
                    <button key={m.id} onClick={() => setCameraMove(m.id)} className={`camera-card ${cameraMove === m.id ? 'active' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>{m.name}</span>
                        <span className="mono" style={{ fontSize: '0.58rem', color: cameraMove === m.id ? '#D9FF00' : '#71717a' }}>{m.tag}</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#71717a', lineHeight: 1.25 }}>{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="mono" style={{ fontSize: '0.7rem', color: '#D9FF00', letterSpacing: '0.08em' }}>02 / CAMERA BODY & LENS</span>
                  <Aperture size={14} color="#71717a" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                  {CAMERA_BODIES.map(cb => (
                    <button key={cb.id} onClick={() => setCameraBody(cb.id)} className={`pill-btn ${cameraBody === cb.id ? 'active' : ''}`} style={{ padding: '8px 9px', fontSize: '0.74rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{cb.name}</span><span className="mono" style={{ fontSize: '0.6rem', opacity: 0.7 }}>{cb.tag}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {LENS_OPTICS.map(l => (
                    <button key={l.id} onClick={() => setLensType(l.id)} className={`pill-btn ${lensType === l.id ? 'active' : ''}`} style={{ padding: '7px 5px', fontSize: '0.7rem', fontWeight: 600 }}>{l.name}</button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="mono" style={{ fontSize: '0.7rem', color: '#D9FF00', letterSpacing: '0.08em' }}>03 / COLOR LUT GRADE</span>
                  <Sliders size={14} color="#71717a" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                  {COLOR_LUTS.map(lut => (
                    <button key={lut.id} onClick={() => setColorFx(lut.id)} className={`camera-card ${colorFx === lut.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: lut.grad, flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#f4f4f5' }}>{lut.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="mono" style={{ fontSize: '0.7rem', color: '#D9FF00', letterSpacing: '0.08em' }}>04 / SCENE TRANSITION</span>
                  <Layers size={14} color="#71717a" />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {TRANSITIONS.map(t => (
                    <button key={t.id} onClick={() => setTransition(t.id)} className={`pill-btn ${transition === t.id ? 'active' : ''}`} style={{ padding: '6px 10px', fontSize: '0.72rem', fontWeight: 600 }}>{t.name}</button>
                  ))}
                </div>
              </div>
            </aside>

            {/* CENTER STAGE */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
              <div className="glass-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                  {niches.map(n => (
                    <button key={n.id} onClick={() => { setSelectedNiche(n.id); if (n.default_voice) setSelectedVoice(n.default_voice); }} className={`pill-btn ${selectedNiche === n.id ? 'active' : ''}`} style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {n.name.split('&')[0]} <span className="mono" style={{ fontSize: '0.65rem', opacity: 0.75 }}>{n.viral_score}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" className="studio-input" placeholder="Direct your viral story or leave blank for trending auto-script..." value={customTopic} onChange={e => setCustomTopic(e.target.value)} />
                  <button onClick={handleBuildVisualStoryboard} disabled={buildingStoryboard} className="pill-btn" style={{ padding: '0 16px', whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wand2 size={14} color="#D9FF00" /> {buildingStoryboard ? 'Building...' : 'Build Hero Shots'}
                  </button>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setViewportMode('video')} className={`pill-btn ${viewportMode === 'video' ? 'active' : ''}`} style={{ padding: '5px 11px', fontSize: '0.73rem', fontWeight: 600 }}>Final Render</button>
                    <button onClick={() => setViewportMode('hero')} className={`pill-btn ${viewportMode === 'hero' ? 'active' : ''}`} style={{ padding: '5px 11px', fontSize: '0.73rem', fontWeight: 600 }}>Hero Frame {scenes.length > 0 ? `(${scenes.length})` : ''}</button>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {['9:16', '16:9', '1:1'].map(ar => (
                      <button key={ar} onClick={() => setAspectRatio(ar)} className={`pill-btn mono ${aspectRatio === ar ? 'active' : ''}`} style={{ padding: '4px 9px', fontSize: '0.7rem', fontWeight: 700 }}>{ar}</button>
                    ))}
                  </div>
                </div>

                <div style={{
                  width: aspectRatio === '16:9' ? '100%' : (aspectRatio === '1:1' ? '340px' : '270px'),
                  height: aspectRatio === '16:9' ? '340px' : (aspectRatio === '1:1' ? '340px' : '480px'),
                  background: '#000', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.85)', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {viewportMode === 'hero' && activeShot?.image_url ? (
                    <>
                      <img src={`${API_BASE}${activeShot.image_url}`} alt="Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: '18%', left: '12px', right: '12px', textAlign: 'center', fontWeight: 900, fontSize: '1.1rem', color: '#D9FF00', textShadow: '0 3px 12px #000', textTransform: 'uppercase' }}>
                        {activeShot.text.slice(0, 48)}
                      </div>
                    </>
                  ) : currentVideo ? (
                    <video key={currentVideo.url} src={`${API_BASE}${currentVideo.url}`} controls autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#52525b' }}><Film size={36} /><div style={{ marginTop: '8px' }}>Ready to Render</div></div>
                  )}

                  {generating && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,7,0.88)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                      <Sparkles size={32} color="#D9FF00" style={{ marginBottom: '12px' }} />
                      <div className="heading-font" style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Mastering Cinema Render...</div>
                      <div className="mono" style={{ fontSize: '0.72rem', color: '#D9FF00' }}>{renderStep}</div>
                    </div>
                  )}
                </div>

                {currentVideo && (
                  <div style={{ width: '100%', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>{currentVideo.title}</div>
                      <div className="mono" style={{ fontSize: '0.68rem', color: '#71717a' }}>{currentVideo.aspect_ratio || '9:16'} • {currentVideo.duration}s</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <a href={`${API_BASE}${currentVideo.url}`} download={currentVideo.filename} className="pill-btn" style={{ padding: '7px 12px', fontSize: '0.75rem', fontWeight: 600, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}><Download size={13} /> MP4</a>
                      {currentVideo.thumbnail_url && <a href={`${API_BASE}${currentVideo.thumbnail_url}`} download={`thumb_${currentVideo.id}.jpg`} className="pill-btn" style={{ padding: '7px 12px', fontSize: '0.75rem', fontWeight: 600, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}><ImageIcon size={13} /> Thumb</a>}
                      <button onClick={() => { navigator.clipboard.writeText(`${currentVideo.title}\n\n${currentVideo.script}\n\n${currentVideo.tags.join(' ')}`); setCopiedSeo(true); setTimeout(() => setCopiedSeo(false), 2500); }} className="pill-btn" style={{ padding: '7px 12px', fontSize: '0.75rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>{copiedSeo ? <Check size={13} color="#D9FF00" /> : <Copy size={13} />} SEO</button>
                      <button onClick={() => handlePublish(true)} className="volt-btn" style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}><Share2 size={13} /> Publish Live</button>
                    </div>
                  </div>
                )}
                {publishFeedback && <div className="mono" style={{ width: '100%', marginTop: '8px', padding: '7px 10px', borderRadius: '8px', background: 'rgba(217,255,0,0.1)', color: '#D9FF00', fontSize: '0.72rem' }}>✓ {publishFeedback}</div>}
              </div>

              {/* FILMSTRIP TIMELINE */}
              <div className="glass-panel" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="mono" style={{ fontSize: '0.7rem', color: '#D9FF00', letterSpacing: '0.08em' }}>TIMELINE FILMSTRIP {scenes.length > 0 ? `(${scenes.length} SHOTS)` : ''}</span>
                  <button onClick={() => setScenes(prev => [...prev, { text: 'New dramatic reveal...', query: 'cinematic dark city night neon', visual_prompt: 'cinematic dark city night neon' }])} className="pill-btn" style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', color: '#fff' }}><Plus size={12} /> Add Shot</button>
                </div>
                {scenes.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', color: '#71717a', fontSize: '0.8rem' }}>
                    Click <strong style={{ color: '#fff' }}>Build Hero Shots</strong> to edit/re-roll scenes or hit <strong style={{ color: '#D9FF00' }}>Render Cinema Video</strong> for 1-click autopilot.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                      {scenes.map((sc, idx) => (
                        <div key={idx} onClick={() => { setSelectedShotIdx(idx); setViewportMode('hero'); }} className={`shot-card ${selectedShotIdx === idx ? 'active' : ''}`}>
                          <div style={{ height: '94px', background: '#18181b', position: 'relative' }}>
                            {sc.image_url ? <img src={`${API_BASE}${sc.image_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: '0.7rem' }}>No Frame</div>}
                            <span className="mono" style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,0.75)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.62rem', color: '#D9FF00' }}>0{idx + 1}</span>
                            <button onClick={e => { e.stopPropagation(); handleRerollShot(idx); }} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.75)', border: 'none', color: '#fff', borderRadius: '5px', padding: '4px', cursor: 'pointer' }}><RefreshCw size={11} /></button>
                          </div>
                          <div style={{ padding: '7px 8px', fontSize: '0.72rem', color: '#e4e4e7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sc.text}</div>
                        </div>
                      ))}
                    </div>
                    {activeShot && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
                        <input className="studio-input" value={activeShot.text} onChange={e => setScenes(prev => prev.map((it, i) => i === selectedShotIdx ? { ...it, text: e.target.value } : it))} />
                        <input className="studio-input" value={activeShot.query} onChange={e => setScenes(prev => prev.map((it, i) => i === selectedShotIdx ? { ...it, query: e.target.value, visual_prompt: e.target.value } : it))} />
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => handleRerollShot(selectedShotIdx)} className="pill-btn" style={{ padding: '9px 11px', color: '#D9FF00', fontSize: '0.75rem', fontWeight: 700 }}><RefreshCw size={13} /></button>
                          <button onClick={() => { setScenes(prev => prev.filter((_, i) => i !== selectedShotIdx)); setSelectedShotIdx(0); }} className="pill-btn" style={{ padding: '9px', color: '#ef4444' }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* RIGHT INSPECTOR */}
            <aside className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(100vh - 90px)', overflowY: 'auto' }}>
              <div>
                <div className="mono" style={{ fontSize: '0.7rem', color: '#D9FF00', letterSpacing: '0.08em', marginBottom: '8px' }}>05 / VIRAL CAPTIONS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {CAPTION_PRESETS.map(cp => (
                    <button key={cp.id} onClick={() => setCaptionStyle(cp.id)} className={`camera-card ${captionStyle === cp.id ? 'active' : ''}`} style={{ textAlign: 'center', padding: '10px 6px' }}>
                      <div style={{ fontWeight: 900, fontSize: '0.92rem', color: cp.accent, textShadow: '0 2px 6px #000' }}>{cp.sample}</div>
                      <div style={{ fontSize: '0.66rem', color: '#a1a1aa', marginTop: '3px' }}>{cp.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="mono" style={{ fontSize: '0.7rem', color: '#D9FF00', letterSpacing: '0.08em' }}>06 / VOICE DIRECTOR</span>
                  <button onClick={toggleAllVoices} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Globe size={12} /> {allVoicesMode ? 'Top 6' : 'All 318'}</button>
                </div>
                {allVoicesMode && <input className="studio-input" placeholder="Filter language..." value={voiceFilter} onChange={e => setVoiceFilter(e.target.value)} style={{ marginBottom: '7px', padding: '7px 10px', fontSize: '0.78rem' }} />}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <select className="studio-input" value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} style={{ flex: 1, padding: '8px 10px', fontSize: '0.8rem' }}>
                    {filteredVoices.slice(0, 100).map(v => <option key={v.id} value={v.id}>{v.name} ({v.locale})</option>)}
                  </select>
                  <button onClick={handleAuditionVoice} className="pill-btn" style={{ padding: '0 11px', color: '#D9FF00' }}><Volume2 size={15} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                  {[{ r: '+0%', l: '1.0x' }, { r: '+8%', l: '1.08x' }, { r: '+15%', l: '1.15x' }, { r: '+22%', l: '1.22x' }].map(sp => (
                    <button key={sp.r} onClick={() => setVoiceRate(sp.r)} className={`pill-btn mono ${voiceRate === sp.r ? 'active' : ''}`} style={{ padding: '5px', fontSize: '0.7rem', fontWeight: 700 }}>{sp.l}</button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mono" style={{ fontSize: '0.7rem', color: '#D9FF00', letterSpacing: '0.08em', marginBottom: '6px' }}>07 / RETENTION & BRAND</div>
                <SwitchRow label="Acid-Lime Progress Bar" checked={progressBar} onChange={setProgressBar} />
                <SwitchRow label="2.8s Hook Title Card" checked={hookBanner} onChange={setHookBanner} />
                <SwitchRow label="Split-Screen Wave Mode" checked={splitScreen} onChange={setSplitScreen} />
                <SwitchRow label="Cinematic Synth Bed" checked={bgMusic} onChange={setBgMusic} />
                <input className="studio-input" value={watermark} onChange={e => setWatermark(e.target.value)} placeholder="@ChannelHandle" style={{ marginTop: '8px', padding: '8px 10px', fontSize: '0.8rem' }} />
              </div>

              <button onClick={handleRenderCinemaVideo} disabled={generating} className="volt-btn" style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Zap size={17} fill="#050507" /> {generating ? 'RENDERING...' : 'RENDER CINEMA VIDEO'}
              </button>

              {videoList.length > 0 && (
                <div>
                  <div className="mono" style={{ fontSize: '0.68rem', color: '#71717a', marginBottom: '6px' }}>LIBRARY ({videoList.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '150px', overflowY: 'auto' }}>
                    {videoList.map(v => (
                      <div key={v.id} onClick={() => { setCurrentVideo(v); setViewportMode('video'); }} style={{ padding: '7px 9px', borderRadius: '9px', cursor: 'pointer', background: currentVideo?.id === v.id ? 'rgba(217,255,0,0.1)' : 'rgba(255,255,255,0.03)', border: currentVideo?.id === v.id ? '1px solid rgba(217,255,0,0.4)' : '1px solid transparent', display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                        <span style={{ color: '#e4e4e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '205px' }}>{v.title}</span>
                        <span className="mono" style={{ color: '#D9FF00', fontSize: '0.68rem' }}>{v.duration}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* AUTOPILOT CHANNELS */}
        {activeTool === 'autopilot' && (
          <div style={{ maxWidth: '1280px', width: '100%', margin: '24px auto', padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h2 className="heading-font" style={{ margin: '0 0 6px', fontSize: '1.25rem' }}>Faceless Autopilot Channels</h2>
              <div style={{ display: 'flex', gap: '8px', margin: '14px 0' }}>
                <input className="studio-input" placeholder="Channel Name..." value={newChannelName} onChange={e => setNewChannelName(e.target.value)} />
                <button onClick={handleCreateChannel} className="volt-btn" style={{ padding: '0 18px', borderRadius: '10px', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>+ Launch Channel</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {channels.map(ch => (
                  <div key={ch.id} className="camera-card" style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><strong style={{ color: '#fff' }}>{ch.name}</strong><span className="mono" style={{ fontSize: '0.68rem', color: '#D9FF00' }}>● {ch.status.toUpperCase()}</span></div>
                    <div style={{ fontSize: '0.78rem', color: '#a1a1aa' }}>{ch.niche} • {ch.frequency} • {ch.platforms.join(', ').toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h2 className="heading-font" style={{ margin: '0 0 14px', fontSize: '1.25rem' }}>Live Publishing Queue</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {scheduledPosts.map(p => (
                  <div key={p.id} className="camera-card" style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong style={{ color: '#fff' }}>{p.video_title}</strong><span className="mono" style={{ fontSize: '0.68rem', color: '#D9FF00' }}>{p.status.toUpperCase()}</span></div>
                    <div className="mono" style={{ fontSize: '0.72rem', color: '#71717a', marginTop: '4px' }}>{p.publish_time} • {p.platforms.join(', ').toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* IDEAS */}
        {activeTool === 'ideas' && (
          <div style={{ maxWidth: '1160px', width: '100%', margin: '24px auto', padding: '0 20px' }}>
            <div className="glass-panel" style={{ padding: '22px' }}>
              <h2 className="heading-font" style={{ margin: '0 0 12px', fontSize: '1.3rem' }}>Viral Topic & Hook Engine</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                {niches.map(n => <button key={n.id} onClick={() => loadIdeas(n.id)} className="pill-btn" style={{ padding: '7px 14px', fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>{n.name}</button>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {ideas.map((idea, i) => (
                  <div key={i} className="camera-card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><strong style={{ color: '#fff' }}>{idea.title}</strong><span className="mono" style={{ color: '#D9FF00' }}>{idea.viral_score}%</span></div>
                    <p style={{ color: '#a1a1aa', fontSize: '0.82rem', margin: '0 0 14px' }}>"{idea.hook}"</p>
                    <button onClick={() => { setCustomTopic(idea.title); setScenes([]); setActiveTool('cinema_studio'); }} className="volt-btn" style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '0.76rem' }}>Direct This Story →</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AUDIO VISUALIZER */}
        {activeTool === 'audio_visualizer' && (
          <div style={{ maxWidth: '640px', width: '100%', margin: '32px auto', padding: '0 20px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 className="heading-font" style={{ margin: '0 0 8px', fontSize: '1.3rem' }}>Spotify & Music Audio Visualizer</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
                <input className="studio-input" value={vizTitle} onChange={e => setVizTitle(e.target.value)} />
                <input className="studio-input" type="file" accept="audio/*" onChange={e => setVizFile(e.target.files?.[0] || null)} />
                <button onClick={handleGenerateVisualizer} disabled={vizLoading} className="volt-btn" style={{ padding: '12px', borderRadius: '10px' }}>{vizLoading ? 'RENDERING...' : 'RENDER AUDIO VISUALIZER'}</button>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTool === 'settings' && (
          <div style={{ maxWidth: '720px', width: '100%', margin: '24px auto', padding: '0 20px' }}>
            <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 className="heading-font" style={{ margin: 0, fontSize: '1.25rem' }}>Live Publishing Webhooks & API Keys</h2>
              <input className="studio-input" value={watermark} onChange={e => setWatermark(e.target.value)} placeholder="Default Watermark (@handle)" />
              <input className="studio-input" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="Live Publish Webhook (Make / Zapier / n8n)" />
              <input className="studio-input" type="password" value={pexelsKey} onChange={e => setPexelsKey(e.target.value)} placeholder="Pexels Free API Key (Optional)" />
              <input className="studio-input" type="password" value={groqKey} onChange={e => setGroqKey(e.target.value)} placeholder="Groq Free API Key (Optional)" />
              <button onClick={handleSaveSettings} className="volt-btn" style={{ padding: '12px', borderRadius: '10px' }}>SAVE PERSISTENT CONNECTORS</button>
              {settingsSaved && <div className="mono" style={{ color: '#D9FF00', fontSize: '0.76rem' }}>✓ Saved!</div>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
