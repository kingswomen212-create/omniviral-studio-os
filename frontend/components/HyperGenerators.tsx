import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Search, Zap, Sparkles, Play, Volume2, Music,
  Film, FileText, Eye, Compass, BookOpen, Cpu, ShoppingBag,
  Layers, Clapperboard, Activity, Radio, Upload
} from 'lucide-react';
import { DotGridLoader } from './ui/StudioPrimitives';
import type { ActiveTool } from './ToolSuites';

const API_BASE = 'http://127.0.0.1:8000';

export interface GeneratorPreset {
  id: string;
  name: string;
  category: string;
  desc: string;
  targetTool: ActiveTool;
  niche?: string;
  lut?: string;
  cameraMove?: string;
  cameraBody?: string;
  voice?: string;
  musicMood?: string;
}

export const ALL_GENERATORS: GeneratorPreset[] = [
  { id: 'true_crime', name: 'AI True Crime Video Generator', category: 'Storytelling', desc: 'Compelling cold cases with suspense narration, noir cinematography, and bold captions.', targetTool: 'cinema_studio', niche: 'true_crime', lut: 'noir', cameraMove: 'dolly_in', cameraBody: '35mm_kodak', voice: 'en-US-EricNeural', musicMood: 'true_crime_suspense' },
  { id: 'motivational', name: 'AI Motivational Video Generator', category: 'Viral Shorts', desc: 'Powerful discipline and mindset reels with epic brass swells and dynamic motion.', targetTool: 'cinema_studio', niche: 'motivational', lut: 'teal_orange', cameraMove: 'crash_zoom', cameraBody: 'arri_alexa', voice: 'en-US-ChristopherNeural', musicMood: 'motivational_rise' },
  { id: 'tiktok', name: 'AI TikTok Video Generator', category: 'Viral Shorts', desc: 'Fast paced 9:16 viral shorts with 122px pop captions, progress bar, and Whoosh SFX.', targetTool: 'cinema_studio', niche: 'dark_psychology', lut: 'teal_orange', cameraMove: 'crash_zoom', cameraBody: 'arri_alexa', voice: 'en-US-GuyNeural', musicMood: 'dark_cinematic' },
  { id: 'script_to_video', name: 'Script to Video AI', category: 'Workflow', desc: 'Paste any raw script and auto split into synced visual scenes, voiceover, music, and captions.', targetTool: 'script_to_video' },
  { id: 'faceless_reels', name: 'Faceless Reels Generator', category: 'Viral Shorts', desc: 'No camera, no face, no manual editing. Full autopilot scripts, visuals, and captions.', targetTool: 'cinema_studio', niche: 'stoicism', lut: 'moody_a24', cameraMove: 'dolly_in', cameraBody: '35mm_kodak', voice: 'en-US-ChristopherNeural', musicMood: 'epic_hans' },
  { id: 'ig_reels', name: 'AI Instagram Reels Generator', category: 'Viral Shorts', desc: 'Aesthetic luxury and psychology reels engineered for high saves and shares.', targetTool: 'cinema_studio', niche: 'wealth_secrets', lut: 'teal_orange', cameraMove: 'orbit_drift', cameraBody: 'arri_alexa', voice: 'en-US-AriaNeural', musicMood: 'motivational_rise' },
  { id: 'explainer', name: 'AI Explainer Video Generator', category: 'Education', desc: 'Clear, crisp educational explainers with clean pacing and visual breakdowns.', targetTool: 'cinema_studio', niche: 'explainer', lut: 'teal_orange', cameraMove: 'pan_right', cameraBody: 'arri_alexa', voice: 'en-US-AriaNeural', musicMood: 'lofi_chill' },
  { id: 'pov', name: 'AI POV Video Generator', category: 'Storytelling', desc: 'Immersive first person POV worlds rendered with handheld FPV camera motion.', targetTool: 'cinema_studio', niche: 'pov', lut: 'cyberpunk', cameraMove: 'handheld', cameraBody: 'arri_alexa', voice: 'en-US-GuyNeural', musicMood: 'cyberpunk_synth' },
  { id: 'documentary', name: 'AI Documentary Video Generator', category: 'Storytelling', desc: 'Broadcast documentary storytelling with 35mm Kodak film texture and authoritative voice.', targetTool: 'cinema_studio', niche: 'documentary', lut: 'kodak_2383', cameraMove: 'dolly_out', cameraBody: '35mm_kodak', voice: 'en-GB-RyanNeural', musicMood: 'epic_hans' },
  { id: 'hyperframes', name: 'HyperFrames 60fps Motion Reel', category: 'Motion & Ads', desc: 'Code driven 60fps kinetic typography, animated stat counters, and broadcast audio.', targetTool: 'hyperframes_studio' },
  { id: 'kids_edu', name: 'AI Kids Educational Generator', category: 'Education', desc: 'Friendly, engaging visual facts about animals, space, and science for young learners.', targetTool: 'cinema_studio', niche: 'kids_educational', lut: 'teal_orange', cameraMove: 'pan_left', cameraBody: 'arri_alexa', voice: 'en-US-AvaNeural', musicMood: 'lofi_chill' },
  { id: 'skeleton', name: 'AI Body & Skeleton Animation', category: 'Education', desc: 'Inside the human body anatomy explainers with glowing medical visual pacing.', targetTool: 'cinema_studio', niche: 'skeleton_anatomy', lut: 'cyberpunk', cameraMove: 'dolly_in', cameraBody: 'arri_alexa', voice: 'en-US-GuyNeural', musicMood: 'cyberpunk_synth' },
  { id: 'talking_objects', name: 'AI Talking Fruit & 3D Objects', category: 'Education', desc: 'Bring everyday foods and objects to life explaining health and nutrition facts.', targetTool: 'cinema_studio', niche: 'talking_objects', lut: 'teal_orange', cameraMove: 'crash_zoom', cameraBody: 'arri_alexa', voice: 'en-US-AvaNeural', musicMood: 'motivational_rise' },
  { id: 'horror', name: 'AI Horror & Scary Stories', category: 'Storytelling', desc: 'Chilling midnight tales with 8mm vintage grain, eerie drones, and tense cuts.', targetTool: 'cinema_studio', niche: 'horror', lut: 'noir', cameraMove: 'handheld', cameraBody: '8mm_vintage', voice: 'en-US-EricNeural', musicMood: 'true_crime_suspense' },
  { id: 'history', name: 'AI Ancient History Generator', category: 'Education', desc: 'Lost empires and forgotten civilizations brought to life in Kodak 2383 cinema.', targetTool: 'cinema_studio', niche: 'history', lut: 'kodak_2383', cameraMove: 'dolly_in', cameraBody: '35mm_kodak', voice: 'en-GB-RyanNeural', musicMood: 'epic_hans' },
  { id: 'anime_lore', name: 'AI Anime & Mythology Lore', category: 'Storytelling', desc: 'Epic anime sword lore and dark fantasy narratives with dynamic sweeps.', targetTool: 'cinema_studio', niche: 'anime_lore', lut: 'cyberpunk', cameraMove: 'pan_left', cameraBody: 'arri_alexa', voice: 'en-GB-RyanNeural', musicMood: 'epic_hans' },
  { id: 'space_facts', name: 'AI Space & Deep Ocean Facts', category: 'Education', desc: 'Mind bending cosmos and abyssal ocean secrets with high retention hooks.', targetTool: 'cinema_studio', niche: 'unbelievable_facts', lut: 'moody_a24', cameraMove: 'dolly_out', cameraBody: 'arri_alexa', voice: 'en-US-GuyNeural', musicMood: 'dark_cinematic' },
  { id: 'short_drama', name: 'AI Short Drama Series Maker', category: 'Storytelling', desc: 'Dual actor vertical drama episodes with distinct neural voices and Anamorphic 2.39.', targetTool: 'short_drama' },
  { id: 'click_to_ad', name: 'Click to Ad Commercial Maker', category: 'Motion & Ads', desc: 'Turn any store URL and product price into a ready to run vertical commercial.', targetTool: 'click_to_ad' },
  { id: 'lyric_video', name: 'AI Lyric Video Maker', category: 'Music', desc: 'Synchronize bold animated lyrics over audio reactive visual waveforms.', targetTool: 'lyric_video' },
  { id: 'spotify_viz', name: 'Spotify Canvas Visualizer', category: 'Music', desc: 'Audio reactive vertical loops engineered for Spotify Canvas and music drops.', targetTool: 'audio_visualizer' },
  { id: 'mangaka', name: 'Mangaka Webtoon Generator', category: 'Storytelling', desc: 'Generate high contrast 3 panel vertical manga and comic strips.', targetTool: 'mangaka' },
  { id: 'content_factory', name: 'Batch Content Factory (3x)', category: 'Workflow', desc: 'Produce 3 complete publish ready niche videos in a single automated batch.', targetTool: 'content_factory' },
  { id: 'genjutsu', name: 'Genjutsu Motion Remake', category: 'Motion & Ads', desc: 'Remake any reference video with new voiceover, LUT grade, and captions.', targetTool: 'genjutsu' }
];

export const GLOBAL_VOICE_CHIPS = [
  { flag: 'US', label: 'Emma', tone: 'Warm', id: 'en-US-AvaNeural' },
  { flag: 'GB', label: 'James', tone: 'Deep', id: 'en-GB-RyanNeural' },
  { flag: 'US', label: 'Chris', tone: 'Viral', id: 'en-US-ChristopherNeural' },
  { flag: 'JP', label: 'Yuki', tone: 'Soft', id: 'ja-JP-NanamiNeural' },
  { flag: 'ES', label: 'Carlos', tone: 'Energetic', id: 'es-ES-AlvaroNeural' },
  { flag: 'FR', label: 'Sophie', tone: 'Elegant', id: 'fr-FR-DeniseNeural' },
  { flag: 'DE', label: 'Hans', tone: 'Authoritative', id: 'de-DE-ConradNeural' },
  { flag: 'IN', label: 'Priya', tone: 'Friendly', id: 'en-IN-NeerjaNeural' },
  { flag: 'BR', label: 'Lucas', tone: 'Casual', id: 'pt-BR-AntonioNeural' },
  { flag: 'KR', label: 'Min-Ji', tone: 'Cheerful', id: 'ko-KR-SunHiNeural' },
  { flag: 'IT', label: 'Marco', tone: 'Passionate', id: 'it-IT-DiegoNeural' },
  { flag: 'AE', label: 'Fatima', tone: 'Rich', id: 'ar-AE-FatimaNeural' }
];

export const ART_STYLE_CARDS = [
  { id: 'cinematic', name: 'Cinematic', grad: 'linear-gradient(135deg, #0f172a, #ea580c)' },
  { id: 'anime', name: 'Anime', grad: 'linear-gradient(135deg, #6366f1, #ec4899)' },
  { id: 'realistic', name: 'Realistic', grad: 'linear-gradient(135deg, #78350f, #d97706)' },
  { id: '3d_cartoon', name: '3D Cartoon', grad: 'linear-gradient(135deg, #0284c7, #38bdf8)' },
  { id: 'cyberpunk', name: 'Cyberpunk', grad: 'linear-gradient(135deg, #be185d, #06b6d4)' },
  { id: 'fantasy', name: 'Fantasy', grad: 'linear-gradient(135deg, #1e1b4b, #10b981)' },
  { id: 'noir', name: 'Noir', grad: 'linear-gradient(135deg, #09090b, #71717a)' },
  { id: 'watercolor', name: 'Watercolor', grad: 'linear-gradient(135deg, #0d9488, #fde047)' },
  { id: 'comic', name: 'Comic Book', grad: 'linear-gradient(135deg, #dc2626, #facc15)' },
  { id: 'flat_explainer', name: 'Flat Explainer', grad: 'linear-gradient(135deg, #2563eb, #a855f7)' }
];

interface Props {
  activeTool: ActiveTool;
  onSelectGenerator: (g: GeneratorPreset) => void;
  onVideoCreated: (v: any) => void;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

export default function HyperGenerators({ activeTool, onSelectGenerator, onVideoCreated, onNotify }: Props) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');

  // HyperFrames 60fps Motion Graphics Studio state
  const [hfHeadline, setHfHeadline] = useState('AI VIDEO EDITING 2.0');
  const [hfStatVal, setHfStatVal] = useState('10X FASTER');
  const [hfStatLbl, setHfStatLbl] = useState('BROADCAST 60FPS PIPELINE');
  const [hfB1, setHfB1] = useState('Programmatic Kinetic Typography');
  const [hfB2, setHfB2] = useState('Automated Sidechain Ducking & SFX');
  const [hfB3, setHfB3] = useState('Broadcast -14 LUFS & 4K Mastering');
  const [hfNarration, setHfNarration] = useState('Stop spending six hours on manual keyframes. Programmatic motion graphics render crisp kinetic typography, animated stat cards, and broadcast audio in seconds.');
  const [hfAccent, setHfAccent] = useState('D9FF00');
  const [hfVoice, setHfVoice] = useState('en-US-ChristopherNeural');
  const [hfMood, setHfMood] = useState('cyberpunk_synth');
  const [hfVideoUrl, setHfVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Script to Video AI state
  const [rawScript, setRawScript] = useState(
    'Most creators spend 8 hours editing a single 30 second short. With automated scene splitting, every sentence instantly maps to curated cinema footage. Sidechain audio ducking keeps your narration crystal clear over built in music. Export in 4K and publish everywhere in one click.'
  );
  const [s2vTitle, setS2vTitle] = useState('How Top Creators Automate Shorts');
  const [s2vStyle, setS2vStyle] = useState('cinematic');
  const [s2vVoice, setS2vVoice] = useState('en-US-ChristopherNeural');
  const [s2vQuality, setS2vQuality] = useState('1080p_60');
  const [s2vMood, setS2vMood] = useState('dark_cinematic');
  const [s2vUrl, setS2vUrl] = useState<string | null>(null);

  // Lyric Video Maker state
  const [lyrFile, setLyrFile] = useState<File | null>(null);
  const [lyrTitle, setLyrTitle] = useState('Neon Pulse');
  const [lyrText, setLyrText] = useState('Lights fade into neon rain\nEvery beat rewrites the night\nFeel the signal in the frame\nTurning shadows into light');
  const [lyrUrl, setLyrUrl] = useState<string | null>(null);

  // Live 60fps HTML5 Canvas Preview for HyperFrames Studio
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (activeTool !== 'hyperframes_studio') return;
    let raf = 0;
    const start = performance.now();
    const renderFrame = (now: number) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      const t = ((now - start) / 1000) % 9.0;
      const W = cv.width;
      const H = cv.height;
      const acc = `#${hfAccent}`;

      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, W, H);

      // Subtle animated OLED grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 26) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 26) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Top Progress Bar
      ctx.fillStyle = acc;
      ctx.fillRect(0, 0, W * (t / 9.0), 4);

      // Eased Header Card
      const headY = Math.min(46, -60 + 280 * t);
      ctx.fillStyle = 'rgba(15, 17, 26, 0.94)';
      ctx.fillRect(16, headY, W - 32, 62);
      ctx.fillStyle = acc;
      ctx.fillRect(16, headY, 4, 62);
      ctx.font = '600 9px monospace';
      ctx.fillText('HYPERFRAMES 60FPS ENGINE', 28, headY + 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 17px sans-serif';
      ctx.fillText(hfHeadline.toUpperCase().slice(0, 24), 28, headY + 44);

      // Eased Stat Card at t >= 1.0
      if (t >= 1.0) {
        const sx = Math.max(16, W - 520 * (t - 1.0));
        ctx.fillStyle = 'rgba(22, 24, 36, 0.95)';
        ctx.fillRect(sx, 124, W - 32, 74);
        ctx.fillStyle = acc;
        ctx.font = '700 28px sans-serif';
        ctx.fillText(hfStatVal.toUpperCase().slice(0, 14), sx + 14, 160);
        ctx.fillStyle = '#A6A6B8';
        ctx.font = '600 10px monospace';
        ctx.fillText(hfStatLbl.toUpperCase().slice(0, 28), sx + 14, 182);
      }

      // Staggered Bullet Cards
      const bullets = [hfB1, hfB2, hfB3];
      bullets.forEach((b, idx) => {
        const bt = 2.2 + idx * 1.2;
        if (t >= bt) {
          const bx = Math.min(16, -240 + 520 * (t - bt));
          const by = 216 + idx * 42;
          ctx.fillStyle = 'rgba(13, 13, 20, 0.92)';
          ctx.fillRect(bx, by, W - 32, 32);
          ctx.fillStyle = idx === 2 ? acc : '#FFFFFF';
          ctx.font = '600 11px sans-serif';
          ctx.fillText(`0${idx + 1}  ${b.toUpperCase().slice(0, 28)}`, bx + 12, by + 20);
        }
      });

      // Audio-reactive kinetic wave bars at bottom
      for (let i = 0; i < 28; i++) {
        const bh = 8 + Math.abs(Math.sin(t * 6 + i * 0.45)) * 34;
        ctx.fillStyle = i % 2 === 0 ? acc : '#38BDF8';
        ctx.fillRect(16 + i * 9, H - 30 - bh, 5, bh);
      }

      raf = requestAnimationFrame(renderFrame);
    };
    raf = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(raf);
  }, [activeTool, hfHeadline, hfStatVal, hfStatLbl, hfB1, hfB2, hfB3, hfAccent]);

  const runHyperFrames = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/tools/video/hyperframes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: hfHeadline, stat_value: hfStatVal, stat_label: hfStatLbl,
          bullets: [hfB1, hfB2, hfB3], narration: hfNarration,
          accent_hex: hfAccent, voice_id: hfVoice, music_mood: hfMood
        })
      });
      if (!r.ok) throw new Error('HyperFrames render failed');
      const d = await r.json();
      setHfVideoUrl(`${API_BASE}${d.url}`);
      onVideoCreated(d);
      onNotify('success', `60fps HyperFrames Motion Reel rendered (${d.duration}s)`);
    } catch (e: any) {
      onNotify('error', e.message || 'Render error');
    } finally { setLoading(false); }
  };

  const runScriptToVideo = async () => {
    if (!rawScript.trim()) return onNotify('error', 'Paste a script first');
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/videos/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: s2vTitle, custom_script: rawScript, visual_style: s2vStyle,
          voice_id: s2vVoice, music_mood: s2vMood, render_quality: s2vQuality,
          motion_graphics: true, sfx_whoosh: true, caption_style: 'volt'
        })
      });
      if (!r.ok) throw new Error('Script to Video failed');
      const d = await r.json();
      setS2vUrl(`${API_BASE}${d.url}`);
      onVideoCreated(d);
      onNotify('success', `Script to Video mastered (${d.duration}s)`);
    } catch (e: any) {
      onNotify('error', e.message || 'Render failed');
    } finally { setLoading(false); }
  };

  const runLyricVideo = async () => {
    if (!lyrFile) return onNotify('error', 'Upload an MP3/WAV track first');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', lyrFile);
      fd.append('title', lyrTitle);
      fd.append('lyrics', lyrText);
      const r = await fetch(`${API_BASE}/api/tools/video/lyric-video`, { method: 'POST', body: fd });
      const d = await r.json();
      setLyrUrl(`${API_BASE}${d.url}`);
      onVideoCreated(d);
      onNotify('success', 'Lyric Video rendered');
    } catch { onNotify('error', 'Lyric Video failed'); }
    finally { setLoading(false); }
  };

  // --- VIEW 1: ALL 24 AI VIDEO GENERATORS DIRECTORY (AITuber Screenshot 2) ---
  if (activeTool === 'all_generators') {
    const categories = ['All', 'Viral Shorts', 'Storytelling', 'Education', 'Motion & Ads', 'Workflow', 'Music'];
    const filtered = ALL_GENERATORS.filter(g =>
      (cat === 'All' || g.category === cat) &&
      (g.name.toLowerCase().includes(search.toLowerCase()) || g.desc.toLowerCase().includes(search.toLowerCase()))
    );
    return (
      <div style={{ maxWidth: '1320px', width: '100%', margin: '28px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto' }}>
          <div className="mono caption-3" style={{ color: 'var(--accent)', marginBottom: '8px' }}>HOME / TOOLS / ALL GENERATORS</div>
          <h1 className="heading-2" style={{ color: 'var(--text)' }}>All <span style={{ color: 'var(--accent)' }}>AI</span> Video Generators</h1>
          <p className="body-5" style={{ fontSize: '16px', marginTop: '10px' }}>
            24 specialized generators engineered for every viral niche, motion graphic format, and faceless channel.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map(c => (
              <button key={c} type="button" onClick={() => setCat(c)} className={`pill-btn ${cat === c ? 'active' : ''}`} style={{ padding: '8px 14px', fontSize: '13px' }}>{c}</button>
            ))}
          </div>
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <input className="studio-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search generators..." style={{ paddingLeft: '36px' }} />
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {filtered.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelectGenerator(g)}
              className="camera-card"
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="title-3" style={{ color: 'var(--text)', fontWeight: 600 }}>{g.name}</span>
                </div>
                <p className="body-5" style={{ margin: 0 }}>{g.desc}</p>
              </div>
              <div className="mono caption-3" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Try generator <ArrowRight size={13} />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- VIEW 2: HYPERFRAMES 60FPS MOTION GRAPHICS STUDIO (From YouTube Short NibWfeZtDk8) ---
  if (activeTool === 'hyperframes_studio') {
    return (
      <div style={{ maxWidth: '1280px', width: '100%', margin: '24px auto', padding: '0 24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h2 className="heading-5">HyperFrames Motion Graphics Studio</h2>
            <span className="mono caption-3" style={{ background: 'var(--accent)', color: 'var(--on-accent)', padding: '3px 10px', borderRadius: '6px' }}>60FPS • -14 LUFS • WHOOSH SFX</span>
          </div>
          <p className="body-5" style={{ margin: '0 0 24px' }}>
            Code driven motion graphics engine with live 60fps canvas preview, eased kinetic stat cards, sidechain ducked music, and deterministic FFmpeg MP4 mastering.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '24px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label className="mono caption-4">HEADLINE BANNER</label><input className="studio-input" value={hfHeadline} onChange={e => setHfHeadline(e.target.value)} /></div>
                <div><label className="mono caption-4">BIG STAT VALUE</label><input className="studio-input" value={hfStatVal} onChange={e => setHfStatVal(e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label className="mono caption-4">STAT SUBTITLE</label><input className="studio-input" value={hfStatLbl} onChange={e => setHfStatLbl(e.target.value)} /></div>
                <div>
                  <label className="mono caption-4">ACCENT COLOR</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {[['D9FF00', 'Volt'], ['38BDF8', 'Cyan'], ['F43F5E', 'Crimson'], ['A855F7', 'Violet']].map(([hex, n]) => (
                      <button key={hex} type="button" onClick={() => setHfAccent(hex)} className={`pill-btn ${hfAccent === hex ? 'active' : ''}`} style={{ padding: '7px 12px', fontSize: '12px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: `#${hex}` }} /> {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <input className="studio-input" value={hfB1} onChange={e => setHfB1(e.target.value)} placeholder="Beat 01" />
                <input className="studio-input" value={hfB2} onChange={e => setHfB2(e.target.value)} placeholder="Beat 02" />
                <input className="studio-input" value={hfB3} onChange={e => setHfB3(e.target.value)} placeholder="Beat 03" />
              </div>

              <div>
                <label className="mono caption-4">VOICEOVER NARRATION</label>
                <textarea className="studio-input" rows={3} value={hfNarration} onChange={e => setHfNarration(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <select className="studio-input" value={hfVoice} onChange={e => setHfVoice(e.target.value)}>
                  {GLOBAL_VOICE_CHIPS.map(v => <option key={v.id} value={v.id}>{v.flag} {v.label} ({v.tone})</option>)}
                </select>
                <select className="studio-input" value={hfMood} onChange={e => setHfMood(e.target.value)}>
                  <option value="cyberpunk_synth">Cyberpunk Synthwave</option>
                  <option value="dark_cinematic">Dark Cinematic Pulse</option>
                  <option value="epic_hans">Epic Brass Drone</option>
                  <option value="motivational_rise">Uplifting Horizon</option>
                  <option value="lofi_chill">LoFi Study Warmth</option>
                </select>
              </div>

              <button type="button" onClick={runHyperFrames} disabled={loading} className="volt-btn" style={{ minHeight: '48px' }}>
                <Zap size={16} fill="var(--on-accent)" /> {loading ? 'Mastering 60fps MP4...' : 'Render 60fps Broadcast MP4'}
              </button>
            </div>

            {/* Right: Live 60fps Canvas OR Rendered MP4 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '280px', height: '496px', borderRadius: '18px', border: '1px solid var(--border)', overflow: 'hidden', background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {loading ? (
                  <DotGridLoader label="ENCODING 60FPS MOTION" />
                ) : hfVideoUrl ? (
                  <video key={hfVideoUrl} src={hfVideoUrl} controls autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <canvas ref={canvasRef} width={280} height={496} style={{ width: '100%', height: '100%' }} />
                )}
              </div>
              <div className="mono caption-4">{hfVideoUrl ? 'MASTERED 60FPS MP4 READY' : 'LIVE 60FPS CANVAS PREVIEW'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 3: SCRIPT TO VIDEO AI (AITuber Screenshot 1 & 2) ---
  if (activeTool === 'script_to_video') {
    return (
      <div style={{ maxWidth: '1240px', width: '100%', margin: '24px auto', padding: '0 24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h2 className="heading-5">Script to Video AI</h2>
            <span className="mono caption-3" style={{ background: 'var(--accent)', color: 'var(--on-accent)', padding: '3px 10px', borderRadius: '6px' }}>AUTO SCENE SPLIT • 4K READY</span>
          </div>
          <p className="body-5" style={{ margin: '0 0 20px' }}>
            Paste any script. Our engine splits sentences into scenes, matches visuals, applies voiceover, music, Whoosh SFX, and viral captions automatically.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input className="studio-input" value={s2vTitle} onChange={e => setS2vTitle(e.target.value)} placeholder="Video Title" />
              <textarea className="studio-input" rows={5} value={rawScript} onChange={e => setRawScript(e.target.value)} placeholder="Paste your full narration script here..." />

              <div>
                <div className="mono caption-3" style={{ color: 'var(--accent)', marginBottom: '8px' }}>VISUAL ART STYLE (10 STYLES)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {ART_STYLE_CARDS.map(st => (
                    <button key={st.id} type="button" onClick={() => setS2vStyle(st.id)} className={`camera-card ${s2vStyle === st.id ? 'active' : ''}`} style={{ padding: '8px', textAlign: 'center' }}>
                      <div style={{ height: '32px', borderRadius: '6px', background: st.grad, marginBottom: '6px' }} />
                      <div className="caption-3" style={{ color: 'var(--text)', fontSize: '11px' }}>{st.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mono caption-3" style={{ color: 'var(--accent)', marginBottom: '8px' }}>GLOBAL VOICES (140+ LANGUAGES)</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {GLOBAL_VOICE_CHIPS.map(v => (
                    <button key={v.id} type="button" onClick={() => setS2vVoice(v.id)} className={`pill-btn ${s2vVoice === v.id ? 'active' : ''}`} style={{ padding: '6px 10px', fontSize: '12px' }}>
                      <span className="mono" style={{ fontSize: '10px', opacity: 0.7 }}>{v.flag}</span> {v.label} <span style={{ opacity: 0.65 }}>{v.tone}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <select className="studio-input" value={s2vMood} onChange={e => setS2vMood(e.target.value)}>
                  <option value="dark_cinematic">Dark Cinematic Pulse</option>
                  <option value="lofi_chill">LoFi Study Warmth</option>
                  <option value="epic_hans">Epic Brass Drone</option>
                  <option value="cyberpunk_synth">Cyberpunk Synthwave</option>
                  <option value="motivational_rise">Uplifting Horizon</option>
                  <option value="none">No Music</option>
                </select>
                <select className="studio-input" value={s2vQuality} onChange={e => setS2vQuality(e.target.value)}>
                  <option value="1080p_30">1080p HD • 30fps (Fast)</option>
                  <option value="1080p_60">1080p Pro • 60fps (Silky)</option>
                  <option value="4k_uhd">4K UHD 2160p (Pristine)</option>
                </select>
              </div>

              <button type="button" onClick={runScriptToVideo} disabled={loading} className="volt-btn" style={{ minHeight: '48px' }}>
                <Zap size={16} fill="var(--on-accent)" /> {loading ? 'Rendering Script to Video...' : 'Generate Video from Script'}
              </button>
            </div>

            <div style={{ background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)', minHeight: '440px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
              {loading ? <DotGridLoader label="RENDERING SCENES" /> : s2vUrl ? <video key={s2vUrl} src={s2vUrl} controls autoPlay loop style={{ width: '100%', maxHeight: '460px', borderRadius: '10px' }} /> : <span className="body-5">Rendered video appears here</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 4: LYRIC VIDEO MAKER ---
  if (activeTool === 'lyric_video') {
    return (
      <div style={{ maxWidth: '1080px', width: '100%', margin: '24px auto', padding: '0 24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 className="heading-5" style={{ marginBottom: '8px' }}>AI Lyric Video Maker</h2>
          <p className="body-5" style={{ margin: '0 0 20px' }}>Upload your song MP3/WAV and paste line by line lyrics to render a synced vertical lyric video.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input className="studio-input" value={lyrTitle} onChange={e => setLyrTitle(e.target.value)} placeholder="Song Title" />
              <input type="file" accept="audio/*" className="studio-input" onChange={e => setLyrFile(e.target.files?.[0] || null)} />
              <textarea className="studio-input" rows={6} value={lyrText} onChange={e => setLyrText(e.target.value)} placeholder="One lyric line per row..." />
              <button type="button" onClick={runLyricVideo} disabled={loading} className="volt-btn"><Music size={16} /> {loading ? 'Syncing Lyrics...' : 'Render Lyric Video'}</button>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
              {loading ? <DotGridLoader label="SYNCING LYRICS" /> : lyrUrl ? <video src={lyrUrl} controls autoPlay loop style={{ width: '100%', maxHeight: '420px', borderRadius: '10px' }} /> : <span className="body-5">Lyric video preview</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
