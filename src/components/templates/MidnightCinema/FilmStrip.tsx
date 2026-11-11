"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { playFilmClick } from "./audio";

export interface FilmFrameItem {
  src: string;
  sceneTag?: string;
  caption?: string;
}

interface FilmStripProps {
  frames: FilmFrameItem[];
  sectionTitle?: string;
  description?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

/**
 * Authentic 35mm Film Ribbon with Sprocket Holes and Frame Progression.
 * Zero Emoji Policy — strictly screenplay typography and minimal cinema controls.
 */
export default function FilmStrip({
  frames,
  sectionTitle = "THE 35MM MEMORIES",
  description = "บันทึกช่วงเวลาที่งดงามผ่านม้วนฟิล์ม 35 มม.",
  onSelectField,
}: FilmStripProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const displayFrames =
    frames && frames.length > 0
      ? frames
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

  const handleNext = () => {
    if (activeIndex < displayFrames.length - 1) {
      playFilmClick();
      setActiveIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      playFilmClick();
      setActiveIndex((prev) => prev - 1);
    }
  };

  const handleSelect = (idx: number) => {
    if (idx !== activeIndex) {
      playFilmClick();
      setActiveIndex(idx);
    }
  };

  // Helper to render authentic sprocket holes
  const renderSprockets = (count = 14) => (
    <div className="flex w-full items-center justify-between px-2 py-1.5 bg-[#050608] border-b border-white/5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-3 w-2 sm:h-3.5 sm:w-2.5 rounded-[2px] bg-[#090a0f] border border-neutral-700/60 shadow-inner"
        />
      ))}
    </div>
  );

  return (
    <section className="relative mx-auto w-full max-w-2xl px-4 py-6">
      {/* Section Header */}
      <div
        onClick={() => onSelectField?.(3, "field-cinema-memories-title")}
        className="mb-6 text-center cursor-pointer group"
      >
        <p className="font-mono text-[10px] tracking-[0.3em] text-amber-500/80 uppercase">
          REEL NO. 01 • 35MM
        </p>
        <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
          {sectionTitle}
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-neutral-400 font-sans max-w-md mx-auto">
          {description}
        </p>
      </div>

      {/* 35mm Film Strip Reel Container */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#07080c] shadow-2xl shadow-black/90">
        {/* Top Sprocket Holes Bar */}
        {renderSprockets(16)}

        {/* Film Metadata Label Bar */}
        <div className="flex items-center justify-between px-4 py-1 bg-[#090a0f] text-[9px] font-mono text-neutral-500 uppercase border-b border-white/5 tracking-widest">
          <span>KODAK SAFETY FILM 400</span>
          <span>FRAME #{String(activeIndex + 1).padStart(2, "0")} / {String(displayFrames.length).padStart(2, "0")}</span>
          <span>35MM EXPOSURE</span>
        </div>

        {/* Current Active Frame Spotlight Display */}
        <div
          onClick={() => onSelectField?.(3, `field-cinema-photo-${activeIndex}`)}
          className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-[#0a0c12] cursor-pointer overflow-hidden group"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.03 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="relative h-full w-full"
            >
              {displayFrames[activeIndex]?.src ? (
                <Image
                  src={displayFrames[activeIndex].src}
                  alt={displayFrames[activeIndex].caption || "Film Frame"}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-neutral-500 font-mono text-xs">
                  FRAME #{String(activeIndex + 1).padStart(2, "0")} EMPTY
                </div>
              )}

              {/* Cinematic Vignette on Frame */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />

              {/* Frame Number Tag on top-left of image */}
              <div className="absolute top-3 left-3 z-10 rounded border border-white/20 bg-black/60 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-200 backdrop-blur-sm">
                #{String(activeIndex + 1).padStart(2, "0")}
              </div>

              {/* Screenplay Scene Caption Overlay on bottom */}
              <div className="absolute bottom-0 inset-x-0 p-4 z-10">
                <p className="font-mono text-[10px] tracking-widest text-amber-400 uppercase font-semibold">
                  {displayFrames[activeIndex]?.sceneTag || `SCENE ${String(activeIndex + 1).padStart(2, "0")}`}
                </p>
                <p className="mt-1 font-serif text-sm sm:text-base font-medium text-neutral-100 leading-snug">
                  {displayFrames[activeIndex]?.caption || "ช่วงเวลาที่ไม่มีวันเลือนหาย"}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Film Metadata Label Bar */}
        <div className="flex items-center justify-between px-4 py-1 bg-[#090a0f] text-[9px] font-mono text-neutral-500 uppercase border-t border-white/5 tracking-widest">
          <span>EASTMAN 5207</span>
          <span>ASPECT 1.85:1</span>
          <span>ISO 500T</span>
        </div>

        {/* Bottom Sprocket Holes Bar */}
        {renderSprockets(16)}
      </div>

      {/* Film Navigation Controls (Minimalist & Zero Emoji) */}
      <div className="mt-5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handlePrev}
          disabled={activeIndex === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-700/80 bg-neutral-900/90 px-4 py-2 font-mono text-xs font-semibold text-neutral-300 transition-colors hover:border-amber-400/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span>←</span>
          <span>ก่อนหน้า</span>
        </button>

        {/* Frame Dots Indicator */}
        <div className="flex items-center gap-1.5">
          {displayFrames.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-6 bg-amber-400"
                  : "w-2 bg-neutral-700 hover:bg-neutral-500"
              }`}
              aria-label={`ไปยังเฟรมที่ ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={activeIndex === displayFrames.length - 1}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-700/80 bg-neutral-900/90 px-4 py-2 font-mono text-xs font-semibold text-neutral-300 transition-colors hover:border-amber-400/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span>ถัดไป</span>
          <span>→</span>
        </button>
      </div>
    </section>
  );
}

