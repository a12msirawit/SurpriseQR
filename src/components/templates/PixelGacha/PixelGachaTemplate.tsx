"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Coins,
  Crown,
  Heart,
  Image as ImageIcon,
  Lock,
  Mail,
  Music,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { SurpriseQRData } from "@/types/templates";
import { isYouTubeUrl, extractYouTubeId } from "@/lib/audio-helper";

export interface PixelGachaTemplateProps {
  config?: Partial<SurpriseQRData>;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

type GachaStage = "machine" | "crack" | "reveal" | "album" | "secret";

interface GachaCapsuleItem {
  id: string;
  kind: "wish" | "photo" | "secret";
  rarity: "SR" | "SSR" | "SECRET";
  label: string;
  title: string;
  body?: string;
  photoSrc?: string;
  photoIdx?: number;
  capTop: string;
  capBottom: string;
  accent: string;
}

const PIXEL_BORDER =
  "shadow-[0_0_0_3px_#240d38,0_6px_0_3px_#140721]";

const PIXEL_BTN_SHADOW =
  "shadow-[0_0_0_3px_#240d38,0_5px_0_0_#240d38] active:translate-y-[3px] active:shadow-[0_0_0_3px_#240d38,0_2px_0_0_#240d38]";

const RARITY_THEME: Record<
  "SR" | "SSR" | "SECRET",
  {
    frameBg: string;
    glow: string;
    badgeCls: string;
    innerBg: string;
    sheenBg: string;
    photoRing: string;
  }
> = {
  SR: {
    frameBg: "linear-gradient(135deg, #f472b6, #e879f9, #fbcfe8, #c084fc, #f472b6)",
    glow: "0 0 22px rgba(244,114,182,0.52), 0 0 0 3px #240d38, 0 6px 0 3px #140721",
    badgeCls: "bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 text-[#240d38]",
    innerBg: "from-[#35134f] via-[#270e3e] to-[#1a082b]",
    sheenBg: "linear-gradient(115deg, transparent 25%, rgba(249,168,212,0.38) 50%, transparent 75%)",
    photoRing: "border-pink-300/75",
  },
  SSR: {
    frameBg: "linear-gradient(135deg, #fde047, #f59e0b, #fffbeb, #fb923c, #fde047)",
    glow: "0 0 28px rgba(251,191,36,0.62), 0 0 0 3px #240d38, 0 6px 0 3px #140721",
    badgeCls: "bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 text-[#240d38]",
    innerBg: "from-[#3d2316] via-[#2a1533] to-[#190a28]",
    sheenBg: "linear-gradient(115deg, transparent 20%, rgba(254,240,138,0.48) 50%, transparent 80%)",
    photoRing: "border-amber-300/90",
  },
  SECRET: {
    frameBg:
      "linear-gradient(135deg, #ff7eb6, #fde047, #67e8f9, #a78bfa, #f472b6, #fde047)",
    glow: "0 0 30px rgba(244,114,182,0.6), 0 0 46px rgba(103,232,249,0.42), 0 0 0 3px #240d38, 0 6px 0 3px #140721",
    badgeCls: "bg-gradient-to-r from-pink-300 via-amber-200 to-cyan-300 text-[#240d38]",
    innerBg: "from-[#34144c] via-[#1c1a49] to-[#2c103b]",
    sheenBg:
      "linear-gradient(115deg, transparent 15%, rgba(255,126,182,0.34) 38%, rgba(253,224,71,0.4) 50%, rgba(103,232,249,0.36) 62%, transparent 85%)",
    photoRing: "border-cyan-200/90",
  },
};

const BG_HEARTS = [
  { left: "6%", size: 16, dur: 17, delay: -2, color: "#ff7eb6" },
  { left: "16%", size: 12, dur: 22, delay: -7, color: "#c084fc" },
  { left: "28%", size: 18, dur: 19, delay: -12, color: "#fb7185" },
  { left: "41%", size: 14, dur: 24, delay: -4, color: "#fde047" },
  { left: "55%", size: 16, dur: 20, delay: -15, color: "#ff7eb6" },
  { left: "69%", size: 13, dur: 21, delay: -8, color: "#67e8f9" },
  { left: "81%", size: 17, dur: 18, delay: -3, color: "#f472b6" },
  { left: "92%", size: 14, dur: 23, delay: -11, color: "#c084fc" },
];

const DOME_CAPSULES = [
  { x: 18, y: 122, top: "#ff7eb6", bot: "#fff1f2", rot: -12 },
  { x: 64, y: 126, top: "#60a5fa", bot: "#eff6ff", rot: 14 },
  { x: 112, y: 124, top: "#fbbf24", bot: "#fefce8", rot: -8 },
  { x: 158, y: 120, top: "#c084fc", bot: "#faf5ff", rot: 18 },
  { x: 38, y: 84, top: "#34d399", bot: "#ecfdf5", rot: 8 },
  { x: 88, y: 86, top: "#fb7185", bot: "#fff1f2", rot: -16 },
  { x: 138, y: 84, top: "#38bdf8", bot: "#f0f9ff", rot: 10 },
  { x: 64, y: 48, top: "#f472b6", bot: "#fdf2f8", rot: -6 },
  { x: 114, y: 48, top: "#fde047", bot: "#fefce8", rot: 12 },
];

/** Crisp 8-bit Pixel Heart SVG */
function PixelHeartSvg({ className = "h-4 w-4", color = "#ff7eb6" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 12 11" className={className} style={{ imageRendering: "pixelated" }} aria-hidden="true">
      <path
        d="M2 0h3v1h2V0h3v1h1v1h1v3h-1v1h-1v1H9v1H8v1H7v1H5V9H4V8H3V7H2V6H1V5H0V2h1V1h1V0z"
        fill={color}
      />
      <rect x="2" y="2" width="1" height="1" fill="#ffffff" fillOpacity="0.8" />
    </svg>
  );
}

/** Crisp 8-bit Pixel Star SVG */
function PixelStarSvg({ className = "h-4 w-4", color = "#fde047" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 9 9" className={className} style={{ imageRendering: "pixelated" }} aria-hidden="true">
      <rect x="4" y="0" width="1" height="9" fill={color} />
      <rect x="0" y="4" width="9" height="1" fill={color} />
      <rect x="3" y="3" width="3" height="3" fill="#ffffff" />
    </svg>
  );
}

/** Crisp 8-bit Pixel Capsule Sprite */
function PixelCapsuleSvg({
  top,
  bottom,
  className = "h-12 w-12",
}: {
  top: string;
  bottom: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={{ imageRendering: "pixelated" }} aria-hidden="true">
      <rect x="4" y="1" width="8" height="1" fill="#240d38" />
      <rect x="2" y="2" width="2" height="1" fill="#240d38" />
      <rect x="12" y="2" width="2" height="1" fill="#240d38" />
      <rect x="1" y="3" width="1" height="10" fill="#240d38" />
      <rect x="14" y="3" width="1" height="10" fill="#240d38" />
      <rect x="2" y="13" width="2" height="1" fill="#240d38" />
      <rect x="12" y="13" width="2" height="1" fill="#240d38" />
      <rect x="4" y="14" width="8" height="1" fill="#240d38" />
      {/* Top half */}
      <rect x="4" y="2" width="8" height="5" fill={top} />
      <rect x="2" y="3" width="12" height="4" fill={top} />
      {/* Shine */}
      <rect x="4" y="3" width="2" height="2" fill="#ffffff" fillOpacity="0.7" />
      {/* Center band */}
      <rect x="2" y="7" width="12" height="2" fill="#240d38" />
      <rect x="7" y="7" width="2" height="2" fill="#fde047" />
      {/* Bottom half */}
      <rect x="2" y="9" width="12" height="4" fill={bottom} />
      <rect x="4" y="13" width="8" height="1" fill={bottom} />
    </svg>
  );
}

/** Top half of pixel capsule (flush seam at y=8 for seamless closed state) */
function PixelCapsuleTopSvg({ top, className = "h-20 w-40" }: { top: string; className?: string }) {
  return (
    <svg viewBox="0 0 16 8" className={`block ${className}`} style={{ imageRendering: "pixelated" }} aria-hidden="true">
      <rect x="4" y="1" width="8" height="1" fill="#240d38" />
      <rect x="2" y="2" width="2" height="1" fill="#240d38" />
      <rect x="12" y="2" width="2" height="1" fill="#240d38" />
      <rect x="1" y="3" width="1" height="5" fill="#240d38" />
      <rect x="14" y="3" width="1" height="5" fill="#240d38" />
      <rect x="4" y="2" width="8" height="5" fill={top} />
      <rect x="2" y="3" width="12" height="4" fill={top} />
      <rect x="4" y="3" width="2" height="2" fill="#ffffff" fillOpacity="0.75" />
      <rect x="1" y="7" width="14" height="1" fill="#240d38" />
      <rect x="7" y="7" width="2" height="1" fill="#fde047" />
    </svg>
  );
}

/** Bottom half of pixel capsule (flush seam at y=0 for seamless closed state) */
function PixelCapsuleBottomSvg({ bottom, className = "h-20 w-40" }: { bottom: string; className?: string }) {
  return (
    <svg viewBox="0 0 16 8" className={`block ${className}`} style={{ imageRendering: "pixelated" }} aria-hidden="true">
      <rect x="1" y="0" width="14" height="1" fill="#240d38" />
      <rect x="7" y="0" width="2" height="1" fill="#fde047" />
      <rect x="1" y="1" width="1" height="4" fill="#240d38" />
      <rect x="14" y="1" width="1" height="4" fill="#240d38" />
      <rect x="2" y="1" width="12" height="4" fill={bottom} />
      <rect x="4" y="5" width="8" height="1" fill={bottom} />
      <rect x="2" y="5" width="2" height="1" fill="#240d38" />
      <rect x="12" y="5" width="2" height="1" fill="#240d38" />
      <rect x="4" y="6" width="8" height="1" fill="#240d38" />
    </svg>
  );
}

// 8-bit Chiptune SFX helpers
function play8BitTone(
  notes: Array<{ freq: number; dur: number; delay: number; type?: OscillatorType; vol?: number }>
) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    notes.forEach(({ freq, dur, delay, type = "square", vol = 0.06 }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    });
  } catch {
    // ignore Web Audio restrictions
  }
}

function playCoinSfx() {
  play8BitTone([
    { freq: 987.77, dur: 0.09, delay: 0, type: "square", vol: 0.07 },
    { freq: 1318.51, dur: 0.28, delay: 0.08, type: "square", vol: 0.07 },
  ]);
}

function playCrankSfx() {
  play8BitTone([
    { freq: 260, dur: 0.05, delay: 0, type: "triangle", vol: 0.08 },
    { freq: 310, dur: 0.05, delay: 0.12, type: "triangle", vol: 0.08 },
    { freq: 370, dur: 0.05, delay: 0.24, type: "triangle", vol: 0.08 },
    { freq: 440, dur: 0.06, delay: 0.36, type: "triangle", vol: 0.08 },
  ]);
}

function playDropSfx() {
  play8BitTone([
    { freq: 520, dur: 0.08, delay: 0, type: "sine", vol: 0.09 },
    { freq: 340, dur: 0.09, delay: 0.08, type: "sine", vol: 0.08 },
    { freq: 420, dur: 0.1, delay: 0.18, type: "sine", vol: 0.07 },
  ]);
}

function playChargeTickSfx(step: number) {
  const scale = [392, 440, 493.88, 554.37, 622.25, 698.46, 783.99, 880];
  const freq = scale[Math.min(step, scale.length - 1)];
  play8BitTone([{ freq, dur: 0.07, delay: 0, type: "square", vol: 0.05 }]);
}

function playCrackSfx(step: 1 | 2 | 3) {
  if (step === 1) {
    play8BitTone([
      { freq: 330, dur: 0.07, delay: 0, type: "square", vol: 0.07 },
      { freq: 440, dur: 0.09, delay: 0.05, type: "triangle", vol: 0.06 },
    ]);
  } else if (step === 2) {
    play8BitTone([
      { freq: 493.88, dur: 0.07, delay: 0, type: "square", vol: 0.07 },
      { freq: 659.25, dur: 0.09, delay: 0.05, type: "square", vol: 0.07 },
      { freq: 880, dur: 0.14, delay: 0.1, type: "triangle", vol: 0.07 },
    ]);
  } else {
    play8BitTone([
      { freq: 783.99, dur: 0.08, delay: 0, type: "square", vol: 0.08 },
      { freq: 1046.5, dur: 0.1, delay: 0.06, type: "square", vol: 0.08 },
      { freq: 1567.98, dur: 0.25, delay: 0.12, type: "triangle", vol: 0.09 },
    ]);
  }
}

function playRevealSfx(rarity: "SR" | "SSR" | "SECRET") {
  if (rarity === "SECRET") {
    play8BitTone([
      { freq: 523.25, dur: 0.11, delay: 0, type: "square", vol: 0.06 },
      { freq: 659.25, dur: 0.11, delay: 0.09, type: "square", vol: 0.06 },
      { freq: 783.99, dur: 0.11, delay: 0.18, type: "square", vol: 0.06 },
      { freq: 1046.5, dur: 0.14, delay: 0.27, type: "square", vol: 0.07 },
      { freq: 1318.51, dur: 0.38, delay: 0.38, type: "triangle", vol: 0.08 },
    ]);
  } else {
    play8BitTone([
      { freq: 587.33, dur: 0.1, delay: 0, type: "square", vol: 0.05 },
      { freq: 783.99, dur: 0.1, delay: 0.09, type: "square", vol: 0.05 },
      { freq: 1174.66, dur: 0.26, delay: 0.18, type: "triangle", vol: 0.07 },
    ]);
  }
}

async function burstPixelConfetti(isSecret = false) {
  try {
    const { default: confetti } = await import("canvas-confetti");
    confetti({
      particleCount: isSecret ? 95 : 55,
      spread: isSecret ? 90 : 68,
      origin: { y: 0.55 },
      colors: ["#ff7eb6", "#fde047", "#67e8f9", "#c084fc", "#ffffff"],
      shapes: ["square"],
      scalar: 1.05,
    });
  } catch {
    // ignore confetti error
  }
}

export default function PixelGachaTemplate({
  config,
  studio = false,
  activeScreen,
  onSelectField,
}: PixelGachaTemplateProps) {
  const content = config?.content;

  const machineTitle = content?.title || "MEMORY GACHA";
  const recipientSubtitle = content?.menu?.subTitle || "สำหรับคนพิเศษของฉัน";
  const wishTitle = content?.menu?.card1Title || "คำอธิษฐานถึงเธอ";
  const wishBody =
    content?.menu?.card1Desc ||
    "ขอให้ทุกวันของเธอเต็มไปด้วยรอยยิ้ม เรื่องราวดีๆ และความสุขแบบนี้ตลอดไปนะ";
  const albumTitle = content?.memories?.sectionTitle || "สมุดสะสมความทรงจำ";
  const albumDesc =
    content?.memories?.description || "เปิดแคปซูลให้ครบเพื่อปลดล็อกการ์ดลับระดับ SECRET";
  const songTitle = content?.songMedia?.songTitle || "8-Bit Love Melody";
  const musicSrc = content?.bgMusic?.src || content?.songMedia?.audioSrc || "";
  const letterTitle = content?.letter?.title || "จดหมายลับระดับ SECRET";
  const letterParagraphs =
    content?.letter?.paragraphs && content.letter.paragraphs.length > 0
      ? content.letter.paragraphs
      : [
          "ขอบคุณที่หมุนตู้กาชาจนครบทุกใบนะ ทุกความทรงจำที่เราผ่านมามีความหมายกับฉันมากจริงๆ",
          "ไม่ว่าจะกี่ปีผ่านไป อยากให้รู้ว่าเธอคือการ์ดที่แรร์ที่สุดในชีวิตของฉันเสมอ",
        ];
  const finaleMain = content?.finale?.mainText || "YOU ARE MY SSR!";
  const finaleSub = content?.finale?.subText || "เก็บไว้เป็นความทรงจำดีๆ ตลอดไปนะ";

  // Build ordered capsule pool: 1 SR Wish -> N SSR Photos -> 1 SECRET Letter
  const capsules = useMemo<GachaCapsuleItem[]>(() => {
    const list: GachaCapsuleItem[] = [
      {
        id: "wish-sr",
        kind: "wish",
        rarity: "SR",
        label: "คำอวยพรพิเศษ",
        title: wishTitle,
        body: wishBody,
        capTop: "#ff7eb6",
        capBottom: "#fff1f2",
        accent: "#f472b6",
      },
    ];
    const photoColors = [
      { top: "#60a5fa", bot: "#eff6ff", accent: "#38bdf8" },
      { top: "#c084fc", bot: "#faf5ff", accent: "#a855f7" },
      { top: "#34d399", bot: "#ecfdf5", accent: "#10b981" },
      { top: "#fb7185", bot: "#fff1f2", accent: "#f43f5e" },
    ];
    const rawPhotos = (content?.memories?.polaroidImages ?? [])
      .map((item, idx) => ({ src: item?.src?.trim() || "", idx }))
      .filter((p) => Boolean(p.src))
      .slice(0, 4);

    rawPhotos.forEach((p, i) => {
      const pal = photoColors[i % photoColors.length];
      list.push({
        id: `photo-${p.idx}`,
        kind: "photo",
        rarity: "SSR",
        label: `ความทรงจำ #${i + 1}`,
        title: `Memory Card #0${i + 1}`,
        photoSrc: p.src,
        photoIdx: p.idx,
        capTop: pal.top,
        capBottom: pal.bot,
        accent: pal.accent,
      });
    });

    list.push({
      id: "secret-letter",
      kind: "secret",
      rarity: "SECRET",
      label: "จดหมายลับ",
      title: letterTitle,
      body: letterParagraphs[0],
      capTop: "#fde047",
      capBottom: "#fffbeb",
      accent: "#f59e0b",
    });

    return list;
  }, [wishTitle, wishBody, content?.memories?.polaroidImages, letterTitle, letterParagraphs]);

  const [stage, setStage] = useState<GachaStage>("machine");
  const [albumOpen, setAlbumOpen] = useState(false);
  const [collectedIds, setCollectedIds] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [chargePct, setChargePct] = useState(0);
  const [crankAngle, setCrankAngle] = useState(0);
  const [droppedItem, setDroppedItem] = useState<GachaCapsuleItem | null>(null);
  const [crackingItem, setCrackingItem] = useState<GachaCapsuleItem | null>(null);
  const [crackStep, setCrackStep] = useState<0 | 1 | 2 | 3>(0);
  const [activeReveal, setActiveReveal] = useState<GachaCapsuleItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);
  const lastChargeTickRef = useRef<number>(-1);

  const isYtMusic = Boolean(musicSrc && isYouTubeUrl(musicSrc));
  const ytVideoId = isYtMusic ? extractYouTubeId(musicSrc) : null;

  // Sync Studio activeScreen -> stage
  useEffect(() => {
    if (!studio || activeScreen === undefined) return;
    if (activeScreen === 1) {
      setStage("machine");
    } else if (activeScreen === 2) {
      setActiveReveal(capsules[0] ?? null);
      setStage("reveal");
    } else if (activeScreen === 3) {
      setCollectedIds(capsules.map((c) => c.id));
      setStage("album");
    } else if (activeScreen >= 4) {
      setStage("secret");
    }
  }, [studio, activeScreen, capsules]);

  // 8-bit chiptune BGM fallback
  const stopSynthBgm = useCallback(() => {
    if (synthTimerRef.current) {
      window.clearInterval(synthTimerRef.current);
      synthTimerRef.current = null;
    }
  }, []);

  const startSynthBgm = useCallback(() => {
    stopSynthBgm();
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const melody = [523.25, 659.25, 783.99, 1046.5, 880, 783.99, 659.25, 587.33];
      let step = 0;
      const tick = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = melody[step % melody.length];
        step += 1;
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.055, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      };
      tick();
      synthTimerRef.current = window.setInterval(tick, 460);
    } catch {
      // ignore
    }
  }, [stopSynthBgm]);

  useEffect(() => {
    return () => {
      stopSynthBgm();
      if (audioRef.current) audioRef.current.pause();
    };
  }, [stopSynthBgm]);

  const startMusic = useCallback(() => {
    setIsPlaying(true);
    if (isYtMusic) {
      stopSynthBgm();
      return;
    }
    if (musicSrc) {
      stopSynthBgm();
      if (audioRef.current) {
        audioRef.current.src = musicSrc;
        audioRef.current.volume = 0.48;
        void audioRef.current.play().catch(() => {});
      }
      return;
    }
    startSynthBgm();
  }, [isYtMusic, musicSrc, startSynthBgm, stopSynthBgm]);

  const toggleMusic = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      stopSynthBgm();
      if (audioRef.current) audioRef.current.pause();
    } else {
      startMusic();
    }
  }, [isPlaying, startMusic, stopSynthBgm]);

  const remainingCapsules = useMemo(
    () => capsules.filter((c) => !collectedIds.includes(c.id)),
    [capsules, collectedIds]
  );

  const cancelHoldRaf = useCallback(() => {
    if (holdRafRef.current !== null) {
      window.cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
  }, []);

  useEffect(() => cancelHoldRaf, [cancelHoldRaf]);

  const finishSpinDrop = useCallback(() => {
    if (remainingCapsules.length === 0) {
      setStage("secret");
      return;
    }
    const nextItem = remainingCapsules[0];
    setSpinning(true);
    setIsHolding(false);
    playCoinSfx();
    playCrankSfx();
    setCrankAngle((a) => a + 360);
    window.setTimeout(() => {
      playDropSfx();
      setDroppedItem(nextItem);
      setSpinning(false);
      setChargePct(0);
    }, 520);
  }, [remainingCapsules]);

  const handleStartHold = useCallback(
    (e?: React.PointerEvent) => {
      if (e) e.preventDefault();
      if (spinning || droppedItem) return;
      if (remainingCapsules.length === 0) {
        setStage("secret");
        return;
      }
      if (!isPlaying) startMusic();
      cancelHoldRaf();
      setIsHolding(true);
      holdStartRef.current = performance.now();
      lastChargeTickRef.current = -1;
      const HOLD_DURATION_MS = 1650;

      const stepFrame = (now: number) => {
        const elapsed = now - holdStartRef.current;
        const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
        setChargePct(pct);
        const tickIdx = Math.floor(pct / 13);
        if (tickIdx > lastChargeTickRef.current) {
          lastChargeTickRef.current = tickIdx;
          playChargeTickSfx(tickIdx);
        }
        if (pct >= 100) {
          holdRafRef.current = null;
          finishSpinDrop();
          return;
        }
        holdRafRef.current = window.requestAnimationFrame(stepFrame);
      };
      holdRafRef.current = window.requestAnimationFrame(stepFrame);
    },
    [spinning, droppedItem, remainingCapsules.length, isPlaying, startMusic, cancelHoldRaf, finishSpinDrop]
  );

  const handleStopHold = useCallback(() => {
    if (!isHolding) return;
    cancelHoldRaf();
    setIsHolding(false);
    setChargePct(0);
  }, [isHolding, cancelHoldRaf]);

  const handleOpenDropped = useCallback(() => {
    if (!droppedItem) return;
    const item = droppedItem;
    setDroppedItem(null);
    setCrackingItem(item);
    setCrackStep(0);
    playCoinSfx();
    setStage("crack");
  }, [droppedItem]);

  const handleTapCrack = useCallback(() => {
    if (!crackingItem || crackStep >= 3) return;
    const nextStep = (crackStep + 1) as 1 | 2 | 3;
    setCrackStep(nextStep);
    playCrackSfx(nextStep);

    if (nextStep === 3) {
      const item = crackingItem;
      setCollectedIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
      setActiveReveal(item);
      if (item.rarity === "SSR" || item.rarity === "SECRET") {
        void burstPixelConfetti(item.rarity === "SECRET");
      }
      window.setTimeout(() => {
        playRevealSfx(item.rarity);
        setStage("reveal");
      }, 560);
    }
  }, [crackingItem, crackStep]);

  const handleStudioSelect = (
    e: React.MouseEvent,
    tabIndex: number,
    fieldId: string
  ) => {
    if (!studio || !onSelectField) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectField(tabIndex, fieldId);
  };

  const allCollected = remainingCapsules.length === 0;

  return (
    <div
      className="relative flex h-full min-h-[100dvh] w-full flex-col overflow-hidden select-none text-white"
      style={{
        background:
          "radial-gradient(circle at 20% 15%, rgba(255,126,182,0.34), transparent 46%), radial-gradient(circle at 82% 80%, rgba(168,85,247,0.38), transparent 50%), linear-gradient(160deg, #160a2c 0%, #2d124d 52%, #4a1964 100%)",
      }}
    >
      {/* Animated holographic rarity border & foil sweep keyframes */}
      <style>{`
        @keyframes gachaHoloShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes gachaFoilSweep {
          0% { transform: translateX(-140%) skewX(-18deg); }
          55%, 100% { transform: translateX(220%) skewX(-18deg); }
        }
        .gacha-rarity-frame {
          background-size: 260% 260%;
          animation: gachaHoloShift 3.6s ease-in-out infinite;
        }
        .gacha-rarity-frame-secret {
          background-size: 320% 320%;
          animation: gachaHoloShift 2.6s linear infinite;
        }
        .gacha-foil-sweep {
          animation: gachaFoilSweep 3.2s ease-in-out infinite;
        }
      `}</style>

      {/* Hidden audio */}
      <audio ref={audioRef} loop playsInline className="hidden" />
      {isPlaying && isYtMusic && ytVideoId && (
        <iframe
          title="Pixel Gacha Music"
          src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&loop=1&playlist=${ytVideoId}&enablejsapi=1`}
          allow="autoplay; encrypted-media"
          className="pointer-events-none fixed -left-[9999px] h-px w-px opacity-0"
        />
      )}

      {/* Subtle Pixel Grid Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,210,235,0.45) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Slow Floating Pixel Hearts Background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {BG_HEARTS.map((h, i) => (
          <motion.div
            key={i}
            initial={{ y: "105vh", opacity: 0 }}
            animate={{ y: "-12vh", opacity: [0, 0.65, 0.5, 0] }}
            transition={{
              duration: h.dur,
              delay: h.delay,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ position: "absolute", left: h.left }}
          >
            <PixelHeartSvg
              color={h.color}
              className="drop-shadow-[0_2px_0_rgba(36,13,56,0.75)]"
            />
          </motion.div>
        ))}
      </div>

      {/* Top Arcade HUD Bar (aligned right so top-left modal close X never overlaps) */}
      <header className="relative z-20 flex items-center justify-end gap-2.5 px-4 pt-4 sm:px-6">
        <button
          type="button"
          onClick={() => setAlbumOpen(true)}
          className={`inline-flex items-center gap-1.5 rounded-xl bg-[#311452] px-3 py-1.5 text-xs font-black text-pink-100 transition hover:bg-[#431b6e] ${PIXEL_BTN_SHADOW}`}
        >
          <BookOpen className="h-3.5 w-3.5 text-amber-300" />
          <span>
            สมุดสะสม {collectedIds.length}/{capsules.length}
          </span>
        </button>

        {allCollected && stage !== "secret" && (
          <button
            type="button"
            onClick={() => setStage("secret")}
            className={`inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-pink-500 px-3 py-1.5 text-xs font-black text-[#240d38] transition hover:brightness-110 ${PIXEL_BTN_SHADOW}`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>จดหมายลับ</span>
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            if (studio && onSelectField) {
              handleStudioSelect(e, 1, "field-gacha-song");
              return;
            }
            toggleMusic();
          }}
          data-studio-focus="field-gacha-song"
          title={studio ? "คลิกเพื่อแก้ไขเพลงประกอบ" : isPlaying ? "ปิดเสียง" : "เปิดเสียง"}
          className={`inline-flex max-w-[165px] items-center gap-1.5 rounded-xl bg-[#311452] px-3 py-1.5 text-xs font-bold text-pink-100 transition hover:bg-[#431b6e] ${PIXEL_BTN_SHADOW}`}
        >
          {isPlaying ? (
            <Volume2 className="h-3.5 w-3.5 shrink-0 text-amber-300" />
          ) : (
            <VolumeX className="h-3.5 w-3.5 shrink-0 text-pink-300/70" />
          )}
          <span className="truncate">{songTitle}</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-5">
        <AnimatePresence mode="wait">
          {/* STAGE 1: PIXEL GACHA MACHINE */}
          {stage === "machine" && (
            <motion.div
              key="machine"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.35 }}
              className="flex w-full max-w-sm flex-col items-center"
            >
              {/* Marquee Header */}
              <div className="mb-3 text-center">
                <h1
                  data-studio-focus="field-gacha-title"
                  title={studio ? "คลิกเพื่อแก้ไขชื่อตู้กาชา" : undefined}
                  onClick={(e) => handleStudioSelect(e, 1, "field-gacha-title")}
                  className="font-mono text-2xl font-black tracking-wider text-amber-200 drop-shadow-[0_3px_0_#240d38] sm:text-3xl"
                >
                  {machineTitle}
                </h1>
                <p
                  data-studio-focus="field-gacha-sub"
                  title={studio ? "คลิกเพื่อแก้ไขข้อความใต้ป้ายตู้" : undefined}
                  onClick={(e) => handleStudioSelect(e, 1, "field-gacha-sub")}
                  className="mt-1 text-sm font-bold text-pink-200"
                >
                  {recipientSubtitle}
                </p>
              </div>

              {/* Giant Pixel Gachapon Machine Cabinet (shakes progressively while charging!) */}
              <motion.div
                animate={
                  isHolding
                    ? {
                        x:
                          chargePct > 65
                            ? [-4, 4, -3, 3, -4, 4, 0]
                            : [-2, 2, -1.5, 1.5, 0],
                        y: chargePct > 65 ? [0, -2, 1, -2, 0] : [0, -1, 0],
                      }
                    : spinning
                      ? { x: [-3, 3, -2, 2, 0] }
                      : { x: 0, y: 0 }
                }
                transition={{
                  duration: chargePct > 65 ? 0.16 : 0.28,
                  repeat: isHolding || spinning ? Infinity : 0,
                }}
                className="relative flex w-[276px] flex-col items-center sm:w-[300px]"
              >
                {/* Top Crown Cap with Blinking Pixel Lights */}
                <div
                  className={`flex h-9 w-[236px] items-center justify-between rounded-t-2xl bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 px-4 ${PIXEL_BORDER}`}
                >
                  <PixelStarSvg className="h-3.5 w-3.5 animate-pulse" color="#ec4899" />
                  <span className="font-mono text-xs font-black tracking-widest text-[#240d38]">
                    {isHolding ? `POWER ${Math.round(chargePct)}%` : "INSERT COIN"}
                  </span>
                  <PixelStarSvg className="h-3.5 w-3.5 animate-pulse" color="#ec4899" />
                </div>

                {/* Transparent Glass Capsule Dome */}
                <div
                  className={`relative mt-[-2px] h-[186px] w-[258px] overflow-hidden rounded-t-xl bg-gradient-to-b from-white/25 via-purple-200/15 to-pink-300/20 backdrop-blur-sm ${PIXEL_BORDER}`}
                >
                  {/* Glass highlight bar */}
                  <div className="pointer-events-none absolute left-3 top-3 h-24 w-3 rounded-full bg-white/40" />
                  <div className="pointer-events-none absolute left-3 top-30 h-5 w-3 rounded-full bg-white/30" />

                  {/* Bouncing Pixel Capsules inside dome */}
                  {DOME_CAPSULES.map((c, idx) => (
                    <motion.div
                      key={idx}
                      animate={
                        isHolding || spinning
                          ? {
                              y: [0, -28, 6, -20, 0],
                              x: [0, idx % 2 === 0 ? 14 : -14, 0],
                              rotate: [c.rot, c.rot + 110, c.rot - 55, c.rot],
                            }
                          : {
                              y: [0, -3, 0],
                              rotate: c.rot,
                            }
                      }
                      transition={
                        isHolding || spinning
                          ? {
                              duration: chargePct > 60 ? 0.34 : 0.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }
                          : {
                              duration: 2.6 + (idx % 3) * 0.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }
                      }
                      style={{ position: "absolute", left: c.x, top: c.y }}
                    >
                      <PixelCapsuleSvg top={c.top} bottom={c.bot} className="h-12 w-12" />
                    </motion.div>
                  ))}
                </div>

                {/* Lower Pink Machine Body */}
                <div
                  className={`relative mt-[-2px] flex w-[276px] flex-col items-center rounded-b-2xl bg-gradient-to-b from-[#ff7eb6] via-[#f45b9b] to-[#d9367a] px-5 pb-5 pt-4 sm:w-[292px] ${PIXEL_BORDER}`}
                >
                  {/* Middle Panel: Coin Slot + Hold-to-Spin Rotary Crank */}
                  <div className="flex w-full items-center justify-between gap-3">
                    {/* Coin Slot */}
                    <div className="flex flex-col items-center gap-1 rounded-xl border-2 border-[#240d38] bg-[#2f134b] px-3 py-2">
                      <div className="h-6 w-2 rounded-full bg-black ring-2 ring-amber-300/80" />
                      <span className="font-mono text-[10px] font-black text-amber-200">
                        x{remainingCapsules.length}
                      </span>
                    </div>

                    {/* Interactive Hold-to-Spin Rotary Crank Handle */}
                    <button
                      type="button"
                      disabled={spinning}
                      onPointerDown={handleStartHold}
                      onPointerUp={handleStopHold}
                      onPointerLeave={handleStopHold}
                      onPointerCancel={handleStopHold}
                      onContextMenu={(e) => e.preventDefault()}
                      aria-label="กดค้างเพื่อหมุนตู้กาชา"
                      className="touch-none relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#240d38] bg-[#fff5fa] shadow-[inset_0_-4px_0_#f9a8d4] transition hover:scale-105 active:scale-95 disabled:opacity-80"
                    >
                      <motion.div
                        animate={{ rotate: crankAngle + chargePct * 3.6 }}
                        transition={{ duration: isHolding ? 0.05 : 0.45, ease: "linear" }}
                        className="flex h-6 w-16 items-center justify-center rounded-md border-[3px] border-[#240d38] bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 shadow-sm"
                      >
                        <div className="h-3 w-3 rounded-full border-2 border-[#240d38] bg-pink-400" />
                      </motion.div>
                    </button>

                    {/* Rarity Indicator Light */}
                    <div className="flex flex-col items-center gap-1 rounded-xl border-2 border-[#240d38] bg-[#2f134b] px-2.5 py-2">
                      <Sparkles
                        className={`h-4 w-4 ${
                          isHolding || spinning ? "animate-spin text-amber-300" : "text-pink-300"
                        }`}
                      />
                      <span className="font-mono text-[10px] font-black text-pink-200">
                        SSR
                      </span>
                    </div>
                  </div>

                  {/* Rainbow Pixel Power Charge Gauge */}
                  <div className="mt-3 w-full">
                    <div className="h-3.5 w-full overflow-hidden rounded-md border-2 border-[#240d38] bg-[#1d0b30] p-0.5">
                      <div
                        className="h-full rounded-[3px] bg-gradient-to-r from-pink-400 via-amber-300 via-50% to-cyan-300 transition-[width] duration-75"
                        style={{ width: `${spinning ? 100 : chargePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Capsule Dispenser Tray */}
                  <div className="mt-3 flex h-16 w-full items-center justify-center overflow-visible rounded-xl border-[3px] border-[#240d38] bg-[#1d0b30] shadow-inner">
                    <AnimatePresence mode="wait">
                      {droppedItem ? (
                        <motion.button
                          key={droppedItem.id}
                          type="button"
                          initial={{ y: -40, scale: 0.6, opacity: 0 }}
                          animate={{
                            y: [0, -8, 0],
                            scale: [1, 1.08, 1],
                            opacity: 1,
                          }}
                          transition={{
                            y: { duration: 1.1, repeat: Infinity },
                            scale: { duration: 1.1, repeat: Infinity },
                          }}
                          onClick={handleOpenDropped}
                          className="group flex items-center gap-2.5 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-300/20 to-pink-500/25 px-3.5 py-1.5 shadow-[0_0_24px_rgba(253,224,71,0.45)]"
                        >
                          <PixelCapsuleSvg
                            top={droppedItem.capTop}
                            bottom={droppedItem.capBottom}
                            className="h-11 w-11"
                          />
                          <span className="text-xs font-black text-amber-200">
                            แตะแกะแคปซูล!
                          </span>
                        </motion.button>
                      ) : (
                        <span className="font-mono text-xs font-bold tracking-wider text-purple-300/60">
                          {isHolding
                            ? "CHARGING..."
                            : spinning
                              ? "DROPPING..."
                              : "HOLD TO SPIN"}
                        </span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* Main Hold-to-Spin CTA Button below machine */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {droppedItem ? (
                  <button
                    type="button"
                    onClick={handleOpenDropped}
                    className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 px-7 py-3 text-sm font-black text-[#240d38] transition hover:brightness-105 ${PIXEL_BTN_SHADOW}`}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>แกะแคปซูลเลย!</span>
                  </button>
                ) : allCollected ? (
                  <button
                    type="button"
                    onClick={() => setStage("secret")}
                    className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-pink-400 to-fuchsia-500 px-7 py-3 text-sm font-black text-white transition hover:brightness-110 ${PIXEL_BTN_SHADOW}`}
                  >
                    <Crown className="h-4 w-4" />
                    <span>เปิดจดหมายลับ SECRET</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={spinning}
                    onPointerDown={handleStartHold}
                    onPointerUp={handleStopHold}
                    onPointerLeave={handleStopHold}
                    onPointerCancel={handleStopHold}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`touch-none inline-flex items-center gap-2 rounded-2xl px-7 py-3 text-sm font-black text-[#240d38] transition disabled:opacity-70 ${
                      isHolding
                        ? "scale-95 bg-gradient-to-r from-pink-300 via-amber-300 to-cyan-300"
                        : "bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 hover:brightness-105"
                    } ${PIXEL_BTN_SHADOW}`}
                  >
                    <Coins className="h-4 w-4" />
                    <span>
                      {isHolding
                        ? `กดค้างชาร์จพลัง ${Math.round(chargePct)}%`
                        : spinning
                          ? "แคปซูลกำลังหล่น..."
                          : "กดค้างเพื่อหมุนตู้"}
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* STAGE 1.5: TAP-TO-CRACK CAPSULE (3 TAPS TO BREAK OPEN!) */}
          {stage === "crack" && crackingItem && (
            <motion.div
              key={`crack-${crackingItem.id}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.15 }}
              transition={{ type: "spring", stiffness: 280, damping: 20 }}
              className="relative flex w-full max-w-sm flex-col items-center justify-center py-6 text-center"
            >
              {/* Rarity-reactive glowing aura rays behind capsule */}
              <motion.div
                aria-hidden="true"
                animate={{
                  rotate: 360,
                  scale: crackStep === 0 ? 0.85 : crackStep === 1 ? 1.05 : crackStep === 2 ? 1.35 : 2.2,
                  opacity: crackStep === 0 ? 0.3 : crackStep === 1 ? 0.6 : crackStep === 2 ? 0.95 : 1,
                }}
                transition={{
                  rotate: { duration: crackStep >= 2 ? 4 : 9, repeat: Infinity, ease: "linear" },
                  scale: { duration: 0.35 },
                  opacity: { duration: 0.3 },
                }}
                className="pointer-events-none absolute h-64 w-64 rounded-full blur-2xl"
                style={{
                  background:
                    crackStep >= 2 && crackingItem.rarity === "SECRET"
                      ? "conic-gradient(from 0deg, #ff7eb6, #fde047, #67e8f9, #c084fc, #ff7eb6)"
                      : crackStep >= 2 && crackingItem.rarity === "SSR"
                        ? "conic-gradient(from 0deg, #fde047, #fb923c, #fef08a, #f59e0b, #fde047)"
                        : "radial-gradient(circle, rgba(255,126,182,0.75) 0%, rgba(192,132,252,0.35) 55%, transparent 75%)",
                }}
              />

              {/* Flash burst on Tap 3 */}
              <AnimatePresence>
                {crackStep === 3 && (
                  <motion.div
                    initial={{ scale: 0.2, opacity: 0.95 }}
                    animate={{ scale: 3.2, opacity: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                    className="pointer-events-none absolute z-30 h-44 w-44 rounded-full bg-white blur-xl"
                  />
                )}
              </AnimatePresence>

              {/* Giant Interactive Pixel Capsule ONLY (tap directly on capsule 3 times!) */}
              <motion.button
                type="button"
                onClick={handleTapCrack}
                aria-label="แตะที่แคปซูลเพื่อแกะ"
                animate={
                  crackStep === 1
                    ? { rotate: [-12, 12, -8, 6, 0], scale: [1, 1.08, 1] }
                    : crackStep === 2
                      ? {
                          rotate: [-16, 16, -12, 12, -6, 6, 0],
                          scale: [1.05, 1.14, 1.08],
                        }
                      : { y: [0, -8, 0] }
                }
                transition={
                  crackStep === 0
                    ? { y: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } }
                    : { duration: 0.42 }
                }
                whileTap={{ scale: 0.94 }}
                className="relative z-20 flex cursor-pointer flex-col items-center justify-center focus:outline-none"
              >
                {/* Top Half */}
                <motion.div
                  animate={
                    crackStep === 3
                      ? { y: -64, x: -16, rotate: -26, opacity: 0 }
                      : crackStep === 2
                        ? { y: -8, rotate: -4 }
                        : crackStep === 1
                          ? { y: -3, rotate: -2 }
                          : { y: 0, rotate: 0 }
                  }
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                >
                  <PixelCapsuleTopSvg top={crackingItem.capTop} className="h-[92px] w-[184px]" />
                </motion.div>

                {/* Glowing Light Seam leaking out on Tap 1 & 2 */}
                {crackStep >= 1 && crackStep < 3 && (
                  <motion.div
                    initial={{ scaleX: 0.3, opacity: 0 }}
                    animate={{
                      scaleX: crackStep === 2 ? 1.25 : 0.85,
                      opacity: 1,
                    }}
                    className="pointer-events-none -my-1.5 h-3 w-40 rounded-full blur-[2px]"
                    style={{
                      background:
                        crackStep === 2 && crackingItem.rarity === "SECRET"
                          ? "linear-gradient(90deg, #ff7eb6, #fde047, #67e8f9, #c084fc)"
                          : crackStep === 2 && crackingItem.rarity === "SSR"
                            ? "linear-gradient(90deg, #fbbf24, #ffffff, #fbbf24)"
                            : "linear-gradient(90deg, #ff7eb6, #ffffff, #ff7eb6)",
                      boxShadow: "0 0 22px 6px rgba(255,255,255,0.75)",
                    }}
                  />
                )}

                {/* Bottom Half */}
                <motion.div
                  animate={
                    crackStep === 3
                      ? { y: 64, x: 16, rotate: 26, opacity: 0 }
                      : crackStep === 2
                        ? { y: 8, rotate: 4 }
                        : crackStep === 1
                          ? { y: 3, rotate: 2 }
                          : { y: 0, rotate: 0 }
                  }
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                >
                  <PixelCapsuleBottomSvg bottom={crackingItem.capBottom} className="h-[92px] w-[184px]" />
                </motion.div>
              </motion.button>

              {/* 3-Tap Progress Dots only (no button) */}
              <div className="relative z-20 mt-6 flex items-center gap-2.5">
                {[1, 2, 3].map((stepNum) => (
                  <span
                    key={stepNum}
                    className={`h-3.5 w-3.5 rounded-[4px] border-2 border-[#240d38] transition-all ${
                      crackStep >= stepNum
                        ? "scale-110 bg-amber-300 shadow-[0_0_12px_#fde047]"
                        : "bg-white/25"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* STAGE 2: HOLOGRAPHIC PIXEL CARD REVEAL */}
          {stage === "reveal" && activeReveal && (
            <motion.div
              key={`reveal-${activeReveal.id}`}
              initial={{ opacity: 0, scale: 0.6, rotateY: 90 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="flex w-full max-w-sm flex-col items-center"
            >
              {/* Rarity Header Pill */}
              <div
                className={`mb-3 inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-black tracking-widest ${
                  activeReveal.rarity === "SECRET"
                    ? "bg-gradient-to-r from-amber-300 via-pink-400 to-cyan-300 text-[#240d38]"
                    : activeReveal.rarity === "SSR"
                      ? "bg-gradient-to-r from-amber-300 to-orange-400 text-[#240d38]"
                      : "bg-gradient-to-r from-pink-400 to-fuchsia-500 text-white"
                } ${PIXEL_BORDER}`}
              >
                <Crown className="h-3.5 w-3.5" />
                <span>{activeReveal.rarity} · {activeReveal.label}</span>
              </div>

              {/* Holographic Collector Card with Rarity Animated Border */}
              <div
                className={`relative w-full rounded-[20px] p-[4px] ${
                  activeReveal.rarity === "SECRET"
                    ? "gacha-rarity-frame-secret"
                    : "gacha-rarity-frame"
                }`}
                style={{
                  backgroundImage: RARITY_THEME[activeReveal.rarity].frameBg,
                  boxShadow: RARITY_THEME[activeReveal.rarity].glow,
                }}
              >
                <div
                  className={`relative w-full overflow-hidden rounded-[16px] bg-gradient-to-b p-5 text-center ${RARITY_THEME[activeReveal.rarity].innerBg}`}
                >
                  {/* Corner Pixel Sparkles for SSR & SECRET */}
                  {(activeReveal.rarity === "SSR" || activeReveal.rarity === "SECRET") && (
                    <>
                      <PixelStarSvg
                        className="pointer-events-none absolute left-3 top-3 h-4 w-4 animate-pulse"
                        color={activeReveal.rarity === "SECRET" ? "#67e8f9" : "#fde047"}
                      />
                      <PixelStarSvg
                        className="pointer-events-none absolute right-3 top-3 h-4 w-4 animate-pulse"
                        color={activeReveal.rarity === "SECRET" ? "#ff7eb6" : "#fde047"}
                      />
                    </>
                  )}

                  {/* Foil Shimmer Band */}
                  <div
                    aria-hidden="true"
                    className="gacha-foil-sweep pointer-events-none absolute inset-y-0 left-0 w-28"
                    style={{ background: RARITY_THEME[activeReveal.rarity].sheenBg }}
                  />

                  {activeReveal.kind === "photo" && activeReveal.photoSrc ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          if (studio && onSelectField && activeReveal.photoIdx !== undefined) {
                            handleStudioSelect(e, 3, `field-gacha-photo-${activeReveal.photoIdx}`);
                            return;
                          }
                          setLightboxSrc(activeReveal.photoSrc!);
                        }}
                        data-studio-focus={
                          activeReveal.photoIdx !== undefined
                            ? `field-gacha-photo-${activeReveal.photoIdx}`
                            : undefined
                        }
                        className={`group relative aspect-square w-full overflow-hidden rounded-xl border-[3px] bg-black/40 ${RARITY_THEME[activeReveal.rarity].photoRing}`}
                      >
                        <img
                          src={activeReveal.photoSrc}
                          alt={activeReveal.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </button>
                      <h2 className="mt-4 font-mono text-lg font-black text-amber-200">
                        {activeReveal.title}
                      </h2>
                    </>
                  ) : activeReveal.kind === "wish" ? (
                    <div className="py-5">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-[#240d38] bg-pink-500/25">
                        <PixelHeartSvg className="h-9 w-9" color="#ff7eb6" />
                      </div>
                      <h2
                        data-studio-focus="field-gacha-wish-title"
                        title={studio ? "คลิกเพื่อแก้ไขหัวข้อการ์ดคำอวยพร" : undefined}
                        onClick={(e) => handleStudioSelect(e, 2, "field-gacha-wish-title")}
                        className="text-xl font-black text-pink-200"
                      >
                        {wishTitle}
                      </h2>
                      <p
                        data-studio-focus="field-gacha-wish-desc"
                        title={studio ? "คลิกเพื่อแก้ไขข้อความในการ์ดคำอวยพร" : undefined}
                        onClick={(e) => handleStudioSelect(e, 2, "field-gacha-wish-desc")}
                        className="mt-3 text-base leading-relaxed text-pink-50/95"
                      >
                        {wishBody}
                      </p>
                    </div>
                  ) : (
                    <div className="py-5">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-[#240d38] bg-amber-300/25">
                        <Mail className="h-8 w-8 text-amber-200" />
                      </div>
                      <h2 className="text-xl font-black text-amber-200">{letterTitle}</h2>
                      <p className="mt-2 line-clamp-3 text-sm text-pink-100/90">
                        {letterParagraphs[0]}
                      </p>
                    </div>
                  )}

                  {/* Star Rating Footer */}
                  <div className="mt-4 flex items-center justify-center gap-1.5">
                    {Array.from({ length: activeReveal.rarity === "SECRET" ? 5 : activeReveal.rarity === "SSR" ? 4 : 3 }).map(
                      (_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-300 text-amber-300" />
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Next Action */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {activeReveal.kind === "secret" ? (
                  <button
                    type="button"
                    onClick={() => setStage("secret")}
                    className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-pink-400 to-fuchsia-500 px-7 py-3 text-sm font-black text-white ${PIXEL_BTN_SHADOW}`}
                  >
                    <Mail className="h-4 w-4" />
                    <span>อ่านจดหมายลับฉบับเต็ม</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStage("machine")}
                    className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-400 to-fuchsia-500 px-7 py-3 text-sm font-black text-white ${PIXEL_BTN_SHADOW}`}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>เก็บลงสมุด & หมุนต่อ</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* STAGE 3: PIXEL COLLECTION ALBUM */}
          {stage === "album" && (
            <motion.div
              key="album"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex w-full max-w-xl flex-col items-center"
            >
              <div className="mb-5 text-center">
                <h2
                  data-studio-focus="field-gacha-album-title"
                  title={studio ? "คลิกเพื่อแก้ไขชื่อสมุดสะสม" : undefined}
                  onClick={(e) => handleStudioSelect(e, 3, "field-gacha-album-title")}
                  className="text-2xl font-black text-amber-200 drop-shadow-[0_3px_0_#240d38]"
                >
                  {albumTitle}
                </h2>
                <p
                  data-studio-focus="field-gacha-album-desc"
                  title={studio ? "คลิกเพื่อแก้ไขคำบรรยายสมุดสะสม" : undefined}
                  onClick={(e) => handleStudioSelect(e, 3, "field-gacha-album-desc")}
                  className="mt-1 text-sm text-pink-200/90"
                >
                  {albumDesc}
                </p>
              </div>

              <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
                {capsules.map((item) => {
                  const unlocked = studio || collectedIds.includes(item.id);
                  const theme = RARITY_THEME[item.rarity];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(e) => {
                        if (studio && onSelectField) {
                          if (item.kind === "wish") handleStudioSelect(e, 2, "field-gacha-wish-title");
                          else if (item.kind === "photo" && item.photoIdx !== undefined)
                            handleStudioSelect(e, 3, `field-gacha-photo-${item.photoIdx}`);
                          else handleStudioSelect(e, 4, "field-gacha-letter-title");
                          return;
                        }
                        if (!unlocked) return;
                        if (item.kind === "secret") setStage("secret");
                        else {
                          setActiveReveal(item);
                          setStage("reveal");
                        }
                      }}
                      className={`group relative rounded-[18px] p-[3px] text-center transition duration-200 ${
                        unlocked
                          ? `hover:scale-[1.04] ${
                              item.rarity === "SECRET"
                                ? "gacha-rarity-frame-secret"
                                : "gacha-rarity-frame"
                            }`
                          : `bg-[#24103c] opacity-65 ${PIXEL_BORDER}`
                      }`}
                      style={
                        unlocked
                          ? { backgroundImage: theme.frameBg, boxShadow: theme.glow }
                          : undefined
                      }
                    >
                      <div
                        className={`relative flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-[15px] bg-gradient-to-b p-3 ${
                          unlocked ? theme.innerBg : "from-[#1a0b2e] to-[#130722]"
                        }`}
                      >
                        {unlocked && (
                          <div
                            aria-hidden="true"
                            className="gacha-foil-sweep pointer-events-none absolute inset-y-0 left-0 w-16"
                            style={{ background: theme.sheenBg }}
                          />
                        )}
                        {unlocked && (item.rarity === "SSR" || item.rarity === "SECRET") && (
                          <PixelStarSvg
                            className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 animate-pulse"
                            color={item.rarity === "SECRET" ? "#67e8f9" : "#fde047"}
                          />
                        )}
                        <span
                          className={`relative z-10 mb-2 rounded-md px-2.5 py-0.5 font-mono text-[10px] font-black tracking-wider ${
                            unlocked ? theme.badgeCls : "bg-black/40 text-purple-300/60"
                          }`}
                        >
                          {item.rarity}
                        </span>

                        {unlocked ? (
                          item.kind === "photo" && item.photoSrc ? (
                            <div
                              className={`relative z-10 aspect-square w-full overflow-hidden rounded-lg border-2 ${theme.photoRing}`}
                            >
                              <img
                                src={item.photoSrc}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : item.kind === "wish" ? (
                            <div className="relative z-10 flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-pink-300/30 bg-pink-500/20 p-2">
                              <PixelHeartSvg className="h-8 w-8" color="#ff7eb6" />
                              <span className="mt-2 line-clamp-2 text-xs font-bold text-pink-100">
                                {wishTitle}
                              </span>
                            </div>
                          ) : (
                            <div className="relative z-10 flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-amber-300/35 bg-gradient-to-br from-amber-400/25 via-pink-400/20 to-cyan-300/20 p-2">
                              <Mail className="h-8 w-8 text-amber-200" />
                              <span className="mt-2 line-clamp-2 text-xs font-bold text-amber-100">
                                {letterTitle}
                              </span>
                            </div>
                          )
                        ) : (
                          <div className="flex aspect-square w-full flex-col items-center justify-center rounded-lg bg-black/30">
                            <Lock className="h-6 w-6 text-purple-300/60" />
                          </div>
                        )}
                        <span className="relative z-10 mt-2 w-full truncate text-xs font-bold text-pink-100">
                          {unlocked ? item.label : "???"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setStage("machine")}
                  className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-400 px-6 py-2.5 text-sm font-black text-[#240d38] ${PIXEL_BTN_SHADOW}`}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>กลับไปตู้กาชา</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STAGE 4: SECRET LETTER & FINALE */}
          {stage === "secret" && (
            <motion.div
              key="secret"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`flex max-h-[calc(100dvh-5.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-[#240e3d]/95 ${PIXEL_BORDER}`}
              style={{ boxShadow: "0 0 0 3px #240d38, 0 8px 0 3px #140721" }}
            >
              {/* Pixel Secret Title Header */}
              <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-amber-300 via-pink-400 to-fuchsia-500 px-5 py-3 text-[#240d38]">
                <div className="flex items-center gap-2 font-mono text-xs font-black tracking-wider">
                  <Crown className="h-4 w-4" />
                  <span>SECRET RARE LETTER</span>
                </div>
                <button
                  type="button"
                  onClick={toggleMusic}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#240d38]/85 px-2.5 py-1 text-[11px] font-bold text-amber-200"
                >
                  {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  <Music className="h-3 w-3" />
                </button>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                <div className="rounded-2xl border-2 border-pink-300/30 bg-white/8 p-5 sm:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <PixelHeartSvg className="h-5 w-5" color="#ff7eb6" />
                    <PixelStarSvg className="h-4 w-4" color="#fde047" />
                  </div>
                  <h2
                    data-studio-focus="field-gacha-letter-title"
                    title={studio ? "คลิกเพื่อแก้ไขหัวข้อจดหมายลับ" : undefined}
                    onClick={(e) => handleStudioSelect(e, 4, "field-gacha-letter-title")}
                    className="text-2xl font-black text-amber-200"
                  >
                    {letterTitle}
                  </h2>

                  <div
                    data-studio-focus="field-gacha-letter-body"
                    title={studio ? "คลิกเพื่อแก้ไขเนื้อหาจดหมายลับ" : undefined}
                    onClick={(e) => handleStudioSelect(e, 4, "field-gacha-letter-body")}
                    className="mt-4 space-y-4 text-base leading-relaxed text-pink-50/95"
                  >
                    {letterParagraphs.map((para, i) => (
                      <p key={i} className="whitespace-pre-line">
                        {para}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Closing Pixel Banner */}
                <div className="mt-6 rounded-2xl border-2 border-amber-300/40 bg-gradient-to-r from-pink-500/25 via-fuchsia-500/25 to-amber-400/25 p-5 text-center">
                  <p
                    data-studio-focus="field-gacha-finale-main"
                    title={studio ? "คลิกเพื่อแก้ไขข้อความปิดท้าย" : undefined}
                    onClick={(e) => handleStudioSelect(e, 4, "field-gacha-finale-main")}
                    className="font-mono text-xl font-black tracking-wide text-amber-200 sm:text-2xl"
                  >
                    {finaleMain}
                  </p>
                  <p
                    data-studio-focus="field-gacha-finale-sub"
                    title={studio ? "คลิกเพื่อแก้ไขคำลงท้าย" : undefined}
                    onClick={(e) => handleStudioSelect(e, 4, "field-gacha-finale-sub")}
                    className="mt-1.5 text-sm font-semibold text-pink-100"
                  >
                    {finaleSub}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStage("album")}
                    className={`inline-flex items-center gap-1.5 rounded-xl bg-[#341657] px-4 py-2 text-xs font-black text-pink-100 ${PIXEL_BTN_SHADOW}`}
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-amber-300" />
                    <span>ดูสมุดสะสมทั้งหมด</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCollectedIds([]);
                      setDroppedItem(null);
                      setStage("machine");
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-400 to-fuchsia-500 px-4 py-2 text-xs font-black text-white ${PIXEL_BTN_SHADOW}`}
                  >
                    <Heart className="h-3.5 w-3.5 fill-white" />
                    <span>เล่นกาชาอีกครั้ง</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Persistent Floating Collection Book Modal (openable anytime from any stage!) */}
      <AnimatePresence>
        {albumOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAlbumOpen(false)}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className={`flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-[#240e3d]/95 ${PIXEL_BORDER}`}
            >
              <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-pink-400 via-fuchsia-400 to-amber-300 px-4 py-3 text-[#240d38]">
                <div className="flex items-center gap-2 text-sm font-black">
                  <BookOpen className="h-4 w-4" />
                  <span>
                    {albumTitle} ({collectedIds.length}/{capsules.length})
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="ปิดสมุดสะสม"
                  onClick={() => setAlbumOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#240d38]/85 text-white transition hover:bg-[#240d38]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto p-5">
                {albumDesc && (
                  <p className="mb-4 text-center text-xs font-semibold text-pink-200/85">
                    {albumDesc}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {capsules.map((item) => {
                    const unlocked = studio || collectedIds.includes(item.id);
                    const theme = RARITY_THEME[item.rarity];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => {
                          if (studio && onSelectField) {
                            setAlbumOpen(false);
                            if (item.kind === "wish") handleStudioSelect(e, 2, "field-gacha-wish-title");
                            else if (item.kind === "photo" && item.photoIdx !== undefined)
                              handleStudioSelect(e, 3, `field-gacha-photo-${item.photoIdx}`);
                            else handleStudioSelect(e, 4, "field-gacha-letter-title");
                            return;
                          }
                          if (!unlocked) return;
                          setAlbumOpen(false);
                          if (item.kind === "secret") setStage("secret");
                          else {
                            setActiveReveal(item);
                            setStage("reveal");
                          }
                        }}
                        className={`group relative rounded-[18px] p-[3px] text-center transition duration-200 ${
                          unlocked
                            ? `hover:scale-[1.04] ${
                                item.rarity === "SECRET"
                                  ? "gacha-rarity-frame-secret"
                                  : "gacha-rarity-frame"
                              }`
                            : `bg-[#24103c] opacity-65 ${PIXEL_BORDER}`
                        }`}
                        style={
                          unlocked
                            ? { backgroundImage: theme.frameBg, boxShadow: theme.glow }
                            : undefined
                        }
                      >
                        <div
                          className={`relative flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-[15px] bg-gradient-to-b p-3 ${
                            unlocked ? theme.innerBg : "from-[#1a0b2e] to-[#130722]"
                          }`}
                        >
                          {unlocked && (
                            <div
                              aria-hidden="true"
                              className="gacha-foil-sweep pointer-events-none absolute inset-y-0 left-0 w-16"
                              style={{ background: theme.sheenBg }}
                            />
                          )}
                          {unlocked && (item.rarity === "SSR" || item.rarity === "SECRET") && (
                            <PixelStarSvg
                              className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 animate-pulse"
                              color={item.rarity === "SECRET" ? "#67e8f9" : "#fde047"}
                            />
                          )}
                          <span
                            className={`relative z-10 mb-2 rounded-md px-2.5 py-0.5 font-mono text-[10px] font-black tracking-wider ${
                              unlocked ? theme.badgeCls : "bg-black/40 text-purple-300/60"
                            }`}
                          >
                            {item.rarity}
                          </span>
                          {unlocked ? (
                            item.kind === "photo" && item.photoSrc ? (
                              <div
                                className={`relative z-10 aspect-square w-full overflow-hidden rounded-lg border-2 ${theme.photoRing}`}
                              >
                                <img
                                  src={item.photoSrc}
                                  alt={item.title}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : item.kind === "wish" ? (
                              <div className="relative z-10 flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-pink-300/30 bg-pink-500/20 p-2">
                                <PixelHeartSvg className="h-8 w-8" color="#ff7eb6" />
                                <span className="mt-2 line-clamp-2 text-xs font-bold text-pink-100">
                                  {wishTitle}
                                </span>
                              </div>
                            ) : (
                              <div className="relative z-10 flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-amber-300/35 bg-gradient-to-br from-amber-400/25 via-pink-400/20 to-cyan-300/20 p-2">
                                <Mail className="h-8 w-8 text-amber-200" />
                                <span className="mt-2 line-clamp-2 text-xs font-bold text-amber-100">
                                  {letterTitle}
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="flex aspect-square w-full flex-col items-center justify-center rounded-lg bg-black/30">
                              <Lock className="h-6 w-6 text-purple-300/60" />
                            </div>
                          )}
                          <span className="relative z-10 mt-2 w-full truncate text-xs font-bold text-pink-100">
                            {unlocked ? item.label : "???"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxSrc(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative max-h-[85vh] max-w-xl overflow-hidden rounded-2xl bg-[#240e3d] p-3 ${PIXEL_BORDER}`}
            >
              <button
                type="button"
                aria-label="ปิดภาพ"
                onClick={() => setLightboxSrc(null)}
                className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-[#240d38]/90 text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={lightboxSrc}
                alt="ภาพความทรงจำขนาดใหญ่"
                className="max-h-[78vh] w-full rounded-xl object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
