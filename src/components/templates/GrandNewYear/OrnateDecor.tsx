"use client";

import React from "react";
import { motion } from "framer-motion";

/** Intricate Art-Deco celestial filigree border frame across all 4 corners. */
export function FiligreeFrame() {
  const cornerSvg = (className: string) => (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={`pointer-events-none absolute h-12 w-12 text-amber-300/45 ${className}`}
      aria-hidden="true"
    >
      <path d="M4 60V12C4 7.58 7.58 4 12 4H60" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 48V14C10 11.79 11.79 10 14 10H48" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.65" />
      <path d="M4 22L22 4" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.6" />
      <polygon points="15,15 19,12 22,15 19,18" fill="currentColor" fillOpacity="0.75" />
      <circle cx="8" cy="8" r="1.8" fill="#FDE68A" />
    </svg>
  );

  return (
    <div className="pointer-events-none absolute inset-3 z-10 rounded-2xl border border-amber-300/15">
      <div className="absolute inset-1.5 rounded-xl border border-amber-200/10" />
      {cornerSvg("top-0 left-0")}
      {cornerSvg("top-0 right-0 -scale-x-100")}
      {cornerSvg("bottom-0 left-0 -scale-y-100")}
      {cornerSvg("bottom-0 right-0 scale-[-1]")}
    </div>
  );
}

/** Rotating celestial astrolabe rings placed behind hero elements in Stage 1. */
export function RoyalAstrolabe({ accelerated = false }: { accelerated?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Radiant golden halo bloom */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.24)_0%,rgba(245,158,11,0.06)_50%,transparent_75%)] blur-xl"
      />

      {/* Outer celestial dial */}
      <motion.svg
        viewBox="0 0 320 320"
        animate={{ rotate: 360 }}
        transition={{
          duration: accelerated ? 2.4 : 46,
          repeat: Infinity,
          ease: "linear",
        }}
        className="h-80 w-80 opacity-45"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="nyAstrolabeGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <circle cx="160" cy="160" r="148" fill="none" stroke="url(#nyAstrolabeGold)" strokeWidth="0.9" strokeDasharray="3 7" />
        <circle cx="160" cy="160" r="132" fill="none" stroke="url(#nyAstrolabeGold)" strokeWidth="0.7" />
        <circle cx="160" cy="160" r="106" fill="none" stroke="url(#nyAstrolabeGold)" strokeWidth="0.8" strokeDasharray="16 8 2 8" />
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 160 160)`}>
            <line x1="160" y1="12" x2="160" y2="24" stroke="#FDE68A" strokeWidth={deg % 90 === 0 ? "1.6" : "0.7"} strokeOpacity="0.7" />
            {deg % 90 === 0 && <polygon points="160,6 163,11 160,16 157,11" fill="#FDE68A" />}
          </g>
        ))}
      </motion.svg>

      {/* Counter-rotating inner orbital */}
      <motion.svg
        viewBox="0 0 240 240"
        animate={{ rotate: -360 }}
        transition={{
          duration: accelerated ? 1.8 : 30,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute h-60 w-60 opacity-35"
        aria-hidden="true"
      >
        <polygon points="120,16 224,120 120,224 16,120" fill="none" stroke="#FDE68A" strokeWidth="0.65" />
        <polygon points="120,16 224,120 120,224 16,120" fill="none" stroke="#F59E0B" strokeWidth="0.65" transform="rotate(45 120 120)" />
        <circle cx="120" cy="120" r="78" fill="none" stroke="#FEF3C7" strokeWidth="0.7" strokeDasharray="2 5" />
      </motion.svg>
    </div>
  );
}

/** Volumetric glowing Sky Lantern SVG vector with collision-free gradient IDs. */
export function SkyLanternSvg({ className = "h-12 w-10" }: { className?: string }) {
  const uid = React.useId().replace(/:/g, "");
  const glowId = `lanternGlow-${uid}`;
  const rimId = `lanternRim-${uid}`;
  return (
    <svg viewBox="0 0 64 84" fill="none" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={glowId} cx="50%" cy="62%" r="55%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="35%" stopColor="#FDE047" />
          <stop offset="72%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#9A3412" stopOpacity="0.92" />
        </radialGradient>
        <linearGradient id={rimId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#FFFBEB" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {/* Outer warm radiance */}
      <ellipse cx="32" cy="40" rx="28" ry="34" fill="#F59E0B" fillOpacity="0.16" />
      {/* Paper lantern body */}
      <path
        d="M14 22C14 11 22 6 32 6C42 6 50 11 50 22C50 37 44 56 41 64H23C20 56 14 37 14 22Z"
        fill={`url(#${glowId})`}
        stroke={`url(#${rimId})`}
        strokeWidth="1.2"
      />
      {/* Vertical lantern ribs */}
      <path d="M32 6V64" stroke="#FFFBEB" strokeOpacity="0.35" strokeWidth="0.9" />
      <path d="M23 9C21 28 24 50 27 64" stroke="#FFFBEB" strokeOpacity="0.28" strokeWidth="0.8" />
      <path d="M41 9C43 28 40 50 37 64" stroke="#FFFBEB" strokeOpacity="0.28" strokeWidth="0.8" />
      {/* Base ring & bright flame */}
      <ellipse cx="32" cy="64" rx="9" ry="2.2" fill="#451A03" stroke="#FDE68A" strokeWidth="1" />
      <path
        d="M32 54C34.5 57.5 35 61 32 63.5C29 61 29.5 57.5 32 54Z"
        fill="#FFFBEB"
      />
    </svg>
  );
}

interface IconMedallionProps {
  onClick: (e: React.MouseEvent) => void;
  ariaLabel: string;
  caption?: string;
  icon: React.ReactNode;
  size?: "md" | "lg";
  active?: boolean;
  disabled?: boolean;
  variant?: "gold" | "glass";
}

/**
 * Sculptural Celestial Icon Medallion trigger — replaces blocky UI buttons
 * with a floating luminous orbital seal and whisper-thin micro-caption.
 */
export function IconMedallion({
  onClick,
  ariaLabel,
  caption,
  icon,
  size = "lg",
  active = false,
  disabled = false,
  variant = "gold",
}: IconMedallionProps) {
  const outerSize = size === "lg" ? "h-20 w-20" : "h-14 w-14";
  const innerSize = size === "lg" ? "h-14 w-14" : "h-10 w-10";

  return (
    <div className="pointer-events-auto inline-flex flex-col items-center gap-2">
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        whileHover={{ scale: 1.09 }}
        whileTap={{ scale: 0.92 }}
        className={`group relative flex items-center justify-center rounded-full focus:outline-none ${outerSize}`}
      >
        {/* Outer pulsing aureole */}
        <motion.span
          animate={{ scale: [1, 1.24, 1], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          className={`pointer-events-none absolute inset-0 rounded-full ${
            variant === "gold"
              ? "bg-[radial-gradient(circle,rgba(251,191,36,0.45)_0%,transparent_72%)]"
              : "bg-[radial-gradient(circle,rgba(224,231,255,0.28)_0%,transparent_72%)]"
          }`}
        />

        {/* Rotating celestial hairline orbital */}
        <motion.svg
          viewBox="0 0 80 80"
          animate={{ rotate: active ? 720 : 360 }}
          transition={{ duration: active ? 0.9 : 14, repeat: Infinity, ease: "linear" }}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={variant === "gold" ? "#FDE68A" : "#CBD5E1"}
            strokeOpacity="0.6"
            strokeWidth="1"
            strokeDasharray="6 6 1.5 6"
          />
          <circle cx="40" cy="4" r="2" fill="#FFFBEB" />
          <circle cx="40" cy="76" r="1.5" fill="#FBBF24" />
        </motion.svg>

        {/* Sculpted gem/crystal core */}
        <span
          className={`relative flex items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 ${innerSize} ${
            variant === "gold"
              ? "border-amber-200/80 bg-[radial-gradient(circle_at_30%_30%,#FFFBEB_0%,#FCD34D_32%,#D97706_88%,#78350F_100%)] text-slate-950 shadow-[0_0_28px_rgba(251,191,36,0.55)] group-hover:shadow-[0_0_40px_rgba(253,224,71,0.85)]"
              : "border-amber-300/45 bg-slate-950/65 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.22)] group-hover:border-amber-200/80 group-hover:bg-amber-500/15"
          }`}
        >
          {icon}
        </span>
      </motion.button>

      {caption && (
        <span className="pointer-events-none text-[11px] font-medium tracking-[0.2em] text-amber-100/75 drop-shadow">
          {caption}
        </span>
      )}
    </div>
  );
}
