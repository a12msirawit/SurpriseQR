"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Cake,
  ChevronRight,
  Gift,
  Images,
  Mic,
  MicOff,
  Music,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import BackgroundAudioPlayer from "@/components/audio/BackgroundAudioPlayer";
import VelvetCakeSvg, { seeded } from "./VelvetCakeSvg";
import { useBlowDetector } from "./useBlowDetector";
import {
  playBirthdayMelody,
  playBlowOut,
  playChime,
  playPop,
  playSlice,
  playSnuff,
  unlockAudio,
} from "./velvetSound";

type Stage = "wish" | "celebrate" | "balloons" | "finale";

interface VelvetCandleTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

interface BalloonData {
  title: string;
  message: string;
  photo: string;
}

const BALLOON_STYLES = [
  { name: "champagne", from: "#f8ebc6", via: "#e3c27c", to: "#a67c33", string: "#d8b56a", shard: "#e3c27c" },
  { name: "rose", from: "#f6d3d4", via: "#d69a9e", to: "#9a5960", string: "#c58b90", shard: "#d69a9e" },
  { name: "navy", from: "#6f80b3", via: "#33416e", to: "#121a33", string: "#7d8ab3", shard: "#3d4c80" },
];

const DEFAULT_WISH = "หลับตาอธิษฐาน แล้วเป่าเทียนเพื่อเริ่มงานวันเกิด";

/** A value the creator explicitly blanked with a single space is hidden. */
function visible(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readConfig(config: unknown) {
  const raw = (config as Record<string, unknown>) || {};
  const content = ((raw.content as Record<string, unknown>) || raw) as Record<string, unknown>;
  const menu = (content.menu as Record<string, unknown>) || {};
  const letter = (content.letter as Record<string, unknown>) || {};
  const memories = (content.memories as Record<string, unknown>) || {};
  const flowers = (content.flowers as Record<string, unknown>) || {};
  const songMedia = (content.songMedia as Record<string, unknown>) || {};
  const finale = (content.finale as Record<string, unknown>) || {};
  const bgMusic = (content.bgMusic as Record<string, unknown>) || {};

  const srcList = (value: unknown): string[] =>
    Array.isArray(value)
      ? (value as Array<{ src?: unknown }>).map((m) => (typeof m?.src === "string" ? m.src : ""))
      : [];

  const ageRaw = str(flowers.highlightText) || str(raw.age);
  const ageNum = parseInt(ageRaw, 10);
  const polaroids = srcList(memories.polaroidImages);

  const balloons: BalloonData[] = [1, 2, 3].map((n, i) => ({
    title: str(menu[`card${n}Title`]),
    message: str(menu[`card${n}Desc`]),
    photo: polaroids[i] || "",
  }));

  const photos = srcList(memories.filmstripImages).slice(0, 4);
  while (photos.length < 4) photos.push("");

  const paragraphs = Array.isArray(letter.paragraphs)
    ? (letter.paragraphs as unknown[]).map((p) => str(p)).filter(visible)
    : [];

  return {
    cardTitle: str(content.title) || str(raw.title) || "Happy Birthday",
    name: str(raw.recipientName) || str(menu.subTitle) || "คนพิเศษ",
    age: Number.isFinite(ageNum) && ageNum > 0 ? ageNum : null,
    ageLabel: ageRaw,
    wishPrompt: str(letter.title, DEFAULT_WISH),
    secretEyebrow: str(flowers.subTitle),
    secretTitle: str(flowers.title),
    secretMessage: str(flowers.message),
    balloons,
    photos,
    finaleTitle: str(finale.mainText),
    finaleSign: str(finale.subText),
    paragraphs,
    musicUrl: str(songMedia.audioSrc) || str(bgMusic.src) || str(raw.audio_url),
  };
}

const EDIT_RING =
  "cursor-pointer rounded-xl outline-none transition-shadow hover:ring-2 hover:ring-amber-300/70 hover:ring-offset-2 hover:ring-offset-transparent";

export default function VelvetCandleTemplate({
  config,
  studio = false,
  activeScreen,
  onSelectField,
}: VelvetCandleTemplateProps) {
  const data = useMemo(() => readConfig(config), [config]);
  const candleCount = data.age ? Math.min(9, Math.max(1, data.age)) : 5;

  const [stage, setStage] = useState<Stage>("wish");
  const [lit, setLit] = useState<boolean[]>(() => Array(candleCount).fill(true));
  const [roomLit, setRoomLit] = useState(false);
  const [sliced, setSliced] = useState(false);
  const [popped, setPopped] = useState<boolean[]>([false, false, false]);
  const [burstAt, setBurstAt] = useState<number | null>(null);
  const [openBalloon, setOpenBalloon] = useState<number | null>(null);
  const [musicOn, setMusicOn] = useState(false);
  const [muted, setMuted] = useState(false);

  const transitionRef = useRef(false);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const cakeRef = useRef<HTMLDivElement | null>(null);
  const [cakeH, setCakeH] = useState(260);
  const swipeStartY = useRef<number | null>(null);

  const knifeY = useMotionValue(0);
  const cutHeight = useTransform(knifeY, (v) => Math.max(0, v));

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // Measure the cake so knife travel scales with the responsive layout.
  useEffect(() => {
    const el = cakeRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setCakeH(el.offsetHeight || 260));
    ro.observe(el);
    return () => ro.disconnect();
  }, [stage]);

  // ---- GIMMICK 1: blow out candles ---------------------------------------
  const extinguish = useCallback((count: number, specific?: number) => {
    setLit((prev) => {
      if (!prev.some(Boolean)) return prev;
      const next = [...prev];
      if (typeof specific === "number") {
        if (!next[specific]) return prev;
        next[specific] = false;
        return next;
      }
      const litIdx = next.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
      for (let k = 0; k < count && litIdx.length > 0; k++) {
        const pick = Math.floor(Math.random() * litIdx.length);
        next[litIdx[pick]] = false;
        litIdx.splice(pick, 1);
      }
      return next;
    });
  }, []);

  const handleBlow = useCallback(
    (intensity: number) => {
      if (stage !== "wish" || transitionRef.current) return;
      extinguish(intensity > 0.75 ? 2 : 1);
    },
    [stage, extinguish],
  );

  const mic = useBlowDetector({ onBlow: handleBlow });

  const handleCandleHit = useCallback(
    (index: number) => {
      if (stage !== "wish" || transitionRef.current) return;
      unlockAudio();
      playSnuff();
      extinguish(1, index);
    },
    [stage, extinguish],
  );

  // Swipe across flames on touch screens: pointer is implicitly captured, so
  // we hit-test the element under the finger on every move.
  const handleCakePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (stage !== "wish" || e.buttons === 0) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const target = el?.closest?.("[data-candle]");
      if (target) {
        const idx = Number(target.getAttribute("data-candle"));
        if (Number.isFinite(idx)) handleCandleHit(idx);
      }
    },
    [stage, handleCandleHit],
  );

  // All candles out -> smoke, "fuu", then the room warms up.
  useEffect(() => {
    if (stage !== "wish" || lit.length === 0 || lit.some(Boolean) || transitionRef.current) return;
    transitionRef.current = true;
    playBlowOut();
    mic.stop();
    later(() => {
      setRoomLit(true);
      setStage("celebrate");
      setMusicOn(true);
      playChime();
    }, 1400);
  }, [lit, stage, later, mic]);

  // Keep the candle array in sync with the configured age.
  useEffect(() => {
    setLit((prev) => {
      if (prev.length === candleCount) return prev;
      const allLit = stage === "wish" && !transitionRef.current;
      return Array(candleCount).fill(allLit);
    });
  }, [candleCount, stage]);

  // Music-box melody fallback when no song link is configured.
  useEffect(() => {
    if (!musicOn || muted || data.musicUrl) return;
    const stopMelody = playBirthdayMelody(true);
    return stopMelody;
  }, [musicOn, muted, data.musicUrl]);

  // ---- GIMMICK 2: slice the cake -----------------------------------------
  const doSlice = useCallback(() => {
    if (sliced || stage !== "celebrate") return;
    setSliced(true);
    playSlice();
    later(() => playChime(), 650);
  }, [sliced, stage, later]);

  const knifeTravel = Math.max(120, cakeH * 0.78);

  const handleKnifeDragEnd = useCallback(() => {
    if (knifeY.get() > knifeTravel * 0.62) {
      animate(knifeY, knifeTravel, { duration: 0.15 });
      doSlice();
    } else {
      animate(knifeY, 0, { type: "spring", stiffness: 260, damping: 22 });
    }
  }, [knifeY, knifeTravel, doSlice]);

  // ---- GIMMICK 3: balloons -----------------------------------------------
  const popBalloon = useCallback(
    (i: number) => {
      if (onSelectField) onSelectField(3, `field-velvet-balloon-${i + 1}`);
      if (popped[i]) {
        setOpenBalloon(i);
        return;
      }
      unlockAudio();
      playPop();
      setBurstAt(i);
      setPopped((prev) => prev.map((v, idx) => (idx === i ? true : v)));
      later(() => {
        setBurstAt(null);
        setOpenBalloon(i);
      }, 320);
    },
    [popped, later, onSelectField],
  );

  // ---- Reset / replay ------------------------------------------------------
  const resetToWish = useCallback(() => {
    clearTimers();
    transitionRef.current = false;
    setStage("wish");
    setLit(Array(candleCount).fill(true));
    setRoomLit(false);
    setSliced(false);
    setPopped([false, false, false]);
    setOpenBalloon(null);
    setBurstAt(null);
    setMusicOn(false);
    knifeY.set(0);
  }, [candleCount, clearTimers, knifeY]);

  // Studio: jump the preview to the scene matching the active editor tab.
  useEffect(() => {
    if (!studio || activeScreen === undefined) return;
    clearTimers();
    setOpenBalloon(null);
    setBurstAt(null);
    if (activeScreen === 1) {
      transitionRef.current = false;
      setStage("wish");
      setLit(Array(candleCount).fill(true));
      setRoomLit(false);
      setSliced(false);
      knifeY.set(0);
    } else if (activeScreen === 2) {
      transitionRef.current = true;
      setStage("celebrate");
      setLit(Array(candleCount).fill(false));
      setRoomLit(true);
      setSliced(true);
    } else if (activeScreen === 3) {
      transitionRef.current = true;
      setStage("balloons");
      setRoomLit(true);
      setPopped([false, false, false]);
    } else if (activeScreen === 4) {
      transitionRef.current = true;
      setStage("finale");
      setRoomLit(true);
    }
    // candleCount intentionally excluded: handled by the sync effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio, activeScreen]);

  const edit = (tab: number, field: string) =>
    onSelectField
      ? {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          onSelectField(tab, field);
        },
        title: "คลิกเพื่อแก้ไข",
      }
      : {};
  const editCls = onSelectField ? EDIT_RING : "";

  const gold = "bg-gradient-to-b from-[#fbeec4] via-[#e2bd6b] to-[#a57a2c] bg-clip-text text-transparent";
  const plaqueText = data.age ? String(data.age) : visible(data.ageLabel) ? data.ageLabel.slice(0, 6) : "HBD";
  const allPopped = popped.every(Boolean);
  const anyPopped = popped.some(Boolean);

  const dust = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        left: seeded(i + 100) * 100,
        size: 2 + seeded(i + 200) * 4,
        delay: seeded(i + 300) * 6,
        duration: 6 + seeded(i + 400) * 6,
        drift: (seeded(i + 500) - 0.5) * 60,
      })),
    [],
  );

  return (
    <div className="relative h-full min-h-[600px] w-full select-none overflow-hidden bg-[#090406] font-serif text-amber-50">
      {/* ---------- Ambient room ---------- */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, #5a2f20 0%, #2a1410 45%, #120808 100%)",
        }}
        initial={false}
        animate={{ opacity: roomLit ? 1 : 0 }}
        transition={{ duration: 2.4, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 46%, rgba(255,176,90,0.30) 0%, rgba(255,140,60,0.10) 26%, rgba(0,0,0,0) 55%)",
        }}
        initial={false}
        animate={
          stage === "wish" && lit.some(Boolean)
            ? { opacity: [0.7, 1, 0.8, 0.95, 0.7] }
            : { opacity: roomLit ? 0.35 : 0 }
        }
        transition={
          stage === "wish" && lit.some(Boolean)
            ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 1.2 }
        }
      />
      {/* velvet tablecloth */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%]"
        style={{
          background: "linear-gradient(180deg, rgba(58,14,26,0.0) 0%, #2a0b14 18%, #14060a 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-[8%] bottom-[33%] h-px bg-gradient-to-r from-transparent via-amber-200/20 to-transparent" />
      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.75)_100%)]" />

      {/* ---------- Music ---------- */}
      {data.musicUrl ? (
        <BackgroundAudioPlayer url={data.musicUrl} isPlaying={musicOn && !muted} loop />
      ) : null}

      {/* ---------- Top controls ---------- */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4">
        {onSelectField ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectField(1, "field-velvet-music");
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/25 bg-black/40 px-3 py-1.5 font-sans text-[11px] font-semibold tracking-wide text-amber-100/80 backdrop-blur hover:ring-2 hover:ring-amber-300/60"
          >
            <Music className="h-3.5 w-3.5" />
            {data.musicUrl ? "เพลงประกอบ" : " "}
          </button>
        ) : (
          <span />
        )}
        {musicOn ? (
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}
            className="rounded-full border border-amber-200/25 bg-black/40 p-2 text-amber-100/80 backdrop-blur transition hover:bg-black/60"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        ) : (
          <span />
        )}
      </div>

      {/* ---------- WISH + CELEBRATE (shared cake) ---------- */}
      {(stage === "wish" || stage === "celebrate") && (
        <div className="relative z-10 flex h-full min-h-[600px] flex-col items-center justify-between px-5 pb-8 pt-14">
          {/* Header */}
          <div className="text-center">
            <AnimatePresence mode="wait">
              {stage === "wish" ? (
                <motion.div
                  key="wish-head"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.8 }}
                  className="space-y-2"
                >
                  {visible(data.cardTitle) && (
                    <p
                      {...edit(1, "field-velvet-title")}
                      className={`px-2 font-sans text-[11px] uppercase tracking-[0.45em] text-amber-200/60 ${editCls}`}
                    >
                      {data.cardTitle}
                    </p>
                  )}
                  <h1
                    {...edit(1, "field-velvet-name")}
                    className={`px-3 text-3xl font-light tracking-wide md:text-4xl ${gold} ${editCls}`}
                  >
                    {data.name}
                  </h1>
                </motion.div>
              ) : (
                <motion.div
                  key="celebrate-head"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, delay: 0.3 }}
                  className="space-y-2"
                >
                  <p className="font-sans text-[11px] uppercase tracking-[0.45em] text-amber-200/70">
                    {visible(data.cardTitle) ? data.cardTitle : "Happy Birthday"}
                  </p>
                  <h1
                    {...edit(1, "field-velvet-name")}
                    className={`px-3 text-3xl font-light tracking-wide md:text-4xl ${gold} ${editCls}`}
                  >
                    สุขสันต์วันเกิด {data.name}
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cake stage */}
          <div
            ref={cakeRef}
            className="relative aspect-[320/270] w-[min(84vw,380px)]"
            style={{ touchAction: stage === "wish" || (stage === "celebrate" && !sliced) ? "none" : "auto" }}
            onPointerMove={handleCakePointerMove}
            onPointerDown={(e) => {
              swipeStartY.current = e.clientY;
            }}
            onPointerUp={(e) => {
              if (stage === "celebrate" && !sliced && swipeStartY.current !== null) {
                if (e.clientY - swipeStartY.current > cakeH * 0.4) doSlice();
              }
              swipeStartY.current = null;
            }}
          >
            {!sliced ? (
              <VelvetCakeSvg
                lit={lit}
                plaqueText={plaqueText}
                candlesInteractive={stage === "wish"}
                onCandleHit={handleCandleHit}
                onPlaqueClick={onSelectField ? () => onSelectField(1, "field-velvet-age") : undefined}
                className="h-full w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
              />
            ) : (
              <>
                <motion.div
                  className="absolute inset-0"
                  style={{ clipPath: "inset(0 50% 0 0)", transformOrigin: "50% 100%" }}
                  initial={{ x: 0, rotate: 0 }}
                  animate={{ x: -38, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 90, damping: 15 }}
                >
                  <VelvetCakeSvg lit={lit} plaqueText={plaqueText} className="h-full w-full" />
                </motion.div>
                <motion.div
                  className="absolute inset-0"
                  style={{ clipPath: "inset(0 0 0 50%)", transformOrigin: "50% 100%" }}
                  initial={{ x: 0, rotate: 0 }}
                  animate={{ x: 38, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 90, damping: 15 }}
                >
                  <VelvetCakeSvg lit={lit} plaqueText={plaqueText} className="h-full w-full" />
                </motion.div>
              </>
            )}

            {/* Knife + cut line */}
            {stage === "celebrate" && !sliced && (
              <>
                <motion.div
                  className="pointer-events-none absolute left-1/2 top-[30%] w-[2px] -translate-x-1/2 bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 shadow-[0_0_10px_rgba(251,211,141,0.9)]"
                  style={{ height: cutHeight }}
                />
                <motion.div
                  role="button"
                  tabIndex={0}
                  aria-label="มีดตัดเค้ก"
                  drag="y"
                  dragConstraints={{ top: 0, bottom: knifeTravel }}
                  dragElastic={0.04}
                  dragMomentum={false}
                  onDragEnd={handleKnifeDragEnd}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      doSlice();
                    }
                  }}
                  style={{ y: knifeY, touchAction: "none" }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2, duration: 0.6 }}
                  className="absolute left-1/2 top-[-12%] z-20 -ml-[18px] cursor-grab active:cursor-grabbing"
                >
                  <svg width="36" height="128" viewBox="0 0 36 128" aria-hidden="true">
                    <defs>
                      <linearGradient id="velvet-knife-blade" x1="0" x2="1">
                        <stop offset="0%" stopColor="#fff6d6" />
                        <stop offset="45%" stopColor="#e8c873" />
                        <stop offset="100%" stopColor="#9c7428" />
                      </linearGradient>
                      <linearGradient id="velvet-knife-handle" x1="0" x2="1">
                        <stop offset="0%" stopColor="#1b0b10" />
                        <stop offset="50%" stopColor="#4a1a26" />
                        <stop offset="100%" stopColor="#1b0b10" />
                      </linearGradient>
                    </defs>
                    <rect x="10" y="2" width="16" height="44" rx="7" fill="url(#velvet-knife-handle)" />
                    <circle cx="18" cy="14" r="2" fill="#e8c873" />
                    <circle cx="18" cy="32" r="2" fill="#e8c873" />
                    <rect x="7" y="44" width="22" height="6" rx="2" fill="#c99a3f" />
                    <path d="M11 50 L27 50 L25 112 Q18 128 13 112 Z" fill="url(#velvet-knife-blade)" />
                    <path d="M13 54 L16 54 L15 108" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
                  </svg>
                </motion.div>
              </>
            )}

            {/* Secret card rising from inside the cake */}
            <AnimatePresence>
              {sliced && (
                <motion.div
                  key="secret-card"
                  initial={{ opacity: 0, y: 70, scale: 0.45 }}
                  animate={{ opacity: 1, y: -6, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 110, damping: 16 }}
                  className="absolute inset-x-[9%] top-[6%] z-20"
                >
                  <div
                    {...edit(2, "field-velvet-secret")}
                    className={`relative max-h-[230px] overflow-y-auto rounded-2xl border border-amber-300/60 bg-gradient-to-b from-[#fffaf0] to-[#f3e5c9] p-5 text-center text-[#3a1a12] shadow-[0_18px_50px_rgba(0,0,0,0.55),0_0_40px_rgba(251,211,141,0.25)] ${editCls}`}
                  >
                    <div className="pointer-events-none absolute inset-1.5 rounded-xl border border-amber-500/30" />
                    <Gift className="mx-auto h-6 w-6 text-[#a3344d]" strokeWidth={1.4} />
                    {visible(data.secretEyebrow) && (
                      <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.35em] text-[#9c7428]">
                        {data.secretEyebrow}
                      </p>
                    )}
                    {visible(data.secretTitle) && (
                      <h3 className="mt-1 text-lg font-semibold">{data.secretTitle}</h3>
                    )}
                    {visible(data.secretMessage) && (
                      <p className="mt-2 whitespace-pre-line font-sans text-sm leading-relaxed text-[#5a3328]">
                        {data.secretMessage}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex min-h-[110px] w-full max-w-sm flex-col items-center justify-end gap-3 text-center">
            <AnimatePresence mode="wait">
              {stage === "wish" && (
                <motion.div
                  key="wish-foot"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="flex flex-col items-center gap-3"
                >
                  {visible(data.wishPrompt) && (
                    <p
                      {...edit(2, "field-velvet-wish")}
                      className={`px-3 text-sm font-light leading-relaxed tracking-wide text-amber-200/85 ${editCls}`}
                    >
                      {data.wishPrompt}
                    </p>
                  )}

                  {mic.status === "listening" ? (
                    <div className="flex items-center gap-2 font-sans text-xs text-amber-100/70">
                      <Mic className="h-3.5 w-3.5 text-amber-300" />
                      <span>เป่าเบาๆ ที่ไมโครโฟนได้เลย</span>
                      <span className="relative h-1 w-16 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-200 to-amber-500 transition-[width] duration-100"
                          style={{ width: `${Math.round(mic.level * 100)}%` }}
                        />
                      </span>
                    </div>
                  ) : mic.status === "denied" || mic.status === "unsupported" ? (
                    <p className="flex items-center gap-1.5 font-sans text-xs text-amber-100/60">
                      <MicOff className="h-3.5 w-3.5" />
                      ไม่สามารถใช้ไมโครโฟนได้ แตะที่เปลวเทียนแทนได้เลย
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        unlockAudio();
                        void mic.start();
                      }}
                      disabled={mic.status === "requesting"}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-200/35 bg-white/[0.04] px-5 py-2.5 font-sans text-sm font-medium tracking-wide text-amber-100 backdrop-blur transition hover:border-amber-200/60 hover:bg-white/[0.08] disabled:opacity-60"
                    >
                      <Mic className="h-4 w-4" />
                      {mic.status === "requesting" ? "กำลังเปิดไมโครโฟน" : "เป่าเทียน"}
                    </button>
                  )}
                  <p className="font-sans text-[11px] tracking-wide text-amber-100/40">
                    หรือแตะ / ปาดนิ้วที่เปลวเทียน
                  </p>
                </motion.div>
              )}

              {stage === "celebrate" && !sliced && (
                <motion.p
                  key="slice-hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 1.4, duration: 0.8 }}
                  className="font-sans text-sm tracking-wide text-amber-100/75"
                >
                  ปาดมีดลงผ่านเค้ก เพื่อดูสิ่งที่ซ่อนอยู่ข้างใน
                </motion.p>
              )}

              {stage === "celebrate" && sliced && (
                <motion.button
                  key="to-balloons"
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 1.6, duration: 0.6 }}
                  onClick={() => {
                    setStage("balloons");
                    if (onSelectField) onSelectField(3);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#e8c873] via-[#f6e2a6] to-[#c99a3f] px-6 py-3 font-sans text-sm font-semibold tracking-wide text-[#3a1a0a] shadow-[0_8px_30px_rgba(232,200,115,0.35)] transition hover:brightness-105"
                >
                  ไปเปิดลูกโป่ง
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ---------- BALLOONS ---------- */}
      {stage === "balloons" && (
        <div className="relative z-10 flex h-full min-h-[600px] flex-col items-center justify-between px-5 pb-8 pt-14">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-2 text-center"
          >
            <p className="font-sans text-[11px] uppercase tracking-[0.45em] text-amber-200/70">Wishes for you</p>
            <h2 className={`text-2xl font-light md:text-3xl ${gold}`}>แตะลูกโป่งดูสิ</h2>
          </motion.div>

          <div className="relative flex w-full max-w-md flex-1 items-end justify-around pb-6">
            {data.balloons.map((b, i) => {
              const style = BALLOON_STYLES[i];
              return (
                <div key={`balloon-${i}`} className="relative flex w-1/3 justify-center" style={{ marginBottom: `${(i % 2) * 48}px` }}>
                  <AnimatePresence>
                    {!popped[i] && (
                      <motion.button
                        type="button"
                        aria-label={`ลูกโป่งที่ ${i + 1}`}
                        onClick={() => popBalloon(i)}
                        initial={{ y: 420, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0, transition: { duration: 0.14 } }}
                        transition={{ duration: 2.6 + i * 0.4, delay: i * 0.35, ease: [0.2, 0.8, 0.3, 1] }}
                        className={`relative focus:outline-none ${onSelectField ? "rounded-full hover:ring-2 hover:ring-amber-300/60" : ""}`}
                      >
                        <motion.div
                          animate={{ y: [0, -12, 0], rotate: [-2, 2, -2] }}
                          transition={{ duration: 4 + i * 0.7, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <svg width="96" height="168" viewBox="0 0 96 168" aria-hidden="true">
                            <defs>
                              <radialGradient id={`velvet-balloon-${i}`} cx="35%" cy="30%" r="75%">
                                <stop offset="0%" stopColor={style.from} />
                                <stop offset="55%" stopColor={style.via} />
                                <stop offset="100%" stopColor={style.to} />
                              </radialGradient>
                            </defs>
                            <path
                              d="M48 116 C 72 116 90 88 90 58 C 90 28 72 6 48 6 C 24 6 6 28 6 58 C 6 88 24 116 48 116 Z"
                              fill={`url(#velvet-balloon-${i})`}
                            />
                            <ellipse cx="32" cy="34" rx="9" ry="15" fill="rgba(255,255,255,0.35)" transform="rotate(-20 32 34)" />
                            <path d="M43 116 L53 116 L50 123 L46 123 Z" fill={style.to} />
                            <path
                              d="M48 123 C 42 135 54 145 47 156 C 44 161 49 165 48 168"
                              stroke={style.string}
                              strokeWidth="1.2"
                              fill="none"
                            />
                          </svg>
                        </motion.div>
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {popped[i] && burstAt !== i && (
                    <button
                      type="button"
                      onClick={() => popBalloon(i)}
                      className="mt-auto inline-flex items-center gap-1.5 rounded-full border border-amber-200/30 bg-black/30 px-3 py-1.5 font-sans text-[11px] text-amber-100/80 backdrop-blur hover:bg-black/50"
                    >
                      <Sparkles className="h-3 w-3" />
                      {visible(b.title) ? b.title : `คำอวยพรที่ ${i + 1}`}
                    </button>
                  )}

                  {/* Pop shards */}
                  {burstAt === i && (
                    <div className="pointer-events-none absolute left-1/2 top-12">
                      {Array.from({ length: 10 }).map((_, s) => {
                        const angle = (s / 10) * Math.PI * 2;
                        return (
                          <motion.span
                            key={`shard-${s}`}
                            className="absolute h-2 w-1.5 rounded-sm"
                            style={{ background: style.shard }}
                            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                            animate={{
                              x: Math.cos(angle) * 70,
                              y: Math.sin(angle) * 70 + 20,
                              opacity: 0,
                              rotate: 180,
                            }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex min-h-[56px] items-end">
            <AnimatePresence>
              {anyPopped && openBalloon === null && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: allPopped ? 0.2 : 0.6 }}
                  onClick={() => {
                    setStage("finale");
                    if (onSelectField) onSelectField(4);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#e8c873] via-[#f6e2a6] to-[#c99a3f] px-6 py-3 font-sans text-sm font-semibold tracking-wide text-[#3a1a0a] shadow-[0_8px_30px_rgba(232,200,115,0.35)] transition hover:brightness-105"
                >
                  <Images className="h-4 w-4" />
                  ลองดูนี่
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ---------- FINALE ---------- */}
      {stage === "finale" && (
        <div className="relative z-10 h-full min-h-[600px] overflow-y-auto px-5 pb-12 pt-16">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-8">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9 }}
              className="space-y-2 text-center"
            >
              <Cake className="mx-auto h-6 w-6 text-amber-300/80" strokeWidth={1.3} />
              {visible(data.finaleTitle) && (
                <h2
                  {...edit(4, "field-velvet-finale-title")}
                  className={`px-3 text-3xl font-light md:text-4xl ${gold} ${editCls}`}
                >
                  {data.finaleTitle}
                </h2>
              )}
              <p className="font-sans text-sm tracking-[0.3em] text-amber-100/60">{data.name}</p>
            </motion.div>

            <div className="grid w-full grid-cols-2 gap-5 px-2">
              {data.photos.map((src, i) => (
                <motion.div
                  key={`photo-${i}`}
                  initial={{ opacity: 0, y: 24, rotate: 0 }}
                  animate={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -3 : 3 }}
                  transition={{ delay: 0.3 + i * 0.15, duration: 0.8 }}
                  {...edit(4, `field-velvet-photo-${i + 1}`)}
                  className={`rounded-md bg-[#fbf7ef] p-2 pb-7 shadow-[0_0_28px_rgba(251,211,141,0.28),0_12px_30px_rgba(0,0,0,0.5)] ${onSelectField ? "cursor-pointer hover:ring-2 hover:ring-amber-300/70" : ""}`}
                >
                  <div className="aspect-square w-full overflow-hidden rounded-sm bg-gradient-to-br from-[#3a1420] to-[#140609]">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt={`ความทรงจำ ${i + 1}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-amber-200/40">
                        <Images className="h-6 w-6" strokeWidth={1.2} />
                        <span className="font-sans text-[10px] tracking-widest">MEMORY {i + 1}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {(data.paragraphs.length > 0 || visible(data.finaleSign)) && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.9 }}
                {...edit(4, "field-velvet-finale-msg")}
                className={`relative w-full rounded-2xl border border-amber-200/20 bg-white/[0.04] p-6 text-left backdrop-blur-sm ${editCls}`}
              >
                <div className="space-y-3 font-sans text-[15px] leading-relaxed text-amber-50/85">
                  {data.paragraphs.map((p, i) => (
                    <p key={`para-${i}`} className="whitespace-pre-line">
                      {p}
                    </p>
                  ))}
                </div>
                {visible(data.finaleSign) && (
                  <p className={`mt-5 text-right text-lg italic ${gold}`}>{data.finaleSign}</p>
                )}
              </motion.div>
            )}

            <button
              type="button"
              onClick={resetToWish}
              className="inline-flex items-center gap-2 rounded-full border border-amber-200/35 px-6 py-2.5 font-sans text-sm tracking-wide text-amber-100/85 transition hover:border-amber-200/60 hover:bg-white/[0.05]"
            >
              <RotateCcw className="h-4 w-4" />
              เป่าเทียนอีกครั้ง
            </button>
          </div>
        </div>
      )}

      {/* ---------- Celebration gold dust ---------- */}
      {roomLit && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {dust.map((d, i) => (
            <motion.span
              key={`dust-${i}`}
              className="absolute top-[-4%] rounded-full bg-amber-200"
              style={{
                left: `${d.left}%`,
                width: d.size,
                height: d.size,
                boxShadow: "0 0 8px rgba(253,224,160,0.9)",
              }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: ["0vh", "105vh"], x: [0, d.drift], opacity: [0, 0.9, 0.9, 0] }}
              transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: "linear" }}
            />
          ))}
        </div>
      )}

      {/* ---------- Balloon message card ---------- */}
      <AnimatePresence>
        {openBalloon !== null && (
          <motion.div
            key="balloon-modal"
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenBalloon(null)}
          >
            <motion.div
              initial={{ scale: 0.7, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 160, damping: 18 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xs rounded-2xl border border-amber-300/60 bg-gradient-to-b from-[#fffaf0] to-[#f1e2c4] p-5 text-center text-[#3a1a12] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            >
              <div className="pointer-events-none absolute inset-1.5 rounded-xl border border-amber-500/30" />
              <button
                type="button"
                onClick={() => setOpenBalloon(null)}
                aria-label="ปิด"
                className="absolute right-3 top-3 rounded-full p-1 text-[#7a5a3a] hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
              <div
                {...edit(3, `field-velvet-balloon-${openBalloon + 1}`)}
                className={onSelectField ? "cursor-pointer rounded-lg hover:ring-2 hover:ring-amber-400/60" : ""}
              >
                {data.balloons[openBalloon]?.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.balloons[openBalloon].photo}
                    alt="ภาพความทรงจำ"
                    className="mb-3 aspect-[4/3] w-full rounded-lg object-cover"
                  />
                ) : (
                  <Sparkles className="mx-auto mb-2 h-6 w-6 text-[#b08a3e]" strokeWidth={1.4} />
                )}
                {visible(data.balloons[openBalloon]?.title) && (
                  <h3 className="text-lg font-semibold">{data.balloons[openBalloon].title}</h3>
                )}
                {visible(data.balloons[openBalloon]?.message) && (
                  <p className="mt-2 whitespace-pre-line font-sans text-sm leading-relaxed text-[#5a3328]">
                    {data.balloons[openBalloon].message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpenBalloon(null)}
                className="mt-4 rounded-full border border-[#b08a3e]/50 px-5 py-1.5 font-sans text-xs font-semibold tracking-wide text-[#6a4a26] hover:bg-[#b08a3e]/10"
              >
                ปิด
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

