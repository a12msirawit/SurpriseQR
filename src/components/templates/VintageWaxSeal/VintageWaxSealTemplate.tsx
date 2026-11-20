"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarHeart,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Delete,
  Disc3,
  Fingerprint,
  KeyRound,
  Lock,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Unlock,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { verifyCardPin } from "@/app/c/[hash_id]/actions";
import WaxSeal from "./WaxSeal";
import RoyalChamberCanvas from "./RoyalChamberCanvas";
import { BaroqueCornerFiligree, RoyalCrestDivider, ClockworkGearsSvg } from "./RoyalHeraldicSvg";
import {
  playGrandUnsealSwell,
  playMusicBoxChime,
  playPaperRustle,
  playPinKeyChime,
  playRoyalArpeggio,
  playVaultRejectChime,
  playVaultUnlockChime,
  playWaxCrack,
  startRoyalMusicBoxLoop,
  unlockVintageAudio,
} from "./waxSound";
import BackgroundAudioPlayer from "@/components/audio/BackgroundAudioPlayer";
import { defaultVintageWaxSealData } from "@/data/templates";
import type { SurpriseQRData, SurpriseQRMedia } from "@/types/templates";

type WaxStage = "envelope" | "pin" | "letter" | "finale";

interface GalleryItem {
  url: string;
  caption?: string;
}

export interface VintageWaxSealProps {
  config?: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  hashId?: string;
  expectedPin?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

const DEFAULT_SAMPLE_PHOTOS: GalleryItem[] = [
  { url: "/templates/vintage-wax-seal.svg", caption: "วันแรกที่เราได้เขียนบันทึกเรื่องราวร่วมกัน" },
  { url: "/templates/vintage-wax-seal.svg", caption: "ทุกช่วงเวลาที่เก็บไว้เป็นความทรงจำล้ำค่า" },
];

const CEREMONY_EASE = [0.22, 1, 0.36, 1] as const;

interface ElapsedTimeBreakdown {
  totalDays: number;
  totalHours: number;
  hours: number;
  minutes: number;
  seconds: number;
  years: number;
  months: number;
  remDays: number;
  formattedDate: string;
}

function computeElapsedTime(dateStr: string, nowMs: number): ElapsedTimeBreakdown | null {
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  const start = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T00:00:00`)
    : new Date(trimmed);
  if (Number.isNaN(start.getTime())) return null;

  const diffMs = Math.max(0, nowMs - start.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalDays = Math.floor(totalSeconds / 86400);
  const totalHours = Math.floor(totalSeconds / 3600);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Accurate calendar years / months / remaining days breakdown
  const nowDate = new Date(Math.max(start.getTime(), nowMs));
  let years = nowDate.getFullYear() - start.getFullYear();
  let months = nowDate.getMonth() - start.getMonth();
  let remDays = nowDate.getDate() - start.getDate();

  if (remDays < 0) {
    months -= 1;
    const prevMonthDays = new Date(nowDate.getFullYear(), nowDate.getMonth(), 0).getDate();
    remDays += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  let formattedDate = trimmed;
  try {
    formattedDate = new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(start);
  } catch {
    formattedDate = trimmed;
  }

  return {
    totalDays,
    totalHours,
    hours,
    minutes,
    seconds,
    years: Math.max(0, years),
    months: Math.max(0, months),
    remDays: Math.max(0, remDays),
    formattedDate,
  };
}

function BaroqueFrameCorners({ className = "opacity-75" }: { className?: string }) {
  return (
    <div className={`pointer-events-none ${className}`}>
      <BaroqueCornerFiligree className="absolute top-3 left-3 w-8 h-8" />
      <BaroqueCornerFiligree className="absolute top-3 right-3 w-8 h-8 rotate-90" />
      <BaroqueCornerFiligree className="absolute bottom-3 left-3 w-8 h-8 -rotate-90" />
      <BaroqueCornerFiligree className="absolute bottom-3 right-3 w-8 h-8 rotate-180" />
    </div>
  );
}

export function VintageWaxSealTemplate({
  config,
  isEditing = false,
  studio = false,
  activeScreen = 1,
  hashId,
  expectedPin,
  onSelectField,
}: VintageWaxSealProps) {
  const rawConfig = (config || {}) as Record<string, unknown>;
  const nestedConfig =
    rawConfig.config && typeof rawConfig.config === "object"
      ? (rawConfig.config as Record<string, unknown>)
      : null;
  const sourceContent = ((nestedConfig?.content as Partial<SurpriseQRData["content"]>) ||
    (rawConfig.content as Partial<SurpriseQRData["content"]>) ||
    {}) as Partial<SurpriseQRData["content"]>;
  const settingsObj = ((nestedConfig?.settings as Record<string, unknown>) ||
    (rawConfig.settings as Record<string, unknown>) ||
    {}) as Record<string, unknown>;

  const defaults = defaultVintageWaxSealData.content;
  const menuData = sourceContent.menu || defaults.menu;
  const letterData = sourceContent.letter || defaults.letter;
  const memoriesData = sourceContent.memories || defaults.memories;
  const finaleData = sourceContent.finale || defaults.finale;
  const songMediaData = sourceContent.songMedia || defaults.songMedia;
  const bgMusicData = sourceContent.bgMusic || defaults.bgMusic;

  const configTitle =
    (typeof sourceContent.title === "string" ? sourceContent.title : "") ||
    (typeof rawConfig.title === "string" ? rawConfig.title : "");
  const title =
    configTitle && configTitle !== "Happy Anniversary, Love !"
      ? configTitle
      : "To Someone Special";
  const recipientSubtitle =
    menuData?.subTitle && menuData.subTitle !== "ของขวัญที่รออยู่"
      ? menuData.subTitle
      : (rawConfig.recipientName as string) || "Royal Parchment";
  const letterHeadline = letterData?.title || "คำจารึกถึงคนสำคัญที่สุด";
  const letterLines: string[] =
    letterData?.paragraphs && letterData.paragraphs.length > 0
      ? letterData.paragraphs
      : [
          "ตั้งแต่วันแรกที่พบกัน ทุกวันธรรมดาก็กลายเป็นเรื่องราวที่น่าจดจำ",
          "ขอบคุณที่อยู่เคียงข้าง เติมเต็มความอบอุ่น และเป็นพลังใจให้เสมอมา",
          "ขอให้บันทึกฉบับนี้เก็บงำความรู้สึกดี ๆ และคำขอบคุณทั้งหมดที่มีไว้ตลอดไป",
        ];

  const signature = finaleData?.mainText || "ด้วยความปรารถนาดีเสมอมา";
  const finaleSubText =
    finaleData?.subText ||
    "เก็บถ้อยคำและช่วงเวลาเหล่านี้ไว้เป็นคำสัญญาในความทรงจำตลอดไป";
  const rawAnniversary =
    typeof finaleData?.anniversaryDate === "string"
      ? finaleData.anniversaryDate
      : typeof settingsObj.anniversaryDate === "string"
      ? settingsObj.anniversaryDate
      : typeof rawConfig.anniversaryDate === "string"
      ? rawConfig.anniversaryDate
      : "2024-02-14";
  const showAnniversary = rawAnniversary !== " ";
  const effectiveAnniversaryDate = showAnniversary
    ? rawAnniversary.trim() || "2024-02-14"
    : "";
  const songTitle = songMediaData?.songTitle || "Our Eternal Song";
  const songArtist = songMediaData?.sectionTitle || "Royal Music Box Selection";

  const audioSrc =
    (typeof songMediaData?.src === "string" && songMediaData.src.trim()) ||
    (typeof bgMusicData?.src === "string" && bgMusicData.src.trim()) ||
    (typeof rawConfig.audioUrl === "string" && rawConfig.audioUrl.trim()) ||
    "";

  const galleryPhotos: GalleryItem[] = [];
  if (Array.isArray(memoriesData?.polaroidImages)) {
    memoriesData.polaroidImages.forEach((p: SurpriseQRMedia, idx: number) => {
      if (p?.src && p.src.trim() !== "") {
        galleryPhotos.push({
          url: p.src,
          caption: idx === 0 ? memoriesData.description : undefined,
        });
      }
    });
  }
  const activePhotos = galleryPhotos.length > 0 ? galleryPhotos : DEFAULT_SAMPLE_PHOTOS;

  // Map SurpriseQR envelopeStyle -> WaxSeal color & symbol
  const styleVal = Number(settingsObj.envelopeStyle) || 1;
  const waxColor: "ruby" | "gold" = styleVal === 2 ? "gold" : "ruby";

  // PIN requirement resolution
  // - If viewing a saved card (hashId provided), enforce PIN strictly when card has an expectedPin.
  // - If in local/live template preview (!hashId), check settings.enablePin (defaulting true on Vintage Wax Seal) with fallback "1234".
  const configuredSettingPin = typeof settingsObj.pinCode === "string" ? settingsObj.pinCode.trim() : "";
  const settingPinEnabled =
    typeof settingsObj.enablePin === "boolean" ? settingsObj.enablePin : true;
  const effectivePinCode = (expectedPin || configuredSettingPin || "1234").trim();
  const isPinRequired = Boolean(
    hashId ? expectedPin && expectedPin.trim().length > 0 : settingPinEnabled
  );
  const showSamplePinHint = !hashId && !expectedPin && effectivePinCode === "1234";

  // Tempo pacing multiplier: recipient preview is delightfully slow & ceremonial; studio tab preview is gently brisk
  const pace = studio ? 0.38 : 1;

  // Core ceremony state
  const [stage, setStage] = useState<WaxStage>("envelope");
  const [stageVisitKey, setStageVisitKey] = useState<number>(0);
  const [envelopeOpened, setEnvelopeOpened] = useState<boolean>(false);
  const [isBreakingSeal, setIsBreakingSeal] = useState<boolean>(false);
  const [isTransitioningStage, setIsTransitioningStage] = useState<boolean>(false);

  // Secret PIN Cryptex state
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);
  const [pinChecking, setPinChecking] = useState<boolean>(false);
  const [pinUnlocked, setPinUnlocked] = useState<boolean>(!isPinRequired);
  const [pinUnlockSuccess, setPinUnlockSuccess] = useState<boolean>(false);

  // Gallery, lightbox, audio & FX state
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState<number>(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(studio);
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(true);
  const [sealBurstTrigger, setSealBurstTrigger] = useState<number>(0);
  const [pointerNormalized, setPointerNormalized] = useState<{ x: number; y: number }>({
    x: 0.5,
    y: 0.5,
  });
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (stage !== "finale" || !showAnniversary) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [stage, showAnniversary]);

  const elapsedStats = showAnniversary
    ? computeElapsedTime(effectiveAnniversaryDate, nowMs)
    : null;

  const pointerRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const clearScheduledTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearScheduledTimeouts();
  }, [clearScheduledTimeouts]);

  useEffect(() => {
    setPinUnlocked(!isPinRequired);
  }, [isPinRequired]);

  // Synchronize studio sidebar activeScreen cleanly with Vintage Wax Seal stages
  useEffect(() => {
    if (!studio) return;
    if (activeScreen <= 1) {
      setStage("envelope");
      setIsBreakingSeal(false);
    } else if (activeScreen === 2) {
      setStage("pin");
      setEnvelopeOpened(true);
    } else if (activeScreen <= 4) {
      setStage("letter");
      setEnvelopeOpened(true);
      setPinUnlocked(true);
    } else {
      setStage("finale");
      setEnvelopeOpened(true);
      setPinUnlocked(true);
    }
    setStageVisitKey((k) => k + 1);
  }, [studio, activeScreen]);

  // Automatic Royal Music Box synthesized loop whenever unsealed, unmuted, music active & no external audioSrc
  useEffect(() => {
    if (!envelopeOpened || muted || !isPlayingMusic || audioSrc) return;
    let stopLoop: (() => void) | undefined;
    const delayTimer = window.setTimeout(() => {
      stopLoop = startRoyalMusicBoxLoop();
    }, 950);

    return () => {
      window.clearTimeout(delayTimer);
      stopLoop?.();
    };
  }, [envelopeOpened, muted, isPlayingMusic, audioSrc]);

  const handleFieldClick = (tabIndex: number, fieldId: string) => {
    if ((isEditing || studio) && onSelectField) {
      onSelectField(tabIndex, fieldId);
    }
  };

  const studioEditProps = (tabIndex: number, fieldId: string, label: string) =>
    (isEditing || studio) && onSelectField
      ? {
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            handleFieldClick(tabIndex, fieldId);
          },
          title: `คลิกเพื่อแก้ไข${label}`,
          "data-editable-field": fieldId,
          "data-edit-label": `แก้ไข${label}`,
        }
      : {};

  // Slow velvet crossfade between stages so nothing pops abruptly
  const transitionToStage = useCallback(
    (nextStage: WaxStage) => {
      setIsTransitioningStage(true);
      scheduleTimeout(() => {
        setStage(nextStage);
        setStageVisitKey((k) => k + 1);
        scrollContainerRef.current?.scrollTo({ top: 0 });
        scheduleTimeout(() => {
          setIsTransitioningStage(false);
        }, Math.round(520 * pace));
      }, Math.round(560 * pace));
    },
    [pace, scheduleTimeout]
  );

  // Act I: Break Seal -> Auto-play music -> Slowly open flap -> Enter Secret PIN Vault (or Letter)
  const handleBreakSeal = () => {
    if (isBreakingSeal || isTransitioningStage) return;

    unlockVintageAudio();
    if (!studio) {
      setMuted(false);
    }
    setIsPlayingMusic(true);

    playWaxCrack();
    setIsBreakingSeal(true);
    setSealBurstTrigger((prev) => prev + 1);

    // Activate automatic audio right away inside the unsealing ritual
    scheduleTimeout(() => {
      setEnvelopeOpened(true);
      if (!studio) {
        playGrandUnsealSwell();
      }
    }, 260);

    scheduleTimeout(() => {
      if (!studio) {
        playPaperRustle();
      }
    }, 780);

    // Wait slowly through the entire wax crack + velvet flap lifting + golden light swell before entering Act II
    scheduleTimeout(() => {
      const nextTarget: WaxStage = !studio && isPinRequired && !pinUnlocked ? "pin" : "letter";
      transitionToStage(nextTarget);
      scheduleTimeout(() => setIsBreakingSeal(false), 600);
    }, Math.round(2300 * pace));
  };

  // Act II: Verify 4-digit PIN inside the Obsidian Cryptex Vault
  const verifyPinAttempt = useCallback(
    async (candidate: string) => {
      if (candidate.length !== 4 || pinChecking || pinUnlockSuccess) return;
      setPinChecking(true);

      let matched = false;
      try {
        if (hashId && expectedPin) {
          const res = await verifyCardPin(hashId, candidate);
          matched = res?.success === true;
        } else {
          matched = candidate === effectivePinCode;
        }
      } catch {
        matched = false;
      } finally {
        setPinChecking(false);
      }

      if (matched) {
        setPinUnlockSuccess(true);
        setPinUnlocked(true);
        if (!muted) {
          playVaultUnlockChime();
        }
        setSealBurstTrigger((prev) => prev + 1);

        // Hold unhurriedly on illuminated gold padlock before slowly unveiling the royal parchment
        scheduleTimeout(() => {
          transitionToStage("letter");
          scheduleTimeout(() => {
            setPinUnlockSuccess(false);
            setPinInput("");
          }, 700);
        }, Math.round(1450 * pace));
      } else {
        setPinError(true);
        if (!muted) {
          playVaultRejectChime();
        }
        scheduleTimeout(() => {
          setPinInput("");
          setPinError(false);
        }, 900);
      }
    },
    [
      pinChecking,
      pinUnlockSuccess,
      hashId,
      expectedPin,
      effectivePinCode,
      muted,
      scheduleTimeout,
      transitionToStage,
      pace,
    ]
  );

  const handleDigitPress = (digit: string) => {
    if (pinChecking || pinUnlockSuccess || pinInput.length >= 4) return;
    unlockVintageAudio();
    const nextPin = pinInput + digit;
    setPinInput(nextPin);
    setPinError(false);
    if (!muted) {
      playPinKeyChime(nextPin.length - 1);
    }
    if (nextPin.length === 4) {
      void verifyPinAttempt(nextPin);
    }
  };

  const handleBackspace = () => {
    if (pinChecking || pinUnlockSuccess || pinInput.length === 0) return;
    setPinInput((curr) => curr.slice(0, -1));
    setPinError(false);
    if (!muted) {
      playMusicBoxChime(440, 0.35, 0.04);
    }
  };

  const handleResetPin = () => {
    if (pinChecking || pinUnlockSuccess || pinInput.length === 0) return;
    setPinInput("");
    setPinError(false);
    if (!muted) {
      playMusicBoxChime(392, 0.4, 0.04);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    pointerRef.current = { x, y };
    setPointerNormalized({ x, y });
  };

  const toggleMute = () => {
    unlockVintageAudio();
    setMuted((curr) => {
      const next = !curr;
      if (!next && envelopeOpened) {
        playRoyalArpeggio();
      }
      return next;
    });
  };

  const handleGalleryStep = (delta: number) => {
    if (!muted) {
      playPaperRustle();
      playMusicBoxChime(delta > 0 ? 987.77 : 783.99, 0.9, 0.055);
    }
    setCurrentPhotoIdx((prev) => (prev + delta + activePhotos.length) % activePhotos.length);
  };

  const replayCeremonyFromSeal = () => {
    if (isTransitioningStage) return;
    if (!muted) {
      playPaperRustle();
      playRoyalArpeggio();
    }
    setIsBreakingSeal(false);
    setPinInput("");
    setPinError(false);
    setPinUnlockSuccess(false);
    if (isPinRequired && !studio) {
      setPinUnlocked(false);
    }
    setEnvelopeOpened(false);
    transitionToStage("envelope");
  };

  // Subtle ambient parallax shift on foreground parlor frame
  const tiltX = (pointerNormalized.x - 0.5) * -8;
  const tiltY = (pointerNormalized.y - 0.5) * 6;

  // Color palette for wax accent glow
  const sealGlowColor =
    waxColor === "gold"
      ? "rgba(217, 119, 6, 0.34)"
      : "rgba(190, 18, 60, 0.35)";

  // Helper timing generator for slow ceremonial detail staggers
  const d = (seconds: number) => Number((seconds * pace).toFixed(2));

  return (
    <div
      ref={scrollContainerRef}
      onPointerMove={handlePointerMove}
      className="relative h-full w-full overflow-y-auto overflow-x-hidden overscroll-y-contain custom-scrollbar flex flex-col items-center font-serif select-none"
      style={{
        background:
          "radial-gradient(circle at 50% 35%, #231015 0%, #12080c 58%, #070305 100%)",
      }}
    >
      {/* Persistent Automatic Background Audio when unsealed */}
      {audioSrc && (
        <BackgroundAudioPlayer
          url={audioSrc}
          isPlaying={envelopeOpened && isPlayingMusic && !muted}
          loop
        />
      )}

      {/* Living 60FPS Ambient Canvas: Chandelier Rays, Floating Embers, Cursor Gold Dust */}
      <RoyalChamberCanvas
        stage={stage === "envelope" ? 1 : stage === "finale" ? 3 : 2}
        pointerRef={pointerRef}
        sealBurstTrigger={sealBurstTrigger}
      />

      {/* Velvet Vignette & Radial Aura */}
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(4, 1, 3, 0.72) 100%)",
        }}
      />

      {/* Slow Velvet Crossfade Mist Overlay during Stage Transitions */}
      <AnimatePresence>
        {isTransitioningStage && (
          <motion.div
            key="velvet-curtain-veil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: d(0.65), ease: CEREMONY_EASE }}
            className="pointer-events-none fixed inset-0 z-40"
            style={{
              background:
                "radial-gradient(circle at 50% 48%, rgba(212,175,55,0.14) 0%, rgba(16,6,9,0.92) 60%, rgba(6,2,4,0.98) 100%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating Top-Right Circular Audio Medallion ONLY (stays sticky while scrolling) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: d(1.0), delay: d(0.2), ease: CEREMONY_EASE }}
        className="sticky top-4 self-end mr-4 sm:mr-6 -mb-10 z-30 shrink-0"
      >
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "เปิดเสียงดนตรีราชสำนัก" : "ปิดเสียง"}
          title={muted ? "เปิดเสียง" : "ปิดเสียง"}
          className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-500 shadow-lg ${
            !muted && envelopeOpened
              ? "bg-amber-500/25 border-amber-300/55 text-amber-200 shadow-[0_0_22px_rgba(217,119,6,0.3)]"
              : "bg-[#13080b]/80 border-amber-400/25 text-amber-300/70 hover:text-amber-100 hover:border-amber-300/55"
          }`}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </motion.div>

      {/* Main Centered Chamber Stage */}
      <div className="relative z-20 my-auto w-full max-w-4xl px-4 py-12 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {/* ==================== ACT I: SEALED ROYAL ENVELOPE ==================== */}
          {stage === "envelope" && (
            <motion.div
              key={`stage-envelope-${stageVisitKey}`}
              initial={{ opacity: 0, y: 26, scale: 0.96, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
              transition={{ duration: d(1.15), ease: CEREMONY_EASE }}
              className="w-full max-w-[355px] sm:max-w-[390px] flex flex-col items-center"
              style={{
                transform: studio ? undefined : `perspective(1200px) rotateX(${tiltY * 0.35}deg) rotateY(${tiltX * 0.35}deg)`,
                transition: "transform 0.35s ease-out",
              }}
            >
              {/* Soft Candlelit Halo under the Envelope */}
              <div
                className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[115%] h-[110%] rounded-full blur-3xl opacity-55 transition-opacity duration-1000"
                style={{
                  background: isBreakingSeal
                    ? "radial-gradient(circle, rgba(251,191,36,0.5) 0%, transparent 65%)"
                    : `radial-gradient(circle, ${sealGlowColor} 0%, transparent 68%)`,
                }}
              />

              {/* Compact Luxury Parchment Envelope Body */}
              <div
                className="relative w-full rounded-2xl overflow-hidden shadow-[0_28px_75px_rgba(0,0,0,0.9),0_0_45px_rgba(180,120,40,0.16)] border border-amber-300/45 pb-6"
                style={{
                  background: "linear-gradient(155deg, #fffdf8 0%, #f4ebd8 58%, #e4d4b7 100%)",
                }}
              >
                {/* Warm paper cotton fiber weave texture */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-35"
                  style={{
                    backgroundImage:
                      "radial-gradient(#8a6d44 0.55px, transparent 0.55px), radial-gradient(#8a6d44 0.4px, #f7efe0 0.4px)",
                    backgroundSize: "16px 16px",
                    backgroundPosition: "0 0, 8px 8px",
                  }}
                />

                {/* Golden Chamber Light blooming from inside when flap unseals */}
                <motion.div
                  initial={false}
                  animate={{ opacity: isBreakingSeal ? 0.92 : 0 }}
                  transition={{ duration: d(1.3), delay: d(0.35), ease: CEREMONY_EASE }}
                  className="pointer-events-none absolute inset-x-6 top-6 h-36 rounded-full blur-2xl"
                  style={{
                    background:
                      "radial-gradient(ellipse at 50% 30%, rgba(253,224,71,0.85) 0%, rgba(245,158,11,0.3) 55%, transparent 100%)",
                  }}
                />

                {/* Recessed Inner Brass Border */}
                <div className="pointer-events-none absolute inset-3 rounded-xl border border-[#b48a4e]/40" />

                {/* Baroque Ornate Brass Corner Filigrees — Staggered Reveal */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: d(1.1), delay: d(0.25), ease: CEREMONY_EASE }}
                  className="pointer-events-none absolute inset-0"
                >
                  <BaroqueFrameCorners />
                </motion.div>

                {/* Animated Top Velvet & Parchment Triangular Flap (Compact Proportions) */}
                <motion.div
                  initial={false}
                  animate={
                    isBreakingSeal
                      ? { rotateX: 168, y: -10, opacity: 0.5 }
                      : { rotateX: 0, y: 0, opacity: 1 }
                  }
                  transition={{ duration: d(1.45), delay: d(0.38), ease: CEREMONY_EASE }}
                  style={{ transformOrigin: "top center", perspective: 1100 }}
                  className="relative z-10 w-full"
                >
                  <svg viewBox="0 0 400 132" className="w-full h-auto drop-shadow-[0_10px_18px_rgba(40,20,10,0.2)]">
                    <defs>
                      <linearGradient id="flapGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fdf8ef" />
                        <stop offset="75%" stopColor="#eadcc4" />
                        <stop offset="100%" stopColor="#dac5a1" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,0 L400,0 L200,120 Z"
                      fill="url(#flapGrad)"
                      stroke="#b58d4d"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M24,6 L376,6 L200,106 Z"
                      fill="none"
                      stroke="#b58d4d"
                      strokeWidth="0.9"
                      strokeDasharray="4 4"
                      opacity="0.7"
                    />
                  </svg>
                </motion.div>

                {/* Envelope Central Recipient Inscription — Clean spacing below flap tip */}
                <div
                  className="relative z-20 mt-2 flex flex-col items-center justify-center text-center px-6 cursor-pointer rounded-xl"
                  {...studioEditProps(1, "field-wax-envelope-title", "หน้าซองจดหมาย")}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: d(1.0), delay: d(0.5), ease: CEREMONY_EASE }}
                    className="flex items-center gap-2 text-[#8c6429] mb-1.5"
                  >
                    <span className="h-[1px] w-6 bg-[#9c7338]/55" />
                    <Crown className="w-3.5 h-3.5 text-[#a17534]" />
                    <span className="h-[1px] w-6 bg-[#9c7338]/55" />
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 12, letterSpacing: "0.2em" }}
                    animate={{ opacity: 1, y: 0, letterSpacing: "0.28em" }}
                    transition={{ duration: d(1.05), delay: d(0.75), ease: CEREMONY_EASE }}
                    className="text-[10px] uppercase font-sans font-bold text-[#8c6429] mb-2"
                  >
                    {recipientSubtitle}
                  </motion.p>

                  <motion.h1
                    initial={{ opacity: 0, y: 16, filter: "blur(5px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: d(1.15), delay: d(1.05), ease: CEREMONY_EASE }}
                    className="text-xl sm:text-2xl font-bold tracking-tight text-[#2b171b] leading-snug max-w-[300px]"
                  >
                    {title}
                  </motion.h1>

                  <motion.div
                    initial={{ opacity: 0, scaleX: 0.4 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: d(1.0), delay: d(1.35), ease: CEREMONY_EASE }}
                    className="w-32 my-2.5 text-[#9c7338]"
                  >
                    <RoyalCrestDivider />
                  </motion.div>
                </div>

                {/* Sculpted 3D Royal Wax Seal + Subtle Pulsing Icon Ring */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: d(1.2), delay: d(1.55), ease: CEREMONY_EASE }}
                  className="relative z-30 flex flex-col items-center justify-center mt-1 pb-2"
                >
                  <div
                    className="rounded-full"
                    {...studioEditProps(1, "field-wax-seal-style", "สไตล์ตราประทับขี้ผึ้ง")}
                  >
                    <WaxSeal
                      isBroken={isBreakingSeal}
                      onBreak={handleBreakSeal}
                      color={waxColor}
                      symbol={styleVal === 2 ? "rose" : styleVal === 3 ? "crown" : "heart"}
                      muted={muted}
                    />
                  </div>

                  {/* Pure Icon Affordance Ring (No Text Chrome) */}
                  <motion.button
                    type="button"
                    onClick={handleBreakSeal}
                    aria-label="ประทับและเปิดผนึกซองจดหมาย"
                    title="เปิดผนึกซองจดหมาย"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                      opacity: isBreakingSeal ? 0 : 1,
                      scale: isBreakingSeal ? 0.75 : 1,
                    }}
                    transition={{ duration: d(1.0), delay: d(1.9), ease: CEREMONY_EASE }}
                    className="mt-2.5 group relative w-10 h-10 rounded-full flex items-center justify-center bg-[#f8efe0] border border-[#b48a4e]/60 text-[#722130] shadow-md hover:scale-110 transition-transform"
                  >
                    <span className="pointer-events-none absolute inset-0 rounded-full border border-[#b48a4e]/50 animate-ping" />
                    <Fingerprint className="w-4 h-4 relative z-10" />
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ==================== ACT II: SECRET ROYAL CIPHER PIN VAULT ==================== */}
          {stage === "pin" && (
            <motion.div
              key={`stage-pin-${stageVisitKey}`}
              initial={{ opacity: 0, y: 24, scale: 0.96, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
              transition={{ duration: d(1.15), ease: CEREMONY_EASE }}
              className="w-full max-w-[440px]"
            >
              <motion.div
                animate={pinError ? { x: [-9, 9, -7, 7, -3, 3, 0] } : { x: 0 }}
                transition={{ duration: 0.5 }}
                className="relative rounded-2xl overflow-hidden border border-amber-400/35 shadow-[0_32px_90px_rgba(0,0,0,0.92),inset_0_0_45px_rgba(217,119,6,0.1)] p-6 sm:p-8"
                style={{
                  background: "linear-gradient(155deg, #211015 0%, #14090d 55%, #0c0407 100%)",
                }}
              >
                {/* Slow Corner Filigrees */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: d(1.0), delay: d(0.2) }}
                  className="pointer-events-none"
                >
                  <BaroqueFrameCorners className="opacity-55" />
                </motion.div>

                {/* Central Lock / Unlock Royal Crest Medallion */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: d(1.0), delay: d(0.45), ease: CEREMONY_EASE }}
                    onClick={(e) => {
                      if ((isEditing || studio) && onSelectField) {
                        e.stopPropagation();
                        handleFieldClick(2, "field-wax-pin-code");
                      }
                    }}
                    title={(isEditing || studio) && onSelectField ? "คลิกเพื่อแก้ไขรหัสผ่าน 4 หลัก" : undefined}
                    data-editable-field={(isEditing || studio) && onSelectField ? "field-wax-pin-code" : undefined}
                    data-edit-label={(isEditing || studio) && onSelectField ? "แก้ไขรหัสผ่าน 4 หลัก" : undefined}
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-700 cursor-pointer ${
                      pinUnlockSuccess
                        ? "bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 border-amber-200 text-[#1b0b08] shadow-[0_0_40px_rgba(245,158,11,0.75)] scale-110"
                        : pinError
                        ? "bg-rose-950/70 border-rose-500/70 text-rose-300 shadow-[0_0_24px_rgba(225,29,72,0.45)]"
                        : "bg-amber-950/50 border-amber-400/45 text-amber-200 shadow-[0_0_25px_rgba(217,119,6,0.2)]"
                    }`}
                  >
                    <motion.div
                      animate={{ rotate: pinUnlockSuccess ? 360 : 0 }}
                      transition={{ duration: 1.4, ease: CEREMONY_EASE }}
                      className="pointer-events-none absolute -inset-2 rounded-full border border-dashed border-amber-400/35"
                    />
                    {pinUnlockSuccess ? (
                      <Unlock className="w-7 h-7" />
                    ) : pinChecking ? (
                      <KeyRound className="w-7 h-7 animate-spin" />
                    ) : (
                      <Lock className="w-7 h-7" />
                    )}
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: d(1.05), delay: d(0.75), ease: CEREMONY_EASE }}
                    className="mt-4 text-xl sm:text-2xl font-bold text-amber-100 tracking-wide"
                  >
                    {pinUnlockSuccess ? "ยืนยันตัวตนสำเร็จ" : "รหัสลับเปิดผนึก"}
                  </motion.h2>

                  <motion.div
                    initial={{ opacity: 0, scaleX: 0.3 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: d(0.95), delay: d(1.0), ease: CEREMONY_EASE }}
                    className="w-32 my-2.5 text-amber-400/60"
                  >
                    <RoyalCrestDivider />
                  </motion.div>

                  {/* Sample Preview Key Badge ONLY in non-hashId default preview mode */}
                  {showSamplePinHint && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: d(0.9), delay: d(1.15) }}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/35 text-amber-200 text-xs font-medium tracking-wide mb-3"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>
                        รหัสตัวอย่าง:{" "}
                        <span className="font-mono font-bold tracking-[0.2em] text-amber-100">
                          1234
                        </span>
                      </span>
                    </motion.div>
                  )}

                  {/* 4 Illuminated Crystal PIN Sockets */}
                  <div className="flex items-center justify-center gap-3.5 my-4">
                    {[0, 1, 2, 3].map((slotIdx) => {
                      const filled = pinInput.length > slotIdx;
                      return (
                        <motion.div
                          key={slotIdx}
                          initial={{ opacity: 0, y: 10, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: filled ? 1.08 : 1 }}
                          transition={{
                            duration: d(0.85),
                            delay: d(1.2 + slotIdx * 0.14),
                            ease: CEREMONY_EASE,
                          }}
                          className={`relative w-12 h-14 rounded-xl flex items-center justify-center border transition-all duration-400 ${
                            pinUnlockSuccess
                              ? "border-amber-200 bg-amber-500/25 shadow-[0_0_22px_rgba(251,191,36,0.55)]"
                              : pinError
                              ? "border-rose-500/70 bg-rose-950/50"
                              : filled
                              ? "border-amber-300 bg-amber-500/20 shadow-[0_0_16px_rgba(245,158,11,0.35)]"
                              : "border-amber-400/25 bg-black/45"
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                              pinUnlockSuccess
                                ? "bg-amber-200 shadow-[0_0_12px_rgba(253,224,71,0.95)] scale-110"
                                : pinError
                                ? "bg-rose-400"
                                : filled
                                ? "bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.85)]"
                                : "bg-amber-900/40"
                            }`}
                          />
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Antique Brass Circular Dial Keypad (Icons instead of text chrome) */}
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: d(1.05), delay: d(1.65), ease: CEREMONY_EASE }}
                    className="grid grid-cols-3 gap-3 mt-2 w-full max-w-[270px]"
                  >
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleDigitPress(num)}
                        disabled={pinChecking || pinUnlockSuccess}
                        className="h-13 rounded-full font-mono text-lg font-bold text-amber-100 bg-gradient-to-b from-[#2b151a] to-[#170b0e] border border-amber-400/30 shadow-[0_6px_16px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,215,140,0.2)] hover:border-amber-300/65 hover:text-amber-200 active:scale-95 transition-all disabled:opacity-45"
                      >
                        {num}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={handleResetPin}
                      aria-label="ล้างรหัสทั้งหมด"
                      title="ล้างรหัสทั้งหมด"
                      disabled={pinChecking || pinUnlockSuccess || pinInput.length === 0}
                      className="h-13 rounded-full flex items-center justify-center text-amber-300/80 bg-[#180b0f] border border-amber-400/25 hover:border-amber-300/55 hover:text-amber-100 active:scale-95 transition-all disabled:opacity-30"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDigitPress("0")}
                      disabled={pinChecking || pinUnlockSuccess}
                      className="h-13 rounded-full font-mono text-lg font-bold text-amber-100 bg-gradient-to-b from-[#2b151a] to-[#170b0e] border border-amber-400/30 shadow-[0_6px_16px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,215,140,0.2)] hover:border-amber-300/65 hover:text-amber-200 active:scale-95 transition-all disabled:opacity-45"
                    >
                      0
                    </button>

                    <button
                      type="button"
                      onClick={handleBackspace}
                      aria-label="ลบตัวเลขล่าสุด"
                      title="ลบตัวเลขล่าสุด"
                      disabled={pinChecking || pinUnlockSuccess || pinInput.length === 0}
                      className="h-13 rounded-full flex items-center justify-center text-amber-300/80 bg-[#180b0f] border border-amber-400/25 hover:border-amber-300/55 hover:text-amber-100 active:scale-95 transition-all disabled:opacity-30"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ==================== ACT III: ILLUMINATED ROYAL PARCHMENT LETTER & GALLERY ==================== */}
          {stage === "letter" && (
            <motion.div
              key={`stage-letter-${stageVisitKey}`}
              initial={{ opacity: 0, y: 28, scale: 0.96, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
              transition={{ duration: d(1.15), ease: CEREMONY_EASE }}
              className="w-full"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: Illuminated Royal Parchment Scroll */}
                <div className="lg:col-span-7 relative rounded-2xl overflow-hidden shadow-[0_28px_80px_rgba(0,0,0,0.85)] border border-amber-300/45 bg-gradient-to-b from-[#fffef9] via-[#f7eedc] to-[#eadac0] p-6 sm:p-10 text-[#2b171b]">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-28"
                    style={{
                      backgroundImage: "radial-gradient(#785c37 0.5px, transparent 0.5px)",
                      backgroundSize: "14px 14px",
                    }}
                  />
                  <div className="pointer-events-none absolute inset-3 rounded-xl border border-[#b48a4e]/35" />

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: d(1.0), delay: d(0.25) }}
                    className="pointer-events-none"
                  >
                    <BaroqueFrameCorners />
                  </motion.div>

                  {/* Top Crown Crest & Headline */}
                  <div
                    className="relative z-10 text-center pb-5 border-b border-[#b48a4e]/30 cursor-pointer rounded-xl"
                    {...studioEditProps(3, "field-wax-letter-title", "หัวข้อจดหมาย")}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: d(0.95), delay: d(0.45), ease: CEREMONY_EASE }}
                      className="flex justify-center mb-2.5 text-[#8c6429]"
                    >
                      <Crown className="w-6 h-6" />
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: d(1.1), delay: d(0.75), ease: CEREMONY_EASE }}
                      className="text-xl sm:text-2xl font-bold text-[#2b171b] leading-snug"
                    >
                      {letterHeadline}
                    </motion.h2>

                    <motion.div
                      initial={{ opacity: 0, scaleX: 0.4 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ duration: d(0.95), delay: d(1.05), ease: CEREMONY_EASE }}
                      className="w-36 mx-auto mt-3 text-[#9c7338]"
                    >
                      <RoyalCrestDivider />
                    </motion.div>
                  </div>

                  {/* Letter Body Paragraphs — Sequential Slow Unhurried Ink-to-Paper Reveal */}
                  <div
                    className="relative z-10 py-6 space-y-5 text-[15px] sm:text-[17px] leading-[1.9] text-[#3a241d] font-medium cursor-pointer rounded-xl"
                    {...studioEditProps(3, "field-wax-letter-body", "เนื้อหาจดหมาย")}
                  >
                    {letterLines.map((paragraph, pIdx) => (
                      <motion.p
                        key={`p-${pIdx}-${stageVisitKey}`}
                        initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{
                          duration: d(1.15),
                          delay: d(1.25 + pIdx * 0.48),
                          ease: CEREMONY_EASE,
                        }}
                        className={
                          pIdx === 0
                            ? "first-letter:text-4xl first-letter:font-bold first-letter:text-[#7c1d31] first-letter:mr-2 first-letter:float-left first-letter:leading-none"
                            : ""
                        }
                      >
                        {paragraph}
                      </motion.p>
                    ))}
                  </div>

                  {/* Signature & Wax Monogram Stamp */}
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: d(1.1),
                      delay: d(1.25 + letterLines.length * 0.48 + 0.25),
                      ease: CEREMONY_EASE,
                    }}
                    className="relative z-10 pt-5 border-t border-[#b48a4e]/30 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-lg font-bold text-[#7c1d31]">{signature}</p>
                    </div>
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#8c1c31] to-[#4e0b18] border border-amber-300/60 flex items-center justify-center shadow-lg text-amber-200">
                      <Check className="w-5 h-5" />
                    </div>
                  </motion.div>
                </div>

                {/* RIGHT COLUMN: Framed Museum Portraits + Icon Controls */}
                <motion.div
                  initial={{ opacity: 0, y: 20, filter: "blur(5px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: d(1.2), delay: d(0.95), ease: CEREMONY_EASE }}
                  className="lg:col-span-5 flex flex-col gap-5"
                >
                  <div
                    className="relative rounded-2xl overflow-hidden border border-amber-300/40 bg-[#1a0d11]/92 p-4 sm:p-5 shadow-[0_24px_65px_rgba(0,0,0,0.85)]"
                    {...studioEditProps(4, "field-wax-photos", "รูปภาพความทรงจำ")}
                  >
                    <div className="relative rounded-xl overflow-hidden border-2 border-[#b48a4e]/60 aspect-[4/3] bg-black/50 group">
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={`gallery-${currentPhotoIdx}`}
                          src={activePhotos[currentPhotoIdx]?.url || "/templates/vintage-wax-seal.svg"}
                          alt={`Memory ${currentPhotoIdx + 1}`}
                          initial={{ opacity: 0, scale: 1.05, filter: "blur(4px)" }}
                          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                          exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                          transition={{ duration: d(0.95), ease: CEREMONY_EASE }}
                          className="w-full h-full object-cover"
                        />
                      </AnimatePresence>

                      {/* Zoom Fullscreen Icon Medallion */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxUrl(activePhotos[currentPhotoIdx]?.url || null);
                        }}
                        aria-label="ขยายภาพเต็มจอ"
                        title="ขยายภาพเต็มจอ"
                        className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/65 hover:bg-amber-950/90 text-amber-100 border border-amber-300/45 flex items-center justify-center backdrop-blur-md transition-all shadow-lg"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Engraved Brass Plaque Caption — Staggered on every image change */}
                    <div
                      className="mt-4 text-center px-2 min-h-[3.2rem] cursor-pointer rounded-xl"
                      {...studioEditProps(4, "field-wax-photo-caption", "คำบรรยายใต้ภาพ")}
                    >
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={`caption-${currentPhotoIdx}-${stageVisitKey}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: d(0.85), delay: d(0.3), ease: CEREMONY_EASE }}
                          className="text-sm text-amber-100/90 italic leading-relaxed"
                        >
                          &ldquo;
                          {activePhotos[currentPhotoIdx]?.caption || "ช่วงเวลาอันแสนพิเศษของเรา"}
                          &rdquo;
                        </motion.p>
                      </AnimatePresence>
                    </div>

                    {/* Icon-only Gallery Prev / Dots / Next Controls */}
                    {activePhotos.length > 1 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: d(0.85), delay: d(1.35) }}
                        className="mt-4 pt-3.5 border-t border-amber-500/20 flex items-center justify-between"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGalleryStep(-1);
                          }}
                          aria-label="ภาพก่อนหน้า"
                          title="ภาพก่อนหน้า"
                          className="w-10 h-10 rounded-full border border-amber-400/35 bg-amber-950/45 hover:bg-amber-900/65 text-amber-100 flex items-center justify-center transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-2">
                          {activePhotos.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              aria-label={`ภาพที่ ${idx + 1}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!muted) playMusicBoxChime(659.25 + idx * 55, 0.7, 0.045);
                                setCurrentPhotoIdx(idx);
                              }}
                              className={`h-2 rounded-full transition-all duration-500 ${
                                idx === currentPhotoIdx
                                  ? "w-7 bg-amber-400"
                                  : "w-2 bg-amber-200/30 hover:bg-amber-200/55"
                              }`}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGalleryStep(1);
                          }}
                          aria-label="ภาพถัดไป"
                          title="ภาพถัดไป"
                          className="w-10 h-10 rounded-full border border-amber-400/35 bg-amber-950/45 hover:bg-amber-900/65 text-amber-100 flex items-center justify-center transition-all"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </div>

                  {/* Proceed to Music Box & Finale: Sculpted Icon Medallion Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: d(1.0), delay: d(1.85), ease: CEREMONY_EASE }}
                    className="flex justify-center pt-1"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!muted) {
                          playPaperRustle();
                          playRoyalArpeggio();
                        }
                        setSealBurstTrigger((prev) => prev + 1);
                        transitionToStage("finale");
                      }}
                      aria-label="เปิดหีบดนตรีและคำปฏิญาณ"
                      title="เปิดหีบดนตรีและคำปฏิญาณ"
                      className="group relative h-14 px-8 rounded-full bg-gradient-to-r from-[#5a1423] via-[#7c1d31] to-[#5a1423] hover:from-[#70182a] hover:to-[#70182a] text-amber-100 border border-amber-400/65 shadow-[0_14px_38px_rgba(0,0,0,0.65),0_0_25px_rgba(217,119,6,0.28)] flex items-center gap-3.5 transition-all hover:scale-[1.03]"
                    >
                      <Disc3 className="w-5 h-5 text-amber-300 animate-[spin_9s_linear_infinite]" />
                      <span className="h-4 w-[1px] bg-amber-300/35" />
                      <ArrowRight className="w-5 h-5 text-amber-200 group-hover:translate-x-1 transition-transform duration-300" />
                    </button>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ==================== ACT IV: ANTIQUE MUSIC BOX & ETERNAL VOW FINALE ==================== */}
          {stage === "finale" && (
            <motion.div
              key={`stage-finale-${stageVisitKey}`}
              initial={{ opacity: 0, y: 28, scale: 0.96, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
              transition={{ duration: d(1.2), ease: CEREMONY_EASE }}
              className="w-full max-w-2xl"
            >
              <div className="relative rounded-3xl overflow-hidden border border-amber-400/40 shadow-[0_32px_95px_rgba(0,0,0,0.9),inset_0_0_50px_rgba(217,119,6,0.1)] bg-gradient-to-b from-[#1e0d12]/95 via-[#13070a]/95 to-[#0b0406]/95 backdrop-blur-xl p-6 sm:p-10 text-amber-50">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: d(1.0), delay: d(0.25) }}
                  className="pointer-events-none"
                >
                  <BaroqueFrameCorners className="opacity-60" />
                </motion.div>

                {/* Antique Brass Clockwork Music Box */}
                <motion.div
                  initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: d(1.1), delay: d(0.55), ease: CEREMONY_EASE }}
                  className="relative z-10 rounded-2xl border border-amber-500/35 bg-[#120709]/85 p-5 sm:p-6 shadow-inner cursor-pointer"
                  {...studioEditProps(5, "field-wax-song-title", "เพลงและกล่องดนตรี")}
                >
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Clockwork Brass Gears + Spinning Gold Vinyl (true 1:1 circle) */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: d(1.15), delay: d(0.85), ease: CEREMONY_EASE }}
                      className="relative flex items-center justify-center shrink-0 w-36 h-32"
                    >
                      <div className="pointer-events-none absolute -left-2 top-1/2 -translate-y-1/2">
                        <ClockworkGearsSvg spinning={isPlayingMusic && !muted} />
                      </div>
                      <div
                        className={`relative z-10 w-24 h-24 shrink-0 aspect-square rounded-full border-2 border-amber-300/75 shadow-[0_0_26px_rgba(217,119,6,0.45)] flex items-center justify-center bg-[conic-gradient(from_0deg,#291815,#5c3a21,#291815,#4a2c18,#291815)] ${
                          isPlayingMusic && !muted ? "animate-[spin_7s_linear_infinite]" : ""
                        }`}
                      >
                        <div className="w-9 h-9 shrink-0 aspect-square rounded-full bg-gradient-to-br from-amber-300 to-amber-600 border border-[#2b171b] flex items-center justify-center">
                          <div className="w-2.5 h-2.5 shrink-0 aspect-square rounded-full bg-[#1a0a0d]" />
                        </div>
                      </div>
                    </motion.div>

                    {/* Music Box Track Details + Play/Pause Icon Medallion */}
                    <div className="flex-1 text-center sm:text-left">
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: d(0.9), delay: d(1.05), ease: CEREMONY_EASE }}
                        className="flex items-center justify-center sm:justify-start gap-2 text-amber-300/80 mb-2"
                      >
                        <Crown className="w-4 h-4" />
                        <Disc3 className="w-4 h-4" />
                      </motion.div>

                      <motion.h3
                        initial={{ opacity: 0, y: 12, filter: "blur(3px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: d(1.0), delay: d(1.25), ease: CEREMONY_EASE }}
                        className="text-xl sm:text-2xl font-bold text-amber-100 leading-tight"
                      >
                        {songTitle}
                      </motion.h3>

                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: d(0.95), delay: d(1.5), ease: CEREMONY_EASE }}
                        className="text-sm text-amber-200/70 mt-1"
                      >
                        {songArtist}
                      </motion.p>

                      {/* Circular Play/Pause Icon Button + Visualizer */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: d(0.95), delay: d(1.75), ease: CEREMONY_EASE }}
                        className="mt-4 flex items-center justify-center sm:justify-start gap-4"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            unlockVintageAudio();
                            setMuted(false);
                            setIsPlayingMusic((prev) => !prev);
                          }}
                          aria-label={isPlayingMusic && !muted ? "พักเสียงเพลง" : "บรรเลงเพลง"}
                          title={isPlayingMusic && !muted ? "พักเสียงเพลง" : "บรรเลงเพลง"}
                          className="w-11 h-11 rounded-full bg-amber-500/20 hover:bg-amber-500/35 border border-amber-300/55 text-amber-100 flex items-center justify-center transition-all shadow-lg"
                        >
                          {isPlayingMusic && !muted ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5" />
                          )}
                        </button>

                        <div className="flex items-end gap-1.5 h-6">
                          {[0.55, 0.95, 0.45, 0.8, 0.65, 0.9].map((h, idx) => (
                            <motion.span
                              key={idx}
                              animate={
                                isPlayingMusic && !muted
                                  ? {
                                      scaleY: [h, Math.min(1, h + 0.3), 0.35, h],
                                    }
                                  : { scaleY: 0.25 }
                              }
                              transition={{
                                duration: 0.9 + idx * 0.14,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                              style={{ originY: 1 }}
                              className="w-1.5 h-6 rounded-full bg-gradient-to-t from-amber-600 to-amber-300"
                            />
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                {/* Final Royal Vow Charter — Slow Sequenced Reveals */}
                <div
                  className="relative z-10 mt-8 text-center cursor-pointer rounded-2xl"
                  {...studioEditProps(6, "field-wax-finale-message", "คำลงท้ายและข้อความฉากจบ")}
                >
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0.3 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: d(1.0), delay: d(2.05), ease: CEREMONY_EASE }}
                    className="w-44 mx-auto text-amber-400/70 mb-5"
                  >
                    <RoyalCrestDivider />
                  </motion.div>

                  {/* Circular Royal Portrait Locket */}
                  {activePhotos[0]?.url && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.82 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: d(1.1), delay: d(2.3), ease: CEREMONY_EASE }}
                      className="mx-auto w-20 h-20 rounded-full p-1 bg-gradient-to-br from-amber-200 via-amber-500 to-amber-800 shadow-[0_0_26px_rgba(217,119,6,0.45)] mb-4"
                    >
                      <img
                        src={activePhotos[0].url}
                        alt="Royal Locket"
                        className="w-full h-full object-cover rounded-full"
                      />
                    </motion.div>
                  )}

                  <motion.h3
                    initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: d(1.15), delay: d(2.6), ease: CEREMONY_EASE }}
                    className="text-2xl sm:text-3xl font-bold text-amber-100 leading-snug"
                  >
                    {signature}
                  </motion.h3>

                  <motion.p
                    initial={{ opacity: 0, y: 12, filter: "blur(3px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: d(1.1), delay: d(2.95), ease: CEREMONY_EASE }}
                    className="mt-3 text-base text-amber-100/80 max-w-md mx-auto leading-relaxed"
                  >
                    {finaleSubText}
                  </motion.p>

                  {/* Royal Anniversary Date & Live Total Elapsed Chronometer */}
                  {elapsedStats && (
                    <motion.div
                      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: d(1.15), delay: d(3.2), ease: CEREMONY_EASE }}
                      {...studioEditProps(6, "field-wax-anniversary-date", "วันครบรอบนับเวลารวม")}
                      className="mt-7 mx-auto max-w-lg rounded-2xl border border-amber-400/30 bg-[#120609]/80 px-4 py-5 sm:px-6 shadow-[inset_0_0_28px_rgba(217,119,6,0.08)]"
                    >
                      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-amber-400/30 bg-amber-950/45 text-xs font-medium text-amber-200 tracking-wide mb-4">
                        <CalendarHeart className="w-3.5 h-3.5 text-amber-300" />
                        <span>วันครบรอบ {elapsedStats.formattedDate}</span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 sm:gap-3">
                        {[
                          {
                            value: elapsedStats.totalDays.toLocaleString("en-US"),
                            unit: "วันรวม",
                          },
                          {
                            value: String(elapsedStats.hours).padStart(2, "0"),
                            unit: "ชั่วโมง",
                          },
                          {
                            value: String(elapsedStats.minutes).padStart(2, "0"),
                            unit: "นาที",
                          },
                          {
                            value: String(elapsedStats.seconds).padStart(2, "0"),
                            unit: "วินาที",
                          },
                        ].map((item, idx) => (
                          <motion.div
                            key={item.unit}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: d(0.85),
                              delay: d(3.35 + idx * 0.12),
                              ease: CEREMONY_EASE,
                            }}
                            className="rounded-xl border border-amber-400/25 bg-gradient-to-b from-[#241016]/90 to-[#14070b]/95 py-2.5 px-1.5 shadow-md"
                          >
                            <div className="font-mono text-lg sm:text-2xl font-bold text-amber-200 tabular-nums leading-tight">
                              {item.value}
                            </div>
                            <div className="text-[10px] sm:text-[11px] font-sans uppercase tracking-wider text-amber-300/65 mt-1">
                              {item.unit}
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: d(0.9), delay: d(3.8) }}
                        className="mt-3.5 flex items-center justify-center gap-1.5 text-xs text-amber-200/75"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-400/80" />
                        <span>
                          นับเวลารวม{" "}
                          {elapsedStats.years > 0 ? `${elapsedStats.years} ปี ` : ""}
                          {elapsedStats.months > 0 ? `${elapsedStats.months} เดือน ` : ""}
                          {elapsedStats.remDays} วัน ({elapsedStats.totalHours.toLocaleString("en-US")} ชม.)
                        </span>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Finale Icon-Only Medallions */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: d(1.0), delay: d(elapsedStats ? 4.0 : 3.3), ease: CEREMONY_EASE }}
                    className="mt-7 flex items-center justify-center gap-4"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSealBurstTrigger((prev) => prev + 1);
                        if (!muted) playRoyalArpeggio();
                      }}
                      aria-label="ปล่อยประกายแสงทองคำ"
                      title="ปล่อยประกายแสงทองคำ"
                      className="w-12 h-12 rounded-full bg-amber-500/20 hover:bg-amber-500/35 border border-amber-300/60 text-amber-100 flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.28)] transition-all hover:scale-110"
                    >
                      <Sparkles className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        replayCeremonyFromSeal();
                      }}
                      aria-label="ย้อนกลับไปเปิดผนึกซองใหม่อีกครั้ง"
                      title="เริ่มต้นดูใหม่ตั้งแต่ต้น"
                      className="w-12 h-12 rounded-full bg-black/50 hover:bg-amber-950/60 border border-amber-300/35 text-amber-200 flex items-center justify-center transition-all hover:scale-110"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full-Screen Royal Portrait Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: CEREMONY_EASE }}
            onClick={() => setLightboxUrl(null)}
            className="fixed inset-0 z-[150] bg-black/92 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
          >
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              aria-label="ปิดภาพขยาย"
              className="fixed top-5 right-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/25 flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.img
              src={lightboxUrl}
              alt="Full Size Royal Portrait"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.7, ease: CEREMONY_EASE }}
              className="max-w-full max-h-[85vh] rounded-2xl border-2 border-amber-400/50 shadow-[0_0_80px_rgba(0,0,0,0.95)] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VintageWaxSealTemplate;
