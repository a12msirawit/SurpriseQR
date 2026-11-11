"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause } from "lucide-react";
import BackgroundAudioPlayer from "@/components/audio/BackgroundAudioPlayer";
import confetti from "canvas-confetti";
import GoldDustParticles from "./GoldDustParticles";
import WaxSeal from "./WaxSeal";
import {
  playWaxCrack,
  playPaperRustle,
  playMusicBoxChime,
  playRoyalArpeggio,
} from "./waxSound";

interface VintageWaxSealTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

export default function VintageWaxSealTemplate({
  config,
  studio = false,
  activeScreen,
  onSelectField,
}: VintageWaxSealTemplateProps) {
  // Scoped confetti canvas strictly bound inside preview frame
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiInstanceRef = useRef<confetti.CreateTypes | null>(null);

  const fireGoldenConfetti = (options?: confetti.Options) => {
    if (!confettiCanvasRef.current) return;
    try {
      if (!confettiInstanceRef.current) {
        confettiInstanceRef.current = confetti.create(confettiCanvasRef.current, {
          resize: true,
          useWorker: false,
        });
      }
      confettiInstanceRef.current({
        particleCount: 75,
        spread: 65,
        origin: { y: 0.55 },
        colors: ["#d4af37", "#fef08a", "#fffbeb", "#f59e0b", "#ffffff"],
        ...options,
      });
    } catch {
      // safe fallback
    }
  };

  // Parse card configuration
  const data = useMemo(() => {
    const raw = (config as Record<string, unknown>) || {};
    const content = (raw.content as Record<string, unknown>) || {};
    const menu = (content.menu as Record<string, unknown>) || {};
    const letter = (content.letter as Record<string, unknown>) || {};
    const songMedia = (content.songMedia as Record<string, unknown>) || {};
    const memories = (content.memories as Record<string, unknown>) || {};
    const finale = (content.finale as Record<string, unknown>) || {};
    const bgMusic = (content.bgMusic as Record<string, unknown>) || {};

    const rawParagraphs = letter.paragraphs;
    const paragraphs: string[] =
      Array.isArray(rawParagraphs) && rawParagraphs.length > 0
        ? (rawParagraphs as string[])
        : [
            "แด่เธอ... ผู้เป็นดั่งแสงสว่างอันอบอุ่นในทุกค่ำคืน",
            "ทุกช่วงเวลาที่ได้ร่วมเดินทางด้วยกัน คือความทรงจำที่ล้ำค่าประหนึ่งทองคำ",
            "ขอบคุณที่คอยเป็นของขวัญที่วิเศษที่สุดในชีวิตของฉันเสมอมา",
          ];

    // Gather photos from memories or fallback defaults
    const polaroidImages = Array.isArray(memories.polaroidImages)
      ? (memories.polaroidImages as Array<{ src?: string }>)
      : [];
    const filmstripImages = Array.isArray(memories.filmstripImages)
      ? (memories.filmstripImages as Array<{ src?: string }>)
      : [];
    const allPhotoUrls = [...polaroidImages, ...filmstripImages]
      .map((p) => p?.src)
      .filter((s): s is string => typeof s === "string" && s.length > 0);

    const photos =
      allPhotoUrls.length > 0
        ? allPhotoUrls
        : [
            "/templates/galaxy-1.png",
            "/templates/galaxy-2.png",
            "/templates/surprise-qr.svg",
          ];

    return {
      envelopeTitle:
        typeof menu.title === "string" && menu.title
          ? menu.title
          : "To Someone Special",
      envelopeSubtitle:
        typeof menu.subTitle === "string" && menu.subTitle
          ? menu.subTitle
          : "สัมผัสตราประทับเพื่อคลี่อ่านความในใจ",
      sealColor:
        (menu.card1Icon as "ruby" | "gold") === "gold" ? "gold" : "ruby",
      sealSymbol:
        (menu.card2Icon as "heart" | "rose" | "crown") || "heart",
      letterTitle:
        typeof letter.title === "string" && letter.title
          ? letter.title.replace(/[\u2766\u2767\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]/gu, "").trim()
          : "TO MY BELOVED",
      paragraphs: paragraphs.map((p) => p.replace(/[\u2766\u2767\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]/gu, "").trim()),
      photos,
      photoCaption:
        typeof memories.description === "string"
          ? memories.description.replace(/[\u2766\u2767\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]/gu, "").trim()
          : "ภาพความทรงจำที่เราจารึกไว้ด้วยกัน",
      songTitle:
        typeof songMedia.songTitle === "string" && songMedia.songTitle
          ? songMedia.songTitle
          : "Chamber Music Box in A Major",
      songArtist:
        typeof songMedia.songArtist === "string" && songMedia.songArtist
          ? songMedia.songArtist
          : "Royal Orchestra",
      audioSrc:
        typeof songMedia.audioSrc === "string" && songMedia.audioSrc
          ? songMedia.audioSrc
          : typeof bgMusic.src === "string"
          ? bgMusic.src
          : "",
      finaleTitle:
        typeof finale.mainText === "string" && finale.mainText
          ? finale.mainText.replace(/[\u2766\u2767\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]/gu, "").trim()
          : "A LOVE WRITTEN IN THE STARS",
      finaleSubText:
        typeof finale.subText === "string" && finale.subText
          ? finale.subText.replace(/[\u2766\u2767\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]/gu, "").trim()
          : "ขอให้ความรักและความผูกพันของเรา ยืนยงงดงามตราบชั่วนิรันดร์",
    };
  }, [config]);

  // Stage: 1 = Sealed Envelope, 2 = Parchment Letter & Polaroids, 3 = Music Box & Finale
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [isSealBroken, setIsSealBroken] = useState(false);

  // Studio step syncing
  useEffect(() => {
    if (activeScreen !== undefined && studio) {
      if (activeScreen <= 1) {
        setStage(1);
        setIsSealBroken(false);
      } else if (activeScreen <= 4) {
        setStage(2);
        setIsSealBroken(true);
      } else {
        setStage(3);
        setIsSealBroken(true);
      }
    }
  }, [activeScreen, studio]);

  // Photo viewer index
  const [photoIndex, setPhotoIndex] = useState(0);

  // Music Box state
  const [isPlaying, setIsPlaying] = useState(true);

  // Trigger celebration on Stage 3
  useEffect(() => {
    if (stage === 3) {
      playRoyalArpeggio();
      fireGoldenConfetti();
    }
  }, [stage]);

  // Break the wax seal handler
  const handleBreakSeal = () => {
    setIsSealBroken(true);
    playPaperRustle();
    setTimeout(() => {
      setStage(2);
    }, 450);
  };

  return (
    <div
      className="relative w-full h-full min-h-[640px] md:min-h-[720px] flex flex-col justify-between overflow-hidden select-none font-serif text-[#3e2723]"
      style={{
        backgroundColor: "#16050b",
        backgroundImage: `
          radial-gradient(circle at 50% 35%, rgba(140, 25, 45, 0.45) 0%, rgba(22, 5, 11, 0.95) 85%),
          radial-gradient(circle at 50% 80%, rgba(212, 175, 55, 0.12) 0%, transparent 60%)
        `,
      }}
    >
      {/* Audio element for music box (supports MP3 and YouTube links) */}
      {data.audioSrc && (
        <BackgroundAudioPlayer
          url={data.audioSrc}
          isPlaying={isPlaying && stage === 3}
          loop
        />
      )}

      {/* Scoped Canvas for Golden Sparkles Confetti */}
      <canvas
        ref={confettiCanvasRef}
        id="wax-confetti-canvas"
        className="absolute inset-0 pointer-events-none w-full h-full z-30"
      />

      {/* Floating Gold Dust Particles */}
      <GoldDustParticles />

      {/* Vignette Rim Shadows */}
      <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_90px_rgba(0,0,0,0.85)]" />

      {/* Main Container */}
      <div className="relative flex-1 flex items-center justify-center p-4 md:p-8 z-20 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ========================================================= */}
          {/* STAGE 1: THE SEALED ENVELOPE & 3D WAX SEAL */}
          {/* ========================================================= */}
          {stage === 1 && (
            <motion.div
              key="stage-1-envelope"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -25 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative w-full max-w-[460px] flex flex-col items-center"
            >
              {/* Outer Parchment Envelope Container */}
              <div
                className="relative w-full rounded-2xl p-6 md:p-8 flex flex-col items-center text-center shadow-[0_25px_60px_-12px_rgba(0,0,0,0.7)]"
                style={{
                  backgroundColor: "#fdfbf7",
                  backgroundImage: `
                    radial-gradient(circle at 50% 50%, rgba(255,255,255,0.85) 0%, rgba(247,242,230,0.95) 100%)
                  `,
                  border: "2px solid #d4af37",
                  boxShadow:
                    "0 0 25px rgba(212,175,55,0.25), 0 30px 60px rgba(0,0,0,0.6)",
                }}
              >
                {/* Vintage Minimal Corner Hairlines (No Emojis) */}
                <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-[#d4af37]/60 pointer-events-none" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-[#d4af37]/60 pointer-events-none" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-[#d4af37]/60 pointer-events-none" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-[#d4af37]/60 pointer-events-none" />

                {/* Envelope Fold Flap Lines */}
                <svg
                  viewBox="0 0 400 160"
                  className="w-full max-w-[340px] mb-4 opacity-35 pointer-events-none"
                >
                  <path
                    d="M 10 10 L 200 120 L 390 10"
                    fill="none"
                    stroke="#c5a059"
                    strokeWidth="1.6"
                    strokeDasharray="4 2"
                  />
                </svg>

                {/* Envelope Golden Inscription */}
                <div
                  onClick={(e) => {
                    if (onSelectField) {
                      e.stopPropagation();
                      onSelectField(1, "field-wax-envelope-title");
                    }
                  }}
                  title={
                    onSelectField
                      ? "คลิกเพื่อแก้ไขหัวข้อหน้าซอง (แท็บ 1)"
                      : undefined
                  }
                  className={`space-y-2 mb-6 transition-all rounded-lg p-2 ${
                    onSelectField
                      ? "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:ring-dashed"
                      : ""
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-[0.35em] text-[#996515] font-semibold">
                    ROYAL PARCHMENT
                  </p>
                  <h1 className="text-2xl md:text-3xl font-normal text-[#3a0810] tracking-wider font-serif">
                    {data.envelopeTitle}
                  </h1>
                  <p className="text-xs text-[#78350f]/80 font-serif italic">
                    {data.envelopeSubtitle}
                  </p>
                </div>

                {/* 3D Wax Seal with Tap-to-Break Interaction */}
                <div
                  onClick={(e) => {
                    if (onSelectField && e.shiftKey) {
                      e.stopPropagation();
                      onSelectField(1, "field-wax-seal-style");
                    }
                  }}
                  className="my-3 z-30"
                >
                  <WaxSeal
                    isBroken={isSealBroken}
                    onBreak={handleBreakSeal}
                    color={(data.sealColor as "ruby" | "gold") || "ruby"}
                    symbol={(data.sealSymbol as "heart" | "rose" | "crown") || "heart"}
                  />
                </div>

                {/* Instruction Pill (Editorial Typography, Strict No-Emoji) */}
                <div className="mt-5 flex items-center text-[10px] tracking-[0.2em] uppercase font-medium text-[#78350f] bg-[#fbf5e6]/70 border border-[#d4af37]/40 rounded-full px-4 py-1.5 shadow-sm backdrop-blur-sm">
                  <span>แตะตราประทับเพื่อเปิดอ่าน</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STAGE 2: THE ROYAL PARCHMENT LETTER & POLAROIDS */}
          {/* ========================================================= */}
          {stage === 2 && (
            <motion.div
              key="stage-2-letter"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="w-full max-w-4xl flex flex-col lg:flex-row items-center justify-center gap-6 my-auto"
            >
              {/* Unfolded Parchment Letter */}
              <div
                className="relative w-full lg:w-[480px] rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                style={{
                  backgroundColor: "#faf5ea",
                  backgroundImage: `
                    linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(245,237,219,0.95) 100%)
                  `,
                  border: "2px solid #d4af37",
                  boxShadow:
                    "inset 0 0 35px rgba(212,175,55,0.15), 0 25px 50px rgba(0,0,0,0.5)",
                }}
              >
                {/* Header Calligraphy */}
                <div
                  onClick={(e) => {
                    if (onSelectField) {
                      e.stopPropagation();
                      onSelectField(2, "field-wax-letter-title");
                    }
                  }}
                  title={
                    onSelectField
                      ? "คลิกเพื่อแก้ไขหัวข้อจดหมาย (แท็บ 2)"
                      : undefined
                  }
                  className={`border-b border-[#d4af37]/30 pb-3 mb-4 text-center transition-all rounded p-1 ${
                    onSelectField
                      ? "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:ring-dashed"
                      : ""
                  }`}
                >
                  <p className="text-[9px] tracking-[0.35em] text-[#996515] font-semibold uppercase">
                    FROM THE HEART
                  </p>
                  <h2 className="text-xl md:text-2xl font-serif text-[#3a0810] tracking-[0.18em] uppercase mt-1">
                    {data.letterTitle}
                  </h2>
                  <div className="w-12 h-px bg-[#d4af37]/50 mx-auto mt-2" />
                </div>

                {/* Letter Body Paragraphs */}
                <div
                  onClick={(e) => {
                    if (onSelectField) {
                      e.stopPropagation();
                      onSelectField(3, "field-wax-letter-body");
                    }
                  }}
                  title={
                    onSelectField
                      ? "คลิกเพื่อแก้ไขเนื้อหาจดหมาย (แท็บ 3)"
                      : undefined
                  }
                  className={`min-h-[190px] max-h-[280px] overflow-y-auto pr-3 space-y-4 text-sm md:text-base leading-loose text-[#2b1810] font-serif transition-all rounded p-2 ${
                    onSelectField
                      ? "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:ring-dashed"
                      : ""
                  }`}
                >
                  {data.paragraphs.map((p, idx) => (
                    <motion.p
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 * idx, duration: 0.6 }}
                      className="indent-6"
                    >
                      {p}
                    </motion.p>
                  ))}
                </div>

                {/* Minimal Luxury Action Bar */}
                <div className="pt-4 border-t border-[#d4af37]/30 mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-[#996515] tracking-[0.2em] uppercase font-serif">
                    A Private Keepsake
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playMusicBoxChime();
                      setStage(3);
                    }}
                    className="px-5 py-2 rounded-lg text-xs font-serif tracking-[0.18em] uppercase font-medium text-[#fdf6e2] bg-[#3a0810] border border-[#d4af37]/70 shadow-sm hover:bg-[#4d0b17] active:scale-95 transition-all"
                  >
                    เปิดกล่องดนตรี
                  </button>
                </div>
              </div>

              {/* Vintage Polaroid Photo Frame */}
              <div className="w-full lg:w-[340px] flex flex-col items-center">
                <div
                  className="relative p-3.5 pb-6 bg-[#fdfbf7] rounded-lg shadow-[0_15px_35px_rgba(0,0,0,0.55)] border border-[#e5d8b8] w-full max-w-[320px] rotate-1 hover:rotate-0 transition-transform duration-300"
                  style={{
                    boxShadow: "0 15px 35px rgba(0,0,0,0.55)",
                  }}
                >
                  {/* Gold Washi Tape on top */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#d4af37]/80 rounded-sm shadow-sm backdrop-blur-sm -rotate-2" />

                  {/* Photo Canvas */}
                  <div
                    onClick={(e) => {
                      if (onSelectField) {
                        e.stopPropagation();
                        onSelectField(4, "field-wax-photos");
                      }
                    }}
                    title={
                      onSelectField
                        ? "คลิกเพื่อแก้ไขรูปภาพ (แท็บ 4)"
                        : undefined
                    }
                    className={`relative aspect-[4/3] w-full overflow-hidden rounded bg-[#1e0a10] border border-[#d4af37]/30 transition-all ${
                      onSelectField
                        ? "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:ring-dashed"
                        : ""
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.photos[photoIndex]}
                      alt="Memory"
                      className="w-full h-full object-cover filter contrast-[1.08] sepia-[0.15]"
                    />
                    <div className="absolute bottom-1 right-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-amber-200/90 font-mono tracking-wider">
                      {photoIndex + 1} / {data.photos.length}
                    </div>
                  </div>

                  {/* Photo Caption */}
                  <div
                    onClick={(e) => {
                      if (onSelectField) {
                        e.stopPropagation();
                        onSelectField(4, "field-wax-photo-caption");
                      }
                    }}
                    title={
                      onSelectField
                        ? "คลิกเพื่อแก้ไขคำบรรยายภาพ (แท็บ 4)"
                        : undefined
                    }
                    className={`mt-3 text-center px-2 py-1 transition-all rounded ${
                      onSelectField
                        ? "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:ring-dashed"
                        : ""
                    }`}
                  >
                    <p className="text-xs font-serif italic text-[#3a0810] truncate">
                      {data.photoCaption}
                    </p>
                  </div>

                  {/* Polaroid Navigation Controls (Minimal, No Emojis) */}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#d4af37]/30">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playMusicBoxChime(523.25);
                        setPhotoIndex((prev) =>
                          prev > 0 ? prev - 1 : data.photos.length - 1
                        );
                      }}
                      className="flex-1 py-1 text-[11px] tracking-wider uppercase text-[#78350f] font-serif border border-[#d4af37]/40 rounded hover:bg-amber-100/40 transition-colors"
                    >
                      ก่อนหน้า
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playMusicBoxChime(783.99);
                        setPhotoIndex((prev) =>
                          prev < data.photos.length - 1 ? prev + 1 : 0
                        );
                      }}
                      className="flex-1 py-1 text-[11px] tracking-wider uppercase text-[#78350f] font-serif border border-[#d4af37]/40 rounded hover:bg-amber-100/40 transition-colors"
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STAGE 3: MUSIC BOX & ROYAL FINALE CELEBRATION */}
          {/* ========================================================= */}
          {stage === 3 && (
            <motion.div
              key="stage-3-finale"
              initial={{ scale: 0.92, opacity: 0, y: 25 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="w-full max-w-xl flex flex-col items-center gap-6 my-auto"
            >
              {/* Antique Brass Music Player (Collectible Keepsake, No Emojis) */}
              <div
                className="relative w-full max-w-[440px] rounded-2xl p-5 border border-[#d4af37]/80 shadow-[0_20px_45px_rgba(0,0,0,0.7)] flex items-center gap-5 text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #2b0b14 0%, #150308 100%)",
                  boxShadow: "0 0 20px rgba(212,175,55,0.2)",
                }}
              >
                {/* Revolving Antique Brass Vinyl Disc with Sound Grooves */}
                <motion.div
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={{
                    duration: 8,
                    repeat: isPlaying ? Infinity : 0,
                    ease: "linear",
                  }}
                  className="relative w-20 h-20 shrink-0 rounded-full flex items-center justify-center border-2 border-[#d4af37]/80 shadow-lg"
                  style={{
                    background:
                      "radial-gradient(circle, #ffe082 0%, #c59b27 40%, #785210 75%, #3a2205 100%)",
                    boxShadow: "0 0 16px rgba(212,175,55,0.25)",
                  }}
                >
                  {/* Concentric subtle sound grooves */}
                  <div className="absolute inset-2 rounded-full border border-black/25 pointer-events-none" />
                  <div className="absolute inset-4 rounded-full border border-black/20 pointer-events-none" />
                  <div className="absolute inset-6 rounded-full border border-black/15 pointer-events-none" />
                  {/* Center Brass Spindle Point (Strictly No Emoji) */}
                  <div className="w-4 h-4 rounded-full bg-[#16050b] border-2 border-[#d4af37] shadow-inner" />
                </motion.div>

                {/* Track Info & Minimal SVG Controls */}
                <div className="flex-1 overflow-hidden space-y-1.5">
                  <div
                    onClick={(e) => {
                      if (onSelectField) {
                        e.stopPropagation();
                        onSelectField(5, "field-wax-song-title");
                      }
                    }}
                    title={
                      onSelectField
                        ? "คลิกเพื่อแก้ไขชื่อเพลง (แท็บ 5)"
                        : undefined
                    }
                    className={`transition-all rounded p-1 ${
                      onSelectField
                        ? "cursor-pointer hover:ring-1 hover:ring-amber-400 hover:ring-dashed"
                        : ""
                    }`}
                  >
                    <p className="text-[9px] uppercase tracking-[0.25em] text-[#d4af37]/80 font-medium">
                      ANTIQUE KEEPSAKE
                    </p>
                    <h3 className="text-base font-serif font-normal tracking-wide text-[#fdf6e2] truncate">
                      {data.songTitle}
                    </h3>
                    <p className="text-xs text-[#d4af37]/70 tracking-wider truncate font-serif italic">
                      {data.songArtist}
                    </p>
                  </div>

                  {/* Minimal Play / Pause SVG Control */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playMusicBoxChime(659.25);
                        setIsPlaying(!isPlaying);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-serif tracking-wider uppercase bg-[#16050b]/80 text-[#f4e8c1] border border-[#d4af37]/60 hover:bg-[#2b0813] active:scale-95 transition-all"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3 h-3 text-[#d4af37]" />
                          <span>พักบทเพลง</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 text-[#d4af37] fill-[#d4af37]" />
                          <span>เล่นบทเพลง</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Royal Finale Parchment Card (Strictly No Emojis) */}
              <div
                className="relative w-full max-w-[480px] rounded-2xl p-6 md:p-8 text-center space-y-4 shadow-[0_25px_50px_rgba(0,0,0,0.6)]"
                style={{
                  backgroundColor: "#fcf9f2",
                  backgroundImage: `
                    radial-gradient(circle at 50% 50%, rgba(255,255,255,0.85) 0%, rgba(245,237,219,0.95) 100%)
                  `,
                  border: "2px solid #d4af37",
                  boxShadow:
                    "0 0 25px rgba(212,175,55,0.2), 0 20px 45px rgba(0,0,0,0.6)",
                }}
              >
                {/* Editorial Gold Line Divider (Replacing Emojis) */}
                <div className="w-16 h-px bg-[#d4af37]/60 mx-auto" />

                <div
                  onClick={(e) => {
                    if (onSelectField) {
                      e.stopPropagation();
                      onSelectField(7, "field-wax-finale-message");
                    }
                  }}
                  title={
                    onSelectField
                      ? "คลิกเพื่อแก้ไขข้อความฉลองสุดท้าย (แท็บ 7)"
                      : undefined
                  }
                  className={`space-y-3 p-2 transition-all rounded ${
                    onSelectField
                      ? "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:ring-dashed"
                      : ""
                  }`}
                >
                  <h2 className="text-xl md:text-2xl font-serif text-[#3a0810] tracking-[0.2em] uppercase font-normal">
                    {data.finaleTitle}
                  </h2>
                  <p className="text-sm md:text-base text-[#2b1810] font-serif leading-loose whitespace-pre-line">
                    {data.finaleSubText}
                  </p>
                </div>

                <div className="w-12 h-px bg-[#d4af37]/40 mx-auto mt-2" />

                {/* Minimal Luxury Buttons (No Emojis, No Technical Parentheses) */}
                <div className="flex items-center justify-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      playRoyalArpeggio();
                      fireGoldenConfetti({ particleCount: 80, spread: 70 });
                    }}
                    className="px-5 py-2.5 rounded-lg text-xs font-serif tracking-[0.18em] uppercase text-[#fdf6e2] bg-[#3a0810] border border-[#d4af37]/70 shadow-md hover:bg-[#4d0b17] active:scale-95 transition-all"
                  >
                    เก็บความทรงจำนี้ไว้
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playPaperRustle();
                      setStage(1);
                      setIsSealBroken(false);
                    }}
                    className="px-4 py-2.5 rounded-lg text-xs font-serif tracking-[0.15em] uppercase text-[#78350f] border border-[#d4af37]/60 hover:bg-[#fbf5e6] active:scale-95 transition-all"
                  >
                    เก็บใส่ซอง
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Elegant Vintage Bottom Footer Bar */}
      <footer className="relative z-20 w-full py-2.5 px-4 flex items-center justify-between text-[11px] text-amber-200/70 border-t border-[#d4af37]/30 bg-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]/70 inline-block" />
          <span className="tracking-wider uppercase font-serif">Vintage Wax Seal &amp; Royal Parchment</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStage((prev) => ((prev % 3 + 1) as 1 | 2 | 3))}
            className="hover:text-amber-200 transition-colors cursor-pointer tracking-wider"
          >
            {stage === 1
              ? "ฉาก 1: ตราประทับครั่ง"
              : stage === 2
              ? "ฉาก 2: จดหมายและภาพถ่าย"
              : "ฉาก 3: กล่องดนตรีและฉลอง"}
          </button>
        </div>
      </footer>
    </div>
  );
}
