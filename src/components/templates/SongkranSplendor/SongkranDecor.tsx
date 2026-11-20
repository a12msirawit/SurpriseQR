"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Festive Thai temple-fair colorful triangular bunting flags strung across the sky. */
export function BuntingFlagsBanner() {
  const flagColors = ["#22D3EE", "#FACC15", "#F472B6", "#34D399", "#FB923C", "#A78BFA"];
  const flags = Array.from({ length: 12 }, (_, i) => ({
    x: i * 34 + 6,
    y: Math.sin((i / 11) * Math.PI) * 14 + 4,
    color: flagColors[i % flagColors.length],
  }));

  return (
    <motion.div
      animate={{ y: [0, 2, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="pointer-events-none absolute inset-x-0 top-0 z-[12] overflow-hidden opacity-90"
    >
      <svg viewBox="0 0 420 56" className="h-12 w-full" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M0 4 Q210 34 420 4"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.2"
        />
        {flags.map((f, idx) => (
          <polygon
            key={idx}
            points={`${f.x},${f.y} ${f.x + 26},${f.y + 3} ${f.x + 12},${f.y + 26}`}
            fill={f.color}
            fillOpacity="0.88"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="0.6"
          />
        ))}
      </svg>
    </motion.div>
  );
}

/**
 * Slow Surging Tidal Water Wave Transition Overlay — surges up bottom-to-top
 * across the entire viewport with glowing white foam & bubbles between stages.
 */
export function TidalWaveTransitionOverlay({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ y: "105%" }}
          animate={{ y: ["-12%", "-105%"] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.25, times: [0, 0.48, 1], ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute inset-0 z-40 flex flex-col justify-start"
        >
          {/* Cresting Foam Top Lip */}
          <svg
            viewBox="0 0 400 80"
            preserveAspectRatio="none"
            className="h-20 w-full shrink-0 translate-y-1 text-cyan-300"
            aria-hidden="true"
          >
            <path
              d="M0 50 Q50 5 100 45 T200 40 T300 48 T400 35 L400 80 L0 80 Z"
              fill="#ECFEFF"
              fillOpacity="0.9"
            />
            <path
              d="M0 58 Q60 20 130 52 T260 46 T400 54 L400 80 L0 80 Z"
              fill="#22D3EE"
              fillOpacity="0.95"
            />
          </svg>
          {/* Sunlit Turquoise Water Curtain Body */}
          <div className="h-[140%] w-full bg-gradient-to-b from-cyan-400/95 via-sky-500/95 to-teal-700/95 backdrop-blur-sm" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Overflowing Songkran Water Bucket SVG Icon. */
export function WaterBucketSvg({ className = "h-8 w-8" }: { className?: string }) {
  const uid = React.useId().replace(/:/g, "");
  const gId = `skBucket-${uid}`;
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
      </defs>
      {/* Splashing waves above bucket */}
      <path d="M16 18C20 8 28 8 32 16C36 8 44 10 48 18" stroke="#ECFEFF" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="10" r="2.2" fill="#ECFEFF" />
      <circle cx="42" cy="9" r="2" fill="#FDE047" />
      {/* Bucket rim & handle */}
      <path d="M16 24C16 14 48 14 48 24" stroke="#FEF08A" strokeWidth="1.8" />
      <path d="M14 23H50L44 54H20L14 23Z" fill={`url(#${gId})`} stroke="#ECFEFF" strokeWidth="1.4" />
      <ellipse cx="32" cy="23" rx="18" ry="4" fill="#BAE6FD" stroke="#FFFFFF" strokeWidth="1.2" />
      <path d="M22 36H42" stroke="#FEF08A" strokeWidth="1.6" strokeOpacity="0.85" />
    </svg>
  );
}

/** Colorful Playful Songkran Water Blaster SVG Icon. */
export function WaterBlasterSvg({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      {/* Water burst stream out of nozzle */}
      <path d="M52 24L61 19M52 27L62 27M52 30L60 35" stroke="#ECFEFF" strokeWidth="2.2" strokeLinecap="round" />
      {/* Water tank */}
      <rect x="14" y="13" width="22" height="10" rx="5" fill="#FACC15" stroke="#FFFBEB" strokeWidth="1.2" />
      {/* Blaster barrel */}
      <path
        d="M12 23H46L51 27L46 31H34L30 48H20L23 31H12V23Z"
        fill="#EC4899"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <rect x="44" y="24" width="6" height="6" rx="2" fill="#22D3EE" />
      {/* Trigger grip accents */}
      <circle cx="30" cy="27" r="2.2" fill="#FEF08A" />
    </svg>
  );
}

/** Festive Thai Bamboo Siam-Si Fortune Cup SVG Icon. */
export function BambooSiamSiSvg({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      {/* Sticks poking out */}
      <rect x="23" y="8" width="4" height="22" rx="1.5" transform="rotate(-12 23 8)" fill="#FDE047" />
      <rect x="30" y="6" width="4" height="24" rx="1.5" fill="#FB7185" />
      <rect x="37" y="9" width="4" height="22" rx="1.5" transform="rotate(11 37 9)" fill="#22D3EE" />
      {/* Bamboo cylinder */}
      <rect x="19" y="24" width="26" height="30" rx="5" fill="#D97706" stroke="#FEF3C7" strokeWidth="1.5" />
      <path d="M19 36H45" stroke="#FEF3C7" strokeWidth="1.4" strokeOpacity="0.7" />
      <circle cx="32" cy="45" r="3.5" fill="#FEF08A" />
    </svg>
  );
}

/** Festive Sand Pagoda & Flags SVG Icon. */
export function SandPagodaSvg({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path d="M32 7V20" stroke="#FFFBEB" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M32 7L45 10L32 14Z" fill="#22D3EE" />
      <path d="M18 34V22" stroke="#FDE68A" strokeWidth="1.2" />
      <path d="M18 22L25 24L18 27Z" fill="#FB7185" />
      <path d="M46 34V22" stroke="#FDE68A" strokeWidth="1.2" />
      <path d="M46 22L53 24L46 27Z" fill="#34D399" />
      <path d="M27 20H37L42 32H22L27 20Z" fill="#FEF08A" />
      <path d="M20 32H44L49 43H15L20 32Z" fill="#FBBF24" />
      <path d="M13 43H51L56 54H8L13 43Z" fill="#D97706" stroke="#FFFBEB" strokeWidth="1" />
    </svg>
  );
}

interface AquaIconMedallionProps {
  onClick: (e: React.MouseEvent) => void;
  ariaLabel: string;
  caption?: string;
  icon: React.ReactNode;
  size?: "md" | "lg";
  active?: boolean;
  disabled?: boolean;
  variant?: "aqua" | "pink" | "gold" | "glass";
}

/** Floating Sunlit Songkran Icon Medallion trigger — colorful & joyful, zero dull boxes. */
export function AquaIconMedallion({
  onClick,
  ariaLabel,
  caption,
  icon,
  size = "lg",
  active = false,
  disabled = false,
  variant = "aqua",
}: AquaIconMedallionProps) {
  const outer = size === "lg" ? "h-20 w-20" : "h-14 w-14";
  const inner = size === "lg" ? "h-14 w-14" : "h-10 w-10";

  const coreStyle =
    variant === "pink"
      ? "border-pink-200/90 bg-[radial-gradient(circle_at_30%_30%,#FDF2F8_0%,#F472B6_48%,#DB2777_95%)] text-white shadow-[0_0_26px_rgba(244,114,182,0.65)]"
      : variant === "gold"
        ? "border-yellow-100/90 bg-[radial-gradient(circle_at_30%_30%,#FEFCE8_0%,#FACC15_45%,#D97706_95%)] text-slate-950 shadow-[0_0_26px_rgba(250,204,21,0.65)]"
        : variant === "aqua"
          ? "border-cyan-100/90 bg-[radial-gradient(circle_at_30%_30%,#ECFEFF_0%,#22D3EE_45%,#0284C7_95%)] text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.65)]"
          : "border-white/50 bg-slate-900/45 text-white shadow-[0_0_18px_rgba(255,255,255,0.2)]";

  return (
    <div className="pointer-events-auto inline-flex flex-col items-center gap-1.5">
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        whileHover={{ scale: 1.11 }}
        whileTap={{ scale: 0.9 }}
        className={`group relative flex items-center justify-center rounded-full focus:outline-none ${outer}`}
      >
        <motion.span
          animate={{ scale: [1, 1.24, 1], opacity: [0.4, 0.78, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.42)_0%,transparent_72%)]"
        />

        <motion.svg
          viewBox="0 0 80 80"
          animate={{ rotate: active ? 720 : 360 }}
          transition={{ duration: active ? 0.75 : 10, repeat: Infinity, ease: "linear" }}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.65"
            strokeWidth="1.1"
            strokeDasharray="6 6 2 6"
          />
          <circle cx="40" cy="4" r="2.4" fill="#FEF08A" />
        </motion.svg>

        <span
          className={`relative flex items-center justify-center rounded-full border-2 backdrop-blur-md transition-all duration-200 ${inner} ${coreStyle}`}
        >
          {icon}
        </span>
      </motion.button>

      {caption && (
        <span className="pointer-events-none text-[11px] font-semibold tracking-wider text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
          {caption}
        </span>
      )}
    </div>
  );
}
