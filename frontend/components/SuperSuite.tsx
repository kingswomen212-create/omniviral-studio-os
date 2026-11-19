import React, { useState } from 'react';
import {
  Scissors, Bot, UserSquare2, Mic2, Presentation, Languages,
  Smile, Hexagon, Eraser, Minimize2, Download, Zap, Plus, Trash2
} from 'lucide-react';
import { DotGridLoader } from './ui/StudioPrimitives';
import type { ActiveTool } from './ToolSuites';

const API_BASE = 'http://127.0.0.1:8000';

interface Props {
  activeTool: ActiveTool;
  voices: any[];
  onVideoCreated: (v: any) => void;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

export default function SuperSuite({ activeTool, voices, onVideoCreated, onNotify }: Props) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Clipping Agent
  const [clipLen, setClipLen] = useState(10);
  const [numClips, setNumClips] = useState(3);
  const [hookPrefix, setHookPrefix] = useState('VIRAL MOMENT');
  const [clippedResults, setClippedResults] = useState<any[]>([]);

  // Video Agent
  const [agentPrompt, setAgentPrompt] = useState('Create a fast viral cyberpunk video about how AI agents will replace smartphones by 2035');
  const [agentOut, setAgentOut] = useState<any>(null);

  // Photo Avatar
  const [avatarScript, setAvatarScript] = useState('Welcome! You just turned a single static portrait into a talking AI avatar video with zero studio gear.');
  const [avatarVoice, setAvatarVoice] = useState('en-US-AriaNeural');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Video Podcast
  const [podTitle, setPodTitle] = useState('THE AI SIGNAL PODCAST');
  const [hostA, setHostA] = useState('ALEX');
  const [hostB, setHostB] = useState('MAYA');
  const [podLines, setPodLines] = useState([
    { host: 'A', text: 'Welcome back to the studio. Solo creators are now running full media networks with AI.' },
    { host: 'B', text: 'Exactly. One workflow handles scripting, neural voices, 60fps graphics, and publishing.' },
    { host: 'A', text: 'And the biggest unlock is that broadcast mastering now runs locally at zero API cost.' }
  ]);
  const [podUrl, setPodUrl] = useState<string | null>(null);

  // PPT to Video
  const [deckTitle, setDeckTitle] = useState('Q4 AI GROWTH STRATEGY');
  const [slides, setSlides] = useState([
    { title: 'The Bottleneck', bullet: 'Agencies charge $3,000+ per month for short form editing', notes: 'Traditional video editing takes days and drains marketing budgets.' },
    { title: 'The Automation Shift', bullet: 'End to end AI cinema pipeline at $0 per render', notes: 'Modern studios combine neural voices, automated visuals, and broadcast mastering.' },
    { title: '10x Channel Output', bullet: 'Daily publishing across YouTube, TikTok & Instagram', notes: 'Teams scale across six platforms simultaneously in minutes.' }
  ]);
  const [pptUrl, setPptUrl] = useState<string | null>(null);

  // Video Translate
  const [vtrScript, setVtrScript] = useState('Welcome to the future of global AI video dubbing and translation.');
  const [vtrLang, setVtrLang] = useState('es');
  const [vtrOut, setVtrOut] = useState<any>(null);

  // Meme Maker
  const [memeTop, setMemeTop] = useState('WHEN AI EDITS YOUR VIDEO');
  const [memeBot, setMemeBot] = useState('IN 12 SECONDS FOR $0');
  const [memeOut, setMemeOut] = useState<any>(null);

  // Logo Generator
  const [brandName, setBrandName] = useState('OMNIVIRAL');
  const [tagline, setTagline] = useState('AI CINEMA OS');
  const [logoAccent, setLogoAccent] = useState('D9FF00');
  const [logoOut, setLogoOut] = useState<any>(null);

  // Remove BG
  const [keyColor, setKeyColor] = useState('0x000000');
  const [similarity, setSimilarity] = useState(0.22);
  const [rmbgUrl, setRmbgUrl] = useState<string | null>(null);

  // Convert / Compress
  const [compLevel, setCompLevel] = useState('balanced');
  const [compOut, setCompOut] = useState<any>(null);

  const wrap = (title: string, badge: string, desc: string, children: React.ReactNode) => (
    <div style={{ maxWidth: '1240px', width: '100%', margin: '24px auto', padding: '0 24px' }}>
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

  // 1. EROMIFY CLIPPING AGENT
  if (activeTool === 'clipping_agent') {
    const run = async () => {
      if (!file) return onNotify('error', 'Upload a long MP4 video first');
      setLoading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('clip_length', String(clipLen));
        fd.append('num_clips', String(numClips));
        fd.append('hook_prefix', hookPrefix);
        const r = await fetch(`${API_BASE}/api/super/clipping-agent`, { method: 'POST', body: fd });
        const d = await r.json();
        setClippedResults(d.clips || []);
        if (d.clips?.[0]) onVideoCreated(d.clips[0]);
        onNotify('success', `Extracted ${d.clips?.length || 0} viral 9:16 clips`);
      } catch { onNotify('error', 'Clipping Agent failed'); }
      finally { setLoading(false); }
    };
    return wrap('Clipping Agent — Long Video In, Viral Clips Out', 'EROMIFY ENGINE', 'Upload any long YouTube video, podcast, or webinar and automatically slice it into vertical 9:16 viral clips with progress bar & hook badges.', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px 220px', gap: '12px', alignItems: 'end' }}>
          <div><label className="mono caption-4">SOURCE LONG VIDEO</label><input type="file" accept="video/*" className="studio-input" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
          <div><label className="mono caption-4">CLIPS</label><input type="number" min={1} max={5} className="studio-input" value={numClips} onChange={e => setNumClips(Number(e.target.value))} /></div>
          <div><label className="mono caption-4">SECONDS EACH</label><input type="number" min={5} max={60} className="studio-input" value={clipLen} onChange={e => setClipLen(Number(e.target.value))} /></div>
          <div><label className="mono caption-4">HOOK BADGE</label><input className="studio-input" value={hookPrefix} onChange={e => setHookPrefix(e.target.value)} /></div>
        </div>
        <button type="button" onClick={run} disabled={loading} className="volt-btn" style={{ maxWidth: '320px' }}>
          <Scissors size={16} /> {loading ? 'Clipping Viral Moments...' : 'Run Clipping Agent'}
        </button>
        {loading && <DotGridLoader label="SLICING 9:16 VIRAL CLIPS" />}
        {clippedResults.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {clippedResults.map(c => (
              <div key={c.id} className="camera-card" style={{ padding: '12px' }}>
                <video src={`${API_BASE}${c.url}`} controls style={{ width: '100%', height: '320px', objectFit: 'cover', borderRadius: '8px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <span className="caption-3" style={{ color: 'var(--text)' }}>{c.title}</span>
                  <a href={`${API_BASE}${c.url}`} download={c.filename} className="pill-btn" style={{ padding: '5px 10px', fontSize: '12px', color: 'var(--accent)' }}><Download size={13} /></a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ));
  }

  // 2. HEYGEN VIDEO AGENT (1-PROMPT AUTONOMOUS)
  if (activeTool === 'video_agent') {
    const run = async () => {
      if (!agentPrompt.trim()) return onNotify('error', 'Describe the video you want');
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/super/video-agent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: agentPrompt })
        });
        const d = await r.json();
        setAgentOut(d);
        onVideoCreated(d);
        onNotify('success', 'Autonomous Video Agent finished production');
      } catch { onNotify('error', 'Video Agent error'); }
      finally { setLoading(false); }
    };
    return wrap('Autonomous Video Agent', '1 PROMPT TO FINISHED FILM', 'Describe your goal in plain English. The Agent plans niche, aspect ratio, LUT, camera rig, music mood, and renders the complete video.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <textarea className="studio-input" rows={4} value={agentPrompt} onChange={e => setAgentPrompt(e.target.value)} placeholder="e.g. Make a 16:9 dark noir true crime documentary or a fast viral stoicism short..." />
          <button type="button" onClick={run} disabled={loading} className="volt-btn" style={{ minHeight: '48px' }}>
            <Bot size={17} /> {loading ? 'Agent Planning & Directing...' : 'Launch Video Agent'}
          </button>
          {agentOut?.agent_plan && (
            <div className="camera-card" style={{ padding: '14px' }}>
              <div className="mono caption-3" style={{ color: 'var(--accent)', marginBottom: '6px' }}>AUTONOMOUS PRODUCTION PLAN</div>
              <div className="mono caption-4">
                NICHE: {agentOut.agent_plan.niche} • RATIO: {agentOut.agent_plan.aspect_ratio} • LUT: {agentOut.agent_plan.lut} • RIG: {agentOut.agent_plan.camera_move} • MUSIC: {agentOut.agent_plan.music_mood}
              </div>
            </div>
          )}
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          {loading ? <DotGridLoader label="AGENT DIRECTING" /> : agentOut ? <video key={agentOut.url} src={`${API_BASE}${agentOut.url}`} controls autoPlay loop style={{ width: '100%', maxHeight: '420px', borderRadius: '10px' }} /> : <span className="body-5">Agent output appears here</span>}
        </div>
      </div>
    ));
  }

  // 3. HEYGEN PHOTO AVATAR / IMAGE TO VIDEO
  if (activeTool === 'photo_avatar') {
    const run = async () => {
      if (!file) return onNotify('error', 'Upload a portrait photo first');
      setLoading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('script', avatarScript);
        fd.append('voice_id', avatarVoice);
        const r = await fetch(`${API_BASE}/api/super/photo-avatar`, { method: 'POST', body: fd });
        const d = await r.json();
        setAvatarUrl(`${API_BASE}${d.url}`);
        onVideoCreated(d);
        onNotify('success', 'Photo Avatar brought to life');
      } catch { onNotify('error', 'Photo Avatar render failed'); }
      finally { setLoading(false); }
    };
    return wrap('Photo Avatar & Image to Video', 'HEYGEN STYLE AVATAR', 'Drop in any portrait image to animate natural camera drift, live speaking waveform, neural voice, and viral captions.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="file" accept="image/*" className="studio-input" onChange={e => setFile(e.target.files?.[0] || null)} />
          <textarea className="studio-input" rows={4} value={avatarScript} onChange={e => setAvatarScript(e.target.value)} />
          <select className="studio-input" value={avatarVoice} onChange={e => setAvatarVoice(e.target.value)}>
            {voices.slice(0, 30).map(v => <option key={v.id} value={v.id}>{v.name} ({v.locale})</option>)}
          </select>
          <button type="button" onClick={run} disabled={loading} className="volt-btn"><UserSquare2 size={16} /> {loading ? 'Animating Portrait...' : 'Bring Photo to Life'}</button>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          {loading ? <DotGridLoader label="ANIMATING AVATAR" /> : avatarUrl ? <video src={avatarUrl} controls autoPlay loop style={{ width: '100%', maxHeight: '420px', borderRadius: '10px' }} /> : <span className="body-5">Talking avatar preview</span>}
        </div>
      </div>
    ));
  }

  // 4. HEYGEN VIDEO PODCAST GENERATOR
  if (activeTool === 'video_podcast') {
    const run = async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/super/video-podcast`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ show_title: podTitle, host_a_name: hostA, host_b_name: hostB, dialogue: podLines })
        });
        const d = await r.json();
        setPodUrl(`${API_BASE}${d.url}`);
        onVideoCreated(d);
        onNotify('success', 'Dual host AI Video Podcast mastered');
      } catch { onNotify('error', 'Podcast generation failed'); }
      finally { setLoading(false); }
    };
    return wrap('AI Video Podcast Studio', 'DUAL HOST 16:9 STUDIO', 'Generate full video podcast episodes with two AI hosts, split screen studio deck, live waveforms, and captions without a microphone.', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 180px', gap: '12px' }}>
          <input className="studio-input" value={podTitle} onChange={e => setPodTitle(e.target.value)} placeholder="Podcast Title" />
          <input className="studio-input" value={hostA} onChange={e => setHostA(e.target.value)} placeholder="Host A" />
          <input className="studio-input" value={hostB} onChange={e => setHostB(e.target.value)} placeholder="Host B" />
        </div>
        {podLines.map((l, idx) => (
          <div key={idx} className="camera-card" style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
            <select className="studio-input" value={l.host} onChange={e => setPodLines(prev => prev.map((it, i) => i === idx ? { ...it, host: e.target.value } : it))}>
              <option value="A">{hostA}</option>
              <option value="B">{hostB}</option>
            </select>
            <input className="studio-input" value={l.text} onChange={e => setPodLines(prev => prev.map((it, i) => i === idx ? { ...it, text: e.target.value } : it))} />
          </div>
        ))}
        <button type="button" onClick={run} disabled={loading} className="volt-btn" style={{ maxWidth: '340px' }}>
          <Mic2 size={16} /> {loading ? 'Recording Studio Podcast...' : 'Generate Video Podcast'}
        </button>
        {loading && <DotGridLoader label="PRODUCING VIDEO PODCAST" />}
        {podUrl && !loading && <video src={podUrl} controls autoPlay style={{ width: '100%', maxHeight: '440px', borderRadius: '14px', background: '#000' }} />}
      </div>
    ));
  }

  // 5. HEYGEN PPT / SLIDES TO VIDEO
  if (activeTool === 'ppt_to_video') {
    const run = async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/super/ppt-to-video`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deck_title: deckTitle, slides })
        });
        const d = await r.json();
        setPptUrl(`${API_BASE}${d.url}`);
        onVideoCreated(d);
        onNotify('success', 'Narrated presentation video rendered');
      } catch { onNotify('error', 'Slides render failed'); }
      finally { setLoading(false); }
    };
    return wrap('PPT & Slides to Video', '16:9 NARRATED DECK', 'Turn slide decks and speaker notes into smooth narrated 16:9 presentation videos with wipe transitions and music.', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input className="studio-input" value={deckTitle} onChange={e => setDeckTitle(e.target.value)} placeholder="Presentation Deck Title" />
          <button type="button" onClick={() => setSlides(p => [...p, { title: 'New Slide', bullet: 'Key takeaway point', notes: 'Explain this slide clearly for the audience.' }])} className="pill-btn" style={{ padding: '0 14px', whiteSpace: 'nowrap', color: 'var(--text)' }}><Plus size={14} /> Add Slide</button>
        </div>
        {slides.map((sl, idx) => (
          <div key={idx} className="camera-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr auto', gap: '10px', alignItems: 'center' }}>
            <input className="studio-input" value={sl.title} onChange={e => setSlides(p => p.map((it, i) => i === idx ? { ...it, title: e.target.value } : it))} placeholder="Slide Heading" />
            <input className="studio-input" value={sl.bullet} onChange={e => setSlides(p => p.map((it, i) => i === idx ? { ...it, bullet: e.target.value } : it))} placeholder="On screen bullet" />
            <input className="studio-input" value={sl.notes} onChange={e => setSlides(p => p.map((it, i) => i === idx ? { ...it, notes: e.target.value } : it))} placeholder="Speaker voiceover notes" />
            <button type="button" onClick={() => setSlides(p => p.filter((_, i) => i !== idx))} className="pill-btn" style={{ padding: '8px', color: 'var(--danger)' }}><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" onClick={run} disabled={loading} className="volt-btn" style={{ maxWidth: '320px' }}>
          <Presentation size={16} /> {loading ? 'Rendering Slides Video...' : 'Convert Slides to Video'}
        </button>
        {loading && <DotGridLoader label="RENDERING 16:9 PRESENTATION" />}
        {pptUrl && !loading && <video src={pptUrl} controls autoPlay style={{ width: '100%', maxHeight: '440px', borderRadius: '14px', background: '#000' }} />}
      </div>
    ));
  }

  // 6. HEYGEN VIDEO TRANSLATE & AI DUBBING
  if (activeTool === 'video_translate') {
    const run = async () => {
      if (!file) return onNotify('error', 'Upload an MP4 video first');
      setLoading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('original_script', vtrScript);
        fd.append('target_lang', vtrLang);
        const r = await fetch(`${API_BASE}/api/super/video-translate`, { method: 'POST', body: fd });
        const d = await r.json();
        setVtrOut(d);
        onNotify('success', `Video dubbed into ${d.language}`);
      } catch { onNotify('error', 'Video translate failed'); }
      finally { setLoading(false); }
    };
    return wrap('Video Translate & AI Dubbing', '9+ LANGUAGES', 'Upload any video to translate its script, swap in a native neural voice dub, and burn translated captions.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="file" accept="video/*" className="studio-input" onChange={e => setFile(e.target.files?.[0] || null)} />
          <textarea className="studio-input" rows={3} value={vtrScript} onChange={e => setVtrScript(e.target.value)} />
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['it', 'Italian'], ['hi', 'Hindi'], ['ar', 'Arabic'], ['ja', 'Japanese'], ['ko', 'Korean'], ['pt', 'Portuguese']].map(([c, n]) => (
              <button key={c} type="button" onClick={() => setVtrLang(c)} className={`pill-btn ${vtrLang === c ? 'active' : ''}`} style={{ padding: '7px 12px', fontSize: '12px' }}>{n}</button>
            ))}
          </div>
          <button type="button" onClick={run} disabled={loading} className="volt-btn"><Languages size={16} /> {loading ? 'Translating & Dubbing...' : 'Translate & Dub Video'}</button>
          {vtrOut?.translated_text && <div className="camera-card caption-3" style={{ color: 'var(--accent)' }}>{vtrOut.translated_text}</div>}
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)', minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          {loading ? <DotGridLoader label="DUBBING VIDEO" /> : vtrOut ? <video src={`${API_BASE}${vtrOut.url}`} controls autoPlay loop style={{ width: '100%', maxHeight: '400px', borderRadius: '10px' }} /> : <span className="body-5">Dubbed video output</span>}
        </div>
      </div>
    ));
  }

  // 7. CAPCUT MEME MAKER
  if (activeTool === 'meme_maker') {
    const run = async () => {
      if (!file) return onNotify('error', 'Upload an image or video first');
      setLoading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('top_text', memeTop);
        fd.append('bottom_text', memeBot);
        const r = await fetch(`${API_BASE}/api/super/meme-maker`, { method: 'POST', body: fd });
        const d = await r.json();
        setMemeOut(d);
        onNotify('success', 'Meme rendered');
      } catch { onNotify('error', 'Meme render failed'); }
      finally { setLoading(false); }
    };
    return wrap('Meme Maker Studio', 'IMAGE & VIDEO MEMES', 'Drop in any image or MP4 clip and stamp classic high contrast viral top and bottom meme typography.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="file" accept="image/*,video/*" className="studio-input" onChange={e => setFile(e.target.files?.[0] || null)} />
          <input className="studio-input" value={memeTop} onChange={e => setMemeTop(e.target.value)} placeholder="TOP MEME TEXT" />
          <input className="studio-input" value={memeBot} onChange={e => setMemeBot(e.target.value)} placeholder="BOTTOM MEME TEXT" />
          <button type="button" onClick={run} disabled={loading} className="volt-btn"><Smile size={16} /> {loading ? 'Rendering Meme...' : 'Generate Meme'}</button>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)', minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          {memeOut ? (
            <>
              {memeOut.is_video ? <video src={`${API_BASE}${memeOut.url}`} controls style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} /> : <img src={`${API_BASE}${memeOut.url}`} alt="Meme" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />}
              <a href={`${API_BASE}${memeOut.url}`} download={memeOut.filename} className="volt-btn" style={{ marginTop: '12px' }}><Download size={14} /> Download Meme</a>
            </>
          ) : <span className="body-5">Meme output preview</span>}
        </div>
      </div>
    ));
  }

  // 8. CAPCUT AI LOGO GENERATOR
  if (activeTool === 'logo_generator') {
    const run = async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/super/logo-generator`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand_name: brandName, tagline, accent_hex: logoAccent })
        });
        const d = await r.json();
        setLogoOut(d);
        onNotify('success', 'Vector SVG & 1024px PNG Logo generated');
      } catch { onNotify('error', 'Logo generation failed'); }
      finally { setLoading(false); }
    };
    return wrap('AI Logo & Channel Brand Kit Generator', 'SVG + 1024PX PNG', 'Generate crisp geometric channel avatars, brand emblems, and social icons in both scalable SVG and 1024x1024 PNG.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input className="studio-input" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Brand / Channel Name" />
          <input className="studio-input" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Tagline" />
          <div style={{ display: 'flex', gap: '8px' }}>
            {[['D9FF00', 'Volt'], ['38BDF8', 'Cyan'], ['F43F5E', 'Crimson'], ['A855F7', 'Violet'], ['F59E0B', 'Gold']].map(([hex, n]) => (
              <button key={hex} type="button" onClick={() => setLogoAccent(hex)} className={`pill-btn ${logoAccent === hex ? 'active' : ''}`} style={{ padding: '7px 12px', fontSize: '12px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: `#${hex}` }} /> {n}
              </button>
            ))}
          </div>
          <button type="button" onClick={run} disabled={loading} className="volt-btn"><Hexagon size={16} /> {loading ? 'Crafting Logo...' : 'Generate SVG + PNG Logo'}</button>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)', minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          {logoOut ? (
            <>
              <img src={`${API_BASE}${logoOut.svg_url}`} alt="Generated Logo" style={{ width: '240px', height: '240px', borderRadius: '20px' }} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <a href={`${API_BASE}${logoOut.svg_url}`} download={logoOut.svg_filename} className="volt-btn"><Download size={14} /> SVG</a>
                <a href={`${API_BASE}${logoOut.png_url}`} download={logoOut.png_filename} className="pill-btn" style={{ padding: '0 14px', color: 'var(--text)' }}><Download size={14} /> PNG</a>
              </div>
            </>
          ) : <span className="body-5">Brand logo renders here</span>}
        </div>
      </div>
    ));
  }

  // 9. CAPCUT REMOVE BACKGROUND / TRANSPARENT PNG
  if (activeTool === 'remove_bg') {
    const run = async () => {
      if (!file) return onNotify('error', 'Upload an image first');
      setLoading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('key_color', keyColor);
        fd.append('similarity', String(similarity));
        const r = await fetch(`${API_BASE}/api/super/remove-bg`, { method: 'POST', body: fd });
        const d = await r.json();
        setRmbgUrl(`${API_BASE}${d.url}`);
        onNotify('success', 'Transparent PNG created');
      } catch { onNotify('error', 'Background removal failed'); }
      finally { setLoading(false); }
    };
    return wrap('Remove Background & Transparent PNG', 'RGBA ALPHA KEY', 'Extract transparent background PNGs from dark studio shots, white product photos, or green screen frames.', (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="file" accept="image/*" className="studio-input" onChange={e => setFile(e.target.files?.[0] || null)} />
          <div style={{ display: 'flex', gap: '8px' }}>
            {[['0x000000', 'Remove Black BG'], ['0xFFFFFF', 'Remove White BG'], ['0x00FF00', 'Green Screen']].map(([c, l]) => (
              <button key={c} type="button" onClick={() => setKeyColor(c)} className={`pill-btn ${keyColor === c ? 'active' : ''}`} style={{ flex: 1, padding: '10px', fontSize: '12px' }}>{l}</button>
            ))}
          </div>
          <div>
            <label className="mono caption-4">EDGE TOLERANCE ({similarity})</label>
            <input type="range" min="0.05" max="0.55" step="0.02" value={similarity} onChange={e => setSimilarity(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <button type="button" onClick={run} disabled={loading} className="volt-btn"><Eraser size={16} /> {loading ? 'Extracting Alpha...' : 'Remove Background'}</button>
        </div>
        <div style={{ background: 'repeating-conic-gradient(#1f1f29 0% 25%, #0d0d12 0% 50%) 50% / 20px 20px', borderRadius: '16px', border: '1px solid var(--border)', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          {rmbgUrl ? <><img src={rmbgUrl} alt="Transparent" style={{ maxWidth: '100%', maxHeight: '260px' }} /><a href={rmbgUrl} download className="volt-btn" style={{ marginTop: '12px' }}><Download size={14} /> Download PNG</a></> : <span className="body-5">Transparent PNG preview</span>}
        </div>
      </div>
    ));
  }

  // 10. CAPCUT CONVERT TO MP4 & COMPRESS VIDEO
  if (activeTool === 'convert_compress') {
    const run = async () => {
      if (!file) return onNotify('error', 'Upload any video file first');
      setLoading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('level', compLevel);
        const r = await fetch(`${API_BASE}/api/super/convert-compress`, { method: 'POST', body: fd });
        const d = await r.json();
        setCompOut(d);
        onNotify('success', `Converted & saved ${d.saved_percent}% file size`);
      } catch { onNotify('error', 'Conversion failed'); }
      finally { setLoading(false); }
    };
    return wrap('Convert Video to MP4 & Smart Compressor', 'H.264 FASTSTART', 'Convert MOV, MKV, WEBM, or AVI to universal MP4 and shrink file size for WhatsApp, Discord, web, and social uploads.', (
      <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <input type="file" accept="video/*" className="studio-input" onChange={e => setFile(e.target.files?.[0] || null)} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[['web_light', 'Max Compress (720p)'], ['balanced', 'Balanced (1080p)'], ['high_quality', 'High Quality MP4']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setCompLevel(id)} className={`pill-btn ${compLevel === id ? 'active' : ''}`} style={{ padding: '10px', fontSize: '12px' }}>{label}</button>
          ))}
        </div>
        <button type="button" onClick={run} disabled={loading} className="volt-btn"><Minimize2 size={16} /> {loading ? 'Compressing & Converting...' : 'Convert & Compress to MP4'}</button>
        {loading && <DotGridLoader label="OPTIMIZING H.264 STREAM" />}
        {compOut && !loading && (
          <div className="camera-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="title-4" style={{ color: 'var(--text)' }}>{compOut.original_mb} MB → <strong style={{ color: 'var(--accent)' }}>{compOut.compressed_mb} MB</strong></div>
              <div className="mono caption-3" style={{ color: 'var(--success)' }}>SAVED {compOut.saved_percent}%</div>
            </div>
            <a href={`${API_BASE}${compOut.url}`} download={compOut.filename} className="volt-btn"><Download size={14} /> Download MP4</a>
          </div>
        )}
      </div>
    ));
  }

  return null;
}
