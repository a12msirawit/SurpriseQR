"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cake,
  ChevronLeft,
  ChevronRight,
  Crown,
  Delete,
  Flame,
  Gift,
  Heart,
  Lock,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Wind,
  X,
  ZoomIn,
} from "lucide-react";
import { extractYouTubeId } from "@/lib/audio-helper";
import { submitCardReaction, verifyCardPin } from "@/app/c/[hash_id]/actions";
import BackgroundAudioPlayer from "@/components/audio/BackgroundAudioPlayer";
import CandleStageCanvas from "./blow-candles/CandleStageCanvas";
import CelebrationLayer from "./blow-candles/CelebrationLayer";
import EnchantedGalaCanvas from "./blow-candles/EnchantedGalaCanvas";
import {
  FiligreeGalaFrame,
  RoyalBirthdayMandala,
} from "./blow-candles/RoyalBirthdayDecor";
import ScratchFoil from "./blow-candles/ScratchFoil";
import {
  playCandleExtinguish,
  playCandleIgnite,
  playCelebrationFanfare,
  playCountdownTick,
  playGiftOpenChime,
  playWarpShimmer,
  playWindWhoosh,
  startBirthdayMusicBox,
  unlockBlowAudio,
} from "./blow-candles/blowCandlesSound";
import type {
  BlowCandlesConfig,
  BlowCandlesStage,
  BlowCandlesTemplateProps,
} from "./blow-candles/types";
import { useAudioBlowDetection } from "./blow-candles/useAudioBlowDetection";

const WISH_TYPEWRITER_TEXT =
  "หลับตาลงช้า ๆ แล้วตั้งคำอธิษฐานที่ดีที่สุดสำหรับปีใหม่ของชีวิตในวันนี้";

const DEFAULT_MEMORY_PHOTOS = [
  "/templates/galaxy-1.png",
  "/templates/galaxy-2.png",
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

function triggerHaptic(pattern: number | number[]) {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  ) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore unsupported haptic hardware
    }
  }
}

interface GlowMedallionProps {
  icon: React.ReactNode;
  caption: string;
  onClick?: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
  tone?: "gold" | "rose" | "sky" | "glass";
  size?: "md" | "lg";
  activeRing?: boolean;
  pulseScale?: number;
  disabled?: boolean;
  ariaLabel?: string;
}

function GlowMedallion({
  icon,
  caption,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  tone = "gold",
  size = "lg",
  activeRing = false,
  pulseScale = 0,
  disabled = false,
  ariaLabel,
}: GlowMedallionProps) {
  const toneStyles = {
    gold: {
      ring: "border-amber-200/70 shadow-[0_0_36px_rgba(251,191,36,0.42),inset_0_1px_10px_rgba(255,255,255,0.5)]",
      core: "from-amber-200/40 via-rose-400/25 to-[#1f0a2c]/85 text-amber-50",
      halo: "border-amber-300/45",
    },
    rose: {
      ring: "border-rose-300/70 shadow-[0_0_36px_rgba(244,63,94,0.45),inset_0_1px_10px_rgba(255,255,255,0.45)]",
      core: "from-rose-300/40 via-fuchsia-500/30 to-[#24092d]/85 text-rose-50",
      halo: "border-rose-300/45",
    },
    sky: {
      ring: "border-sky-200/70 shadow-[0_0_32px_rgba(56,189,248,0.4),inset_0_1px_10px_rgba(255,255,255,0.45)]",
      core: "from-sky-300/35 via-indigo-500/30 to-slate-950/85 text-sky-50",
      halo: "border-sky-300/45",
    },
    glass: {
      ring: "border-amber-200/30 shadow-[0_12px_30px_rgba(0,0,0,0.5),inset_0_1px_8px_rgba(255,255,255,0.28)]",
      core: "from-white/18 via-white/5 to-black/65 text-amber-50",
      halo: "border-amber-200/25",
    },
  }[tone];

  const dim = size === "lg" ? "h-[64px] w-[64px]" : "h-14 w-14";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown?.();
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          onPointerUp?.();
        }}
        onPointerLeave={() => onPointerLeave?.()}
        onPointerCancel={() => onPointerLeave?.()}
        disabled={disabled}
        aria-label={ariaLabel || caption}
        className={`group relative flex ${dim} items-center justify-center rounded-full border bg-gradient-to-br backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 ${toneStyles.ring} ${toneStyles.core}`}
      >
        <span
          className={`pointer-events-none absolute -inset-2 rounded-full border transition-transform duration-150 ${toneStyles.halo} ${activeRing ? "animate-ping" : "group-hover:scale-110"
            }`}
          style={{
            transform:
              pulseScale > 0
                ? `scale(${1 + Math.min(0.45, pulseScale * 0.45)})`
                : undefined,
            animationDuration: activeRing ? "1.6s" : undefined,
          }}
        />
        <span className="pointer-events-none absolute inset-1.5 rounded-full border border-dashed border-white/30 transition-transform duration-700 group-hover:rotate-45" />
        <span className="relative z-10">{icon}</span>
      </button>
      <span className="pointer-events-none max-w-[140px] text-center text-[11px] font-medium tracking-wide text-amber-100/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
        {caption}
      </span>
    </div>
  );
}

export default function BlowCandlesTemplate({
  config,
  data,
  studio = false,
  activeScreen,
  refreshToken = 0,
  expectedPin = "",
  hashId = "",
  pinRequired = false,
  onSelectField,
}: BlowCandlesTemplateProps) {
  const configObj = useMemo<BlowCandlesConfig>(
    () =>
      config && typeof config === "object"
        ? (config as BlowCandlesConfig)
        : {},
    [config]
  );

  const recipientName =
    configObj.recipientName ||
    configObj.data?.recipientName ||
    data?.recipientName ||
    "คนพิเศษ";
  const senderName =
    configObj.senderName || configObj.data?.senderName || "จากใจคนพิเศษ";
  const introHeadline =
    configObj.introHeadline || configObj.data?.introHeadline || "ค่ำคืนแห่งคำอธิษฐาน";
  const introPrompt =
    configObj.introPrompt || configObj.data?.introPrompt || WISH_TYPEWRITER_TEXT;
  const introButtonCaption =
    configObj.introButtonCaption ||
    configObj.data?.introButtonCaption ||
    "แตะเริ่มอธิษฐานและเป่าเทียน";
  const blowingHeadline =
    configObj.blowingHeadline ||
    configObj.data?.blowingHeadline ||
    "เป่าลมดับเทียนทั้ง 5 เล่ม";
  const celebrationHeadline =
    configObj.celebrationHeadline ||
    configObj.data?.celebrationHeadline ||
    "คำอธิษฐานส่องสว่างแล้ว";
  const celebrationHint =
    configObj.celebrationHint ||
    configObj.data?.celebrationHint ||
    "แตะลูกโป่งหรือท้องฟ้าเพื่อจุดพลุฉลอง";
  const revealButtonCaption =
    configObj.revealButtonCaption ||
    configObj.data?.revealButtonCaption ||
    "แตะเปิดกล่องความลับในเค้ก";
  const letterTitle =
    configObj.letterTitle ||
    configObj.data?.letterTitle ||
    `สาส์นอวยพรถึง ${recipientName}`;
  const closingButtonCaption =
    configObj.closingButtonCaption ||
    configObj.data?.closingButtonCaption ||
    "ชมการ์ดความทรงจำปิดท้าย";
  const closingBadge =
    configObj.closingBadge ||
    configObj.data?.closingBadge ||
    "Birthday Keepsake";
  const closingTitle =
    configObj.closingTitle ||
    configObj.data?.closingTitle ||
    `Happy Birthday ${recipientName}`;
  const wishMessage =
    configObj.wishMessage ||
    configObj.data?.wishMessage ||
    data?.wishMessage ||
    "ขอให้ความปรารถนาดีทุกอย่างในค่ำคืนนี้สว่างไสวและเป็นจริงในเร็ววัน";
  const letterText =
    configObj.message ||
    configObj.data?.message ||
    "สุขสันต์วันเกิดนะ! ขอบคุณที่เป็นความสุขและเรื่องราวดี ๆ เสมอมา ขอให้ปีนี้เต็มไปด้วยรอยยิ้ม ความอบอุ่น และความสำเร็จในทุกก้าวที่ตั้งใจไว้";
  const bgmUrl = configObj.audio_url || data?.audio_url || undefined;
  const videoUrl = (
    configObj.videoUrl ||
    configObj.video_url ||
    configObj.data?.videoUrl ||
    ""
  ).trim();
  const youtubeVideoId = extractYouTubeId(videoUrl);
  const photos = useMemo(() => extractPhotos(configObj), [configObj]);
  const displayPhotos = useMemo(() => {
    if (photos.length >= 2) return photos.slice(0, 2);
    if (photos.length === 1) return [photos[0], DEFAULT_MEMORY_PHOTOS[1]];
    return DEFAULT_MEMORY_PHOTOS;
  }, [photos]);
  const lightboxPhotos = photos.length > 0 ? photos : DEFAULT_MEMORY_PHOTOS;

  const [stage, setStage] = useState<BlowCandlesStage>(() =>
    pinRequired && !studio ? "pin" : "intro"
  );
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const [warpPhase, setWarpPhase] = useState<"idle" | "out" | "in">("idle");
  const [warpWhisper, setWarpWhisper] = useState(
    "กำลังเข้าสู่บทถัดไปของค่ำคืนพิเศษ..."
  );
  const [muted, setMuted] = useState<boolean>(studio);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinChecking, setPinChecking] = useState(false);

  const [typedCount, setTypedCount] = useState(0);
  const [countdownValue, setCountdownValue] = useState(3);
  const [litCandles, setLitCandles] = useState<boolean[]>([
    true,
    true,
    true,
    true,
    true,
  ]);
  const [touchWind, setTouchWind] = useState(0);
  const [touchBlowing, setTouchBlowing] = useState(false);
  const [cakeOpened, setCakeOpened] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState<number | null>(null);
  const [poppedBalloons, setPoppedBalloons] = useState(0);
  const [burstSignal, setBurstSignal] = useState(0);
  const [loveSending, setLoveSending] = useState(false);
  const [loveSent, setLoveSent] = useState(false);
  const [flashBurst, setFlashBurst] = useState(false);

  const dropTimerRef = useRef<number | null>(null);
  const touchHoldTimerRef = useRef<number | null>(null);
  const warpTimersRef = useRef<{ mid?: number; end?: number }>({});
  const warpBusyRef = useRef(false);

  const clearWarpTimers = () => {
    if (warpTimersRef.current.mid) window.clearTimeout(warpTimersRef.current.mid);
    if (warpTimersRef.current.end) window.clearTimeout(warpTimersRef.current.end);
  };

  /**
   * Execute slow, silky celestial hyperspace warp between sequential chapters.
   */
  const triggerStageWarp = useCallback(
    (
      nextStage: BlowCandlesStage,
      options?: {
        whisper?: string;
        outMs?: number;
        inMs?: number;
        extraOnSwap?: () => void;
      }
    ) => {
      if (warpBusyRef.current) return;
      warpBusyRef.current = true;
      clearWarpTimers();

      const outMs = options?.outMs ?? 680;
      const inMs = options?.inMs ?? 780;
      setWarpWhisper(
        options?.whisper ?? "กำลังพาคุณเข้าสู่ช่วงเวลาถัดไปอย่างช้า ๆ..."
      );
      playWarpShimmer(mutedRef.current);
      setWarpPhase("out");

      warpTimersRef.current.mid = window.setTimeout(() => {
        options?.extraOnSwap?.();
        setStage(nextStage);
        setWarpPhase("in");

        warpTimersRef.current.end = window.setTimeout(() => {
          setWarpPhase("idle");
          warpBusyRef.current = false;
        }, inMs);
      }, outMs);
    },
    []
  );

  // Sync Studio preview strictly with editor step selection
  useEffect(() => {
    if (!studio && !activeScreen) return;
    warpBusyRef.current = false;
    setWarpPhase("idle");
    if (refreshToken > 0 && studio) {
      setLitCandles([true, true, true, true, true]);
    }
    if (!activeScreen) return;
    if (activeScreen === 1) {
      setCakeOpened(false);
      setStage("intro");
    } else if (activeScreen === 2) {
      setStage("blowing");
    } else if (activeScreen === 3) {
      setCakeOpened(true);
      setStage("reveal_layer");
    } else if (activeScreen >= 4) {
      setCakeOpened(true);
      setStage("viral_closing");
    }
  }, [activeScreen, refreshToken, studio]);

  // Built-in celestial music-box Happy Birthday melody when no custom track is configured
  useEffect(() => {
    if (bgmUrl || studio || !audioUnlocked) return;
    const stopMusicBox = startBirthdayMusicBox(
      () => !mutedRef.current && stageRef.current !== "pin"
    );
    return () => {
      stopMusicBox();
    };
  }, [bgmUrl, studio, audioUnlocked]);

  // Intro typewriter prompt
  useEffect(() => {
    if (stage !== "intro") return;
    setTypedCount(0);
    const id = window.setInterval(() => {
      setTypedCount((prev) => {
        if (prev >= introPrompt.length) {
          window.clearInterval(id);
          return prev;
        }
        return prev + 1;
      });
    }, 34);
    return () => window.clearInterval(id);
  }, [stage, introPrompt]);

  // Countdown 3 -> 2 -> 1 -> blowing
  useEffect(() => {
    if (stage !== "countdown") return;
    setCountdownValue(3);
    playCountdownTick(3, mutedRef.current);
    triggerHaptic(24);

    const t1 = window.setTimeout(() => {
      setCountdownValue(2);
      playCountdownTick(2, mutedRef.current);
      triggerHaptic(24);
    }, 950);
    const t2 = window.setTimeout(() => {
      setCountdownValue(1);
      playCountdownTick(1, mutedRef.current);
      triggerHaptic(24);
    }, 1900);
    const t3 = window.setTimeout(() => {
      playCountdownTick(0, mutedRef.current);
      setStage("blowing");
    }, 2850);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [stage]);

  // Slow twilight smoke & wish ascent drop before fireworks celebration
  const enterExtinguishDrop = useCallback(() => {
    setStage("extinguish_drop");
    playWindWhoosh(0.95, mutedRef.current);
    triggerHaptic([30, 50, 30]);

    if (dropTimerRef.current !== null) {
      window.clearTimeout(dropTimerRef.current);
    }
    dropTimerRef.current = window.setTimeout(() => {
      setFlashBurst(true);
      setBurstSignal((b) => b + 1);
      setStage("grand_celebration");
      playCelebrationFanfare(mutedRef.current);
      triggerHaptic([40, 40, 80]);
      window.setTimeout(() => setFlashBurst(false), 850);
    }, 1650);
  }, []);

  useEffect(() => {
    return () => {
      clearWarpTimers();
      if (dropTimerRef.current !== null) window.clearTimeout(dropTimerRef.current);
      if (touchHoldTimerRef.current !== null) {
        window.clearInterval(touchHoldTimerRef.current);
      }
    };
  }, []);

  const ensureAudioReady = () => {
    unlockBlowAudio();
    setAudioUnlocked(true);
  };

  const extinguishNextCandle = useCallback(() => {
    setLitCandles((prev) => {
      const idx = prev.findIndex(Boolean);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = false;
      const remaining = next.filter(Boolean).length;
      playCandleExtinguish(remaining, mutedRef.current);
      triggerHaptic(20);
      if (remaining === 0) {
        enterExtinguishDrop();
      }
      return next;
    });
  }, [enterExtinguishDrop]);

  const extinguishSpecificCandle = useCallback(
    (index: number) => {
      ensureAudioReady();
      if (stage !== "blowing") return;

      setLitCandles((prev) => {
        if (!prev[index]) return prev;
        const next = [...prev];
        next[index] = false;
        const remaining = next.filter(Boolean).length;
        playCandleExtinguish(remaining, mutedRef.current);
        triggerHaptic(25);
        if (remaining === 0) {
          enterExtinguishDrop();
        }
        return next;
      });
    },
    [stage, enterExtinguishDrop]
  );

  const { micActive, micLevel, micError, startMic, stopMic } =
    useAudioBlowDetection({
      enabled: stage === "blowing",
      onBlowDetected: () => {
        extinguishNextCandle();
      },
    });

  const handleTouchHoldStart = () => {
    if (stage !== "blowing") return;
    ensureAudioReady();
    setTouchBlowing(true);
    setTouchWind(78);
    triggerHaptic([28, 40, 28]);

    if (touchHoldTimerRef.current !== null) {
      window.clearInterval(touchHoldTimerRef.current);
    }
    extinguishNextCandle();
    touchHoldTimerRef.current = window.setInterval(() => {
      extinguishNextCandle();
    }, 320);
  };

  const handleTouchHoldEnd = () => {
    setTouchBlowing(false);
    setTouchWind(0);
    if (touchHoldTimerRef.current !== null) {
      window.clearInterval(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
  };

  const blowAllCandles = () => {
    if (stage !== "blowing") return;
    ensureAudioReady();
    stopMic();
    setLitCandles([false, false, false, false, false]);
    enterExtinguishDrop();
  };

  const replayExperience = () => {
    ensureAudioReady();
    stopMic();
    playCandleIgnite(mutedRef.current);
    triggerStageWarp("intro", {
      whisper: "กำลังจุดเทียนวิเศษขึ้นใหม่อีกครั้ง...",
      outMs: 650,
      inMs: 750,
      extraOnSwap: () => {
        setLitCandles([true, true, true, true, true]);
        setCakeOpened(false);
        setLoveSent(false);
        setPoppedBalloons(0);
      },
    });
  };

  const handlePinKey = async (digit: string) => {
    ensureAudioReady();
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
            playCandleIgnite(mutedRef.current);
            triggerStageWarp("intro", {
              whisper: "ปลดล็อกสำเร็จ กำลังเปิดม่านค่ำคืนแห่งคำอธิษฐาน...",
              outMs: 650,
              inMs: 750,
            });
            return;
          }
          setPinError(result.error || "รหัส PIN ไม่ถูกต้อง");
        } else if (expectedPin && nextPin === expectedPin) {
          playCandleIgnite(mutedRef.current);
          triggerStageWarp("intro", {
            whisper: "ปลดล็อกสำเร็จ กำลังเปิดม่านค่ำคืนแห่งคำอธิษฐาน...",
            outMs: 650,
            inMs: 750,
          });
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

  const handleSendLoveBack = async () => {
    if (loveSending) return;
    ensureAudioReady();
    setLoveSending(true);
    playCelebrationFanfare(mutedRef.current);
    setBurstSignal((b) => b + 1);
    triggerHaptic([30, 40, 30]);
    if (hashId && !studio) {
      try {
        await submitCardReaction(hashId, "heart", "เป่าเค้กวันเกิดแล้วนะ!");
      } catch {
        // Keep UI responsive even if reaction request fails
      }
    }
    setLoveSent(true);
    setLoveSending(false);
  };

  const letterParagraphs = useMemo(() => {
    const parts = letterText
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : [letterText];
  }, [letterText]);

  const effectiveWind = Math.max(micLevel, touchWind) / 100;
  const litCount = litCandles.filter(Boolean).length;
  const isWarping = warpPhase !== "idle";
  const showCelebration =
    stage === "grand_celebration" ||
    stage === "reveal_layer" ||
    stage === "viral_closing";

  const stageOrderIndex =
    stage === "intro"
      ? 0
      : stage === "countdown" || stage === "blowing"
        ? 1
        : stage === "extinguish_drop" || stage === "grand_celebration"
          ? 2
          : stage === "reveal_layer"
            ? 3
            : stage === "viral_closing"
              ? 4
              : -1;

  const constellationSteps: Array<{
    id: BlowCandlesStage;
    label: string;
    icon: React.ReactNode;
  }> = [
      { id: "intro", label: "อธิษฐาน", icon: <Sparkles className="h-3.5 w-3.5" /> },
      { id: "blowing", label: "เป่าเทียน", icon: <Wind className="h-3.5 w-3.5" /> },
      {
        id: "grand_celebration",
        label: "เฉลิมฉลอง",
        icon: <Crown className="h-3.5 w-3.5" />,
      },
      { id: "reveal_layer", label: "ความลับ", icon: <Gift className="h-3.5 w-3.5" /> },
      {
        id: "viral_closing",
        label: "บันทึกความสุข",
        icon: <Heart className="h-3.5 w-3.5" />,
      },
    ];

  const handleEditableClick = (
    e: React.MouseEvent,
    tabIndex: number,
    fieldId?: string
  ) => {
    if (!studio) return;
    e.stopPropagation();
    onSelectField?.(tabIndex, fieldId);
  };

  return (
    <div
      className={`relative flex ${studio ? "min-h-full" : "min-h-[100dvh]"
        } w-full flex-col items-center justify-between overflow-x-hidden overflow-y-hidden bg-[#06020e] px-4 py-3 sm:py-4 text-white select-none`}
    >
      {bgmUrl && !studio && (
        <BackgroundAudioPlayer url={bgmUrl} isPlaying={!muted} loop />
      )}

      {/* Rich Deep Velvet & Aurora Volumetric Nebula Backdrop (Never bare!) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,#321048_0%,#150724_48%,#06020e_100%)]" />
      <motion.div
        animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.09, 1] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-24 left-1/2 h-80 w-96 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.22)_0%,rgba(244,114,182,0.12)_48%,transparent_75%)] blur-2xl"
      />
      <motion.div
        animate={{ opacity: [0.25, 0.48, 0.25], x: [-18, 18, -18] }}
        transition={{ duration: 10.5, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -bottom-24 left-1/2 h-80 w-[440px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(244,114,182,0.22)_0%,rgba(168,85,247,0.14)_50%,transparent_76%)] blur-2xl"
      />

      {/* Interactive Volumetric Lighting, Sparkler Trails, Fireworks & Warp Streaks */}
      <EnchantedGalaCanvas
        litCount={litCount}
        isWarping={isWarping}
        celebrationActive={showCelebration}
        extinguishAscent={stage === "extinguish_drop"}
        muted={muted}
        burstTrigger={burstSignal}
      />

      {/* Ornate Double Art-Deco Rose-Gold Perimeter Frame */}
      <FiligreeGalaFrame />

      {/* Confetti & Poppable 3D Metallic Balloons */}
      <CelebrationLayer
        active={showCelebration}
        muted={muted}
        burstSignal={burstSignal}
        onBalloonPop={(count) => setPoppedBalloons(count)}
      />

      {/* Extinguish Flash Bloom */}
      {flashBurst && (
        <div className="pointer-events-none absolute inset-0 z-40 animate-pulse bg-gradient-to-b from-amber-100/45 via-rose-200/20 to-transparent" />
      )}

      {/* Center Radial Golden Warp Aperture Bloom + Whisper during Slow Warp Transition */}
      <AnimatePresence>
        {isWarping && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0.2, 0.95, 0.25], scale: [0.65, 1.35, 1.75] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center"
          >
            <div className="h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,251,235,0.48)_0%,rgba(251,191,36,0.25)_38%,rgba(244,114,182,0.12)_58%,transparent_76%)] blur-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warp Interaction Guard + Silky Floating Chapter Whisper Pill */}
      <AnimatePresence>
        {isWarping && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-auto absolute inset-0 z-50 flex items-end justify-center pb-14"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/45 bg-black/55 px-5 py-2 text-xs font-medium tracking-wide text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.28)] backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 animate-spin text-amber-300" />
              {warpWhisper}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Celestial Read-Only Diamond Progress Stepper & Audio Orb */}
      <header className="relative z-30 flex w-full max-w-md items-center justify-between gap-2 pt-1">
        {stage !== "pin" && stage !== "intro" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              ensureAudioReady();
              if (stage === "viral_closing") {
                setCakeOpened(true);
                setStage("reveal_layer");
              } else if (stage === "reveal_layer") {
                setStage("grand_celebration");
              } else if (stage === "grand_celebration" || stage === "extinguish_drop") {
                setLitCandles([true, true, true, true, true]);
                setStage("blowing");
              } else if (stage === "blowing" || stage === "countdown") {
                setStage("intro");
              }
            }}
            aria-label="ย้อนกลับ"
            title="ย้อนกลับ"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-200/35 bg-black/45 text-amber-100 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-amber-200/75 hover:bg-amber-300/15"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <div className="w-9 shrink-0" />
        )}

        {stage !== "pin" ? (
          <nav
            aria-label="ลำดับด่านแบบทีละขั้น"
            className="pointer-events-none flex select-none items-center gap-1.5 rounded-full border border-amber-200/20 bg-black/45 px-3.5 py-1.5 shadow-lg backdrop-blur-md sm:gap-2"
          >
            {constellationSteps.map((step, idx) => {
              const isCompleted = idx < stageOrderIndex;
              const isActive = idx === stageOrderIndex;
              return (
                <React.Fragment key={step.id}>
                  <div
                    title={step.label}
                    className={`relative flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-500 ${isActive
                        ? "scale-110 border-amber-200/90 bg-amber-300/25 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.55)]"
                        : isCompleted
                          ? "border-rose-300/60 bg-rose-400/20 text-rose-100"
                          : "border-white/10 bg-white/[0.03] text-slate-500 opacity-45"
                      }`}
                  >
                    {isCompleted || isActive ? (
                      step.icon
                    ) : (
                      <Lock className="h-2.5 w-2.5 opacity-80" />
                    )}
                  </div>
                  {idx < constellationSteps.length - 1 && (
                    <span
                      className={`h-px w-2.5 transition-colors duration-500 sm:w-4 ${idx < stageOrderIndex
                          ? "bg-gradient-to-r from-rose-300/75 to-amber-200/75"
                          : "bg-white/15"
                        }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        {/* Sculpted Audio Sphere Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            ensureAudioReady();
            setMuted((m) => !m);
          }}
          aria-label={muted ? "เปิดเสียงดนตรีและเอฟเฟกต์" : "ปิดเสียง"}
          title={muted ? "เปิดเสียง" : "ปิดเสียง"}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 hover:scale-105 ${!muted
              ? "border-amber-300/60 bg-amber-400/15 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.35)]"
              : "border-white/15 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4 animate-pulse" />
          )}
        </button>
      </header>

      {/* Main Theater Stage with Silky Warp Scaling & Opacity Flow */}
      <main className="relative z-20 flex w-full max-w-md flex-1 flex-col items-center justify-center py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage === "pin" ? "pin" : stage === "reveal_layer" ? "reveal" : stage === "viral_closing" ? "closing" : "cake"}
            initial={{ opacity: 0, scale: 0.94, filter: "blur(6px)" }}
            animate={{
              opacity: warpPhase === "out" ? 0 : 1,
              scale: warpPhase === "out" ? 1.07 : 1,
              filter: warpPhase === "out" ? "blur(6px)" : "blur(0px)",
            }}
            exit={{ opacity: 0, scale: 1.06, filter: "blur(6px)" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full flex-col items-center justify-center"
          >
            {/* STAGE 0: PIN GATE */}
            {stage === "pin" && (
              <div className="relative w-full max-w-[310px] rounded-[2rem] border border-amber-200/30 bg-black/60 p-6 text-center shadow-[0_28px_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-amber-300/50 bg-gradient-to-br from-amber-300/25 to-rose-500/25 text-amber-200 shadow-[0_0_28px_rgba(251,191,36,0.35)]">
                  <Lock className="h-6 w-6" />
                </div>
                <h2 className="text-base font-bold tracking-wide text-amber-100">
                  รหัสลับเปิดเค้กวันเกิด
                </h2>
                <p className="mt-1 text-xs text-slate-300/80">
                  กรอกรหัสผ่าน 4 หลักเพื่อจุดเทียนวิเศษ
                </p>

                <div className="mt-5 flex justify-center gap-3.5">
                  {[0, 1, 2, 3].map((slot) => (
                    <div
                      key={slot}
                      className={`h-3.5 w-3.5 rounded-full border transition-all duration-300 ${slot < pinInput.length
                          ? "scale-115 border-amber-200 bg-amber-300 shadow-[0_0_14px_rgba(253,224,71,0.85)]"
                          : "border-white/25 bg-white/5"
                        }`}
                    />
                  ))}
                </div>

                {pinError && (
                  <p className="mt-3 text-xs font-medium text-rose-300">
                    {pinError}
                  </p>
                )}

                <div className="mx-auto mt-6 grid max-w-[232px] grid-cols-3 justify-items-center gap-3">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
                    (digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => void handlePinKey(digit)}
                        disabled={pinChecking}
                        className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5 text-base font-semibold text-amber-50 transition-all hover:border-amber-300/50 hover:bg-amber-300/15 active:scale-90"
                      >
                        {digit}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPinInput("");
                      setPinError(null);
                    }}
                    aria-label="ล้างรหัส"
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/15"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePinKey("0")}
                    disabled={pinChecking}
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5 text-base font-semibold text-amber-50 transition-all hover:border-amber-300/50 hover:bg-amber-300/15 active:scale-90"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPinInput((p) => p.slice(0, -1));
                      setPinError(null);
                    }}
                    aria-label="ลบตัวเลข"
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/15"
                  >
                    <Delete className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STAGES 1–5: CANDLE & ROYAL GALA STAGE */}
            {(stage === "intro" ||
              stage === "countdown" ||
              stage === "blowing" ||
              stage === "extinguish_drop" ||
              stage === "grand_celebration") && (
                <div className="flex w-full flex-col items-center">
                  {/* Recipient Crown Ribbon & Calligraphic Headline */}
                  <div className="mb-1 text-center">
                    <div
                      onClick={(e) => handleEditableClick(e, 1, "field-candles-recipient")}
                      title={studio ? "คลิกเพื่อแก้ไขชื่อผู้รับ" : undefined}
                      data-editable-field={studio ? "field-candles-recipient" : undefined}
                      data-edit-label={studio ? "แก้ไขชื่อผู้รับ" : undefined}
                      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-200/35 bg-white/5 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.16)] backdrop-blur-md ${studio
                          ? "cursor-pointer hover:border-amber-300 hover:bg-amber-400/15"
                          : ""
                        }`}
                    >
                      <Crown className="h-3.5 w-3.5 text-amber-300" />
                      <span>แด่ {recipientName}</span>
                    </div>
                    <h1
                      onClick={(e) => {
                        if (stage === "intro") handleEditableClick(e, 1, "field-candles-intro-headline");
                        else if (stage === "blowing") handleEditableClick(e, 2, "field-candles-blowing-headline");
                        else if (stage === "grand_celebration") handleEditableClick(e, 2, "field-candles-celebration-headline");
                      }}
                      title={studio ? "คลิกเพื่อแก้ไขหัวข้อ" : undefined}
                      className={`mt-1.5 bg-gradient-to-b from-amber-50 via-rose-100 to-amber-300 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent drop-shadow-[0_4px_14px_rgba(244,114,182,0.22)] sm:text-3xl ${studio ? "cursor-pointer hover:opacity-85" : ""}`}
                    >
                      {stage === "grand_celebration"
                        ? celebrationHeadline
                        : stage === "blowing"
                          ? blowingHeadline
                          : stage === "countdown"
                            ? "สูดลมหายใจให้เต็มปอด"
                            : stage === "extinguish_drop"
                              ? "แสงเทียนเปลี่ยนเป็นคำอธิษฐาน"
                              : introHeadline}
                    </h1>
                  </div>

                  {/* Royal Mandala Orbit + Cake Theater Stage */}
                  <div className="relative my-1 flex items-center justify-center">
                    <RoyalBirthdayMandala
                      accelerated={isWarping || stage === "countdown"}
                      litGlow={litCount > 0 || stage === "grand_celebration"}
                    />

                    <CandleStageCanvas
                      candles={litCandles}
                      windStrength={effectiveWind}
                      cakeOpened={cakeOpened}
                      stage={stage}
                      onCandleTap={extinguishSpecificCandle}
                      onTouchHoldStart={handleTouchHoldStart}
                      onTouchHoldEnd={handleTouchHoldEnd}
                    />

                    {/* Celestial Countdown Ring Overlay */}
                    {stage === "countdown" && (
                      <motion.div
                        key={countdownValue}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.35 }}
                        className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
                      >
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-amber-200/75 bg-black/60 shadow-[0_0_55px_rgba(251,191,36,0.55)] backdrop-blur-md">
                          <span className="absolute -inset-2.5 animate-ping rounded-full border border-rose-300/45" />
                          <span className="text-5xl font-black text-amber-200">
                            {countdownValue}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {/* Twilight Smoke & Wish Ascent Anticipation */}
                    {stage === "extinguish_drop" && (
                      <>
                        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                          <div className="h-44 w-44 animate-ping rounded-full border border-amber-200/40 bg-amber-200/10" />
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 text-center">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/35 bg-black/65 px-4 py-1.5 text-xs tracking-wide text-amber-100/95 shadow-xl backdrop-blur-md">
                            <Sparkles className="h-3.5 w-3.5 animate-spin text-amber-300" />
                            คำอธิษฐานกำลังลอยขึ้นสู่ฟากฟ้า...
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* STAGE 1 ACTIONS: INTRO */}
                  {stage === "intro" && (
                    <div className="mt-1 flex flex-col items-center gap-3 px-2 text-center">
                      <p
                        onClick={(e) => handleEditableClick(e, 1, "field-candles-intro-prompt")}
                        title={studio ? "คลิกเพื่อแก้ไขข้อความเกริ่นนำ" : undefined}
                        className={`min-h-[36px] max-w-xs text-xs leading-relaxed text-rose-100/90 sm:text-sm ${studio ? "cursor-pointer rounded-lg px-2 py-0.5 hover:bg-white/10" : ""}`}
                      >
                        {introPrompt.slice(0, typedCount)}
                        {typedCount < introPrompt.length && (
                          <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-amber-300 align-middle" />
                        )}
                      </p>

                      <GlowMedallion
                        tone="gold"
                        size="lg"
                        activeRing
                        icon={
                          <Flame className="h-7 w-7 animate-pulse text-amber-200" />
                        }
                        caption={introButtonCaption}
                        onClick={() => {
                          ensureAudioReady();
                          playCandleIgnite(mutedRef.current);
                          triggerHaptic(30);
                          triggerStageWarp("countdown", {
                            whisper:
                              "กำลังจุดประกายคำอธิษฐานและเข้าสู่นับถอยหลัง...",
                            outMs: 680,
                            inMs: 780,
                          });
                        }}
                      />
                    </div>
                  )}

                  {/* STAGE 3 ACTIONS: BLOWING */}
                  {stage === "blowing" && (
                    <div className="mt-1 flex w-full flex-col items-center gap-3.5">
                      <div className="flex items-center gap-2 rounded-full border border-amber-200/20 bg-black/45 px-4 py-1.5 backdrop-blur-md">
                        {litCandles.map((lit, i) => (
                          <span
                            key={i}
                            className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${lit
                                ? "bg-amber-300 shadow-[0_0_12px_rgba(253,224,71,0.95)]"
                                : "bg-slate-600/60"
                              }`}
                          />
                        ))}
                        <span className="ml-1.5 text-[11px] font-medium text-amber-100/85">
                          เหลือ {litCount} เล่ม
                        </span>
                      </div>

                      <div className="flex items-start justify-center gap-5 sm:gap-7">
                        <GlowMedallion
                          tone={micActive ? "sky" : "glass"}
                          size="md"
                          activeRing={micActive}
                          pulseScale={micActive ? micLevel / 100 : 0}
                          icon={
                            micActive ? (
                              <Mic className="h-5 w-5 text-sky-200" />
                            ) : (
                              <MicOff className="h-5 w-5 text-slate-200" />
                            )
                          }
                          caption={
                            micActive ? "เป่าใส่ไมค์ได้เลย" : "เปิดไมค์เป่าเทียน"
                          }
                          onClick={() => {
                            ensureAudioReady();
                            if (micActive) stopMic();
                            else void startMic();
                          }}
                        />

                        <GlowMedallion
                          tone="rose"
                          size="lg"
                          activeRing={touchBlowing}
                          icon={<Wind className="h-7 w-7 text-rose-100" />}
                          caption={
                            touchBlowing ? "กำลังเป่าลม" : "กดค้างเพื่อเป่า"
                          }
                          onPointerDown={handleTouchHoldStart}
                          onPointerUp={handleTouchHoldEnd}
                          onPointerLeave={handleTouchHoldEnd}
                        />

                        <GlowMedallion
                          tone="gold"
                          size="md"
                          icon={<Sparkles className="h-5 w-5 text-amber-200" />}
                          caption="เป่าดับพร้อมกัน"
                          onClick={blowAllCandles}
                        />
                      </div>

                      {micError && (
                        <p className="max-w-xs text-center text-[11px] text-rose-300/90">
                          {micError}
                        </p>
                      )}
                    </div>
                  )}

                  {/* STAGE 5 ACTIONS: GRAND CELEBRATION */}
                  {stage === "grand_celebration" && (
                    <div className="mt-1 flex flex-col items-center gap-3 text-center">
                      <p
                        onClick={(e) => handleEditableClick(e, 2, "field-candles-celebration-hint")}
                        title={studio ? "คลิกเพื่อแก้ไขข้อความแนะนำ" : undefined}
                        className={`max-w-xs text-xs leading-relaxed text-amber-100/90 sm:text-sm ${studio ? "cursor-pointer rounded-lg px-2 py-0.5 hover:bg-white/10" : ""}`}
                      >
                        {celebrationHint}
                        {poppedBalloons > 0
                          ? ` · เก็บลูกโป่งแล้ว ${poppedBalloons} ดวง`
                          : ""}
                      </p>

                      <GlowMedallion
                        tone="gold"
                        size="lg"
                        activeRing
                        icon={<Gift className="h-7 w-7 text-amber-100" />}
                        caption={revealButtonCaption}
                        onClick={() => {
                          ensureAudioReady();
                          playGiftOpenChime(mutedRef.current);
                          triggerStageWarp("reveal_layer", {
                            whisper: "กำลังเปิดกล่องความลับที่ซ่อนไว้ภายในเค้ก...",
                            outMs: 700,
                            inMs: 800,
                            extraOnSwap: () => {
                              setCakeOpened(true);
                            },
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

            {/* STAGE 6: REVEAL LAYER (HIDDEN TREASURE VAULT) */}
            {stage === "reveal_layer" && (
              <div className="relative flex w-full flex-col items-center gap-4">
                {!cakeOpened ? (
                  <div className="flex flex-col items-center gap-5 rounded-[2rem] border border-amber-200/30 bg-black/55 px-6 py-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-300/45 bg-amber-400/15 text-amber-200 shadow-[0_0_26px_rgba(251,191,36,0.35)]">
                      <Cake className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-amber-100">
                        ความลับที่ซ่อนอยู่ในเค้ก
                      </h2>
                      <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-slate-300">
                        ภายในเค้กก้อนนี้มีความทรงจำและข้อความพิเศษเตรียมไว้ให้คุณ
                      </p>
                    </div>
                    <GlowMedallion
                      tone="gold"
                      size="lg"
                      activeRing
                      icon={<Gift className="h-6 w-6 text-amber-100" />}
                      caption="เปิดเค้กดูความลับ"
                      onClick={() => {
                        ensureAudioReady();
                        playGiftOpenChime(mutedRef.current);
                        triggerHaptic(30);
                        setCakeOpened(true);
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex w-full flex-col gap-4 rounded-[2rem] border border-amber-200/30 bg-[#11071f]/80 p-5 shadow-[0_26px_80px_rgba(0,0,0,0.82)] backdrop-blur-2xl">
                    {/* 2 Memory Photos with Slow Staggered Entrance & Click-to-View */}
                    <div className="space-y-2">
                      {studio && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => handleEditableClick(e, 3, "field-candles-photos")}
                            title="คลิกเพื่อแก้ไขรูปความทรงจำ"
                            data-editable-field="field-candles-photos"
                            data-edit-label="แก้ไขรูปความทรงจำ"
                            className="rounded-lg border border-amber-200/35 bg-amber-300/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-300/25"
                          >
                            แก้ไขรูป
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        {displayPhotos.map((src, idx) => (
                          <motion.button
                            key={`${src}-${idx}`}
                            type="button"
                            initial={{ opacity: 0, y: 24, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                              duration: 1.0,
                              delay: 0.2 + idx * 0.3,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            onClick={() => setLightboxPhotoIndex(idx)}
                            className="group relative overflow-hidden rounded-2xl border border-amber-200/40 bg-black/50 text-left shadow-lg transition-colors hover:border-amber-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                          >
                            <div className="relative h-32 w-full overflow-hidden sm:h-36">
                              <img
                                src={src}
                                alt={`ภาพความทรงจำ ${idx + 1}`}
                                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                              <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-black/55 text-amber-100 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                                <ZoomIn className="h-3.5 w-3.5" />
                              </span>
                            </div>

                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Gilded Birthday Letter Scroll with Slow Text Entrance */}
                    <motion.div
                      initial={{ opacity: 0, y: 26 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.95,
                        delay: 0.65,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      onClick={(e) => handleEditableClick(e, 3, "field-candles-letter")}
                      title={studio ? "คลิกเพื่อแก้ไขจดหมายอวยพร" : undefined}
                      data-editable-field={studio ? "field-candles-letter" : undefined}
                      data-edit-label={studio ? "แก้ไขจดหมายอวยพร" : undefined}
                      className={`rounded-2xl border border-amber-200/25 bg-gradient-to-b from-amber-100/[0.06] to-black/50 p-4 shadow-inner ${studio ? "cursor-pointer hover:border-amber-300/60" : ""
                        }`}
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.85,
                          delay: 0.8,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="flex items-center justify-between border-b border-amber-200/15 pb-2"
                      >
                        <span className="text-xs font-bold tracking-wide text-amber-200">
                          {letterTitle}
                        </span>
                        <Heart className="h-3.5 w-3.5 fill-rose-400/50 text-rose-300" />
                      </motion.div>
                      <div className="mt-2.5 max-h-36 space-y-2 overflow-y-auto pr-1 text-xs leading-relaxed text-slate-100 sm:text-sm">
                        {letterParagraphs.map((paragraph, idx) => (
                          <motion.p
                            key={idx}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.9,
                              delay: 0.95 + idx * 0.28,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          >
                            {paragraph}
                          </motion.p>
                        ))}
                      </div>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          duration: 0.85,
                          delay: 1.05 + letterParagraphs.length * 0.28,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="mt-3 text-right text-xs font-semibold text-amber-300"
                      >
                        ด้วยรัก จาก {senderName}
                      </motion.p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 18, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.9,
                        delay: 1.25 + letterParagraphs.length * 0.2,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="flex justify-center pt-1"
                    >
                      <GlowMedallion
                        tone="rose"
                        size="md"
                        activeRing
                        icon={<Sparkles className="h-5 w-5 text-rose-100" />}
                        caption={closingButtonCaption}
                        onClick={() => {
                          ensureAudioReady();
                          triggerStageWarp("viral_closing", {
                            whisper:
                              "กำลังร้อยเรียงการ์ดความทรงจำปิดท้าย...",
                            outMs: 680,
                            inMs: 780,
                          });
                        }}
                      />
                    </motion.div>
                  </div>
                )}
              </div>
            )}

            {/* STAGE 7: ROYAL KEEPSAKE CLOSING */}
            {stage === "viral_closing" && (
              <div className="relative flex w-full max-w-[360px] flex-col items-center rounded-[2.2rem] border border-amber-200/40 bg-gradient-to-b from-[#29103b]/85 via-[#140822]/92 to-black/90 p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.86)] backdrop-blur-2xl">
                {/* Top Video Player */}
                <div className="mb-4 w-full space-y-1.5">
                  {studio && videoUrl && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => handleEditableClick(e, 4, "field-candles-video")}
                        title="คลิกเพื่อแก้ไขวิดีโอความทรงจำ"
                        data-editable-field="field-candles-video"
                        data-edit-label="แก้ไขวิดีโอความทรงจำ"
                        className="rounded-lg border border-amber-200/35 bg-amber-300/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-300/25"
                      >
                        แก้ไขวิดีโอ
                      </button>
                    </div>
                  )}

                  {youtubeVideoId ? (
                    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-amber-200/35 bg-black shadow-lg">
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0&playsinline=1&modestbranding=1`}
                        title="วิดีโอความทรงจำ"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                  ) : videoUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-amber-200/35 bg-black shadow-lg">
                      <video
                        src={videoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="aspect-video w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      onClick={(e) => {
                        if (studio) {
                          handleEditableClick(e, 4, "field-candles-video");
                        }
                      }}
                      title={studio ? "คลิกเพื่อเพิ่มวิดีโอความทรงจำ" : undefined}
                      data-editable-field={studio ? "field-candles-video" : undefined}
                      data-edit-label={studio ? "เพิ่มวิดีโอความทรงจำ" : undefined}
                      className={`group relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-amber-200/35 bg-gradient-to-br from-[#1f0c33] via-[#120720] to-black shadow-lg ${
                        studio ? "cursor-pointer hover:border-amber-200/75" : ""
                      }`}
                    >
                      <span className="absolute left-3 top-2.5 rounded-md border border-amber-200/25 bg-black/50 px-2 py-0.5 text-[10px] font-bold tracking-widest text-amber-200/80 uppercase">
                        Video
                      </span>
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-200/55 bg-amber-300/20 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.3)] transition-transform duration-300 group-hover:scale-105">
                        <Play className="ml-0.5 h-5 w-5 fill-amber-100/80" />
                      </span>
                      <div className="absolute inset-x-3 bottom-2.5 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                          <div className="h-full w-1/3 rounded-full bg-amber-300/60" />
                        </div>
                        <span className="font-mono text-[10px] text-amber-100/60">
                          00:00
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-200/55 bg-amber-300/15 text-amber-200 shadow-[0_0_26px_rgba(251,191,36,0.4)]">
                  <Crown className="h-5 w-5" />
                </div>

                <span
                  onClick={(e) => handleEditableClick(e, 4, "field-candles-closing-badge")}
                  title={studio ? "คลิกเพื่อแก้ไขป้ายหัวข้อ" : undefined}
                  className={`mt-3 text-[10px] font-semibold tracking-[0.28em] text-rose-200/80 uppercase ${studio ? "cursor-pointer rounded px-1.5 py-0.5 hover:bg-white/10" : ""}`}
                >
                  {closingBadge}
                </span>

                <h3
                  onClick={(e) => handleEditableClick(e, 4, "field-candles-closing-title")}
                  title={studio ? "คลิกเพื่อแก้ไขหัวข้อหน้าปิดท้าย" : undefined}
                  data-editable-field={studio ? "field-candles-recipient-final" : undefined}
                  data-edit-label={studio ? "แก้ไขหัวข้อหน้าปิดท้าย" : undefined}
                  className={`mt-2 bg-gradient-to-r from-amber-100 via-rose-100 to-amber-200 bg-clip-text text-2xl font-black text-transparent ${studio ? "cursor-pointer hover:underline" : ""
                    }`}
                >
                  {closingTitle}
                </h3>

                <p
                  onClick={(e) => handleEditableClick(e, 4, "field-candles-wish")}
                  title={studio ? "คลิกเพื่อแก้ไขข้อความปิดท้าย" : undefined}
                  data-editable-field={studio ? "field-candles-wish" : undefined}
                  data-edit-label={studio ? "แก้ไขข้อความปิดท้าย" : undefined}
                  className={`mt-3 text-xs leading-relaxed text-slate-200 sm:text-sm ${studio
                      ? "cursor-pointer rounded-lg p-1 hover:bg-white/10"
                      : ""
                    }`}
                >
                  &ldquo;{wishMessage}&rdquo;
                </p>

                <p
                  onClick={(e) => handleEditableClick(e, 1, "field-candles-sender")}
                  title={studio ? "คลิกเพื่อแก้ไขชื่อผู้ส่ง" : undefined}
                  className={`mt-3 text-xs font-semibold text-amber-300 ${studio ? "cursor-pointer rounded px-1.5 py-0.5 hover:bg-white/10" : ""}`}
                >
                  ด้วยรักจาก {senderName}
                </p>

                <div className="mt-6 flex items-start justify-center gap-8">
                  <GlowMedallion
                    tone="rose"
                    size="lg"
                    activeRing={!loveSent}
                    disabled={loveSending}
                    icon={
                      <Heart
                        className={`h-7 w-7 transition-transform duration-300 ${loveSent
                            ? "scale-110 fill-rose-300 text-rose-100"
                            : "text-rose-100"
                          }`}
                      />
                    }
                    caption={
                      loveSent ? "ส่งหัวใจกลับแล้ว" : "ส่งหัวใจกลับให้ผู้ส่ง"
                    }
                    onClick={() => void handleSendLoveBack()}
                  />

                  <GlowMedallion
                    tone="glass"
                    size="lg"
                    icon={<RotateCcw className="h-6 w-6 text-amber-100" />}
                    caption="จุดเทียนเล่นใหม่"
                    onClick={replayExperience}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Gala Watermark Signature */}
      <footer className="pointer-events-none relative z-20 flex items-center gap-1.5 text-[10px] tracking-[0.24em] text-amber-100/50 uppercase">
        <Sparkles className="h-3 w-3 text-amber-200/60" />
        <span>Royal Candlelight Gala</span>
        <Sparkles className="h-3 w-3 text-amber-200/60" />
      </footer>

      {/* Slow Animated Photo Lightbox */}
      <AnimatePresence>
        {lightboxPhotoIndex !== null && lightboxPhotos.length > 0 && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="ดูภาพความทรงจำขนาดใหญ่"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
            onClick={() => setLightboxPhotoIndex(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.76, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.84, y: 18 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-200/40 bg-[#140822] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.9)]"
            >
              <button
                type="button"
                onClick={() => setLightboxPhotoIndex(null)}
                aria-label="ปิดภาพขยาย"
                className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/65 text-white backdrop-blur-sm transition hover:bg-black/85"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="overflow-hidden rounded-2xl bg-black/70">
                <img
                  src={lightboxPhotos[lightboxPhotoIndex % lightboxPhotos.length]}
                  alt={`ภาพความทรงจำที่ ${(lightboxPhotoIndex % lightboxPhotos.length) + 1}`}
                  className="max-h-[70vh] w-full object-contain"
                />
              </div>

              <div className="mt-3 flex items-center justify-between px-2 pb-1 text-xs text-amber-100">
                <span>
                  ภาพความทรงจำที่ {(lightboxPhotoIndex % lightboxPhotos.length) + 1} /{" "}
                  {lightboxPhotos.length}
                </span>
                {lightboxPhotos.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxPhotoIndex(
                          (prev) =>
                            ((prev ?? 0) - 1 + lightboxPhotos.length) %
                            lightboxPhotos.length
                        )
                      }
                      aria-label="ภาพก่อนหน้า"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-amber-100 transition hover:bg-white/20"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxPhotoIndex(
                          (prev) => ((prev ?? 0) + 1) % lightboxPhotos.length
                        )
                      }
                      aria-label="ภาพถัดไป"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-amber-100 transition hover:bg-white/20"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

BlowCandlesTemplate.displayName = "BlowCandlesTemplate";
