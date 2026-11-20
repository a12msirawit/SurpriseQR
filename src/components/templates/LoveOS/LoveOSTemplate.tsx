"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Delete,
  FileHeart,
  FileVideo,
  Folder,
  Heart,
  LayoutGrid,
  Loader2,
  Minus,
  Music,
  Pause,
  Play,
  Power,
  Search,
  Sparkles,
  Square,
  User,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from "lucide-react";
import type { SurpriseQRData } from "@/types/templates";
import { isYouTubeUrl, extractYouTubeId } from "@/lib/audio-helper";

export interface LoveOSTemplateProps {
  config?: Partial<SurpriseQRData>;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

type LoveOSStage = "login" | "desktop" | "error" | "letter" | "video";

const FLOATING_HEARTS = [
  { left: "6%", size: 15, dur: 19, delay: -2, color: "#f472b6" },
  { left: "15%", size: 12, dur: 23, delay: -8, color: "#c084fc" },
  { left: "24%", size: 17, dur: 20, delay: -13, color: "#fb7185" },
  { left: "35%", size: 13, dur: 25, delay: -5, color: "#f9a8d4" },
  { left: "47%", size: 15, dur: 21, delay: -16, color: "#e879f9" },
  { left: "58%", size: 16, dur: 22, delay: -9, color: "#f472b6" },
  { left: "69%", size: 12, dur: 24, delay: -3, color: "#fda4af" },
  { left: "79%", size: 16, dur: 19, delay: -14, color: "#c084fc" },
  { left: "88%", size: 14, dur: 23, delay: -7, color: "#fb7185" },
  { left: "94%", size: 15, dur: 20, delay: -11, color: "#f9a8d4" },
];

const DODGE_TAUNTS = [
  "แน่ใจหรอ?",
  "กดไม่ทันหรอก",
  "หนีแล้วนะ",
  "กด Yes เถอะนะ",
  "ไม่ให้กดหรอก",
];

function playStartupChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    // Classic warm Windows-like startup chord arpeggio
    const notes = [392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.075;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.09, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.68);
    });
  } catch {
    // ignore Web Audio autoplay restrictions
  }
}

async function burstLoveConfetti() {
  try {
    const { default: confetti } = await import("canvas-confetti");
    confetti({
      particleCount: 70,
      spread: 75,
      origin: { y: 0.58 },
      colors: ["#f472b6", "#c084fc", "#fb7185", "#fde68a", "#ffffff"],
    });
    window.setTimeout(() => {
      confetti({
        particleCount: 45,
        angle: 60,
        spread: 55,
        origin: { x: 0.12, y: 0.65 },
        colors: ["#f472b6", "#c084fc", "#fda4af"],
      });
      confetti({
        particleCount: 45,
        angle: 120,
        spread: 55,
        origin: { x: 0.88, y: 0.65 },
        colors: ["#f472b6", "#c084fc", "#fda4af"],
      });
    }, 220);
  } catch {
    // ignore confetti failure
  }
}

export default function LoveOSTemplate({
  config,
  studio = false,
  activeScreen,
  expectedPin,
  onSelectField,
}: LoveOSTemplateProps) {
  const settings = config?.settings;
  const content = config?.content;

  const targetPin = (expectedPin || settings?.pinCode || "1234").trim() || "1234";
  const accountName = content?.title || "My Favorite Person";
  const avatarSrc = content?.finale?.heroImage?.src || "";
  const secretFileName = content?.menu?.card1Title || "Secret_For_You.love";
  const videoFileName = content?.songMedia?.sectionTitle || "Our_Video.mp4";
  const videoSrc = content?.songMedia?.src || "";
  const isYtVideo = Boolean(videoSrc && isYouTubeUrl(videoSrc));
  const ytVideoPlayerId = isYtVideo ? extractYouTubeId(videoSrc) : null;
  const errorTitle = content?.menu?.title || "ตรวจพบความรักเกินพิกัด!";
  const errorMessage =
    content?.menu?.card1Desc ||
    "ไฟล์นี้มีความรู้สึกพิเศษที่แอบเก็บไว้ให้เธอ ต้องการเปิดอ่านเลยไหม?";
  const yesLabel = content?.menu?.card2Title || "Yes";
  const cancelLabel = content?.menu?.card3Title || "Cancel";
  const songTitle = content?.songMedia?.songTitle || "Our Love Song";
  const musicSrc = content?.bgMusic?.src || content?.songMedia?.audioSrc || "";
  const letterTitle = content?.letter?.title || "ถึงคนพิเศษที่สุดของฉัน";
  const letterParagraphs =
    content?.letter?.paragraphs && content.letter.paragraphs.length > 0
      ? content.letter.paragraphs
      : [
          "ขอบคุณที่เข้ามาเป็นเรื่องราวดีๆ ในทุกวันของฉันนะ",
          "ไม่ว่าจะเหนื่อยแค่ไหน แค่ได้เห็นรอยยิ้มของเธอก็หายเหนื่อยทันทีเลย",
        ];
  const galleryTitle = content?.memories?.sectionTitle || "Our Favorite Moments";
  const galleryDesc =
    content?.memories?.description || "ทุกภาพคือความทรงจำที่ฉันอยากเก็บไว้ตลอดไป";
  const photos = useMemo(
    () =>
      (content?.memories?.polaroidImages ?? [])
        .map((item) => item?.src?.trim() || "")
        .filter(Boolean),
    [content?.memories?.polaroidImages]
  );
  const finaleMain = content?.finale?.mainText || "Love You Always";
  const finaleSub = content?.finale?.subText || "อยู่ด้วยกันไปนานๆ นะ";

  const [stage, setStage] = useState<LoveOSStage>("login");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [clockText, setClockText] = useState("23:06");
  const [dateShort, setDateShort] = useState("20/11/2569");
  const [dateLong, setDateLong] = useState("วันศุกร์ที่ 20 พฤศจิกายน");
  const [dodgePos, setDodgePos] = useState({ x: 0, y: 0 });
  const [dodgeCount, setDodgeCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [loveIconPos, setLoveIconPos] = useState({ x: 0, y: 0 });
  const [videoIconPos, setVideoIconPos] = useState({ x: 0, y: 124 });

  const desktopRef = useRef<HTMLDivElement | null>(null);
  const draggingIconRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const isYtMusic = Boolean(musicSrc && isYouTubeUrl(musicSrc));
  const ytVideoId = isYtMusic ? extractYouTubeId(musicSrc) : null;

  // Live Windows clock & date
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClockText(
        now.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
      setDateShort(
        now.toLocaleDateString("th-TH", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      );
      setDateLong(
        now.toLocaleDateString("th-TH", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      );
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);

  // Sync Studio activeScreen -> stage
  useEffect(() => {
    if (!studio || activeScreen === undefined) return;
    if (activeScreen === 1) setStage("login");
    else if (activeScreen === 2) setStage("desktop");
    else if (activeScreen === 3) setStage("error");
    else if (activeScreen >= 4) setStage("letter");
  }, [studio, activeScreen]);

  const stopSynthLoop = useCallback(() => {
    if (synthTimerRef.current) {
      window.clearInterval(synthTimerRef.current);
      synthTimerRef.current = null;
    }
  }, []);

  const startSynthLoop = useCallback(() => {
    stopSynthLoop();
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];
      let step = 0;
      const playNote = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = melody[step % melody.length];
        step += 1;
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.07, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
      };
      playNote();
      synthTimerRef.current = window.setInterval(playNote, 700);
    } catch {
      // ignore audio error
    }
  }, [stopSynthLoop]);

  useEffect(() => {
    return () => {
      stopSynthLoop();
      if (audioRef.current) audioRef.current.pause();
    };
  }, [stopSynthLoop]);

  const startMusic = useCallback(() => {
    setIsPlaying(true);
    if (isYtMusic) {
      stopSynthLoop();
      return;
    }
    if (musicSrc) {
      stopSynthLoop();
      if (audioRef.current) {
        audioRef.current.src = musicSrc;
        audioRef.current.volume = 0.5;
        void audioRef.current.play().catch(() => {});
      }
      return;
    }
    startSynthLoop();
  }, [isYtMusic, musicSrc, startSynthLoop, stopSynthLoop]);

  const toggleMusic = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      stopSynthLoop();
      if (audioRef.current) audioRef.current.pause();
    } else {
      startMusic();
    }
  }, [isPlaying, startMusic, stopSynthLoop]);

  const attemptLogin = useCallback(
    (code: string) => {
      if (loggingIn) return;
      if (code === targetPin) {
        setLoggingIn(true);
        playStartupChime();
        window.setTimeout(() => {
          setLoggingIn(false);
          setStage("desktop");
          setPinInput("");
        }, 720);
      } else {
        setPinError(true);
        window.setTimeout(() => {
          setPinInput("");
          setPinError(false);
        }, 650);
      }
    },
    [loggingIn, targetPin]
  );

  const handlePinDigit = useCallback(
    (digit: string) => {
      if (loggingIn || pinInput.length >= targetPin.length) return;
      const next = pinInput + digit;
      setPinInput(next);
      setPinError(false);
      if (next.length === targetPin.length) {
        attemptLogin(next);
      }
    },
    [loggingIn, pinInput, targetPin.length, attemptLogin]
  );

  // Real keyboard typing on Windows sign-in screen
  useEffect(() => {
    if (stage !== "login" || studio) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handlePinDigit(e.key);
      } else if (e.key === "Backspace") {
        setPinInput((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter" && pinInput.length > 0) {
        attemptLogin(pinInput);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stage, studio, handlePinDigit, attemptLogin, pinInput]);

  const dodgeCancel = useCallback(
    (e?: React.SyntheticEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setDodgeCount((c) => c + 1);
      const rangeX = 115;
      const rangeY = 72;
      let nx = Math.round((Math.random() * 2 - 1) * rangeX);
      let ny = Math.round((Math.random() * 2 - 1) * rangeY);
      if (Math.abs(nx - dodgePos.x) < 48) nx = dodgePos.x > 0 ? -rangeX + 18 : rangeX - 18;
      if (Math.abs(ny - dodgePos.y) < 32) ny = dodgePos.y > 0 ? -rangeY + 14 : rangeY - 14;
      setDodgePos({ x: nx, y: ny });
    },
    [dodgePos.x, dodgePos.y]
  );

  const handleOpenYes = useCallback(() => {
    startMusic();
    void burstLoveConfetti();
    setStage("letter");
  }, [startMusic]);

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

  const activeCancelText =
    dodgeCount === 0
      ? cancelLabel
      : DODGE_TAUNTS[(dodgeCount - 1) % DODGE_TAUNTS.length];

  return (
    <div
      className="relative flex h-full min-h-[100dvh] w-full flex-col overflow-hidden select-none text-white"
      style={{
        background:
          "radial-gradient(ellipse at 25% 15%, rgba(236,72,153,0.42), transparent 52%), radial-gradient(ellipse at 82% 80%, rgba(124,58,237,0.45), transparent 54%), radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.22), transparent 62%), linear-gradient(155deg, #0b0d24 0%, #1d113a 48%, #341345 100%)",
      }}
    >
      {/* Hidden audio */}
      <audio ref={audioRef} loop playsInline className="hidden" />
      {isPlaying && isYtMusic && ytVideoId && (
        <iframe
          title="Love OS Background Music"
          src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&loop=1&playlist=${ytVideoId}&enablejsapi=1`}
          allow="autoplay; encrypted-media"
          className="pointer-events-none fixed -left-[9999px] h-px w-px opacity-0"
        />
      )}

      {/* Windows Lock-Screen Wallpaper Blur Layer */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-all duration-700 ${
          stage === "login"
            ? "bg-black/28 backdrop-blur-xl"
            : "bg-transparent backdrop-blur-none"
        }`}
      />

      {/* Slow Floating Hearts Background across ALL screens */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
        {FLOATING_HEARTS.map((h, idx) => (
          <motion.div
            key={idx}
            initial={{ y: "106vh", opacity: 0, x: 0 }}
            animate={{
              y: "-12vh",
              opacity: [0, 0.5, 0.42, 0],
              x: [0, 16, -12, 8],
            }}
            transition={{
              duration: h.dur,
              delay: h.delay,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ position: "absolute", left: h.left }}
          >
            <Heart
              style={{ width: h.size, height: h.size, color: h.color, fill: h.color }}
              className="drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]"
            />
          </motion.div>
        ))}
      </div>

      {/* Main OS Screen Area */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {/* STAGE 1: AUTHENTIC WINDOWS 10/11 SIGN-IN SCREEN */}
          {stage === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.4 }}
              className="relative flex flex-1 flex-col items-center justify-center px-5 py-8"
            >
              {/* Top-center Windows Lock Clock */}
              <div className="mb-6 text-center">
                <p className="text-5xl font-light tracking-tight text-white drop-shadow sm:text-6xl">
                  {clockText}
                </p>
                <p className="mt-1 text-sm font-medium text-white/80">{dateLong}</p>
              </div>

              {/* Windows User Profile + Password Input */}
              <motion.div
                animate={pinError ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className="flex w-full max-w-[310px] flex-col items-center text-center"
              >
                <div
                  data-studio-focus="field-loveos-avatar"
                  title={studio ? "คลิกเพื่อแก้ไขรูปโปรไฟล์หน้าล็อกอิน" : undefined}
                  onClick={(e) => handleStudioSelect(e, 1, "field-loveos-avatar")}
                  className="mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-white/55 bg-white/15 shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-md"
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={accountName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-14 w-14 text-white/90" />
                  )}
                </div>

                <h1
                  data-studio-focus="field-loveos-user"
                  title={studio ? "คลิกเพื่อแก้ไขชื่อบัญชีหน้าล็อกอิน" : undefined}
                  onClick={(e) => handleStudioSelect(e, 1, "field-loveos-user")}
                  className="text-2xl font-semibold tracking-tight text-white drop-shadow"
                >
                  {accountName}
                </h1>

                {loggingIn ? (
                  <div className="mt-6 flex items-center gap-2.5 text-sm font-medium text-white/90">
                    <Loader2 className="h-5 w-5 animate-spin text-pink-300" />
                    <span>ยินดีต้อนรับ...</span>
                  </div>
                ) : (
                  <>
                    {/* Real Windows Password Box with submit arrow */}
                    <div
                      data-studio-focus="field-loveos-pin"
                      title={studio ? "คลิกเพื่อแก้ไขรหัสผ่านปลดล็อก" : undefined}
                      onClick={(e) => handleStudioSelect(e, 1, "field-loveos-pin")}
                      className={`mt-5 flex h-11 w-full items-center overflow-hidden rounded-md border bg-[#1b1b26]/75 shadow-lg backdrop-blur-md transition ${
                        pinError
                          ? "border-rose-400 ring-2 ring-rose-400/40"
                          : "border-white/35 focus-within:border-pink-400"
                      }`}
                    >
                      <div className="flex flex-1 items-center gap-2 px-3.5">
                        {pinInput.length === 0 ? (
                          <span className="text-sm text-white/55">PIN</span>
                        ) : (
                          Array.from({ length: pinInput.length }).map((_, i) => (
                            <span
                              key={i}
                              className="h-2.5 w-2.5 rounded-full bg-white shadow"
                            />
                          ))
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label="เข้าสู่ระบบ"
                        onClick={() => attemptLogin(pinInput)}
                        className="flex h-full w-10 items-center justify-center border-l border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                    {pinError && (
                      <p className="mt-2 text-xs font-medium text-rose-300">
                        รหัสผ่านไม่ถูกต้อง ลองใหม่อีกครั้ง
                      </p>
                    )}

                    {/* Clean compact numeric pad for touch/mobile */}
                    <div className="mt-4 grid w-full max-w-[228px] grid-cols-3 gap-2">
                      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handlePinDigit(num)}
                          className="flex h-10 items-center justify-center rounded-md border border-white/15 bg-white/10 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPinInput("")}
                        className="flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 text-xs font-semibold text-white/80 transition hover:bg-white/15"
                      >
                        C
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePinDigit("0")}
                        className="flex h-10 items-center justify-center rounded-md border border-white/15 bg-white/10 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        aria-label="ลบตัวเลข"
                        onClick={() => setPinInput((prev) => prev.slice(0, -1))}
                        className="flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/15"
                      >
                        <Delete className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>

              {/* Windows Lock Screen Bottom-Right System Icons */}
              <div className="pointer-events-none absolute bottom-5 right-6 flex items-center gap-4 text-white/80">
                <Wifi className="h-4 w-4" />
                <Volume2 className="h-4 w-4" />
                <Power className="h-4 w-4" />
              </div>
            </motion.div>
          )}

          {/* STAGE 2: REAL WINDOWS DESKTOP WITH DRAGGABLE SECRET FILE + VIDEO FILE */}
          {stage === "desktop" && (
            <motion.div
              ref={desktopRef}
              key="desktop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative flex-1 overflow-hidden p-6 sm:p-8"
            >
              {/* Authentic Desktop Shortcut 1: Secret Love File (Draggable anywhere) */}
              <motion.button
                type="button"
                drag
                dragConstraints={desktopRef}
                dragMomentum={false}
                dragElastic={0.05}
                initial={false}
                animate={{ x: loveIconPos.x, y: loveIconPos.y }}
                onDragStart={() => {
                  draggingIconRef.current = true;
                }}
                onDragEnd={(_, info) => {
                  setLoveIconPos((prev) => ({
                    x: prev.x + info.offset.x,
                    y: prev.y + info.offset.y,
                  }));
                  window.setTimeout(() => {
                    draggingIconRef.current = false;
                  }, 120);
                }}
                whileHover={{ scale: 1.04 }}
                whileDrag={{ scale: 1.08, zIndex: 30, cursor: "grabbing" }}
                onClick={(e) => {
                  if (draggingIconRef.current) return;
                  if (studio && onSelectField) {
                    handleStudioSelect(e, 2, "field-loveos-filename");
                    return;
                  }
                  setDodgePos({ x: 0, y: 0 });
                  setDodgeCount(0);
                  setStage("error");
                }}
                data-studio-focus="field-loveos-filename"
                title={studio ? "คลิกเพื่อแก้ไขชื่อไฟล์ลับ (ลากย้ายตำแหน่งได้)" : "เปิดไฟล์ (ลากย้ายได้)"}
                className="group absolute left-6 top-6 flex w-28 cursor-grab flex-col items-center gap-1.5 rounded-lg border border-transparent p-2.5 text-center transition-colors hover:border-white/30 hover:bg-white/15 focus:border-sky-300/60 focus:bg-sky-400/20 focus:outline-none active:cursor-grabbing sm:left-8 sm:top-8"
              >
                <div className="pointer-events-none relative flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400/30 via-fuchsia-500/25 to-violet-500/35 shadow-[0_8px_24px_rgba(236,72,153,0.35)] ring-1 ring-pink-200/40">
                  <FileHeart className="h-10 w-10 text-pink-100 drop-shadow-[0_2px_8px_rgba(236,72,153,0.75)]" />
                  <Sparkles className="absolute -right-1.5 -top-1.5 h-4 w-4 animate-pulse text-amber-200" />
                </div>
                <span className="pointer-events-none max-w-full break-words rounded px-1.5 py-0.5 text-xs font-medium leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                  {secretFileName}
                </span>
              </motion.button>

              {/* Authentic Desktop Shortcut 2: Video File (Draggable anywhere) */}
              <motion.button
                type="button"
                drag
                dragConstraints={desktopRef}
                dragMomentum={false}
                dragElastic={0.05}
                initial={false}
                animate={{ x: videoIconPos.x, y: videoIconPos.y }}
                onDragStart={() => {
                  draggingIconRef.current = true;
                }}
                onDragEnd={(_, info) => {
                  setVideoIconPos((prev) => ({
                    x: prev.x + info.offset.x,
                    y: prev.y + info.offset.y,
                  }));
                  window.setTimeout(() => {
                    draggingIconRef.current = false;
                  }, 120);
                }}
                whileHover={{ scale: 1.04 }}
                whileDrag={{ scale: 1.08, zIndex: 30, cursor: "grabbing" }}
                onClick={(e) => {
                  if (draggingIconRef.current) return;
                  if (studio && onSelectField) {
                    handleStudioSelect(e, 2, "field-loveos-video-src");
                    return;
                  }
                  if (isPlaying) {
                    setIsPlaying(false);
                    stopSynthLoop();
                    if (audioRef.current) audioRef.current.pause();
                  }
                  setStage("video");
                }}
                data-studio-focus="field-loveos-video-name"
                title={studio ? "คลิกเพื่อแก้ไขไฟล์วิดีโอ (ลากย้ายตำแหน่งได้)" : "เปิดไฟล์วิดีโอ (ลากย้ายได้)"}
                className="group absolute left-6 top-6 flex w-28 cursor-grab flex-col items-center gap-1.5 rounded-lg border border-transparent p-2.5 text-center transition-colors hover:border-white/30 hover:bg-white/15 focus:border-sky-300/60 focus:bg-sky-400/20 focus:outline-none active:cursor-grabbing sm:left-8 sm:top-8"
              >
                <div className="pointer-events-none relative flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/30 via-indigo-500/25 to-violet-500/35 shadow-[0_8px_24px_rgba(99,102,241,0.35)] ring-1 ring-sky-200/40">
                  <FileVideo className="h-10 w-10 text-sky-100 drop-shadow-[0_2px_8px_rgba(56,189,248,0.7)]" />
                </div>
                <span className="pointer-events-none max-w-full break-words rounded px-1.5 py-0.5 text-xs font-medium leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                  {videoFileName}
                </span>
              </motion.button>
            </motion.div>
          )}

          {/* STAGE 5: WINDOWS VIDEO PLAYER WINDOW */}
          {stage === "video" && (
            <motion.div
              key="video"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
              className="flex flex-1 items-center justify-center p-3 sm:p-6"
            >
              <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/20 bg-[#141122]/95 shadow-[0_28px_85px_rgba(0,0,0,0.72)] backdrop-blur-2xl">
                <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/10 bg-[#231d36] pl-3.5 pr-1">
                  <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-white/95">
                    <FileVideo className="h-4 w-4 shrink-0 text-sky-300" />
                    <span className="truncate">{videoFileName}</span>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      aria-label="ย่อหน้าต่าง"
                      onClick={() => setStage("desktop")}
                      className="flex h-8 w-9 items-center justify-center text-white/70 transition hover:bg-white/10"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="flex h-8 w-9 items-center justify-center text-white/50">
                      <Square className="h-3 w-3" />
                    </span>
                    <button
                      type="button"
                      aria-label="ปิดหน้าต่างวิดีโอ"
                      onClick={() => setStage("desktop")}
                      className="flex h-8 w-10 items-center justify-center rounded-tr-lg text-white/80 transition hover:bg-rose-600 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div
                  data-studio-focus="field-loveos-video-src"
                  title={studio ? "คลิกเพื่อแก้ไขไฟล์วิดีโอ" : undefined}
                  onClick={(e) => handleStudioSelect(e, 2, "field-loveos-video-src")}
                  className="relative flex aspect-video w-full items-center justify-center bg-black"
                >
                  {ytVideoPlayerId ? (
                    <iframe
                      title={videoFileName}
                      src={`https://www.youtube.com/embed/${ytVideoPlayerId}?autoplay=1&rel=0`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  ) : videoSrc ? (
                    <video
                      src={videoSrc}
                      controls
                      autoPlay
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80">
                      <Play className="ml-1 h-7 w-7 fill-white/80" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* STAGE 3: AUTHENTIC WINDOWS ERROR DIALOG + DODGING CANCEL BUTTON */}
          {stage === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 26 }}
              className="relative flex flex-1 items-center justify-center p-4"
            >
              {/* Background Desktop Shortcut still visible behind dialog */}
              <div className="pointer-events-none absolute left-6 top-6 hidden flex-col items-center gap-1.5 opacity-60 sm:flex">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10">
                  <FileHeart className="h-8 w-8 text-pink-200" />
                </div>
                <span className="text-[11px] text-white/80">{secretFileName}</span>
              </div>

              {/* Real Windows Dialog Window */}
              <div className="relative w-full max-w-[430px] overflow-visible rounded-xl border border-white/25 bg-[#1e1b2e]/95 shadow-[0_26px_70px_rgba(0,0,0,0.68)] backdrop-blur-2xl">
                {/* Windows Titlebar with Min / Max / Close */}
                <div className="flex h-9 items-center justify-between rounded-t-xl border-b border-white/10 bg-[#27223a] pl-3.5 pr-1 text-xs font-medium text-white/90">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                    <span className="truncate">{secretFileName}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="flex h-7 w-9 items-center justify-center text-white/50">
                      <Minus className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex h-7 w-9 items-center justify-center text-white/50">
                      <Square className="h-3 w-3" />
                    </span>
                    <button
                      type="button"
                      aria-label="ปิดหน้าต่าง"
                      onClick={dodgeCancel}
                      className="flex h-7 w-10 items-center justify-center rounded-tr-lg text-white/80 transition hover:bg-rose-600 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Windows MessageBox Body */}
                <div className="flex items-start gap-4 px-6 py-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-500/20 ring-2 ring-rose-400/50">
                    <AlertCircle className="h-7 w-7 text-rose-400" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <h2
                      data-studio-focus="field-loveos-err-title"
                      title={studio ? "คลิกเพื่อแก้ไขหัวข้อหน้าต่าง Error" : undefined}
                      onClick={(e) => handleStudioSelect(e, 3, "field-loveos-err-title")}
                      className="text-base font-bold text-white"
                    >
                      {errorTitle}
                    </h2>
                    <p
                      data-studio-focus="field-loveos-err-msg"
                      title={studio ? "คลิกเพื่อแก้ไขข้อความในป๊อปอัป Error" : undefined}
                      onClick={(e) => handleStudioSelect(e, 3, "field-loveos-err-msg")}
                      className="mt-1.5 text-sm leading-relaxed text-slate-200/90"
                    >
                      {errorMessage}
                    </p>
                  </div>
                </div>

                {/* Windows Dialog Footer Bar */}
                <div className="relative flex min-h-[68px] items-center justify-end gap-3 rounded-b-xl border-t border-white/10 bg-[#161324]/90 px-5 py-3.5">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    data-studio-focus="field-loveos-yes-btn"
                    title={studio ? "คลิกเพื่อแก้ไขปุ่ม Yes" : undefined}
                    onClick={(e) => {
                      if (studio && onSelectField) {
                        handleStudioSelect(e, 3, "field-loveos-yes-btn");
                        return;
                      }
                      handleOpenYes();
                    }}
                    className="z-10 inline-flex min-w-[96px] items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-pink-900/40 transition hover:brightness-110"
                  >
                    <Heart className="h-3.5 w-3.5 fill-white" />
                    <span>{yesLabel}</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    animate={{ x: dodgePos.x, y: dodgePos.y }}
                    transition={{ type: "spring", stiffness: 460, damping: 22 }}
                    onMouseEnter={() => {
                      if (!studio) dodgeCancel();
                    }}
                    onTouchStart={(e) => {
                      if (!studio) dodgeCancel(e);
                    }}
                    onClick={(e) => {
                      if (studio && onSelectField) {
                        handleStudioSelect(e, 3, "field-loveos-cancel-btn");
                        return;
                      }
                      dodgeCancel(e);
                    }}
                    data-studio-focus="field-loveos-cancel-btn"
                    title={studio ? "คลิกเพื่อแก้ไขปุ่ม Cancel" : undefined}
                    className="z-20 min-w-[92px] rounded-md border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/20"
                  >
                    {activeCancelText}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STAGE 4: REAL WINDOWS APPLICATION WINDOW (LETTER + SCROLLABLE PHOTOS) */}
          {stage === "letter" && (
            <motion.div
              key="letter"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-1 items-center justify-center p-2.5 sm:p-5"
            >
              <div className="flex h-[calc(100dvh-4.75rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/20 bg-[#181426]/92 shadow-[0_28px_85px_rgba(0,0,0,0.68)] backdrop-blur-2xl">
                {/* Real Windows App Titlebar */}
                <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/10 bg-[#231d36] pl-3.5 pr-1">
                  <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-white/95">
                    <FileHeart className="h-4 w-4 shrink-0 text-pink-400" />
                    <span className="truncate">{secretFileName}</span>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        if (studio && onSelectField) {
                          handleStudioSelect(e, 4, "field-loveos-song-title");
                          return;
                        }
                        toggleMusic();
                      }}
                      data-studio-focus="field-loveos-song-title"
                      title={
                        studio
                          ? "คลิกเพื่อแก้ไขเพลงประกอบ"
                          : isPlaying
                            ? "หยุดเพลง"
                            : "เล่นเพลง"
                      }
                      className="mr-2 inline-flex max-w-[175px] items-center gap-1.5 rounded-full border border-pink-300/30 bg-pink-500/15 px-2.5 py-1 text-[11px] font-semibold text-pink-100 transition hover:bg-pink-500/25"
                    >
                      {isPlaying ? (
                        <Pause className="h-3 w-3 shrink-0" />
                      ) : (
                        <Play className="h-3 w-3 shrink-0" />
                      )}
                      <Music className="h-3 w-3 shrink-0 text-pink-300" />
                      <span className="truncate">{songTitle}</span>
                    </button>
                    <button
                      type="button"
                      aria-label="ย่อหน้าต่าง"
                      onClick={() => {
                        if (!studio) setStage("desktop");
                      }}
                      className="flex h-8 w-9 items-center justify-center text-white/70 transition hover:bg-white/10"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="flex h-8 w-9 items-center justify-center text-white/50">
                      <Square className="h-3 w-3" />
                    </span>
                    <button
                      type="button"
                      aria-label="ปิดหน้าต่าง"
                      onClick={() => {
                        if (!studio) setStage("desktop");
                      }}
                      className="flex h-8 w-10 items-center justify-center rounded-tr-lg text-white/80 transition hover:bg-rose-600 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content: Letter -> Photos Below -> Closing */}
                <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-7 sm:px-9">
                  {/* 1. Letter Section */}
                  <div className="rounded-2xl border border-pink-200/20 bg-gradient-to-b from-white/10 to-pink-500/10 p-6 shadow-inner sm:p-8">
                    <div className="mb-4 flex items-center gap-2 text-pink-300">
                      <Heart className="h-5 w-5 fill-pink-400 text-pink-300" />
                      <Sparkles className="h-4 w-4 text-amber-200" />
                    </div>
                    <h2
                      data-studio-focus="field-loveos-letter-title"
                      title={studio ? "คลิกเพื่อแก้ไขหัวข้อข้อความความรู้สึก" : undefined}
                      onClick={(e) => handleStudioSelect(e, 4, "field-loveos-letter-title")}
                      className="text-2xl font-black leading-snug text-white sm:text-3xl"
                    >
                      {letterTitle}
                    </h2>

                    <div
                      data-studio-focus="field-loveos-letter-body"
                      title={studio ? "คลิกเพื่อแก้ไขข้อความความรู้สึก" : undefined}
                      onClick={(e) => handleStudioSelect(e, 4, "field-loveos-letter-body")}
                      className="mt-5 space-y-4 text-base leading-relaxed text-pink-50/95"
                    >
                      {letterParagraphs.map((para, idx) => (
                        <p key={idx} className="whitespace-pre-line">
                          {para}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Scroll down cue */}
                  {photos.length > 0 && (
                    <div className="my-6 flex justify-center text-pink-200/75">
                      <motion.div
                        animate={{ y: [0, 6, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                      >
                        <ChevronDown className="h-5 w-5" />
                      </motion.div>
                    </div>
                  )}

                  {/* 2. Scrollable Photo Memories Gallery */}
                  {photos.length > 0 && (
                    <div className="mt-2">
                      <div className="mb-5 text-center">
                        <h3
                          data-studio-focus="field-loveos-gallery-title"
                          title={studio ? "คลิกเพื่อแก้ไขหัวข้อแกลเลอรีรูปภาพ" : undefined}
                          onClick={(e) => handleStudioSelect(e, 5, "field-loveos-gallery-title")}
                          className="text-xl font-black text-pink-100"
                        >
                          {galleryTitle}
                        </h3>
                        {galleryDesc && (
                          <p
                            data-studio-focus="field-loveos-gallery-desc"
                            title={studio ? "คลิกเพื่อแก้ไขคำบรรยายแกลเลอรี" : undefined}
                            onClick={(e) => handleStudioSelect(e, 5, "field-loveos-gallery-desc")}
                            className="mt-1 text-sm text-pink-200/80"
                          >
                            {galleryDesc}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {photos.map((src, idx) => (
                          <motion.button
                            key={`${src}-${idx}`}
                            type="button"
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            whileHover={{ scale: 1.025 }}
                            onClick={(e) => {
                              if (studio && onSelectField) {
                                handleStudioSelect(e, 5, `field-loveos-photo-${idx}`);
                                return;
                              }
                              setLightboxSrc(src);
                            }}
                            data-studio-focus={`field-loveos-photo-${idx}`}
                            title={studio ? `คลิกเพื่อแก้ไขรูปที่ ${idx + 1}` : "ดูภาพขนาดใหญ่"}
                            className="group overflow-hidden rounded-xl border border-white/20 bg-white/10 p-2 text-left shadow-[0_14px_34px_rgba(0,0,0,0.35)] backdrop-blur-md transition"
                          >
                            <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-black/30">
                              <img
                                src={src}
                                alt={`ความทรงจำที่ ${idx + 1}`}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Closing Card */}
                  <div className="mt-8 rounded-2xl border border-pink-300/25 bg-gradient-to-r from-pink-500/20 via-fuchsia-500/20 to-violet-500/20 p-6 text-center">
                    <p
                      data-studio-focus="field-loveos-finale-main"
                      title={studio ? "คลิกเพื่อแก้ไขข้อความปิดท้าย" : undefined}
                      onClick={(e) => handleStudioSelect(e, 5, "field-loveos-finale-main")}
                      className="text-2xl font-black text-white"
                    >
                      {finaleMain}
                    </p>
                    <p
                      data-studio-focus="field-loveos-finale-sub"
                      title={studio ? "คลิกเพื่อแก้ไขคำลงท้าย" : undefined}
                      onClick={(e) => handleStudioSelect(e, 5, "field-loveos-finale-sub")}
                      className="mt-1.5 text-sm font-medium text-pink-100/90"
                    >
                      {finaleSub}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Authentic Windows 11 Frosted Acrylic Taskbar (visible after login) */}
      {stage !== "login" && (
        <footer className="relative z-20 flex h-12 shrink-0 items-center justify-between border-t border-white/15 bg-[#12101f]/82 px-3 backdrop-blur-2xl">
          {/* Left: subtle status */}
          <div className="hidden items-center gap-2 text-xs font-medium text-white/75 sm:flex">
            <Heart className="h-4 w-4 fill-pink-400 text-pink-300" />
          </div>

          {/* Center: Windows Start + Search + Explorer + Active Window */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Start"
              onClick={() => {
                if (!studio) setStage("desktop");
              }}
              className="flex h-9 w-9 items-center justify-center rounded-md text-sky-300 transition hover:bg-white/12"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <div className="hidden h-8 w-36 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 text-xs text-white/60 md:flex">
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
            </div>
            <button
              type="button"
              aria-label="Files"
              onClick={() => {
                if (!studio) setStage("desktop");
              }}
              className="flex h-9 w-9 items-center justify-center rounded-md text-amber-300 transition hover:bg-white/12"
            >
              <Folder className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label={secretFileName}
              onClick={() => {
                if (!studio && stage === "desktop") {
                  setDodgePos({ x: 0, y: 0 });
                  setDodgeCount(0);
                  setStage("error");
                }
              }}
              className={`relative flex h-9 w-9 items-center justify-center rounded-md text-pink-300 transition hover:bg-white/12 ${
                stage === "error" || stage === "letter" ? "bg-white/15" : ""
              }`}
            >
              <FileHeart className="h-5 w-5" />
              {(stage === "error" || stage === "letter") && (
                <span className="absolute bottom-0.5 h-1 w-4 rounded-full bg-pink-400" />
              )}
            </button>
            <button
              type="button"
              aria-label={videoFileName}
              onClick={() => {
                if (!studio) setStage("video");
              }}
              className={`relative flex h-9 w-9 items-center justify-center rounded-md text-sky-300 transition hover:bg-white/12 ${
                stage === "video" ? "bg-white/15" : ""
              }`}
            >
              <FileVideo className="h-5 w-5" />
              {stage === "video" && (
                <span className="absolute bottom-0.5 h-1 w-4 rounded-full bg-sky-400" />
              )}
            </button>
          </div>

          {/* Right: Windows System Tray */}
          <div className="flex items-center gap-2.5 text-white/85">
            <ChevronUp className="hidden h-3.5 w-3.5 text-white/60 sm:block" />
            <Wifi className="hidden h-4 w-4 sm:block" />
            <button
              type="button"
              onClick={toggleMusic}
              aria-label={isPlaying ? "ปิดเสียงเพลง" : "เปิดเสียงเพลง"}
              className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/12"
            >
              {isPlaying ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <span className="hidden text-[11px] font-semibold text-white/80 sm:inline">TH</span>
            <div className="flex flex-col items-end leading-tight">
              <span className="font-mono text-[11px] font-semibold text-white">{clockText}</span>
              <span className="font-mono text-[10px] text-white/70">{dateShort}</span>
            </div>
          </div>
        </footer>
      )}

      {/* Photo Lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxSrc(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] max-w-2xl overflow-hidden rounded-xl border border-white/25 bg-[#181426] p-2.5 shadow-2xl"
            >
              <button
                type="button"
                aria-label="ปิดภาพ"
                onClick={() => setLightboxSrc(null)}
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/75 text-white transition hover:bg-black"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={lightboxSrc}
                alt="ภาพความทรงจำขนาดใหญ่"
                className="max-h-[78vh] w-full rounded-lg object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
