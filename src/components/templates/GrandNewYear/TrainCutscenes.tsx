"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";

export type CutsceneType =
  | null
  | "departure"
  | "photo-reveal"
  | "doors"
  | "gift-burst"
  | "midnight-countdown";

interface TrainCutscenesProps {
  active: CutsceneType;
  countdownNum: number; // 3 -> 2 -> 1 -> 0 (midnight)
  originYear: string;
  targetYear: string;
  recipientName: string;
  trainHeading?: string;
  trainSubheading?: string;
  photo1Url?: string;
  photo1Caption?: string;
}

const BURST_RAYS = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  angle: (360 / 16) * i,
  length: 95 + (i % 3) * 44,
}));

const GIFT_SPARKLES = Array.from({ length: 24 }, (_, i) => {
  const rad = (Math.PI * 2 * i) / 24 + (i % 3) * 0.12;
  const dist = 100 + (i % 4) * 40;
  return {
    id: i,
    x: Math.cos(rad) * dist,
    y: Math.sin(rad) * dist,
    size: 5 + (i % 4) * 2,
    color: ["#FDE68A", "#F59E0B", "#FB7185", "#FFFBEB", "#93C5FD"][i % 5],
    rotate: (i % 2 === 0 ? 1 : -1) * (120 + i * 20),
  };
});

/**
 * Full-screen slow, suspenseful cinematic cutscenes for Midnight Time Train:
 * 1. "departure" (~3.7s): Slow steam locomotive gliding across starlit viaduct
 * 2. "photo-reveal" (~3.5s): Slow breathless 3D flip revealing the mystery floating photo
 * 3. "doors" (~2.6s): Ornate brass & velvet cabin doors slowly parting to golden light
 * 4. "gift-burst" (~2.5s): Suspenseful charge -> slow-mo flying lid & starburst explosion
 * 5. "midnight-countdown" (~4.6s): Slow heartbeat countdown 3... 2... 1... 00:00 {targetYear}
 */
export default function TrainCutscenes({
  active,
  countdownNum,
  originYear,
  targetYear,
  recipientName,
  trainHeading,
  trainSubheading,
  photo1Url,
  photo1Caption,
}: TrainCutscenesProps) {
  const showLetterbox =
    active === "departure" ||
    active === "photo-reveal" ||
    active === "doors" ||
    active === "midnight-countdown";

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={`cutscene-${active}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="pointer-events-auto absolute inset-0 z-40 overflow-hidden"
        >
          {/* Slow Cinematic Letterbox Bars */}
          {showLetterbox && (
            <>
              <motion.div
                initial={{ y: -56 }}
                animate={{ y: 0 }}
                exit={{ y: -56 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute inset-x-0 top-0 z-50 h-12 bg-black/94 shadow-[0_10px_28px_rgba(0,0,0,0.85)]"
              />
              <motion.div
                initial={{ y: 56 }}
                animate={{ y: 0 }}
                exit={{ y: 56 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute inset-x-0 bottom-0 z-50 h-12 bg-black/94 shadow-[0_-10px_28px_rgba(0,0,0,0.85)]"
              />
            </>
          )}

          {/* ==================== CUTSCENE 1: SLOW MIDNIGHT EXPRESS DEPARTURE ==================== */}
          {active === "departure" && (
            <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#050817]/90 backdrop-blur-[2px]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_28%,rgba(251,191,36,0.22)_0%,rgba(30,27,75,0.45)_45%,rgba(5,7,18,0.96)_100%)]" />
              <motion.div
                initial={{ scale: 0.72, opacity: 0 }}
                animate={{ scale: 1.04, opacity: 0.95 }}
                transition={{ duration: 1.8, ease: "easeOut" }}
                className="pointer-events-none absolute top-20 right-10 h-16 w-16 rounded-full bg-[radial-gradient(circle_at_35%_35%,#FFFBEB_0%,#FDE68A_55%,rgba(245,158,11,0.1)_100%)] shadow-[0_0_50px_rgba(253,224,71,0.55)]"
              />

              {/* Slow Dramatic Title Fade */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: [0, 1, 1, 0], y: [16, 0, 0, -8] }}
                transition={{ duration: 3.1, times: [0, 0.22, 0.8, 1] }}
                className="relative z-20 mb-20 flex flex-col items-center px-4 text-center"
              >
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.22em] text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{trainHeading || "ขบวนเที่ยงคืนกำลังออกเดินทาง"}</span>
                </span>
                <p className="mt-2 text-2xl font-black tracking-wide text-amber-50">
                  {originYear} → {targetYear}
                </p>
                <p className="mt-1 text-xs text-amber-200/80">
                  {trainSubheading || `ยินดีต้อนรับคุณ ${recipientName}`}
                </p>
              </motion.div>

              {/* Glowing Golden Viaduct Bridge + Slow Majestic Express Train */}
              <div className="relative z-10 h-40 w-full overflow-hidden">
                <motion.div
                  initial={{ x: "-105%" }}
                  animate={{ x: "118%" }}
                  transition={{ duration: 3.2, ease: [0.3, 0.04, 0.58, 1] }}
                  className="absolute bottom-[54px] left-0 flex items-end"
                >
                  {/* Golden Steam Stardust Plume */}
                  <div className="pointer-events-none absolute -top-9 right-20 flex gap-2">
                    {[0, 1, 2, 3, 4].map((p) => (
                      <motion.span
                        key={p}
                        animate={{
                          y: [-2, -26 - p * 4],
                          x: [0, -22 - p * 8],
                          scale: [0.5, 1.65],
                          opacity: [0.85, 0],
                        }}
                        transition={{
                          duration: 1.05,
                          repeat: Infinity,
                          delay: p * 0.18,
                          ease: "easeOut",
                        }}
                        className="h-5 w-5 rounded-full bg-[radial-gradient(circle,rgba(254,243,199,0.88)_0%,rgba(251,191,36,0.2)_65%,transparent_100%)] blur-[2px]"
                      />
                    ))}
                  </div>

                  {/* Detailed Custom SVG Vintage Steam Locomotive & Golden Coaches */}
                  <svg
                    viewBox="0 0 360 72"
                    className="h-[68px] w-[340px] drop-shadow-[0_6px_18px_rgba(251,191,36,0.35)]"
                    fill="none"
                  >
                    <polygon
                      points="324,30 360,8 360,58"
                      fill="url(#headlampGrad)"
                      opacity="0.78"
                    />
                    <defs>
                      <linearGradient id="headlampGrad" x1="324" y1="33" x2="360" y2="33" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    <rect x="6" y="24" width="90" height="32" rx="4" fill="#1E1436" stroke="#FBBF24" strokeWidth="1.5" />
                    <path d="M4 24 Q51 17 98 24" fill="#2B1C4C" stroke="#FDE68A" strokeWidth="1.2" />
                    {[16, 33, 50, 67, 81].map((wx) => (
                      <rect key={wx} x={wx} y="30" width="10" height="12" rx="2" fill="#FDE68A" />
                    ))}
                    <circle cx="22" cy="59" r="5" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.8" />
                    <circle cx="80" cy="59" r="5" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.8" />

                    <rect x="96" y="45" width="10" height="4" fill="#F59E0B" />

                    <rect x="106" y="24" width="94" height="32" rx="4" fill="#23163D" stroke="#FBBF24" strokeWidth="1.5" />
                    <path d="M104 24 Q153 17 202 24" fill="#312054" stroke="#FDE68A" strokeWidth="1.2" />
                    {[116, 134, 152, 170, 185].map((wx) => (
                      <rect key={wx} x={wx} y="30" width="11" height="12" rx="2" fill="#FEF08A" />
                    ))}
                    <circle cx="122" cy="59" r="5" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.8" />
                    <circle cx="184" cy="59" r="5" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.8" />

                    <rect x="200" y="45" width="10" height="4" fill="#F59E0B" />

                    <rect x="210" y="18" width="38" height="38" rx="3" fill="#2A173E" stroke="#FBBF24" strokeWidth="1.6" />
                    <rect x="218" y="25" width="18" height="13" rx="2" fill="#FDE68A" />
                    <rect x="248" y="25" width="68" height="29" rx="5" fill="#18102A" stroke="#FBBF24" strokeWidth="1.8" />
                    <line x1="266" y1="25" x2="266" y2="54" stroke="#F59E0B" strokeWidth="2" />
                    <line x1="286" y1="25" x2="286" y2="54" stroke="#F59E0B" strokeWidth="2" />
                    <path d="M294 25 L291 10 L306 10 L303 25 Z" fill="#1C1330" stroke="#FDE68A" strokeWidth="1.5" />
                    <path d="M268 25 Q276 15 284 25 Z" fill="#F59E0B" />
                    <polygon points="316,44 330,56 316,56" fill="#F59E0B" />
                    <circle cx="318" cy="31" r="4" fill="#FFFBEB" />
                    <circle cx="230" cy="58" r="6.5" fill="#0F172A" stroke="#FDE68A" strokeWidth="2" />
                    <circle cx="262" cy="58" r="7.5" fill="#0F172A" stroke="#FDE68A" strokeWidth="2.2" />
                    <circle cx="284" cy="58" r="7.5" fill="#0F172A" stroke="#FDE68A" strokeWidth="2.2" />
                    <circle cx="305" cy="59" r="5" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.8" />
                    <line x1="262" y1="58" x2="284" y2="58" stroke="#FDE68A" strokeWidth="2" />
                  </svg>
                </motion.div>

                <div className="absolute inset-x-0 bottom-0 h-[56px]">
                  <div className="h-[3px] w-full bg-gradient-to-r from-amber-500/20 via-amber-300 to-amber-500/20 shadow-[0_0_12px_rgba(251,191,36,0.85)]" />
                  <svg viewBox="0 0 400 54" preserveAspectRatio="none" className="h-full w-full">
                    <path
                      d="M0 0 H400 V54 H370 V26 A22 22 0 0 0 326 26 V54 H286 V26 A22 22 0 0 0 242 26 V54 H202 V26 A22 22 0 0 0 158 26 V54 H118 V26 A22 22 0 0 0 74 26 V54 H34 V26 A22 22 0 0 0 0 26 Z"
                      fill="#0B0E21"
                      stroke="rgba(251,191,36,0.22)"
                      strokeWidth="1"
                    />
                  </svg>
                </div>
              </div>

              {/* Slow Golden Light Dissolve into Stage 2 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 0.9, 0] }}
                transition={{ duration: 3.6, times: [0, 0.78, 0.92, 1] }}
                className="pointer-events-none absolute inset-0 z-30 bg-[radial-gradient(circle,rgba(255,251,235,0.92)_0%,rgba(251,191,36,0.5)_45%,rgba(12,10,28,0.85)_100%)]"
              />
            </div>
          )}

          {/* ==================== CUTSCENE 2: SLOW SUSPENSEFUL MYSTERY PHOTO REVEAL ==================== */}
          {active === "photo-reveal" && (
            <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#040614]/88 backdrop-blur-sm">
              {/* Soft Cinematic Spotlight Halo Slowly Swelling */}
              <motion.div
                initial={{ opacity: 0, scale: 0.45 }}
                animate={{ opacity: [0, 0.55, 0.95, 0.4], scale: [0.45, 0.95, 1.35, 1.55] }}
                transition={{ duration: 3.35, ease: "easeInOut" }}
                className="pointer-events-none absolute h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(254,243,199,0.52)_0%,rgba(245,158,11,0.24)_45%,transparent_72%)] blur-2xl"
              />

              {/* Subtle Suspense Eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -6] }}
                transition={{ duration: 3.2, times: [0, 0.2, 0.78, 1] }}
                className="relative z-20 mb-5 flex items-center gap-1.5 text-xs font-semibold tracking-[0.22em] text-amber-200/90"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>ความทรงจำที่ซ่อนไว้กำลังปรากฏ...</span>
              </motion.div>

              {/* 3D Slow-Motion Suspenseful Polaroid Turn-Over */}
              <div style={{ perspective: 1200 }} className="relative z-20 w-[274px]">
                <motion.div
                  initial={{ rotateY: 180, scale: 0.76, y: 20 }}
                  animate={{
                    rotateY: [180, 180, 0],
                    scale: [0.76, 0.94, 1.04],
                    y: [20, 0, 0],
                  }}
                  transition={{
                    duration: 2.65,
                    times: [0, 0.34, 1],
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                  className="relative w-full"
                >
                  {/* Back (Mystery Sealed Side — shown during first 0.9s suspense build) */}
                  <div
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                    className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-amber-300/75 bg-gradient-to-b from-[#23183b] via-[#17112b] to-[#110c21] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(251,191,36,0.4)]"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-200/75 bg-amber-400/20 text-amber-200 shadow-[0_0_28px_rgba(253,224,71,0.7)]">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-amber-200/85">
                      ภาพความทรงจำลับ
                    </p>
                  </div>

                  {/* Front (Revealed Photo — emerges from soft dreamy mist into crystal focus!) */}
                  <div
                    style={{ backfaceVisibility: "hidden" }}
                    className="relative overflow-hidden rounded-2xl border border-amber-200/50 bg-[#fbf6ea] p-2.5 pb-4 text-slate-900 shadow-[0_24px_60px_rgba(0,0,0,0.85),0_0_45px_rgba(251,191,36,0.38)]"
                  >
                    <div className="relative mb-2.5 aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-900">
                      <motion.img
                        src={photo1Url || "/templates/galaxy-1.png"}
                        alt="ความทรงจำที่ซ่อนไว้"
                        initial={{ filter: "blur(14px) brightness(1.4)", scale: 1.12 }}
                        animate={{ filter: "blur(0px) brightness(1)", scale: 1 }}
                        transition={{ duration: 1.85, delay: 0.95, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full w-full object-cover"
                      />
                      {/* Sweeping golden reveal sheen */}
                      <motion.div
                        initial={{ x: "-140%" }}
                        animate={{ x: "230%" }}
                        transition={{ duration: 1.35, delay: 1.5, ease: "easeInOut" }}
                        className="pointer-events-none absolute inset-y-0 w-20 -skew-x-12 bg-gradient-to-r from-transparent via-amber-100/60 to-transparent"
                      />
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.9, delay: 1.75 }}
                      className="px-1 text-center text-xs font-medium leading-snug text-slate-700"
                    >
                      {photo1Caption}
                    </motion.p>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {/* ==================== CUTSCENE 3: SLOW ORNATE CABIN SLIDING DOORS ==================== */}
          {active === "doors" && (
            <div className="relative flex h-full w-full items-center justify-center bg-[#090612]/72">
              <motion.div
                initial={{ opacity: 0.15, scale: 0.55 }}
                animate={{ opacity: [0.15, 0.95, 1], scale: [0.55, 1.3, 1.75] }}
                transition={{ duration: 2.35, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <div className="h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(254,243,199,0.85)_0%,rgba(245,158,11,0.35)_45%,transparent_75%)] blur-xl" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.08, 1.18, 1.45] }}
                transition={{ duration: 2.35, times: [0, 0.35, 0.72, 1] }}
                className="relative z-10 flex flex-col items-center text-amber-200"
              >
                <Gift className="h-12 w-12 drop-shadow-[0_0_24px_rgba(253,224,71,0.95)]" />
                <span className="mt-2 text-xs font-semibold tracking-[0.22em] text-amber-100">
                  ตู้เสบียงของขวัญ
                </span>
              </motion.div>

              {/* Left Ornate Door — dramatic pause before slowly gliding open */}
              <motion.div
                initial={{ x: "0%" }}
                animate={{ x: "-106%" }}
                transition={{ duration: 1.75, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-0 left-0 z-20 flex w-1/2 items-center justify-end border-r-2 border-amber-300/75 bg-gradient-to-r from-[#1a0d24] via-[#261233] to-[#321740] pr-3 shadow-[10px_0_35px_rgba(0,0,0,0.85)]"
              >
                <div className="h-[68%] w-[78%] rounded-xl border border-amber-300/30 bg-[#12091b]/55 p-3">
                  <div className="h-full w-full rounded-lg border border-amber-300/20" />
                </div>
                <span className="ml-2 h-14 w-1.5 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.75)]" />
              </motion.div>

              {/* Right Ornate Door */}
              <motion.div
                initial={{ x: "0%" }}
                animate={{ x: "106%" }}
                transition={{ duration: 1.75, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-0 right-0 z-20 flex w-1/2 items-center justify-start border-l-2 border-amber-300/75 bg-gradient-to-l from-[#1a0d24] via-[#261233] to-[#321740] pl-3 shadow-[-10px_0_35px_rgba(0,0,0,0.85)]"
              >
                <span className="mr-2 h-14 w-1.5 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.75)]" />
                <div className="h-[68%] w-[78%] rounded-xl border border-amber-300/30 bg-[#12091b]/55 p-3">
                  <div className="h-full w-full rounded-lg border border-amber-300/20" />
                </div>
              </motion.div>
            </div>
          )}

          {/* ==================== CUTSCENE 4: SLOW SUSPENSEFUL GIFT EXPLOSION ==================== */}
          {active === "gift-burst" && (
            <div className="relative flex h-full w-full items-center justify-center bg-[#080514]/75 backdrop-blur-[2px]">
              {/* Dual Slow Shockwave Rings */}
              <motion.div
                initial={{ scale: 0.18, opacity: 0 }}
                animate={{ scale: [0.18, 3.6], opacity: [0, 0.95, 0] }}
                transition={{ duration: 1.65, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute h-36 w-36 rounded-full border-4 border-amber-200/90 shadow-[0_0_45px_rgba(253,224,71,0.9)]"
              />
              <motion.div
                initial={{ scale: 0.15, opacity: 0 }}
                animate={{ scale: [0.15, 2.8], opacity: [0, 0.7, 0] }}
                transition={{ duration: 1.8, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute h-32 w-32 rounded-full border-2 border-amber-400/75"
              />

              {/* Radial Golden Light Rays */}
              <div className="pointer-events-none absolute flex items-center justify-center">
                {BURST_RAYS.map((ray) => (
                  <motion.span
                    key={ray.id}
                    initial={{ scaleY: 0.05, opacity: 0 }}
                    animate={{ scaleY: [0.05, 1.65], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.6, delay: 0.4, ease: "easeOut" }}
                    style={{
                      rotate: `${ray.angle}deg`,
                      height: ray.length,
                      transformOrigin: "bottom center",
                    }}
                    className="absolute bottom-0 w-1 rounded-full bg-gradient-to-t from-amber-300 via-yellow-100 to-transparent"
                  />
                ))}
              </div>

              {/* Lid vibrates in anticipation, then rockets skyward in slow-mo! */}
              <motion.div
                initial={{ y: 24, rotate: 0, scale: 1, opacity: 1 }}
                animate={{
                  y: [24, 18, 22, -260],
                  rotate: [0, -5, 5, -32],
                  scale: [1, 1.06, 1.08, 0.85],
                  opacity: [1, 1, 1, 0],
                }}
                transition={{
                  duration: 2.0,
                  times: [0, 0.14, 0.28, 1],
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="relative z-20 flex flex-col items-center"
              >
                <div className="-mb-1.5 flex items-end">
                  <span className="h-5 w-7 -rotate-12 rounded-tl-full rounded-tr-full border-[3px] border-amber-300 bg-amber-400/25" />
                  <span className="z-10 -mx-1 h-4 w-4 rounded-full bg-amber-200" />
                  <span className="h-5 w-7 rotate-12 rounded-tl-full rounded-tr-full border-[3px] border-amber-300 bg-amber-400/25" />
                </div>
                <div className="relative h-8 w-36 rounded-xl border border-amber-200/80 bg-gradient-to-b from-rose-600 to-rose-900 shadow-[0_0_32px_rgba(251,191,36,0.85)]">
                  <span className="absolute inset-y-0 left-1/2 w-5 -translate-x-1/2 bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400" />
                </div>
              </motion.div>

              {/* Slow Drifting Sparkle Confetti Explosion */}
              <div className="pointer-events-none absolute top-1/2 left-1/2 z-20">
                {GIFT_SPARKLES.map((sp) => (
                  <motion.span
                    key={sp.id}
                    initial={{ x: 0, y: 0, scale: 0.3, opacity: 0, rotate: 0 }}
                    animate={{
                      x: sp.x,
                      y: sp.y,
                      scale: [0.3, 1.25, 0.55],
                      opacity: [0, 1, 1, 0],
                      rotate: sp.rotate,
                    }}
                    transition={{
                      duration: 1.75,
                      delay: 0.45,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{
                      width: sp.size,
                      height: sp.size * 0.65,
                      backgroundColor: sp.color,
                    }}
                    className="absolute rounded-[2px]"
                  />
                ))}
              </div>

              {/* Slow Warm White-Gold Flash Bloom */}
              <motion.div
                initial={{ opacity: 0, scale: 0.35 }}
                animate={{ opacity: [0, 0.45, 0.96, 0], scale: [0.35, 1.0, 2.0, 2.4] }}
                transition={{ duration: 2.1, times: [0, 0.25, 0.52, 1] }}
                className="pointer-events-none absolute h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,251,235,0.98)_0%,rgba(251,191,36,0.55)_45%,transparent_75%)] blur-xl"
              />
            </div>
          )}

          {/* ==================== CUTSCENE 5: SLOW HEARTBEAT MIDNIGHT COUNTDOWN ==================== */}
          {active === "midnight-countdown" && (
            <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#040614]/86 backdrop-blur-[3px]">
              {[0, 1, 2].map((ring) => (
                <motion.div
                  key={ring}
                  initial={{ scale: 0.35, opacity: 0 }}
                  animate={{ scale: [0.35, 2.4], opacity: [0, 0.45, 0] }}
                  transition={{
                    duration: 2.1,
                    repeat: Infinity,
                    delay: ring * 0.68,
                    ease: "easeOut",
                  }}
                  className="pointer-events-none absolute h-52 w-52 rounded-full border border-amber-300/50 shadow-[0_0_24px_rgba(251,191,36,0.28)]"
                />
              ))}

              <motion.div
                key={`clock-${countdownNum}`}
                initial={{ opacity: 0.5, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="relative z-20 mb-4 rounded-full border border-amber-300/35 bg-slate-950/75 px-4 py-1 font-mono text-xs font-bold tracking-[0.25em] text-amber-200 shadow-lg"
              >
                {countdownNum > 0
                  ? `23:59:${String(60 - countdownNum).padStart(2, "0")}`
                  : "00:00:00"}
              </motion.div>

              <AnimatePresence mode="wait">
                {countdownNum > 0 ? (
                  <motion.div
                    key={`num-${countdownNum}`}
                    initial={{ scale: 1.9, opacity: 0, filter: "blur(10px)" }}
                    animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                    exit={{ scale: 0.55, opacity: 0, filter: "blur(8px)" }}
                    transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-20 bg-gradient-to-b from-amber-50 via-amber-300 to-amber-500 bg-clip-text text-8xl font-black text-transparent drop-shadow-[0_0_36px_rgba(251,191,36,0.75)]"
                  >
                    {countdownNum}
                  </motion.div>
                ) : (
                  <motion.div
                    key="midnight-zero"
                    initial={{ scale: 0.45, opacity: 0, filter: "blur(8px)" }}
                    animate={{
                      scale: [0.45, 1.12, 1.04],
                      opacity: 1,
                      filter: "blur(0px)",
                    }}
                    transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-20 flex flex-col items-center"
                  >
                    <span className="mb-1.5 text-xs font-semibold tracking-[0.28em] text-amber-200">
                      สวัสดีปีใหม่
                    </span>
                    <span className="bg-gradient-to-b from-white via-amber-200 to-amber-500 bg-clip-text text-7xl font-black tracking-tight text-transparent drop-shadow-[0_0_48px_rgba(253,224,71,0.92)]">
                      {targetYear}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {countdownNum === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.9, 0] }}
                  transition={{ duration: 1.5, times: [0, 0.42, 1] }}
                  className="pointer-events-none absolute inset-0 z-30 bg-[radial-gradient(circle,rgba(255,251,235,0.95)_0%,rgba(251,191,36,0.45)_55%,transparent_100%)]"
                />
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
