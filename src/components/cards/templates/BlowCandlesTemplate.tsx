"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Cake,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  Lock,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  Wind,
} from "lucide-react";
import { verifyCardPin } from "@/app/c/[hash_id]/actions";

interface BlowCandlesPhoto {
  src?: string;
}

interface BlowCandlesConfig {
  recipientName?: string;
  senderName?: string;
  message?: string;
  wishMessage?: string;
  image_url?: string | null;
  photos?: Array<BlowCandlesPhoto | string>;
  data?: {
    recipientName?: string;
    senderName?: string;
    message?: string;
    wishMessage?: string;
    photos?: Array<BlowCandlesPhoto | string>;
  };
}

interface BlowCandlesTemplateProps {
  config?: unknown;
  data?: {
    recipientName?: string;
    wishMessage?: string;
  };
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  pinRequired?: boolean;
}

type StageId = "cake" | "letter" | "memories" | "finale";

const CANDLE_POSITIONS = [
  { x: 96, y: 54, color: "#fb7185", stripe: "#ffe4e6" },
  { x: 122, y: 46, color: "#c084fc", stripe: "#f3e8ff" },
  { x: 150, y: 42, color: "#fbbf24", stripe: "#fef3c7" },
  { x: 178, y: 46, color: "#38bdf8", stripe: "#e0f2fe" },
  { x: 204, y: 54, color: "#f472b6", stripe: "#fce7f3" },
];

const BOKEH_DOTS = [
  { top: "10%", left: "12%", size: 8, delay: "0s", duration: "6s" },
  { top: "22%", left: "82%", size: 12, delay: "1.2s", duration: "7.5s" },
  { top: "68%", left: "10%", size: 10, delay: "0.7s", duration: "8s" },
  { top: "75%", left: "86%", size: 14, delay: "1.8s", duration: "6.5s" },
  { top: "42%", left: "6%", size: 6, delay: "2.4s", duration: "7s" },
  { top: "38%", left: "92%", size: 7, delay: "0.4s", duration: "9s" },
];

function extractPhotos(configObj: BlowCandlesConfig): string[] {
  const rawList = configObj.photos ?? configObj.data?.photos ?? [];
  const normalized = rawList
    .map((item) => (typeof item === "string" ? item : item?.src || ""))
    .filter((src) => Boolean(src && src.trim()));

  if (normalized.length > 0) return normalized;
  if (configObj.image_url && configObj.image_url.trim()) {
    return [configObj.image_url.trim()];
  }
  return [];
}

function playCelebrationChime() {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.11;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.48);
    });
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 1200);
  } catch {
    // Ignore audio context restrictions
  }
}

async function triggerBirthdayConfetti() {
  try {
    const { default: confetti } = await import("canvas-confetti");
    confetti({
      particleCount: 95,
      spread: 75,
      origin: { y: 0.58 },
      colors: ["#fbbf24", "#f472b6", "#c084fc", "#38bdf8", "#ffffff"],
    });
  } catch {
    // Ignore confetti errors
  }
}

export default function BlowCandlesTemplate({
  config,
  data,
  studio = false,
  activeScreen,
  expectedPin = "",
  hashId = "",
  pinRequired = false,
}: BlowCandlesTemplateProps) {
  const configObj = (config as BlowCandlesConfig) || {};
  const recipientName =
    configObj.recipientName ||
    configObj.data?.recipientName ||
    data?.recipientName ||
    "คนพิเศษ";
  const senderName =
    configObj.senderName ||
    configObj.data?.senderName ||
    "คนที่ห่วงใยคุณ";
  const wishMessage =
    configObj.wishMessage ||
    configObj.data?.wishMessage ||
    data?.wishMessage ||
    "ขอให้ปีนี้เต็มไปด้วยรอยยิ้ม ความสุข และความทรงจำที่แสนวิเศษ";
  const letterText =
    configObj.message ||
    configObj.data?.message ||
    "สุขสันต์วันเกิดนะ! ขอให้ทุกความปรารถนาของคุณเป็นจริง และมีความสุขในทุกๆ วันต่อจากนี้";
  const photos = useMemo(() => extractPhotos(configObj), [configObj]);

  const [pinUnlocked, setPinUnlocked] = useState(!pinRequired || studio);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinChecking, setPinChecking] = useState(false);

  const [stage, setStage] = useState<StageId>("cake");
  const [litCandles, setLitCandles] = useState<boolean[]>([true, true, true, true, true]);
  const [smokedCandles, setSmokedCandles] = useState<boolean[]>([false, false, false, false, false]);
  const [celebrated, setCelebrated] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micRafRef = useRef<number | null>(null);
  const lastBlowTimeRef = useRef<number>(0);

  const litCount = litCandles.filter(Boolean).length;
  const allBlownOut = litCount === 0;

  useEffect(() => {
    setPinUnlocked(!pinRequired || studio);
  }, [pinRequired, studio]);

  useEffect(() => {
    if (!activeScreen) return;
    if (activeScreen === 1) setStage("cake");
    else if (activeScreen === 2) setStage("letter");
    else if (activeScreen === 3 || activeScreen === 4) setStage("memories");
    else if (activeScreen >= 5) setStage("finale");
  }, [activeScreen]);

  const stopMicrophone = useCallback(() => {
    if (micRafRef.current !== null) {
      window.cancelAnimationFrame(micRafRef.current);
      micRafRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setMicActive(false);
    setMicLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      stopMicrophone();
    };
  }, [stopMicrophone]);

  const celebrateIfFinished = useCallback(
    (nextLit: boolean[]) => {
      if (nextLit.every((lit) => !lit) && !celebrated) {
        setCelebrated(true);
        stopMicrophone();
        playCelebrationChime();
        void triggerBirthdayConfetti();
      }
    },
    [celebrated, stopMicrophone],
  );

  const extinguishSingleCandle = useCallback(
    (index: number) => {
      setLitCandles((prev) => {
        if (!prev[index]) return prev;
        const next = [...prev];
        next[index] = false;
        celebrateIfFinished(next);
        return next;
      });
      setSmokedCandles((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });
      window.setTimeout(() => {
        setSmokedCandles((prev) => {
          const next = [...prev];
          next[index] = false;
          return next;
        });
      }, 1500);
    },
    [celebrateIfFinished],
  );

  const extinguishNextCandle = useCallback(() => {
    setLitCandles((prev) => {
      const targetIndex = prev.findIndex(Boolean);
      if (targetIndex === -1) return prev;
      const next = [...prev];
      next[targetIndex] = false;

      setSmokedCandles((sPrev) => {
        const sNext = [...sPrev];
        sNext[targetIndex] = true;
        return sNext;
      });
      window.setTimeout(() => {
        setSmokedCandles((sPrev) => {
          const sNext = [...sPrev];
          sNext[targetIndex] = false;
          return sNext;
        });
      }, 1500);

      celebrateIfFinished(next);
      return next;
    });
  }, [celebrateIfFinished]);

  const blowAllCandles = () => {
    const litIndices = litCandles
      .map((isLit, idx) => (isLit ? idx : -1))
      .filter((idx) => idx !== -1);
    if (litIndices.length === 0) return;

    litIndices.forEach((candleIdx, step) => {
      window.setTimeout(() => {
        extinguishSingleCandle(candleIdx);
      }, step * 110);
    });
  };

  const relightAllCandles = () => {
    setLitCandles([true, true, true, true, true]);
    setSmokedCandles([false, false, false, false, false]);
    setCelebrated(false);
    setStage("cake");
  };

  const toggleMicrophone = async () => {
    if (micActive) {
      stopMicrophone();
      return;
    }

    setMicError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicError("อุปกรณ์นี้ไม่รองรับไมโครโฟน กรุณาแตะที่เทียนหรือกดปุ่มเป่าเทียนด้านล่าง");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        stream.getTracks().forEach((track) => track.stop());
        setMicError("เบราว์เซอร์ไม่รองรับการตรวจจับเสียง กรุณาแตะที่เทียนแทน");
        return;
      }

      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      micStreamRef.current = stream;
      audioCtxRef.current = audioCtx;
      setMicActive(true);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const detectBlow = () => {
        analyser.getByteFrequencyData(dataArray);
        const lowBand = dataArray.slice(0, 24);
        const avg = lowBand.reduce((sum, val) => sum + val, 0) / lowBand.length;
        const normalized = Math.min(100, Math.round((avg / 140) * 100));
        setMicLevel(normalized);

        const now = Date.now();
        if (avg > 62 && now - lastBlowTimeRef.current > 240) {
          lastBlowTimeRef.current = now;
          extinguishNextCandle();
        }
        micRafRef.current = window.requestAnimationFrame(detectBlow);
      };

      micRafRef.current = window.requestAnimationFrame(detectBlow);
    } catch {
      setMicError("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาแตะที่เทียนหรือกดปุ่มเป่าเทียนแทน");
      stopMicrophone();
    }
  };

  const handlePinKey = async (digit: string) => {
    if (pinChecking || pinInput.length >= 4) return;
    const nextPin = `${pinInput}${digit}`;
    setPinInput(nextPin);
    setPinError(null);

    if (nextPin.length === 4) {
      setPinChecking(true);
      try {
        if (hashId) {
          const result = await verifyCardPin(hashId, nextPin);
          if (result.success) {
            setPinUnlocked(true);
            return;
          }
          setPinError(result.error || "รหัส PIN ไม่ถูกต้อง");
        } else if (expectedPin && nextPin === expectedPin) {
          setPinUnlocked(true);
          return;
        } else {
          setPinError("รหัส PIN ไม่ถูกต้อง");
        }
      } catch {
        setPinError("ตรวจสอบ PIN ไม่สำเร็จ กรุณาลองใหม่");
      } finally {
        setPinChecking(false);
        setPinInput("");
      }
    }
  };

  const letterParagraphs = useMemo(() => {
    const parts = letterText
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : [letterText];
  }, [letterText]);

  const stageTabs: Array<{ id: StageId; label: string }> = [
    { id: "cake", label: "เป่าเทียน" },
    { id: "letter", label: "คำอวยพร" },
    { id: "memories", label: "ความทรงจำ" },
    { id: "finale", label: "ปิดท้าย" },
  ];

  return (
    <div className="relative flex h-full min-h-[560px] w-full flex-col justify-between overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_top,#351249_0%,#150826_52%,#070312_100%)] p-5 text-white shadow-2xl sm:p-7">
      <style>{`
        @keyframes candleFlicker {
          0%, 100% { transform: scale(1) rotate(-2deg); opacity: 0.96; }
          35% { transform: scale(1.06, 0.95) rotate(2.5deg); opacity: 1; }
          70% { transform: scale(0.95, 1.07) rotate(-1.5deg); opacity: 0.9; }
        }
        @keyframes smokeRise {
          0% { transform: translateY(0) scale(0.7); opacity: 0.75; }
          100% { transform: translateY(-34px) scale(1.7); opacity: 0; }
        }
        @keyframes floatBokeh {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.25; }
          50% { transform: translateY(-16px) scale(1.18); opacity: 0.6; }
        }
      `}</style>

      {/* Ambient Bokeh Lights */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className={`absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-all duration-700 ${
            allBlownOut ? "bg-fuchsia-500/20" : "bg-amber-400/20"
          }`}
        />
        {BOKEH_DOTS.map((dot, idx) => (
          <span
            key={idx}
            className="absolute rounded-full bg-amber-200/50 blur-[1px]"
            style={{
              top: dot.top,
              left: dot.left,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              animation: `floatBokeh ${dot.duration} ease-in-out ${dot.delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold tracking-wider text-amber-200 uppercase">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          Happy Birthday Celebration
        </span>
        <h2 className="mt-2.5 bg-gradient-to-r from-amber-200 via-pink-200 to-purple-200 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-3xl">
          สุขสันต์วันเกิด {recipientName}
        </h2>
      </div>

      {/* PIN Gate Screen */}
      {!pinUnlocked ? (
        <div className="relative z-10 mx-auto my-auto flex w-full max-w-xs flex-col items-center rounded-2xl border border-white/15 bg-black/40 p-6 text-center backdrop-blur-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-bold text-white">กรุณาใส่รหัส PIN 4 หลัก</h3>
          <p className="mt-1 text-xs text-slate-300">เพื่อปลดล็อกเค้กวันเกิดและคำอวยพร</p>

          <div className="mt-4 flex gap-3">
            {[0, 1, 2, 3].map((slot) => (
              <span
                key={slot}
                className={`h-3.5 w-3.5 rounded-full border transition-all ${
                  pinInput.length > slot
                    ? "scale-110 border-amber-300 bg-amber-300 shadow-[0_0_10px_#fcd34d]"
                    : "border-white/30 bg-white/5"
                }`}
              />
            ))}
          </div>

          {pinError && <p className="mt-3 text-xs font-medium text-rose-300">{pinError}</p>}

          <div className="mt-5 grid w-full grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                disabled={pinChecking}
                onClick={() => void handlePinKey(num)}
                className="rounded-xl border border-white/10 bg-white/10 py-2.5 text-base font-bold text-white transition hover:bg-white/20 active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPinInput("");
                setPinError(null);
              }}
              className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/15"
            >
              ล้าง
            </button>
            <button
              type="button"
              disabled={pinChecking}
              onClick={() => void handlePinKey("0")}
              className="rounded-xl border border-white/10 bg-white/10 py-2.5 text-base font-bold text-white transition hover:bg-white/20 active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPinInput((prev) => prev.slice(0, -1))}
              className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/15"
            >
              ลบ
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 my-4 flex flex-1 flex-col items-center justify-center">
          {/* STAGE 1: INTERACTIVE CAKE & CANDLES */}
          {stage === "cake" && (
            <div className="flex w-full max-w-md flex-col items-center">
              <p className="mb-2 text-center text-xs text-amber-100/80 sm:text-sm">
                {allBlownOut
                  ? "คำอธิษฐานถูกส่งออกไปแล้ว! ขอให้สมหวังทุกประการ"
                  : `เหลือเทียนที่ติดไฟอยู่ ${litCount} เล่ม — เป่าผ่านไมค์หรือแตะที่เปลวเทียนได้เลย`}
              </p>

              {/* Multi-tier Birthday Cake SVG */}
              <div className="relative flex w-full max-w-[300px] items-center justify-center">
                <svg
                  viewBox="0 0 300 250"
                  className="h-auto w-full drop-shadow-[0_18px_35px_rgba(0,0,0,0.65)]"
                  role="img"
                  aria-label="เค้กวันเกิดพร้อมเทียน"
                >
                  <defs>
                    <linearGradient id="cakeStand" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#92400e" />
                      <stop offset="50%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>
                    <linearGradient id="cakeLower" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9d174d" />
                      <stop offset="100%" stopColor="#500724" />
                    </linearGradient>
                    <linearGradient id="cakeUpper" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#db2777" />
                      <stop offset="100%" stopColor="#831843" />
                    </linearGradient>
                    <linearGradient id="icingCream" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fff1f2" />
                      <stop offset="100%" stopColor="#fbcfe8" />
                    </linearGradient>
                    <radialGradient id="flameGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#fde047" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Pedestal Stand */}
                  <ellipse cx="150" cy="232" rx="74" ry="10" fill="url(#cakeStand)" />
                  <rect x="137" y="205" width="26" height="26" rx="4" fill="url(#cakeStand)" />
                  <ellipse cx="150" cy="206" rx="112" ry="13" fill="url(#cakeStand)" />

                  {/* Lower Cake Tier */}
                  <rect x="64" y="144" width="172" height="58" rx="14" fill="url(#cakeLower)" />
                  <path
                    d="M64 152 Q80 170 96 154 Q114 174 132 154 Q150 174 168 154 Q186 174 204 154 Q220 170 236 152 L236 144 Q236 136 226 136 L74 136 Q64 136 64 144 Z"
                    fill="url(#icingCream)"
                  />

                  {/* Upper Cake Tier */}
                  <rect x="86" y="88" width="128" height="52" rx="12" fill="url(#cakeUpper)" />
                  <path
                    d="M86 96 Q100 112 114 98 Q128 114 142 98 Q156 114 170 98 Q184 114 198 98 Q208 106 214 96 L214 88 Q214 80 204 80 L96 80 Q86 80 86 88 Z"
                    fill="url(#icingCream)"
                  />

                  {/* Golden Plaque */}
                  <rect x="108" y="168" width="84" height="22" rx="6" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
                  <text
                    x="150"
                    y="183"
                    textAnchor="middle"
                    fill="#92400e"
                    fontSize="10"
                    fontWeight="700"
                  >
                    Make a Wish
                  </text>

                  {/* Sprinkles */}
                  <circle cx="95" cy="184" r="2.2" fill="#fde047" />
                  <circle cx="204" cy="180" r="2.2" fill="#38bdf8" />
                  <circle cx="115" cy="126" r="2" fill="#fde047" />
                  <circle cx="184" cy="124" r="2" fill="#a7f3d0" />

                  {/* Candles & Interactive Flames */}
                  {CANDLE_POSITIONS.map((candle, idx) => {
                    const isLit = litCandles[idx];
                    const hasSmoke = smokedCandles[idx];
                    return (
                      <g
                        key={idx}
                        onClick={() => extinguishSingleCandle(idx)}
                        className={isLit ? "cursor-pointer" : "cursor-default"}
                      >
                        {/* Candle Stick */}
                        <rect
                          x={candle.x - 4.5}
                          y={candle.y}
                          width="9"
                          height="34"
                          rx="3"
                          fill={candle.color}
                        />
                        <line
                          x1={candle.x - 3}
                          y1={candle.y + 8}
                          x2={candle.x + 3}
                          y2={candle.y + 13}
                          stroke={candle.stripe}
                          strokeWidth="2"
                        />
                        <line
                          x1={candle.x - 3}
                          y1={candle.y + 20}
                          x2={candle.x + 3}
                          y2={candle.y + 25}
                          stroke={candle.stripe}
                          strokeWidth="2"
                        />
                        {/* Wick */}
                        <line
                          x1={candle.x}
                          y1={candle.y - 5}
                          x2={candle.x}
                          y2={candle.y}
                          stroke="#1f2937"
                          strokeWidth="1.8"
                        />

                        {/* Flame Glow + Animated Flame */}
                        {isLit && (
                          <g
                            style={{
                              transformOrigin: `${candle.x}px ${candle.y - 6}px`,
                              animation: `candleFlicker ${1.2 + idx * 0.14}s ease-in-out infinite`,
                            }}
                          >
                            <circle cx={candle.x} cy={candle.y - 14} r="18" fill="url(#flameGlow)" />
                            <path
                              d={`M ${candle.x} ${candle.y - 26} C ${candle.x + 6} ${candle.y - 16}, ${candle.x + 5} ${candle.y - 7}, ${candle.x} ${candle.y - 6} C ${candle.x - 5} ${candle.y - 7}, ${candle.x - 6} ${candle.y - 16}, ${candle.x} ${candle.y - 26} Z`}
                              fill="#fb923c"
                            />
                            <path
                              d={`M ${candle.x} ${candle.y - 20} C ${candle.x + 3} ${candle.y - 14}, ${candle.x + 2.5} ${candle.y - 8}, ${candle.x} ${candle.y - 7} C ${candle.x - 2.5} ${candle.y - 8}, ${candle.x - 3} ${candle.y - 14}, ${candle.x} ${candle.y - 20} Z`}
                              fill="#fef08a"
                            />
                          </g>
                        )}

                        {/* Smoke Wisp when Blown Out */}
                        {!isLit && hasSmoke && (
                          <g
                            style={{
                              transformOrigin: `${candle.x}px ${candle.y - 8}px`,
                              animation: "smokeRise 1.4s ease-out forwards",
                            }}
                          >
                            <circle cx={candle.x} cy={candle.y - 10} r="4" fill="#cbd5e1" opacity="0.55" />
                            <circle cx={candle.x + 3} cy={candle.y - 17} r="5.5" fill="#e2e8f0" opacity="0.4" />
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Microphone Meter when active */}
              {micActive && (
                <div className="mt-1 w-full max-w-xs rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-3 py-2">
                  <div className="flex items-center justify-between text-[11px] text-emerald-200">
                    <span>กำลังฟังเสียงลมเป่า...</span>
                    <span className="font-mono">{micLevel}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all duration-75"
                      style={{ width: `${micLevel}%` }}
                    />
                  </div>
                </div>
              )}

              {micError && (
                <p className="mt-2 text-center text-xs text-amber-300">{micError}</p>
              )}

              {/* Controls */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                {!allBlownOut ? (
                  <>
                    <button
                      type="button"
                      onClick={blowAllCandles}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/25 transition hover:brightness-110 active:scale-95"
                    >
                      <Wind className="h-4 w-4" />
                      เป่าเทียนทั้งหมด
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleMicrophone()}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition ${
                        micActive
                          ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                          : "border-white/15 bg-white/10 text-slate-200 hover:bg-white/20"
                      }`}
                    >
                      {micActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      {micActive ? "ปิดไมค์" : "เป่าผ่านไมค์"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setStage("letter")}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:brightness-110 active:scale-95"
                    >
                      <Sparkles className="h-4 w-4" />
                      เปิดอ่านคำอวยพร
                    </button>
                    <button
                      type="button"
                      onClick={relightAllCandles}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/20"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      จุดเทียนใหม่
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STAGE 2: BIRTHDAY LETTER */}
          {stage === "letter" && (
            <div className="w-full max-w-md rounded-2xl border border-amber-200/20 bg-white/10 p-5 shadow-xl backdrop-blur-xl sm:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-400" />
                  <h3 className="text-base font-bold text-amber-100">คำอวยพรถึง {recipientName}</h3>
                </div>
                <Cake className="h-4 w-4 text-amber-300" />
              </div>

              <div className="mt-4 max-h-[240px] space-y-3 overflow-y-auto pr-1 text-sm leading-relaxed text-slate-100">
                {letterParagraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-amber-200/80">
                <span>ด้วยรักและปรารถนาดี</span>
                <span className="font-bold text-amber-200">{senderName}</span>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStage("memories")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 text-xs font-bold text-white"
                >
                  ดูรูปความทรงจำ
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: MEMORY POLAROIDS */}
          {stage === "memories" && (
            <div className="flex w-full max-w-md flex-col items-center">
              {photos.length > 0 ? (
                <div className="w-full rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
                  <div className="relative overflow-hidden rounded-xl bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photos[photoIndex % photos.length]}
                      alt={`ความทรงจำที่ ${(photoIndex % photos.length) + 1}`}
                      className="h-60 w-full object-cover"
                    />
                    {photos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)}
                          aria-label="รูปก่อนหน้า"
                          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoIndex((prev) => (prev + 1) % photos.length)}
                          aria-label="รูปถัดไป"
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                    <span>ภาพความทรงจำ</span>
                    <span className="font-mono">
                      {(photoIndex % photos.length) + 1} / {photos.length}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex w-full flex-col items-center rounded-2xl border border-white/15 bg-white/5 p-6 text-center backdrop-blur-xl">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-500/20 text-pink-300">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 text-base font-bold text-white">บันทึกความทรงจำวันเกิด</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                    {wishMessage}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStage("finale")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-pink-500 px-5 py-2 text-xs font-bold text-slate-950"
              >
                ไปยังหน้าปิดท้าย
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* STAGE 4: FINALE */}
          {stage === "finale" && (
            <div className="w-full max-w-md rounded-2xl border border-amber-300/25 bg-gradient-to-b from-white/10 to-white/5 p-6 text-center shadow-xl backdrop-blur-xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/20 text-amber-300">
                <Sparkles className="h-7 w-7" />
              </div>
              <h3 className="mt-3 text-xl font-extrabold text-amber-100">
                สุขสันต์วันเกิดอีกครั้งนะ {recipientName}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                {wishMessage}
              </p>
              <p className="mt-3 text-xs font-semibold text-pink-300">
                จาก {senderName}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                <button
                  type="button"
                  onClick={relightAllCandles}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-2 text-xs font-bold text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  จุดเทียนเล่นใหม่
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Stage Navigation Pills */}
      {pinUnlocked && (
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 pt-2">
          {stageTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStage(tab.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                stage === tab.id
                  ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

BlowCandlesTemplate.displayName = "BlowCandlesTemplate";
