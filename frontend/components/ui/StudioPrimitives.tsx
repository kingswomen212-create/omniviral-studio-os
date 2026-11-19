import React, { useEffect, useState } from 'react';
import {
  Search, X, CheckCircle2, AlertCircle, Film, Image as ImageIcon,
  Wand2, Maximize2, UserCheck, BookOpen, Scissors, Crop, ShoppingBag,
  Sparkles, Clapperboard, Factory, Mic, AudioWaveform, Languages,
  Music, Radio, Lightbulb, Terminal, Settings, ArrowRight, Play, Zap
} from 'lucide-react';
import type { ActiveTool } from '../ToolSuites';

const API_BASE = 'http://127.0.0.1:8000';

export function DotGridLoader({ label }: { label?: string }) {
  const delays = [0, 0.12, 0.24, 0.12, 0.24, 0.36, 0.24, 0.36, 0.48];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div className="dot-grid-loader" role="status" aria-label={label || 'Loading'}>
        {delays.map((d, i) => (
          <span key={i} className="dot-grid-cell" style={{ animationDelay: `${d}s` }} />
        ))}
      </div>
      {label && <span className="mono caption-3" style={{ color: 'var(--accent)' }}>{label}</span>}
    </div>
  );
}

export function AccessibleSwitch({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
      <span className="title-4" style={{ color: checked ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`toggle-switch ${checked ? 'on' : ''}`}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  );
}

export function ToastBanner({
  toast,
  onClose
}: {
  toast: { type: 'success' | 'error'; message: string } | null;
  onClose: () => void;
}) {
  if (!toast) return null;
  const isErr = toast.type === 'error';
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
        background: 'var(--surface-elevated)',
        border: `1px solid ${isErr ? 'var(--danger)' : 'var(--accent)'}`,
        borderRadius: '12px', padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '10px',
        boxShadow: '0 20px 48px rgba(0,0,0,0.75)', maxWidth: '420px'
      }}
    >
      {isErr ? <AlertCircle size={18} color="var(--danger)" /> : <CheckCircle2 size={18} color="var(--accent)" />}
      <span className="title-4" style={{ color: 'var(--text)' }}>{toast.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

interface PaletteItem {
  id: ActiveTool;
  name: string;
  category: string;
  desc: string;
  icon: React.ReactNode;
}

const ALL_COMMANDS: PaletteItem[] = [
  { id: 'explore', name: 'Explore Showcase Hub', category: 'Home', desc: 'Overview of all studios, live telemetry & recent reels', icon: <Sparkles size={16} /> },
  { id: 'all_generators', name: 'All 24 AI Video Generators', category: 'Tools', desc: 'True Crime, POV, Documentary, Kids, Anatomy, Explainer & more', icon: <Zap size={16} /> },
  { id: 'hyperframes_studio', name: 'HyperFrames 60fps Motion Studio', category: 'Motion', desc: 'Code driven 60fps kinetic typography, stat cards & -14 LUFS audio', icon: <Sparkles size={16} /> },
  { id: 'script_to_video', name: 'Script to Video AI', category: 'Workflow', desc: 'Paste any script for auto scene split, 10 art styles & 4K export', icon: <Film size={16} /> },
  { id: 'lyric_video', name: 'AI Lyric Video Maker', category: 'Music', desc: 'Sync bold animated lyrics over reactive music waveforms', icon: <Music size={16} /> },
  { id: 'clipping_agent', name: 'Clipping Agent (Long Video to Shorts)', category: 'Agents', desc: 'Eromify style: upload long video, get viral 9:16 clips out', icon: <Scissors size={16} /> },
  { id: 'video_agent', name: 'Autonomous Video Agent (1 Prompt)', category: 'Agents', desc: 'HeyGen style: 1 prompt autonomously plans & renders full video', icon: <Sparkles size={16} /> },
  { id: 'photo_avatar', name: 'Photo Avatar & Image to Video', category: 'Avatar', desc: 'Bring any portrait photo to life with voice, drift & waveform', icon: <UserCheck size={16} /> },
  { id: 'video_podcast', name: 'AI Video Podcast Studio (2 Hosts)', category: 'Studios', desc: 'Dual host 16:9 video podcast deck with synced voices & captions', icon: <Mic size={16} /> },
  { id: 'ppt_to_video', name: 'PPT & Slides to Video', category: 'Workflow', desc: 'Turn presentation slides & speaker notes into narrated 16:9 MP4', icon: <Film size={16} /> },
  { id: 'video_translate', name: 'Video Translate & AI Dubbing', category: 'Video', desc: 'Translate & dub any video into 9+ languages with captions', icon: <Languages size={16} /> },
  { id: 'meme_maker', name: 'CapCut Style Meme Maker', category: 'Utilities', desc: 'Stamp viral top & bottom meme captions onto images or MP4s', icon: <ImageIcon size={16} /> },
  { id: 'logo_generator', name: 'AI Logo & Channel Brand Kit', category: 'Image', desc: 'Generate scalable SVG & 1024px PNG channel logos instantly', icon: <Wand2 size={16} /> },
  { id: 'remove_bg', name: 'Remove Background (Transparent PNG)', category: 'Image', desc: 'Extract RGBA transparent PNG from dark, light or green screen', icon: <Maximize2 size={16} /> },
  { id: 'convert_compress', name: 'Convert to MP4 & Smart Compressor', category: 'Utilities', desc: 'Convert MOV/MKV/WEBM to H.264 MP4 & shrink file size', icon: <Zap size={16} /> },
  { id: 'blender_3d', name: 'Chat to 3D & Blender Scene Studio', category: '3D', desc: 'Interactive 360 degree 3D viewport + Blender 4.x Python (bpy) export', icon: <Sparkles size={16} /> },
  { id: 'web_3d_builder', name: 'Interactive 3D Website Builder', category: 'Web 3D', desc: 'Generate standalone mouse reactive 3D HTML landing pages', icon: <Terminal size={16} /> },
  { id: 'envato_templates', name: '60fps Video Templates (Logo, Lower Thirds, VJ)', category: 'Templates', desc: 'Logo Reveals, Breaking News, Trailers, VJ Loops & Infographics', icon: <Film size={16} /> },
  { id: 'envato_sfx', name: 'Sound Effects (SFX) Synthesizer Board', category: 'Audio', desc: '10 royalty free cinema SFX: Whoosh, Boom, Riser, Laser, Gaming, Rain', icon: <AudioWaveform size={16} /> },
  { id: 'envato_stock', name: 'Stock Media, B-Roll & Textures Explorer', category: 'Assets', desc: 'Live search across 800M+ free Creative Commons HD photos & textures', icon: <ImageIcon size={16} /> },
  { id: 'envato_graphics', name: 'Graphics, Mesh Gradients & Film Overlays', category: 'Graphics', desc: 'Generate 1080p gradients, film dust overlays, palettes & 1200x630 banners', icon: <Wand2 size={16} /> },
  { id: 'cinema_studio', name: 'Cinema Studio & Faceless Shorts', category: 'Video', desc: '7 Camera Rigs, ARRI/Kodak Optics, LUTs & Viral Captions', icon: <Film size={16} /> },
  { id: 'image_create', name: 'Create Image (Soul 2.0)', category: 'Image', desc: 'Generate styled high resolution cinema visuals', icon: <ImageIcon size={16} /> },
  { id: 'image_edit', name: 'Edit Image & LUT Grade', category: 'Image', desc: 'Color grade photos & add poster typography', icon: <Wand2 size={16} /> },
  { id: 'image_upscale', name: '4K Image Upscaler', category: 'Image', desc: '2x and 4x Lanczos super resolution enhancer', icon: <Maximize2 size={16} /> },
  { id: 'soul_character', name: 'Soul ID & AI Influencer Vault', category: 'Image', desc: 'Persistent character cast with hairstyle & outfit control', icon: <UserCheck size={16} /> },
  { id: 'mangaka', name: 'Mangaka Comic & Webtoon Studio', category: 'Image', desc: 'Generate 3 panel vertical manga strips', icon: <BookOpen size={16} /> },
  { id: 'video_edit', name: 'Edit Video (Trim & Speed)', category: 'Video', desc: 'Trim MP4s, change speed, apply LUTs & watermark', icon: <Scissors size={16} /> },
  { id: 'video_upscale', name: '4K Video Upscaler', category: 'Video', desc: 'Upscale clips to 2160p cinema H.264', icon: <Maximize2 size={16} /> },
  { id: 'video_reframe', name: 'Smart Video Reframe', category: 'Video', desc: 'Convert 16:9, 9:16 & 1:1 with blurred cinema fill', icon: <Crop size={16} /> },
  { id: 'click_to_ad', name: 'Click to Ad (Marketing Studio)', category: 'Studios', desc: 'Turn store URL & product into high converting ad', icon: <ShoppingBag size={16} /> },
  { id: 'genjutsu', name: 'Genjutsu & Lipsync Remake', category: 'Video', desc: 'Remake reference video preserving motion & timing', icon: <Sparkles size={16} /> },
  { id: 'short_drama', name: 'Short Drama Studio', category: 'Studios', desc: 'Dual actor vertical Anamorphic drama episodes', icon: <Clapperboard size={16} /> },
  { id: 'content_factory', name: 'Content Factory Batch Engine', category: 'Studios', desc: 'Render 3 complete niche videos in one click', icon: <Factory size={16} /> },
  { id: 'audio_tts', name: 'Text to Speech (318 Voices)', category: 'Audio', desc: 'Free neural narration across 70+ languages', icon: <Mic size={16} /> },
  { id: 'audio_voice_change', name: 'AI Voice Changer', category: 'Audio', desc: 'Transform voice into Deep Trailer, Radio, Cyber Robot', icon: <AudioWaveform size={16} /> },
  { id: 'audio_translate', name: 'Global Translate & Dub', category: 'Audio', desc: 'Translate & synthesize native neural voice dubs', icon: <Languages size={16} /> },
  { id: 'audio_visualizer', name: 'Spotify & Music Visualizer', category: 'Audio', desc: 'Audio reactive vertical waveform video maker', icon: <Music size={16} /> },
  { id: 'autopilot', name: 'Faceless Autopilot Channels', category: 'Studios', desc: 'Automated multi platform publishing queue', icon: <Radio size={16} /> },
  { id: 'ideas', name: 'Viral Idea & Hook Engine', category: 'Growth', desc: 'High retention hooks ready to load into studio', icon: <Lightbulb size={16} /> },
  { id: 'mcp_hub', name: 'MCP Server, CLI & Plugins', category: 'Developer', desc: 'Connect Claude, ChatGPT, Cursor, Telegram & CLI', icon: <Terminal size={16} /> },
  { id: 'settings', name: 'Publishing Webhooks & API Keys', category: 'Settings', desc: 'Save Make, Zapier, n8n webhooks & API keys', icon: <Settings size={16} /> }
];

export function CommandPalette({
  open,
  onClose,
  onSelect
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (id: ActiveTool) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = ALL_COMMANDS.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase()) ||
    c.desc.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % Math.max(1, filtered.length));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + Math.max(1, filtered.length)) % Math.max(1, filtered.length));
      }
      if (e.key === 'Enter' && filtered[activeIndex]) {
        onSelect(filtered[activeIndex].id);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIndex, onClose, onSelect]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 150,
        background: 'rgba(5, 5, 7, 0.78)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="glass-panel"
        style={{ width: '100%', maxWidth: '620px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.9)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <Search size={18} color="var(--accent)" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Jump to any AI studio, tool, or workflow..."
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '16px', outline: 'none' }}
          />
          <kbd className="mono caption-4" style={{ padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>ESC</kbd>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
          {filtered.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onSelect(item.id); onClose(); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', textAlign: 'left',
                background: idx === activeIndex ? 'rgba(217, 255, 0, 0.12)' : 'transparent',
                color: idx === activeIndex ? 'var(--accent)' : 'var(--text)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: idx === activeIndex ? 'var(--accent)' : 'var(--text-muted)' }}>{item.icon}</span>
                <div>
                  <div className="title-4" style={{ color: 'var(--text)' }}>{item.name}</div>
                  <div className="caption-4">{item.desc}</div>
                </div>
              </div>
              <span className="mono caption-4" style={{ textTransform: 'uppercase' }}>{item.category}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center' }} className="body-5">No matching tools found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExploreShowcase({
  videos,
  onLaunchTool,
  onSelectVideo
}: {
  videos: any[];
  onLaunchTool: (t: ActiveTool) => void;
  onSelectVideo: (v: any) => void;
}) {
  const hero3dRef = React.useRef<HTMLCanvasElement | null>(null);
  const mouseRef = React.useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const pts: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < 120; i++) {
      const u = (i / 120) * Math.PI * 2;
      const v = ((i % 12) / 12) * Math.PI * 2;
      pts.push({ x: (2.1 + 0.72 * Math.cos(v)) * Math.cos(u), y: (2.1 + 0.72 * Math.cos(v)) * Math.sin(u), z: 0.72 * Math.sin(v) });
    }
    const draw = (t: number) => {
      const cv = hero3dRef.current;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      const W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      const ay = t * 0.00045 + mouseRef.current.x * 0.7;
      const ax = t * 0.00028 + mouseRef.current.y * 0.5;
      const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
      const proj = pts.map(p => {
        const x1 = p.x * cy - p.z * sy;
        const z1 = p.x * sy + p.z * cy;
        const y2 = p.y * cx - z1 * sx;
        const z2 = p.y * sx + z1 * cx + 6.2;
        const f = 310 / z2;
        return { x: W * 0.78 + x1 * f, y: H * 0.48 + y2 * f };
      });
      ctx.strokeStyle = 'rgba(217, 255, 0, 0.24)';
      ctx.lineWidth = 1;
      for (let i = 0; i < proj.length; i++) {
        const a = proj[i], b = proj[(i + 1) % proj.length], c2 = proj[(i + 12) % proj.length];
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c2.x, c2.y); ctx.stroke();
        ctx.fillStyle = 'rgba(217, 255, 0, 0.75)';
        ctx.fillRect(a.x - 1.2, a.y - 1.2, 2.4, 2.4);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const highlights: { id: ActiveTool; title: string; badge: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'cinema_studio', title: 'Cinema Studio 3.0', badge: 'FLAGSHIP', desc: 'Deterministic camera rigs, ARRI & 35mm optics, Color LUTs, Hero Filmstrip & 122px viral captions.', icon: <Film size={20} color="var(--accent)" /> },
    { id: 'click_to_ad', title: 'Marketing Click to Ad', badge: 'E-COMMERCE', desc: 'Paste any store URL and price to render a vertical commercial ad with CTA overlay.', icon: <ShoppingBag size={20} color="var(--accent)" /> },
    { id: 'short_drama', title: 'Short Drama Studio', badge: 'NEW', desc: 'Dual actor vertical series with separate neural voices, Anamorphic 2.39 optics & Moody A24 grade.', icon: <Clapperboard size={20} color="var(--accent)" /> },
    { id: 'soul_character', title: 'Soul ID & AI Influencer', badge: 'CAST VAULT', desc: 'Create persistent AI influencers with hairstyle, outfit & ethnicity locked across projects.', icon: <UserCheck size={20} color="var(--accent)" /> },
    { id: 'blender_3d', title: 'Chat to 3D & Blender Studio', badge: '3D + BPY', desc: 'Interactive 360 degree 3D viewport + downloadable Blender 4.x Cycles Python scripts.', icon: <Wand2 size={20} color="var(--accent)" /> },
    { id: 'web_3d_builder', title: 'Interactive 3D Web Builder', badge: 'WEB 3D', desc: 'Generate mouse reactive 3D landing pages ready for instant single file deployment.', icon: <Terminal size={20} color="var(--accent)" /> },
    { id: 'mcp_hub', title: 'MCP Server & CLI', badge: 'AGENTIC', desc: 'Trigger cinema renders directly from Claude, Claude Code, ChatGPT, Cursor & Telegram.', icon: <Terminal size={20} color="var(--accent)" /> }
  ];

  return (
    <div style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Hero Section */}
      <section className="glass-panel" style={{ padding: '48px 36px', position: 'relative', overflow: 'hidden' }} onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); mouseRef.current = { x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 }; }}>
        <canvas ref={hero3dRef} width={1100} height={420} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start', padding: '4px 12px', borderRadius: '999px', background: 'rgba(217,255,0,0.1)', border: '1px solid rgba(217,255,0,0.28)' }}>
            <span className="live-dot" />
            <span className="mono caption-3" style={{ color: 'var(--accent)' }}>OMNIVIRAL STUDIO OS v8.0 • 45+ AI TOOLS • 3D & BLENDER</span>
          </div>
          <h1 className="heading-2" style={{ color: 'var(--text)' }}>
            Direct cinema grade AI videos, ads, and faceless channels on autopilot.
          </h1>
          <p className="body-5" style={{ fontSize: '16px', lineHeight: '24px', maxWidth: '640px', margin: 0 }}>
            One unified creative operating system combining deterministic camera controls, 318 neural voices, 6 specialized studios, real time audio tools, and a native MCP server.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
            <button type="button" onClick={() => onLaunchTool('cinema_studio')} className="volt-btn" style={{ padding: '0 24px', minHeight: '46px' }}>
              <Zap size={16} fill="var(--on-accent)" /> Launch Cinema Studio
            </button>
            <button type="button" onClick={() => onLaunchTool('studios_hub')} className="pill-btn" style={{ padding: '0 20px', minHeight: '46px', color: 'var(--text)' }}>
              Browse All 6 Studios <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Live Telemetry Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '36px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'NEURAL VOICES', value: '318 Global' },
            { label: 'CAMERA RIGS & LUTS', value: '7 Moves • 6 LUTs' },
            { label: 'RENDER COST', value: '$0.00 / Video' },
            { label: 'WCAG ACCESSIBILITY', value: 'AAA Verified' }
          ].map(stat => (
            <div key={stat.label}>
              <div className="mono caption-4">{stat.label}</div>
              <div className="heading-5" style={{ color: 'var(--text)', marginTop: '4px' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Studio Suite Cards */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="heading-5" style={{ color: 'var(--text)' }}>Fresh Drops & Flagship Toolkits</h2>
          <button type="button" onClick={() => onLaunchTool('studios_hub')} className="pill-btn" style={{ padding: '8px 14px', fontSize: '13px', color: 'var(--text)' }}>
            View All Studios <ArrowRight size={14} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {highlights.map(h => (
            <button key={h.title} type="button" onClick={() => onLaunchTool(h.id)} className="camera-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ padding: '8px', borderRadius: '10px', background: 'rgba(217,255,0,0.08)', border: '1px solid rgba(217,255,0,0.2)', display: 'inline-flex' }}>{h.icon}</span>
                <span className="mono caption-3" style={{ color: 'var(--on-accent)', background: 'var(--accent)', padding: '2px 8px', borderRadius: '6px' }}>{h.badge}</span>
              </div>
              <div className="title-3" style={{ color: 'var(--text)', fontWeight: 600 }}>{h.title}</div>
              <p className="body-5" style={{ margin: 0 }}>{h.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Recent Rendered Cinema Showcase */}
      {videos.length > 0 && (
        <section>
          <h2 className="heading-5" style={{ color: 'var(--text)', marginBottom: '16px' }}>Recent Cinema Renders</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {videos.slice(0, 4).map(v => (
              <div key={v.id} className="glass-panel" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => { onSelectVideo(v); onLaunchTool('cinema_studio'); }}>
                <div style={{ height: '280px', background: '#000', position: 'relative' }}>
                  <video src={`${API_BASE}${v.url}`} muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span className="mono caption-3" style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(5,5,7,0.8)', color: 'var(--accent)', padding: '3px 8px', borderRadius: '6px' }}>
                    {v.duration}s
                  </span>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="title-4" style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</span>
                  <Play size={14} color="var(--accent)" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
