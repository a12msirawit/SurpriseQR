"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/** Cheerful floating ghost companion reacting to scroll progress & pace. */
export function FriendlyGhostCompanion({
  scrollProgress,
  isFastScrolling,
}: {
  scrollProgress: number;
  isFastScrolling: boolean;
}) {
  const depthMode =
    scrollProgress > 0.82
      ? "party"
      : scrollProgress > 0.52
        ? "witch"
        : isFastScrolling
          ? "startled"
          : "curious";

  const moodSpeech =
    depthMode === "party"
      ? "Trick or Treat! มีความสุขนะ"
      : depthMode === "witch"
        ? "เจอซองจดหมายลับหรือยัง?"
        : depthMode === "startled"
          ? "ว้าว! ลอยหาคำใบ้ไวจัง"
          : scrollProgress > 0.22
            ? "แตะโคม I-II-III เปิดรูปที่ 1"
            : "สุขสันต์วันฮาโลวีน!";

  return (
    <motion.div
      animate={{
        y: [0, -8, 0],
        rotate: isFastScrolling ? [-6, 6, -4] : [-2, 2, -2],
      }}
      transition={{
        duration: isFastScrolling ? 0.65 : 3.2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="pointer-events-none flex flex-col items-end gap-1"
    >
      <div className="rounded-2xl rounded-br-sm border border-purple-300/35 bg-[#190b2e]/85 px-2.5 py-1 text-[10px] font-medium text-amber-100 shadow-lg backdrop-blur-md">
        {moodSpeech}
      </div>
      <svg
        viewBox="0 0 64 72"
        className="h-12 w-11 drop-shadow-[0_6px_18px_rgba(168,85,247,0.48)] sm:h-14 sm:w-12"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ghostBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="72%" stopColor="#e9d5ff" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.65" />
          </linearGradient>
        </defs>

        {/* Mini witch hat in potion depth */}
        {depthMode === "witch" && (
          <g transform="translate(32 14)">
            <ellipse cx="0" cy="4" rx="18" ry="4" fill="#3b0764" stroke="#f59e0b" strokeWidth="1.2" />
            <polygon points="-10,3 0,-18 10,3" fill="#4c1d95" stroke="#f59e0b" strokeWidth="1" />
            <rect x="-8" y="0" width="16" height="3" fill="#f59e0b" />
          </g>
        )}

        {/* Ghost cloak */}
        <path
          d="M14 34 C14 16, 50 16, 50 34 L52 58 C46 64, 42 56, 37 60 C33 64, 29 56, 25 60 C20 64, 16 56, 12 58 Z"
          fill="url(#ghostBodyGrad)"
        />
        {/* Cute rosy cheeks */}
        <ellipse cx="22" cy="36" rx="3.2" ry="2" fill="#fda4af" opacity="0.7" />
        <ellipse cx="42" cy="36" rx="3.2" ry="2" fill="#fda4af" opacity="0.7" />

        {/* Eyes */}
        {depthMode === "party" ? (
          <>
            <path d="M23 30 Q26 26 29 30" stroke="#1e1b4b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M35 30 Q38 26 41 30" stroke="#1e1b4b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="25" cy="31" r={isFastScrolling ? 3.5 : 2.7} fill="#1e1b4b" />
            <circle cx="39" cy="31" r={isFastScrolling ? 3.5 : 2.7} fill="#1e1b4b" />
            <circle cx="26" cy="30" r="0.9" fill="#ffffff" />
            <circle cx="40" cy="30" r="0.9" fill="#ffffff" />
          </>
        )}

        {/* Mouth */}
        {depthMode === "startled" ? (
          <ellipse cx="32" cy="40" rx="3.2" ry="4.4" fill="#1e1b4b" />
        ) : depthMode === "party" ? (
          <path d="M27 38 Q32 45 37 38" stroke="#1e1b4b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        ) : (
          <ellipse cx="32" cy="39" rx="2.4" ry="2" fill="#1e1b4b" />
        )}
      </svg>
    </motion.div>
  );
}

/** Interactive Spider dangling from top ceiling; thread grows smoothly with scroll! */
export function HauntedSpiderOnThread({
  scrollRatio,
  onBoing,
}: {
  scrollRatio: number;
  onBoing: () => void;
}) {
  const [recoiling, setRecoiling] = useState(false);
  const clamped = Math.max(0, Math.min(1, scrollRatio));
  const threadHeight = recoiling ? 26 : 36 + Math.round(clamped * 125);

  const handleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecoiling(true);
    onBoing();
    window.setTimeout(() => setRecoiling(false), 720);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Silk web line anchored above */}
      <div
        className="w-px bg-gradient-to-b from-purple-200/20 via-amber-100/60 to-white/80 transition-all duration-300 ease-out"
        style={{ height: `${threadHeight}px` }}
      />
      <button
        type="button"
        onClick={handleTap}
        aria-label="แตะแมงมุมให้เด้งขึ้น"
        className={`group relative flex flex-col items-center transition-transform duration-300 hover:scale-110 active:scale-90 ${
          recoiling ? "-translate-y-4" : "translate-y-0"
        }`}
      >
        <svg viewBox="0 0 84 64" className="h-14 w-18 drop-shadow-[0_8px_20px_rgba(168,85,247,0.45)]">
          {/* 8 Spider Legs */}
          {[-1, 1].map((side) => (
            <g key={side} stroke="#c4b5fd" strokeWidth="2.3" strokeLinecap="round" fill="none">
              <path d={`M42 30 L${42 + side * 20} 14 L${42 + side * 30} 22`} />
              <path d={`M42 33 L${42 + side * 24} 24 L${42 + side * 34} 34`} />
              <path d={`M42 36 L${42 + side * 24} 38 L${42 + side * 32} 50`} />
              <path d={`M42 39 L${42 + side * 18} 48 L${42 + side * 24} 58`} />
            </g>
          ))}
          {/* Thorax & Abdomen */}
          <ellipse cx="42" cy="24" rx="11" ry="12" fill="#1e1035" stroke="#a855f7" strokeWidth="1.5" />
          <circle cx="42" cy="39" r="8" fill="#2e1065" stroke="#f59e0b" strokeWidth="1.2" />
          {/* Cute glowing amber eyes */}
          <circle cx="38.5" cy="40" r="2.2" fill="#fbbf24" />
          <circle cx="45.5" cy="40" r="2.2" fill="#fbbf24" />
          <circle cx="39" cy="39.5" r="0.8" fill="#ffffff" />
          <circle cx="46" cy="39.5" r="0.8" fill="#ffffff" />
          <circle cx="35" cy="37" r="1.2" fill="#fde68a" opacity="0.8" />
          <circle cx="49" cy="37" r="1.2" fill="#fde68a" opacity="0.8" />
        </svg>
        <span className="mt-0.5 rounded-full border border-purple-300/30 bg-black/60 px-2.5 py-0.5 text-[10px] font-medium text-purple-200 backdrop-blur-sm">
          {recoiling ? "ฮิฮิ! จ๊ะเอ๋วันฮาโลวีน" : "แตะเจ้าแมงมุมตัวน้อย"}
        </span>
      </button>
    </div>
  );
}

/** Eyeballs in ornate Gothic frames updating pupil positions via direct DOM refs (zero React re-renders). */
export function TrackingEyeballPainting() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftPupilRef = useRef<SVGGElement | null>(null);
  const rightPupilRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const updateEyes = (clientX: number, clientY: number) => {
      const box = containerRef.current?.getBoundingClientRect();
      const cx = box ? box.left + box.width * 0.5 : window.innerWidth * 0.5;
      const cy = box ? box.top + box.height * 0.5 : window.innerHeight * 0.45;
      const angle = Math.atan2(clientY - cy, clientX - cx);
      const offsetX = Math.cos(angle) * 5.2;
      const offsetY = Math.sin(angle) * 4.2;
      const transform = `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px)`;
      if (leftPupilRef.current) leftPupilRef.current.style.transform = transform;
      if (rightPupilRef.current) rightPupilRef.current.style.transform = transform;
    };

    const onPointerMove = (e: PointerEvent) => {
      updateEyes(e.clientX, e.clientY);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  return (
    <div ref={containerRef} className="flex items-center justify-center gap-4">
      {[0, 1].map((idx) => (
        <div
          key={idx}
          className="relative flex h-16 w-14 items-center justify-center rounded-[50%_50%_18%_18%] border-2 border-amber-400/45 bg-gradient-to-b from-[#2b1045] to-[#12071d] shadow-[0_10px_28px_rgba(0,0,0,0.65)]"
        >
          <svg viewBox="0 0 48 48" className="h-11 w-11">
            <ellipse cx="24" cy="24" rx="18" ry="13" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.2" />
            <g ref={idx === 0 ? leftPupilRef : rightPupilRef}>
              <circle cx="24" cy="24" r="7.2" fill="#a855f7" />
              <circle cx="24" cy="24" r="3.8" fill="#0f0720" />
              <circle cx="22" cy="22" r="1.7" fill="#ffffff" />
            </g>
          </svg>
        </div>
      ))}
    </div>
  );
}

/** Carved Glowing Jack-o'-Lantern Pumpkin SVG. */
export function JackOLanternSvg({
  lit = true,
  className = "h-12 w-12",
}: {
  lit?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {/* Stem */}
      <path d="M29 14 C29 7, 36 5, 38 11 L35 17 H29 Z" fill="#65a30d" />
      {/* Outer pumpkin ribs */}
      <ellipse cx="20" cy="36" rx="13" ry="19" fill="#c2410c" />
      <ellipse cx="44" cy="36" rx="13" ry="19" fill="#c2410c" />
      <ellipse cx="32" cy="37" rx="14" ry="20" fill="#ea580c" stroke="#fdba74" strokeOpacity="0.3" strokeWidth="1" />
      {/* Carved glowing or dark face */}
      <polygon
        points="20,31 26,27 27,34"
        fill={lit ? "#fef08a" : "#271005"}
      />
      <polygon
        points="44,31 38,27 37,34"
        fill={lit ? "#fef08a" : "#271005"}
      />
      <polygon points="32,35 29.5,39 34.5,39" fill={lit ? "#fef08a" : "#271005"} />
      <path
        d="M21 43 L25 47 L29 44 L32 48 L35 44 L39 47 L43 43 C40 50, 24 50, 21 43 Z"
        fill={lit ? "#fde047" : "#271005"}
      />
    </svg>
  );
}

/** Mystical Carved Ouija Crystal Lens Planchette SVG. */
export function OuijaPlanchetteSvg({
  className = "h-14 w-14",
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ouijaWood" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="50%" stopColor="#451a03" />
          <stop offset="100%" stopColor="#290f02" />
        </linearGradient>
        <radialGradient id="crystalLens" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#a855f7" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#3b0764" stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <path
        d="M40 6 C46 18, 66 44, 68 58 C70 68, 56 74, 40 72 C24 74, 10 68, 12 58 C14 44, 34 18, 40 6 Z"
        fill="url(#ouijaWood)"
        stroke="#fbbf24"
        strokeWidth="2"
      />
      <circle cx="40" cy="46" r="14" fill="url(#crystalLens)" stroke="#fde68a" strokeWidth="2" />
      <path d="M40 12 V24" stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="40" cy="10" r="2.2" fill="#fde68a" />
    </svg>
  );
}

/** Simmering Neon Witch Cauldron SVG. */
export function WitchCauldronSvg({
  bubbling = false,
  className = "h-24 w-24",
}: {
  bubbling?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 110 100" className={className} aria-hidden="true">
      {/* Glow soup */}
      <ellipse cx="55" cy="36" rx="34" ry="9" fill="#84cc16" opacity={bubbling ? 0.95 : 0.72} />
      <ellipse cx="55" cy="36" rx="26" ry="5.5" fill="#bef264" opacity="0.7" />
      {/* Iron Pot */}
      <path
        d="M21 36 C16 66, 28 84, 55 84 C82 84, 94 66, 89 36 Z"
        fill="#18181b"
        stroke="#71717a"
        strokeWidth="1.8"
      />
      {/* Cauldron Rim & Feet */}
      <ellipse cx="55" cy="36" rx="35" ry="7.5" fill="none" stroke="#3f3f46" strokeWidth="4.5" />
      <path d="M35 80 L30 92" stroke="#27272a" strokeWidth="5" strokeLinecap="round" />
      <path d="M75 80 L80 92" stroke="#27272a" strokeWidth="5" strokeLinecap="round" />
      {/* Floating neon bubbles */}
      <circle cx="44" cy={bubbling ? "18" : "25"} r="4" fill="#bef264" opacity="0.85" className="animate-bounce" />
      <circle cx="62" cy={bubbling ? "12" : "21"} r="5.5" fill="#d8b4fe" opacity="0.8" className="animate-pulse" />
      <circle cx="53" cy={bubbling ? "22" : "28"} r="3" fill="#a3e635" opacity="0.9" />
    </svg>
  );
}

