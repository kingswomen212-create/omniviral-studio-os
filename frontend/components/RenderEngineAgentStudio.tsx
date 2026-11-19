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
  { id: 'ad_filmmaking', name: 'Ad Filmmaking', tag: '24FPS LUXURY', desc: 'Golden-hour brand campaign with optical halation & editorial typography.' },
  { id: 'performance_marketing', name: 'Performance Marketing', tag: 'HIGH-ROAS', desc: 'Crisp high-contrast commercial pacing built for Meta, TikTok & YouTube Ads.' },
  { id: 'filmmaking', name: 'Theatrical Filmmaking', tag: 'ANAMORPHIC', desc: 'Kodak 2383 24fps film cadence, subtle grain & cinema letterbox bars.' },
  { id: 'micro_drama', name: 'Micro-Drama Series', tag: 'MOODY A24', desc: 'Atmospheric vertical drama with sculpted shadows & deep cinematic tone.' },
  { id: 'ai_ugc', name: 'AI UGC & Creator', tag: '30FPS REAL', desc: 'Daylight editorial portrait pacing tailored for UGC & product trial rooms.' },
  { id: 'ai_vfx', name: 'AI VFX & Sci-Fi', tag: '60FPS NEON', desc: 'High-frame-rate neon split-tone VFX spectacle with FidelityFX CAS 0.65.' },
  { id: 'pre_viz', name: 'Director Pre-Viz', tag: 'STORYBOARD', desc: 'Rapid production design & 3x3 continuity contact sheet + animatic.' },
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
  const [brief, setBrief] = useState('Luxury botanical fragrance launch bathed in golden hour sunlight with dew-kissed glass bottle');
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

  // Agent Two Result
  const [rendering, setRendering] = useState(false);
  const [agentOut, setAgentOut] = useState<any>(null);

  // Pro Super-Resolution Upscaler Controls
  const [upscaleSource, setUpscaleSource] = useState('');
  const [upscaleProfile, setUpscaleProfile] = useState('cas_2x');
  const [upscaling, setUpscaling] = useState(false);
  const [upscaleOut, setUpscaleOut] = useState<any>(null);

  useEffect(() => {
    fetch(`${apiBase}/engine/capabilities`)
      .then((r) => r.json())
      .then((d) => setCaps(d))
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
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Agent Two render failed');
      setAgentOut(d);
      onMediaCreated(d);
      onNotify('success', `Agent Two mastered ${d.filename} (QA ${d.qa_report?.grade || 'A'} • ${d.render_seconds}s)`);
    } catch (err: any) {
      onNotify('error', err.message || 'Agent Two production failed');
    } finally {
      setRendering(false);
    }
  };

  const handleUploadVideo = async (file: File) => {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Engine Telemetry & Navigation Header */}
      <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h2 className="heading-5" style={{ color: 'var(--text)', margin: 0 }}>
                Cinema Render Engine v10.0 & Agent Two Director
              </h2>
              <span className="mono caption-3" style={{ background: 'var(--accent)', color: 'var(--on-accent)', padding: '3px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Cpu size={12} /> GPU HARDWARE + FIDELITYFX CAS + BT.709
              </span>
            </div>
            <p className="body-5" style={{ margin: 0, maxWidth: '820px' }}>
              Multi-agent cinema orchestration (Context, Casting, 3x3 Continuity Storyboard, Parallel GPU Render, Self-Review QA), ByteDance/Topaz-class CAS Super-Resolution, Optical Film Halation & 48kHz broadcast audio at $0.00.
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
              <Layers size={14} /> Model Hub
            </button>
          </div>
        </div>

        {/* Live Hardware Telemetry Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '12px', paddingTop: '14px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
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
            <div className="mono caption-4">COLOR & AUDIO SPEC</div>
            <div className="title-4" style={{ color: 'var(--text)', marginTop: '2px' }}>
              BT.709 FastStart • 48kHz -14 LUFS
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
            {benchLoading ? 'Benchmarking...' : 'Run 1080p Benchmark'}
          </button>
        </div>

        {benchRes && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', paddingTop: '10px' }}>
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
                <Film size={14} /> 01 / PRODUCTION USE CASE (INVIDEO AGENT TWO WORKFLOWS)
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

            {/* Brief & Cinema Mastering Specs */}
            <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="mono caption-3" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} /> 02 / CREATIVE BRIEF, CINEMA GRADE & GPU ENCODER
              </div>

              <div>
                <label style={lblStyle}>Director Creative Brief (Context & Continuity Prompt)</label>
                <textarea
                  className="studio-input"
                  rows={3}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Describe your brand campaign, product hero, micro-drama plot, or film vision..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={lblStyle}>Brand / Studio Name</label>
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
                    <option value="editorial">Editorial Minimalist Luxury (Clean Center)</option>
                    <option value="volt_lime">Volt Lime Word-by-Word Viral</option>
                    <option value="hormozi">Hormozi Gold Pop</option>
                    <option value="none">Clean Film (No Captions)</option>
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
                {rendering ? 'Running 5-Agent Parallel Cinema Render Pipeline...' : 'Launch Agent Two Multi-Agent Production ($0.00)'}
              </button>
            </div>
          </div>

          {/* RIGHT: 5-Agent Trace, 3x3 Storyboard Sheet, Mastered Video & Self-Review QA */}
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
                  Orchestrating Context → Casting → 3x3 Continuity Storyboard → Parallel GPU Render ({fps}fps BT.709) → Self-Review QA...
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

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a href={`${baseHost}${agentOut.url}`} download={agentOut.filename} className="volt-btn" style={{ padding: '8px 14px', fontSize: '12px', textDecoration: 'none' }}>
                    <Download size={14} /> Download Master MP4
                  </a>
                  {agentOut.storyboard_url && (
                    <a href={`${baseHost}${agentOut.storyboard_url}`} download={agentOut.storyboard_filename} className="pill-btn" style={{ padding: '8px 14px', fontSize: '12px', textDecoration: 'none', color: 'var(--text)' }}>
                      <Download size={14} /> Download 3x3 Storyboard
                    </a>
                  )}
                </div>

                {/* 3x3 Continuity Storyboard Sheet Preview */}
                {agentOut.storyboard_url && (
                  <div>
                    <div className="mono caption-4" style={{ marginBottom: '6px' }}>SHOT-TO-SHOT CONTINUITY STORYBOARD</div>
                    <img
                      src={`${baseHost}${agentOut.storyboard_url}`}
                      alt="Continuity Storyboard Contact Sheet"
                      style={{ width: '100%', borderRadius: '10px', border: '1px solid var(--border)' }}
                    />
                  </div>
                )}

                {/* 5-Agent Pipeline Trace */}
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

                {/* Self-Review QA Checks */}
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
                <div className="title-4" style={{ color: 'var(--text)' }}>Ready for Multi-Agent Cinema Production</div>
                <span className="caption-4" style={{ maxWidth: '340px' }}>
                  Click Launch to execute all 5 agents in parallel, build a 3x3 continuity storyboard sheet, render with GPU + Halation + CAS + BT.709, and run automated Self-Review QA.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TOPAZ / BYTEDANCE-CLASS PRO SUPER-RESOLUTION UPSCALER */}
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
                <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleUploadVideo(e.target.files[0])} />
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

      {/* TAB 3: MODEL ROUTING HUB (INVIDEO-CLASS MULTI-MODEL MATRIX) */}
      {subTab === 'models' && (
        <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <h3 className="title-3" style={{ color: 'var(--text)', fontWeight: 700, margin: 0 }}>
              Multi-Model Routing Matrix ($0.00 Local GPU Active + BYOK Ready)
            </h3>
            <p className="body-5" style={{ margin: '4px 0 0' }}>
              All pipelines execute locally at $0.00/render by default using OmniViral Cinema v10, Openverse HD + Pillow 2x SSAA, Edge-TTS 318 Voices, and FidelityFX CAS Super-Resolution — with seamless pluggable BYOK slots.
            </p>
          </div>

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
                        onNotify('success', `Selected ${m.name} (${m.cost})`);
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
                        <span className="mono" style={{ fontSize: '10px', color: m.status === 'ACTIVE' ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {m.cost}
                        </span>
                      </div>
                      <div className="caption-4" style={{ fontSize: '11px', marginTop: '3px' }}>{m.spec}</div>
                    </button>
                  ))}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
