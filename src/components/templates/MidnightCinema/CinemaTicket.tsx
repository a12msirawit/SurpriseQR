"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playPaperTear } from "./audio";

interface CinemaTicketProps {
  movieTitle: string;
  screeningDate?: string;
  screeningTime?: string;
  theaterHall?: string;
  seatNumber?: string;
  admitCount?: string;
  isTorn: boolean;
  onTear: () => void;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

/**
 * Authentic Vintage 35mm Cinema Ticket Stub.
 * Zero Emoji Policy — strictly typography, authentic perforation, and vector barcode.
 */
export default function CinemaTicket({
  movieTitle,
  screeningDate = "14 FEB 2026",
  screeningTime = "23:45",
  theaterHall = "SCREEN 01",
  seatNumber = "ROW A - 07 & 08",
  admitCount = "ADMIT ONE",
  isTorn,
  onTear,
  onSelectField,
}: CinemaTicketProps) {
  const [isTearing, setIsTearing] = useState(false);

  const handleTear = () => {
    if (isTorn || isTearing) return;
    setIsTearing(true);
    playPaperTear();
    setTimeout(() => {
      onTear();
    }, 600);
  };

  return (
    <div className="relative mx-auto w-full max-w-xl select-none px-4 py-8">
      {/* Outer Glow / Ambient Cinema Stage */}
      <div className="relative flex flex-col items-center">
        {/* Ticket Container */}
        <div className="relative flex w-full flex-col sm:flex-row items-stretch justify-center drop-shadow-[0_25px_35px_rgba(0,0,0,0.85)]">
          {/* Left Section: Ticket Stub (Torn off on tear) */}
          <motion.div
            animate={
              isTorn || isTearing
                ? {
                    x: -24,
                    y: 16,
                    rotate: -4,
                    opacity: 0.9,
                    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                  }
                : { x: 0, y: 0, rotate: 0 }
            }
            onClick={() => onSelectField?.(1, "field-cinema-ticket-info")}
            className="relative flex flex-col justify-between rounded-t-2xl sm:rounded-tr-none sm:rounded-l-2xl bg-[#f5f2eb] p-5 text-neutral-900 border border-neutral-300/80 shadow-inner sm:w-44 shrink-0 overflow-hidden cursor-pointer group"
          >
            {/* Subtle vintage paper texture gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 via-transparent to-stone-200/50 pointer-events-none" />

            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between border-b border-neutral-300 pb-2">
                <span className="font-mono text-[10px] tracking-widest text-neutral-500 uppercase">
                  STUB
                </span>
                <span className="font-mono text-[10px] font-bold text-neutral-700">
                  #35MM
                </span>
              </div>
              <p className="font-mono text-xs font-black tracking-wider text-neutral-800">
                {theaterHall}
              </p>
              <p className="font-mono text-sm font-black text-red-900 tracking-tight">
                {seatNumber}
              </p>
            </div>

            <div className="relative z-10 my-4 space-y-1 border-t border-neutral-300 pt-3">
              <p className="font-mono text-[10px] text-neutral-500 uppercase">DATE / TIME</p>
              <p className="font-mono text-xs font-bold text-neutral-800">{screeningDate}</p>
              <p className="font-mono text-xs font-bold text-neutral-800">{screeningTime}</p>
            </div>

            <div className="relative z-10 border-t border-dashed border-neutral-400 pt-2">
              <span className="block text-center font-serif text-[11px] font-black tracking-widest text-neutral-800 uppercase">
                {admitCount}
              </span>
            </div>

            {/* Top & Bottom Semi-Circle Punch Notches along the perforation */}
            <div className="hidden sm:block absolute -right-3 top-0 h-6 w-6 rounded-full bg-[#090a0f] border border-neutral-800" />
            <div className="hidden sm:block absolute -right-3 bottom-0 h-6 w-6 rounded-full bg-[#090a0f] border border-neutral-800" />
          </motion.div>

          {/* Perforation Line (Dashed divider on desktop) */}
          <div className="relative hidden sm:flex w-0 items-center justify-center z-20">
            <div className="h-full border-r-2 border-dashed border-neutral-400/80" />
          </div>

          {/* Right Section: Main Ticket Body */}
          <motion.div
            animate={
              isTorn || isTearing
                ? {
                    x: 18,
                    y: -8,
                    rotate: 1.5,
                    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                  }
                : { x: 0, y: 0, rotate: 0 }
            }
            onClick={() => onSelectField?.(1, "field-cinema-movie-title")}
            className="relative flex flex-1 flex-col justify-between rounded-b-2xl sm:rounded-bl-none sm:rounded-r-2xl bg-[#f5f2eb] p-6 text-neutral-900 border border-neutral-300/80 shadow-inner overflow-hidden cursor-pointer group"
          >
            {/* Vintage paper texture */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 via-transparent to-stone-200/50 pointer-events-none" />

            {/* Left Top & Bottom Notches matching stub */}
            <div className="hidden sm:block absolute -left-3 top-0 h-6 w-6 rounded-full bg-[#090a0f] border border-neutral-800" />
            <div className="hidden sm:block absolute -left-3 bottom-0 h-6 w-6 rounded-full bg-[#090a0f] border border-neutral-800" />

            {/* Header info */}
            <div className="relative z-10 flex items-center justify-between border-b border-neutral-300 pb-3">
              <div>
                <p className="font-mono text-[10px] tracking-[0.25em] text-neutral-500 uppercase">
                  MIDNIGHT CINEMA NOIR
                </p>
                <p className="font-serif text-xs font-semibold tracking-wider text-neutral-700">
                  EXCLUSIVE PRIVATE SCREENING
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block rounded border border-neutral-400 bg-neutral-100 px-2 py-0.5 font-mono text-[11px] font-bold text-neutral-700">
                  35MM
                </span>
              </div>
            </div>

            {/* Main Title Centerpiece */}
            <div className="relative z-10 my-6 text-center">
              <p className="font-mono text-[10px] tracking-[0.3em] text-amber-800 uppercase font-semibold">
                NOW SHOWING
              </p>
              <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 uppercase">
                {movieTitle || "THE STORY OF US"}
              </h1>
              <div className="mt-2 flex items-center justify-center gap-3 text-xs font-mono text-neutral-600">
                <span>{theaterHall}</span>
                <span>•</span>
                <span>{seatNumber}</span>
              </div>
            </div>

            {/* Footer with classic barcode & perforated instructions */}
            <div className="relative z-10 flex flex-wrap items-end justify-between border-t border-neutral-300 pt-4 gap-3">
              {/* Authentic Barcode SVG */}
              <div className="space-y-1">
                <svg
                  className="h-8 w-36 text-neutral-800"
                  viewBox="0 0 120 30"
                  fill="currentColor"
                  aria-label="Cinema Barcode"
                >
                  <rect x="0" y="0" width="3" height="30" />
                  <rect x="5" y="0" width="1" height="30" />
                  <rect x="8" y="0" width="4" height="30" />
                  <rect x="14" y="0" width="2" height="30" />
                  <rect x="18" y="0" width="1" height="30" />
                  <rect x="21" y="0" width="3" height="30" />
                  <rect x="26" y="0" width="2" height="30" />
                  <rect x="30" y="0" width="5" height="30" />
                  <rect x="37" y="0" width="1" height="30" />
                  <rect x="40" y="0" width="3" height="30" />
                  <rect x="45" y="0" width="2" height="30" />
                  <rect x="49" y="0" width="4" height="30" />
                  <rect x="55" y="0" width="1" height="30" />
                  <rect x="58" y="0" width="3" height="30" />
                  <rect x="63" y="0" width="2" height="30" />
                  <rect x="67" y="0" width="5" height="30" />
                  <rect x="74" y="0" width="1" height="30" />
                  <rect x="77" y="0" width="4" height="30" />
                  <rect x="83" y="0" width="2" height="30" />
                  <rect x="87" y="0" width="1" height="30" />
                  <rect x="90" y="0" width="4" height="30" />
                  <rect x="96" y="0" width="2" height="30" />
                  <rect x="100" y="0" width="3" height="30" />
                  <rect x="105" y="0" width="2" height="30" />
                  <rect x="110" y="0" width="4" height="30" />
                  <rect x="116" y="0" width="2" height="30" />
                </svg>
                <p className="font-mono text-[9px] tracking-widest text-neutral-500">
                  98234-87123-019
                </p>
              </div>

              <div className="text-right">
                <span className="font-serif text-sm font-black tracking-widest text-neutral-900 uppercase">
                  {admitCount}
                </span>
                <p className="font-mono text-[9px] text-neutral-500">NON-REFUNDABLE</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Action Button: "ฉีกตั๋ว" */}
        <AnimatePresence>
          {!isTorn && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-8 flex flex-col items-center gap-3"
            >
              <button
                type="button"
                onClick={handleTear}
                disabled={isTearing}
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-amber-400/40 bg-gradient-to-b from-neutral-800 to-neutral-950 px-8 py-3.5 font-serif text-sm font-bold tracking-widest text-amber-200 shadow-xl transition-all duration-300 hover:border-amber-300 hover:text-white hover:shadow-amber-500/10 active:scale-95 disabled:opacity-50"
              >
                <span className="relative z-10 uppercase tracking-widest">
                  {isTearing ? "กำลังฉีกตั๋ว..." : "ฉีกตั๋ว"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-amber-200/20 to-amber-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </button>
              <p className="font-mono text-[11px] tracking-wider text-neutral-400">
                แตะเพื่อฉีกตั๋วและเปิดม่านการฉาย
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

