import React, { useState, useEffect } from 'react';
import {
  Zap, Download, Sparkles, Clapperboard, Factory, Mic, AudioWaveform,
  Languages, Copy, Check, ArrowRight, Scissors, Maximize2, Crop, ShoppingBag,
  BookOpen, UserCheck, Image as ImageIcon, Terminal
} from 'lucide-react';
import { DotGridLoader } from './ui/StudioPrimitives';

const API_BASE = 'http://127.0.0.1:8000';

export type ActiveTool =
  | 'explore'
  | 'all_generators'
  | 'hyperframes_studio'
  | 'script_to_video'
  | 'lyric_video'
  | 'clipping_agent' | 'video_agent' | 'photo_avatar' | 'video_podcast' | 'ppt_to_video' | 'video_translate'
  | 'meme_maker' | 'logo_generator' | 'remove_bg' | 'convert_compress'
  | 'blender_3d' | 'web_3d_builder' | 'envato_templates' | 'envato_sfx' | 'envato_stock' | 'envato_graphics'
  | 'cinema_studio'
  | 'image_create' | 'image_edit' | 'image_upscale' | 'soul_character' | 'mangaka'
  | 'video_edit' | 'video_upscale' | 'video_reframe' | 'click_to_ad' | 'genjutsu' | 'short_drama' | 'content_factory'
  | 'audio_tts' | 'audio_voice_change' | 'audio_translate' | 'audio_visualizer'
  | 'studios_hub' | 'mcp_hub' | 'autopilot' | 'ideas' | 'settings';

interface ToolSuitesProps {
  activeTool: ActiveTool;
  setActiveTool: (t: ActiveTool) => void;
  onVideoCreated: (v: any) => void;
  onNotify: (type: 'success' | 'error', msg: string) => void;
  voices: any[];
}

export default function ToolSuites({ activeTool, setActiveTool, onVideoCreated, onNotify, voices }: ToolSuitesProps) {
  const [imgPrompt, setImgPrompt] = useState('cyberpunk samurai standing under neon rain dramatic 8k');
  const [imgStyle, setImgStyle] = useState('teal_orange');
  const [imgRatio, setImgRatio] = useState('9:16');
  const [imgModel, setImgModel] = useState('Soul 2.0');
  const [imgResult, setImgResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [editLut, setEditLut] = useState('teal_orange');
  const [editContrast, setEditContrast] = useState(1.15);
  const [editSat, setEditSat] = useState(1.2);
  const [editOverlay, setEditOverlay] = useState('');
  const [upscaleFactor, setUpscaleFactor] = useState(2);

  const [characters, setCharacters] = useState<any[]>([]);
  const [charName, setCharName] = useState('Nova Lin');
  const [charHair, setCharHair] = useState('Platinum Bob Cut');
  const [charOutfit, setCharOutfit] = useState('Black Minimalist Leather Jacket');
  const [charEth, setCharEth] = useState('East Asian');
  const [charVibe, setCharVibe] = useState('High Fashion AI Influencer');

  const [mangaTitle, setMangaTitle] = useState('CHRONICLES OF THE VOID');
  const [panel1, setPanel1] = useState('A lone warrior enters a rain soaked neon alley');
  const [panel2, setPanel2] = useState('Glowing crimson eyes appear from the shadows');
  const [panel3, setPanel3] = useState('A blinding blade flash shatters the midnight sky');
  const [mangaResult, setMangaResult] = useState<string | null>(null);

  const [vidResult, setVidResult] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimDur, setTrimDur] = useState(12);
  const [vidSpeed, setVidSpeed] = useState(1.0);
  const [reframeMode, setReframeMode] = useState('blur_bg');
  const [reframeRatio, setReframeRatio] = useState('9:16');

  const [storeUrl, setStoreUrl] = useState('auratech.store');
  const [productName, setProductName] = useState('Aura Pro Smart Ring');
  const [price, setPrice] = useState('$149');
  const [cta, setCta] = useState('SHOP NOW 40% OFF');

  const [genjScript, setGenjScript] = useState('Watch how this scene transforms completely while keeping the exact motion and timing.');
  const [genjVoice, setGenjVoice] = useState('en-US-ChristopherNeural');
  const [genjLut, setGenjLut] = useState('cyberpunk');

  const [dramaTitle, setDramaTitle] = useState('Midnight Betrayal');
  const [dramaLines, setDramaLines] = useState([
    { speaker: 'A', text: 'You told me nobody else knew about the vault.', query: 'dark luxury office night shadow man' },
    { speaker: 'B', text: 'I never lied. I just never told you who opened it.', query: 'mysterious woman silhouette neon window' },
    { speaker: 'A', text: 'Then explain why your keycard is on the log.', query: 'security monitor red warning dark room' }
  ]);

  const [ttsText, setTtsText] = useState('In a world run by algorithms, those who master storytelling hold the ultimate leverage.');
  const [ttsVoice, setTtsVoice] = useState('en-US-ChristopherNeural');
  const [ttsRate, setTtsRate] = useState('+5%');
  const [audioResult, setAudioResult] = useState<string | null>(null);
  const [vcPreset, setVcPreset] = useState('deep_trailer');
  const [dubLang, setDubLang] = useState('es');
  const [dubTranslated, setDubTranslated] = useState('');

  const [studioFilter, setStudioFilter] = useState('All');
  const [mcpClient, setMcpClient] = useState<'claude' | 'claude_code' | 'chatgpt' | 'telegram' | 'cli'>('claude');
  const [copiedMcp, setCopiedMcp] = useState(false);
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
      onNotify('success', 'High resolution image generated');
    } catch { onNotify('error', 'Image generation failed'); }
    finally { setLoading(false); }
  };

  const runImageEdit = async () => {
    if (!uploadFile) return onNotify('error', 'Select an image file first');
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
      onNotify('success', 'Cinema grade edit applied');
    } catch { onNotify('error', 'Image edit failed'); }
    finally { setLoading(false); }
  };

  const runImageUpscale = async () => {
    if (!uploadFile) return onNotify('error', 'Select an image file first');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('scale', String(upscaleFactor));
      const r = await fetch(`${API_BASE}/api/tools/image/upscale`, { method: 'POST', body: fd });
      const d = await r.json();
      setImgResult(`${API_BASE}${d.url}`);
      onNotify('success', `Image upscaled ${upscaleFactor}x`);
    } catch { onNotify('error', 'Upscale failed'); }
    finally { setLoading(false); }
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
      onNotify('success', `Soul ID character "${charName}" saved to vault`);
    } catch { onNotify('error', 'Failed to create character'); }
    finally { setLoading(false); }
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
      onNotify('success', '3 panel vertical Manga strip rendered');
    } catch { onNotify('error', 'Manga render failed'); }
    finally { setLoading(false); }
  };

  const runVideoUploadTool = async (endpoint: string, extra: Record<string, string>, label: string) => {
    if (!uploadFile) return onNotify('error', 'Upload an MP4 video file first');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
      const r = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: fd });
      const d = await r.json();
      setVidResult(`${API_BASE}${d.url}`);
      onNotify('success', `${label} completed`);
    } catch { onNotify('error', `${label} failed`); }
    finally { setLoading(false); }
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
      onNotify('success', 'Product video ad rendered');
    } catch { onNotify('error', 'Ad render failed'); }
    finally { setLoading(false); }
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
      onNotify('success', 'Short Drama episode mastered');
    } catch { onNotify('error', 'Drama render failed'); }
    finally { setLoading(false); }
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
      onNotify('success', 'Content Factory rendered 3 complete videos');
    } catch { onNotify('error', 'Batch interrupted'); }
    finally { setLoading(false); }
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
      onNotify('success', 'Neural speech synthesized');
    } catch { onNotify('error', 'TTS synthesis failed'); }
    finally { setLoading(false); }
  };

  const runVoiceChange = async () => {
    if (!uploadFile) return onNotify('error', 'Upload an MP3 or WAV audio file first');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('preset', vcPreset);
      const r = await fetch(`${API_BASE}/api/tools/audio/voice-change`, { method: 'POST', body: fd });
      const d = await r.json();
      setAudioResult(`${API_BASE}${d.url}`);
      onNotify('success', 'Voice transformation complete');
    } catch { onNotify('error', 'Voice change failed'); }
    finally { setLoading(false); }
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
      onNotify('success', `Translated and dubbed in ${d.language}`);
    } catch { onNotify('error', 'Translation dub failed'); }
    finally { setLoading(false); }
  };

  const wrap = (title: string, badge: string, desc: string, children: React.ReactNode) => (
    <div style={{ maxWidth: '1240px', width: '100%', margin: '24px auto', padding: '0 24px' }}>
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <h2 className="heading-5" style={{ color: 'var(--text)' }}>{title}</h2>
          <span className="mono caption-3" style={{ color: 'var(--on-accent)', background: 'var(--accent)', padding: '3px 10px', borderRadius: '6px' }}>{badge}</span>
        </div>
        <p className="body-5" style={{ margin: '0 0 24px' }}>{desc}</p>
        {children}
      </div>
    </div>
  );

  if (activeTool === 'image_create') {
    return wrap('Create Image Studio', 'SOUL 2.0 • 8K PIPELINE', 'Generate styled cinema photography and concept art across multiple aesthetic presets.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div className="mono caption-3" style={{ color: 'var(--accent)', marginBottom: '8px' }}>MODEL PRESET</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['Soul 2.0', 'Nano Banana 2.1', 'Sunburst 2.6', 'Seedream 5.5', 'Kling Image 4.0'].map(m => (
                <button key={m} type="button" onClick={() => setImgModel(m)} className={`pill-btn ${imgModel === m ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '13px' }}>{m}</button>
              ))}
            </div>
          </div>
          <textarea className="studio-input" rows={3} value={imgPrompt} onChange={e => setImgPrompt(e.target.value)} placeholder="Describe lighting, lens, subject, and environment..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
          <button type="button" onClick={runImageCreate} disabled={loading} className="volt-btn">
            <ImageIcon size={16} /> {loading ? 'Generating Image...' : 'Generate Image'}
          </button>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: '14px', border: '1px solid var(--border)', minHeight: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          {loading ? <DotGridLoader label="SYNTHESIZING FRAME" /> : imgResult ? (
            <>
              <img src={imgResult} alt="Generated visual" style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '10px' }} />
              <a href={imgResult} download className="volt-btn" style={{ marginTop: '12px' }}><Download size={15} /> Download JPG</a>
            </>
          ) : <span className="body-5">Generated artwork appears here</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'image_edit') {
    return wrap('Edit Image & Cinema Color Studio', 'LIVE LUT ENGINE', 'Upload any photo to apply cinema LUTs, contrast grading, and bold poster titles.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="file" accept="image/*" className="studio-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
          <select className="studio-input" value={editLut} onChange={e => setEditLut(e.target.value)}>
            <option value="teal_orange">Teal & Orange LUT</option>
            <option value="noir">Film Noir B&W</option>
            <option value="cyberpunk">Cyber Neon</option>
            <option value="kodak_2383">Kodak 2383</option>
            <option value="bleach_bypass">Bleach Bypass</option>
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label className="mono caption-4">CONTRAST ({editContrast})</label><input type="range" min="0.6" max="1.8" step="0.05" value={editContrast} onChange={e => setEditContrast(parseFloat(e.target.value))} style={{ width: '100%' }} /></div>
            <div><label className="mono caption-4">SATURATION ({editSat})</label><input type="range" min="0" max="2.0" step="0.05" value={editSat} onChange={e => setEditSat(parseFloat(e.target.value))} style={{ width: '100%' }} /></div>
          </div>
          <input className="studio-input" placeholder="Optional Poster Title Overlay" value={editOverlay} onChange={e => setEditOverlay(e.target.value)} />
          <button type="button" onClick={runImageEdit} disabled={loading} className="volt-btn"><Sparkles size={16} /> {loading ? 'Processing...' : 'Apply Cinema Edit'}</button>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: '14px', border: '1px solid var(--border)', minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          {loading ? <DotGridLoader label="GRADING" /> : imgResult ? <><img src={imgResult} alt="Edited photo" style={{ maxWidth: '100%', maxHeight: '290px', borderRadius: '10px' }} /><a href={imgResult} download className="volt-btn" style={{ marginTop: '12px' }}><Download size={15} /> Download JPG</a></> : <span className="body-5">Upload an image to edit</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'image_upscale') {
    return wrap('4K Image Upscaler', 'SUPER RESOLUTION', 'Upscale portraits, thumbnails, and artwork by 2x or 4x with adaptive Lanczos detail recovery.', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '580px' }}>
        <input type="file" accept="image/*" className="studio-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
        <div style={{ display: 'flex', gap: '12px' }}>
          {[2, 4].map(sc => <button key={sc} type="button" onClick={() => setUpscaleFactor(sc)} className={`pill-btn ${upscaleFactor === sc ? 'active' : ''}`} style={{ flex: 1, minHeight: '42px' }}>{sc}x Ultra HD</button>)}
        </div>
        <button type="button" onClick={runImageUpscale} disabled={loading} className="volt-btn"><Maximize2 size={16} /> {loading ? 'Upscaling...' : `Upscale Image ${upscaleFactor}x`}</button>
        {loading && <DotGridLoader label="UPSCALING" />}
        {imgResult && !loading && <div><img src={imgResult} alt="Upscaled image" style={{ maxWidth: '100%', borderRadius: '10px' }} /><a href={imgResult} download className="volt-btn" style={{ marginTop: '12px' }}><Download size={15} /> Download Upscaled JPG</a></div>}
      </div>
    ));
  }

  if (activeTool === 'soul_character') {
    return wrap('Soul ID Character & AI Influencer Vault', 'PERSISTENT CAST', 'Design consistent AI influencers and recurring actors stored persistently in your SQLite cast library.', (
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input className="studio-input" value={charName} onChange={e => setCharName(e.target.value)} placeholder="Character Name" />
          <input className="studio-input" value={charHair} onChange={e => setCharHair(e.target.value)} placeholder="Hairstyle" />
          <input className="studio-input" value={charOutfit} onChange={e => setCharOutfit(e.target.value)} placeholder="Outfit" />
          <input className="studio-input" value={charEth} onChange={e => setCharEth(e.target.value)} placeholder="Ethnicity / Look" />
          <input className="studio-input" value={charVibe} onChange={e => setCharVibe(e.target.value)} placeholder="Vibe / Persona" />
          <button type="button" onClick={runCreateCharacter} disabled={loading} className="volt-btn"><UserCheck size={16} /> {loading ? 'Creating Soul ID...' : 'Create AI Influencer'}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', alignContent: 'start' }}>
          {characters.map(c => (
            <div key={c.id} className="camera-card" style={{ padding: '12px' }}>
              <img src={`${API_BASE}${c.image_url}`} alt={c.name} style={{ width: '100%', height: '164px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />
              <div className="title-4" style={{ color: 'var(--text)' }}>{c.name}</div>
              <div className="caption-3" style={{ color: 'var(--accent)', marginTop: '2px' }}>{c.hairstyle} • {c.ethnicity}</div>
              <div className="caption-4" style={{ marginTop: '2px' }}>{c.outfit}</div>
            </div>
          ))}
          {characters.length === 0 && <div className="body-5">Create your first Soul ID character on the left.</div>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'mangaka') {
    return wrap('Mangaka Studio — Comic & Webtoon Builder', '3 PANEL STRIP', 'Turn story beats into a vertical high contrast manga and webtoon strip with ink borders and dialogue captions.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input className="studio-input" value={mangaTitle} onChange={e => setMangaTitle(e.target.value)} placeholder="Chapter Title" />
          <input className="studio-input" value={panel1} onChange={e => setPanel1(e.target.value)} placeholder="Panel 1 scene" />
          <input className="studio-input" value={panel2} onChange={e => setPanel2(e.target.value)} placeholder="Panel 2 scene" />
          <input className="studio-input" value={panel3} onChange={e => setPanel3(e.target.value)} placeholder="Panel 3 climax" />
          <button type="button" onClick={runMangaka} disabled={loading} className="volt-btn"><BookOpen size={16} /> {loading ? 'Inking Panels...' : 'Generate Manga Strip'}</button>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: '14px', border: '1px solid var(--border)', minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          {loading ? <DotGridLoader label="INKING PANELS" /> : mangaResult ? <><img src={mangaResult} alt="Manga strip" style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '8px' }} /><a href={mangaResult} download className="volt-btn" style={{ marginTop: '12px' }}><Download size={15} /> Download Strip</a></> : <span className="body-5">3 panel strip renders here</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'video_edit') {
    return wrap('Edit Video Studio', 'TRIM • SPEED • LUT', 'Upload an MP4 clip to trim, control playback speed, apply cinema LUTs, and burn your watermark.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="file" accept="video/*" className="studio-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div><label className="mono caption-4">START (s)</label><input type="number" className="studio-input" value={trimStart} onChange={e => setTrimStart(Number(e.target.value))} /></div>
            <div><label className="mono caption-4">DURATION (s)</label><input type="number" className="studio-input" value={trimDur} onChange={e => setTrimDur(Number(e.target.value))} /></div>
            <div><label className="mono caption-4">SPEED (x)</label><input type="number" step="0.1" className="studio-input" value={vidSpeed} onChange={e => setVidSpeed(Number(e.target.value))} /></div>
          </div>
          <select className="studio-input" value={editLut} onChange={e => setEditLut(e.target.value)}>
            <option value="teal_orange">Teal & Orange Cinema</option>
            <option value="noir">Film Noir B&W</option>
            <option value="cyberpunk">Cyberpunk Neon</option>
            <option value="moody_a24">Moody A24</option>
          </select>
          <button type="button" onClick={() => runVideoUploadTool('/api/tools/video/edit', { trim_start: String(trimStart), trim_duration: String(trimDur), speed: String(vidSpeed), lut: editLut, watermark: '@OmniViral' }, 'Video Edit')} disabled={loading} className="volt-btn">
            <Scissors size={16} /> {loading ? 'Exporting MP4...' : 'Export Edited MP4'}
          </button>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: '14px', border: '1px solid var(--border)', minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          {loading ? <DotGridLoader label="EXPORTING MP4" /> : vidResult ? <video src={vidResult} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '340px', borderRadius: '10px' }} /> : <span className="body-5">Edited output preview</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'video_upscale') {
    return wrap('4K Video Upscaler', '2160P CINEMA', 'Enhance and upscale video clips to crisp 4K with Lanczos scaling and edge sharpening.', (
      <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input type="file" accept="video/*" className="studio-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
        <button type="button" onClick={() => runVideoUploadTool('/api/tools/video/upscale', { target: '4k' }, '4K Video Upscale')} disabled={loading} className="volt-btn">
          <Maximize2 size={16} /> {loading ? 'Upscaling to 4K...' : 'Upscale Video to 4K'}
        </button>
        {loading && <DotGridLoader label="UPSCALING TO 2160P" />}
        {vidResult && !loading && <video src={vidResult} controls style={{ width: '100%', borderRadius: '12px' }} />}
      </div>
    ));
  }

  if (activeTool === 'video_reframe') {
    return wrap('Smart Video Reframe', '9:16 • 16:9 • 1:1', 'Convert landscape clips into vertical Shorts and Reels with blurred cinema fill or smart center crop.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="file" accept="video/*" className="studio-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <select className="studio-input" value={reframeRatio} onChange={e => setReframeRatio(e.target.value)}>
              <option value="9:16">9:16 Vertical (Shorts / Reels)</option>
              <option value="16:9">16:9 Landscape (YouTube)</option>
              <option value="1:1">1:1 Square Feed</option>
            </select>
            <select className="studio-input" value={reframeMode} onChange={e => setReframeMode(e.target.value)}>
              <option value="blur_bg">Blurred Cinema Background</option>
              <option value="crop">Smart Center Crop</option>
            </select>
          </div>
          <button type="button" onClick={() => runVideoUploadTool('/api/tools/video/reframe', { aspect_ratio: reframeRatio, mode: reframeMode }, 'Smart Reframe')} disabled={loading} className="volt-btn">
            <Crop size={16} /> {loading ? 'Reframing...' : 'Reframe Video'}
          </button>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: '14px', border: '1px solid var(--border)', minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          {loading ? <DotGridLoader label="REFRAMING" /> : vidResult ? <video src={vidResult} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '340px', borderRadius: '10px' }} /> : <span className="body-5">Reframed output</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'click_to_ad') {
    return wrap('Marketing Studio — Click to Ad', 'E-COMMERCE ADS', 'Enter any store URL and product details to produce a high converting vertical ad with voiceover, captions, and CTA.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input className="studio-input" value={storeUrl} onChange={e => setStoreUrl(e.target.value)} placeholder="Store URL (e.g. yourstore.com)" />
          <input className="studio-input" value={productName} onChange={e => setProductName(e.target.value)} placeholder="Product Name" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input className="studio-input" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price" />
            <input className="studio-input" value={cta} onChange={e => setCta(e.target.value)} placeholder="CTA Banner" />
          </div>
          <button type="button" onClick={runClickToAd} disabled={loading} className="volt-btn">
            <ShoppingBag size={16} /> {loading ? 'Rendering Product Ad...' : 'Generate Product Video Ad'}
          </button>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: '14px', border: '1px solid var(--border)', minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          {loading ? <DotGridLoader label="MASTERING COMMERCIAL" /> : vidResult ? <video src={vidResult} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '380px', borderRadius: '10px' }} /> : <span className="body-5">Product commercial preview</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'genjutsu') {
    return wrap('Genjutsu & Lipsync Remake Studio', 'MOTION PRESERVING', 'Upload a reference video to remake its color grade, neural voiceover, and captions while keeping original pacing.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="file" accept="video/*" className="studio-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
          <textarea className="studio-input" rows={3} value={genjScript} onChange={e => setGenjScript(e.target.value)} placeholder="New narration script..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <select className="studio-input" value={genjVoice} onChange={e => setGenjVoice(e.target.value)}>
              {voices.slice(0, 20).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <select className="studio-input" value={genjLut} onChange={e => setGenjLut(e.target.value)}>
              <option value="cyberpunk">Cyberpunk Neon Remake</option>
              <option value="noir">Film Noir Remake</option>
              <option value="teal_orange">Blockbuster Cinema</option>
            </select>
          </div>
          <button type="button" onClick={() => runVideoUploadTool('/api/tools/video/genjutsu-remake', { new_script: genjScript, voice_id: genjVoice, color_fx: genjLut }, 'Genjutsu Remake')} disabled={loading} className="volt-btn">
            <Sparkles size={16} /> {loading ? 'Remaking Video...' : 'Remake Reference Video'}
          </button>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: '14px', border: '1px solid var(--border)', minHeight: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          {loading ? <DotGridLoader label="REMAKING SCENE" /> : vidResult ? <video src={vidResult} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '360px', borderRadius: '10px' }} /> : <span className="body-5">Remade output preview</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'short_drama') {
    return wrap('Short Drama Studio', 'DUAL ACTOR SERIES', 'Produce vertical episodic dramas with dual AI voice actors, Anamorphic 2.39 optics, and Moody A24 color grading.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input className="studio-input" value={dramaTitle} onChange={e => setDramaTitle(e.target.value)} placeholder="Episode Title" />
          {dramaLines.map((l, idx) => (
            <div key={idx} className="camera-card" style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: '10px', alignItems: 'center' }}>
              <select className="studio-input" value={l.speaker} onChange={e => setDramaLines(prev => prev.map((it, i) => i === idx ? { ...it, speaker: e.target.value } : it))}>
                <option value="A">Actor A</option>
                <option value="B">Actor B</option>
              </select>
              <input className="studio-input" value={l.text} onChange={e => setDramaLines(prev => prev.map((it, i) => i === idx ? { ...it, text: e.target.value } : it))} />
            </div>
          ))}
          <button type="button" onClick={runShortDrama} disabled={loading} className="volt-btn">
            <Clapperboard size={16} /> {loading ? 'Filming Episode...' : 'Render Short Drama Episode'}
          </button>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: '14px', border: '1px solid var(--border)', minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          {loading ? <DotGridLoader label="FILMING EPISODE" /> : vidResult ? <video src={vidResult} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '380px', borderRadius: '10px' }} /> : <span className="body-5">Drama episode preview</span>}
        </div>
      </div>
    ));
  }

  if (activeTool === 'content_factory') {
    return wrap('Content Factory — Batch Autopilot', '3X BATCH ENGINE', 'Generate 3 complete, publish ready viral faceless videos across top niches in a single automated batch.', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <button type="button" onClick={runContentFactory} disabled={loading} className="volt-btn" style={{ maxWidth: '340px' }}>
          <Factory size={16} /> {loading ? `Rendering Batch (${batchResults.length}/3)...` : 'Launch 3 Video Content Factory'}
        </button>
        {loading && <DotGridLoader label={`RENDERING VIDEO ${batchResults.length + 1} OF 3`} />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {batchResults.map(v => (
            <div key={v.id} className="camera-card" style={{ padding: '12px' }}>
              <video src={`${API_BASE}${v.url}`} controls style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: '8px' }} />
              <div className="title-4" style={{ color: 'var(--text)', marginTop: '10px' }}>{v.title}</div>
            </div>
          ))}
        </div>
      </div>
    ));
  }

  if (activeTool === 'audio_tts') {
    return wrap('Text to Speech Studio', '318 NEURAL VOICES', 'Studio narration across 70+ languages with pacing speed control and instant MP3 download.', (
      <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <textarea className="studio-input" rows={4} value={ttsText} onChange={e => setTtsText(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '12px' }}>
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
        <button type="button" onClick={runTTS} disabled={loading} className="volt-btn"><Mic size={16} /> {loading ? 'Synthesizing...' : 'Generate Speech MP3'}</button>
        {audioResult && <audio src={audioResult} controls autoPlay style={{ width: '100%', marginTop: '8px' }} />}
      </div>
    ));
  }

  if (activeTool === 'audio_voice_change') {
    return wrap('AI Voice Changer Studio', '6 DSP PRESETS', 'Upload any voice recording and transform it into Deep Cinema Trailer, Studio Radio, Cyber Robot, or Vintage LoFi.', (
      <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <input type="file" accept="audio/*" className="studio-input" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[
            { id: 'deep_trailer', n: 'Deep Trailer' }, { id: 'studio_radio', n: 'Studio Radio' },
            { id: 'cyber_robot', n: 'Cyber Robot' }, { id: 'high_energetic', n: 'High Energy' },
            { id: 'vintage_phone', n: 'Vintage Phone' }, { id: 'ethereal_echo', n: 'Ethereal Echo' }
          ].map(p => (
            <button key={p.id} type="button" onClick={() => setVcPreset(p.id)} className={`pill-btn ${vcPreset === p.id ? 'active' : ''}`} style={{ padding: '10px', fontSize: '13px' }}>{p.n}</button>
          ))}
        </div>
        <button type="button" onClick={runVoiceChange} disabled={loading} className="volt-btn"><AudioWaveform size={16} /> {loading ? 'Transforming...' : 'Transform Voice'}</button>
        {audioResult && <audio src={audioResult} controls autoPlay style={{ width: '100%' }} />}
      </div>
    ));
  }

  if (activeTool === 'audio_translate') {
    return wrap('Global Translate & Neural Dub', '9+ LANGUAGES', 'Translate scripts and synthesize native neural voice dubs ready for international channels.', (
      <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <textarea className="studio-input" rows={3} value={ttsText} onChange={e => setTtsText(e.target.value)} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['it', 'Italian'], ['hi', 'Hindi'], ['ar', 'Arabic'], ['ja', 'Japanese'], ['ko', 'Korean'], ['pt', 'Portuguese']].map(([code, name]) => (
            <button key={code} type="button" onClick={() => setDubLang(code)} className={`pill-btn ${dubLang === code ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '13px' }}>{name}</button>
          ))}
        </div>
        <button type="button" onClick={runTranslateDub} disabled={loading} className="volt-btn"><Languages size={16} /> {loading ? 'Translating & Dubbing...' : 'Translate & Dub Audio'}</button>
        {dubTranslated && <div className="camera-card title-4" style={{ color: 'var(--accent)' }}>{dubTranslated}</div>}
        {audioResult && <audio src={audioResult} controls autoPlay style={{ width: '100%' }} />}
      </div>
    ));
  }

  if (activeTool === 'studios_hub') {
    const studios = [
      { id: 'cinema_studio', cat: 'Film', title: 'Cinema Studio', desc: 'Deterministic camera rigs, ARRI & 35mm optics, LUTs, and Hero Frame filmstrip.', tag: 'FLAGSHIP' },
      { id: 'click_to_ad', cat: 'E-commerce', title: 'Marketing Studio', desc: 'Turn store URL and product price into ready to run vertical video commercials.', tag: 'E-COM' },
      { id: 'cinema_studio', cat: 'Social', title: 'Shorts Studio', desc: 'High retention 9:16 TikTok, Reels & Shorts with giant 122px pop captions.', tag: 'SOCIAL' },
      { id: 'autopilot', cat: 'Social', title: 'Faceless Studio', desc: 'Automated faceless channels with 6 platform publishing queue.', tag: 'AUTOPILOT' },
      { id: 'short_drama', cat: 'Film', title: 'Short Drama', desc: 'Multi character episodic vertical drama with dual AI voice actors.', tag: 'NEW' },
      { id: 'content_factory', cat: 'Marketing', title: 'Content Factory', desc: 'Batch produce multiple publish ready videos across niches in one click.', tag: 'SCALE' }
    ];
    const shown = studioFilter === 'All' ? studios : studios.filter(s => s.cat === studioFilter);
    return wrap('OmniViral Studios Hub', '6 SPECIALIZED STUDIOS', 'Purpose built production workspaces for creators, agencies, and growth teams.', (
      <div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {['All', 'E-commerce', 'Marketing', 'Social', 'Film'].map(cat => (
            <button key={cat} type="button" onClick={() => setStudioFilter(cat)} className={`pill-btn ${studioFilter === cat ? 'active' : ''}`} style={{ padding: '8px 16px', fontSize: '14px' }}>{cat}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {shown.map((st, idx) => (
            <button key={idx} type="button" onClick={() => setActiveTool(st.id as ActiveTool)} className="camera-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span className="title-3" style={{ color: 'var(--text)', fontWeight: 600 }}>{st.title}</span>
                <span className="mono caption-3" style={{ color: 'var(--on-accent)', background: 'var(--accent)', padding: '2px 8px', borderRadius: '6px' }}>{st.tag}</span>
              </div>
              <p className="body-5" style={{ margin: 0 }}>{st.desc}</p>
              <div className="mono caption-3" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                Launch Studio <ArrowRight size={13} />
              </div>
            </button>
          ))}
        </div>
      </div>
    ));
  }

  if (activeTool === 'mcp_hub') {
    const snippets: Record<string, string> = {
      claude: `// Add to claude_desktop_config.json\n{\n  "mcpServers": {\n    "omniviral-studio": {\n      "command": "C:\\\\Users\\\\Mr.N0Buddy\\\\OneDrive\\\\Desktop\\\\ai_video_platform\\\\backend\\\\venv\\\\Scripts\\\\python.exe",\n      "args": ["C:\\\\Users\\\\Mr.N0Buddy\\\\OneDrive\\\\Desktop\\\\ai_video_platform\\\\backend\\\\mcp_server.py"]\n    }\n  }\n}`,
      claude_code: `# Register OmniViral MCP Server in Claude Code CLI\nclaude mcp add omniviral-studio -- C:\\Users\\Mr.N0Buddy\\OneDrive\\Desktop\\ai_video_platform\\backend\\venv\\Scripts\\python.exe C:\\Users\\Mr.N0Buddy\\OneDrive\\Desktop\\ai_video_platform\\backend\\mcp_server.py`,
      chatgpt: `# OpenAPI Action Schema URL for Custom GPTs / ChatGPT:\nhttp://127.0.0.1:8000/openapi.json\n\n# Endpoints:\nPOST /api/videos/generate\nPOST /api/tools/video/click-to-ad\nPOST /api/tools/image/mangaka`,
      telegram: `# Trigger via Telegram Bot Webhook -> OmniViral REST API:\ncurl -X POST http://127.0.0.1:8000/api/videos/generate \\\n  -H "Content-Type: application/json" \\\n  -d '{"niche":"true_crime","camera_move":"crash_zoom","color_fx":"noir"}'`,
      cli: `# Built in OmniViral CLI (backend/omniviral_cli.py):\npython omniviral_cli.py video --niche true_crime --move crash_zoom --lut noir\npython omniviral_cli.py ad --store mystore.com --product "Smart Ring" --price "$149"\npython omniviral_cli.py image --prompt "cyberpunk samurai in rain"`
    };
    return wrap('Generate with OmniViral MCP & CLI', 'JSON-RPC 2.0 LIVE', 'Connect Claude, Claude Code, ChatGPT, Telegram, CLI, and creative plugins directly to your zero cost engine.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {[['claude', 'Claude'], ['claude_code', 'Claude Code'], ['chatgpt', 'ChatGPT'], ['telegram', 'Telegram'], ['cli', 'CLI']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setMcpClient(id as any)} className={`pill-btn ${mcpClient === id ? 'active' : ''}`} style={{ padding: '8px 14px', fontSize: '13px' }}>{label}</button>
            ))}
          </div>
          <pre className="mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', fontSize: '13px', color: 'var(--accent)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {snippets[mcpClient]}
          </pre>
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(snippets[mcpClient]); setCopiedMcp(true); onNotify('success', 'Integration config copied'); setTimeout(() => setCopiedMcp(false), 2000); }}
            className="volt-btn"
            style={{ marginTop: '12px' }}
          >
            {copiedMcp ? <Check size={15} /> : <Copy size={15} />} {copiedMcp ? 'Copied Config' : 'Copy Integration Config'}
          </button>
        </div>

        <div className="camera-card" style={{ padding: '16px' }}>
          <div className="mono caption-3" style={{ color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Terminal size={14} /> CREATIVE PLUGIN BRIDGES
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {['Adobe Photoshop', 'After Effects', 'Premiere Pro', 'DaVinci Resolve', 'Figma', 'Blender'].map(pl => (
              <div key={pl} className="caption-3" style={{ padding: '10px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text)' }}>
                {pl}
              </div>
            ))}
          </div>
          <p className="caption-4" style={{ marginTop: '12px', lineHeight: 1.5 }}>
            All rendered MP4, JPG, and MP3 outputs are saved locally in <code className="mono" style={{ color: 'var(--accent)' }}>backend/output/</code> for direct drop in into your editor.
          </p>
        </div>
      </div>
    ));
  }

  return null;
}
