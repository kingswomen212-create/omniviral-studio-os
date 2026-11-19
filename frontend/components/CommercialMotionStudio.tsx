import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  Download,
  Layers,
  Wand2,
  Upload,
  CheckCircle2,
  Sliders,
  Film,
  Tag,
  MapPin,
  Search,
  Star,
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
  onMediaCreated: (item: any) => void;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

const PRESETS = [
  {
    id: 'product_offer_showcase',
    name: 'Product & Offer Showcase',
    tag: 'GOOGLE ADS 9:16',
    desc: 'Floating 3D hero + dynamic breathing ground shadow, spring offer pills (SALE, 25% OFF, 5 Stars), Map UI & AI Sparkle.',
    theme_id: 'studio_white',
    aspect_ratio: '9:16',
    accent_hex: '#2563EB',
    brand_name: 'OmniViral Ads',
    headline_1: 'Convert more',
    highlight_1: 'holiday shoppers',
    headline_2: 'Stand out with',
    highlight_2: 'your best offers',
    cta_line1: 'Put Studio AI',
    cta_line2: 'to work for you',
    pills: ['SALE', '25% OFF', 'Next day delivery', 'PRICE DROP'],
    search_query: 'Running shoes',
    shop_name: 'Velocity Store',
  },
  {
    id: 'ai_realtime_ui_ad',
    name: 'AI Real-Time UI & Map',
    tag: 'SQUARE 1:1',
    desc: 'Sliding product carousel, orbital channel ring, live typing Search bar, cursor click ripple, Vector Map pin & circular avatar.',
    theme_id: 'studio_white',
    aspect_ratio: '1:1',
    accent_hex: '#3B82F6',
    brand_name: 'OmniViral AI',
    headline_1: 'help you',
    highlight_1: 'find more',
    headline_2: 'valuable',
    highlight_2: 'customers',
    cta_line1: 'Put Studio AI',
    cta_line2: 'to work for you',
    pills: ['LIVE NOW', 'AI POWERED', 'Instant reach', 'TOP RATED'],
    search_query: 'Indoor plants',
    shop_name: 'Plant Shop',
  },
  {
    id: 'saas_kinetic_launch',
    name: 'SaaS Keynote Launch',
    tag: 'OLED 16:9',
    desc: 'Dark OLED cinema canvas with electric volt typography, interactive typing UI card, pointer click & sparkle finale.',
    theme_id: 'oled_volt',
    aspect_ratio: '16:9',
    accent_hex: '#D9FF00',
    brand_name: 'OmniViral OS',
    headline_1: 'Ship faster with',
    highlight_1: 'autonomous AI',
    headline_2: 'Zero-cost',
    highlight_2: '60fps studio',
    cta_line1: 'Launch your studio',
    cta_line2: 'in 60 seconds',
    pills: ['v9.0 LIVE', '60FPS PRO', 'Zero render cost', '4K READY'],
    search_query: 'AI video studio',
    shop_name: 'OmniViral Cloud',
  },
  {
    id: 'ecommerce_flash_drop',
    name: 'E-Commerce Flash Drop',
    tag: 'HIGH-ROAS',
    desc: 'Warm luxury editorial drop with bouncing discount tags, 5-star proof, levitating gift hero & express checkout CTA.',
    theme_id: 'warm_editorial',
    aspect_ratio: '9:16',
    accent_hex: '#EA580C',
    brand_name: 'Aura Goods',
    headline_1: 'Limited season',
    highlight_1: 'flash collection',
    headline_2: 'Unlock today',
    highlight_2: 'exclusive drop',
    cta_line1: 'Claim 40% off',
    cta_line2: 'before midnight',
    pills: ['FLASH DROP', '40% OFF', 'Free express ship', 'LIMITED'],
    search_query: 'Luxury ceramics',
    shop_name: 'Aura Flagship',
  },
];

const THEMES: Record<
  string,
  { name: string; bg: string; surface: string; border: string; ink: string; muted: string; mapBg: string; park: string; water: string }
> = {
  studio_white: {
    name: 'Studio White',
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    border: '#E4E8F0',
    ink: '#12141A',
    muted: '#5F6676',
    mapBg: '#ECF0F6',
    park: '#C5EBCC',
    water: '#CBE0FC',
  },
  oled_volt: {
    name: 'OLED Volt',
    bg: '#07080C',
    surface: '#161924',
    border: '#373E52',
    ink: '#F6F7FB',
    muted: '#9CA3B8',
    mapBg: '#1A1E2C',
    park: '#1C4234',
    water: '#183056',
  },
  midnight_cobalt: {
    name: 'Midnight Cobalt',
    bg: '#0A1022',
    surface: '#17213E',
    border: '#405C94',
    ink: '#F4F8FF',
    muted: '#98ACD0',
    mapBg: '#14203E',
    park: '#164A48',
    water: '#123870',
  },
  warm_editorial: {
    name: 'Warm Editorial',
    bg: '#FAF7F2',
    surface: '#FFFFFF',
    border: '#E4DCD0',
    ink: '#1A1714',
    muted: '#6E665C',
    mapBg: '#F2ECE2',
    park: '#CEE6C6',
    water: '#C6DEF4',
  },
};

function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function easeOutCubic(t: number) {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}
function easeOutBack(t: number, s = 1.65) {
  const c = clamp01(t);
  return 1 + (s + 1) * Math.pow(c - 1, 3) + s * Math.pow(c - 1, 2);
}
function contrastInk(hex: string) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2) || '25', 16);
  const g = parseInt(h.slice(2, 4) || '63', 16);
  const b = parseInt(h.slice(4, 6) || 'EB', 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 158 ? '#0F1117' : '#FFFFFF';
}

export const CommercialMotionStudio: React.FC<Props> = ({
  apiBase,
  savedVideos,
  onMediaCreated,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<'commercial' | 'overlay'>('commercial');

  // Commercial Motion Config
  const [preset, setPreset] = useState(PRESETS[0].id);
  const [themeId, setThemeId] = useState(PRESETS[0].theme_id);
  const [aspectRatio, setAspectRatio] = useState(PRESETS[0].aspect_ratio);
  const [fps, setFps] = useState<number>(60);
  const [accentHex, setAccentHex] = useState(PRESETS[0].accent_hex);
  const [brandName, setBrandName] = useState(PRESETS[0].brand_name);
  const [headline1, setHeadline1] = useState(PRESETS[0].headline_1);
  const [highlight1, setHighlight1] = useState(PRESETS[0].highlight_1);
  const [headline2, setHeadline2] = useState(PRESETS[0].headline_2);
  const [highlight2, setHighlight2] = useState(PRESETS[0].highlight_2);
  const [cta1, setCta1] = useState(PRESETS[0].cta_line1);
  const [cta2, setCta2] = useState(PRESETS[0].cta_line2);
  const [pills, setPills] = useState<string[]>(PRESETS[0].pills);
  const [searchQuery, setSearchQuery] = useState(PRESETS[0].search_query);
  const [shopName, setShopName] = useState(PRESETS[0].shop_name);
  const [voiceScript, setVoiceScript] = useState('');
  const [productFilename, setProductFilename] = useState<string | null>(null);
  const [avatarFilename, setAvatarFilename] = useState<string | null>(null);

  // Live Preview Controls
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [previewTime, setPreviewTime] = useState(0);
  const timeRef = useRef(0);

  // Render State
  const [rendering, setRendering] = useState(false);
  const [renderedVideo, setRenderedVideo] = useState<any>(null);

  // Overlay Enhancer State
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [ovTopPill, setOvTopPill] = useState('LIMITED OFFER');
  const [ovOfferPill, setOvOfferPill] = useState('25% OFF');
  const [ovBrandTag, setOvBrandTag] = useState('OmniViral Studio');
  const [ovShowStars, setOvShowStars] = useState(true);
  const [badgePngUrl, setBadgePngUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSource && savedVideos.length > 0) {
      setSelectedSource(savedVideos[0].filename);
    }
  }, [savedVideos, selectedSource]);

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setPreset(p.id);
    setThemeId(p.theme_id);
    setAspectRatio(p.aspect_ratio);
    setAccentHex(p.accent_hex);
    setBrandName(p.brand_name);
    setHeadline1(p.headline_1);
    setHighlight1(p.highlight_1);
    setHeadline2(p.headline_2);
    setHighlight2(p.highlight_2);
    setCta1(p.cta_line1);
    setCta2(p.cta_line2);
    setPills([...p.pills]);
    setSearchQuery(p.search_query);
    setShopName(p.shop_name);
    setRenderedVideo(null);
    timeRef.current = 0;
  };

  // ==================== REAL-TIME 60FPS HTML5 CANVAS LIVE PREVIEW ====================
  useEffect(() => {
    if (subTab !== 'commercial' || renderedVideo) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let lastTs = performance.now();

    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    };

    const drawPill = (
      cx: number,
      cy: number,
      label: string,
      filled: boolean,
      scale: number,
      tiltDeg: number,
      stars = false
    ) => {
      if (scale <= 0.04) return;
      const th = THEMES[themeId] || THEMES.studio_white;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((tiltDeg * Math.PI) / 180);
      ctx.scale(scale, scale);

      ctx.font = '700 13px system-ui, -apple-system, sans-serif';
      const tw = stars ? 74 : ctx.measureText(label).width;
      const pw = tw + 30;
      const ph = 32;

      ctx.shadowColor = 'rgba(10, 14, 24, 0.22)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      drawRoundRect(-pw / 2, -ph / 2, pw, ph, ph / 2);
      ctx.fillStyle = filled ? accentHex : th.surface;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      if (!filled) {
        ctx.strokeStyle = th.border;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (stars) {
        ctx.fillStyle = '#F5B00F';
        ctx.font = '700 13px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★ ★ ★ ★ ★', 0, 1);
      } else {
        ctx.fillStyle = filled ? contrastInk(accentHex) : th.ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 0.5);
      }
      ctx.restore();
    };

    const drawSparkle = (cx: number, cy: number, r: number, rot: number, hollow = false) => {
      if (r < 2) return;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const px = Math.pow(Math.abs(ca), 2.5) * Math.sign(ca) * r;
        const py = Math.pow(Math.abs(sa), 2.5) * Math.sign(sa) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (hollow) {
        ctx.strokeStyle = accentHex;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.fillStyle = accentHex;
        ctx.fill();
      }
      ctx.restore();
    };

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      if (isPlaying && !prefersReduced) {
        timeRef.current = (timeRef.current + dt) % 12.0;
        setPreviewTime(timeRef.current);
      }

      const t = timeRef.current;
      const th = THEMES[themeId] || THEMES.studio_white;
      const W = cv.width;
      const H = cv.height;
      const unit = Math.min(W, H);
      const isUi = preset === 'ai_realtime_ui_ad' || preset === 'saas_kinetic_launch';

      ctx.fillStyle = th.bg;
      ctx.fillRect(0, 0, W, H);

      const drawHeadline = (l1: string, l2: string, y: number, lt: number, accentFirst = false, typeMode = false) => {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fz = Math.round(unit * 0.075);
        ctx.font = `800 ${fz}px system-ui, -apple-system, sans-serif`;
        const ep = easeOutCubic(lt / 0.45);
        const yOff = typeMode ? 0 : (1 - ep) * 14;
        ctx.globalAlpha = typeMode ? 1 : clamp01(lt / 0.3);

        const s1 = typeMode ? l1.slice(0, Math.floor(clamp01(lt / 0.65) * l1.length)) : l1;
        const s2 = typeMode ? l2.slice(0, Math.floor(clamp01((lt - 0.55) / 0.7) * l2.length)) : l2;

        ctx.fillStyle = accentFirst ? accentHex : th.ink;
        ctx.fillText(s1, W / 2, y - fz * 0.55 + yOff);
        ctx.fillStyle = accentFirst ? th.ink : accentHex;
        ctx.fillText(s2, W / 2, y + fz * 0.58 + yOff);
        ctx.restore();
      };

      // BEAT 1 (0 - 3.2s)
      if (t < 3.2) {
        const lt = t;
        const fade = 1 - easeOutCubic((lt - 2.75) / 0.45);
        ctx.save();
        ctx.globalAlpha = fade;

        if (isUi) {
          const slide = -36 + easeOutCubic(lt / 2.8) * 72;
          for (let i = 0; i < 3; i++) {
            const cx = W / 2 + (i - 1) * (unit * 0.34) + slide;
            const cy = H * 0.21;
            const cw = unit * 0.28;
            const ch = unit * 0.25;
            ctx.save();
            ctx.shadowColor = 'rgba(10,14,24,0.16)';
            ctx.shadowBlur = 16;
            ctx.shadowOffsetY = 8;
            drawRoundRect(cx - cw / 2, cy - ch / 2, cw, ch, 14);
            ctx.fillStyle = th.surface;
            ctx.fill();
            ctx.strokeStyle = th.border;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
            drawSparkle(cx, cy, 14, i * 0.5, false);
          }

          drawHeadline(headline1, highlight1, H * 0.49, lt);

          const orbR = unit * 0.38;
          const orbY = H * 0.92;
          ctx.beginPath();
          ctx.arc(W / 2, orbY, orbR, Math.PI * 1.1, Math.PI * 1.9);
          ctx.strokeStyle = th.border;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(W / 2, orbY, orbR, Math.PI * 1.12, Math.PI * (1.12 + 0.28 * easeOutCubic(lt / 1.2)));
          ctx.strokeStyle = '#FBBC05';
          ctx.lineWidth = 3.5;
          ctx.stroke();

          const a1 = Math.PI * (1.24 + lt * 0.05);
          const a2 = Math.PI * (1.76 - lt * 0.04);
          [
            { a: a1, c: '#2563EB', ch: 'G' },
            { a: a2, c: '#EF4444', ch: '▶' },
          ].forEach((n) => {
            const nx = W / 2 + Math.cos(n.a) * orbR;
            const ny = orbY + Math.sin(n.a) * orbR;
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(nx, ny, 18, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.restore();
            ctx.fillStyle = n.c;
            ctx.font = '800 13px system-ui';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(n.ch, nx, ny + 0.5);
          });
        } else {
          drawHeadline(headline1, highlight1, H * 0.22, lt);
          drawPill(W / 2, H * 0.36 + Math.sin(lt * 3.5) * 4, pills[1] || '25% OFF', false, easeOutBack((lt - 0.3) / 0.45), 0);

          const hover = Math.sin(lt * 3.2) * 10;
          const sc = easeOutBack(lt / 0.6, 1.3);
          const shScale = (1 - (hover / 10) * 0.14) * clamp01(sc);
          ctx.save();
          ctx.fillStyle = 'rgba(10, 14, 24, 0.22)';
          ctx.beginPath();
          ctx.ellipse(W / 2, H * 0.72, unit * 0.17 * shScale, unit * 0.028 * shScale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.translate(W / 2, H * 0.58 + hover);
          ctx.scale(sc, sc);
          const bw = unit * 0.26;
          const bh = unit * 0.19;
          ctx.fillStyle = themeId === 'oled_volt' ? '#1E293B' : '#1E7D45';
          ctx.fillRect(-bw / 2, -bh / 2, bw / 2, bh);
          ctx.fillStyle = themeId === 'oled_volt' ? '#334155' : '#269454';
          ctx.fillRect(0, -bh / 2, bw / 2, bh);
          ctx.fillStyle = themeId === 'oled_volt' ? '#475569' : '#2CA65F';
          ctx.fillRect(-bw * 0.54, -bh * 0.65, bw * 1.08, bh * 0.28);
          ctx.fillStyle = themeId === 'oled_volt' ? accentHex : '#D92626';
          ctx.fillRect(-bw * 0.12, -bh * 0.65, bw * 0.24, bh * 1.15);
          ctx.beginPath();
          ctx.ellipse(-bw * 0.16, -bh * 0.74, bw * 0.16, bh * 0.14, -0.25, 0, Math.PI * 2);
          ctx.ellipse(bw * 0.16, -bh * 0.74, bw * 0.16, bh * 0.14, 0.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
      // BEAT 2 (3.2 - 6.5s)
      else if (t < 6.5) {
        const lt = t - 3.2;
        const fade = 1 - easeOutCubic((lt - 2.85) / 0.45);
        ctx.save();
        ctx.globalAlpha = fade;

        if (isUi) {
          drawHeadline(headline2, highlight2, H * 0.23, lt, true);
          const sw = unit * 0.68;
          const sh = 38;
          const sx = W / 2 - sw / 2;
          const sy = H * 0.40;
          ctx.save();
          ctx.shadowColor = 'rgba(10,14,24,0.16)';
          ctx.shadowBlur = 16;
          drawRoundRect(sx, sy, sw, sh, sh / 2);
          ctx.fillStyle = th.surface;
          ctx.fill();
          ctx.strokeStyle = th.border;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();

          const typed = searchQuery.slice(0, Math.floor(clamp01((lt - 0.2) / 1.0) * searchQuery.length));
          const caret = Math.floor(lt * 3) % 2 === 0 && lt < 1.8 ? '|' : '';
          ctx.fillStyle = th.ink;
          ctx.font = '500 13px system-ui';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`⌕  ${typed}${caret}`, sx + 16, sy + sh / 2);

          const aw = unit * 0.66;
          const ah = 84;
          const ax = W / 2 - aw / 2;
          const ay = H * 0.53;
          ctx.save();
          ctx.shadowColor = 'rgba(10,14,24,0.16)';
          ctx.shadowBlur = 18;
          drawRoundRect(ax, ay, aw, ah, 14);
          ctx.fillStyle = th.surface;
          ctx.fill();
          ctx.strokeStyle = th.border;
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = '#16A34A';
          drawRoundRect(ax + 14, ay + 14, 26, 16, 4);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 10px system-ui';
          ctx.fillText('Ad', ax + 20, ay + 22);
          ctx.fillStyle = accentHex;
          ctx.font = '700 13px system-ui';
          ctx.fillText(shopName, ax + 48, ay + 22);
          ctx.fillStyle = th.border;
          drawRoundRect(ax + 14, ay + 42, aw * 0.58, 8, 4);
          ctx.fill();
          drawRoundRect(ax + 14, ay + 58, aw * 0.42, 8, 4);
          ctx.fill();

          const avSc = easeOutBack((lt - 0.8) / 0.45);
          if (avSc > 0.05) {
            ctx.save();
            ctx.translate(ax + aw - 8, ay + ah / 2);
            ctx.scale(avSc, avSc);
            ctx.shadowColor = 'rgba(0,0,0,0.22)';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(0, 0, 28, 0, Math.PI * 2);
            ctx.fillStyle = accentHex;
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
            ctx.restore();
          }

          const cp = easeOutCubic((lt - 1.0) / 0.72);
          const cxCur = W * 0.78 + (ax + aw * 0.44 - W * 0.78) * cp;
          const cyCur = H * 0.80 + (ay + ah * 0.5 - H * 0.80) * cp;
          const clickT = lt - 1.75;
          if (clickT > 0) {
            const rp = clamp01(clickT / 0.55);
            ctx.beginPath();
            ctx.arc(cxCur, cyCur, 6 + rp * 28, 0, Math.PI * 2);
            ctx.strokeStyle = accentHex;
            ctx.globalAlpha = (1 - rp) * fade;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.globalAlpha = fade;
          }
          if (lt > 0.95) {
            ctx.beginPath();
            ctx.moveTo(cxCur, cyCur);
            ctx.lineTo(cxCur, cyCur + 20);
            ctx.lineTo(cxCur + 6, cyCur + 15);
            ctx.lineTo(cxCur + 14, cyCur + 15);
            ctx.closePath();
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = '#111318';
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
        } else {
          drawHeadline(headline2, highlight2, H * 0.47, lt);
          const layout = [
            { txt: pills[0] || 'SALE', x: W * 0.25, y: H * 0.34, fill: true, d: 0.2, tilt: -4, stars: false },
            { txt: pills[2] || 'Next day delivery', x: W * 0.70, y: H * 0.33, fill: false, d: 0.4, tilt: 2.5, stars: false },
            { txt: pills[1] || '25% OFF', x: W * 0.76, y: H * 0.51, fill: true, d: 0.6, tilt: -2.5, stars: false },
            { txt: pills[3] || 'PRICE DROP', x: W * 0.28, y: H * 0.61, fill: false, d: 0.8, tilt: 3, stars: false },
            { txt: '', x: W * 0.70, y: H * 0.61, fill: false, d: 1.0, tilt: -2, stars: true },
          ];
          layout.forEach((b) => {
            drawPill(
              b.x,
              b.y + Math.sin((lt + b.d * 3) * 3.2) * 3.5,
              b.txt,
              b.fill,
              easeOutBack((lt - b.d) / 0.4, 1.8),
              b.tilt,
              b.stars
            );
          });
        }
        ctx.restore();
      }
      // BEAT 3 (6.5 - 9.5s)
      else if (t < 9.5) {
        const lt = t - 6.5;
        const fade = 1 - easeOutCubic((lt - 2.55) / 0.45);
        ctx.save();
        ctx.globalAlpha = fade;
        drawHeadline('in', 'real time', H * 0.20, lt);

        const mw = unit * 0.58;
        const mh = unit * 0.56;
        const mx = W / 2 - mw / 2;
        const my = H * 0.54 - mh / 2;
        const msc = easeOutBack(lt / 0.5, 1.2);

        ctx.save();
        ctx.translate(W / 2, H * 0.54);
        ctx.scale(msc, msc);
        ctx.shadowColor = 'rgba(10,14,24,0.22)';
        ctx.shadowBlur = 22;
        drawRoundRect(-mw / 2, -mh / 2, mw, mh, 18);
        ctx.fillStyle = th.mapBg;
        ctx.fill();
        ctx.clip();
        ctx.shadowBlur = 0;

        ctx.fillStyle = th.park;
        ctx.fillRect(-mw / 2, -mh / 2, mw * 0.5, mh * 0.5);
        ctx.fillStyle = th.water;
        ctx.fillRect(mw * 0.15, -mh / 2, mw * 0.4, mh * 0.4);
        ctx.strokeStyle = th.surface;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(-mw / 2, -mh * 0.12);
        ctx.lineTo(mw / 2, -mh * 0.3);
        ctx.moveTo(-mw * 0.2, -mh / 2);
        ctx.lineTo(mw * 0.15, mh * 0.4);
        ctx.stroke();

        drawRoundRect(-mw * 0.42, -mh * 0.42, mw * 0.84, 26, 13);
        ctx.fillStyle = th.surface;
        ctx.fill();
        ctx.fillStyle = th.ink;
        ctx.font = '600 10px system-ui';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`⌕  ${searchQuery}`, -mw * 0.34, -mh * 0.42 + 13);

        ctx.fillStyle = th.surface;
        ctx.fillRect(-mw / 2, mh * 0.14, mw, mh * 0.4);
        ctx.fillStyle = accentHex;
        ctx.font = '700 12px system-ui';
        ctx.fillText(shopName, -mw * 0.4, mh * 0.26);

        const pinBounce = Math.abs(Math.sin(lt * 4.5)) * 7 * Math.exp(-lt * 0.7);
        ctx.fillStyle = '#EA4335';
        ctx.beginPath();
        ctx.arc(0, -mh * 0.08 - pinBounce, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-8, -mh * 0.08 - pinBounce + 5);
        ctx.lineTo(8, -mh * 0.08 - pinBounce + 5);
        ctx.lineTo(0, -mh * 0.08 - pinBounce + 19);
        ctx.fill();
        ctx.fillStyle = '#8C1616';
        ctx.beginPath();
        ctx.arc(0, -mh * 0.08 - pinBounce, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const avSc = easeOutBack((lt - 0.5) / 0.45);
        if (avSc > 0.05) {
          ctx.save();
          ctx.translate(mx + mw + 2, my + mh * 0.68);
          ctx.scale(avSc, avSc);
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.fillStyle = accentHex;
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }
      // BEAT 4 (9.5 - 12.0s)
      else {
        const lt = t - 9.5;
        const spR = unit * 0.09 * easeOutBack(lt / 0.5, 1.6) * (1 + 0.06 * Math.sin(lt * 5));
        const rot = easeOutCubic(lt / 0.8) * (Math.PI / 2) + lt * 0.25;
        drawSparkle(W / 2, H * 0.34, spR, rot, true);
        drawSparkle(W / 2, H * 0.34, spR * 0.42, -rot, false);
        drawHeadline(cta1, cta2, H * 0.54, lt, false, true);
        drawPill(W / 2, H * 0.72, `✦ Try ${brandName}`, true, easeOutBack((lt - 0.8) / 0.45), 0);
      }

      if (brandName.trim()) {
        ctx.fillStyle = th.ink;
        ctx.font = '700 14px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.85;
        ctx.fillText(`✦ ${brandName}`, W / 2, H * 0.91);
        ctx.globalAlpha = 1;
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [
    subTab,
    renderedVideo,
    isPlaying,
    preset,
    themeId,
    aspectRatio,
    accentHex,
    brandName,
    headline1,
    highlight1,
    headline2,
    highlight2,
    cta1,
    cta2,
    pills,
    searchQuery,
    shopName,
  ]);

  const handleAssetUpload = async (file: File, kind: 'product' | 'avatar') => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch(`${apiBase}/motion/upload-asset`, { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Upload failed');
      if (kind === 'product') setProductFilename(data.filename);
      else setAvatarFilename(data.filename);
      onNotify('success', `Uploaded ${kind} image: ${file.name}`);
    } catch (err: any) {
      onNotify('error', err.message || 'Asset upload failed');
    }
  };

  const handleRenderCommercial = async () => {
    setRendering(true);
    setRenderedVideo(null);
    try {
      const r = await fetch(`${apiBase}/motion/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset,
          theme_id: themeId,
          aspect_ratio: aspectRatio,
          fps,
          brand_name: brandName,
          accent_hex: accentHex,
          headline_1: headline1,
          highlight_1: highlight1,
          headline_2: headline2,
          highlight_2: highlight2,
          cta_line1: cta1,
          cta_line2: cta2,
          pills,
          search_query: searchQuery,
          shop_name: shopName,
          product_image_filename: productFilename,
          avatar_image_filename: avatarFilename,
          voiceover_script: voiceScript || null,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Render failed');
      setRenderedVideo(data);
      onMediaCreated(data);
      onNotify('success', `Rendered ${fps}fps Commercial Motion Ad (${data.filename})`);
    } catch (err: any) {
      onNotify('error', err.message || 'Commercial Motion render failed');
    } finally {
      setRendering(false);
    }
  };

  const handleApplyOverlay = async () => {
    if (!selectedSource) {
      onNotify('error', 'Select a video from your library first');
      return;
    }
    setRendering(true);
    setRenderedVideo(null);
    try {
      const r = await fetch(`${apiBase}/motion/apply-overlay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_filename: selectedSource,
          top_pill: ovTopPill,
          offer_pill: ovOfferPill,
          brand_tag: ovBrandTag,
          accent_hex: accentHex,
          theme_id: themeId,
          show_stars: ovShowStars,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Overlay failed');
      setRenderedVideo(data);
      onMediaCreated(data);
      onNotify('success', 'Stamped studio floating pills & graphics onto video');
    } catch (err: any) {
      onNotify('error', err.message || 'Overlay render failed');
    } finally {
      setRendering(false);
    }
  };

  const handleExportBadgePng = async () => {
    try {
      const r = await fetch(`${apiBase}/motion/badge-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ovOfferPill || '25% OFF',
          accent_hex: accentHex,
          theme_id: themeId,
          icon: 'tag',
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Badge export failed');
      setBadgePngUrl(`${apiBase.replace('/api', '')}${data.url}`);
      onNotify('success', 'Generated transparent studio pill PNG');
    } catch (err: any) {
      onNotify('error', err.message || 'Badge export failed');
    }
  };

  const canvasDims =
    aspectRatio === '1:1'
      ? { w: 420, h: 420 }
      : aspectRatio === '16:9'
      ? { w: 480, h: 270 }
      : { w: 300, h: 530 };

  const currentBeat = previewTime < 3.2 ? 1 : previewTime < 6.5 ? 2 : previewTime < 9.5 ? 3 : 4;

  const lblStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginBottom: '6px',
    letterSpacing: '0.04em',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Panel */}
      <div
        className="glass-panel"
        style={{
          padding: '22px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <h2 className="heading-5" style={{ color: 'var(--text)', margin: 0 }}>
              Commercial Motion & Graphic Effects Studio
            </h2>
            <span
              className="mono caption-3"
              style={{
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                padding: '3px 10px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Sparkles size={12} /> v9.0 • 60FPS VECTOR ENGINE
            </span>
          </div>
          <p className="body-5" style={{ margin: 0, maxWidth: '760px' }}>
            Google & Apple commercial-grade 60fps spring typography, floating shadowed pill badges, dynamic ground shadows, typing Search/Map UI cards, circular avatars & morphing 4-point AI Sparkle at $0.00.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSubTab('commercial')}
            className={`pill-btn ${subTab === 'commercial' ? 'active' : ''}`}
            style={{ padding: '10px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
          >
            <Film size={15} /> 60fps Commercial Ad Builder
          </button>
          <button
            type="button"
            onClick={() => setSubTab('overlay')}
            className={`pill-btn ${subTab === 'overlay' ? 'active' : ''}`}
            style={{ padding: '10px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
          >
            <Layers size={15} /> Stamp Graphics onto Video
          </button>
        </div>
      </div>

      {subTab === 'commercial' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(360px, 0.95fr)', gap: '20px', alignItems: 'start' }}>
          {/* LEFT COLUMN: Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Flagship Presets */}
            <div className="glass-panel" style={{ padding: '18px' }}>
              <div className="mono caption-3" style={{ color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wand2 size={14} /> 01 / COMMERCIAL STYLE PRESET
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`camera-card ${preset === p.id ? 'active' : ''}`}
                    style={{ padding: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%' }}>
                      <span className="title-4" style={{ color: 'var(--text)', fontWeight: 600 }}>{p.name}</span>
                      <span className="mono" style={{ fontSize: '10px', color: 'var(--accent)', background: 'rgba(217,255,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        {p.tag}
                      </span>
                    </div>
                    <span className="caption-4" style={{ lineHeight: 1.4 }}>{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Theme, Format & Accent */}
            <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="mono caption-3" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} /> 02 / CANVAS THEME, ASPECT RATIO & FRAME RATE
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {Object.entries(THEMES).map(([tid, t]) => (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => setThemeId(tid)}
                    className={`camera-card ${themeId === tid ? 'active' : ''}`}
                    style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: t.bg, border: '1px solid var(--border)', flexShrink: 0 }} />
                    <span className="caption-3" style={{ color: 'var(--text)', fontSize: '12px' }}>{t.name}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="mono" style={lblStyle}>ASPECT RATIO</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {['9:16', '1:1', '16:9'].map((ar) => (
                      <button
                        key={ar}
                        type="button"
                        onClick={() => setAspectRatio(ar)}
                        className={`pill-btn ${aspectRatio === ar ? 'active' : ''}`}
                        style={{ padding: '8px 4px', fontSize: '12px', justifyContent: 'center' }}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mono" style={lblStyle}>FRAME RATE</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {[60, 30].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setFps(rate)}
                        className={`pill-btn ${fps === rate ? 'active' : ''}`}
                        style={{ padding: '8px 4px', fontSize: '12px', justifyContent: 'center' }}
                      >
                        {rate}fps
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mono" style={lblStyle}>BRAND ACCENT</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={accentHex}
                      onChange={(e) => setAccentHex(e.target.value)}
                      style={{ width: '42px', height: '36px', border: '1px solid var(--border)', borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}
                    />
                    <input
                      className="studio-input mono"
                      value={accentHex}
                      onChange={(e) => setAccentHex(e.target.value)}
                      style={{ fontSize: '12px', padding: '8px 10px' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Headlines, Floating Pills & UI Cards */}
            <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="mono caption-3" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={14} /> 03 / KINETIC HEADLINES, FLOATING OFFER PILLS & UI CARDS
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={lblStyle}>Brand Footer Lockup</label>
                  <input className="studio-input" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
                </div>
                <div>
                  <label style={lblStyle}>Beat 1 Headline (Ink)</label>
                  <input className="studio-input" value={headline1} onChange={(e) => setHeadline1(e.target.value)} />
                </div>
                <div>
                  <label style={lblStyle}>Beat 1 Highlight Phrase (Accent)</label>
                  <input className="studio-input" value={highlight1} onChange={(e) => setHighlight1(e.target.value)} />
                </div>
                <div>
                  <label style={lblStyle}>Beat 2 Headline</label>
                  <input className="studio-input" value={headline2} onChange={(e) => setHeadline2(e.target.value)} />
                </div>
                <div>
                  <label style={lblStyle}>Beat 2 Highlight Phrase</label>
                  <input className="studio-input" value={highlight2} onChange={(e) => setHighlight2(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={lblStyle}>Sparkle CTA Line 1</label>
                    <input className="studio-input" value={cta1} onChange={(e) => setCta1(e.target.value)} />
                  </div>
                  <div>
                    <label style={lblStyle}>Sparkle CTA Line 2</label>
                    <input className="studio-input" value={cta2} onChange={(e) => setCta2(e.target.value)} />
                  </div>
                </div>
              </div>

              <div>
                <label className="mono" style={lblStyle}>4 FLOATING OFFER & MICRO-UI PILL BADGES</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {pills.map((val, idx) => (
                    <input
                      key={idx}
                      className="studio-input"
                      value={val}
                      onChange={(e) => {
                        const next = [...pills];
                        next[idx] = e.target.value;
                        setPills(next);
                      }}
                      style={{ fontSize: '12px', padding: '8px 10px' }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ ...lblStyle, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Search size={12} color="var(--accent)" /> Typing Search Query & Carousel Topic
                  </label>
                  <input className="studio-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div>
                  <label style={{ ...lblStyle, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={12} color="var(--accent)" /> Vector Map Pin Business / Ad Title
                  </label>
                  <input className="studio-input" value={shopName} onChange={(e) => setShopName(e.target.value)} />
                </div>
              </div>

              {/* Optional Uploads */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label className="camera-card" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <Upload size={14} color="var(--accent)" />
                  <span className="caption-3" style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {productFilename ? `Product: ${productFilename}` : 'Optional: Upload Product PNG/JPG'}
                  </span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleAssetUpload(e.target.files[0], 'product')} />
                </label>

                <label className="camera-card" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <Upload size={14} color="var(--accent)" />
                  <span className="caption-3" style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {avatarFilename ? `Avatar: ${avatarFilename}` : 'Optional: Upload Portrait Avatar'}
                  </span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleAssetUpload(e.target.files[0], 'avatar')} />
                </label>
              </div>

              <div>
                <label style={lblStyle}>Optional AI Neural Voiceover Script (leave blank for commercial beat + UI pop/click foley)</label>
                <input
                  className="studio-input"
                  value={voiceScript}
                  onChange={(e) => setVoiceScript(e.target.value)}
                  placeholder="e.g. Convert more shoppers in real time with studio-grade AI motion campaigns..."
                />
              </div>

              <button
                type="button"
                disabled={rendering}
                onClick={handleRenderCommercial}
                className="volt-btn"
                style={{ width: '100%', minHeight: '48px', fontSize: '14px', justifyContent: 'center' }}
              >
                <Sparkles size={16} />
                {rendering ? `Rendering ${fps}fps Vector Motion MP4...` : `Render Real ${fps}fps Commercial MP4 ($0.00)`}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Live 60fps Canvas Preview OR Rendered Final MP4 */}
          <div className="glass-panel" style={{ padding: '18px', position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span className="mono caption-3" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <span className="live-dot" />
                {renderedVideo ? 'FINAL RENDERED MP4' : 'LIVE 60FPS MOTION PREVIEW'}
              </span>
              {renderedVideo ? (
                <button
                  type="button"
                  onClick={() => setRenderedVideo(null)}
                  className="pill-btn"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Back to Live Preview
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="pill-btn"
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
              )}
            </div>

            {rendering ? (
              <div style={{ padding: '64px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                <DotGridLoader />
                <div className="mono caption-4">
                  Compositing 2x supersampled sprites, Gaussian shadows, spring physics & synchronized UI foley at {fps}fps...
                </div>
              </div>
            ) : renderedVideo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <video
                  key={renderedVideo.url}
                  src={`${apiBase.replace('/api', '')}${renderedVideo.url}`}
                  controls
                  autoPlay
                  loop
                  style={{ width: '100%', maxHeight: '540px', borderRadius: '12px', background: '#000', border: '1px solid var(--border)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span className="mono caption-4">{renderedVideo.filename} • {renderedVideo.fps || fps}fps</span>
                  <a
                    href={`${apiBase.replace('/api', '')}${renderedVideo.url}`}
                    download={renderedVideo.filename}
                    className="volt-btn"
                    style={{ padding: '8px 14px', fontSize: '12px', textDecoration: 'none' }}
                  >
                    <Download size={14} /> Download MP4
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div style={{ background: '#050507', borderRadius: '14px', padding: '14px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
                  <canvas
                    ref={canvasRef}
                    width={canvasDims.w}
                    height={canvasDims.h}
                    style={{ maxWidth: '100%', height: 'auto', borderRadius: '12px', boxShadow: '0 20px 44px rgba(0,0,0,0.65)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { b: 1, t: 0.2, label: '1. Hero' },
                    { b: 2, t: 3.4, label: '2. Offers/UI' },
                    { b: 3, t: 6.7, label: '3. Map Pin' },
                    { b: 4, t: 9.7, label: '4. Sparkle' },
                  ].map((item) => (
                    <button
                      key={item.b}
                      type="button"
                      onClick={() => {
                        timeRef.current = item.t;
                        setPreviewTime(item.t);
                      }}
                      className={`pill-btn ${currentBeat === item.b ? 'active' : ''}`}
                      style={{ padding: '7px 4px', fontSize: '11px', justifyContent: 'center' }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: STAMP STUDIO FLOATING GRAPHICS ONTO ANY SAVED VIDEO */
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(340px, 1fr)', gap: '20px', alignItems: 'start' }}>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="title-3" style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              <Layers size={18} color="var(--accent)" /> Studio Vector Graphic Overlay Enhancer
            </div>
            <p className="body-5" style={{ margin: 0 }}>
              Stamp anti-aliased rounded floating pill badges, soft Gaussian shadows, 5-star social proof & verified brand lockup onto any existing MP4 in your library.
            </p>

            <div>
              <label className="mono" style={lblStyle}>SELECT VIDEO FROM SAVED LIBRARY</label>
              <select
                className="studio-input"
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
              >
                {savedVideos.length === 0 ? (
                  <option value="">No saved videos yet — render one first!</option>
                ) : (
                  savedVideos.map((v) => (
                    <option key={v.id} value={v.filename}>
                      {v.title} ({v.filename})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div>
                <label style={lblStyle}>Top Hook Pill</label>
                <input className="studio-input" value={ovTopPill} onChange={(e) => setOvTopPill(e.target.value)} />
              </div>
              <div>
                <label style={lblStyle}>Floating Offer Pill</label>
                <input className="studio-input" value={ovOfferPill} onChange={(e) => setOvOfferPill(e.target.value)} />
              </div>
              <div>
                <label style={lblStyle}>Bottom Brand Pill</label>
                <input className="studio-input" value={ovBrandTag} onChange={(e) => setOvBrandTag(e.target.value)} />
              </div>
            </div>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
              <input type="checkbox" checked={ovShowStars} onChange={(e) => setOvShowStars(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
              <Star size={14} color="#F5B00F" /> Include Floating 5-Star Rating Proof Pill
            </label>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
              <button
                type="button"
                disabled={rendering || !selectedSource}
                onClick={handleApplyOverlay}
                className="volt-btn"
                style={{ flex: 1, minHeight: '44px', justifyContent: 'center' }}
              >
                {rendering ? 'Compositing Vector Pills...' : 'Composite Studio Overlays onto Video'}
              </button>
              <button
                type="button"
                onClick={handleExportBadgePng}
                className="pill-btn"
                style={{ padding: '0 16px', minHeight: '44px', color: 'var(--text)' }}
              >
                Export Standalone Pill PNG
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="mono caption-3" style={{ color: 'var(--accent)' }}>OUTPUT PREVIEW</div>
            {rendering ? (
              <div style={{ padding: '48px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <DotGridLoader />
                <span className="caption-4">Stamping shadowed studio pills onto MP4...</span>
              </div>
            ) : renderedVideo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <video
                  key={renderedVideo.url}
                  src={`${apiBase.replace('/api', '')}${renderedVideo.url}`}
                  controls
                  autoPlay
                  loop
                  style={{ width: '100%', maxHeight: '440px', borderRadius: '12px', background: '#000', border: '1px solid var(--border)' }}
                />
                <a
                  href={`${apiBase.replace('/api', '')}${renderedVideo.url}`}
                  download={renderedVideo.filename}
                  className="volt-btn"
                  style={{ alignSelf: 'flex-start', padding: '8px 14px', fontSize: '12px', textDecoration: 'none' }}
                >
                  <Download size={14} /> Download Enhanced MP4
                </a>
              </div>
            ) : badgePngUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '100%', padding: '28px', borderRadius: '12px', border: '1px solid var(--border)', background: '#11131b', display: 'flex', justifyContent: 'center' }}>
                  <img src={badgePngUrl} alt="Studio Pill Badge" style={{ maxHeight: '140px', objectFit: 'contain' }} />
                </div>
                <a
                  href={badgePngUrl}
                  download="studio_pill_badge.png"
                  className="volt-btn"
                  style={{ padding: '8px 14px', fontSize: '12px', textDecoration: 'none' }}
                >
                  <Download size={14} /> Download Transparent PNG
                </a>
              </div>
            ) : (
              <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={28} color="var(--accent)" />
                <span className="caption-4">Select a saved video or export a standalone transparent floating pill PNG.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
