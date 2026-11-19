import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Globe, Film, Volume2, Search, Palette, Download,
  Sparkles, Copy, Check, Play, RotateCw, Layers, Code2
} from 'lucide-react';
import { DotGridLoader } from './ui/StudioPrimitives';
import type { ActiveTool } from './ToolSuites';

const API_BASE = 'http://127.0.0.1:8000';

interface Props {
  activeTool: ActiveTool;
  onVideoCreated: (v: any) => void;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

export default function Envato3DSuite({ activeTool, onVideoCreated, onNotify }: Props) {
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Chat-to-3D / Blender Studio
  const [bPrompt, setBPrompt] = useState('Cyberpunk neon city with glowing volt monoliths and floating torus sculpture');
  const [bPreset, setBPreset] = useState('cyber_city');
  const [bAccent, setBAccent] = useState('D9FF00');
  const [bOut, setBOut] = useState<any>(null);
  const [copiedBpy, setCopiedBpy] = useState(false);
  const [orbitRot, setOrbitRot] = useState({ rx: 0.45, ry: 0.2 });
  const dragRef = useRef<{ down: boolean; lx: number; ly: number }>({ down: false, lx: 0, ly: 0 });
  const canvas3dRef = useRef<HTMLCanvasElement | null>(null);

  // 2. Interactive 3D Web Template Builder
  const [wBrand, setWBrand] = useState('AETHER STUDIO');
  const [wHead, setWHead] = useState('Build Interactive 3D Experiences At Zero Cost');
  const [wSub, setWSub] = useState('Mouse reactive WebGL geometry, glassmorphic sections, and single file instant deployment.');
  const [wCta, setWCta] = useState('Launch Platform');
  const [wType, setWType] = useState('saas_3d');
  const [wAccent, setWAccent] = useState('D9FF00');
  const [wOut, setWOut] = useState<any>(null);

  // 3. Envato Video Templates
  const [tplId, setTplId] = useState('logo_reveal');
  const [tplP1, setTplP1] = useState('OMNIVIRAL STUDIO');
  const [tplP2, setTplP2] = useState('NEXT GEN AI CINEMA OS');
  const [tplRatio, setTplRatio] = useState('16:9');
  const [tplAccent, setTplAccent] = useState('D9FF00');
  const [tplUrl, setTplUrl] = useState<string | null>(null);

  // 4. Envato SFX Library
  const [sfxList, setSfxList] = useState<any[]>([]);
  const [sfxCat, setSfxCat] = useState('All');

  // 5. Envato Stock Explorer
  const [stockQ, setStockQ] = useState('cyberpunk neon city');
  const [stockItems, setStockItems] = useState<any[]>([]);

  // 6. Envato Graphics & Textures
  const [gfxKind, setGfxKind] = useState('social_banner');
  const [gfxTitle, setGfxTitle] = useState('CREATIVE ASSET TOOLKIT');
  const [gfxSub, setGfxSub] = useState('GENERATED IN OMNIVIRAL OS v8.0');
  const [gfxAccent, setGfxAccent] = useState('D9FF00');
  const [gfxUrl, setGfxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (activeTool === 'envato_sfx') {
      fetch(`${API_BASE}/api/envato/sfx-library`).then(r => r.json()).then(setSfxList).catch(() => {});
    }
    if (activeTool === 'envato_stock' && stockItems.length === 0) {
      runStockSearch('cyberpunk neon city');
    }
  }, [activeTool]);

  // Real-time Interactive 3D Viewport Engine (Drag to Orbit 360deg!)
  useEffect(() => {
    if (activeTool !== 'blender_3d') return;
    let raf = 0;
    const render = (t: number) => {
      const cv = canvas3dRef.current;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      const W = cv.width, H = cv.height;
      const acc = `#${bAccent}`;

      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, W, H);

      const ay = orbitRot.ry + t * 0.00055;
      const ax = orbitRot.rx;
      const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);

      const project = (x: number, y: number, z: number) => {
        const x1 = x * cy - z * sy;
        const z1 = x * sy + z * cy;
        const y2 = y * cx - z1 * sx;
        const z2 = y * sx + z1 * cx + 9.5;
        const f = 430 / Math.max(1.5, z2);
        return { x: W / 2 + x1 * f, y: H / 2 + y2 * f, z: z2 };
      };

      // Perspective 3D Floor Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let g = -5; g <= 5; g++) {
        const a = project(g * 1.1, 2.2, -5.5), b = project(g * 1.1, 2.2, 5.5);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        const c = project(-5.5, 2.2, g * 1.1), d = project(5.5, 2.2, g * 1.1);
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
      }

      // Draw 3D Scene Geometry based on Preset
      if (bPreset === 'orbital_planet') {
        // Wireframe Sphere + Orbital Rings
        ctx.strokeStyle = `${acc}99`;
        for (let lat = -60; lat <= 60; lat += 20) {
          const r = 1.9 * Math.cos((lat * Math.PI) / 180);
          const py = 1.9 * Math.sin((lat * Math.PI) / 180);
          ctx.beginPath();
          for (let i = 0; i <= 36; i++) {
            const ang = (i / 36) * Math.PI * 2;
            const p = project(Math.cos(ang) * r, py, Math.sin(ang) * r);
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
        ctx.strokeStyle = '#38BDF8CC';
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const ang = (i / 60) * Math.PI * 2;
          const p = project(Math.cos(ang) * 3.5, Math.sin(ang) * 0.5, Math.sin(ang) * 3.5);
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      } else {
        // Cyber City Monoliths / Glass Towers + Floating Torus Sculpture
        const drawBox = (bx: number, by: number, bz: number, sx2: number, sy2: number, sz2: number, color: string) => {
          const v = [
            [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
            [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]
          ].map(([dx,dy,dz]) => project(bx + dx*sx2, by + dy*sy2, bz + dz*sz2));
          const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
          ctx.strokeStyle = color;
          edges.forEach(([i,j]) => {
            ctx.beginPath(); ctx.moveTo(v[i].x, v[i].y); ctx.lineTo(v[j].x, v[j].y); ctx.stroke();
          });
        };
        const towerCount = bPreset === 'glass_monolith' ? 6 : 12;
        for (let i = 0; i < towerCount; i++) {
          const ang = (i / towerCount) * Math.PI * 2;
          const rad = bPreset === 'product_stage' ? 3.8 : (2.6 + (i % 2) * 1.4);
          const th = bPreset === 'glass_monolith' ? 2.4 : (0.9 + (i % 4) * 0.55);
          drawBox(Math.cos(ang) * rad, 2.2 - th, Math.sin(ang) * rad, 0.35, th, 0.35, i % 3 === 0 ? `${acc}CC` : 'rgba(56,189,248,0.55)');
        }
        // Center Floating Torus Knot
        ctx.strokeStyle = acc;
        ctx.beginPath();
        for (let i = 0; i <= 96; i++) {
          const u = (i / 96) * Math.PI * 2;
          const r = 1.4 + 0.45 * Math.cos(3 * u);
          const p = project(r * Math.cos(2 * u), 0.35 * Math.sin(3 * u) - 0.2, r * Math.sin(2 * u));
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // HUD Telemetry overlay
      ctx.fillStyle = acc;
      ctx.font = '600 11px monospace';
      ctx.fillText(`BLENDER 3D VIEWPORT // ${bPreset.toUpperCase()} // DRAG TO ORBIT`, 16, 24);

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [activeTool, bPreset, bAccent, orbitRot]);

  const runBlenderGen = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/envato/blender-scene`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: bPrompt, preset: bPreset, accent_hex: bAccent })
      });
      const d = await r.json();
      setBPreset(d.preset);
      setBOut(d);
      onNotify('success', 'Blender 4.x Python (bpy) scene & 3D viewport generated');
    } catch { onNotify('error', 'Failed to generate Blender scene'); }
    finally { setLoading(false); }
  };

  const runWeb3D = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/envato/web-template`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: wBrand, headline: wHead, subtext: wSub, cta: wCta, accent_hex: wAccent, template_type: wType })
      });
      const d = await r.json();
      setWOut(d);
      onNotify('success', 'Interactive 3D Website compiled');
    } catch { onNotify('error', '3D Web generation failed'); }
    finally { setLoading(false); }
  };

  const runVideoTpl = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/envato/video-template`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: tplId, primary_text: tplP1, secondary_text: tplP2, accent_hex: tplAccent, aspect_ratio: tplRatio })
      });
      const d = await r.json();
      setTplUrl(`${API_BASE}${d.url}`);
      onVideoCreated(d);
      onNotify('success', `60fps ${tplId.replace('_', ' ')} template mastered`);
    } catch { onNotify('error', 'Template render failed'); }
    finally { setLoading(false); }
  };

  const runStockSearch = async (qStr: string) => {
    setLoading(true);
    setStockQ(qStr);
    try {
      const r = await fetch(`${API_BASE}/api/envato/stock-search?q=${encodeURIComponent(qStr)}&page_size=12`);
      const d = await r.json();
      setStockItems(d.results || []);
    } catch { onNotify('error', 'Stock search error'); }
    finally { setLoading(false); }
  };

  const runGraphics = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/envato/graphics`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: gfxKind, title: gfxTitle, subtitle: gfxSub, accent_hex: gfxAccent })
      });
      const d = await r.json();
      setGfxUrl(`${API_BASE}${d.url}`);
      onNotify('success', 'High resolution graphic asset rendered');
    } catch { onNotify('error', 'Graphic render failed'); }
    finally { setLoading(false); }
  };

  const wrap = (title: string, badge: string, desc: string, children: React.ReactNode) => (
    <div style={{ maxWidth: '1320px', width: '100%', margin: '24px auto', padding: '0 24px' }}>
      <audio ref={audioRef} style={{ display: 'none' }} />
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <h2 className="heading-5" style={{ color: 'var(--text)' }}>{title}</h2>
          <span className="mono caption-3" style={{ background: 'var(--accent)', color: 'var(--on-accent)', padding: '3px 10px', borderRadius: '6px' }}>{badge}</span>
        </div>
        <p className="body-5" style={{ margin: '0 0 24px' }}>{desc}</p>
        {children}
      </div>
    </div>
  );

  // 1. CHAT-TO-3D / BLENDER STUDIO (YouTube Short dF_uxyJyeu0)
  if (activeTool === 'blender_3d') {
    return wrap('Chat to 3D & Blender Scene Studio', 'LIVE 3D + BPY EXPORT', 'Describe any 3D world to update the live interactive 360 degree viewport AND export a ready to run Blender 4.x Python (bpy) Cycles script.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: '24px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', background: '#050507', cursor: 'grab' }}
            onMouseDown={e => { dragRef.current = { down: true, lx: e.clientX, ly: e.clientY }; }}
            onMouseUp={() => { dragRef.current.down = false; }}
            onMouseLeave={() => { dragRef.current.down = false; }}
            onMouseMove={e => {
              if (!dragRef.current.down) return;
              const dx = e.clientX - dragRef.current.lx;
              const dy = e.clientY - dragRef.current.ly;
              dragRef.current.lx = e.clientX;
              dragRef.current.ly = e.clientY;
              setOrbitRot(p => ({ rx: Math.max(-1.2, Math.min(1.2, p.rx + dy * 0.008)), ry: p.ry + dx * 0.01 }));
            }}
          >
            <canvas ref={canvas3dRef} width={760} height={420} style={{ width: '100%', height: '420px', display: 'block' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[['cyber_city', 'Cyberpunk Megacity'], ['glass_monolith', 'Glass Monoliths'], ['orbital_planet', 'Orbital Planet'], ['product_stage', '3D Product Stage']].map(([id, n]) => (
              <button key={id} type="button" onClick={() => setBPreset(id)} className={`pill-btn ${bPreset === id ? 'active' : ''}`} style={{ padding: '8px 14px', fontSize: '13px' }}>{n}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input className="studio-input" value={bPrompt} onChange={e => setBPrompt(e.target.value)} placeholder="Chat to build a 3D Blender scene..." />
            <button type="button" onClick={runBlenderGen} disabled={loading} className="volt-btn" style={{ whiteSpace: 'nowrap' }}>
              <Box size={16} /> {loading ? 'Generating...' : 'Build 3D + bpy'}
            </button>
          </div>
        </div>

        <div className="camera-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mono caption-3" style={{ color: 'var(--accent)' }}>BLENDER 4.X PYTHON (BPY)</span>
            {bOut && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" onClick={() => { navigator.clipboard.writeText(bOut.bpy_code); setCopiedBpy(true); onNotify('success', 'bpy script copied'); setTimeout(() => setCopiedBpy(false), 2000); }} className="pill-btn" style={{ padding: '5px 10px', fontSize: '12px', color: 'var(--text)' }}>
                  {copiedBpy ? <Check size={13} color="var(--accent)" /> : <Copy size={13} />} Copy
                </button>
                <a href={`${API_BASE}${bOut.bpy_url}`} download={bOut.bpy_filename} className="volt-btn" style={{ minHeight: '30px', padding: '0 10px', fontSize: '12px' }}>
                  <Download size={13} /> .py
                </a>
              </div>
            )}
          </div>
          <pre className="mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', fontSize: '11px', color: 'var(--accent)', maxHeight: '420px', overflow: 'auto', margin: 0 }}>
            {bOut?.bpy_code || '# Click "Build 3D + bpy" to synthesize a complete Cycles / EEVEE Blender Python script ready for: blender --python scene.py'}
          </pre>
        </div>
      </div>
    ));
  }

  // 2. INTERACTIVE 3D WEBSITE GENERATOR (YouTube Short BwSMNbleLAE + Envato Web Templates)
  if (activeTool === 'web_3d_builder') {
    return wrap('Interactive 3D Website Builder', 'LIVE 3D HTML EXPORT', 'Generate standalone mouse reactive 3D websites for SaaS launches, agencies, portfolios, and eCommerce in a single HTML file.', (
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <select className="studio-input" value={wType} onChange={e => setWType(e.target.value)}>
            <option value="saas_3d">SaaS 3D Launch Page</option>
            <option value="portfolio_3d">3D Creative Portfolio</option>
            <option value="agency_3d">AI Agency Landing Page</option>
            <option value="ecommerce_3d">3D Product Showcase</option>
          </select>
          <input className="studio-input" value={wBrand} onChange={e => setWBrand(e.target.value)} placeholder="Brand Name" />
          <input className="studio-input" value={wHead} onChange={e => setWHead(e.target.value)} placeholder="Hero Headline" />
          <textarea className="studio-input" rows={3} value={wSub} onChange={e => setWSub(e.target.value)} placeholder="Hero Subtext" />
          <input className="studio-input" value={wCta} onChange={e => setWCta(e.target.value)} placeholder="CTA Button Label" />
          <div style={{ display: 'flex', gap: '6px' }}>
            {[['D9FF00', 'Volt'], ['38BDF8', 'Cyan'], ['F43F5E', 'Crimson'], ['A855F7', 'Violet']].map(([hex, n]) => (
              <button key={hex} type="button" onClick={() => setWAccent(hex)} className={`pill-btn ${wAccent === hex ? 'active' : ''}`} style={{ flex: 1, padding: '7px', fontSize: '12px' }}>{n}</button>
            ))}
          </div>
          <button type="button" onClick={runWeb3D} disabled={loading} className="volt-btn" style={{ minHeight: '46px' }}>
            <Globe size={16} /> {loading ? 'Compiling 3D Site...' : 'Generate Interactive 3D Website'}
          </button>
          {wOut && (
            <a href={`${API_BASE}${wOut.url}`} download={wOut.filename} className="pill-btn" style={{ padding: '10px', color: 'var(--accent)', justifyContent: 'center' }}>
              <Download size={15} /> Download Standalone .HTML
            </a>
          )}
        </div>

        <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', background: '#050507', height: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {wOut ? (
            <iframe title="3D Website Preview" srcDoc={wOut.html} style={{ width: '100%', height: '100%', border: 'none' }} />
          ) : (
            <div style={{ textAlign: 'center', padding: '24px' }} className="body-5">
              Click <strong style={{ color: 'var(--accent)' }}>Generate Interactive 3D Website</strong> to preview a live interactive 3D site here.
            </div>
          )}
        </div>
      </div>
    ));
  }

  // 3. ENVATO VIDEO TEMPLATES (Logo Reveal, Lower Third, Breaking News, Trailer, VJ Loop, Infographic)
  if (activeTool === 'envato_templates') {
    const templates = [
      { id: 'logo_reveal', name: 'Logo Reveal Intro', desc: 'Kinetic framed brand reveal + Impact Boom SFX' },
      { id: 'lower_third', name: 'Broadcast Lower Third', desc: 'Eased sliding speaker title + Whoosh SFX' },
      { id: 'breaking_news', name: 'Breaking News Package', desc: 'Red alert banner + scrolling live news ticker' },
      { id: 'trailer_title', name: 'Cinema Trailer Title', desc: 'Anamorphic widescreen fade + Sub Riser SFX' },
      { id: 'vj_loop', name: 'Seamless VJ Neon Loop', desc: 'Hypnotic real time plasma wave visual loop' },
      { id: 'infographic', name: 'Animated Infographic', desc: '3 bar animated data metric breakdown chart' }
    ];
    return wrap('Envato Style 60fps Video Templates', '6 BROADCAST TEMPLATES', 'Render ready to drop in Logo Reveals, Lower Thirds, Breaking News stingers, Trailers, VJ Loops, and Animated Infographics at 60fps.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {templates.map(t => (
              <button key={t.id} type="button" onClick={() => setTplId(t.id)} className={`camera-card ${tplId === t.id ? 'active' : ''}`} style={{ padding: '12px' }}>
                <div className="title-4" style={{ color: 'var(--text)', fontWeight: 600 }}>{t.name}</div>
                <div className="caption-4" style={{ marginTop: '4px' }}>{t.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '10px' }}>
            <input className="studio-input" value={tplP1} onChange={e => setTplP1(e.target.value)} placeholder="Primary Title" />
            <input className="studio-input" value={tplP2} onChange={e => setTplP2(e.target.value)} placeholder="Subtitle / Ticker" />
            <select className="studio-input" value={tplRatio} onChange={e => setTplRatio(e.target.value)}>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
            </select>
          </div>
          <button type="button" onClick={runVideoTpl} disabled={loading} className="volt-btn" style={{ minHeight: '46px' }}>
            <Film size={16} /> {loading ? 'Rendering 60fps Template...' : 'Render 60fps Template MP4'}
          </button>
        </div>

        <div style={{ background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)', minHeight: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          {loading ? <DotGridLoader label="RENDERING 60FPS TEMPLATE" /> : tplUrl ? <video key={tplUrl} src={tplUrl} controls autoPlay loop style={{ width: '100%', maxHeight: '340px', borderRadius: '10px' }} /> : <span className="body-5">60fps Template preview</span>}
        </div>
      </div>
    ));
  }

  // 4. ENVATO SOUND EFFECTS (SFX) BOARD
  if (activeTool === 'envato_sfx') {
    const cats = ['All', 'Transitions', 'Movie', 'Trailer', 'Interface', 'Gaming', 'Futuristic', 'Broadcast', 'Nature'];
    const shown = sfxCat === 'All' ? sfxList : sfxList.filter(x => x.category === sfxCat);
    return wrap('Sound Effects (SFX) Synthesizer & Library', '10 ROYALTY FREE SFX', 'Preview and download crisp cinema whooshes, impact booms, sub risers, UI taps, gaming coins, lasers, and stingers at $0 cost.', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {cats.map(c => <button key={c} type="button" onClick={() => setSfxCat(c)} className={`pill-btn ${sfxCat === c ? 'active' : ''}`} style={{ padding: '7px 12px', fontSize: '12px' }}>{c}</button>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {shown.map(s => (
            <div key={s.id} className="camera-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px' }}>
              <div>
                <div className="title-4" style={{ color: 'var(--text)', fontWeight: 600 }}>{s.name}</div>
                <div className="mono caption-4">{s.category.toUpperCase()} • {s.duration}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => { if (audioRef.current) { audioRef.current.src = `${API_BASE}/api/envato/sfx-preview?sfx_id=${s.id}`; audioRef.current.play().catch(() => {}); } }}
                  className="pill-btn"
                  style={{ padding: '8px 12px', color: 'var(--accent)' }}
                >
                  <Play size={14} /> Preview
                </button>
                <a href={`${API_BASE}/api/envato/sfx-preview?sfx_id=${s.id}`} download={`omniviral_sfx_${s.id}.mp3`} className="volt-btn" style={{ minHeight: '34px', padding: '0 12px', fontSize: '12px' }}>
                  <Download size={13} /> MP3
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    ));
  }

  // 5. ENVATO STOCK PHOTOS, B-ROLL & TEXTURES EXPLORER
  if (activeTool === 'envato_stock') {
    const tags = ['cyberpunk neon', 'cinematic nature', 'luxury business', 'futuristic technology', 'dark texture', 'abstract architecture', 'space galaxy', 'vintage film'];
    return wrap('Stock Media, B-Roll & Textures Explorer', '800M+ FREE HD ASSETS', 'Search millions of Creative Commons high resolution photographs, B-roll frames, backgrounds, and textures.', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input className="studio-input" value={stockQ} onChange={e => setStockQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && runStockSearch(stockQ)} placeholder="Search stock photos, textures, B-roll frames..." />
          <button type="button" onClick={() => runStockSearch(stockQ)} disabled={loading} className="volt-btn" style={{ whiteSpace: 'nowrap' }}>
            <Search size={15} /> Search Catalog
          </button>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {tags.map(t => <button key={t} type="button" onClick={() => runStockSearch(t)} className="pill-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>{t}</button>)}
        </div>
        {loading ? <DotGridLoader label="SEARCHING 800M+ ASSETS" /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {stockItems.map((it, idx) => (
              <div key={idx} className="camera-card" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <img src={it.thumbnail} alt={it.title} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', background: '#050507' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono caption-4">{it.license} • {it.width || 1080}px</span>
                  <a href={it.url} target="_blank" rel="noreferrer" className="pill-btn" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--accent)' }}><Download size={12} /> Open HD</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ));
  }

  // 6. ENVATO GRAPHICS, TEXTURES, OVERLAYS & SOCIAL BANNERS
  if (activeTool === 'envato_graphics') {
    return wrap('Graphics, Textures, Film Overlays & Social Banners', '1920P & 1200X630 PNG', 'Generate seamless mesh gradients, film dust overlays, brand palette cards, and social OpenGraph banners on demand.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[['social_banner', 'Social Banner (1200x630)'], ['mesh_gradient', 'Mesh Gradient BG (1080p)'], ['film_dust', 'Film Dust & Grain Overlay'], ['palette_card', 'Brand Color Palette Card']].map(([id, n]) => (
              <button key={id} type="button" onClick={() => setGfxKind(id)} className={`pill-btn ${gfxKind === id ? 'active' : ''}`} style={{ padding: '10px', fontSize: '13px' }}>{n}</button>
            ))}
          </div>
          <input className="studio-input" value={gfxTitle} onChange={e => setGfxTitle(e.target.value)} placeholder="Title" />
          <input className="studio-input" value={gfxSub} onChange={e => setGfxSub(e.target.value)} placeholder="Subtitle" />
          <button type="button" onClick={runGraphics} disabled={loading} className="volt-btn"><Palette size={16} /> {loading ? 'Generating Graphic...' : 'Render High Res Asset PNG'}</button>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)', minHeight: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px' }}>
          {gfxUrl ? <><img src={gfxUrl} alt="Graphic Asset" style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '10px' }} /><a href={gfxUrl} download className="volt-btn" style={{ marginTop: '12px' }}><Download size={14} /> Download PNG</a></> : <span className="body-5">Graphic asset renders here</span>}
        </div>
      </div>
    ));
  }

  return null;
}
