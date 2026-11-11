"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playWaxCrack } from "./waxSound";

interface WaxSealProps {
  isBroken: boolean;
  onBreak: () => void;
  color?: "ruby" | "gold";
  symbol?: "heart" | "rose" | "crown";
  disabled?: boolean;
}

export default function WaxSeal({
  isBroken,
  onBreak,
  color = "ruby",
  symbol = "heart",
  disabled = false,
}: WaxSealProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isBroken) return;
    playWaxCrack();
    onBreak();
  };

  const isRuby = color === "ruby";

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative cursor-pointer select-none group flex items-center justify-center"
      style={{ width: "96px", height: "96px" }}
    >
      <AnimatePresence>
        {!isBroken ? (
          // UNBROKEN 3D WAX SEAL
          <motion.div
            key="unbroken-seal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{
              scale: isHovered ? 1.08 : 1,
              opacity: 1,
            }}
            exit={{ scale: 1.15, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative flex items-center justify-center w-24 h-24"
          >
            {/* Ambient Shadow */}
            <div
              className="absolute inset-2 rounded-full blur-md opacity-70"
              style={{
                backgroundColor: isRuby ? "#3a0505" : "#4a3b10",
                transform: "translateY(8px)",
              }}
            />

            {/* Organic Wax Outer Drips (SVG) */}
            <svg
              viewBox="0 0 100 100"
              className="w-24 h-24 drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
            >
              <defs>
                <radialGradient id="waxGrad" cx="35%" cy="30%" r="70%">
                  {isRuby ? (
                    <>
                      <stop offset="0%" stopColor="#c53030" />
                      <stop offset="45%" stopColor="#881337" />
                      <stop offset="85%" stopColor="#4c0519" />
                      <stop offset="100%" stopColor="#25020c" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#fff3b0" />
                      <stop offset="40%" stopColor="#d4af37" />
                      <stop offset="80%" stopColor="#996515" />
                      <stop offset="100%" stopColor="#593b0a" />
                    </>
                  )}
                </radialGradient>
                <filter id="waxGlow">
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Natural Organic Wax Outline with Dripped Curves */}
              <path
                d="M50 4 C68 3, 86 12, 94 28 C102 44, 98 68, 88 82 C78 96, 56 98, 40 96 C24 94, 6 86, 3 66 C0 46, 8 28, 22 14 C36 0, 42 5, 50 4 Z"
                fill="url(#waxGrad)"
              />

              {/* Inner Raised Ring */}
              <circle
                cx="50"
                cy="50"
                r="34"
                fill="none"
                stroke={isRuby ? "#e11d48" : "#fef08a"}
                strokeWidth="1.8"
                opacity="0.55"
              />
              <circle
                cx="50"
                cy="50"
                r="31"
                fill={isRuby ? "#700f28" : "#a17a26"}
                stroke={isRuby ? "#3a0312" : "#4a3b10"}
                strokeWidth="2"
              />

              {/* Candlelight Specular Highlight Arc */}
              <path
                d="M 30 25 A 28 28 0 0 1 70 25"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.45"
              />
            </svg>

            {/* Embossed Vector Symbol in Center (No Emojis) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {symbol === "heart" && (
                <svg
                  viewBox="0 0 24 24"
                  className="w-7 h-7 drop-shadow-[0_1.5px_1px_rgba(255,255,255,0.35)]"
                  fill="none"
                  stroke={isRuby ? "#fecdd3" : "#fef08a"}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              )}
              {symbol === "rose" && (
                <svg
                  viewBox="0 0 24 24"
                  className="w-7 h-7 drop-shadow-[0_1.5px_1px_rgba(255,255,255,0.35)]"
                  fill="none"
                  stroke={isRuby ? "#fecdd3" : "#fef08a"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22v-8" />
                  <path d="M9 18c1.5-1 3-1 3-4" />
                  <path d="M15 16c-1.5-1-3-1-3-4" />
                  <circle cx="12" cy="7" r="5" />
                  <path d="M12 4a3 3 0 0 1 3 3c0 1.66-1.34 3-3 3s-3-1.34-3-3a3 3 0 0 1 3-3z" />
                </svg>
              )}
              {symbol === "crown" && (
                <svg
                  viewBox="0 0 24 24"
                  className="w-7 h-7 drop-shadow-[0_1.5px_1px_rgba(255,255,255,0.35)]"
                  fill="none"
                  stroke={isRuby ? "#fecdd3" : "#fef08a"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 18h18M4 18l2-10 5 4 3-6 3 6 5-4 2 10H4z" />
                  <circle cx="6" cy="8" r="1" fill={isRuby ? "#fecdd3" : "#fef08a"} />
                  <circle cx="14" cy="6" r="1" fill={isRuby ? "#fecdd3" : "#fef08a"} />
                  <circle cx="20" cy="8" r="1" fill={isRuby ? "#fecdd3" : "#fef08a"} />
                </svg>
              )}
            </div>

            {/* Shimmer Hint on Hover */}
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.15, 0.9] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -inset-1 rounded-full border border-amber-300/60 pointer-events-none"
              />
            )}
          </motion.div>
        ) : (
          // BROKEN WAX SEAL (FRACTURED PIECES)
          <div key="broken-seal" className="relative w-24 h-24 flex items-center justify-center">
            {/* Left Fracture Half */}
            <motion.div
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: -28, y: 12, rotate: -26, opacity: 0.85 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="absolute left-0 w-12 h-24 overflow-hidden"
            >
              <div
                className="w-24 h-24 rounded-full"
                style={{
                  background: isRuby
                    ? "radial-gradient(circle at 35% 30%, #881337 0%, #4c0519 70%, #25020c 100%)"
                    : "radial-gradient(circle at 35% 30%, #d4af37 0%, #996515 70%, #593b0a 100%)",
                  boxShadow: "0 6px 12px rgba(0,0,0,0.5)",
                }}
              />
            </motion.div>

            {/* Right Fracture Half */}
            <motion.div
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: 28, y: 8, rotate: 22, opacity: 0.85 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="absolute right-0 w-12 h-24 overflow-hidden"
            >
              <div
                className="w-24 h-24 rounded-full -ml-12"
                style={{
                  background: isRuby
                    ? "radial-gradient(circle at 35% 30%, #881337 0%, #4c0519 70%, #25020c 100%)"
                    : "radial-gradient(circle at 35% 30%, #d4af37 0%, #996515 70%, #593b0a 100%)",
                  boxShadow: "0 6px 12px rgba(0,0,0,0.5)",
                }}
              />
            </motion.div>

            {/* Fracture Sparkle Burst */}
            <motion.div
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute w-8 h-8 rounded-full bg-amber-200/80 blur-sm pointer-events-none"
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

