"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { MailOpen, Sparkles, Wand2 } from "lucide-react";

interface MysteryBatEnvelopeProps {
  isOpen: boolean;
  studio?: boolean;
  mainWishTitle: string;
  mainWishMessage: string;
  onOpenEnvelope: (originX: number, originY: number) => void;
  onReplayBats: (originX: number, originY: number) => void;
  titleEditableProps?: React.HTMLAttributes<HTMLHeadingElement>;
  messageEditableProps?: React.HTMLAttributes<HTMLParagraphElement>;
}

/**
 * Interactive Halloween wax-sealed mystery envelope found mid-scroll.
 * Tapping breaks the glowing bat crest seal, flips the upper flap open,
 * unleashes a viewport-wide flock of bats from the envelope mouth, and
 * reveals the hidden Halloween wish letter inside.
 */
export default function MysteryBatEnvelope({
  isOpen,
  studio = false,
  mainWishTitle,
  mainWishMessage,
  onOpenEnvelope,
  onReplayBats,
  titleEditableProps,
  messageEditableProps,
}: MysteryBatEnvelopeProps) {
  const [hoverSeal, setHoverSeal] = useState(false);

  const handleTrigger = (e: React.MouseEvent<HTMLElement>, replayOnly = false) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const ox = rect.left + rect.width * 0.5;
    const oy = rect.top + rect.height * 0.35;
    if (replayOnly) {
      onReplayBats(ox, oy);
    } else {
      onOpenEnvelope(ox, oy);
    }
  };

  const openEffective = isOpen || studio;

  return (
    <div className="relative flex w-full flex-col items-center">
      {/* Closed Mysterious Wax-Sealed Envelope View */}
      {!openEffective ? (
        <button
          type="button"
          onClick={(e) => handleTrigger(e, false)}
          onMouseEnter={() => setHoverSeal(true)}
          onMouseLeave={() => setHoverSeal(false)}
          className="group relative flex w-full max-w-md flex-col items-center overflow-hidden rounded-[2rem] border border-orange-400/45 bg-gradient-to-b from-[#200c3b] via-[#130624] to-[#0b0317] p-6 text-center shadow-[0_24px_75px_rgba(0,0,0,0.8)] transition duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          {/* Decorative Diagonal Envelope Flap Seam */}
          <svg
            viewBox="0 0 400 180"
            className="pointer-events-none absolute inset-x-0 top-0 h-36 w-full opacity-55"
            preserveAspectRatio="none"
          >
            <polygon
              points="0,0 400,0 200,145"
              fill="#2e1065"
              stroke="#fbbf24"
              strokeOpacity="0.45"
              strokeWidth="2"
            />
          </svg>

          <span className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-amber-300/35 bg-black/50 px-3 py-1 text-[10px] font-bold tracking-[0.22em] text-amber-200 uppercase backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-orange-300" />
            <span>พบซองจดหมายลึกลับแล้ว!</span>
          </span>

          {/* Glowing Bat Wax Seal */}
          <div
            className={`relative z-10 mt-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-300/75 bg-gradient-to-br from-orange-600 via-rose-700 to-purple-900 shadow-[0_0_32px_rgba(249,115,22,0.55)] transition-transform duration-300 ${
              hoverSeal ? "scale-110 rotate-6" : "animate-pulse"
            }`}
          >
            <svg viewBox="0 0 64 40" className="h-10 w-12" aria-hidden="true">
              <path
                d="M32 22 C28 16, 16 6, 4 16 C12 20, 14 28, 22 25 C26 24, 29 30, 32 32 C35 30, 38 24, 42 25 C50 28, 52 20, 60 16 C48 6, 36 16, 32 22 Z"
                fill="#fef3c7"
              />
              <circle cx="29" cy="19" r="1.4" fill="#1e1b4b" />
              <circle cx="35" cy="19" r="1.4" fill="#1e1b4b" />
            </svg>
          </div>

          <h3 className="relative z-10 mt-5 text-base font-extrabold text-amber-100 sm:text-lg">
            ซองจดหมายประทับตราค้างคาว
          </h3>
          <p className="relative z-10 mt-1.5 text-xs text-purple-200/85">
            แตะเปิดซองเพื่ออ่านสาส์นอวยพรที่ซ่อนอยู่ด้านใน
          </p>
        </button>
      ) : (
        /* Opened Envelope + Sliding Inner Greeting Parchment + Replay Bats */
        <motion.div
          initial={studio ? false : { opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full overflow-hidden rounded-[2rem] border border-amber-300/40 bg-gradient-to-b from-[#1e0b36]/95 via-[#130624]/95 to-[#090212]/95 p-5 shadow-[0_26px_80px_rgba(0,0,0,0.85)] sm:p-6"
        >
          {/* Open Envelope Flap Header */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-purple-300/20 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-amber-200 uppercase">
              <MailOpen className="h-4 w-4 text-orange-400" />
              <span>สาส์นลับจากซองจดหมายฮาโลวีน</span>
            </div>
            {!studio && (
              <button
                type="button"
                onClick={(e) => handleTrigger(e, true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-purple-300/40 bg-purple-500/20 px-3 py-1 text-[11px] font-semibold text-purple-100 transition hover:bg-purple-500/35"
              >
                <Wand2 className="h-3 w-3 text-amber-300" />
                <span>ปล่อยฝูงค้างคาวอีกครั้ง</span>
              </button>
            )}
          </div>

          {/* Inner Parchment Message */}
          <div className="rounded-2xl border border-amber-200/20 bg-black/35 p-4 text-left sm:p-5">
            <h2
              {...titleEditableProps}
              className={`text-lg font-extrabold text-amber-200 sm:text-xl ${
                titleEditableProps?.onClick ? "cursor-pointer hover:underline" : ""
              }`}
            >
              {mainWishTitle}
            </h2>
            <p
              {...messageEditableProps}
              className={`mt-2.5 whitespace-pre-line text-xs leading-relaxed text-slate-100 sm:text-sm ${
                messageEditableProps?.onClick
                  ? "cursor-pointer rounded-xl p-1.5 hover:bg-white/5"
                  : ""
              }`}
            >
              {mainWishMessage}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

