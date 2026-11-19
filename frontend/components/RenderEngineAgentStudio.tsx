import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Zap,
  Sparkles,
  Film,
  Maximize2,
  ShieldCheck,
  Layers,
  Download,
  Upload,
  Gauge,
  CheckCircle2,
  Clapperboard,
  Sliders,
  KeyRound,
  AlertTriangle,
  X,
} from 'lucide-react';
import { DotGridLoader } from './ui/StudioPrimitives';

interface SavedVideo {
  id: string;
  title: string;
  filename: string;
  url: string;
}

interface Props {
  apiBase: string;
  savedVideos: SavedVideo[];
  voices: { id: string; name: string; locale: string }[];
  onMediaCreated: (item: any) => void;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

const USE_CASES = [
  { id: 'ad_filmmaking', name: 'Ad Filmmaking', tag: '24FPS LUXURY', desc: 'Golden-hour brand campaign with optical halation & wide-tracked editorial typography.' },
  { id: 'performance_marketing', name: 'Performance Marketing', tag: 'HIGH-ROAS', desc: 'Crisp high-contrast commercial pacing built for Meta, TikTok & YouTube Ads.' },
  { id: 'filmmaking', name: 'Theatrical Filmmaking', tag: 'ANAMORPHIC', desc: 'Kodak 2383 24fps film cadence, subtle grain & cinema letterbox bars.' },
  { id: 'micro_drama', name: 'Micro-Drama Series', tag: 'MOODY A24', desc: 'Atmospheric vertical drama with sculpted shadows & deep cinematic tone.' },
  { id: 'ai_ugc', name: 'AI UGC & Creator', tag: '30FPS REAL', desc: 'Daylight editorial portrait pacing tailored for UGC & product trial rooms.' },
  { id: 'ai_vfx', name: 'AI VFX & Sci-Fi', tag: '60FPS NEON', desc: 'High-frame-rate neon split-tone VFX spectacle with FidelityFX CAS 0.62.' },
  { id: 'pre_viz', name: 'Director Pre-Viz', tag: 'STORYBOARD', desc: 'Rapid production design & continuity contact sheet + animatic.' },
];

const MASTER_GRADES = [
  { id: 'luxury_halation', name: 'Luxury Halation Bloom' },
  { id: 'kodak_cinema_24', name: 'Kodak 2383 Film' },
  { id: 'high_roas_crisp', name: 'High-ROAS Crisp CAS' },
  { id: 'moody_a24', name: 'Moody A24 Cinema' },
  { id: 'editorial_minimal', name: 'Editorial Sunlight' },
  { id: 'cyber_vfx', name: 'Neon Sci-Fi VFX' },
];

const UPSCALE_PROFILES = [
  { id: 'cas_2x', name: 'FidelityFX CAS 2x Restoration', tag: 'BYTEDANCE / TOPAZ', desc: 'HQDN3D temporal denoise -> 2x Lanczos accurate_rnd -> AMD FidelityFX CAS 0.65 -> Deband.' },
  { id: 'uhd_4k', name: '4K UHD Cinema Mastering', tag: '2160P / 3840P', desc: 'Full 4K mastering with CAS micro-contrast, zero 8-bit gradient banding & micro film texture.' },
  { id: 'optical_flow_60', name: '60fps Optical-Flow MCI', tag: 'MOTION SMOOTH', desc: 'Bidirectional motion-compensated optical flow interpolation to silky 60fps.' },
  { id: 'halation_remaster', name: 'Optical Halation & Bloom', tag: 'A24 / KODAK', desc: 'Dual-path highlight bloom + warm screen blend + Kodak organic grain + CAS sharpening.' },
];

export const RenderEngineAgentStudio: React.FC<Props> = ({
  apiBase,
  savedVideos,
  voices,
  onMediaCreated,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<'agent_two' | 'upscale' | 'models'>('agent_two');
  const [caps, setCaps] = useState<any>(null);
  const [benchLoading, setBenchLoading] = useState(false);
  const [benchRes, setBenchRes] = useState<any>(null);

  // Agent Two Controls
  const [brief, setBrief] = useState('Luxury botanical fragrance glass bottle in golden hour sunlight with flowing silk');
  const [brandName, setBrandName] = useState('AETHER LUXE');
  const [useCase, setUseCase] = useState('ad_filmmaking');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [fps, setFps] = useState<number>(24);
  const [gradeId, setGradeId] = useState('luxury_halation');
  const [encoderMode, setEncoderMode] = useState<'gpu_fast' | 'auto' | 'studio_master'>('gpu_fast');
  const [captionStyle, setCaptionStyle] = useState('editorial');
  const [voiceId, setVoiceId] = useState('en-US-AndrewNeural');
  const [enableHalation, setEnableHalation] = useState(true);
  const [enableMotionBlur, setEnableMotionBlur] = useState(true);
  const [selectedVideoModel, setSelectedVideoModel] = useState('omniviral_cinema_v10');
  const [customClips, setCustomClips] = useState<{ filename: string; label: string }[]>([]);

  // Provider Keys Vault
  const [pexelsKey, setPexelsKey] = useState('');
  const [pixabayKey, setPixabayKey] = useState('');
  const [hfToken, setHfToken] = useState('');
  const [falKey, setFalKey] = useState('');
  const [repToken, setRepToken] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [comfyUrl, setComfyUrl] = useState('');
  const [savingKeys, setSavingKeys] = useState(false);

  // Agent Two Result
  const [rendering, setRendering] = useState(false);
  const [agentOut, setAgentOut] = useState<any>(null);

  // Pro Super-Resolution Upscaler Controls
  const [upscaleSource, setUpscaleSource] = useState('');
  const [upscaleProfile, setUpscaleProfile] = useState('cas_2x');
  const [upscaling, setUpscaling] = useState(false);
  const [upscaleOut, setUpscaleOut] = useState<any>(null);

  const loadCaps = () => {
    fetch(`${apiBase}/engine/capabilities`)
      .then((r) => r.json())
      .then((d) => setCaps(d))
      .catch(() => {});
  };

  useEffect(() => {
    loadCaps();
    fetch(`${apiBase}/schedule/settings`)
      .then((r) => r.json())
      .then((s) => {
        if (s.pexels_api_key) setPexelsKey(s.pexels_api_key);
        if (s.pixabay_api_key) setPixabayKey(s.pixabay_api_key);
        if (s.hf_api_token) setHfToken(s.hf_api_token);
        if (s.fal_api_key) setFalKey(s.fal_api_key);
        if (s.replicate_api_token) setRepToken(s.replicate_api_token);
        if (s.gemini_api_key) setGeminiKey(s.gemini_api_key);
        if (s.comfyui_url) setComfyUrl(s.comfyui_url);
      })
      .catch(() => {});
  }, [apiBase]);

  useEffect(() => {
    if (!upscaleSource && savedVideos.length > 0) {
      setUpscaleSource(savedVideos[0].filename);
    }
  }, [savedVideos, upscaleSource]);

  const runBenchmark = async () => {
    setBenchLoading(true);
    try {
      const r = await fetch(`${apiBase}/engine/benchmark`, { method: 'POST' });
      const d = await r.json();
      setBenchRes(d);
      onNotify('success', 'Hardware GPU vs CPU Master 1080p benchmark completed');
    } catch {
      onNotify('error', 'Benchmark failed');
    } finally {
      setBenchLoading(false);
    }
  };

  const handleUploadAgentClips = async (files: FileList) => {
    const uploaded: { filename: string; label: string }[] = [];
    for (let i = 0; i < Math.min(files.length, 6); i++) {
      const fd = new FormData();
      fd.append('file', files[i]);
      try {
        const r = await fetch(`${apiBase}/engine/upload-video`, { method: 'POST', body: fd });
        const d = await r.json();
        if (r.ok && d.filename) {
          uploaded.push({ filename: d.filename, label: files[i].name });
        }
      } catch {
        // skip
      }
    }
    if (uploaded.length > 0) {
      setCustomClips((prev) => [...prev, ...uploaded].slice(0, 6));
      onNotify('success', `Attached ${uploaded.length} real video clip(s) to Agent Two timeline`);
    }
  };

  const saveProviderKeys = async () => {
    setSavingKeys(true);
    try {
      const r = await fetch(`${apiBase}/engine/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pexels_api_key: pexelsKey,
          pixabay_api_key: pixabayKey,
          hf_api_token: hfToken,
          fal_api_key: falKey,
          replicate_api_token: repToken,
          gemini_api_key: geminiKey,
          comfyui_url: comfyUrl,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error('Save failed');
      setCaps((prev: any) => (prev ? { ...prev, media_providers: d.media_providers, models: d.models } : prev));
      onNotify('success', `Saved & activated providers: ${d.media_providers?.active_label || 'OK'}`);
    } catch {
      onNotify('error', 'Failed to save provider keys');
    } finally {
      setSavingKeys(false);
    }
  };

  const runAgentTwo = async () => {
    setRendering(true);
    setAgentOut(null);
    try {
      const r = await fetch(`${apiBase}/engine/agent-two`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          use_case: useCase,
          brand_name: brandName,
          aspect_ratio: aspectRatio,
          fps,
          grade_id: gradeId,
          encoder_mode: encoderMode,
          voice_id: voiceId,
          caption_style: captionStyle,
          enable_halation: enableHalation,
          enable_motion_blur: enableMotionBlur,
          model_profile: selectedVideoModel,
          custom_clip_filenames: customClips.map((c) => c.filename),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Agent Two render failed');
      setAgentOut(d);
      onMediaCreated(d);
      onNotify('success', `Agent Two mastered ${d.filename} (${d.real_video_shots}/5 real video shots • QA ${d.qa_report?.grade})`);
    } catch (err: any) {
      onNotify('error', err.message || 'Agent Two production failed');
    } finally {
      setRendering(false);
    }
  };

  const handleUploadRemasterVideo = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch(`${apiBase}/engine/upload-video`, { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Upload failed');
      setUpscaleSource(d.filename);
      onNotify('success', `Uploaded ${file.name} for Pro Super-Resolution remastering`);
    } catch (err: any) {
      onNotify('error', err.message || 'Upload failed');
    }
  };

  const runProUpscale = async () => {
    if (!upscaleSource) {
      onNotify('error', 'Select or upload a video first');
      return;
    }
    setUpscaling(true);
    setUpscaleOut(null);
    try {
      const r = await fetch(`${apiBase}/engine/upscale-pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_filename: upscaleSource,
          profile: upscaleProfile,
          encoder_mode: encoderMode,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Upscale failed');
      setUpscaleOut(d);
      onMediaCreated({
        id: d.filename,
        title: `Pro Remaster (${upscaleProfile})`,
        filename: d.filename,
        url: d.url,
        duration: d.after?.duration || 10,
      });
      onNotify('success', `Pro Super-Resolution mastered in ${d.render_seconds}s`);
    } catch (err: any) {
      onNotify('error', err.message || 'Super-Resolution failed');
    } finally {
      setUpscaling(false);
    }
  };

  const lblStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginBottom: '6px',
    letterSpacing: '0.04em',
  };

  const baseHost = apiBase.replace('/api', '');
  const activeTier = caps?.media_providers?.active_tier || 'curated_zero_key_photo';
  const hasRealVideoProvider = activeTier === 'ai_video_diffusion' || activeTier === 'real_4k_stock_video' || activeTier === 'local_cinema_vault' || customClips.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Engine Telemetry & Navigation Header */}
      <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h2 className="heading-5" style={{ color: 'var(--text)', margin: 0 }}>
                Cinema Render Engine v11.0 & Real Video Diffusion Studio
              </h2>
              <span className="mono caption-3" style={{ background: 'var(--accent)', color: 'var(--on-accent)', padding: '3px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Cpu size={12} /> GPU + REAL VIDEO DIFFUSION + 4K FOOTAGE
              </span>
            </div>
            <p className="body-5" style={{ margin: 0, maxWidth: '840px' }}>
              Native real-video assembly supporting Seedance/Kling/Wan/MiniMax (fal.ai & Replicate), free 4K moving video (Pexels & Pixabay), FLUX.1 studio generation, custom footage uploads, 2x supersampled high-fashion typography, and GPU BT.709 mastering.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setSubTab('agent_two')} className={`pill-btn ${subTab === 'agent_two' ? 'active' : ''}`} style={{ padding: '10px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Clapperboard size={14} /> Agent Two Director
            </button>
            <button type="button" onClick={() => setSubTab('upscale')} className={`pill-btn ${subTab === 'upscale' ? 'active' : ''}`} style={{ padding: '10px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Maximize2 size={14} /> Pro Super-Resolution
            </button>
            <button type="button" onClick={() => setSubTab('models')} className={`pill-btn ${subTab === 'models' ? 'active' : ''}`} style={{ padding: '10px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <KeyRound size={14} /> Real Video Models & Keys
            </button>
          </div>
        </div>

        {/* Honest Active Footage / AI Diffusion Source Status Strip */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: hasRealVideoProvider ? 'rgba(217,255,0,0.08)' : 'rgba(245,158,11,0.10)',
            border: hasRealVideoProvider ? '1px solid rgba(217,255,0,0.35)' : '1px solid rgba(245,158,11,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {hasRealVideoProvider ? (
              <CheckCircle2 size={18} color="var(--accent)" />
            ) : (
              <AlertTriangle size={18} color="#F59E0B" />
            )}
            <div>
              <div className="caption-3" style={{ color: 'var(--text)', fontWeight: 600 }}>
                {customClips.length > 0
                  ? `Custom Real Video Mode Active (${customClips.length} real moving clip(s) attached)`
                  : caps?.media_providers?.active_label || 'Checking configured video providers...'}
              </div>
              {!hasRealVideoProvider && (
                <div className="caption-4" style={{ fontSize: '12px', marginTop: '2px' }}>
                  For true InVideo-grade moving footage (not still photos), drop real MP4 clips below OR add a free 30-second Pexels/Pixabay 4K Video key or fal.ai (Seedance/Kling) key.
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSubTab('models')}
            className="volt-btn"
            style={{ padding: '8px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
          >
            <KeyRound size={13} /> Connect Real Video Providers
          </button>
        </div>

        {/* Live Hardware Telemetry Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
          <div>
            <div className="mono caption-4">HARDWARE GPU ENCODER</div>
            <div className="title-4" style={{ color: 'var(--accent)', marginTop: '2px' }}>
              {caps?.hardware?.recommended_gpu_label || 'Detecting GPU...'}
            </div>
          </div>
          <div>
            <div className="mono caption-4">PARALLEL THREADS</div>
            <div className="title-4" style={{ color: 'var(--text)', marginTop: '2px' }}>
              {caps?.hardware?.cpu_cores || 12} Cores Active
            </div>
          </div>
          <div>
            <div className="mono caption-4">OPTICAL MASTERING</div>
            <div className="title-4" style={{ color: 'var(--text)', marginTop: '2px' }}>
              FidelityFX CAS • Deband • Halation
            </div>
          </div>
          <div>
            <div className="mono caption-4">TYPOGRAPHY & AUDIO</div>
            <div className="title-4" style={{ color: 'var(--text)', marginTop: '2px' }}>
              2x SSAA Editorial • 48kHz -14 LUFS
            </div>
          </div>
          <button
            type="button"
            disabled={benchLoading}
            onClick={runBenchmark}
            className="pill-btn"
            style={{ padding: '9px 14px', fontSize: '12px', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Gauge size={14} color="var(--accent)" />
            {benchLoading ? 'Benchmarking...' : '1080p Benchmark'}
          </button>
        </div>

        {benchRes && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', paddingTop: '8px' }}>
            {benchRes.results.map((r: any) => (
              <div key={r.mode} className="camera-card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="caption-3" style={{ color: 'var(--text)' }}>{r.label}</div>
                  <div className="mono caption-4" style={{ fontSize: '11px' }}>{r.codec} • {r.elapsed_ms}ms</div>
                </div>
                <span className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>{r.effective_fps} fps</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: AGENT TWO MULTI-AGENT FILM & AD DIRECTOR */}
      {subTab === 'agent_two' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(380px, 1fr)', gap: '20px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Use Case Grid */}
            <div className="glass-panel" style={{ padding: '18px' }}>
              <div className="mono caption-3" style={{ color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Film size={14} /> 01 / PRODUCTION USE CASE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {USE_CASES.map((uc) => (
                  <button
                    key={uc.id}
                    type="button"
                    onClick={() => {
                      setUseCase(uc.id);
                      if (uc.id === 'ai_vfx') setFps(60);
                      else if (uc.id === 'performance_marketing' || uc.id === 'ai_ugc') setFps(30);
                      else setFps(24);
                    }}
                    className={`camera-card ${useCase === uc.id ? 'active' : ''}`}
                    style={{ padding: '11px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span className="title-4" style={{ color: 'var(--text)', fontWeight: 600 }}>{uc.name}</span>
                      <span className="mono" style={{ fontSize: '10px', color: 'var(--accent)', background: 'rgba(217,255,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{uc.tag}</span>
                    </div>
                    <span className="caption-4" style={{ lineHeight: 1.35 }}>{uc.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brief, Real Video Clips Dropzone & Mastering Specs */}
            <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="mono caption-3" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} /> 02 / CREATIVE BRIEF, REAL VIDEO FOOTAGE & CINEMA GRADE
              </div>

              <div>
                <label style={lblStyle}>Director Creative Brief (Prompt for Seedance / Kling / 4K Stock Video / FLUX)</label>
                <textarea
                  className="studio-input"
                  rows={2}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                />
              </div>

              {/* Direct Real Moving Video Clips Uploader */}
              <div className="camera-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  <div>
                    <div className="caption-3" style={{ color: 'var(--text)' }}>Optional: Drop Real Moving Video Clips (MP4 / WebM / MOV)</div>
                    <div className="caption-4" style={{ fontSize: '11px' }}>
                      Agent Two auto-cuts your real footage to the beat, grades with Halation + CAS & renders 2x SSAA editorial typography.
                    </div>
                  </div>
                  <label className="pill-btn" style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Upload size={13} color="var(--accent)" /> Attach Video Clips
                    <input type="file" accept="video/*,image/*" multiple style={{ display: 'none' }} onChange={(e) => e.target.files && handleUploadAgentClips(e.target.files)} />
                  </label>
                </div>
                {customClips.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {customClips.map((c, idx) => (
                      <span key={c.filename} className="mono" style={{ fontSize: '11px', background: 'rgba(217,255,0,0.12)', border: '1px solid rgba(217,255,0,0.35)', color: 'var(--text)', padding: '4px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        #{idx + 1} {c.label.slice(0, 22)}
                        <button type="button" onClick={() => setCustomClips((prev) => prev.filter((x) => x.filename !== c.filename))} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, display: 'inline-flex' }}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={lblStyle}>Brand Name (Subtle Top-Right Mark + Editorial Title)</label>
                  <input className="studio-input" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
                </div>
                <div>
                  <label style={lblStyle}>Cinema Color Mastering LUT + CAS</label>
                  <select className="studio-input" value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                    {MASTER_GRADES.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="mono" style={lblStyle}>ASPECT RATIO</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                    {['9:16', '1:1', '16:9'].map((ar) => (
                      <button key={ar} type="button" onClick={() => setAspectRatio(ar)} className={`pill-btn ${aspectRatio === ar ? 'active' : ''}`} style={{ padding: '8px 4px', fontSize: '12px', justifyContent: 'center' }}>
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mono" style={lblStyle}>FILM CADENCE</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                    {[24, 30, 60].map((rate) => (
                      <button key={rate} type="button" onClick={() => setFps(rate)} className={`pill-btn ${fps === rate ? 'active' : ''}`} style={{ padding: '8px 4px', fontSize: '12px', justifyContent: 'center' }}>
                        {rate}p
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mono" style={lblStyle}>ENCODER ENGINE</label>
                  <select className="studio-input" value={encoderMode} onChange={(e) => setEncoderMode(e.target.value as any)} style={{ fontSize: '12px' }}>
                    <option value="gpu_fast">GPU Hardware Fast</option>
                    <option value="auto">Auto Balanced</option>
                    <option value="studio_master">Studio Master CRF 16</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={lblStyle}>Typography / Caption Mode</label>
                  <select className="studio-input" value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value)}>
                    <option value="editorial">2x SSAA Luxury Editorial Typography (Tracked White)</option>
                    <option value="volt_lime">Volt Lime Word-by-Word Viral</option>
                    <option value="hormozi">Hormozi Gold Pop</option>
                    <option value="none">Pure Cinema (Zero Text)</option>
                  </select>
                </div>
                <div>
                  <label style={lblStyle}>Neural Narrator Voice (48kHz Mastered)</label>
                  <select className="studio-input" value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
                    {voices.length > 0 ? (
                      voices.slice(0, 20).map((v) => (
                        <option key={v.id} value={v.id}>{v.name} ({v.locale})</option>
                      ))
                    ) : (
                      <option value="en-US-AndrewNeural">Andrew (Warm Cinema Narrator)</option>
                    )}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={enableHalation} onChange={(e) => setEnableHalation(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                  Optical Film Halation Bloom
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={enableMotionBlur} onChange={(e) => setEnableMotionBlur(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                  180° Shutter Optical Motion Blur
                </label>
              </div>

              <button
                type="button"
                disabled={rendering}
                onClick={runAgentTwo}
                className="volt-btn"
                style={{ width: '100%', minHeight: '48px', fontSize: '14px', justifyContent: 'center' }}
              >
                <Zap size={16} fill="var(--on-accent)" />
                {rendering ? 'Running 5-Agent Cinema Render Pipeline...' : 'Launch Agent Two Cinema Production'}
              </button>
            </div>
          </div>

          {/* RIGHT: Output, Media Source Audit, 3x3 Storyboard & QA Scorecard */}
          <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="mono caption-3" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>PRODUCTION OUTPUT & QA INSPECTOR</span>
              {agentOut?.qa_report && (
                <span style={{ background: 'var(--accent)', color: 'var(--on-accent)', padding: '2px 8px', borderRadius: '6px' }}>
                  QA GRADE {agentOut.qa_report.grade} ({agentOut.qa_report.score}/100)
                </span>
              )}
            </div>

            {rendering ? (
              <div style={{ padding: '64px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center' }}>
                <DotGridLoader />
                <div className="mono caption-4">
                  Acquiring cinema media → building continuity sheet → rendering parallel {fps}fps GPU shots with 2x SSAA typography & Halation...
                </div>
              </div>
            ) : agentOut ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <video
                  key={agentOut.url}
                  src={`${baseHost}${agentOut.url}`}
                  controls
                  autoPlay
                  loop
                  style={{ width: '100%', maxHeight: '440px', borderRadius: '12px', background: '#000', border: '1px solid var(--border)' }}
                />

                {agentOut.media_sources && (
                  <div className="mono caption-4" style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                    FOOTAGE SOURCE: <strong style={{ color: 'var(--accent)' }}>{agentOut.media_sources.join(' • ')}</strong> ({agentOut.real_video_shots}/5 moving video clips)
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a href={`${baseHost}${agentOut.url}`} download={agentOut.filename} className="volt-btn" style={{ padding: '8px 14px', fontSize: '12px', textDecoration: 'none' }}>
                    <Download size={14} /> Download Master MP4
                  </a>
                  {agentOut.storyboard_url && (
                    <a href={`${baseHost}${agentOut.storyboard_url}`} download={agentOut.storyboard_filename} className="pill-btn" style={{ padding: '8px 14px', fontSize: '12px', textDecoration: 'none', color: 'var(--text)' }}>
                      <Download size={14} /> Download Storyboard
                    </a>
                  )}
                </div>

                {agentOut.storyboard_url && (
                  <div>
                    <div className="mono caption-4" style={{ marginBottom: '6px' }}>CONTINUITY STORYBOARD</div>
                    <img src={`${baseHost}${agentOut.storyboard_url}`} alt="Continuity Storyboard" style={{ width: '100%', borderRadius: '10px', border: '1px solid var(--border)' }} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="mono caption-4">5-AGENT EXECUTION TRACE ({agentOut.render_seconds}s total)</div>
                  {agentOut.agent_trace?.map((st: any) => (
                    <div key={st.agent} className="camera-card" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div>
                        <div className="caption-3" style={{ color: 'var(--text)', fontSize: '12px' }}>{st.agent}</div>
                        <div className="caption-4" style={{ fontSize: '11px' }}>{st.detail}</div>
                      </div>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--accent)', whiteSpace: 'nowrap' }}>{st.ms}ms</span>
                    </div>
                  ))}
                </div>

                {agentOut.qa_report?.checks && (
                  <div className="camera-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="mono caption-3" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck size={14} /> SELF-REVIEW QA VERIFICATION
                    </div>
                    {agentOut.qa_report.checks.map((c: string) => (
                      <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text)' }}>
                        <CheckCircle2 size={13} color="var(--accent)" /> {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '64px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={30} color="var(--accent)" />
                <div className="title-4" style={{ color: 'var(--text)' }}>Ready for Real-Video Cinema Production</div>
                <span className="caption-4" style={{ maxWidth: '360px' }}>
                  Attach real video clips above or connect Pexels Free 4K Video / fal.ai Seedance & Kling in the Models tab to generate genuine moving cinema films.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRO SUPER-RESOLUTION UPSCALER */}
      {subTab === 'upscale' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 1fr)', gap: '20px', alignItems: 'start' }}>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="title-3" style={{ color: 'var(--text)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Maximize2 size={18} color="var(--accent)" /> Pro Cinema Super-Resolution & Optical-Flow Remaster
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'end' }}>
              <div>
                <label className="mono" style={lblStyle}>SELECT VIDEO FROM LIBRARY</label>
                <select className="studio-input" value={upscaleSource} onChange={(e) => setUpscaleSource(e.target.value)}>
                  {savedVideos.length === 0 && !upscaleSource ? (
                    <option value="">No saved videos yet — upload or render one</option>
                  ) : (
                    <>
                      {upscaleSource && !savedVideos.some((v) => v.filename === upscaleSource) && (
                        <option value={upscaleSource}>Uploaded: {upscaleSource}</option>
                      )}
                      {savedVideos.map((v) => (
                        <option key={v.id} value={v.filename}>{v.title} ({v.filename})</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <label className="pill-btn" style={{ padding: '10px 14px', fontSize: '12px', cursor: 'pointer', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={14} color="var(--accent)" /> Upload MP4/WebM
                <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleUploadRemasterVideo(e.target.files[0])} />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {UPSCALE_PROFILES.map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() => setUpscaleProfile(pr.id)}
                  className={`camera-card ${upscaleProfile === pr.id ? 'active' : ''}`}
                  style={{ padding: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '5px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '6px' }}>
                    <span className="title-4" style={{ color: 'var(--text)', fontWeight: 600 }}>{pr.name}</span>
                    <span className="mono" style={{ fontSize: '10px', color: 'var(--accent)' }}>{pr.tag}</span>
                  </div>
                  <span className="caption-4" style={{ lineHeight: 1.4 }}>{pr.desc}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={upscaling || !upscaleSource}
              onClick={runProUpscale}
              className="volt-btn"
              style={{ width: '100%', minHeight: '46px', justifyContent: 'center' }}
            >
              <Sparkles size={16} />
              {upscaling ? 'Running Multi-Stage Super-Resolution & BT.709 Mastering...' : 'Remaster & Upscale Video ($0.00)'}
            </button>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="mono caption-3" style={{ color: 'var(--accent)' }}>REMASTERED OUTPUT & BEFORE/AFTER TELEMETRY</div>
            {upscaling ? (
              <div style={{ padding: '56px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <DotGridLoader />
                <span className="caption-4">Applying HQDN3D denoise + Lanczos + FidelityFX CAS + Deband...</span>
              </div>
            ) : upscaleOut ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <video
                  key={upscaleOut.url}
                  src={`${baseHost}${upscaleOut.url}`}
                  controls
                  autoPlay
                  loop
                  style={{ width: '100%', maxHeight: '420px', borderRadius: '12px', background: '#000', border: '1px solid var(--border)' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="camera-card" style={{ padding: '10px 12px' }}>
                    <div className="mono caption-4">BEFORE</div>
                    <div className="title-4" style={{ color: 'var(--text)' }}>{upscaleOut.before?.width}x{upscaleOut.before?.height} • {upscaleOut.before?.fps}fps</div>
                    <div className="caption-4">{upscaleOut.before?.bitrate_kbps} kb/s</div>
                  </div>
                  <div className="camera-card active" style={{ padding: '10px 12px' }}>
                    <div className="mono caption-4" style={{ color: 'var(--accent)' }}>AFTER ({upscaleOut.render_seconds}s)</div>
                    <div className="title-4" style={{ color: 'var(--text)' }}>{upscaleOut.after?.width}x{upscaleOut.after?.height} • {upscaleOut.after?.fps}fps</div>
                    <div className="caption-4">{upscaleOut.after?.bitrate_kbps} kb/s • BT.709</div>
                  </div>
                </div>
                <a href={`${baseHost}${upscaleOut.url}`} download={upscaleOut.filename} className="volt-btn" style={{ alignSelf: 'flex-start', padding: '8px 14px', fontSize: '12px', textDecoration: 'none' }}>
                  <Download size={14} /> Download Mastered MP4
                </a>
              </div>
            ) : (
              <div style={{ padding: '56px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Select any rendered clip or upload a raw video to upgrade resolution, sharpness, optical halation & 60fps fluidity.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REAL VIDEO DIFFUSION & 4K FOOTAGE PROVIDER KEYS + MODEL HUB */}
      {subTab === 'models' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 className="title-3" style={{ color: 'var(--text)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={18} color="var(--accent)" /> Connect Real Moving 4K Video & AI Video Diffusion Providers
              </h3>
              <p className="body-5" style={{ margin: '6px 0 0' }}>
                Saved locally in SQLite (never sent anywhere else). Adding a <strong>FREE Pexels or Pixabay key</strong> instantly switches renders from still photos to real moving 4K cinema video footage. Adding a <strong>fal.ai / Replicate key</strong> activates real Seedance Pro, Kling 2.1, Wan 2.1 & MiniMax Hailuo generative video diffusion!
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              <div>
                <label style={lblStyle}>Pexels 4K Moving Video API Key (100% FREE — pexels.com/api)</label>
                <input type="password" className="studio-input" value={pexelsKey} onChange={(e) => setPexelsKey(e.target.value)} placeholder="Paste free Pexels API key..." />
              </div>
              <div>
                <label style={lblStyle}>Pixabay HD/4K Moving Video API Key (100% FREE — pixabay.com/api)</label>
                <input type="password" className="studio-input" value={pixabayKey} onChange={(e) => setPixabayKey(e.target.value)} placeholder="Paste free Pixabay API key..." />
              </div>
              <div>
                <label style={lblStyle}>HuggingFace Token for FLUX.1-schnell (FREE Tier — huggingface.co)</label>
                <input type="password" className="studio-input" value={hfToken} onChange={(e) => setHfToken(e.target.value)} placeholder="hf_..." />
              </div>
              <div>
                <label style={lblStyle}>fal.ai API Key (Real Seedance Pro / Kling 2.1 / Wan 2.1 / MiniMax)</label>
                <input type="password" className="studio-input" value={falKey} onChange={(e) => setFalKey(e.target.value)} placeholder="Paste fal.ai key..." />
              </div>
              <div>
                <label style={lblStyle}>Replicate API Token (Real Kling / MiniMax Video-01 / Wan 2.1)</label>
                <input type="password" className="studio-input" value={repToken} onChange={(e) => setRepToken(e.target.value)} placeholder="r8_..." />
              </div>
              <div>
                <label style={lblStyle}>Google Gemini API Key (Imagen 3 Studio Photography)</label>
                <input type="password" className="studio-input" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIza..." />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" disabled={savingKeys} onClick={saveProviderKeys} className="volt-btn" style={{ padding: '10px 22px', fontSize: '13px' }}>
                <CheckCircle2 size={15} /> {savingKeys ? 'Saving...' : 'Save & Activate Real Video Providers'}
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 className="title-3" style={{ color: 'var(--text)', fontWeight: 700, margin: 0 }}>
              Live Model Routing Matrix
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {caps?.models &&
                Object.entries(caps.models).map(([cat, list]: [string, any]) => (
                  <div key={cat} className="camera-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="mono caption-3" style={{ color: 'var(--accent)', textTransform: 'uppercase' }}>{cat}</div>
                    {list.map((m: any) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          if (cat === 'video') setSelectedVideoModel(m.id);
                          onNotify('success', `Selected route: ${m.name}`);
                        }}
                        style={{
                          textAlign: 'left',
                          background: m.status === 'ACTIVE' ? 'rgba(217,255,0,0.08)' : 'rgba(255,255,255,0.02)',
                          border: m.status === 'ACTIVE' ? '1px solid rgba(217,255,0,0.4)' : '1px solid var(--border)',
                          borderRadius: '10px',
                          padding: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                          <span className="caption-3" style={{ color: 'var(--text)', fontSize: '12px' }}>{m.name}</span>
                          <span className="mono" style={{ fontSize: '10px', color: m.status === 'ACTIVE' ? 'var(--accent)' : '#F59E0B' }}>
                            {m.status}
                          </span>
                        </div>
                        <div className="caption-4" style={{ fontSize: '11px', marginTop: '3px' }}>{m.spec}</div>
                      </button>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
