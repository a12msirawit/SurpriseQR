"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets,
  Hand,
  Music,
  RotateCcw,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-react";
import BackgroundAudioPlayer from "@/components/audio/BackgroundAudioPlayer";
import {
  defaultSongkranSplendorConfig,
  type SongkranSplendorConfig,
} from "@/data/templates";
import SongkranSplashCanvas, {
  type SongkranCanvasMode,
} from "@/components/templates/SongkranSplendor/SongkranSplashCanvas";
import {
  AquaIconMedallion,
  BambooSiamSiSvg,
  BuntingFlagsBanner,
  SandPagodaSvg,
  TidalWaveTransitionOverlay,
  WaterBlasterSvg,
  WaterBucketSvg,
} from "@/components/templates/SongkranSplendor/SongkranDecor";
import {
  playBambooShake,
  playDrumSplashCombo,
  playGlassWipe,
  playPowderPuff,
  playTidalWave,
  playWaterSplash,
  startSongkranAmbience,
  unlockSongkranAudio,
} from "@/components/templates/SongkranSplendor/songkranSound";

interface SongkranSplendorTemplateProps {
  config?: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number | string;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

interface PowderMark {
  id: number;
  xPct: number;
  yPct: number;
  rot: number;
  tint: string;
}

/** Normalize either SurpriseQRData or flat SongkranSplendorConfig into SongkranSplendorConfig. */
function resolveSongkranConfig(config: unknown): SongkranSplendorConfig {
  if (!config || typeof config !== "object") return defaultSongkranSplendorConfig;
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
  const blessingLines =
    typeof flowers.message === "string"
      ? flowers.message.split("\n").map((s) => s.trim()).filter(Boolean)
      : [];

  return {
    recipientName:
      (typeof raw.recipientName === "string" && raw.recipientName) ||
      (typeof menu.subTitle === "string" && menu.subTitle) ||
      defaultSongkranSplendorConfig.recipientName,
    senderName:
      (typeof raw.senderName === "string" && raw.senderName) ||
      (typeof menu.card1Desc === "string" && menu.card1Desc) ||
      defaultSongkranSplendorConfig.senderName,
    festivalYear:
      (typeof raw.festivalYear === "string" && raw.festivalYear) ||
      (typeof menu.title === "string" && menu.title) ||
      defaultSongkranSplendorConfig.festivalYear,
    openingTagline:
      (typeof raw.openingTagline === "string" && raw.openingTagline) ||
      (typeof menu.card1Title === "string" && menu.card1Title) ||
      defaultSongkranSplendorConfig.openingTagline,
    photo1Url:
      (typeof raw.photo1Url === "string" && raw.photo1Url) ||
      filmstrip[0]?.src ||
      defaultSongkranSplendorConfig.photo1Url,
    photo1Caption:
      (typeof raw.photo1Caption === "string" && raw.photo1Caption) ||
      (typeof memories.sectionTitle === "string" && memories.sectionTitle) ||
      defaultSongkranSplendorConfig.photo1Caption,
    mainBlessingTitle:
      (typeof raw.mainBlessingTitle === "string" && raw.mainBlessingTitle) ||
      (typeof letter.title === "string" && letter.title) ||
      defaultSongkranSplendorConfig.mainBlessingTitle,
    mainBlessingMessage:
      (typeof raw.mainBlessingMessage === "string" && raw.mainBlessingMessage) ||
      paragraphs.join("\n\n") ||
      defaultSongkranSplendorConfig.mainBlessingMessage,
    photo2Url:
      (typeof raw.photo2Url === "string" && raw.photo2Url) ||
      filmstrip[1]?.src ||
      (typeof (finale.heroImage as { src?: string } | undefined)?.src === "string" &&
        (finale.heroImage as { src?: string }).src) ||
      defaultSongkranSplendorConfig.photo2Url,
    photo2Caption:
      (typeof raw.photo2Caption === "string" && raw.photo2Caption) ||
      (typeof memories.description === "string" && memories.description) ||
      defaultSongkranSplendorConfig.photo2Caption,
    blessingsList:
      Array.isArray(raw.blessingsList) && raw.blessingsList.length > 0
        ? (raw.blessingsList as string[])
        : blessingLines.length > 0
          ? blessingLines
          : defaultSongkranSplendorConfig.blessingsList,
    bgmUrl:
      (typeof raw.bgmUrl === "string" && raw.bgmUrl) ||
      (typeof songMedia.audioSrc === "string" && songMedia.audioSrc) ||
      (typeof bgMusic.src === "string" && bgMusic.src) ||
      "",
  };
}

const POWDER_TINTS = ["#FFFFFF", "#FBCFE8", "#FEF08A", "#BAE6FD"];

/**
 * Songkran Splendor — Sunlit Full-Screen Water Party Experience:
 * 1. Pop Water Balloons + Tip Giant Splash Bucket
 * 2. Swipe Wet Frosted Glass to Reveal Photo 1 + Dual Water Cannons
 * 3. Stamp Cooling Dinsor-Phong Powder + Shake Bamboo Siam-Si Fortune Stick
 * 4. Full-Screen Rapid-Fire Water Cannon Carnival + Combo Counter
 */
export default function SongkranSplendorTemplate({
  config = {},
  studio = false,
  activeScreen,
  refreshToken = 0,
  onSelectField,
}: SongkranSplendorTemplateProps) {
  const data = useMemo(() => resolveSongkranConfig(config), [config]);

  const [currentStage, setCurrentStage] = useState<number>(1);
  const [waveTransitioning, setWaveTransitioning] = useState(false);
  const [bucketTipping, setBucketTipping] = useState(false);
  const [wipeProgress, setWipeProgress] = useState<number>(studio ? 100 : 0);
  const [powderMarks, setPowderMarks] = useState<PowderMark[]>([]);
  const [siamSiShaking, setSiamSiShaking] = useState(false);
  const [siamSiNumber, setSiamSiNumber] = useState<number>(9);
  const [selectedBlessing, setSelectedBlessing] = useState<string | null>(null);
  const [cannonCombo, setCannonCombo] = useState(0);
  const [cannonTrigger, setCannonTrigger] = useState(0);
  const [bucketTrigger, setBucketTrigger] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [photo1Fallback, setPhoto1Fallback] = useState<string | null>(null);
  const [photo2Fallback, setPhoto2Fallback] = useState<string | null>(null);

  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const waveBusyRef = useRef(false);
  const wipingGlassRef = useRef(false);
  const lastWipeSfxRef = useRef(0);
  const powderIdRef = useRef(1);
  const stopAmbienceRef = useRef<(() => void) | null>(null);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      stopAmbienceRef.current?.();
    };
  }, []);

  useEffect(() => {
    setPhoto1Fallback(null);
  }, [data.photo1Url]);

  useEffect(() => {
    setPhoto2Fallback(null);
  }, [data.photo2Url]);

  useEffect(() => {
    if (studio) setWipeProgress(100);
  }, [studio]);

  // Play cheerful Thai ranat ambience when user omits custom BGM
  useEffect(() => {
    if (data.bgmUrl || !musicPlaying || muted) {
      stopAmbienceRef.current?.();
      stopAmbienceRef.current = null;
      return;
    }
    if (!stopAmbienceRef.current) {
      stopAmbienceRef.current = startSongkranAmbience();
    }
    return () => {
      stopAmbienceRef.current?.();
      stopAmbienceRef.current = null;
    };
  }, [data.bgmUrl, musicPlaying, muted]);

  // Immediate sync when Studio form tabs change
  useEffect(() => {
    if (!activeScreen) return;
    waveBusyRef.current = false;
    setWaveTransitioning(false);
    if (activeScreen === 1 || activeScreen === "welcome") setCurrentStage(1);
    else if (activeScreen === 2 || activeScreen === "splash") setCurrentStage(2);
    else if (activeScreen === 3 || activeScreen === "blessing") setCurrentStage(3);
    else if (activeScreen === 4 || activeScreen === "finale") setCurrentStage(4);
  }, [activeScreen, refreshToken]);

  /**
   * Slow rising Tidal Water Wave wash across the whole screen between Songkran scenes.
   */
  const triggerTidalWave = useCallback(
    (targetStage: number, onPeak?: () => void) => {
      if (waveBusyRef.current || targetStage === currentStage) return;
      waveBusyRef.current = true;
      unlockSongkranAudio();
      if (!muted) {
        setMusicPlaying(true);
        playTidalWave();
      }
      setWaveTransitioning(true);

      // Swap scene right as the tidal wave crest fills the screen
      schedule(() => {
        onPeak?.();
        setCurrentStage(targetStage);
        setCannonTrigger((c) => c + 1);
      }, 540);

      schedule(() => {
        setWaveTransitioning(false);
        waveBusyRef.current = false;
      }, 1260);
    },
    [currentStage, muted, schedule],
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

  const handleTipBucket = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (bucketTipping || waveBusyRef.current) return;
    unlockSongkranAudio();
    setBucketTipping(true);
    setMusicPlaying(true);
    setBucketTrigger((c) => c + 1);
    if (!muted) playWaterSplash(1.25);

    schedule(() => {
      setBucketTipping(false);
      triggerTidalWave(2, () => {
        if (!studio) setWipeProgress(0);
      });
    }, 340);
  };

  const advanceWipe = useCallback(
    (step = 9) => {
      if (studio || currentStage !== 2) return;
      setWipeProgress((prev) => {
        if (prev >= 100) return 100;
        const next = Math.min(100, prev + step);
        const now = Date.now();
        if (!muted && now - lastWipeSfxRef.current > 110) {
          lastWipeSfxRef.current = now;
          playGlassWipe();
        }
        return next;
      });
    },
    [currentStage, muted, studio],
  );

  const handleFireCannons = (e: React.MouseEvent) => {
    e.stopPropagation();
    unlockSongkranAudio();
    setCannonTrigger((c) => c + 1);
    if (currentStage === 4) {
      setCannonCombo((n) => n + 1);
      if (!muted) playDrumSplashCombo();
    } else if (!muted) {
      playWaterSplash(1.2);
    }
  };

  const handleStampPowder = (e: React.MouseEvent) => {
    e.stopPropagation();
    unlockSongkranAudio();
    const id = powderIdRef.current++;
    const mark: PowderMark = {
      id,
      xPct: 8 + Math.random() * 82,
      yPct: 8 + Math.random() * 78,
      rot: (Math.random() - 0.5) * 40,
      tint: POWDER_TINTS[id % POWDER_TINTS.length],
    };
    setPowderMarks((prev) => [...prev.slice(-11), mark]);
    if (!muted) playPowderPuff();
  };

  const handleShakeSiamSi = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (siamSiShaking) return;
    unlockSongkranAudio();
    setSiamSiShaking(true);
    if (!muted) playBambooShake();

    schedule(() => {
      setSiamSiShaking(false);
      if (data.blessingsList.length > 0) {
        const idx = Math.floor(Math.random() * data.blessingsList.length);
        const picked =
          data.blessingsList.length > 1 && data.blessingsList[idx] === selectedBlessing
            ? data.blessingsList[(idx + 1) % data.blessingsList.length]
            : data.blessingsList[idx];
        setSelectedBlessing(picked);
        setSiamSiNumber(Math.floor(Math.random() * 28) + 1);
      }
    }, 380);
  };

  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerTidalWave(1, () => {
      setWipeProgress(studio ? 100 : 0);
      setPowderMarks([]);
      setSelectedBlessing(null);
      setCannonCombo(0);
    });
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    unlockSongkranAudio();
    if (!musicPlaying) {
      setMusicPlaying(true);
      setMuted(false);
    } else {
      setMuted((m) => !m);
    }
  };

  const resolvedPhoto1 = photo1Fallback ?? data.photo1Url;
  const resolvedPhoto2 = photo2Fallback ?? data.photo2Url;
  const canvasMode: SongkranCanvasMode =
    currentStage === 1
      ? "balloons"
      : currentStage === 2
        ? "wipe"
        : currentStage === 3
          ? "powder"
          : "carnival";
  const mistBlur = studio ? 0 : Math.max(0, Math.round(((100 - wipeProgress) / 100) * 14));

  return (
    <div className="relative flex h-full min-h-[640px] w-full flex-col justify-between overflow-hidden bg-sky-700 font-sans text-white select-none">
      {data.bgmUrl ? (
        <BackgroundAudioPlayer url={data.bgmUrl} isPlaying={musicPlaying && !muted} loop />
      ) : null}

      {/* Bright Sunlit Tropical Pool & Golden Horizon Backdrop (Unique daylight festival vibe!) */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(170deg,#0284c7_0%,#0ea5e9_38%,#0369a1_72%,#0c4a6e_100%)]" />
      {/* Warm dancing sunlight flare */}
      <motion.div
        animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.12, 1] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-24 -right-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(254,240,138,0.42)_0%,rgba(251,191,36,0.12)_50%,transparent_75%)] blur-2xl"
      />
      <motion.div
        animate={{ opacity: [0.25, 0.45, 0.25], x: [-16, 16, -16] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(103,232,249,0.45)_0%,transparent_72%)] blur-2xl"
      />

      {/* Festive Colorful Temple Bunting Flags along the top */}
      <BuntingFlagsBanner />

      {/* Full-Screen Water Blaster, Floating Water Balloons & Glass Drip Canvas */}
      <SongkranSplashCanvas
        mode={canvasMode}
        muted={muted}
        cannonTrigger={cannonTrigger}
        bucketTrigger={bucketTrigger}
        onSplashAction={() => {
          if (currentStage === 4) setCannonCombo((n) => n + 1);
        }}
      />

      {/* Slow Rising Tidal Wave Transition Overlay */}
      <TidalWaveTransitionOverlay active={waveTransitioning} />

      {/* Header Controls: Music Orb + Water-Drop Stage Dots + Sound Orb */}
      <header className="pointer-events-none relative z-30 flex items-center justify-between px-5 pt-7">
        <div className="pointer-events-auto">
          {onSelectField ? (
            <button
              type="button"
              {...editableProps(4, "field-sk-bgm", "เพลงประกอบ")}
              aria-label="แก้ไขเพลงประกอบ"
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/45 bg-sky-950/45 text-white backdrop-blur-md transition-all hover:scale-105"
            >
              <Music className="h-3.5 w-3.5 text-yellow-200" />
              {data.bgmUrl && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.95)]" />
              )}
            </button>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/35 bg-sky-950/35 text-cyan-100 backdrop-blur-md">
              <Sun className="h-3.5 w-3.5 text-yellow-200" />
            </span>
          )}
        </div>

        {/* 4-Stage Drop Dots */}
        <nav
          aria-label="ลำดับฉากสงกรานต์"
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/30 bg-sky-950/40 px-3 py-1.5 backdrop-blur-md"
        >
          {[1, 2, 3, 4].map((stageNum, idx) => {
            const active = currentStage === stageNum;
            return (
              <React.Fragment key={stageNum}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerTidalWave(stageNum);
                  }}
                  aria-label={`ไปยังฉากที่ ${stageNum}`}
                  className="flex h-4 w-4 items-center justify-center focus:outline-none"
                >
                  <span
                    className={`block rounded-full transition-all duration-300 ${
                      active
                        ? "h-2.5 w-2.5 bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.95)]"
                        : "h-1.5 w-1.5 bg-white/45 hover:bg-white/90"
                    }`}
                  />
                </button>
                {idx < 3 && <span className="h-px w-2.5 bg-white/25" />}
              </React.Fragment>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted || !musicPlaying ? "เปิดเสียง" : "ปิดเสียง"}
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/45 bg-sky-950/45 text-white backdrop-blur-md transition-all hover:scale-105"
        >
          {muted || !musicPlaying ? (
            <VolumeX className="h-3.5 w-3.5 text-white/75" />
          ) : (
            <Volume2 className="h-3.5 w-3.5 text-yellow-200" />
          )}
        </button>
      </header>

      {/* Main Content Stages */}
      <main className="pointer-events-none relative z-20 flex flex-1 items-center justify-center px-5 py-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, y: 26, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 1.04 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none relative flex w-full max-w-sm flex-col items-center text-center"
          >
            {/* ==================== STAGE 1: WATER BALLOONS & GIANT BUCKET ==================== */}
            {currentStage === 1 && (
              <div className="pointer-events-none flex w-full flex-col items-center">
                <div className="pointer-events-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-sky-950/35 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-yellow-200 backdrop-blur-sm">
                  <Droplets className="h-3.5 w-3.5 text-cyan-200" />
                  <span>แตะลูกโป่งน้ำหรือลากนิ้วฉีดน้ำเต็มจอ</span>
                </div>

                <h2
                  {...editableProps(1, "field-sk-recipient", "ชื่อผู้รับ")}
                  className={`pointer-events-auto mb-2 rounded-lg px-3 py-0.5 text-lg font-medium text-white drop-shadow ${
                    onSelectField ? "cursor-pointer" : ""
                  }`}
                >
                  แด่ {data.recipientName}
                </h2>

                <h1
                  {...editableProps(1, "field-sk-year", "หัวเรื่องเทศกาล")}
                  className={`pointer-events-auto mb-3 -rotate-2 rounded-2xl bg-gradient-to-b from-white via-yellow-200 to-amber-300 bg-clip-text px-3 text-4xl font-black tracking-tight text-transparent drop-shadow-[0_6px_20px_rgba(0,0,0,0.35)] md:text-5xl ${
                    onSelectField ? "cursor-pointer" : ""
                  }`}
                >
                  {data.festivalYear}
                </h1>

                <p
                  {...editableProps(1, "field-sk-tagline", "ข้อความต้อนรับ")}
                  className={`pointer-events-auto mb-8 max-w-xs rounded-xl bg-sky-950/25 px-4 py-2 text-sm leading-relaxed text-cyan-50 backdrop-blur-[2px] ${
                    onSelectField ? "cursor-pointer" : ""
                  }`}
                >
                  {data.openingTagline}
                </p>

                {/* Tip Giant Water Bucket Icon Medallion */}
                <AquaIconMedallion
                  onClick={handleTipBucket}
                  ariaLabel="สาดน้ำถังใหญ่เต็มหน้าจอ"
                  caption={bucketTipping ? "สาดตูมเลย!" : "แตะถังสาดน้ำเต็มจอ"}
                  variant="gold"
                  active={bucketTipping}
                  disabled={bucketTipping}
                  icon={<WaterBucketSvg className="h-8 w-8" />}
                />
              </div>
            )}

            {/* ==================== STAGE 2: WIPE WET GLASS TO REVEAL PHOTO 1 ==================== */}
            {currentStage === 2 && (
              <div className="pointer-events-none flex w-full flex-col items-center">
                <div className="pointer-events-auto mb-2.5 flex items-center gap-1.5 rounded-full border border-white/35 bg-sky-950/45 px-3 py-1 text-[11px] font-semibold text-cyan-100 backdrop-blur-sm">
                  <Hand className="h-3.5 w-3.5 text-yellow-200" />
                  <span>
                    {studio
                      ? "โหมดแก้ไข: ผู้รับจะถูไอน้ำเพื่อเผยภาพ"
                      : wipeProgress < 100
                        ? `ถูหน้าจอบนภาพเพื่อเช็ดหยดน้ำ (${wipeProgress}%)`
                        : "เช็ดใสกิ๊งแล้ว กดปืนฉีดน้ำสาดต่อได้เลย"}
                  </span>
                </div>

                {/* Tilted Tropical Waterproof Frame with Live Swipe-to-Wipe Glass */}
                <div
                  {...(onSelectField
                    ? editableProps(2, "field-sk-photo1", "รูปภาพความสุขที่ 1")
                    : {
                        onPointerDown: (e: React.PointerEvent) => {
                          e.stopPropagation();
                          wipingGlassRef.current = true;
                          advanceWipe(14);
                        },
                        onPointerMove: (e: React.PointerEvent) => {
                          e.stopPropagation();
                          if (wipingGlassRef.current || e.buttons > 0) advanceWipe(7);
                        },
                        onPointerUp: () => {
                          wipingGlassRef.current = false;
                        },
                        onPointerLeave: () => {
                          wipingGlassRef.current = false;
                        },
                      })}
                  className={`pointer-events-auto relative w-72 -rotate-1 touch-none rounded-2xl border-2 border-white/75 bg-white p-2.5 pb-4 shadow-[0_20px_45px_rgba(3,40,70,0.55)] ${
                    onSelectField ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
                  }`}
                >
                  <div className="relative mb-2.5 aspect-[4/3] w-full overflow-hidden rounded-xl bg-sky-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvedPhoto1}
                      alt="โมเมนต์สงกรานต์สุดชุ่มฉ่ำ"
                      onError={() => setPhoto1Fallback("/templates/galaxy-1.png")}
                      style={{ filter: `blur(${mistBlur}px)` }}
                      className="pointer-events-none h-full w-full object-cover transition-[filter] duration-200"
                    />
                    {!studio && wipeProgress < 100 && (
                      <div
                        style={{ opacity: Math.max(0.08, (100 - wipeProgress) / 115) }}
                        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.65),rgba(186,230,253,0.75))]"
                      >
                        <div className="flex flex-col items-center gap-1 rounded-2xl bg-sky-900/60 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm">
                          <Hand className="h-5 w-5 animate-bounce text-yellow-200" />
                          <span>ถูไล่หยดน้ำบนภาพ</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <p
                    {...editableProps(2, "field-sk-photo1-caption", "คำบรรยายใต้ภาพที่ 1")}
                    className={`rounded px-1 text-center text-xs font-semibold text-sky-900 ${
                      onSelectField ? "cursor-pointer" : ""
                    }`}
                  >
                    {data.photo1Caption}
                  </p>
                </div>

                {/* Action Medallions: Shoot Water Cannon across Screen + Advance */}
                <div className="mt-5 flex items-center justify-center gap-6">
                  <AquaIconMedallion
                    onClick={handleFireCannons}
                    ariaLabel="ฉีดน้ำเต็มหน้าจอ"
                    caption="ฉีดน้ำเต็มจอ"
                    size="md"
                    variant="pink"
                    icon={<WaterBlasterSvg className="h-6 w-6" />}
                  />
                  <AquaIconMedallion
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerTidalWave(3);
                    }}
                    ariaLabel="ไปเล่นปะแป้งและเสี่ยงเซียมซี"
                    caption="ปะแป้ง & ขอพร"
                    size="md"
                    variant="gold"
                    icon={<BambooSiamSiSvg className="h-6 w-6" />}
                  />
                </div>
              </div>
            )}

            {/* ==================== STAGE 3: POWDER STAMPS (ปะแป้ง) & BAMBOO SIAM-SI ==================== */}
            {currentStage === 3 && (
              <div className="pointer-events-none flex w-full flex-col items-center">
                {/* Floating Sunlit Postcard */}
                <div className="pointer-events-auto relative w-full overflow-hidden rounded-3xl border-2 border-white/55 bg-sky-950/65 p-5 shadow-[0_22px_50px_rgba(3,40,70,0.6)] backdrop-blur-md">
                  {/* Cute Songkran Powder Stamps applied interactively */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    {powderMarks.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 0.55 }}
                        style={{ left: `${m.xPct}%`, top: `${m.yPct}%`, rotate: `${m.rot}deg` }}
                        className="absolute flex gap-0.5"
                      >
                        <span style={{ backgroundColor: m.tint }} className="h-2.5 w-5 rounded-full blur-[0.5px]" />
                        <span style={{ backgroundColor: m.tint }} className="h-2.5 w-3.5 rounded-full blur-[0.5px]" />
                      </motion.div>
                    ))}
                  </div>

                  {/* Interactive Powder Stamp Badge at Top Center */}
                  <div className="relative z-10 mb-3 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleStampPowder}
                      aria-label="แตะเพื่อปะแป้งดินสอพอง"
                      title="แตะปะแป้งความสนุก"
                      className="inline-flex items-center gap-1.5 rounded-full border border-pink-200/75 bg-pink-500/80 px-3 py-1 text-[11px] font-bold text-white shadow-md transition-transform hover:scale-105 active:scale-90"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>ปะแป้ง ({powderMarks.length})</span>
                    </button>
                  </div>

                  <h3
                    {...editableProps(3, "field-sk-blessing-title", "หัวข้อคำอวยพรสงกรานต์")}
                    className={`relative z-10 mb-2 rounded-lg px-2 text-lg font-bold text-yellow-200 ${
                      onSelectField ? "cursor-pointer" : ""
                    }`}
                  >
                    {data.mainBlessingTitle}
                  </h3>

                  <p
                    {...editableProps(3, "field-sk-blessing-message", "เนื้อหาคำอวยพรสงกรานต์")}
                    className={`relative z-10 mb-4 max-h-24 overflow-y-auto whitespace-pre-line rounded-lg px-2 py-1 text-[13px] leading-relaxed text-cyan-50 ${
                      onSelectField ? "cursor-pointer" : ""
                    }`}
                  >
                    {data.mainBlessingMessage}
                  </p>

                  {/* Bouncing Lucky Bamboo Siam-Si Cup (Different mechanic from Tarot Compass!) */}
                  <div
                    {...editableProps(3, "field-sk-blessings", "ชุดคำอวยพรสุ่มมงคล")}
                    className={`relative z-10 rounded-2xl border border-white/25 bg-sky-900/55 p-3 ${
                      onSelectField ? "cursor-pointer" : ""
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <motion.button
                        type="button"
                        onClick={handleShakeSiamSi}
                        animate={
                          siamSiShaking
                            ? { rotate: [-14, 14, -12, 12, -8, 0], scale: [1, 1.08, 1] }
                            : { y: [0, -3, 0] }
                        }
                        transition={
                          siamSiShaking
                            ? { duration: 0.36 }
                            : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                        }
                        aria-label="เขย่าเซียมซีสงกรานต์"
                        className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-yellow-200/80 bg-amber-500/25 shadow-lg transition-transform hover:scale-110"
                      >
                        <BambooSiamSiSvg className="h-8 w-8" />
                      </motion.button>

                      <AnimatePresence mode="wait">
                        {selectedBlessing ? (
                          <motion.div
                            key={`${siamSiNumber}-${selectedBlessing}`}
                            initial={{ y: 12, opacity: 0, scale: 0.9 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            className="w-full rounded-xl border border-yellow-300/60 bg-gradient-to-r from-amber-200 to-yellow-100 px-3 py-2 text-xs font-bold text-amber-950 shadow-md"
                          >
                            ใบที่ {siamSiNumber}: &ldquo;{selectedBlessing}&rdquo;
                          </motion.div>
                        ) : (
                          <span className="text-[11px] font-medium text-yellow-200/90">
                            แตะกระบอกเซียมซีเพื่อเขย่าคำอวยพรหน้าร้อน
                          </span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Advance to Carnival Finale */}
                <div className="mt-5">
                  <AquaIconMedallion
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerTidalWave(4);
                    }}
                    ariaLabel="เข้าสู่ปาร์ตี้ฉีดน้ำส่งท้าย"
                    caption="ปาร์ตี้สาดน้ำปิดท้าย"
                    size="md"
                    variant="pink"
                    icon={<WaterBlasterSvg className="h-6 w-6" />}
                  />
                </div>
              </div>
            )}

            {/* ==================== STAGE 4: FULL-SCREEN WATER CANNON CARNIVAL FINALE ==================== */}
            {currentStage === 4 && (
              <div className="pointer-events-none flex w-full flex-col items-center">
                {/* Playful Tilted Waterproof Frame #2 */}
                <div
                  {...editableProps(4, "field-sk-photo2", "รูปภาพเฉลิมฉลองที่ 2")}
                  className={`pointer-events-auto relative mb-3 w-64 rotate-1 overflow-hidden rounded-2xl border-2 border-white/85 bg-white p-2 pb-3 shadow-[0_18px_42px_rgba(3,40,70,0.6)] ${
                    onSelectField ? "cursor-pointer" : ""
                  }`}
                >
                  <motion.div
                    animate={{ x: ["-140%", "220%"] }}
                    transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                    className="pointer-events-none absolute inset-y-0 z-10 w-16 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                  />
                  <div className="mb-2 aspect-[4/3] w-full overflow-hidden rounded-xl bg-sky-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvedPhoto2}
                      alt="สงกรานต์สุขใจไปด้วยกัน"
                      onError={() => setPhoto2Fallback("/templates/galaxy-2.png")}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p
                    {...editableProps(4, "field-sk-photo2-caption", "คำบรรยายใต้ภาพที่ 2")}
                    className={`rounded px-1 text-center text-xs font-semibold text-sky-900 ${
                      onSelectField ? "cursor-pointer" : ""
                    }`}
                  >
                    {data.photo2Caption}
                  </p>
                </div>

                <div
                  {...editableProps(1, "field-sk-sender", "ชื่อผู้ส่ง")}
                  className={`pointer-events-auto mb-3 rounded-lg px-2 py-0.5 text-xs font-medium text-yellow-100 drop-shadow ${
                    onSelectField ? "cursor-pointer" : ""
                  }`}
                >
                  ส่งต่อความสุขโดย <span className="font-bold text-yellow-300">{data.senderName}</span>
                </div>

                {/* Live Carnival Splash Combo Pill */}
                {cannonCombo > 0 && (
                  <motion.div
                    key={cannonCombo}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-sky-950 shadow-md"
                  >
                    <Droplets className="h-3.5 w-3.5" />
                    <span>สาดเต็มจอแล้ว {cannonCombo} คอมโบ!</span>
                  </motion.div>
                )}

                {/* Dual Interactive Toys: Rapid Water Cannon Blaster + Replay */}
                <div className="pointer-events-auto flex items-center justify-center gap-7">
                  <AquaIconMedallion
                    onClick={handleFireCannons}
                    ariaLabel="กดรัวปืนฉีดน้ำสาดเต็มจอ"
                    caption="กดรัวสาดน้ำเต็มจอ"
                    size="lg"
                    variant="pink"
                    icon={<WaterBlasterSvg className="h-8 w-8" />}
                  />
                  <AquaIconMedallion
                    onClick={handleReplay}
                    ariaLabel="เล่นอีกครั้ง"
                    caption="เล่นอีกครั้ง"
                    size="md"
                    variant="glass"
                    icon={<RotateCcw className="h-4 w-4" />}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Water Pagoda Silhouette Horizon */}
      <footer className="pointer-events-none relative z-20 flex flex-col items-center pb-3">
        <div className="flex items-center gap-2 opacity-65">
          <SandPagodaSvg className="h-5 w-5" />
          <span className="text-[9px] font-semibold tracking-[0.26em] text-cyan-100">
            SURPRISEQR • SONGKRAN WATER FESTIVAL
          </span>
        </div>
      </footer>
    </div>
  );
}
