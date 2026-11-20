"use client";

import React, { useId, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playWaxCrack } from "./waxSound";

interface WaxSealProps {
  isBroken: boolean;
  onBreak: () => void;
  color?: "ruby" | "gold";
  symbol?: "heart" | "rose" | "crown";
  disabled?: boolean;
  muted?: boolean;
}

const ORGANIC_WAX_PATH =
  "M80,12 C97,11 114,15 127,25 C140,34 147,51 149,68 C151,85 148,105 138,120 C128,135 112,146 95,148 C77,151 58,148 43,139 C27,130 15,114 12,96 C9,77 14,57 22,42 C31,26 48,16 64,13 C70,12 75,12 80,12 Z";

const INNER_WAX_RIDGE =
  "M80,22 C95,22 110,27 120,37 C131,47 137,62 138,77 C139,93 133,109 122,120 C111,131 96,138 80,138 C64,138 49,132 38,121 C27,110 22,94 22,78 C22,62 28,47 39,37 C50,27 65,22 80,22 Z";

// Jagged complementary fracture seams so both halves interlock visually before splitting
const LEFT_JAGGED_CLIP =
  "M0,0 L86,0 L78,28 L89,52 L73,77 L87,102 L71,126 L82,160 L0,160 Z";
const RIGHT_JAGGED_CLIP =
  "M86,0 L160,0 L160,160 L82,160 L71,126 L87,102 L73,77 L89,52 L78,28 Z";
const JAGGED_CRACK_LINE =
  "M86,0 L78,28 L89,52 L73,77 L87,102 L71,126 L82,160";

const WAX_SHARD_CHIPS = [
  { x: -34, y: -28, rot: -42, size: 7, delay: 0.02 },
  { x: 38, y: -22, rot: 54, size: 6, delay: 0.04 },
  { x: -42, y: 18, rot: -68, size: 8, delay: 0.05 },
  { x: 40, y: 26, rot: 46, size: 7, delay: 0.03 },
  { x: -16, y: 46, rot: -25, size: 5, delay: 0.06 },
  { x: 18, y: 42, rot: 35, size: 6, delay: 0.05 },
];

export default function WaxSeal({
  isBroken,
  onBreak,
  color = "ruby",
  symbol = "heart",
  disabled = false,
  muted = false,
}: WaxSealProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const uid = useId().replace(/:/g, "");

  const isGold = color === "gold";
  const cLight = isGold ? "#fef08a" : "#e14764";
  const cMid = isGold ? "#c48a28" : "#9c1631";
  const cDark = isGold ? "#6b430b" : "#4b0714";
  const cEdge = isGold ? "#3b2204" : "#28030a";
  const embossColor = isGold ? "#fff7d6" : "#f6cf7e";
  const fractureEdge = isGold ? "#fde68a" : "#e87c90";

  const handleClick = () => {
    if (disabled || isBroken) return;
    setIsPressed(true);
    playWaxCrack(muted);
    window.setTimeout(() => {
      setIsPressed(false);
      onBreak();
    }, 140);
  };

  const renderSymbolGraphic = () => {
    if (symbol === "crown") {
      return (
        <path
          d="M57,96 L53,68 L67,79 L80,60 L93,79 L107,68 L103,96 Z M59,102 L101,102"
          fill="none"
          stroke={embossColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
    if (symbol === "rose") {
      return (
        <g
          stroke={embossColor}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M80,98 C66,93 60,80 65,67 C68,60 75,58 80,63 C85,58 92,60 95,67 C100,80 94,93 80,98 Z" />
          <path d="M80,96 L80,108 M74,104 C77,102 83,102 86,104" />
          <circle cx="80" cy="76" r="6" />
        </g>
      );
    }
    return (
      <path
        d="M80,98 C80,98 58,84 58,69 C58,61 65,57 72,59 C76,60 79,63 80,66 C81,63 84,60 88,59 C95,57 102,61 102,69 C102,84 80,98 80,98 Z"
        fill="none"
        stroke={embossColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  const renderWaxBody = (clipId?: string, crackHighlight = false) => (
    <svg
      viewBox="0 0 160 160"
      className="w-full h-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`wax-${uid}`} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor={cLight} />
          <stop offset="38%" stopColor={cMid} />
          <stop offset="82%" stopColor={cDark} />
          <stop offset="100%" stopColor={cEdge} />
        </radialGradient>
        <radialGradient id={`crater-${uid}`} cx="62%" cy="66%" r="72%">
          <stop offset="0%" stopColor={cMid} />
          <stop offset="55%" stopColor={cDark} />
          <stop offset="100%" stopColor={cEdge} />
        </radialGradient>
        <linearGradient id={`sheen-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </linearGradient>
        <clipPath id={`left-clip-${uid}`}>
          <path d={LEFT_JAGGED_CLIP} />
        </clipPath>
        <clipPath id={`right-clip-${uid}`}>
          <path d={RIGHT_JAGGED_CLIP} />
        </clipPath>
      </defs>

      <g clipPath={clipId ? `url(#${clipId})` : undefined}>
        {/* Soft physical contact shadow directly under molten puddle */}
        <path
          d={ORGANIC_WAX_PATH}
          transform="translate(2, 6)"
          fill="rgba(16, 4, 8, 0.42)"
        />

        {/* Irregular molten outer wax cushion */}
        <path
          d={ORGANIC_WAX_PATH}
          fill={`url(#wax-${uid})`}
          stroke={cEdge}
          strokeWidth="1.2"
        />

        {/* Raised melted rim highlight */}
        <path
          d={INNER_WAX_RIDGE}
          fill="none"
          stroke={`url(#sheen-${uid})`}
          strokeWidth="3.5"
          opacity="0.7"
        />

        {/* Recessed die stamp cavity */}
        <circle
          cx="80"
          cy="80"
          r="43"
          fill={`url(#crater-${uid})`}
          stroke={cEdge}
          strokeWidth="2.2"
        />

        {/* Pressed inner brass/gold bevel rings */}
        <circle
          cx="80"
          cy="80"
          r="39"
          fill="none"
          stroke={embossColor}
          strokeWidth="1.3"
          opacity="0.75"
        />
        <circle
          cx="80"
          cy="80"
          r="33.5"
          fill="none"
          stroke={embossColor}
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.6"
        />

        {/* Embossed Emblem Relief */}
        {renderSymbolGraphic()}

        {/* Exposed fractured matte edge when split open */}
        {crackHighlight && (
          <path
            d={JAGGED_CRACK_LINE}
            fill="none"
            stroke={fractureEdge}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.88"
          />
        )}
      </g>
    </svg>
  );

  return (
    <div className="relative flex items-center justify-center w-32 h-32 sm:w-36 sm:h-36 select-none">
      {/* Subtle torn wax smudge / paper residue left behind when broken */}
      <AnimatePresence>
        {isBroken && (
          <motion.svg
            key="wax-residue"
            viewBox="0 0 160 160"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 0.72, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75 }}
            className="pointer-events-none absolute inset-0 w-full h-full"
            aria-hidden="true"
          >
            <path
              d="M80,26 C99,27 116,38 122,58 C128,77 121,105 103,118 C86,130 60,126 45,112 C30,97 30,68 42,50 C54,32 67,26 80,26 Z"
              fill={isGold ? "rgba(180,130,45,0.22)" : "rgba(130,22,42,0.2)"}
            />
            <circle
              cx="80"
              cy="80"
              r="34"
              fill="none"
              stroke={isGold ? "rgba(160,115,35,0.3)" : "rgba(115,20,38,0.26)"}
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
          </motion.svg>
        )}
      </AnimatePresence>

      {/* Main Intact Molten Wax Medallion */}
      {!isBroken && (
        <motion.button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setIsPressed(false);
          }}
          whileTap={{ scale: 0.92, y: 2 }}
          animate={{
            scale: isPressed ? 0.92 : isHovered ? 1.05 : 1,
          }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative group w-full h-full rounded-full focus:outline-none cursor-pointer"
          aria-label="ประทับตราครั่งเพื่อเปิดซองจดหมาย"
        >
          {/* Ambient golden rim aura when hovering */}
          <div
            className={`pointer-events-none absolute -inset-2 rounded-full transition-opacity duration-500 ${
              isHovered ? "opacity-80" : "opacity-35"
            }`}
            style={{
              background: isGold
                ? "radial-gradient(circle, rgba(251,191,36,0.32) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(225,29,72,0.26) 0%, transparent 70%)",
            }}
          />

          <div className="relative w-full h-full drop-shadow-[0_12px_20px_rgba(25,5,10,0.45)]">
            {renderWaxBody()}
          </div>
        </motion.button>
      )}

      {/* Realistic Jagged Shatter Animation on Break */}
      {isBroken && (
        <div className="pointer-events-none relative w-full h-full">
          {/* Left Jagged Fracture Shard */}
          <motion.div
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
            animate={{
              x: -36,
              y: -12,
              rotate: -19,
              opacity: 0,
              scale: 0.94,
            }}
            transition={{ duration: 1.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 drop-shadow-[0_10px_18px_rgba(0,0,0,0.35)]"
          >
            {renderWaxBody(`left-clip-${uid}`, true)}
          </motion.div>

          {/* Right Jagged Fracture Shard */}
          <motion.div
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
            animate={{
              x: 38,
              y: 16,
              rotate: 22,
              opacity: 0,
              scale: 0.94,
            }}
            transition={{ duration: 1.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 drop-shadow-[0_10px_18px_rgba(0,0,0,0.35)]"
          >
            {renderWaxBody(`right-clip-${uid}`, true)}
          </motion.div>

          {/* Small Flying Wax Crumbs / Chips */}
          {WAX_SHARD_CHIPS.map((chip, idx) => (
            <motion.span
              key={idx}
              initial={{ x: 0, y: 0, opacity: 0.95, scale: 1, rotate: 0 }}
              animate={{
                x: chip.x * 1.65,
                y: chip.y * 1.65 + 16,
                opacity: 0,
                scale: 0.4,
                rotate: chip.rot,
              }}
              transition={{
                duration: 1.05,
                delay: chip.delay,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                width: `${chip.size}px`,
                height: `${Math.max(4, chip.size - 2)}px`,
                background: cMid,
                borderRadius: "42% 58% 65% 35% / 45% 35% 65% 55%",
                boxShadow: "0 2px 4px rgba(0,0,0,0.35)",
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            />
          ))}
        </div>
      )}
    </div>
  );
}
