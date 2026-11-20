"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  Candy,
  Check,
  ChevronDown,
  Crown,
  Flame,
  Ghost,
  KeyRound,
  Lock,
  Moon,
  Music,
  Sparkles,
  Volume2,
  VolumeX,
  Wand2,
  X,
  ZoomIn,
} from "lucide-react";
import BackgroundAudioPlayer from "@/components/audio/BackgroundAudioPlayer";
import {
  defaultHalloweenHauntedConfig,
  type HalloweenHauntedConfig,
} from "@/data/templates";
import HauntedAbyssCanvas from "@/components/templates/HalloweenHaunted/HauntedAbyssCanvas";
import InteractiveFogFrame from "@/components/templates/HalloweenHaunted/InteractiveFogFrame";
import MysteryBatEnvelope from "@/components/templates/HalloweenHaunted/MysteryBatEnvelope";
import {
  FriendlyGhostCompanion,
  HauntedSpiderOnThread,
  JackOLanternSvg,
  OuijaPlanchetteSvg,
  TrackingEyeballPainting,
  WitchCauldronSvg,
} from "@/components/templates/HalloweenHaunted/HauntedSvgProps";
import {
  playBatSwarmFlutter,
  playCandyCollect,
  playCauldronBubble,
  playDoorCreakBoom,
  playGhostBoo,
  playGravityFlip,
  playMistWhoosh,
  playPlanchetteGliss,
  playPuzzleSolveChime,
  playSpiderBoing,
  playTrickOrTreatShower,
  startSpookyOrganLoop,
  unlockHalloweenAudio,
} from "@/components/templates/HalloweenHaunted/halloweenSound";

interface HalloweenHauntedTemplateProps {
  config?: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number | string;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

/** Normalize either SurpriseQRData or flat HalloweenHauntedConfig. */
function resolveHalloweenConfig(config: unknown): HalloweenHauntedConfig {
  if (!config || typeof config !== "object") return defaultHalloweenHauntedConfig;
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
  const paragraphs = Array.isArray(letter.paragraphs)
    ? (letter.paragraphs as string[])
    : [];
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
      defaultHalloweenHauntedConfig.recipientName,
    senderName:
      (typeof raw.senderName === "string" && raw.senderName) ||
      (typeof menu.card1Desc === "string" && menu.card1Desc) ||
      defaultHalloweenHauntedConfig.senderName,
    festivalYear:
      (typeof raw.festivalYear === "string" && raw.festivalYear) ||
      (typeof menu.title === "string" && menu.title) ||
      defaultHalloweenHauntedConfig.festivalYear,
    openingTagline:
      (typeof raw.openingTagline === "string" && raw.openingTagline) ||
      (typeof menu.card1Title === "string" && menu.card1Title) ||
      defaultHalloweenHauntedConfig.openingTagline,
    photo1Url:
      (typeof raw.photo1Url === "string" && raw.photo1Url) ||
      filmstrip[0]?.src ||
      defaultHalloweenHauntedConfig.photo1Url,
    photo1Caption:
      (typeof raw.photo1Caption === "string" && raw.photo1Caption) ||
      (typeof memories.sectionTitle === "string" && memories.sectionTitle) ||
      defaultHalloweenHauntedConfig.photo1Caption,
    mainWishTitle:
      (typeof raw.mainWishTitle === "string" && raw.mainWishTitle) ||
      (typeof letter.title === "string" && letter.title) ||
      defaultHalloweenHauntedConfig.mainWishTitle,
    mainWishMessage:
      (typeof raw.mainWishMessage === "string" && raw.mainWishMessage) ||
      (paragraphs.length > 0 ? paragraphs.join("\n\n") : "") ||
      defaultHalloweenHauntedConfig.mainWishMessage,
    photo2Url:
      (typeof raw.photo2Url === "string" && raw.photo2Url) ||
      filmstrip[1]?.src ||
      (typeof finale.heroImage === "object" && finale.heroImage
        ? ((finale.heroImage as { src?: string }).src ?? "")
        : "") ||
      defaultHalloweenHauntedConfig.photo2Url,
    photo2Caption:
      (typeof raw.photo2Caption === "string" && raw.photo2Caption) ||
      (typeof memories.description === "string" && memories.description) ||
      (typeof finale.subText === "string" && finale.subText) ||
      defaultHalloweenHauntedConfig.photo2Caption,
    fortuneList: Array.isArray(raw.fortuneList)
      ? (raw.fortuneList as string[])
      : flowerFortunes.length > 0
        ? flowerFortunes
        : defaultHalloweenHauntedConfig.fortuneList,
    bgmUrl:
      (typeof raw.bgmUrl === "string" && raw.bgmUrl) ||
      (typeof songMedia.audioSrc === "string" && songMedia.audioSrc) ||
      (typeof bgMusic.src === "string" && bgMusic.src) ||
      "",
  };
}

const LANTERN_NUMERALS = ["I", "II", "III"] as const;
const DIAL_SYMBOLS = ["moon", "pumpkin", "ghost"] as const; // Target combination: [0, 1, 2]
const DIAL_LABELS: Record<(typeof DIAL_SYMBOLS)[number], string> = {
  moon: "พระจันทร์",
  pumpkin: "ฟักทอง",
  ghost: "น้องผี",
};

const POTION_BREWS = [
  "คำใบ้ความสุข: อย่าลืมแวะดูซองจดหมายตราค้างคาวด้านล่างนะ!",
  "ปรุงน้ำเชื่อมแสงจันทร์: วันนี้ขอให้มีแต่เรื่องให้ยิ้มกว้าง!",
  "ผสมอบเชยฟักทอง: โชคดีกำลังรอให้เธอเปิดซองจดหมาย!",
  "ซุปลูกกวาดสายรุ้ง: สุขสันต์วันฮาโลวีนนะ คนเก่ง!",
];

export default function HalloweenHauntedTemplate({
  config,
  studio = false,
  activeScreen,
  refreshToken = 0,
  onSelectField,
}: HalloweenHauntedTemplateProps) {
  const data = useMemo(() => resolveHalloweenConfig(config), [config]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lanternPuzzleRef = useRef<HTMLDivElement | null>(null);
  const zone1Ref = useRef<HTMLElement | null>(null);
  const zone2Ref = useRef<HTMLElement | null>(null);
  const zone3Ref = useRef<HTMLElement | null>(null);
  const zone4Ref = useRef<HTMLElement | null>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [isFastScrolling, setIsFastScrolling] = useState(false);
  const lastScrollRef = useRef<{ top: number; time: number }>({
    top: 0,
    time: 0,
  });
  const fastScrollTimerRef = useRef<number | null>(null);

  const [muted, setMuted] = useState<boolean>(studio);
  const [musicPlaying, setMusicPlaying] = useState<boolean>(false);
  const [gateOpened, setGateOpened] = useState<boolean>(false);

  // Puzzle 1: Tap lantern seals I -> II -> III in order to unlock Photo 1
  const [lanternSeq, setLanternSeq] = useState<number[]>([]);
  const [lanternHintMsg, setLanternHintMsg] = useState<string>(
    "แตะจุดโคมทั้ง 3 ดวงเรียงตามลำดับ I -> II -> III เพื่อเปิดกรอบภาพที่ 1"
  );
  const [mistCleared, setMistCleared] = useState<boolean>(studio);

  // Mid-scroll mystery clue interactions + Secret Envelope
  const [booPopped, setBooPopped] = useState<boolean>(false);
  const [gravityFixed, setGravityFixed] = useState<boolean>(false);
  const [cauldronStirs, setCauldronStirs] = useState<number>(0);
  const [cauldronBurstTrigger, setCauldronBurstTrigger] = useState<number>(0);
  const [envelopeOpened, setEnvelopeOpened] = useState<boolean>(false);
  const [batSwarmBurst, setBatSwarmBurst] = useState<{
    count: number;
    x: number;
    y: number;
  }>({ count: 0, x: 0, y: 0 });
  const [planchetteIdx, setPlanchetteIdx] = useState<number>(0);
  const [selectedFortune, setSelectedFortune] = useState<string | null>(null);

  // Puzzle 3: Align 3 Symbol Dials [Moon, Pumpkin, Ghost] to unlock Photo 2
  const [dialValues, setDialValues] = useState<[number, number, number]>([1, 2, 0]);
  const [photo2Unlocked, setPhoto2Unlocked] = useState<boolean>(studio);

  // Candy celebration shower & Fullscreen Photo Lightbox
  const [candyShowerTrigger, setCandyShowerTrigger] = useState<number>(0);
  const [inspectedPhoto, setInspectedPhoto] = useState<{
    url: string;
    caption: string;
    label: string;
  } | null>(null);

  const [photo1Fallback, setPhoto1Fallback] = useState<string | null>(null);
  const [photo2Fallback, setPhoto2Fallback] = useState<string | null>(null);

  useEffect(() => setPhoto1Fallback(null), [data.photo1Url]);
  useEffect(() => setPhoto2Fallback(null), [data.photo2Url]);
  useEffect(() => {
    if (studio) {
      setMistCleared(true);
      setPhoto2Unlocked(true);
    }
  }, [studio]);

  // Whimsical festive waltz when unmuted and no custom BGM
  useEffect(() => {
    if (data.bgmUrl || studio || !musicPlaying || muted) return;
    const stopLoop = startSpookyOrganLoop(() => !muted && musicPlaying);
    return () => stopLoop();
  }, [data.bgmUrl, studio, musicPlaying, muted]);

  // Studio activeScreen sync smoothly scrolls to target chapter
  useEffect(() => {
    if (!activeScreen) return;
    const n =
      typeof activeScreen === "number"
        ? activeScreen
        : activeScreen === "fireworks"
          ? 2
          : activeScreen === "wish"
            ? 3
            : activeScreen === "finale"
              ? 4
              : 1;
    const targetRef =
      n === 1
        ? zone1Ref
        : n === 2
          ? zone2Ref
          : n === 3
            ? zone3Ref
            : zone4Ref;
    targetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeScreen, refreshToken]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
    const prog = Math.max(0, Math.min(1, el.scrollTop / maxScroll));
    setScrollProgress(prog);

    if (prog > 0.08 && !gateOpened) {
      setGateOpened(true);
    }

    const now = performance.now();
    const dt = Math.max(16, now - lastScrollRef.current.time);
    const velocity = Math.abs(el.scrollTop - lastScrollRef.current.top) / dt;
    lastScrollRef.current = { top: el.scrollTop, time: now };

    if (velocity > 1.25) {
      setIsFastScrolling(true);
      if (fastScrollTimerRef.current) {
        window.clearTimeout(fastScrollTimerRef.current);
      }
      fastScrollTimerRef.current = window.setTimeout(() => {
        setIsFastScrolling(false);
      }, 420);
    }
  }, [gateOpened]);

  useEffect(() => {
    return () => {
      if (fastScrollTimerRef.current) {
        window.clearTimeout(fastScrollTimerRef.current);
      }
    };
  }, []);

  const ensureSoundUnlocked = () => {
    unlockHalloweenAudio();
    if (!studio && !musicPlaying && !muted) {
      setMusicPlaying(true);
    }
  };

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
    [onSelectField]
  );

  const photo1Unlocked = studio || lanternSeq.length === 3;
  const solvedCount =
    (photo1Unlocked ? 1 : 0) +
    (envelopeOpened ? 1 : 0) +
    (photo2Unlocked ? 1 : 0);

  const gateSlidePct = Math.min(100, (gateOpened ? 100 : 0) + scrollProgress * 450);

  const resolvedPhoto1 = photo1Fallback ?? data.photo1Url;
  const resolvedPhoto2 = photo2Fallback ?? data.photo2Url;

  const planchetteAngleRad = ((planchetteIdx % 5) - 2) * 0.42;
  const planchetteX = Math.sin(planchetteAngleRad) * 76;
  const planchetteY = (1 - Math.cos(planchetteAngleRad)) * 28;

  const handleOpenGate = () => {
    ensureSoundUnlocked();
    playDoorCreakBoom(muted);
    setGateOpened(true);
    window.setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: Math.min(640, (scrollRef.current.scrollHeight || 3000) * 0.2),
        behavior: "smooth",
      });
    }, 320);
  };

  const handleLanternPuzzleTap = (id: number) => {
    ensureSoundUnlocked();
    if (lanternSeq.length === 3) {
      playSpiderBoing(muted);
      return;
    }

    const expectedNext = lanternSeq.length + 1;
    if (id === expectedNext) {
      const next = [...lanternSeq, id];
      setLanternSeq(next);
      if (next.length === 3) {
        playPuzzleSolveChime(muted);
        setCauldronBurstTrigger((b) => b + 1);
        setLanternHintMsg("ไขรหัสโคมฟักทองสำเร็จ! เลื่อนลงไปปัดหมอกดูภาพที่ 1 ได้เลย");
      } else {
        playCandyCollect(muted);
        setLanternHintMsg(
          `เก่งมาก! กดจุดโคมดวงที่ ${LANTERN_NUMERALS[next.length]} ต่อไปเลย`
        );
      }
    } else {
      playGhostBoo(muted);
      setLanternSeq([]);
      setLanternHintMsg("ลองใหม่นะ! ต้องจุดเรียงจาก I -> II -> III จ้า");
    }
  };

  const handleOpenEnvelope = (ox: number, oy: number) => {
    ensureSoundUnlocked();
    playBatSwarmFlutter(muted);
    setEnvelopeOpened(true);
    setBatSwarmBurst((prev) => ({ count: prev.count + 1, x: ox, y: oy }));
  };

  const handleReplayBats = (ox: number, oy: number) => {
    ensureSoundUnlocked();
    playBatSwarmFlutter(muted);
    setBatSwarmBurst((prev) => ({ count: prev.count + 1, x: ox, y: oy }));
  };

  const handleCycleDial = (dialIdx: 0 | 1 | 2) => {
    ensureSoundUnlocked();
    if (photo2Unlocked) return;
    const next: [number, number, number] = [...dialValues] as [number, number, number];
    next[dialIdx] = (next[dialIdx] + 1) % 3;
    setDialValues(next);

    if (next[0] === 0 && next[1] === 1 && next[2] === 2) {
      playPuzzleSolveChime(muted);
      setPhoto2Unlocked(true);
      setCauldronBurstTrigger((b) => b + 1);
    } else {
      playCandyCollect(muted);
    }
  };

  const handleDrawFortune = () => {
    ensureSoundUnlocked();
    playPlanchetteGliss(muted);
    if (data.fortuneList.length === 0) return;
    const nextIdx =
      (planchetteIdx + 1 + Math.floor(Math.random() * 2)) % data.fortuneList.length;
    setPlanchetteIdx(nextIdx);
    setSelectedFortune(data.fortuneList[nextIdx]);
  };

  const handleStirCauldron = () => {
    ensureSoundUnlocked();
    playCauldronBubble(muted);
    setCauldronStirs((c) => c + 1);
    setCauldronBurstTrigger((b) => b + 1);
  };

  const handleTriggerTrickOrTreat = () => {
    ensureSoundUnlocked();
    playTrickOrTreatShower(muted);
    setCandyShowerTrigger((c) => c + 1);
  };

  const toggleFogMist = () => {
    ensureSoundUnlocked();
    playMistWhoosh(muted, !mistCleared);
    setMistCleared((m) => !m);
  };

  return (
    <div
      onPointerMove={(e) => {
        pointerRef.current.x = e.clientX;
        pointerRef.current.y = e.clientY;
      }}
      className="relative h-full min-h-[600px] w-full overflow-hidden bg-[#06020d] text-amber-50 select-none"
    >
      {data.bgmUrl && !studio ? (
        <BackgroundAudioPlayer
          url={data.bgmUrl}
          isPlaying={musicPlaying && !muted}
          loop
        />
      ) : null}

      {/* Moonlit Warm Halloween Sky & Shifting Glow */}
      <div
        className="pointer-events-none absolute inset-0 transition-colors duration-700"
        style={{
          background:
            scrollProgress < 0.35
              ? "radial-gradient(circle at 50% 18%, rgba(234, 88, 12, 0.24) 0%, rgba(76, 29, 149, 0.34) 45%, #06020d 100%)"
              : scrollProgress < 0.72
                ? "radial-gradient(circle at 50% 45%, rgba(168, 85, 247, 0.24) 0%, rgba(88, 28, 135, 0.36) 50%, #05020a 100%)"
                : "radial-gradient(circle at 50% 72%, rgba(249, 115, 22, 0.28) 0%, rgba(107, 33, 168, 0.32) 48%, #040108 100%)",
        }}
      />

      {/* Ambient Canvas (Bats, Warm Glow Halo, Mist Sparks, Candy Confetti & Bat Swarm Burst) */}
      <HauntedAbyssCanvas
        scrollProgress={scrollProgress}
        isFastScrolling={isFastScrolling}
        pointerRef={pointerRef}
        candyShowerTrigger={candyShowerTrigger}
        cauldronBurstTrigger={cauldronBurstTrigger}
        batSwarmBurst={batSwarmBurst}
      />

      {/* Top Minimal Mystery Progress Pill */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 px-4 pt-4">
        <div className="pointer-events-auto flex items-center gap-2">
          {onSelectField && (
            <button
              type="button"
              {...editableProps(4, "field-hw-bgm", "เพลงประกอบ")}
              aria-label="แก้ไขเพลงประกอบ"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-400/40 bg-black/60 text-orange-200 backdrop-blur-md transition hover:scale-105"
            >
              <Music className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex items-center gap-2 rounded-full border border-purple-300/25 bg-[#120722]/80 px-3 py-1 text-[11px] font-semibold backdrop-blur-md">
            <KeyRound className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-purple-100">
              ไขปริศนา {solvedCount}/3
            </span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              unlockHalloweenAudio();
              if (!musicPlaying) {
                setMusicPlaying(true);
                setMuted(false);
              } else {
                setMuted((m) => !m);
              }
            }}
            aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}
            className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition hover:scale-105 ${
              !muted
                ? "border-orange-400/60 bg-orange-500/20 text-orange-200"
                : "border-white/20 bg-black/55 text-slate-400"
            }`}
          >
            {muted ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Delicate Right-Edge Scroll Ribbon */}
      <div className="pointer-events-none absolute right-2.5 top-1/2 z-30 hidden h-36 w-1 -translate-y-1/2 rounded-full bg-white/10 sm:block">
        <div
          className="w-full rounded-full bg-gradient-to-b from-amber-300 via-orange-400 to-purple-400 transition-all duration-150"
          style={{ height: `${Math.max(10, Math.round(scrollProgress * 100))}%` }}
        />
      </div>

      {/* Bottom-Right Cheerful Ghost Guide */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-30">
        <FriendlyGhostCompanion
          scrollProgress={scrollProgress}
          isFastScrolling={isFastScrolling}
        />
      </div>

      {/* LONG SCROLLABLE HAPPY HALLOWEEN MYSTERY */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative z-10 h-full w-full overflow-x-hidden overflow-y-auto scroll-smooth custom-scrollbar"
      >
        <div className="mx-auto flex w-full max-w-xl flex-col items-center px-5 pb-28 pt-16">
          {/* ==============================================================
              ZONE 1: HAPPY HALLOWEEN MYSTERY OPENING GATE
              ============================================================== */}
          <section
            ref={zone1Ref}
            className="relative flex min-h-[76vh] w-full flex-col items-center justify-center text-center"
          >
            <div className="pointer-events-none absolute top-4 h-44 w-44 rounded-full bg-[radial-gradient(circle,#fef08a_0%,#f97316_45%,#9a3412_78%,transparent_100%)] opacity-30 blur-xl" />

            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/35 bg-orange-950/40 px-4 py-1 text-[11px] font-bold tracking-[0.2em] text-orange-200 uppercase backdrop-blur-md">
              <Moon className="h-3.5 w-3.5 text-amber-300" />
              <span
                {...editableProps(1, "field-hw-year", "หัวเรื่องฮาโลวีน")}
                className={onSelectField ? "cursor-pointer hover:underline" : ""}
              >
                {data.festivalYear}
              </span>
            </div>

            <div
              {...editableProps(1, "field-hw-recipient", "ชื่อผู้รับ")}
              className={`inline-flex items-center gap-1.5 rounded-full border border-purple-400/35 bg-purple-950/45 px-4 py-1 text-xs font-semibold text-purple-200 ${
                onSelectField ? "cursor-pointer hover:border-orange-300" : ""
              }`}
            >
              <Ghost className="h-3.5 w-3.5 text-purple-300" />
              <span>แด่ {data.recipientName}</span>
            </div>

            <h1 className="mt-4 bg-gradient-to-b from-amber-100 via-orange-300 to-purple-300 bg-clip-text text-3xl font-black tracking-tight text-transparent drop-shadow-[0_6px_22px_rgba(249,115,22,0.3)] sm:text-5xl">
              สุขสันต์วันฮาโลวีน
            </h1>

            <p
              {...editableProps(1, "field-hw-tagline", "ข้อความเกริ่นนำ")}
              className={`mt-3 max-w-md text-xs leading-relaxed text-purple-100/90 sm:text-sm ${
                onSelectField ? "cursor-pointer rounded-lg p-1 hover:bg-white/10" : ""
              }`}
            >
              {data.openingTagline}
            </p>

            {/* Mystery Checklist Slip */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px]">
              {[
                { label: "ภาพปริศนาที่ 1", done: photo1Unlocked },
                { label: "ซองจดหมายค้างคาว", done: envelopeOpened },
                { label: "ภาพความทรงจำที่ 2", done: photo2Unlocked },
              ].map((item) => (
                <span
                  key={item.label}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 backdrop-blur-md transition ${
                    item.done
                      ? "border-amber-300/60 bg-amber-500/20 text-amber-100"
                      : "border-white/15 bg-black/45 text-purple-200/80"
                  }`}
                >
                  {item.done ? (
                    <Check className="h-3 w-3 text-amber-300" />
                  ) : (
                    <Lock className="h-3 w-3 text-purple-300" />
                  )}
                  <span>{item.label}</span>
                </span>
              ))}
            </div>

            {/* Decorative Iron & Gold Gate */}
            <div className="relative mt-6 flex h-44 w-full max-w-xs items-center justify-center overflow-hidden rounded-3xl border border-orange-400/30 bg-black/50 p-4 shadow-2xl backdrop-blur-md">
              <div
                className="absolute inset-y-0 left-0 z-10 w-1/2 border-r-2 border-amber-500/45 bg-[linear-gradient(135deg,#1d0b33_0%,#090311_100%)] transition-transform duration-700"
                style={{ transform: `translateX(-${gateSlidePct}%)` }}
              >
                <div className="flex h-full items-center justify-around px-3 opacity-35">
                  <div className="h-full w-1 bg-amber-300/40" />
                  <div className="h-full w-1 bg-amber-300/40" />
                </div>
              </div>
              <div
                className="absolute inset-y-0 right-0 z-10 w-1/2 border-l-2 border-amber-500/45 bg-[linear-gradient(225deg,#1d0b33_0%,#090311_100%)] transition-transform duration-700"
                style={{ transform: `translateX(${gateSlidePct}%)` }}
              >
                <div className="flex h-full items-center justify-around px-3 opacity-35">
                  <div className="h-full w-1 bg-amber-300/40" />
                  <div className="h-full w-1 bg-amber-300/40" />
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 text-center">
                <JackOLanternSvg lit className="h-14 w-14 animate-pulse" />
                <span className="text-xs font-bold text-amber-200">
                  ประตูไขปริศนาเปิดแล้ว!
                </span>
              </div>

              {!gateOpened && (
                <button
                  type="button"
                  onClick={handleOpenGate}
                  className="relative z-20 flex flex-col items-center gap-2 transition hover:scale-105 active:scale-95"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-400/75 bg-gradient-to-br from-orange-500/45 to-purple-900/85 shadow-[0_0_30px_rgba(249,115,22,0.55)]">
                    <JackOLanternSvg lit className="h-10 w-10" />
                  </div>
                  <span className="rounded-full bg-black/80 px-3 py-1 text-[11px] font-bold text-amber-200">
                    เปิดประตูเริ่มตามหาเซอร์ไพรส์
                  </span>
                </button>
              )}
            </div>

            <div className="mt-7 flex flex-col items-center gap-1.5 text-[11px] text-orange-200/85">
              <span>เลื่อนหน้าจอลงไปตามหารูปและซองจดหมายลับ</span>
              <ChevronDown className="h-5 w-5 animate-bounce text-orange-400" />
            </div>
          </section>

          {/* ==============================================================
              BETWEEN 1 & 2: SPIDER, TRACKING EYES & LANTERN RIDDLE #1
              ============================================================== */}
          <div className="relative flex w-full flex-col items-center py-8">
            <div className="h-20 w-px bg-gradient-to-b from-orange-400/50 via-purple-400/40 to-transparent" />

            <HauntedSpiderOnThread
              scrollRatio={Math.max(0, (scrollProgress - 0.08) * 3)}
              onBoing={() => {
                ensureSoundUnlocked();
                playSpiderBoing(muted);
              }}
            />

            <div className="my-10 flex w-full flex-col items-center gap-4 rounded-3xl border border-purple-400/20 bg-black/45 p-6 text-center backdrop-blur-md">
              <span className="text-[11px] font-semibold tracking-widest text-purple-200 uppercase">
                คำใบ้จากสองดวงตาลึกลับ
              </span>
              <TrackingEyeballPainting />
              <p className="text-[11px] text-slate-300">
                ขยับเมาส์หรือลากนิ้วรอบ ๆ ดวงตาสิ — ภาพความทรงจำใบแรกซ่อนอยู่หลังโคมไฟ 3 ดวงด้านล่าง!
              </p>
            </div>

            {/* Mystery Sequence Lock 1: Tap Lanterns I -> II -> III */}
            <div
              ref={lanternPuzzleRef}
              className="my-4 w-full space-y-3 rounded-3xl border border-orange-400/30 bg-[#140724]/75 p-5 text-center backdrop-blur-md"
            >
              <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/35 bg-orange-500/15 px-3 py-0.5 text-[11px] font-bold text-orange-200">
                <KeyRound className="h-3.5 w-3.5" />
                <span>ปริศนาที่ 1 · ปลดล็อกภาพความทรงจำแรก</span>
              </div>
              <p className="text-xs text-amber-100/90">{lanternHintMsg}</p>
              <div className="grid w-full grid-cols-3 gap-3 text-center">
                {[1, 2, 3].map((pId, idx) => {
                  const isLit = lanternSeq.includes(pId) || studio;
                  return (
                    <button
                      key={pId}
                      type="button"
                      onClick={() => handleLanternPuzzleTap(pId)}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all duration-300 hover:scale-105 active:scale-95 ${
                        isLit
                          ? "border-orange-400/75 bg-orange-950/50 shadow-[0_0_24px_rgba(249,115,22,0.4)]"
                          : "border-white/15 bg-white/[0.04] hover:border-orange-300/45"
                      }`}
                    >
                      <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-black tracking-widest text-amber-300">
                        {LANTERN_NUMERALS[idx]}
                      </span>
                      <JackOLanternSvg
                        lit={isLit}
                        className={`h-11 w-11 transition-transform ${
                          isLit ? "scale-110" : "opacity-75"
                        }`}
                      />
                      <span className="text-[10px] font-semibold text-amber-100">
                        {isLit ? "ส่องสว่างแล้ว" : `โคมดวงที่ ${LANTERN_NUMERALS[idx]}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ==============================================================
              ZONE 2: MYSTERY PHOTO 1 (UNLOCK -> BRUSH MIST -> CLICK TO VIEW)
              ============================================================== */}
          <section
            ref={zone2Ref}
            className="relative my-8 w-full rounded-[2rem] border border-orange-400/30 bg-[#120722]/80 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:p-6"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-orange-300 uppercase">
                <Sparkles className="h-4 w-4" />
                <span>ความทรงจำปริศนาใบที่ 1</span>
              </div>
              {photo1Unlocked && !studio && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleFogMist}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/25"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{mistCleared ? "เรียกหมอกกลับ" : "ปัดหมอกให้สว่าง"}</span>
                  </button>
                  {mistCleared && (
                    <button
                      type="button"
                      onClick={() =>
                        setInspectedPhoto({
                          url: resolvedPhoto1,
                          caption: data.photo1Caption,
                          label: "ภาพความทรงจำที่ 1",
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-purple-300/45 bg-purple-500/20 px-3 py-1 text-[11px] font-semibold text-purple-100 transition hover:bg-purple-500/35"
                    >
                      <ZoomIn className="h-3 w-3" />
                      <span>ดูรูป</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {!photo1Unlocked ? (
              <div className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-orange-300/35 bg-black/55 p-6 text-center sm:h-72">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-orange-400/45 bg-orange-500/15 text-orange-300">
                  <Lock className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-amber-200">
                  กรอบภาพที่ 1 ยังปิดผนึกอยู่
                </p>
                <p className="max-w-xs text-xs text-slate-300">
                  เลื่อนขึ้นไปแตะจุดโคมฟักทองทั้ง 3 ดวงตามลำดับ I - II - III ด้านบนเพื่อปลดล็อกและปัดหมอกดูภาพ
                </p>
                <button
                  type="button"
                  onClick={() =>
                    lanternPuzzleRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/45 bg-orange-500/20 px-3.5 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-orange-500/30"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>ไปไขรหัสโคมฟักทอง</span>
                </button>
              </div>
            ) : (
              <InteractiveFogFrame
                imageUrl={resolvedPhoto1}
                imageAlt={data.photo1Caption}
                mistCleared={mistCleared}
                studio={studio}
                onFallbackImage={() =>
                  setPhoto1Fallback("/templates/halloween-haunted-scroll.svg")
                }
                onMistClearedChange={(next) => {
                  setMistCleared(next);
                }}
                onBrushStrokeSound={(grand) => {
                  ensureSoundUnlocked();
                  playMistWhoosh(muted, Boolean(grand));
                }}
                onInspectPhoto={() =>
                  setInspectedPhoto({
                    url: resolvedPhoto1,
                    caption: data.photo1Caption,
                    label: "ภาพความทรงจำที่ 1",
                  })
                }
                imageEditableProps={
                  onSelectField
                    ? editableProps(2, "field-hw-photo1", "รูปภาพความทรงจำที่ 1")
                    : undefined
                }
              />
            )}

            <p
              {...editableProps(2, "field-hw-photo1-caption", "คำบรรยายรูปที่ 1")}
              className={`mt-3 text-center text-xs leading-relaxed text-amber-100/90 sm:text-sm ${
                onSelectField ? "cursor-pointer hover:underline" : ""
              }`}
            >
              {data.photo1Caption}
            </p>
          </section>

          {/* ==============================================================
              BETWEEN 2 & 3: GHOST HINT, UPSIDE-DOWN RIDDLE CARD & CAULDRON
              ============================================================== */}
          <div className="flex w-full flex-col items-center gap-12 py-10">
            {/* Whispering Ghost Guide */}
            <div className="flex w-full items-center justify-between gap-4 rounded-3xl border border-purple-300/25 bg-purple-950/35 px-5 py-4 backdrop-blur-md">
              <div className="space-y-1">
                <p className="text-xs font-bold text-purple-200">
                  ผีน้อยแอบบอกพิกัดซองจดหมาย!
                </p>
                <p className="text-[11px] text-slate-200">
                  {booPopped
                    ? "คำใบ้: เลื่อนลงไปด้านล่างอีกนิด จะเจอซองจดหมายตราค้างคาวซ่อนอยู่!"
                    : "แตะตัวน้องผีขี้เล่น เพื่อรับคำใบ้ตามหาซองจดหมายลับ"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  ensureSoundUnlocked();
                  playGhostBoo(muted);
                  setBooPopped(true);
                }}
                aria-label="ถามคำใบ้น้องผี"
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                  booPopped
                    ? "scale-105 border-amber-300/65 bg-amber-400/20 text-amber-200 shadow-[0_0_22px_rgba(251,191,36,0.35)]"
                    : "animate-bounce border-purple-300/60 bg-purple-500/25 text-white shadow-[0_0_24px_rgba(168,85,247,0.5)] hover:scale-110"
                }`}
              >
                <Ghost className="h-7 w-7" />
              </button>
            </div>

            {/* Playful Upside-Down Clue Note */}
            <div className="w-full text-center">
              <motion.div
                animate={{ rotate: gravityFixed ? 0 : 180 }}
                transition={{ type: "spring", stiffness: 120, damping: 14 }}
                className="mx-auto w-full max-w-sm rounded-3xl border border-orange-300/35 bg-[#160b29]/85 p-5 shadow-xl backdrop-blur-md"
              >
                <p className="text-xs font-bold text-orange-300">
                  {gravityFixed
                    ? "คำใบ้ลับ: ซองจดหมายอยู่ถัดจากหม้อปรุงยานี้!"
                    : "เอ๊ะ! กระดาษคำใบ้ใบนี้ถูกเสกให้ตีลังกากลับหัว!"}
                </p>
                <p className="mt-1.5 text-xs text-slate-200">
                  {gravityFixed
                    ? "ถ้าเจอซองจดหมายประทับตราค้างคาวแล้ว แตะเปิดดูความลับข้างในได้เลย!"
                    : "แตะปุ่มด้านล่างเพื่อพลิกกระดาษกลับมาอ่านข้อความลับสิ!"}
                </p>
              </motion.div>
              {!gravityFixed && (
                <button
                  type="button"
                  onClick={() => {
                    ensureSoundUnlocked();
                    playGravityFlip(muted);
                    setGravityFixed(true);
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-orange-400/60 bg-orange-500/20 px-4 py-2 text-xs font-bold text-orange-200 shadow-[0_0_20px_rgba(249,115,22,0.35)] transition hover:scale-105 active:scale-95"
                >
                  <Wand2 className="h-4 w-4" />
                  <span>พลิกกระดาษคำใบ้กลับมาอ่าน</span>
                </button>
              )}
            </div>

            {/* Festive Cauldron */}
            <div className="flex flex-col items-center text-center">
              <button
                type="button"
                onClick={handleStirCauldron}
                aria-label="คนหม้อปรุงความสุข"
                className="group transition hover:scale-105 active:scale-95"
              >
                <WitchCauldronSvg
                  bubbling={cauldronStirs > 0}
                  className="h-28 w-28 drop-shadow-[0_0_26px_rgba(168,85,247,0.4)]"
                />
              </button>
              <span className="mt-1 max-w-xs text-xs font-bold text-amber-200">
                {cauldronStirs === 0
                  ? "แตะคนหม้อปรุงน้ำมนต์ก่อนเปิดซองจดหมาย"
                  : POTION_BREWS[(cauldronStirs - 1) % POTION_BREWS.length]}
              </span>
            </div>
          </div>

          {/* ==============================================================
              ZONE 3: HIDDEN ENVELOPE (OPEN TO UNLEASH FLYING BAT SWARM!)
              ============================================================== */}
          <section ref={zone3Ref} className="relative my-8 w-full space-y-6">
            <MysteryBatEnvelope
              isOpen={envelopeOpened}
              studio={studio}
              mainWishTitle={data.mainWishTitle}
              mainWishMessage={data.mainWishMessage}
              onOpenEnvelope={handleOpenEnvelope}
              onReplayBats={handleReplayBats}
              titleEditableProps={editableProps(
                3,
                "field-hw-wish-title",
                "หัวข้อคำอวยพร"
              )}
              messageEditableProps={editableProps(
                3,
                "field-hw-wish-message",
                "เนื้อหาคำอวยพร"
              )}
            />

            {/* Crystal Oracle Board (unlocked smoothly alongside the message envelope) */}
            {(envelopeOpened || studio) && (
              <motion.div
                initial={studio ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                {...editableProps(3, "field-hw-fortunes", "ชุดคำทำนายฮาโลวีน")}
                className="relative flex flex-col items-center overflow-hidden rounded-[2rem] border border-amber-400/30 bg-[#0b0416]/90 px-4 py-6 text-center shadow-2xl"
              >
                <div className="mb-2 flex w-full justify-between px-4 text-[10px] font-bold tracking-[0.22em] text-amber-300/75 uppercase">
                  <span>TRICK</span>
                  <span>MOONLIT WISH BOARD</span>
                  <span>TREAT</span>
                </div>

                <div className="relative flex h-28 w-full max-w-[260px] items-center justify-center">
                  <svg
                    viewBox="0 0 240 100"
                    className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
                  >
                    <path
                      d="M20 82 Q120 12 220 82"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />
                    {[-2, -1, 0, 1, 2].map((step) => {
                      const rx = 120 + step * 44;
                      const ry = 44 + Math.abs(step) * 14;
                      return (
                        <circle
                          key={step}
                          cx={rx}
                          cy={ry}
                          r={step === (planchetteIdx % 5) - 2 ? 4.5 : 2.5}
                          fill={
                            step === (planchetteIdx % 5) - 2
                              ? "#fde047"
                              : "#a855f7"
                          }
                        />
                      );
                    })}
                  </svg>

                  <button
                    type="button"
                    onClick={handleDrawFortune}
                    aria-label="เลื่อนแว่นคริสตัลเสี่ยงทายความสุข"
                    className="relative z-10 transition-transform duration-700 ease-out hover:scale-110 active:scale-95"
                    style={{
                      transform: `translate(${planchetteX}px, ${planchetteY}px) rotate(${
                        ((planchetteIdx % 5) - 2) * 10
                      }deg)`,
                    }}
                  >
                    <OuijaPlanchetteSvg className="h-16 w-16 drop-shadow-[0_0_24px_rgba(168,85,247,0.65)]" />
                  </button>
                </div>

                <p className="mt-2 min-h-[38px] max-w-xs text-xs font-medium leading-relaxed text-amber-100 sm:text-sm">
                  {selectedFortune ||
                    "แตะแว่นคริสตัล เพื่อเสี่ยงทายข้อความเสริมโชคลาภจากซองจดหมาย"}
                </p>
              </motion.div>
            )}
          </section>

          {/* ==============================================================
              BETWEEN 3 & 4: PARALLAX FESTIVE STREAM OF PUMPKINS & CANDIES
              ============================================================== */}
          <div className="relative my-8 w-screen max-w-none overflow-hidden py-6">
            <div
              className="flex items-center justify-center gap-10 whitespace-nowrap opacity-65 transition-transform duration-75"
              style={{
                transform: `translateX(${(scrollProgress - 0.8) * -280}px)`,
              }}
            >
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={`p-top-${idx}`} className="flex items-center gap-4">
                  <JackOLanternSvg lit className="h-9 w-9" />
                  <Sparkles className="h-4 w-4 text-orange-300" />
                </div>
              ))}
            </div>
            <div
              className="mt-4 flex items-center justify-center gap-10 whitespace-nowrap opacity-55 transition-transform duration-75"
              style={{
                transform: `translateX(${(scrollProgress - 0.8) * 280}px)`,
              }}
            >
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={`p-bot-${idx}`} className="flex items-center gap-4">
                  <Candy className="h-6 w-6 text-purple-300" />
                  <Ghost className="h-5 w-5 text-amber-200" />
                </div>
              ))}
            </div>
          </div>

          {/* ==============================================================
              ZONE 4: SYMBOL LOCK PUZZLE -> PHOTO 2 & LIGHTBOX + FINALE
              ============================================================== */}
          <section
            ref={zone4Ref}
            className="relative flex w-full flex-col items-center rounded-[2.2rem] border border-orange-400/40 bg-gradient-to-b from-[#1d0b33]/90 via-[#10051e]/95 to-black/95 p-6 text-center shadow-[0_30px_90px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-400/50 bg-orange-500/20 text-amber-200 shadow-[0_0_24px_rgba(249,115,22,0.4)]">
              <Crown className="h-5 w-5" />
            </div>
            <span className="mt-2.5 text-[10px] font-bold tracking-[0.26em] text-orange-300/90 uppercase">
              HAPPY HALLOWEEN · TRICK OR TREAT
            </span>

            {/* Mystery 3: Interactive 3-Dial Lock before Photo 2 reveals */}
            {!photo2Unlocked ? (
              <div className="mt-5 w-full space-y-4 rounded-2xl border border-amber-300/35 bg-black/55 p-5">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-200">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <span>ปริศนาสุดท้าย: แตะหมุน 3 สัญลักษณ์ให้เรียงตรงกัน</span>
                </div>
                <p className="text-[11px] text-purple-200/85">
                  เรียงลำดับจากซ้ายไปขวา: พระจันทร์ · ฟักทอง · น้องผี
                </p>

                <div className="grid grid-cols-3 gap-3">
                  {([0, 1, 2] as const).map((slotIdx) => {
                    const sym = DIAL_SYMBOLS[dialValues[slotIdx]];
                    const isMatched = dialValues[slotIdx] === slotIdx;
                    return (
                      <button
                        key={slotIdx}
                        type="button"
                        onClick={() => handleCycleDial(slotIdx)}
                        className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition hover:scale-105 active:scale-95 ${
                          isMatched
                            ? "border-amber-300 bg-amber-500/20 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.35)]"
                            : "border-white/15 bg-white/5 text-purple-200"
                        }`}
                      >
                        {sym === "moon" ? (
                          <Moon className="h-7 w-7 text-amber-300" />
                        ) : sym === "pumpkin" ? (
                          <JackOLanternSvg lit className="h-7 w-7" />
                        ) : (
                          <Ghost className="h-7 w-7 text-purple-200" />
                        )}
                        <span className="text-[10px] font-semibold">
                          {DIAL_LABELS[sym]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Unlocked Photo 2 Frame + Tap to Open Fullscreen Lightbox */
              <motion.div
                initial={studio ? false : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.55 }}
                title={
                  onSelectField
                    ? "คลิกเพื่อแก้ไขรูปภาพความทรงจำที่ 2"
                    : "คลิกเพื่อดูภาพขนาดเต็ม"
                }
                data-editable-field={onSelectField ? "field-hw-photo2" : undefined}
                data-edit-label={onSelectField ? "แก้ไขรูปภาพความทรงจำที่ 2" : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectField) {
                    onSelectField(4, "field-hw-photo2");
                    return;
                  }
                  setInspectedPhoto({
                    url: resolvedPhoto2,
                    caption: data.photo2Caption,
                    label: "ภาพความทรงจำที่ 2",
                  });
                }}
                className={`group relative mt-4 w-full overflow-hidden rounded-2xl border border-amber-300/40 bg-black/50 p-1.5 shadow-xl ${
                  onSelectField
                    ? "cursor-pointer hover:border-orange-300"
                    : "cursor-zoom-in hover:border-amber-300"
                }`}
              >
                <img
                  src={resolvedPhoto2}
                  alt={data.photo2Caption}
                  onError={() =>
                    setPhoto2Fallback("/templates/halloween-haunted-scroll.svg")
                  }
                  className="h-56 w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.03] sm:h-64"
                />
                {!studio && (
                  <span className="absolute bottom-3.5 right-3.5 inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-black/75 px-3 py-1.5 text-[11px] font-bold text-amber-100 shadow-lg backdrop-blur-md">
                    <ZoomIn className="h-3.5 w-3.5 text-amber-300" />
                    <span>กดดูรูปขนาดเต็ม</span>
                  </span>
                )}
              </motion.div>
            )}

            <p
              {...editableProps(4, "field-hw-photo2-caption", "ข้อความปิดท้ายรูปที่ 2")}
              className={`mt-4 text-xs leading-relaxed text-amber-100/95 sm:text-sm ${
                onSelectField ? "cursor-pointer hover:underline" : ""
              }`}
            >
              {data.photo2Caption}
            </p>

            <p
              {...editableProps(1, "field-hw-sender", "ชื่อผู้ส่ง")}
              className={`mt-2 text-xs font-bold text-orange-300 ${
                onSelectField ? "cursor-pointer hover:underline" : ""
              }`}
            >
              ส่งความสุขวันฮาโลวีน โดย {data.senderName}
            </p>

            {/* Interactive Closing Icon Medallions */}
            <div className="mt-6 flex items-start justify-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerTrickOrTreat}
                  aria-label="Trick or Treat โปรยลูกอมฉลอง"
                  className="group relative flex h-16 w-16 items-center justify-center rounded-full border border-orange-300/75 bg-gradient-to-br from-orange-400/40 via-purple-600/35 to-black/80 text-amber-100 shadow-[0_0_32px_rgba(249,115,22,0.5)] transition hover:scale-110 active:scale-95"
                >
                  <span className="pointer-events-none absolute -inset-2 animate-ping rounded-full border border-orange-300/45" />
                  <Candy className="h-7 w-7 text-amber-200" />
                </button>
                <span className="text-[11px] font-medium text-amber-100">
                  โปรยลูกอมและพลุฉลอง
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    ensureSoundUnlocked();
                    playGravityFlip(muted);
                    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  aria-label="ลอยกลับด้านบน"
                  className="flex h-16 w-16 items-center justify-center rounded-full border border-purple-300/40 bg-white/10 text-purple-100 shadow-lg backdrop-blur-md transition hover:scale-110 hover:border-purple-200/75 active:scale-95"
                >
                  <ArrowUp className="h-6 w-6" />
                </button>
                <span className="text-[11px] font-medium text-purple-200">
                  ลอยกลับด้านบน
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
      <AnimatePresence>
        {inspectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setInspectedPhoto(null)}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex max-h-[90%] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-amber-300/45 bg-[#120722]/95 p-3 shadow-[0_30px_100px_rgba(0,0,0,0.95)]"
            >
              <div className="mb-2 flex items-center justify-between px-2 pt-1">
                <span className="text-xs font-bold text-amber-200">
                  {inspectedPhoto.label}
                </span>
                <button
                  type="button"
                  onClick={() => setInspectedPhoto(null)}
                  aria-label="ปิดภาพขนาดเต็ม"
                  className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>ปิด</span>
                </button>
              </div>
              <div className="flex-1 overflow-hidden rounded-2xl bg-black">
                <img
                  src={inspectedPhoto.url}
                  alt={inspectedPhoto.caption}
                  className="max-h-[68vh] w-full object-contain"
                />
              </div>
              <p className="mt-3 px-2 pb-1 text-center text-xs leading-relaxed text-amber-100/95 sm:text-sm">
                {inspectedPhoto.caption}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

HalloweenHauntedTemplate.displayName = "HalloweenHauntedTemplate";
