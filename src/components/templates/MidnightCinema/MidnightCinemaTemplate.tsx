"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SurpriseQRData } from "@/types/templates";
import CinematicDust from "./CinematicDust";
import CinemaTicket from "./CinemaTicket";
import FilmStrip, { type FilmFrameItem } from "./FilmStrip";
import ProjectorPlayer from "./ProjectorPlayer";

interface MidnightCinemaTemplateProps {
  config: SurpriseQRData;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

/**
 * Midnight Cinema 35mm — Film Noir & Classic 35mm Cinematic Template.
 * Strict Art Direction:
 * 1. Zero Emoji Policy throughout all components, typography and audio.
 * 2. Natural cinematic labels ("ฉีกตั๋ว", "ชมอีกครั้ง") without parentheses.
 */
export default function MidnightCinemaTemplate({
  config,
  isEditing = false,
  studio = false,
  activeScreen,
  refreshToken = 0,
  onSelectField,
}: MidnightCinemaTemplateProps) {
  // If activeScreen is provided from studio, screen 1 maps to ticket, 2 maps to film memories, 3 maps to screenplay
  const [currentStage, setCurrentStage] = useState<"ticket" | "film" | "screenplay">("ticket");
  const [isTorn, setIsTorn] = useState(false);
  const [isProjectorWarming, setIsProjectorWarming] = useState(false);

  // Sync with activeScreen in studio editor
  useEffect(() => {
    if (activeScreen === 1) {
      setCurrentStage("ticket");
    } else if (activeScreen === 2 || activeScreen === 3) {
      setIsTorn(true);
      setCurrentStage("film");
    } else if (activeScreen === 4 || activeScreen === 5 || activeScreen === 6) {
      setIsTorn(true);
      setCurrentStage("screenplay");
    }
  }, [activeScreen, refreshToken]);

  const handleTearComplete = () => {
    setIsTorn(true);
    setIsProjectorWarming(true);

    // Warm-up projector lamp flash transition
    setTimeout(() => {
      setIsProjectorWarming(false);
      setCurrentStage("film");
    }, 700);
  };

  const handleReplay = () => {
    setIsTorn(false);
    setCurrentStage("ticket");
  };

  // Safe defensive extraction of card content (handles both SurpriseQRData and flat card payload)
  const raw = (config as unknown as Record<string, unknown>) || {};
  const content = ((raw.content as Record<string, unknown>) || raw) as Record<string, unknown>;
  const menu = (content.menu as Record<string, unknown>) || {};
  const letter = (content.letter as Record<string, unknown>) || {};
  const memories = (content.memories as Record<string, unknown>) || {};
  const songMedia = (content.songMedia as Record<string, unknown>) || {};
  const finale = (content.finale as Record<string, unknown>) || {};
  const bgMusic = (content.bgMusic as Record<string, unknown>) || {};

  const movieTitle =
    (typeof menu.title === "string" && menu.title) ||
    (typeof content.title === "string" && content.title) ||
    (typeof raw.title === "string" && raw.title) ||
    "THE STORY OF US";

  const screeningDate =
    (typeof menu.card1Title === "string" && menu.card1Title) || "14 FEB 2026";
  const screeningTime =
    (typeof menu.card1Desc === "string" && menu.card1Desc) || "23:45";
  const theaterHall =
    (typeof menu.card2Desc === "string" && menu.card2Desc) || "SCREEN 01";
  const seatNumber =
    (typeof menu.card2Title === "string" && menu.card2Title) || "ROW A - 07 & 08";
  const admitCount =
    (typeof menu.subTitle === "string" && menu.subTitle) || "ADMIT ONE";

  // 35mm Film Frames
  const rawPhotos = Array.isArray(memories.filmstripImages)
    ? (memories.filmstripImages as Array<{ src?: string }>)
    : Array.isArray(raw.photos)
    ? (raw.photos as Array<{ src?: string }>)
    : [];

  const frames: FilmFrameItem[] =
    rawPhotos.length > 0
      ? rawPhotos.map((item, idx) => ({
          src: item?.src || "/templates/galaxy-1.png",
          sceneTag: `SCENE ${String(idx + 1).padStart(2, "0")}: MEMORY`,
          caption:
            (typeof memories.description === "string" && memories.description) ||
            "ช่วงเวลาที่ไม่มีวันเลือนหาย",
        }))
      : typeof raw.image_url === "string" && raw.image_url
      ? [
          {
            src: raw.image_url,
            sceneTag: "SCENE 01: MEMORY",
            caption: "ช่วงเวลาที่ไม่มีวันเลือนหาย",
          },
        ]
      : [
          {
            src: "/templates/galaxy-1.png",
            sceneTag: "SCENE 01: THE FIRST ENCOUNTER",
            caption: "ค่ำคืนแรกที่เราได้พบกัน โลกเปลี่ยนไปตลอดกาล",
          },
          {
            src: "/templates/galaxy-2.png",
            sceneTag: "SCENE 02: A JOURNEY TOGETHER",
            caption: "ทุกการเดินทางที่เธอเคียงข้าง คือภาพยนตร์เรื่องโปรด",
          },
          {
            src: "/templates/surprise-qr.svg",
            sceneTag: "SCENE 03: THE TIMELESS MEMORY",
            caption: "ความทรงจำที่ไม่มีวันเลือนหาย ตราบใดที่ยังมีเรา",
          },
        ];

  const letterTitle =
    (typeof letter.title === "string" && letter.title) ||
    "SCENE 1: EXT. MIDNIGHT SKY - NIGHT";

  const rawParagraphs = Array.isArray(letter.paragraphs)
    ? (letter.paragraphs as string[])
    : typeof raw.message === "string" && raw.message
    ? raw.message.split("\n\n").filter(Boolean)
    : [];

  const letterParagraphs =
    rawParagraphs.length > 0
      ? rawParagraphs
      : [
          "แด่เธอ... ผู้เป็นดั่งบทภาพยนตร์ที่งดงามที่สุดในชีวิตของฉัน",
          "ทุกค่ำคืนที่เราได้ร่วมเดินทางผ่านเรื่องราวต่างๆ คือช่วงเวลาที่ประทับแน่นอยู่ในใจเสมือนม้วนฟิล์ม 35 มม.",
          "ขอบคุณที่เข้ามาเป็นดั่งแสงสปอตไลท์อันอบอุ่น และทำให้ทุกๆ วันมีความหมาย",
        ];

  const songTitle =
    (typeof songMedia.songTitle === "string" && songMedia.songTitle) ||
    "Cinema Paradiso (Love Theme)";
  const songArtist =
    (typeof songMedia.songArtist === "string" && songMedia.songArtist) ||
    "Ennio Morricone";
  const audioSrc =
    (typeof songMedia.audioSrc === "string" && songMedia.audioSrc) ||
    (typeof bgMusic.src === "string" && bgMusic.src) ||
    (typeof raw.audio_url === "string" && raw.audio_url) ||
    "";
  const finaleMainText =
    (typeof finale.mainText === "string" && finale.mainText) ||
    "THE END • AND THE STORY CONTINUES";
  const finaleSubText =
    (typeof finale.subText === "string" && finale.subText) ||
    "ขอบคุณที่ร่วมเป็นตัวเอกในภาพยนตร์เรื่องนี้ด้วยกัน";

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#090a0f] text-neutral-100 flex flex-col justify-between selection:bg-amber-400 selection:text-black">
      {/* Ambient Lighting & 35mm Dust Overlay */}
      <CinematicDust />

      {/* Projector Warm-up Flash Overlay */}
      <AnimatePresence>
        {isProjectorWarming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0.4, 0.95, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="fixed inset-0 z-50 bg-amber-100/30 mix-blend-screen pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Main Cinema Viewport */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-10 w-full max-w-4xl mx-auto">
        {/* Stage 1: The Golden Ticket Stub */}
        {currentStage === "ticket" && (
          <motion.div
            key="stage-ticket"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <div className="text-center mb-6">
              <span className="font-mono text-[11px] tracking-[0.35em] text-amber-400/90 uppercase">
                NOIR PICTURES • PRIVATE ARCHIVE
              </span>
              <h2 className="mt-1 font-serif text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
                MIDNIGHT CINEMA
              </h2>
            </div>

            <CinemaTicket
              movieTitle={movieTitle}
              screeningDate={screeningDate}
              screeningTime={screeningTime}
              theaterHall={theaterHall}
              seatNumber={seatNumber}
              admitCount={admitCount}
              isTorn={isTorn}
              onTear={handleTearComplete}
              onSelectField={onSelectField}
            />
          </motion.div>
        )}

        {/* Stage 2: The 35mm Memories */}
        {currentStage === "film" && (
          <motion.div
            key="stage-film"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.5 }}
            className="w-full space-y-8"
          >
            <FilmStrip
              frames={frames}
              sectionTitle={
                (typeof memories.sectionTitle === "string" && memories.sectionTitle) ||
                "THE 35MM MEMORIES"
              }
              description={
                (typeof memories.description === "string" && memories.description) ||
                "บันทึกช่วงเวลาที่งดงามผ่านม้วนฟิล์ม 35 มม."
              }
              onSelectField={onSelectField}
            />

            {/* Advance to Screenplay Button */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setCurrentStage("screenplay")}
                className="group inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-neutral-900/90 px-7 py-3 font-serif text-xs font-bold tracking-widest text-amber-200 shadow-xl transition-all hover:border-amber-300 hover:text-white hover:bg-neutral-800"
              >
                <span>อ่านบทภาพยนตร์</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Stage 3: The Screenplay & Soundtrack */}
        {currentStage === "screenplay" && (
          <motion.div
            key="stage-screenplay"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full space-y-10"
          >
            {/* Screenplay Document */}
            <div
              onClick={() => onSelectField?.(2, "field-cinema-screenplay")}
              className="relative mx-auto w-full max-w-2xl rounded-2xl border border-neutral-800 bg-[#0c0d14]/95 p-6 sm:p-10 shadow-2xl backdrop-blur-md cursor-pointer group"
            >
              {/* Typewriter Top Bar */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                <span>DRAFT #1 • SCENE SCRIPT</span>
                <span>PAGE 1 OF 1</span>
              </div>

              {/* Screenplay Content Body */}
              <div className="mt-8 space-y-6 font-mono text-xs sm:text-sm text-neutral-300 leading-relaxed">
                {/* Scene Heading */}
                <p className="font-bold text-amber-400 uppercase tracking-widest">
                  {letterTitle}
                </p>

                <p className="text-neutral-500 uppercase text-[11px] tracking-wider">
                  FADE IN:
                </p>

                {/* Character cue & dialogue */}
                <div className="pl-4 sm:pl-8 space-y-4 border-l border-neutral-800/80">
                  <p className="font-bold text-white uppercase tracking-wider">
                    CHARACTER (V.O.)
                  </p>
                  {letterParagraphs.map((para, i) => (
                    <p key={i} className="text-neutral-200 font-serif text-sm sm:text-base leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>

                <p className="text-neutral-500 uppercase text-[11px] tracking-wider">
                  FADE OUT.
                </p>
              </div>

              {/* Director's Signoff */}
              <div className="mt-10 pt-6 border-t border-neutral-800 flex items-center justify-between font-mono text-[11px] text-neutral-400">
                <span>DIRECTED WITH LOVE</span>
                <span>SURPRISEQR ARCHIVE</span>
              </div>
            </div>

            {/* Soundtrack Projector Player */}
            <ProjectorPlayer
              songTitle={songTitle}
              songArtist={songArtist}
              audioSrc={audioSrc}
              onSelectField={onSelectField}
            />

            {/* Finale Message & Replay Button */}
            <div
              onClick={() => onSelectField?.(4, "field-cinema-finale")}
              className="text-center pt-6 space-y-5 cursor-pointer group"
            >
              <h3 className="font-serif text-xl sm:text-2xl font-black text-amber-200 uppercase tracking-widest">
                {finaleMainText}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 font-sans max-w-md mx-auto">
                {finaleSubText}
              </p>

              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleReplay}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/90 px-8 py-3 font-serif text-xs font-bold tracking-widest text-neutral-200 shadow-xl transition-all hover:border-amber-400 hover:text-white"
                >
                  <span>ชมอีกครั้ง</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Cinematic Studio Footer Navigation when isEditing is active */}
      {isEditing && (
        <footer className="relative z-10 w-full border-t border-neutral-800/80 bg-[#06070a]/90 py-3 px-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentStage("ticket")}
              className={`rounded-lg px-3 py-1 font-mono text-xs transition-colors ${
                currentStage === "ticket"
                  ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              1. ตั๋วภาพยนตร์
            </button>
            <button
              type="button"
              onClick={() => {
                setIsTorn(true);
                setCurrentStage("film");
              }}
              className={`rounded-lg px-3 py-1 font-mono text-xs transition-colors ${
                currentStage === "film"
                  ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              2. ม้วนฟิล์ม 35 มม.
            </button>
            <button
              type="button"
              onClick={() => {
                setIsTorn(true);
                setCurrentStage("screenplay");
              }}
              className={`rounded-lg px-3 py-1 font-mono text-xs transition-colors ${
                currentStage === "screenplay"
                  ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              3. บทภาพยนตร์ & เพลง
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

