import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon, Wand2, Sparkles, Upload, Download, Maximize2,
  UserCheck, BookOpen, Scissors, Crop, ShoppingBag, Clapperboard,
  Mic, AudioWaveform, Languages, Terminal, Cpu, Play, Check, Copy,
  Film, Radio, Zap, Layers, Sliders
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

export type ActiveTool =
  | 'cinema_studio'
  | 'image_create' | 'image_edit' | 'image_upscale' | 'soul_character' | 'mangaka'
  | 'video_edit' | 'video_upscale' | 'video_reframe' | 'click_to_ad' | 'genjutsu' | 'short_drama' | 'content_factory'
  | 'audio_tts' | 'audio_voice_change' | 'audio_translate' | 'audio_visualizer'
  | 'studios_hub' | 'mcp_hub' | 'autopilot' | 'ideas' | 'settings';

interface ToolSuitesProps {
  activeTool: ActiveTool;
  setActiveTool: (t: ActiveTool) => void;
  onVideoCreated: (v: any) => void;
  voices: any[];
}

export default function ToolSuites({ activeTool, setActiveTool, onVideoCreated, voices }: ToolSuitesProps) {
  // Image Create
  const [imgPrompt, setImgPrompt] = useState('cyberpunk samurai standing under neon rain dramatic 8k');
  const [imgStyle, setImgStyle] = useState('teal_orange');
  const [imgRatio, setImgRatio] = useState('9:16');
  const [imgModel, setImgModel] = useState('Higgsfield Soul 2.0');
  const [imgResult, setImgResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Image Edit / Upscale
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [editLut, setEditLut] = useState('teal_orange');
  const [editContrast, setEditContrast] = useState(1.15);
  const [editSat, setEditSat] = useState(1.2);
  const [editOverlay, setEditOverlay] = useState('');
  const [upscaleFactor, setUpscaleFactor] = useState(2);

  // Soul ID Characters
  const [characters, setCharacters] = useState<any[]>([]);
  const [charName, setCharName] = useState('Nova Lin');
  const [charHair, setCharHair] = useState('Platinum Bob Cut');
  const [charOutfit, setCharOutfit] = useState('Black Minimalist Leather Jacket');
  const [charEth, setCharEth] = useState('East Asian');
  const [charVibe, setCharVibe] = useState('High Fashion AI Influencer');

  // Mangaka
  const [mangaTitle, setMangaTitle] = useState('CHRONICLES OF THE VOID');
  const [panel1, setPanel1] = useState('A lone warrior enters a rain-soaked neon alley');
  const [panel2, setPanel2] = useState('Glowing red eyes appear from the shadows');
  const [panel3, setPanel3] = useState('A blinding sword flash shatters the night');
  const [mangaResult, setMangaResult] = useState<string | null>(null);

  // Video Tools (Edit / Upscale / Reframe / Genjutsu / Click to Ad / Short Drama)
  const [vidResult, setVidResult] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimDur, setTrimDur] = useState(12);
  const [vidSpeed, setVidSpeed] = useState(1.0);
  const [reframeMode, setReframeMode] = useState('blur_bg');
  const [reframeRatio, setReframeRatio] = useState('9:16');

  // Click to Ad
  const [storeUrl, setStoreUrl] = useState('auratech.store');
  const [productName, setProductName] = useState('Aura Pro Smart Ring');
  const [price, setPrice] = useState('$149');
  const [cta, setCta] = useState('SHOP NOW - 40% OFF');

  // Genjutsu / Lipsync
  const [genjScript, setGenjScript] = useState('Watch how this scene transforms completely while keeping the exact motion and timing.');
  const [genjVoice, setGenjVoice] = useState('en-US-ChristopherNeural');
  const [genjLut, setGenjLut] = useState('cyberpunk');

  // Short Drama
  const [dramaTitle, setDramaTitle] = useState('Midnight Betrayal');
  const [dramaLines, setDramaLines] = useState([
    { speaker: 'A', text: 'You told me nobody else knew about the vault.', query: 'dark luxury office night shadow man' },
    { speaker: 'B', text: 'I never lied. I just never told you who opened it.', query: 'mysterious woman silhouette neon window' },
    { speaker: 'A', text: 'Then explain why your keycard is on the log.', query: 'security monitor red warning dark room' }
  ]);

  // Audio Tools
  const [ttsText, setTtsText] = useState('In a world run by algorithms, those who master storytelling hold the ultimate leverage.');
  const [ttsVoice, setTtsVoice] = useState('en-US-ChristopherNeural');
  const [ttsRate, setTtsRate] = useState('+5%');
  const [audioResult, setAudioResult] = useState<string | null>(null);
  const [vcPreset, setVcPreset] = useState('deep_trailer');
  const [dubLang, setDubLang] = useState('es');
  const [dubTranslated, setDubTranslated] = useState('');

  // Studios Filter & MCP Tab
  const [studioFilter, setStudioFilter] = useState('All');
  const [mcpClient, setMcpClient] = useState<'claude' | 'claude_code' | 'chatgpt' | 'telegram' | 'cli'>('claude');
  const [copiedMcp, setCopiedMcp] = useState(false);

  // Content Factory Batch
  const [batchResults, setBatchResults] = useState<any[]>([]);

  useEffect(() => {
    if (activeTool === 'soul_character') {
      fetch(`${API_BASE}/api/tools/characters`).then(r => r.json()).then(setCharacters).catch(() => {});
    }
  }, [activeTool]);

  const runImageCreate = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/tools/image/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imgPrompt, style: imgStyle, aspect_ratio: imgRatio, model: imgModel })
      });
      const d = await r.json();
      setImgResult(`${API_BASE}${d.url}`);
    } finally { setLoading(false); }
  };

  const runImageEdit = async () => {
    if (!uploadFile) return alert('Upload an image first');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('lut', editLut);
      fd.append('contrast', String(editContrast));
      fd.append('saturation', String(editSat));
      fd.append('overlay_text', editOverlay);
      const r = await fetch(`${API_BASE}/api/tools/image/edit`, { method: 'POST', body: fd });
      const d = await r.json();
      setImgResult(`${API_BASE}${d.url}`);
    } finally { setLoading(false); }
  };

  const runImageUpscale = async () => {
    if (!uploadFile) return alert('Upload an image first');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('scale', String(upscaleFactor));
      const r = await fetch(`${API_BASE}/api/tools/image/upscale`, { method: 'POST', body: fd });
      const d = await r.json();
      setImgResult(`${API_BASE}${d.url}`);
    } finally { setLoading(false); }
  };

  const runCreateCharacter = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/tools/characters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: charName, hairstyle: charHair, outfit: charOutfit, ethnicity: charEth, vibe: charVibe })
      });
      const d = await r.json();
      setCharacters(prev => [d, ...prev]);
    } finally { setLoading(false); }
  };

  const runMangaka = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/tools/image/mangaka`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: mangaTitle, panels: [panel1, panel2, panel3] })
      });
      const d = await r.json();
      setMangaResult(`${API_BASE}${d.url}`);
    } finally { setLoading(false); }
  };

  const runVideoUploadTool = async (endpoint: string, extra: Record<string, string>) => {
    if (!uploadFile) return alert('Upload a video file (MP4) first');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
      const r = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: fd });
      const d = await r.json();
      setVidResult(`${API_BASE}${d.url}`);
    } finally { setLoading(false); }
  };

  const runClickToAd = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/tools/video/click-to-ad`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_url: storeUrl, product_name: productName, price, cta })
      });
      const d = await r.json();
      setVidResult(`${API_BASE}${d.url}`);
      onVideoCreated(d);
    } finally { setLoading(false); }
  };

  const runShortDrama = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/tools/video/short-drama`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: dramaTitle, lines: dramaLines })
      });
      const d = await r.json();
      setVidResult(`${API_BASE}${d.url}`);
      onVideoCreated(d);
    } finally { setLoading(false); }
  };

  const runContentFactory = async () => {
    setLoading(true);
    setBatchResults([]);
    const niches = ['dark_psychology', 'stoicism', 'wealth_secrets'];
    try {
      for (const n of niches) {
        const r = await fetch(`${API_BASE}/api/videos/generate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ niche: n, camera_move: 'dolly_in', color_fx: 'teal_orange', caption_style: 'volt' })
        });
        const d = await r.json();
        setBatchResults(prev => [...prev, d]);
        onVideoCreated(d);
      }
    } finally { setLoading(false); }
  };

  const runTTS = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/tools/audio/tts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText, voice_id: ttsVoice, rate: ttsRate })
      });
      const d = await r.json();
      setAudioResult(`${API_BASE}${d.url}`);
    } finally { setLoading(false); }
  };

  const runVoiceChange = async () => {
    if (!uploadFile) return alert('Upload an MP3/WAV audio file first');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('preset', vcPreset);
      const r = await fetch(`${API_BASE}/api/tools/audio/voice-change`, { method: 'POST', body: fd });
      const d = await r.json();
      setAudioResult(`${API_BASE}${d.url}`);
    } finally { setLoading(false); }
  };

  const runTranslateDub = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/tools/audio/translate-dub`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText, target_lang: dubLang })
      });
      const d = await r.json();
      setDubTranslated(d.translated_text);
      setAudioResult(`${API_BASE}${d.url}`);
    } finally { setLoading(false); }
  };

  const wrap = (title: string, badge: string, desc: string, children: React.ReactNode) => (
    <div style={{ maxWidth: '1240px', width: '100%', margin: '20px auto', padding: '0 20px' }}>
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <h2 className="heading-font" style={{ margin: 0, fontSize: '1.4rem', color: '#fff' }}>{title}</h2>
          <span className="mono" style={{ fontSize: '0.68rem', color: '#050507', background: '#D9FF00', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>{badge}</span>
        </div>
        <p style={{ color: '#a1a1aa', fontSize: '0.85rem', margin: '0 0 20px' }}>{desc}</p>
        {children}
      </div>
    </div>
  );

  // --- IMAGE SUITE VIEWS ---
  if (activeTool === 'image_create') {
    return wrap('Create Image Studio', 'SOUL 2.0 • 8K PIPELINE', 'Generate styled cinema photography & art across multiple visual models and aspect ratios.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="mono" style={{ fontSize: '0.7rem', color: '#D9FF00' }}>MODEL ENGINE</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {['Higgsfield Soul 2.0', 'Nano Banana 2.1', 'GPT Image 2.6 Sunburst', 'Seedream 5.5', 'Kling Image 4.0'].map(m => (
                <button key={m} onClick={() => setImgModel(m)} className={`pill-btn ${imgModel === m ? 'active' : ''}`} style={{ padding: '7px 12px', fontSize: '0.75rem', fontWeight: 600 }}>{m}</button>
              ))}
            </div>
          </div>
          <textarea className="studio-input" rows={3} value={imgPrompt} onChange={e => setImgPrompt(e.target.value)} placeholder="Describe your shot..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <select className="studio-input" value={imgStyle} onChange={e => setImgStyle(e.target.value)}>
              <option value="teal_orange">Teal & Orange Cinema</option>
              <option value="cyberpunk">Cyberpunk Neon</option>
              <option value="noir">Film Noir B&W</option>
              <option value="moody_a24">Moody A24</option>
              <option value="kodak_2383">Kodak 2383 Film</option>
            </select>
            <select className="studio-input" value={imgRatio} onChange={e => setImgRatio(e.target.value)}>
              <option value="9:16">9:16 Vertical</option>
              <option value="16:9">16:9 Widescreen</option>
              <option value="1:1">1:1 Square</option>
            </select>
          </div>
          <button onClick={runImageCreate} disabled={loading} className="volt-btn" style={{ padding: '13px', borderRadius: '10px', fontSize: '0.9rem' }}>
            {loading ? 'GENERATING IMAGE...' : '⚡ GENERATE IMAGE'}
          </button>
        </div>
        <div style={{ background: '#050507', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', minHeight: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          {imgResult ? (
            <>
              <img src={imgResult} alt="Generated" style={{ maxWidth: '100%', maxHeight: '340px', borderRadius: '10px' }} />
              <a href={imgResult} download className="volt-btn" style={{ marginTop: '10px', padding: '7px 14px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.78rem' }}>Download JPG</a>
            </>
          ) : <span style={{ color: '#52525b', fontSize: '0.82rem' }}>Generated artwork appears here</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'image_edit') {
    return wrap('Edit Image & Cinema Color Studio', 'LIVE FX', 'Upload any photo to apply Cinema LUTs, contrast/saturation grading, and viral poster titles.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="file" accept="image/*" className="studio-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
          <select className="studio-input" value={editLut} onChange={e => setEditLut(e.target.value)}>
            <option value="teal_orange">Teal & Orange LUT</option>
            <option value="noir">Film Noir B&W</option>
            <option value="cyberpunk">Cyber Neon</option>
            <option value="kodak_2383">Kodak 2383</option>
            <option value="bleach_bypass">Bleach Bypass</option>
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div><label className="mono" style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>CONTRAST ({editContrast})</label><input type="range" min="0.6" max="1.8" step="0.05" value={editContrast} onChange={e => setEditContrast(parseFloat(e.target.value))} style={{ width: '100%' }} /></div>
            <div><label className="mono" style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>SATURATION ({editSat})</label><input type="range" min="0" max="2.0" step="0.05" value={editSat} onChange={e => setEditSat(parseFloat(e.target.value))} style={{ width: '100%' }} /></div>
          </div>
          <input className="studio-input" placeholder="Optional Poster Title Overlay (e.g. COMING SOON)" value={editOverlay} onChange={e => setEditOverlay(e.target.value)} />
          <button onClick={runImageEdit} disabled={loading} className="volt-btn" style={{ padding: '12px', borderRadius: '10px' }}>{loading ? 'PROCESSING...' : 'APPLY CINEMA EDIT'}</button>
        </div>
        <div style={{ background: '#050507', borderRadius: '14px', minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          {imgResult ? <><img src={imgResult} alt="Edited" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '10px' }} /><a href={imgResult} download className="volt-btn" style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.76rem' }}>Download Edited JPG</a></> : <span style={{ color: '#52525b' }}>Upload & click Apply</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'image_upscale') {
    return wrap('4K Image Upscaler', 'SUPER-RES LANCZOS', 'Upscale portraits, thumbnails, and artwork by 2x or 4x with adaptive unsharp detail recovery.', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '580px' }}>
        <input type="file" accept="image/*" className="studio-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
        <div style={{ display: 'flex', gap: '8px' }}>
          {[2, 4].map(sc => <button key={sc} onClick={() => setUpscaleFactor(sc)} className={`pill-btn ${upscaleFactor === sc ? 'active' : ''}`} style={{ flex: 1, padding: '10px', fontWeight: 700 }}>{sc}x Ultra HD</button>)}
        </div>
        <button onClick={runImageUpscale} disabled={loading} className="volt-btn" style={{ padding: '13px', borderRadius: '10px' }}>{loading ? 'UPSCALING...' : `⚡ UPSCALE IMAGE ${upscaleFactor}X`}</button>
        {imgResult && <div style={{ marginTop: '10px' }}><img src={imgResult} alt="Upscaled" style={{ maxWidth: '100%', borderRadius: '10px' }} /><a href={imgResult} download className="volt-btn" style={{ display: 'inline-block', marginTop: '8px', padding: '8px 14px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem' }}>Download Upscaled JPG</a></div>}
      </div>
    ));
  }

  if (activeTool === 'soul_character') {
    return wrap('Soul ID Character & AI Influencer Studio', 'PERSISTENT CAST', 'Design consistent AI Influencers & Characters (Hairstyle, Outfit, Ethnicity, Vibe) saved in your cast vault.', (
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input className="studio-input" value={charName} onChange={e => setCharName(e.target.value)} placeholder="Character Name" />
          <input className="studio-input" value={charHair} onChange={e => setCharHair(e.target.value)} placeholder="Hairstyle (e.g. Silver Wolf Cut)" />
          <input className="studio-input" value={charOutfit} onChange={e => setCharOutfit(e.target.value)} placeholder="Outfit (e.g. Streetwear Hoodie)" />
          <input className="studio-input" value={charEth} onChange={e => setCharEth(e.target.value)} placeholder="Ethnicity / Look" />
          <input className="studio-input" value={charVibe} onChange={e => setCharVibe(e.target.value)} placeholder="Vibe / Role" />
          <button onClick={runCreateCharacter} disabled={loading} className="volt-btn" style={{ padding: '12px', borderRadius: '10px' }}>{loading ? 'CREATING SOUL ID...' : '+ CREATE AI INFLUENCER'}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', alignContent: 'start' }}>
          {characters.map(c => (
            <div key={c.id} className="camera-card" style={{ padding: '10px' }}>
              <img src={`${API_BASE}${c.image_url}`} alt={c.name} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>{c.name}</div>
              <div style={{ fontSize: '0.72rem', color: '#D9FF00' }}>{c.hairstyle} • {c.ethnicity}</div>
              <div style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>{c.outfit}</div>
            </div>
          ))}
          {characters.length === 0 && <div style={{ color: '#71717a', fontSize: '0.84rem' }}>Create your first AI Influencer / Soul ID character on the left!</div>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'mangaka') {
    return wrap('Mangaka — Manga, Comic & Webtoon Studio', '3-PANEL STRIP', 'Turn any story idea into a vertical high-contrast comic / webtoon strip with ink borders & dialogue panels.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input className="studio-input" value={mangaTitle} onChange={e => setMangaTitle(e.target.value)} placeholder="Manga Chapter Title" />
          <input className="studio-input" value={panel1} onChange={e => setPanel1(e.target.value)} placeholder="Panel 1 scene & dialogue" />
          <input className="studio-input" value={panel2} onChange={e => setPanel2(e.target.value)} placeholder="Panel 2 scene & dialogue" />
          <input className="studio-input" value={panel3} onChange={e => setPanel3(e.target.value)} placeholder="Panel 3 climax & dialogue" />
          <button onClick={runMangaka} disabled={loading} className="volt-btn" style={{ padding: '13px', borderRadius: '10px' }}>{loading ? 'INKING MANGA STRIP...' : '⚡ GENERATE MANGA / WEBTOON'}</button>
        </div>
        <div style={{ background: '#050507', borderRadius: '14px', minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          {mangaResult ? <><img src={mangaResult} alt="Manga Strip" style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '8px' }} /><a href={mangaResult} download className="volt-btn" style={{ marginTop: '10px', padding: '7px 14px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.78rem' }}>Download Manga Strip</a></> : <span style={{ color: '#52525b' }}>3-panel Webtoon renders here</span>}
        </div>
      </div>
    ));
  }

  // --- VIDEO PRO TOOLS ---
  if (activeTool === 'video_edit') {
    return wrap('Edit Video Studio', 'TRIM • SPEED • LUT', 'Upload any existing MP4 to trim, change playback speed, apply Cinema LUTs, and burn your watermark.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="file" accept="video/*" className="studio-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div><label className="mono" style={{ fontSize: '0.68rem', color: '#a1a1aa' }}>START (s)</label><input type="number" className="studio-input" value={trimStart} onChange={e => setTrimStart(Number(e.target.value))} /></div>
            <div><label className="mono" style={{ fontSize: '0.68rem', color: '#a1a1aa' }}>DURATION (s)</label><input type="number" className="studio-input" value={trimDur} onChange={e => setTrimDur(Number(e.target.value))} /></div>
            <div><label className="mono" style={{ fontSize: '0.68rem', color: '#a1a1aa' }}>SPEED (x)</label><input type="number" step="0.1" className="studio-input" value={vidSpeed} onChange={e => setVidSpeed(Number(e.target.value))} /></div>
          </div>
          <select className="studio-input" value={editLut} onChange={e => setEditLut(e.target.value)}>
            <option value="teal_orange">Teal & Orange Cinema</option>
            <option value="noir">Film Noir B&W</option>
            <option value="cyberpunk">Cyberpunk Neon</option>
            <option value="moody_a24">Moody A24</option>
          </select>
          <button onClick={() => runVideoUploadTool('/api/tools/video/edit', { trim_start: String(trimStart), trim_duration: String(trimDur), speed: String(vidSpeed), lut: editLut, watermark: '@OmniViral' })} disabled={loading} className="volt-btn" style={{ padding: '12px', borderRadius: '10px' }}>
            {loading ? 'EXPORTING EDIT...' : '⚡ EXPORT EDITED MP4'}
          </button>
        </div>
        <div style={{ background: '#050507', borderRadius: '14px', minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          {vidResult ? <video src={vidResult} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '340px', borderRadius: '10px' }} /> : <span style={{ color: '#52525b' }}>Edited MP4 preview</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'video_upscale') {
    return wrap('4K Video Upscaler', 'CINEMA 2160P', 'Enhance and upscale any video clip to crisp 1080p or 4K with Lanczos scaling and edge sharpening.', (
      <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <input type="file" accept="video/*" className="studio-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
        <button onClick={() => runVideoUploadTool('/api/tools/video/upscale', { target: '4k' })} disabled={loading} className="volt-btn" style={{ padding: '13px', borderRadius: '10px' }}>
          {loading ? 'UPSCALING TO 4K...' : '⚡ UPSCALE VIDEO TO 4K'}
        </button>
        {vidResult && <video src={vidResult} controls style={{ width: '100%', borderRadius: '12px' }} />}
      </div>
    ));
  }

  if (activeTool === 'video_reframe') {
    return wrap('Smart Video Reframe', '9:16 • 16:9 • 1:1', 'Convert horizontal YouTube videos into vertical TikTok/Reels/Shorts with blurred cinema fill or smart center crop.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="file" accept="video/*" className="studio-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <select className="studio-input" value={reframeRatio} onChange={e => setReframeRatio(e.target.value)}>
              <option value="9:16">9:16 Vertical (Shorts/TikTok)</option>
              <option value="16:9">16:9 Landscape (YouTube)</option>
              <option value="1:1">1:1 Square (Feed)</option>
            </select>
            <select className="studio-input" value={reframeMode} onChange={e => setReframeMode(e.target.value)}>
              <option value="blur_bg">Blurred Cinema Background Fill</option>
              <option value="crop">Smart Center Crop</option>
            </select>
          </div>
          <button onClick={() => runVideoUploadTool('/api/tools/video/reframe', { aspect_ratio: reframeRatio, mode: reframeMode })} disabled={loading} className="volt-btn" style={{ padding: '13px', borderRadius: '10px' }}>
            {loading ? 'REFRAMING VIDEO...' : '⚡ REFRAME VIDEO'}
          </button>
        </div>
        <div style={{ background: '#050507', borderRadius: '14px', minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          {vidResult ? <video src={vidResult} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '340px', borderRadius: '10px' }} /> : <span style={{ color: '#52525b' }}>Reframed output</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'click_to_ad') {
    return wrap('Marketing Studio — Click to Ad', 'E-COMMERCE ADS', 'Enter your store URL and product to generate a high-converting 9:16 video ad with voiceover, captions & CTA.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input className="studio-input" value={storeUrl} onChange={e => setStoreUrl(e.target.value)} placeholder="Store URL (e.g. yourstore.com)" />
          <input className="studio-input" value={productName} onChange={e => setProductName(e.target.value)} placeholder="Product Name" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input className="studio-input" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price (e.g. $149)" />
            <input className="studio-input" value={cta} onChange={e => setCta(e.target.value)} placeholder="CTA Banner (e.g. SHOP NOW)" />
          </div>
          <button onClick={runClickToAd} disabled={loading} className="volt-btn" style={{ padding: '13px', borderRadius: '10px' }}>
            {loading ? 'BUILDING AD COMMERCIAL...' : '⚡ GENERATE PRODUCT VIDEO AD'}
          </button>
        </div>
        <div style={{ background: '#050507', borderRadius: '14px', minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          {vidResult ? <video src={vidResult} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '380px', borderRadius: '10px' }} /> : <span style={{ color: '#52525b' }}>Product ad renders here</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'genjutsu') {
    return wrap('Genjutsu & Lipsync Remake Studio', 'MOTION-PRESERVING', 'Upload a reference video to remake its look, LUT grade, and dubbed AI voice while preserving exact motion & timing.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="file" accept="video/*" className="studio-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
          <textarea className="studio-input" rows={3} value={genjScript} onChange={e => setGenjScript(e.target.value)} placeholder="New voiceover / lipsync dialogue..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <select className="studio-input" value={genjVoice} onChange={e => setGenjVoice(e.target.value)}>
              {voices.slice(0, 20).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <select className="studio-input" value={genjLut} onChange={e => setGenjLut(e.target.value)}>
              <option value="cyberpunk">Cyberpunk Neon Remake</option>
              <option value="noir">Film Noir Remake</option>
              <option value="teal_orange">Blockbuster Cinema</option>
            </select>
          </div>
          <button onClick={() => runVideoUploadTool('/api/tools/video/genjutsu-remake', { new_script: genjScript, voice_id: genjVoice, color_fx: genjLut })} disabled={loading} className="volt-btn" style={{ padding: '13px', borderRadius: '10px' }}>
            {loading ? 'APPLYING GENJUTSU REMAKE...' : '⚡ REMAKE REFERENCE VIDEO'}
          </button>
        </div>
        <div style={{ background: '#050507', borderRadius: '14px', minHeight: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          {vidResult ? <video src={vidResult} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '360px', borderRadius: '10px' }} /> : <span style={{ color: '#52525b' }}>Remade video output</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'short_drama') {
    return wrap('Short Drama Studio', 'MULTI-ACTOR SERIES', 'Produce vertical episodic Short Dramas with dual AI voice actors, Anamorphic 2.39 optics, and Moody A24 grading.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input className="studio-input" value={dramaTitle} onChange={e => setDramaTitle(e.target.value)} placeholder="Episode Title" />
          {dramaLines.map((l, idx) => (
            <div key={idx} className="camera-card" style={{ display: 'grid', gridTemplateColumns: '75px 1fr', gap: '8px', alignItems: 'center' }}>
              <select className="studio-input" value={l.speaker} onChange={e => setDramaLines(prev => prev.map((it, i) => i === idx ? { ...it, speaker: e.target.value } : it))}>
                <option value="A">Actor A</option>
                <option value="B">Actor B</option>
              </select>
              <input className="studio-input" value={l.text} onChange={e => setDramaLines(prev => prev.map((it, i) => i === idx ? { ...it, text: e.target.value } : it))} />
            </div>
          ))}
          <button onClick={runShortDrama} disabled={loading} className="volt-btn" style={{ padding: '13px', borderRadius: '10px' }}>
            {loading ? 'FILMING SHORT DRAMA EPISODE...' : '🎬 RENDER SHORT DRAMA EPISODE'}
          </button>
        </div>
        <div style={{ background: '#050507', borderRadius: '14px', minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          {vidResult ? <video src={vidResult} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '380px', borderRadius: '10px' }} /> : <span style={{ color: '#52525b' }}>Episode preview</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'content_factory') {
    return wrap('Content Factory — Batch Autopilot', '3X BATCH ENGINE', 'Generate 3 complete, publish-ready viral faceless videos across top niches in a single automated batch.', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button onClick={runContentFactory} disabled={loading} className="volt-btn" style={{ padding: '14px', borderRadius: '10px', maxWidth: '380px' }}>
          {loading ? `RENDERING BATCH (${batchResults.length}/3)...` : '🏭 LAUNCH 3-VIDEO CONTENT FACTORY'}
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {batchResults.map(v => (
            <div key={v.id} className="camera-card" style={{ padding: '12px' }}>
              <video src={`${API_BASE}${v.url}`} controls style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: '8px' }} />
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem', marginTop: '8px' }}>{v.title}</div>
            </div>
          ))}
        </div>
      </div>
    ));
  }

  // --- AUDIO SUITE ---
  if (activeTool === 'audio_tts') {
    return wrap('Text to Speech Studio', '318 NEURAL VOICES', 'Studio-grade narration across 70+ languages with pacing speed control and instant MP3 export.', (
      <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <textarea className="studio-input" rows={4} value={ttsText} onChange={e => setTtsText(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px' }}>
          <select className="studio-input" value={ttsVoice} onChange={e => setTtsVoice(e.target.value)}>
            {voices.slice(0, 60).map(v => <option key={v.id} value={v.id}>{v.name} ({v.locale})</option>)}
          </select>
          <select className="studio-input" value={ttsRate} onChange={e => setTtsRate(e.target.value)}>
            <option value="-10%">0.90x Slow</option>
            <option value="+0%">1.00x Normal</option>
            <option value="+10%">1.10x Fast</option>
            <option value="+20%">1.20x Viral</option>
          </select>
        </div>
        <button onClick={runTTS} disabled={loading} className="volt-btn" style={{ padding: '12px', borderRadius: '10px' }}>{loading ? 'SYNTHESIZING...' : '🎙 GENERATE SPEECH MP3'}</button>
        {audioResult && <audio src={audioResult} controls autoPlay style={{ width: '100%', marginTop: '8px' }} />}
      </div>
    ));
  }

  if (activeTool === 'audio_voice_change') {
    return wrap('AI Voice Changer Studio', '6 STUDIO PRESETS', 'Upload any voice recording and transform it into Deep Cinema Trailer, Studio Radio, Cyber Robot, or Vintage Lo-Fi.', (
      <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input type="file" accept="audio/*" className="studio-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[
            { id: 'deep_trailer', n: 'Deep Trailer' }, { id: 'studio_radio', n: 'Studio Radio' },
            { id: 'cyber_robot', n: 'Cyber Robot' }, { id: 'high_energetic', n: 'High Energy' },
            { id: 'vintage_phone', n: 'Vintage Phone' }, { id: 'ethereal_echo', n: 'Ethereal Echo' }
          ].map(p => (
            <button key={p.id} onClick={() => setVcPreset(p.id)} className={`pill-btn ${vcPreset === p.id ? 'active' : ''}`} style={{ padding: '10px', fontSize: '0.78rem', fontWeight: 600 }}>{p.n}</button>
          ))}
        </div>
        <button onClick={runVoiceChange} disabled={loading} className="volt-btn" style={{ padding: '12px', borderRadius: '10px' }}>{loading ? 'TRANSFORMING...' : '⚡ TRANSFORM VOICE'}</button>
        {audioResult && <audio src={audioResult} controls autoPlay style={{ width: '100%' }} />}
      </div>
    ));
  }

  if (activeTool === 'audio_translate') {
    return wrap('Global Translate & Neural Dub', '9+ LANGUAGES', 'Translate any English script and instantly synthesize a native-accent neural voice dub.', (
      <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <textarea className="studio-input" rows={3} value={ttsText} onChange={e => setTtsText(e.target.value)} />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['it', 'Italian'], ['hi', 'Hindi'], ['ar', 'Arabic'], ['ja', 'Japanese'], ['ko', 'Korean'], ['pt', 'Portuguese']].map(([code, name]) => (
            <button key={code} onClick={() => setDubLang(code)} className={`pill-btn ${dubLang === code ? 'active' : ''}`} style={{ padding: '7px 12px', fontSize: '0.76rem', fontWeight: 600 }}>{name}</button>
          ))}
        </div>
        <button onClick={runTranslateDub} disabled={loading} className="volt-btn" style={{ padding: '12px', borderRadius: '10px' }}>{loading ? 'TRANSLATING & DUBBING...' : '🌐 TRANSLATE & DUB AUDIO'}</button>
        {dubTranslated && <div className="camera-card" style={{ color: '#D9FF00', fontSize: '0.88rem' }}>{dubTranslated}</div>}
        {audioResult && <audio src={audioResult} controls autoPlay style={{ width: '100%' }} />}
      </div>
    ));
  }

  // --- STUDIOS HUB (Screenshot 5) ---
  if (activeTool === 'studios_hub') {
    const studios = [
      { id: 'cinema_studio', cat: 'Film', title: 'Cinema Studio', desc: 'Deterministic camera rigs, ARRI/35mm optics, LUTs & Hero Frame filmstrip.', tag: 'FLAGSHIP' },
      { id: 'click_to_ad', cat: 'E-commerce', title: 'Marketing Studio', desc: 'Turn yourstore.com URL & product price into ready-to-run vertical video ads.', tag: 'E-COM' },
      { id: 'cinema_studio', cat: 'Social', title: 'Shorts Studio', desc: 'High-retention 9:16 TikTok, Reels & Shorts with giant 122px pop captions.', tag: 'NEW' },
      { id: 'autopilot', cat: 'Social', title: 'Faceless Studio', desc: 'AITuber-style automated channels + 6-platform publishing queue.', tag: 'AUTOPILOT' },
      { id: 'short_drama', cat: 'Film', title: 'Short Drama', desc: 'Multi-character episodic vertical drama with dual AI voice actors.', tag: 'NEW' },
      { id: 'content_factory', cat: 'Marketing', title: 'Content Factory', desc: 'Batch-produce multiple publish-ready videos across niches in one click.', tag: 'SCALE' }
    ];
    const shown = studioFilter === 'All' ? studios : studios.filter(s => s.cat === studioFilter);
    return wrap('OmniViral Studios Hub', '6 SPECIALIZED STUDIOS', 'Built for solo creators, agencies, and production teams.', (
      <div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          {['All', 'E-commerce', 'Marketing', 'Social', 'Film'].map(cat => (
            <button key={cat} onClick={() => setStudioFilter(cat)} className={`pill-btn ${studioFilter === cat ? 'active' : ''}`} style={{ padding: '7px 14px', fontSize: '0.8rem', fontWeight: 600 }}>{cat}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {shown.map((st, idx) => (
            <div key={idx} onClick={() => setActiveTool(st.id as ActiveTool)} className="camera-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong className="heading-font" style={{ fontSize: '1.05rem', color: '#fff' }}>{st.title}</strong>
                <span className="mono" style={{ fontSize: '0.62rem', color: '#050507', background: '#D9FF00', padding: '2px 7px', borderRadius: '4px', fontWeight: 800 }}>{st.tag}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#a1a1aa', lineHeight: 1.4 }}>{st.desc}</p>
              <div className="mono" style={{ fontSize: '0.72rem', color: '#D9FF00', marginTop: '6px' }}>Launch Studio →</div>
            </div>
          ))}
        </div>
      </div>
    ));
  }

  // --- MCP, CLI & PLUGINS HUB (Screenshots 4 & 6) ---
  if (activeTool === 'mcp_hub') {
    const snippets: Record<string, string> = {
      claude: `// Add to claude_desktop_config.json\n{\n  "mcpServers": {\n    "omniviral-studio": {\n      "command": "C:\\\\Users\\\\Mr.N0Buddy\\\\OneDrive\\\\Desktop\\\\ai_video_platform\\\\backend\\\\venv\\\\Scripts\\\\python.exe",\n      "args": ["C:\\\\Users\\\\Mr.N0Buddy\\\\OneDrive\\\\Desktop\\\\ai_video_platform\\\\backend\\\\mcp_server.py"]\n    }\n  }\n}`,
      claude_code: `# Register OmniViral MCP Server in Claude Code CLI\nclaude mcp add omniviral-studio -- C:\\Users\\Mr.N0Buddy\\OneDrive\\Desktop\\ai_video_platform\\backend\\venv\\Scripts\\python.exe C:\\Users\\Mr.N0Buddy\\OneDrive\\Desktop\\ai_video_platform\\backend\\mcp_server.py`,
      chatgpt: `# OpenAPI Action Schema URL for Custom GPTs / ChatGPT:\nhttp://127.0.0.1:8000/openapi.json\n\n# Endpoints:\nPOST /api/videos/generate\nPOST /api/tools/video/click-to-ad\nPOST /api/tools/image/mangaka`,
      telegram: `# Trigger via Telegram Bot Webhook -> OmniViral REST API:\ncurl -X POST http://127.0.0.1:8000/api/videos/generate \\\n  -H "Content-Type: application/json" \\\n  -d '{"niche":"true_crime","camera_move":"crash_zoom","color_fx":"noir"}'`,
      cli: `# Built-in OmniViral CLI (backend/omniviral_cli.py):\npython omniviral_cli.py video --niche true_crime --move crash_zoom --lut noir\npython omniviral_cli.py ad --store mystore.com --product "Smart Ring" --price "$149"\npython omniviral_cli.py image --prompt "cyberpunk samurai in rain"`
    };
    return wrap('Generate with OmniViral MCP & Plugins', 'JSON-RPC 2.0 LIVE', 'Connect Claude, Claude Code, ChatGPT, Telegram, CLI, and creative plugins directly to your zero-cost video engine.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {[['claude', 'Claude'], ['claude_code', 'Claude Code'], ['chatgpt', 'ChatGPT'], ['telegram', 'Telegram'], ['cli', 'CLI']].map(([id, label]) => (
              <button key={id} onClick={() => setMcpClient(id as any)} className={`pill-btn ${mcpClient === id ? 'active' : ''}`} style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700 }}>{label}</button>
            ))}
          </div>
          <pre className="mono" style={{ background: '#050507', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', fontSize: '0.74rem', color: '#D9FF00', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {snippets[mcpClient]}
          </pre>
          <button
            onClick={() => { navigator.clipboard.writeText(snippets[mcpClient]); setCopiedMcp(true); setTimeout(() => setCopiedMcp(false), 2000); }}
            className="volt-btn"
            style={{ padding: '9px 16px', borderRadius: '9px', fontSize: '0.78rem', marginTop: '8px' }}
          >
            {copiedMcp ? '✓ Copied Config' : 'Copy Integration Config'}
          </button>
        </div>

        <div className="camera-card" style={{ padding: '16px' }}>
          <div className="mono" style={{ fontSize: '0.7rem', color: '#D9FF00', marginBottom: '10px' }}>CREATIVE PLUGIN BRIDGES</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem', color: '#e4e4e7' }}>
            {['Adobe Photoshop', 'Adobe After Effects', 'Adobe Premiere Pro', 'DaVinci Resolve', 'Figma', 'Blender'].map(pl => (
              <div key={pl} style={{ padding: '9px', background: '#050507', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
                {pl}
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.74rem', color: '#71717a', marginTop: '12px', lineHeight: 1.4 }}>
            All rendered MP4, JPG, and MP3 outputs are saved locally in <code style={{ color: '#D9FF00' }}>backend/output/</code> for instant drag-and-drop into Premiere Pro, After Effects, DaVinci Resolve, Photoshop, Figma, or Blender.
          </p>
        </div>
      </div>
    ));
  }

  return null;
}
