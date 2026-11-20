"use client";

import React from "react";
import { motion } from "framer-motion";

/** Intricate Luxury Rose-Gold & Champagne Art-Deco Filigree Perimeter Frame. */
export function FiligreeGalaFrame() {
  const cornerSvg = (className: string) => (
    <svg
      viewBox="0 0 72 72"
      fill="none"
      className={`pointer-events-none absolute h-14 w-14 text-amber-200/55 sm:h-16 sm:w-16 ${className}`}
      aria-hidden="true"
    >
      <path
        d="M5 66V14C5 9.03 9.03 5 14 5H66"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M12 52V16C12 13.79 13.79 12 16 12H52"
        stroke="#fda4af"
        strokeWidth="0.8"
        strokeOpacity="0.65"
      />
      <path
        d="M5 26L26 5"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeOpacity="0.55"
      />
      <polygon
        points="17,17 22,13 26,17 22,21"
        fill="currentColor"
        fillOpacity="0.7"
      />
      <circle cx="9" cy="9" r="2.1" fill="#FDE68A" />
      <circle cx="34" cy="5" r="1.2" fill="#FDA4AF" />
      <circle cx="5" cy="34" r="1.2" fill="#FDA4AF" />
    </svg>
  );

  return (
    <div className="pointer-events-none absolute inset-3 z-10 rounded-3xl border border-amber-200/20 shadow-[inset_0_0_80px_rgba(244,114,182,0.06)]">
      <div className="absolute inset-1.5 rounded-2xl border border-rose-200/12" />
      {cornerSvg("top-0 left-0")}
      {cornerSvg("top-0 right-0 -scale-x-100")}
      {cornerSvg("bottom-0 left-0 -scale-y-100")}
      {cornerSvg("bottom-0 right-0 scale-[-1]")}
    </div>
  );
}

/** Counter-rotating Royal Birthday Mandala Halo shining behind the cake & keepsakes. */
export function RoyalBirthdayMandala({
  accelerated = false,
  litGlow = true,
}: {
  accelerated?: boolean;
  litGlow?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Radiant Velvet Rose & Champagne Halo Bloom */}
      <motion.div
        animate={{
          scale: accelerated ? [1, 1.24, 1] : [1, 1.07, 1],
          opacity: litGlow ? [0.42, 0.65, 0.42] : [0.24, 0.4, 0.24],
        }}
        transition={{
          duration: accelerated ? 1.1 : 4.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(253,224,136,0.28)_0%,rgba(244,114,182,0.16)_46%,transparent_74%)] blur-2xl sm:h-[340px] sm:w-[340px]"
      />

      {/* Outer Filigree Celestial Ring */}
      <motion.svg
        viewBox="0 0 360 360"
        animate={{ rotate: 360 }}
        transition={{
          duration: accelerated ? 2.1 : 44,
          repeat: Infinity,
          ease: "linear",
        }}
        className="h-[310px] w-[310px] opacity-50 sm:h-[360px] sm:w-[360px]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="bdayMandalaGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#F9A8D4" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <circle
          cx="180"
          cy="180"
          r="168"
          fill="none"
          stroke="url(#bdayMandalaGold)"
          strokeWidth="1"
          strokeDasharray="3 8"
        />
        <circle
          cx="180"
          cy="180"
          r="152"
          fill="none"
          stroke="url(#bdayMandalaGold)"
          strokeWidth="0.7"
          strokeOpacity="0.7"
        />
        <circle
          cx="180"
          cy="180"
          r="128"
          fill="none"
          stroke="#FDE68A"
          strokeWidth="0.9"
          strokeDasharray="18 8 3 8"
          strokeOpacity="0.6"
        />

        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 180 180)`}>
            <line
              x1="180"
              y1="14"
              x2="180"
              y2="28"
              stroke={deg % 90 === 0 ? "#FDE68A" : "#FBCFE8"}
              strokeWidth={deg % 90 === 0 ? "1.6" : "0.75"}
              strokeOpacity="0.75"
            />
            {deg % 90 === 0 && (
              <polygon points="180,7 183.5,12.5 180,18 176.5,12.5" fill="#FEF08A" />
            )}
            {deg % 60 === 30 && (
              <circle cx="180" cy="24" r="1.8" fill="#FDA4AF" opacity="0.8" />
            )}
          </g>
        ))}
      </motion.svg>

      {/* Inner Counter-Rotating Geometric Diamond Star */}
      <motion.svg
        viewBox="0 0 260 260"
        animate={{ rotate: -360 }}
        transition={{
          duration: accelerated ? 1.5 : 28,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute h-[230px] w-[230px] opacity-35 sm:h-[268px] sm:w-[268px]"
        aria-hidden="true"
      >
        <polygon
          points="130,18 242,130 130,242 18,130"
          fill="none"
          stroke="#FDE68A"
          strokeWidth="0.75"
        />
        <polygon
          points="130,18 242,130 130,242 18,130"
          fill="none"
          stroke="#F472B6"
          strokeWidth="0.75"
          transform="rotate(45 130 130)"
        />
        <circle
          cx="130"
          cy="130"
          r="92"
          fill="none"
          stroke="#FEF3C7"
          strokeWidth="0.8"
          strokeDasharray="2 6"
        />
      </motion.svg>
    </div>
  );
}
