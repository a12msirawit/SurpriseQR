"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Flame,
  Gift,
  Mail,
  Music,
  RotateCcw,
  RotateCw,
  Scissors,
  Shuffle,
  Sparkles,
  TrainFront,
  Volume2,
  VolumeX,
} from "lucide-react";
import BackgroundAudioPlayer from "@/components/audio/BackgroundAudioPlayer";
import { defaultGrandNewYearConfig, type GrandNewYearConfig } from "@/data/templates";
import MidnightTrainCanvas, {
  type RocketLaunchCommand,
  type TrainSceneMode,
} from "@/components/templates/GrandNewYear/MidnightTrainCanvas";
import FireworksFuseRack from "@/components/templates/GrandNewYear/FireworksFuseRack";
import TrainCutscenes, {
  type CutsceneType,
} from "@/components/templates/GrandNewYear/TrainCutscenes";
import TypewriterText from "@/components/templates/GrandNewYear/TypewriterText";
import { SkyLanternSvg } from "@/components/templates/GrandNewYear/OrnateDecor";
import {
  playCardFlip,
  playClockTick,
  playDoorSlide,
  playFortuneChime,
  playGiftPop,
  playGiftShake,
  playLanternRelease,
  playMidnightBell,
  playMysteryRevealSwirl,
  playTicketStamp,
  playTicketTearTick,
  playTrainChug,
  playTrainWhistle,
  startNewYearAmbience,
  unlockNewYearAudio,
} from "@/components/templates/GrandNewYear/newYearSound";

interface GrandNewYearTemplateProps {
  config?: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number | string;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

interface LanternWaveItem {
  id: number;
  leftPct: number;
  sway: number;
  duration: number;
  delay: number;
  scale: number;
}

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotate: number;
  color: string;
  size: number;
}

/** Normalize either SurpriseQRData or flat GrandNewYearConfig into GrandNewYearConfig. */
function resolveGrandNewYearConfig(config: unknown): GrandNewYearConfig {
  if (!config || typeof config !== "object") return defaultGrandNewYearConfig;
  const raw = config as Record<string, unknown>;
  const content = (raw.content as Record<string, unknown>) || raw;
  const menu = (content.menu as Record<string, unknown>) || {};
  const letter = (content.letter as Record<string, unknown>) || {};
  const memories = (content.memories as Record<string, unknown>) || {};
  const flowers = (content.flowers as Record<string, unknown>) || {};
  const finale = (content.finale as Record<string, unknown>) || {};
  const songMedia = (content.songMedia as Record<string, unknown>) || {};
  const bgMusic = (content.bgMusic as Record<string, unknown>) || {};
  const filmstrip = Array.isArray(memories.filmstripImages)
    ? (memories.filmstripImages as Array<{ src?: string }>)
    : [];
  const paragraphs = Array.isArray(letter.paragraphs) ? (letter.paragraphs as string[]) : [];
  const flowerFortunes =
    typeof flowers.message === "string"
      ? flowers.message
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  return {
    recipientName:
      (typeof raw.recipientName === "string" && raw.recipientName) ||
      (typeof menu.subTitle === "string" && menu.subTitle) ||
      defaultGrandNewYearConfig.recipientName,
    senderName:
      (typeof raw.senderName === "string" && raw.senderName) ||
      (typeof menu.card1Desc === "string" && menu.card1Desc) ||
      defaultGrandNewYearConfig.senderName,
    targetYear:
      (typeof raw.targetYear === "string" && raw.targetYear) ||
      (typeof menu.title === "string" && menu.title) ||
      defaultGrandNewYearConfig.targetYear,
    openingTagline:
      (typeof raw.openingTagline === "string" && raw.openingTagline) ||
      (typeof menu.card1Title === "string" && menu.card1Title) ||
      defaultGrandNewYearConfig.openingTagline,
    photo1Url:
      (typeof raw.photo1Url === "string" && raw.photo1Url) ||
      filmstrip[0]?.src ||
      defaultGrandNewYearConfig.photo1Url,
    photo1Caption:
      (typeof raw.photo1Caption === "string" && raw.photo1Caption) ||
      (typeof memories.sectionTitle === "string" && memories.sectionTitle) ||
      defaultGrandNewYearConfig.photo1Caption,
    mainWishTitle:
      (typeof raw.mainWishTitle === "string" && raw.mainWishTitle) ||
      (typeof letter.title === "string" && letter.title) ||
      defaultGrandNewYearConfig.mainWishTitle,
    mainWishMessage:
      (typeof raw.mainWishMessage === "string" && raw.mainWishMessage) ||
      paragraphs.join("\n\n") ||
      defaultGrandNewYearConfig.mainWishMessage,
    photo2Url:
      (typeof raw.photo2Url === "string" && raw.photo2Url) ||
      filmstrip[1]?.src ||
      (typeof (finale.heroImage as { src?: string } | undefined)?.src === "string" &&
        (finale.heroImage as { src?: string }).src) ||
      defaultGrandNewYearConfig.photo2Url,
    photo2Caption:
      (typeof raw.photo2Caption === "string" && raw.photo2Caption) ||
      (typeof memories.description === "string" && memories.description) ||
      defaultGrandNewYearConfig.photo2Caption,
    fortuneList:
      Array.isArray(raw.fortuneList) && raw.fortuneList.length > 0
        ? (raw.fortuneList as string[])
        : flowerFortunes.length > 0
          ? flowerFortunes
          : defaultGrandNewYearConfig.fortuneList,
    bgmUrl:
      (typeof raw.bgmUrl === "string" && raw.bgmUrl) ||
      (typeof songMedia.audioSrc === "string" && songMedia.audioSrc) ||
      (typeof bgMusic.src === "string" && bgMusic.src) ||
      "",
  };
}

function buildLanternWave(baseId: number, count = 8): LanternWaveItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: baseId + i,
    leftPct: 8 + (i * 84) / Math.max(1, count - 1) + (i % 2 === 0 ? 1 : -1) * 3,
    sway: (i % 2 === 0 ? 1 : -1) * (20 + (i % 3) * 12),
    duration: 14.5 + (i % 4) * 2.4,
    delay: i * 0.65,
    scale: 0.68 + (i % 3) * 0.2,
  }));
}

function buildGiftConfetti(baseId: number): ConfettiPiece[] {
  const colors = ["#FDE68A", "#F59E0B", "#FB7185", "#93C5FD", "#FFFBEB", "#C4B5FD"];
  return Array.from({ length: 24 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 24 + (i % 3) * 0.14;
    const dist = 75 + (i % 5) * 28;
    return {
      id: baseId + i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 35,
      rotate: (i % 2 === 0 ? 1 : -1) * (140 + i * 18),
      color: colors[i % colors.length],
      size: 6 + (i % 4) * 2,
    };
  });
}

/**
 * Midnight Time Train (2026 -> 2027) — 4-Stage Interactive New Year Journey:
 * 1. Golden Boarding Ticket with swipe/tap-to-tear stub & boarding stamp
 * 2. Arched Train Window overlooking parallax winter fireworks + 3D flippable Polaroid
 * 3. Interactive Shake-to-Open Gift Box revealing New Year letter & 3 lucky envelopes
 * 4. Destination Station 2027 finale with shimmer photo & floating sky lanterns
 */
export default function GrandNewYearTemplate({
  config = {},
  studio = false,
  activeScreen,
  refreshToken = 0,
  onSelectField,
}: GrandNewYearTemplateProps) {
  const data = useMemo(() => resolveGrandNewYearConfig(config), [config]);

  const originYear = useMemo(() => {
    const parsed = Number.parseInt(data.targetYear, 10);
    return Number.isFinite(parsed) && parsed > 1 ? String(parsed - 1) : "2026";
  }, [data.targetYear]);

  const [currentStage, setCurrentStage] = useState<number>(1);
  const [transitioning, setTransitioning] = useState(false);
  const [activeCutscene, setActiveCutscene] = useState<CutsceneType>(null);
  const [trainBanner, setTrainBanner] = useState<{ heading: string; subheading: string }>({
    heading: "ขบวนเที่ยงคืนกำลังออกเดินทาง",
    subheading: "",
  });
  const [countdownNum, setCountdownNum] = useState<number>(3);

  // Stage 1: Ticket tear interaction (unlocked after tagline finishes typing)
  const [stage1TextDone, setStage1TextDone] = useState(Boolean(studio));
  const [tearProgress, setTearProgress] = useState(0);
  const [ticketTorn, setTicketTorn] = useState(false);
  const tearTrackRef = useRef<HTMLDivElement | null>(null);
  const draggingTearRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragMovedRef = useRef(false);
  const lastTickStepRef = useRef(0);

  // Stage 2: Chain-Fuse Fireworks -> Mystery Floating Photo -> Slow Reveal -> 3D Flippable Polaroid
  const [stage2Phase, setStage2Phase] = useState<"fuse" | "mystery" | "revealed">(
    studio ? "revealed" : "fuse",
  );
  const [stage2TextDone, setStage2TextDone] = useState(Boolean(studio));
  const [fuseRackKey, setFuseRackKey] = useState(0);
  const [rocketCommand, setRocketCommand] = useState<RocketLaunchCommand | null>(null);
  const rocketCmdSeqRef = useRef(1);
  const [polaroidFlipped, setPolaroidFlipped] = useState(false);

  // Stage 3: Shake-to-open Gift Box & 3 Lucky Envelopes
  const [giftShakes, setGiftShakes] = useState(0);
  const [giftOpened, setGiftOpened] = useState(Boolean(studio));
  const [stage3TitleDone, setStage3TitleDone] = useState(Boolean(studio));
  const [stage3MessageDone, setStage3MessageDone] = useState(Boolean(studio));
  const [fortuneTextDone, setFortuneTextDone] = useState(Boolean(studio));
  const [giftWobbleKey, setGiftWobbleKey] = useState(0);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [selectedEnvelopeIdx, setSelectedEnvelopeIdx] = useState<number | null>(null);
  const [revealedFortune, setRevealedFortune] = useState<string | null>(null);
  const [fortuneDeckSeed, setFortuneDeckSeed] = useState(0);

  // Stage 4: Sky lanterns & fireworks (icon buttons revealed after caption finishes typing)
  const [stage4TextDone, setStage4TextDone] = useState(Boolean(studio));
  const [lanterns, setLanterns] = useState<LanternWaveItem[]>([]);
  const [burstTrigger, setBurstTrigger] = useState(0);

  // Audio & image fallbacks
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [photo1Fallback, setPhoto1Fallback] = useState<string | null>(null);
  const [photo2Fallback, setPhoto2Fallback] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const navBusyRef = useRef(false);
  const lanternSeqRef = useRef(1);
  const confettiSeqRef = useRef(1);
  const stopAmbienceRef = useRef<(() => void) | null>(null);

  const clearPendingTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  useEffect(() => {
    return () => {
      clearPendingTimers();
      stopAmbienceRef.current?.();
    };
  }, [clearPendingTimers]);

  useEffect(() => {
    setPhoto1Fallback(null);
  }, [data.photo1Url]);

  useEffect(() => {
    setPhoto2Fallback(null);
  }, [data.photo2Url]);

  // Built-in warm music-box melody when no custom BGM URL is supplied
  useEffect(() => {
    if (data.bgmUrl || !musicPlaying || muted) {
      stopAmbienceRef.current?.();
      stopAmbienceRef.current = null;
      return;
    }
    if (!stopAmbienceRef.current) {
      stopAmbienceRef.current = startNewYearAmbience();
    }
    return () => {
      stopAmbienceRef.current?.();
      stopAmbienceRef.current = null;
    };
  }, [data.bgmUrl, musicPlaying, muted]);

  // Sync live preview stage immediately when Studio editor tabs change
  useEffect(() => {
    if (!activeScreen) return;
    clearPendingTimers();
    navBusyRef.current = false;
    setTransitioning(false);
    setActiveCutscene(null);
    if (activeScreen === 1 || activeScreen === "countdown") setCurrentStage(1);
    else if (activeScreen === 2 || activeScreen === "fireworks") {
      setCurrentStage(2);
      if (studio) setStage2Phase("revealed");
    } else if (activeScreen === 3 || activeScreen === "wish") {
      setCurrentStage(3);
      if (studio) setGiftOpened(true);
    } else if (activeScreen === 4 || activeScreen === "finale") setCurrentStage(4);
  }, [activeScreen, clearPendingTimers, refreshToken, studio]);

  const goToStage = useCallback(
    (targetStage: number, onArrival?: () => void) => {
      if (navBusyRef.current || targetStage === currentStage) return;
      clearPendingTimers();
      if (studio) {
        onArrival?.();
        setCurrentStage(targetStage);
        return;
      }

      const stageDestination: Record<number, { heading: string; subheading: string }> = {
        1: { heading: "ขบวนรถไฟกำลังพากลับสู่ชานชาลา", subheading: "สถานีเริ่มต้น • ตั๋วข้ามปี" },
        2: { heading: "ขบวนเที่ยงคืนกำลังมุ่งหน้าไป", subheading: "สถานีถัดไป • ลานจุดพลุกลางราตรี" },
        3: { heading: "ขบวนเที่ยงคืนกำลังมุ่งหน้าไป", subheading: "สถานีถัดไป • ตู้เสบียงของขวัญ" },
        4: { heading: "ขบวนเที่ยงคืนกำลังมุ่งหน้าไป", subheading: `สถานีปลายทาง • ปีใหม่ ${data.targetYear}` },
      };

      unlockNewYearAudio();
      navBusyRef.current = true;
      setTrainBanner(stageDestination[targetStage] ?? stageDestination[1]);
      setTransitioning(true);
      setActiveCutscene("departure");
      if (!muted) {
        playTrainWhistle();
        playTrainChug();
      }

      schedule(() => {
        onArrival?.();
        if (!studio) {
          if (targetStage === 1) setStage1TextDone(false);
          if (targetStage === 2) setStage2TextDone(false);
          if (targetStage === 4) setStage4TextDone(false);
        }
        setCurrentStage(targetStage);
        if (targetStage === 4) {
          setBurstTrigger((c) => c + 1);
        }
      }, 2700);

      schedule(() => {
        setActiveCutscene(null);
        setTransitioning(false);
        navBusyRef.current = false;
      }, 3250);
    },
    [clearPendingTimers, currentStage, data.targetYear, muted, schedule, studio],
  );

  // Stage 2: Launch individual rocket from the exact screen x-position of the connected fuse rack
  const handleLaunchChainRocket = useCallback(
    (rocketIdx: number, fallbackXPct: number, clientX?: number) => {
      const id = rocketCmdSeqRef.current++;
      const yOffsets = [0.26, 0.2, 0.16, 0.21, 0.27];
      let resolvedXPct = fallbackXPct;
      if (typeof clientX === "number" && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          resolvedXPct = Math.max(0.08, Math.min(0.92, (clientX - rect.left) / rect.width));
        }
      }
      setRocketCommand({
        id,
        xPct: resolvedXPct,
        yPct: yOffsets[rocketIdx % yOffsets.length],
        big: true,
      });
    },
    [],
  );

  // Stage 2: After all connected fireworks finish bursting -> float mystery hidden photo down
  const handleAllFuseFinished = useCallback(() => {
    setStage2Phase("mystery");
  }, []);

  // Cutscene 2: Slow, suspenseful 3D mystery photo reveal when user taps the floating hidden photo
  const handleRevealMysteryPhoto = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (navBusyRef.current) return;
      unlockNewYearAudio();
      clearPendingTimers();
      navBusyRef.current = true;
      setActiveCutscene("photo-reveal");
      if (!muted) playMysteryRevealSwirl();

      schedule(() => {
        setStage2TextDone(Boolean(studio));
        setStage2Phase("revealed");
      }, 3050);

      schedule(() => {
        setActiveCutscene(null);
        navBusyRef.current = false;
      }, 3500);
    },
    [clearPendingTimers, muted, schedule],
  );

  // Cutscene 3: Train carries passenger to Gift Car -> Slow ornate brass doors parting (Stage 2 -> 3)
  const handleGoToGiftCar = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (navBusyRef.current) return;
      unlockNewYearAudio();
      clearPendingTimers();
      navBusyRef.current = true;
      setTrainBanner({
        heading: "กำลังเดินทางสู่ตู้เสบียงของขวัญ",
        subheading: "สถานีถัดไป • ของขวัญปีใหม่",
      });
      setTransitioning(true);
      setActiveCutscene("departure");
      if (!muted) {
        playTrainWhistle();
        playTrainChug();
      }

      schedule(() => {
        if (!muted) playTrainChug();
      }, 1500);

      // Train glides into the ornate velvet brass doors of the gift car
      schedule(() => {
        setTransitioning(false);
        setActiveCutscene("doors");
        if (!muted) playDoorSlide();
      }, 3050);

      schedule(() => {
        setCurrentStage(3);
      }, 4250);

      schedule(() => {
        setActiveCutscene(null);
        navBusyRef.current = false;
      }, 5450);
    },
    [clearPendingTimers, muted, schedule],
  );

  // Cutscene 5: Train races toward Station 2027 -> Slow Heartbeat Midnight Countdown 3..2..1..00:00 (Stage 3 -> 4)
  const handleArriveStation = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (navBusyRef.current) return;
      unlockNewYearAudio();
      clearPendingTimers();
      navBusyRef.current = true;
      setTrainBanner({
        heading: "มุ่งหน้าสู่สถานีปลายทาง",
        subheading: `กำลังเข้าสู่ปีใหม่ ${data.targetYear}`,
      });
      setTransitioning(true);
      setActiveCutscene("departure");
      if (!muted) {
        playTrainWhistle();
        playTrainChug();
      }

      schedule(() => {
        if (!muted) playTrainChug();
      }, 1500);

      // Flow directly from train ride into Midnight Countdown 3... 2... 1...
      schedule(() => {
        setCountdownNum(3);
        setActiveCutscene("midnight-countdown");
        if (!muted) playClockTick(3);
      }, 3050);

      schedule(() => {
        setCountdownNum(2);
        if (!muted) playClockTick(2);
      }, 4050);

      schedule(() => {
        setCountdownNum(1);
        if (!muted) playClockTick(1);
      }, 5050);

      schedule(() => {
        setCountdownNum(0);
        if (!muted) playMidnightBell();
        setStage4TextDone(Boolean(studio));
        setCurrentStage(4);
        setBurstTrigger((c) => c + 1);
      }, 6100);

      schedule(() => {
        setActiveCutscene(null);
        setTransitioning(false);
        navBusyRef.current = false;
      }, 7700);
    },
    [clearPendingTimers, data.targetYear, muted, schedule],
  );

  const editableProps = useCallback(
    (tabIndex: number, fieldId: string, label: string) =>
      onSelectField
        ? {
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              onSelectField(tabIndex, fieldId);
            },
            title: `คลิกเพื่อแก้ไข${label}`,
            "data-editable-field": fieldId,
            "data-edit-label": `แก้ไข${label}`,
          }
        : {},
    [onSelectField],
  );

  // Cutscene 1: Ticket tear -> stamp -> Slow Majestic Steam Express departure cutscene -> Stage 2
  const completeTicketTear = useCallback(() => {
    if (ticketTorn || navBusyRef.current) return;
    unlockNewYearAudio();
    navBusyRef.current = true;
    setTearProgress(1);
    setTicketTorn(true);
    setMusicPlaying(true);
    if (!muted) {
      playTicketStamp();
    }

    schedule(() => {
      setTrainBanner({
        heading: "ขบวนเที่ยงคืนกำลังออกเดินทาง",
        subheading: "สถานีถัดไป • ลานจุดพลุกลางราตรี",
      });
      setTransitioning(true);
      setActiveCutscene("departure");
      if (!muted) {
        playTrainWhistle();
        playTrainChug();
      }
    }, 620);

    schedule(() => {
      if (!muted) playTrainChug();
    }, 1850);

    schedule(() => {
      setCurrentStage(2);
      setStage2Phase(studio ? "revealed" : "fuse");
      setFuseRackKey((k) => k + 1);
    }, 3650);

    schedule(() => {
      setActiveCutscene(null);
      setTransitioning(false);
      navBusyRef.current = false;
    }, 4200);
  }, [muted, schedule, studio, ticketTorn]);

  const animateAutoTear = useCallback(() => {
    if (ticketTorn) return;
    unlockNewYearAudio();
    const steps = [0.22, 0.45, 0.68, 0.9];
    steps.forEach((p, idx) => {
      schedule(() => {
        setTearProgress(p);
        if (!muted) playTicketTearTick(p);
      }, idx * 70);
    });
    schedule(() => completeTicketTear(), steps.length * 70 + 30);
  }, [completeTicketTear, muted, schedule, ticketTorn]);

  const handleTearPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (ticketTorn) return;
    unlockNewYearAudio();
    draggingTearRef.current = true;
    dragStartXRef.current = e.clientX;
    dragMovedRef.current = false;
    lastTickStepRef.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleTearPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingTearRef.current || ticketTorn) return;
    const track = tearTrackRef.current;
    if (!track) return;
    if (Math.abs(e.clientX - dragStartXRef.current) > 8) {
      dragMovedRef.current = true;
    }
    const rect = track.getBoundingClientRect();
    const raw = (e.clientX - rect.left) / Math.max(1, rect.width - 36);
    const clamped = Math.max(0, Math.min(1, raw));
    setTearProgress(clamped);

    const tickStep = Math.floor(clamped * 7);
    if (tickStep > lastTickStepRef.current) {
      lastTickStepRef.current = tickStep;
      if (!muted) playTicketTearTick(clamped);
    }

    if (clamped >= 0.74) {
      draggingTearRef.current = false;
      completeTicketTear();
    }
  };

  const handleTearPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingTearRef.current) return;
    draggingTearRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if not captured
    }
    if (ticketTorn) return;
    if (!dragMovedRef.current) {
      // Friendly 1-tap auto-tear fallback
      animateAutoTear();
    } else if (tearProgress >= 0.55) {
      completeTicketTear();
    } else {
      setTearProgress(0);
    }
  };

  const handleTogglePolaroid = (e: React.MouseEvent) => {
    e.stopPropagation();
    unlockNewYearAudio();
    if (!muted) playCardFlip();
    setPolaroidFlipped((prev) => !prev);
  };

  // Cutscene 4: 3rd shake triggers slow suspenseful Gift Box Magic Explosion cutscene
  const handleShakeGift = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (giftOpened || navBusyRef.current) return;
    unlockNewYearAudio();
    const next = giftShakes + 1;
    setGiftShakes(next);
    setGiftWobbleKey((k) => k + 1);

    if (next < 3) {
      if (!muted) playGiftShake(next);
    } else {
      navBusyRef.current = true;
      setActiveCutscene("gift-burst");
      schedule(() => {
        if (!muted) playGiftPop();
      }, 420);

      const base = confettiSeqRef.current;
      confettiSeqRef.current += 30;
      setConfetti(buildGiftConfetti(base));

      schedule(() => {
        setStage3TitleDone(Boolean(studio));
        setStage3MessageDone(Boolean(studio));
        setGiftOpened(true);
      }, 1350);

      schedule(() => {
        setActiveCutscene(null);
        navBusyRef.current = false;
      }, 2480);

      schedule(() => {
        setConfetti([]);
      }, 2600);
    }
  };

  const handleOpenLuckyEnvelope = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    unlockNewYearAudio();
    if (data.fortuneList.length === 0) return;
    const pool = data.fortuneList;
    let chosen = pool[(idx + fortuneDeckSeed) % pool.length];
    if (pool.length > 1 && chosen === revealedFortune) {
      chosen = pool[(idx + fortuneDeckSeed + 1) % pool.length];
    }
    setSelectedEnvelopeIdx(idx);
    setFortuneTextDone(Boolean(studio));
    setRevealedFortune(chosen);
    if (!muted) playFortuneChime();
  };

  const handleReshuffleEnvelopes = (e: React.MouseEvent) => {
    e.stopPropagation();
    unlockNewYearAudio();
    if (!muted) playCardFlip();
    setSelectedEnvelopeIdx(null);
    setRevealedFortune(null);
    setFortuneDeckSeed((s) => s + 1);
  };

  const handleReleaseLanterns = (e: React.MouseEvent) => {
    e.stopPropagation();
    unlockNewYearAudio();
    const waveId = lanternSeqRef.current;
    lanternSeqRef.current += 12;
    setLanterns((prev) => [...prev.slice(-18), ...buildLanternWave(waveId, 9)]);
    setBurstTrigger((c) => c + 1);
    if (!muted) playLanternRelease();
  };

  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    unlockNewYearAudio();
    goToStage(1, () => {
      setStage1TextDone(Boolean(studio));
      setTearProgress(0);
      setTicketTorn(false);
      setStage2Phase(studio ? "revealed" : "fuse");
      setStage2TextDone(Boolean(studio));
      setFuseRackKey((k) => k + 1);
      setRocketCommand(null);
      setPolaroidFlipped(false);
      setGiftShakes(0);
      setGiftOpened(Boolean(studio));
      setStage3TitleDone(Boolean(studio));
      setStage3MessageDone(Boolean(studio));
      setFortuneTextDone(Boolean(studio));
      setSelectedEnvelopeIdx(null);
      setRevealedFortune(null);
      setStage4TextDone(Boolean(studio));
      setLanterns([]);
    });
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    unlockNewYearAudio();
    if (!musicPlaying) {
      setMusicPlaying(true);
      setMuted(false);
    } else {
      setMuted((m) => !m);
    }
  };

  const resolvedPhoto1 = photo1Fallback ?? data.photo1Url;
  const resolvedPhoto2 = photo2Fallback ?? data.photo2Url;

  const canvasMode: TrainSceneMode =
    currentStage === 1
      ? "station"
      : currentStage === 2
        ? "window"
        : currentStage === 3
          ? "cabin"
          : "arrival";

  const interactiveSky =
    (currentStage === 2 && stage2Phase === "revealed") || currentStage === 4;
  const autoFireworks =
    currentStage === 4 || (currentStage === 2 && stage2Phase === "revealed");

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-[640px] w-full flex-col justify-between overflow-hidden bg-[#070a18] font-sans text-amber-50 select-none"
    >
      {data.bgmUrl ? (
        <BackgroundAudioPlayer url={data.bgmUrl} isPlaying={musicPlaying && !muted} loop />
      ) : null}

      {/* Deep Midnight Velvet Sky Gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1f1c47_0%,#0d112b_52%,#060814_100%)]" />
      <motion.div
        animate={{ opacity: [0.22, 0.42, 0.22] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.22)_0%,transparent_72%)] blur-2xl"
      />

      {/* Dynamic Canvas: Stars, Shooting Stars, Moving Winter Parallax & Chain-Rack Fireworks */}
      <MidnightTrainCanvas
        mode={canvasMode}
        isTransitioning={transitioning}
        muted={muted}
        burstTrigger={burstTrigger}
        interactiveSky={interactiveSky}
        autoFireworks={autoFireworks}
        rocketCommand={rocketCommand}
      />

      {/* Top Minimal Header: Studio Music / Route Indicator + 4-Station Rail + Frameless Audio Icon */}
      <header className="pointer-events-none relative z-30 flex items-center justify-between px-5 pt-4">
        <div className="pointer-events-auto">
          {onSelectField ? (
            <button
              type="button"
              {...editableProps(4, "field-ny-bgm", "เพลงประกอบ")}
              aria-label="แก้ไขเพลงประกอบ"
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/35 bg-slate-950/60 text-amber-200 backdrop-blur-md transition-transform hover:scale-105"
            >
              <Music className="h-3.5 w-3.5 text-amber-300" />
              {data.bgmUrl && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(253,224,71,0.95)]" />
              )}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.14em] text-amber-200/80">
              <TrainFront className="h-3.5 w-3.5 text-amber-300" />
              <span>
                {originYear} → {data.targetYear}
              </span>
            </span>
          )}
        </div>

        {/* 4-Station Mini Rail Map */}
        <nav
          aria-label="สถานีการเดินทาง"
          className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-amber-300/15 bg-slate-950/45 px-3 py-1.5 backdrop-blur-md"
        >
          {[1, 2, 3, 4].map((stageNum, index) => {
            const active = currentStage === stageNum;
            const passed = currentStage > stageNum;
            return (
              <React.Fragment key={stageNum}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToStage(stageNum);
                  }}
                  aria-label={`สถานีที่ ${stageNum}`}
                  className="group relative flex h-4 w-4 items-center justify-center focus:outline-none"
                >
                  <span
                    className={`block rounded-full transition-all duration-300 ${
                      active
                        ? "h-2.5 w-2.5 bg-amber-300 shadow-[0_0_10px_rgba(253,224,71,0.95)]"
                        : passed
                          ? "h-2 w-2 bg-amber-400/70"
                          : "h-1.5 w-1.5 bg-amber-200/35 group-hover:bg-amber-200/80"
                    }`}
                  />
                </button>
                {index < 3 && (
                  <span
                    className={`h-px w-3.5 transition-colors ${
                      passed ? "bg-amber-300/60" : "bg-amber-300/20"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Frameless Audio Toggle Icon */}
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted || !musicPlaying ? "เปิดเสียง" : "ปิดเสียง"}
          className="pointer-events-auto p-1 text-amber-200/85 transition-all hover:scale-110 hover:text-amber-200"
        >
          {muted || !musicPlaying ? (
            <VolumeX className="h-5 w-5 opacity-70" />
          ) : (
            <Volume2 className="h-5 w-5 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          )}
        </button>
      </header>

      {/* Main Express Stage Container */}
      <main className="pointer-events-none relative z-20 flex flex-1 items-center justify-center px-4 py-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, x: 34, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -34, filter: "blur(6px)" }}
            transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-none relative flex w-full flex-col items-center text-center ${
              currentStage === 2 && stage2Phase === "fuse"
                ? "max-w-[520px] self-end"
                : "max-w-[350px]"
            }`}
          >
            {/* ==================== STAGE 1: GOLDEN BOARDING TICKET ==================== */}
            {currentStage === 1 && (
              <div className="pointer-events-auto relative flex w-full flex-col items-center">
                {/* Warm station glow halo */}
                <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-[radial-gradient(circle,rgba(251,191,36,0.14)_0%,transparent_68%)] blur-xl" />

                {/* Main Golden Railway Ticket */}
                <motion.div
                  animate={
                    ticketTorn
                      ? { y: -6, scale: 1.02 }
                      : { y: [0, -4, 0] }
                  }
                  transition={
                    ticketTorn
                      ? { duration: 0.4 }
                      : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
                  }
                  className="relative w-full"
                >
                  {/* Upper Ticket Section */}
                  <div className="relative overflow-hidden rounded-t-3xl border border-b-0 border-amber-300/45 bg-gradient-to-b from-[#231934]/95 via-[#181228]/95 to-[#130e21]/95 px-5 pt-5 pb-5 shadow-[0_22px_50px_rgba(0,0,0,0.65)] backdrop-blur-md">
                    {/* Shimmer gleam sweep */}
                    <motion.div
                      animate={{ x: ["-130%", "230%"] }}
                      transition={{ duration: 4.2, repeat: Infinity, repeatDelay: 2.8, ease: "easeInOut" }}
                      className="pointer-events-none absolute inset-y-0 w-16 -skew-x-12 bg-gradient-to-r from-transparent via-amber-200/15 to-transparent"
                    />

                    {/* Inner hairline frame */}
                    <div className="pointer-events-none absolute inset-2.5 rounded-2xl border border-amber-300/18" />

                    {/* Top eyebrow */}
                    <div className="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-[0.22em] text-amber-300/90">
                      <span className="inline-flex items-center gap-1.5">
                        <TrainFront className="h-3.5 w-3.5" />
                        <span>ขบวนข้ามปี</span>
                      </span>
                      <span className="font-mono text-amber-200/80">23:59</span>
                    </div>

                    {/* Route 2026 -> 2027 */}
                    <div className="my-2 flex items-center justify-center gap-3">
                      <span className="text-2xl font-bold tracking-tight text-amber-200/55">
                        {originYear}
                      </span>
                      <span className="flex items-center gap-1 text-amber-300">
                        <span className="h-px w-5 bg-amber-300/50" />
                        <ArrowRight className="h-4 w-4" />
                        <span className="h-px w-5 bg-amber-300/50" />
                      </span>
                      <h1
                        {...editableProps(1, "field-ny-year", "ปีศักราช")}
                        className={`rounded-xl bg-gradient-to-b from-amber-50 via-amber-300 to-amber-500 bg-clip-text px-1 text-5xl font-black tracking-tight text-transparent drop-shadow-[0_4px_18px_rgba(245,158,11,0.45)] ${
                          onSelectField ? "cursor-pointer" : ""
                        }`}
                      >
                        {data.targetYear}
                      </h1>
                    </div>

                    {/* Passenger Info Row */}
                    <div className="mt-3 rounded-xl border border-amber-300/20 bg-slate-950/45 px-3.5 py-2.5 text-left">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[10px] tracking-[0.14em] text-amber-200/60">
                          ผู้โดยสารคนพิเศษ
                        </span>
                        <span
                          {...editableProps(1, "field-ny-sender", "ชื่อผู้ส่ง")}
                          className={`text-[10px] text-amber-300/80 ${
                            onSelectField ? "cursor-pointer" : ""
                          }`}
                        >
                          โดย {data.senderName}
                        </span>
                      </div>
                      <p
                        {...editableProps(1, "field-ny-recipient", "ชื่อผู้รับ")}
                        className={`mt-0.5 truncate rounded text-lg font-bold text-amber-50 ${
                          onSelectField ? "cursor-pointer" : ""
                        }`}
                      >
                        {data.recipientName}
                      </p>
                    </div>

                    {/* Tagline (Typewriter reveal -> unlocks tear stub on completion) */}
                    <p
                      {...editableProps(1, "field-ny-tagline", "ข้อความเกริ่นนำ")}
                      className={`mt-3 min-h-[2.4rem] rounded px-1 text-xs leading-relaxed text-amber-100/85 ${
                        onSelectField ? "cursor-pointer" : ""
                      }`}
                    >
                      <TypewriterText
                        text={data.openingTagline}
                        speedMs={46}
                        startDelayMs={320}
                        instant={Boolean(studio)}
                        onComplete={() => setStage1TextDone(true)}
                      />
                    </p>

                    {/* Boarding Stamp Slam Animation when torn */}
                    <AnimatePresence>
                      {ticketTorn && (
                        <motion.div
                          initial={{ opacity: 0, scale: 2.1, rotate: -18 }}
                          animate={{ opacity: 1, scale: 1, rotate: -10 }}
                          transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                          className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-emerald-300/90 bg-emerald-950/85 px-4 py-1.5 text-sm font-black tracking-[0.16em] text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.5)] backdrop-blur-sm"
                        >
                          ออกเดินทางแล้ว
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Perforation Tear Divider with Left/Right Ticket Notches */}
                  <div className="relative flex h-5 items-center bg-[#130e21]/95">
                    <span className="absolute -left-2.5 h-5 w-5 rounded-full border-r border-amber-300/45 bg-[#0a0d1f]" />
                    <span className="absolute -right-2.5 h-5 w-5 rounded-full border-l border-amber-300/45 bg-[#0a0d1f]" />
                    <div className="mx-4 relative flex-1 border-t-2 border-dashed border-amber-300/40">
                      {/* Golden rip progress glow along the perforation */}
                      <div
                        className="absolute -top-[2px] left-0 h-[3px] rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 shadow-[0_0_10px_rgba(253,224,71,0.9)] transition-all duration-75"
                        style={{ width: `${Math.round(tearProgress * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Detachable Bottom Tear Stub (Pure Icon Track — Revealed after tagline finishes typing) */}
                  <motion.div
                    animate={
                      ticketTorn
                        ? { y: 58, rotate: 9, opacity: 0 }
                        : !stage1TextDone
                          ? { y: 8, rotate: 0, opacity: 0.25 }
                          : {
                              y: tearProgress * 10,
                              rotate: tearProgress * 3.5,
                              opacity: 1,
                            }
                    }
                    transition={
                      ticketTorn
                        ? { duration: 0.55, ease: "easeIn" }
                        : { duration: 0.45 }
                    }
                    className={`relative rounded-b-3xl border border-t-0 border-amber-300/45 bg-gradient-to-b from-[#161025]/95 to-[#1f1633]/95 px-4 pt-2 pb-4 shadow-[0_14px_30px_rgba(0,0,0,0.5)] ${
                      stage1TextDone ? "pointer-events-auto" : "pointer-events-none"
                    }`}
                  >
                    <div
                      ref={tearTrackRef}
                      onPointerDown={handleTearPointerDown}
                      onPointerMove={handleTearPointerMove}
                      onPointerUp={handleTearPointerUp}
                      onPointerCancel={handleTearPointerUp}
                      role="button"
                      tabIndex={stage1TextDone ? 0 : -1}
                      onKeyDown={(e) => {
                        if (stage1TextDone && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          animateAutoTear();
                        }
                      }}
                      aria-label="ฉีกตั๋วขึ้นขบวน"
                      className="relative flex h-11 w-full cursor-grab items-center overflow-hidden rounded-full border border-amber-300/40 bg-slate-950/65 px-1.5 active:cursor-grabbing touch-none"
                    >
                      {/* Fill trail */}
                      <div
                        className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500/35 to-amber-300/20"
                        style={{ width: `${Math.max(14, Math.round(tearProgress * 100))}%` }}
                      />

                      {/* Pure Icon Directional Dots & Arrow Guide (Zero Text Inside Icon Control) */}
                      <div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 pl-6 text-amber-300/45 transition-opacity"
                        style={{ opacity: stage1TextDone ? Math.max(0.15, 1 - tearProgress * 1.2) : 0 }}
                      >
                        <span className="h-1 w-1 rounded-full bg-amber-300/50" />
                        <span className="h-1 w-1 rounded-full bg-amber-300/65" />
                        <span className="h-1 w-1 rounded-full bg-amber-300/80" />
                        <ArrowRight className="h-4 w-4 text-amber-300/75" />
                      </div>

                      {/* Draggable Scissor Knob */}
                      <motion.div
                        initial={false}
                        animate={{
                          opacity: stage1TextDone ? 1 : 0,
                          scale: stage1TextDone ? 1 : 0.65,
                        }}
                        transition={{ duration: 0.4 }}
                        className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.75)]"
                        style={{
                          marginLeft: `calc(${(tearProgress * 100).toFixed(1)}% - ${(tearProgress * 32).toFixed(1)}px)`,
                        }}
                      >
                        <motion.span
                          animate={
                            stage1TextDone && !ticketTorn && tearProgress === 0
                              ? { x: [0, 3, 0] }
                              : { x: 0 }
                          }
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                          className="flex items-center justify-center"
                        >
                          <Scissors className="h-4 w-4" />
                        </motion.span>
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            )}

            {/* ==================== STAGE 2: CHAIN-FUSE FIREWORKS -> MYSTERY FLOATING PHOTO -> REVEAL ==================== */}
            {currentStage === 2 && (
              <div
                className={`pointer-events-none flex w-full flex-col items-center ${
                  stage2Phase === "fuse" ? "pb-2" : ""
                }`}
              >
                <AnimatePresence mode="wait">
                  {/* Phase 2A: Row of 5 Connected Fireworks Along the Bottom of the Open Starry Sky */}
                  {stage2Phase === "fuse" && (
                    <motion.div
                      key={`fuse-phase-${fuseRackKey}`}
                      initial={{ opacity: 0, y: 26 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 40 }}
                      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                      className="flex w-full flex-col items-center"
                    >
                      <FireworksFuseRack
                        key={fuseRackKey}
                        muted={muted}
                        onLaunchRocket={handleLaunchChainRocket}
                        onAllFinished={handleAllFuseFinished}
                      />
                    </motion.div>
                  )}

                  {/* Phase 2B: Mystery Hidden Photo Drifts Gently Down — User Doesn't Know What's Inside Yet! */}
                  {stage2Phase === "mystery" && (
                    <motion.div
                      key="mystery-photo-phase"
                      initial={{ opacity: 0, y: -140, scale: 0.72, rotate: -6 }}
                      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 1.08 }}
                      transition={{ duration: 1.45, ease: [0.16, 1, 0.3, 1] }}
                      className="pointer-events-auto flex flex-col items-center"
                    >
                      <motion.button
                        type="button"
                        onClick={handleRevealMysteryPhoto}
                        aria-label="เปิดดูภาพความทรงจำลับ"
                        animate={{
                          y: [0, -10, 0],
                          rotate: [-1.8, 1.8, -1.8],
                        }}
                        transition={{
                          duration: 3.8,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.96 }}
                        className="group relative flex h-64 w-56 flex-col items-center justify-center rounded-2xl border-2 border-amber-300/65 bg-gradient-to-b from-[#23183c]/95 via-[#17112b]/95 to-[#100b1e]/95 p-5 shadow-[0_22px_55px_rgba(0,0,0,0.78),0_0_40px_rgba(251,191,36,0.28)] backdrop-blur-md focus:outline-none"
                      >
                        {/* Pulsing luminous aura behind hidden card */}
                        <motion.div
                          animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.95, 1.12, 0.95] }}
                          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                          className="pointer-events-none absolute -inset-3 -z-10 rounded-3xl bg-[radial-gradient(circle,rgba(251,191,36,0.34)_0%,transparent_72%)] blur-xl"
                        />

                        {/* Inner brass border */}
                        <div className="pointer-events-none absolute inset-2.5 rounded-xl border border-amber-300/25" />

                        {/* Glowing Mystery Seal */}
                        <motion.div
                          animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] }}
                          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                          className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-200/75 bg-gradient-to-br from-amber-300/25 via-amber-400/20 to-amber-600/20 text-amber-200 shadow-[0_0_26px_rgba(253,224,71,0.5)] transition-transform group-hover:scale-110"
                        >
                          <Sparkles className="h-7 w-7" />
                        </motion.div>

                        <p className="mt-4 text-sm font-bold tracking-wide text-amber-100">
                          ภาพปริศนาลอยลงมา
                        </p>
                        <p className="mt-1 text-[11px] text-amber-200/70">
                          แตะเพื่อเปิดดูว่าคือภาพอะไร
                        </p>
                      </motion.button>
                    </motion.div>
                  )}

                  {/* Phase 2C: Revealed 3D Flippable Polaroid + Next Station Button */}
                  {stage2Phase === "revealed" && (
                    <motion.div
                      key="revealed-photo-phase"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                      className="flex w-full flex-col items-center"
                    >
                      {studio && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFuseRackKey((k) => k + 1);
                            setStage2Phase("fuse");
                          }}
                          aria-label="ลองจุดพลุฉนวนเชื่อม"
                          title="ลองจุดพลุฉนวนเชื่อม"
                          className="pointer-events-auto mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/35 bg-slate-950/60 text-amber-300 transition-transform hover:scale-110 hover:bg-white/10"
                        >
                          <Flame className="h-4 w-4" />
                        </button>
                      )}

                      {/* 3D Flippable Polaroid Card */}
                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
                        className="pointer-events-auto relative w-[274px]"
                        style={{ perspective: 1000 }}
                      >
                        <motion.div
                          animate={{ rotateY: polaroidFlipped ? 180 : 0 }}
                          transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                          onClick={!onSelectField ? handleTogglePolaroid : undefined}
                          style={{ transformStyle: "preserve-3d" }}
                          className="relative w-full cursor-pointer"
                        >
                          {/* FRONT OF POLAROID */}
                          <div
                            style={{ backfaceVisibility: "hidden" }}
                            className="relative rounded-2xl border border-amber-200/40 bg-[#fbf6ea] p-2.5 pb-4 text-slate-900 shadow-[0_18px_42px_rgba(0,0,0,0.72)]"
                          >
                            <span className="pointer-events-none absolute -top-2.5 left-1/2 h-4 w-16 -translate-x-1/2 -rotate-2 rounded-sm bg-amber-300/75 shadow-sm" />

                            <div
                              {...editableProps(2, "field-ny-photo1", "รูปภาพความทรงจำที่ 1")}
                              className="relative mb-2.5 aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-900"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={resolvedPhoto1}
                                alt="ความทรงจำแห่งปี"
                                onError={() => setPhoto1Fallback("/templates/galaxy-1.png")}
                                className="h-full w-full object-cover"
                              />
                            </div>

                            <div className="flex items-center justify-between gap-2 px-1">
                              <p
                                {...editableProps(2, "field-ny-photo1-caption", "คำบรรยายใต้ภาพที่ 1")}
                                className="line-clamp-2 min-h-[2rem] flex-1 text-left text-xs font-medium leading-snug text-slate-700"
                              >
                                <TypewriterText
                                  text={data.photo1Caption}
                                  speedMs={46}
                                  startDelayMs={240}
                                  instant={Boolean(studio)}
                                  showCursor={false}
                                  onComplete={() => setStage2TextDone(true)}
                                />
                              </p>
                              <motion.button
                                type="button"
                                initial={false}
                                animate={{
                                  opacity: stage2TextDone ? 1 : 0,
                                  scale: stage2TextDone ? 1 : 0.6,
                                }}
                                transition={{ duration: 0.35 }}
                                onClick={stage2TextDone ? handleTogglePolaroid : undefined}
                                disabled={!stage2TextDone}
                                aria-label="พลิกดูด้านหลังรูป"
                                title="พลิกดูด้านหลังรูป"
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 transition-colors hover:bg-amber-500/25 disabled:pointer-events-none"
                              >
                                <RotateCw className="h-3.5 w-3.5" />
                              </motion.button>
                            </div>
                          </div>

                          {/* BACK OF POLAROID (Handwritten Postcard Memory) */}
                          <div
                            style={{
                              backfaceVisibility: "hidden",
                              transform: "rotateY(180deg)",
                            }}
                            className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-amber-300/50 bg-[#f6ecd6] p-4 text-left text-slate-800 shadow-[0_18px_42px_rgba(0,0,0,0.72)]"
                          >
                            <div className="flex items-center justify-between border-b border-amber-900/15 pb-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.14em] text-amber-800">
                                <TrainFront className="h-3 w-3" />
                                <span>บันทึกบนขบวนรถไฟ</span>
                              </span>
                              <span className="rounded border border-amber-700/40 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-800">
                                31 DEC {originYear}
                              </span>
                            </div>

                            <div className="my-auto py-2">
                              <p className="text-[11px] font-semibold text-amber-800/80">
                                ถึง {data.recipientName}
                              </p>
                              <p className="mt-1.5 text-sm leading-relaxed font-medium text-slate-800">
                                &ldquo;
                                <TypewriterText
                                  text={data.photo1Caption}
                                  speedMs={46}
                                  startDelayMs={320}
                                  replayKey={polaroidFlipped ? "back" : "front"}
                                  instant={Boolean(studio)}
                                  showCursor={false}
                                />
                                &rdquo;
                              </p>
                            </div>

                            <div className="flex items-center justify-between border-t border-amber-900/15 pt-2 text-[10px] text-amber-900/65">
                              <span>จาก {data.senderName}</span>
                              <button
                                type="button"
                                onClick={handleTogglePolaroid}
                                aria-label="พลิกกลับด้านหน้า"
                                title="พลิกกลับด้านหน้า"
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-800/10 text-amber-800 transition-colors hover:bg-amber-800/20"
                              >
                                <RotateCw className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>

                      {/* Pure Icon Button -> Appears only after caption finishes typing */}
                      <div className="pointer-events-auto mt-6 flex min-h-[52px] items-center justify-center">
                        <AnimatePresence>
                          {stage2TextDone && (
                            <motion.button
                              type="button"
                              initial={{ opacity: 0, scale: 0.65, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.7 }}
                              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                              onClick={handleGoToGiftCar}
                              aria-label="เปิดกล่องของขวัญปีใหม่"
                              className="group flex h-12 w-12 items-center justify-center rounded-full border border-amber-300/60 bg-gradient-to-br from-amber-400/30 via-amber-500/20 to-slate-950/80 text-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.34)] backdrop-blur-md transition-all hover:scale-110 hover:border-amber-200 hover:shadow-[0_0_32px_rgba(253,224,71,0.55)]"
                            >
                              <Gift className="h-5 w-5 text-amber-300 transition-transform group-hover:scale-110" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ==================== STAGE 3: SHAKE GIFT BOX + LETTER & 3 LUCKY ENVELOPES ==================== */}
            {currentStage === 3 && (
              <div className="pointer-events-auto relative flex w-full flex-col items-center">
                {/* Confetti Explosion on Gift Pop */}
                <div className="pointer-events-none absolute top-1/2 left-1/2 z-30">
                  <AnimatePresence>
                    {confetti.map((piece) => (
                      <motion.span
                        key={piece.id}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
                        animate={{
                          x: piece.x,
                          y: piece.y,
                          opacity: [1, 1, 0],
                          scale: [0.6, 1.15, 0.7],
                          rotate: piece.rotate,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          width: piece.size,
                          height: piece.size * 0.6,
                          backgroundColor: piece.color,
                        }}
                        className="absolute rounded-[2px]"
                      />
                    ))}
                  </AnimatePresence>
                </div>

                <AnimatePresence mode="wait">
                  {!giftOpened ? (
                    <motion.div
                      key="gift-wrapped"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.18, filter: "blur(8px)" }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col items-center py-6"
                    >
                      <p className="mb-2 text-xs font-medium tracking-[0.16em] text-amber-300/90">
                        มีของขวัญวางไว้บนโต๊ะสำหรับคุณ
                      </p>
                      <h2 className="mb-7 text-xl font-bold text-amber-50">
                        ของขวัญปีใหม่ {data.targetYear}
                      </h2>

                      {/* Interactive Velvet & Gold Gift Box */}
                      <motion.button
                        key={giftWobbleKey}
                        type="button"
                        onClick={handleShakeGift}
                        aria-label="เขย่ากล่องของขวัญ"
                        animate={
                          giftShakes > 0
                            ? {
                                rotate: [-9, 9, -7, 7, -3, 0],
                                scale: [1, 1.09, 0.95, 1.04, 1],
                              }
                            : { y: [0, -6, 0] }
                        }
                        transition={
                          giftShakes > 0
                            ? { duration: 0.48, ease: "easeInOut" }
                            : { duration: 3, repeat: Infinity, ease: "easeInOut" }
                        }
                        className="group relative flex h-44 w-44 flex-col items-center justify-end focus:outline-none"
                      >
                        {/* Magical golden glow intensifying per shake */}
                        <div
                          className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.45)_0%,transparent_70%)] blur-xl transition-opacity duration-300"
                          style={{ opacity: 0.35 + giftShakes * 0.28 }}
                        />

                        {/* Ribbon Bow */}
                        <motion.div
                          animate={{ y: giftShakes >= 2 ? -10 : giftShakes === 1 ? -4 : 0 }}
                          className="relative z-20 -mb-2 flex items-end justify-center"
                        >
                          <span className="h-6 w-8 -rotate-12 rounded-tl-full rounded-tr-full border-[3px] border-amber-300 bg-amber-400/20" />
                          <span className="z-10 -mx-1.5 h-5 w-5 rounded-full bg-gradient-to-br from-amber-100 to-amber-500 shadow" />
                          <span className="h-6 w-8 rotate-12 rounded-tl-full rounded-tr-full border-[3px] border-amber-300 bg-amber-400/20" />
                        </motion.div>

                        {/* Gift Lid */}
                        <motion.div
                          animate={{
                            y: giftShakes >= 2 ? -10 : giftShakes === 1 ? -4 : 0,
                            rotate: giftShakes >= 2 ? -4 : giftShakes === 1 ? 2 : 0,
                          }}
                          className="relative z-10 h-9 w-40 rounded-xl border border-amber-300/60 bg-gradient-to-b from-rose-700 via-rose-800 to-rose-900 shadow-lg"
                        >
                          <span className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400" />
                        </motion.div>

                        {/* Gift Body */}
                        <div className="relative h-28 w-36 overflow-hidden rounded-b-2xl border border-t-0 border-amber-300/45 bg-gradient-to-b from-rose-800 via-rose-900 to-[#3d0a1e] shadow-[0_20px_40px_rgba(0,0,0,0.65)]">
                          {/* Vertical & Horizontal Satin Ribbons */}
                          <span className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400" />
                          <span className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 bg-gradient-to-b from-amber-300 via-amber-100 to-amber-400 opacity-90" />
                          {/* Inner light seam */}
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-amber-200/40 to-transparent" />
                        </div>
                      </motion.button>

                      {/* 3 Star Shake Indicators */}
                      <div className="mt-6 flex items-center gap-2">
                        {[1, 2, 3].map((step) => (
                          <Sparkles
                            key={step}
                            className={`h-4 w-4 transition-all duration-300 ${
                              giftShakes >= step
                                ? "scale-125 text-amber-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.9)]"
                                : "text-amber-200/30"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-amber-100/75">
                        {giftShakes === 0
                          ? "แตะเขย่ากล่องเพื่อเปิดของขวัญ"
                          : giftShakes === 1
                            ? "เขย่าอีกนิด ใกล้เปิดแล้ว"
                            : "แตะอีกทีเดียว!"}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="gift-opened"
                      initial={{ opacity: 0, y: 18, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="flex w-full flex-col items-center"
                    >
                      {/* Warm New Year Letter Card */}
                      <div className="relative w-full rounded-2xl border border-amber-300/35 bg-[#110d24]/88 px-5 pt-6 pb-4 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-md">
                        <div className="pointer-events-none absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-amber-200/80 bg-gradient-to-br from-amber-200 to-amber-500 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.65)]">
                          <Gift className="h-4 w-4" />
                        </div>

                        {studio && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGiftShakes(0);
                              setGiftOpened(false);
                            }}
                            aria-label="ลองเขย่ากล่อง"
                            title="ลองเขย่ากล่อง"
                            className="absolute top-2.5 right-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-300/25 bg-white/5 text-amber-200/80 hover:bg-white/10"
                          >
                            <Gift className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <h3
                          {...editableProps(3, "field-ny-wish-title", "หัวข้อคำอวยพร")}
                          className={`mb-2 min-h-[1.6rem] rounded-lg px-2 text-base font-bold text-amber-200 ${
                            onSelectField ? "cursor-pointer" : ""
                          }`}
                        >
                          <TypewriterText
                            text={data.mainWishTitle}
                            speedMs={44}
                            startDelayMs={220}
                            instant={Boolean(studio)}
                            showCursor={false}
                            onComplete={() => setStage3TitleDone(true)}
                          />
                        </h3>

                        <p
                          {...editableProps(3, "field-ny-wish-message", "เนื้อหาคำอวยพร")}
                          className={`mb-4 max-h-32 min-h-[3.5rem] overflow-y-auto whitespace-pre-line rounded-lg px-2 py-1 text-[13px] leading-relaxed text-amber-50/88 ${
                            onSelectField ? "cursor-pointer" : ""
                          }`}
                        >
                          {stage3TitleDone && (
                            <TypewriterText
                              text={data.mainWishMessage}
                              speedMs={44}
                              startDelayMs={180}
                              instant={Boolean(studio)}
                              onComplete={() => setStage3MessageDone(true)}
                            />
                          )}
                        </p>

                        {/* 3 Interactive Sealed Lucky Envelopes (Appear after message finishes typing!) */}
                        <AnimatePresence>
                          {stage3MessageDone && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                              {...editableProps(3, "field-ny-fortunes", "ชุดคำทำนายมงคล")}
                              className={`rounded-xl border border-amber-300/22 bg-gradient-to-b from-amber-500/10 to-slate-950/55 p-3 ${
                                onSelectField ? "cursor-pointer" : ""
                              }`}
                            >
                              <AnimatePresence mode="wait">
                                {revealedFortune ? (
                                  <motion.div
                                    key={`fortune-${selectedEnvelopeIdx}-${fortuneDeckSeed}`}
                                    initial={{ opacity: 0, rotateX: -70, scale: 0.92 }}
                                    animate={{ opacity: 1, rotateX: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.92 }}
                                    transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                                    className="flex flex-col items-center gap-2.5"
                                  >
                                    <p className="w-full rounded-lg border border-amber-300/30 bg-slate-950/70 px-3 py-2.5 text-xs leading-relaxed font-medium text-amber-100">
                                      &ldquo;
                                      <TypewriterText
                                        text={revealedFortune}
                                        speedMs={44}
                                        startDelayMs={200}
                                        replayKey={`${selectedEnvelopeIdx}-${fortuneDeckSeed}`}
                                        instant={Boolean(studio)}
                                        onComplete={() => setFortuneTextDone(true)}
                                      />
                                      &rdquo;
                                    </p>
                                    <div className="min-h-[32px] flex items-center justify-center">
                                      {fortuneTextDone && (
                                        <motion.button
                                          type="button"
                                          initial={{ opacity: 0, scale: 0.65 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          transition={{ duration: 0.3 }}
                                          onClick={handleReshuffleEnvelopes}
                                          aria-label="เลือกซองใหม่"
                                          className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/15 text-amber-200 transition-all hover:scale-110 hover:bg-amber-400/25"
                                        >
                                          <Shuffle className="h-3.5 w-3.5" />
                                        </motion.button>
                                      )}
                                    </div>
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="envelopes-fan"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center justify-center gap-3.5 py-1.5"
                                  >
                                    {[0, 1, 2].map((idx) => (
                                      <motion.button
                                        key={idx}
                                        type="button"
                                        whileHover={{ y: -6, scale: 1.08 }}
                                        whileTap={{ scale: 0.94 }}
                                        onClick={(e) => handleOpenLuckyEnvelope(idx, e)}
                                        aria-label={`เปิดซองนำโชคใบที่ ${idx + 1}`}
                                        style={{
                                          rotate: idx === 0 ? -7 : idx === 2 ? 7 : 0,
                                        }}
                                        className="group relative flex h-14 w-12 items-center justify-center rounded-xl border border-amber-300/55 bg-gradient-to-b from-rose-700 via-rose-800 to-rose-950 shadow-[0_8px_18px_rgba(0,0,0,0.45)] transition-shadow hover:shadow-[0_0_20px_rgba(251,191,36,0.45)]"
                                      >
                                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-200/70 bg-amber-400/20 text-amber-200 transition-colors group-hover:bg-amber-300 group-hover:text-slate-950">
                                          <Mail className="h-3.5 w-3.5" />
                                        </span>
                                      </motion.button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Pure Icon Button -> Appears only after message finishes typing */}
                      <div className="mt-5 flex min-h-[52px] items-center justify-center">
                        <AnimatePresence>
                          {stage3MessageDone && (
                            <motion.button
                              type="button"
                              initial={{ opacity: 0, scale: 0.65, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.7 }}
                              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                              onClick={handleArriveStation}
                              aria-label={`ถึงสถานี ${data.targetYear}`}
                              className="group flex h-12 w-12 items-center justify-center rounded-full border border-amber-300/60 bg-gradient-to-br from-amber-400/30 via-amber-500/20 to-slate-950/80 text-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.34)] backdrop-blur-md transition-all hover:scale-110 hover:border-amber-200 hover:shadow-[0_0_32px_rgba(253,224,71,0.55)]"
                            >
                              <TrainFront className="h-5 w-5 text-amber-300 transition-transform group-hover:scale-110" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ==================== STAGE 4: STATION 2027 ARRIVAL & SKY LANTERNS ==================== */}
            {currentStage === 4 && (
              <div className="pointer-events-none flex w-full flex-col items-center">
                {/* Station Arrival Title */}
                <div className="mb-3 flex flex-col items-center">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.22em] text-amber-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>ถึงสถานีปลายทาง</span>
                  </span>
                  <h2 className="mt-0.5 bg-gradient-to-b from-amber-50 via-amber-300 to-amber-500 bg-clip-text text-4xl font-black tracking-tight text-transparent drop-shadow-[0_4px_20px_rgba(245,158,11,0.45)]">
                    สวัสดีปี {data.targetYear}
                  </h2>
                </div>

                {/* Specular Shimmer Gilded Frame for Photo 2 */}
                <div
                  {...editableProps(4, "field-ny-photo2", "รูปภาพก้าวสู่ปีใหม่ที่ 2")}
                  className={`pointer-events-auto relative mb-3 w-64 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 via-amber-400 to-amber-200 p-[2px] shadow-[0_18px_44px_rgba(0,0,0,0.72),0_0_28px_rgba(251,191,36,0.26)] ${
                    onSelectField ? "cursor-pointer" : ""
                  }`}
                >
                  <motion.div
                    animate={{ x: ["-140%", "220%"] }}
                    transition={{
                      duration: 3.8,
                      repeat: Infinity,
                      repeatDelay: 2.2,
                      ease: "easeInOut",
                    }}
                    className="pointer-events-none absolute inset-y-0 z-10 w-16 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                  />

                  <div className="relative rounded-[14px] bg-[#0b0f24] p-2.5">
                    <div className="mb-2 aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolvedPhoto2}
                        alt="ก้าวสู่ปีใหม่ไปด้วยกัน"
                        onError={() => setPhoto2Fallback("/templates/galaxy-2.png")}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p
                      {...editableProps(4, "field-ny-photo2-caption", "คำบรรยายใต้ภาพที่ 2")}
                      className={`min-h-[1.8rem] rounded px-1 text-center text-xs font-light text-amber-100/90 ${
                        onSelectField ? "cursor-pointer" : ""
                      }`}
                    >
                      <TypewriterText
                        text={data.photo2Caption}
                        speedMs={46}
                        startDelayMs={320}
                        instant={Boolean(studio)}
                        onComplete={() => setStage4TextDone(true)}
                      />
                    </p>
                  </div>
                </div>

                {/* Sender Credit */}
                <div
                  {...editableProps(1, "field-ny-sender", "ชื่อผู้ส่ง")}
                  className={`pointer-events-auto mb-5 rounded-lg px-2 py-0.5 text-xs text-amber-100/75 ${
                    onSelectField ? "cursor-pointer" : ""
                  }`}
                >
                  ส่งต่อความปรารถนาดีโดย{" "}
                  <span className="font-semibold text-amber-300">{data.senderName}</span>
                </div>

                {/* Pure Icon Triggers (Zero text labels — Appear after caption finishes typing) */}
                <div className="pointer-events-auto flex min-h-[52px] items-center justify-center gap-6">
                  <AnimatePresence>
                    {stage4TextDone && (
                      <>
                        <motion.button
                          key="btn-lanterns"
                          type="button"
                          initial={{ opacity: 0, scale: 0.65, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                          onClick={handleReleaseLanterns}
                          aria-label={lanterns.length > 0 ? "ปล่อยโคมเพิ่ม" : "ปล่อยโคมขอพร"}
                          className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-300/65 bg-gradient-to-br from-amber-400/30 via-amber-500/20 to-slate-950/80 shadow-[0_0_24px_rgba(251,191,36,0.34)] backdrop-blur-md transition-all hover:scale-110 hover:border-amber-200 hover:shadow-[0_0_32px_rgba(253,224,71,0.55)]"
                        >
                          <SkyLanternSvg className="h-7 w-6" />
                        </motion.button>

                        <motion.button
                          key="btn-replay"
                          type="button"
                          initial={{ opacity: 0, scale: 0.65, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                          onClick={handleReplay}
                          aria-label="ชมอีกครั้ง"
                          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-slate-950/65 text-amber-100/85 backdrop-blur-md transition-all hover:scale-110 hover:border-amber-300/45 hover:text-amber-200"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </motion.button>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Slow, Dreamy Floating Sky Lanterns Fleet (Stage 4) */}
      <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden">
        <AnimatePresence>
          {lanterns.map((item) => (
            <motion.div
              key={item.id}
              initial={{ y: 120, x: 0, opacity: 0, scale: item.scale * 0.78 }}
              animate={{
                y: -960,
                x: [
                  0,
                  item.sway,
                  -item.sway * 0.65,
                  item.sway * 0.45,
                  -item.sway * 0.2,
                ],
                opacity: [0, 0.94, 0.96, 0.88, 0],
                scale: [item.scale * 0.78, item.scale, item.scale * 0.92, item.scale * 0.78],
              }}
              transition={{
                duration: item.duration,
                delay: item.delay,
                ease: "easeInOut",
              }}
              style={{ left: `${item.leftPct}%` }}
              className="absolute bottom-0"
            >
              <SkyLanternSvg className="h-14 w-11 drop-shadow-[0_0_20px_rgba(251,191,36,0.75)]" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Full-Screen Cinematic Cutscenes Overlay */}
      <TrainCutscenes
        active={activeCutscene}
        countdownNum={countdownNum}
        originYear={originYear}
        targetYear={data.targetYear}
        recipientName={data.recipientName}
        trainHeading={trainBanner.heading}
        trainSubheading={trainBanner.subheading}
        photo1Url={resolvedPhoto1}
        photo1Caption={data.photo1Caption}
      />

      {/* Bottom gentle spacer */}
      <div className="h-3" />
    </div>
  );
}
