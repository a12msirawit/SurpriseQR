"use client";

import React, { useId } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Deterministic pseudo-random in [0, 1) so the cake looks identical every render. */
export function seeded(i: number): number {
  const x = Math.sin(i * 9301.17 + 49297.31) * 233280;
  return x - Math.floor(x);
}

const VIEW_W = 320;
const VIEW_H = 270;

const BOTTOM = { cx: 160, top: 168, bottom: 236, rx: 118, ry: 18 };
const TOP = { cx: 160, top: 104, bottom: 166, rx: 78, ry: 13 };

function tierBody(t: typeof BOTTOM) {
  return `M ${t.cx - t.rx} ${t.top} L ${t.cx - t.rx} ${t.bottom} A ${t.rx} ${t.ry} 0 0 0 ${t.cx + t.rx} ${t.bottom} L ${t.cx + t.rx} ${t.top} Z`;
}

/** Cream frosting cap: the top ellipse plus rounded drips along the front edge. */
function frostingPath(t: typeof BOTTOM, segments: number, seedBase: number) {
  const pts: Array<[number, number]> = [];
  for (let k = 0; k <= segments; k++) {
    const x = t.cx - t.rx + (2 * t.rx * k) / segments;
    const nx = (x - t.cx) / t.rx;
    const y = t.top + t.ry * Math.sqrt(Math.max(0, 1 - nx * nx));
    pts.push([x, y]);
  }
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1];
    const [x1, y1] = pts[k];
    const long = k % 2 === 1;
    const len = long ? 12 + seeded(seedBase + k) * 16 : 3 + seeded(seedBase + k) * 4;
    d += ` C ${x0} ${y0 + len} ${x1} ${y1 + len} ${x1} ${y1}`;
  }
  d += ` A ${t.rx} ${t.ry} 0 0 0 ${t.cx - t.rx} ${t.top} Z`;
  return d;
}

function beads(t: typeof BOTTOM, count: number) {
  const out: Array<[number, number]> = [];
  for (let i = 0; i <= count; i++) {
    const theta = Math.PI - (Math.PI * i) / count;
    out.push([t.cx + t.rx * Math.cos(theta), t.bottom + t.ry * Math.sin(theta)]);
  }
  return out;
}

export function candlePositions(count: number): Array<[number, number]> {
  const n = Math.max(1, count);
  if (n <= 5) {
    const spacing = Math.min(26, 120 / n);
    return Array.from({ length: n }, (_, i) => [TOP.cx + (i - (n - 1) / 2) * spacing, TOP.top + 3]);
  }
  const back = Math.floor(n / 2);
  const front = n - back;
  const pos: Array<[number, number]> = [];
  for (let i = 0; i < back; i++) {
    pos.push([TOP.cx + (i - (back - 1) / 2) * 24, TOP.top - 4]);
  }
  for (let i = 0; i < front; i++) {
    pos.push([TOP.cx + (i - (front - 1) / 2) * 22, TOP.top + 6]);
  }
  return pos;
}

interface VelvetCakeSvgProps {
  lit: boolean[];
  plaqueText: string;
  /** Interactive candles (wish stage). */
  candlesInteractive?: boolean;
  onCandleHit?: (index: number) => void;
  onPlaqueClick?: () => void;
  className?: string;
}

/**
 * Two-tier red-velvet cake drawn in SVG with cylindrical shading, cream drips,
 * gold bead piping and striped candles whose flames flicker independently.
 */
export default function VelvetCakeSvg({
  lit,
  plaqueText,
  candlesInteractive = false,
  onCandleHit,
  onPlaqueClick,
  className,
}: VelvetCakeSvgProps) {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const positions = candlePositions(lit.length);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="เค้กวันเกิด"
    >
      <defs>
        <linearGradient id={`${id}-velvet`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#2c0a14" />
          <stop offset="22%" stopColor="#6e1d31" />
          <stop offset="46%" stopColor="#a3344d" />
          <stop offset="58%" stopColor="#8f2b42" />
          <stop offset="82%" stopColor="#5a1627" />
          <stop offset="100%" stopColor="#22070f" />
        </linearGradient>
        <linearGradient id={`${id}-cream`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#d9c3a5" />
          <stop offset="45%" stopColor="#fbf1e2" />
          <stop offset="100%" stopColor="#cdb595" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f7e3a8" />
          <stop offset="50%" stopColor="#c99a3f" />
          <stop offset="100%" stopColor="#8a6424" />
        </linearGradient>
        <linearGradient id={`${id}-plate`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#6b4c1d" />
          <stop offset="40%" stopColor="#e9cf8b" />
          <stop offset="60%" stopColor="#f8e7b5" />
          <stop offset="100%" stopColor="#6b4c1d" />
        </linearGradient>
        <pattern id={`${id}-stripe`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="7" height="7" fill="#fbf4e6" />
          <rect width="2.6" height="7" fill="#d4ad5c" />
        </pattern>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor="rgba(255,214,140,0.75)" />
          <stop offset="45%" stopColor="rgba(255,170,80,0.25)" />
          <stop offset="100%" stopColor="rgba(255,150,60,0)" />
        </radialGradient>
        <linearGradient id={`${id}-flame`} x1="0" x2="0" y1="1" y2="0">
          <stop offset="0%" stopColor="#ff8a2a" />
          <stop offset="55%" stopColor="#ffc35a" />
          <stop offset="100%" stopColor="#fff1bf" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={`${id}-smoke`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      {/* Cast shadow on the table */}
      <ellipse cx="160" cy="254" rx="150" ry="12" fill="rgba(0,0,0,0.55)" filter={`url(#${id}-soft)`} />

      {/* Gold cake stand */}
      <ellipse cx="160" cy="242" rx="148" ry="24" fill={`url(#${id}-plate)`} />
      <ellipse cx="160" cy="238" rx="136" ry="19" fill="#f3e6c8" opacity="0.9" />

      {/* Bottom tier */}
      <path d={tierBody(BOTTOM)} fill={`url(#${id}-velvet)`} />
      <path d={frostingPath(BOTTOM, 14, 11)} fill={`url(#${id}-cream)`} />
      {beads(BOTTOM, 26).map(([x, y], i) => (
        <circle key={`bb-${i}`} cx={x} cy={y - 1} r="3.3" fill={`url(#${id}-gold)`} />
      ))}

      {/* Gold age plaque */}
      <g
        onClick={onPlaqueClick}
        style={{ cursor: onPlaqueClick ? "pointer" : "default" }}
      >
        <rect x="128" y="196" width="64" height="26" rx="6" fill={`url(#${id}-gold)`} />
        <rect x="131" y="199" width="58" height="20" rx="4" fill="none" stroke="rgba(255,248,225,0.6)" strokeWidth="0.8" />
        <text
          x="160"
          y="214"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="13"
          fontWeight="700"
          fill="#3b1a0a"
          letterSpacing="1.5"
        >
          {plaqueText}
        </text>
      </g>

      {/* Top tier */}
      <path d={tierBody(TOP)} fill={`url(#${id}-velvet)`} />
      <path d={frostingPath(TOP, 10, 47)} fill={`url(#${id}-cream)`} />
      {beads(TOP, 18).map(([x, y], i) => (
        <circle key={`tb-${i}`} cx={x} cy={y - 1} r="2.6" fill={`url(#${id}-gold)`} />
      ))}

      {/* Candles */}
      {positions.map(([x, y], i) => {
        const isLit = lit[i];
        const flameY = y - 40;
        return (
          <g key={`candle-${i}`}>
            {/* candle glow */}
            <AnimatePresence>
              {isLit && (
                <motion.circle
                  cx={x}
                  cy={flameY - 9}
                  r="30"
                  fill={`url(#${id}-glow)`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.75, 1, 0.82, 0.95, 0.75] }}
                  exit={{ opacity: 0, transition: { duration: 0.35 } }}
                  transition={{ duration: 1.6 + seeded(i) * 0.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{ pointerEvents: "none" }}
                />
              )}
            </AnimatePresence>

            <rect x={x - 3.6} y={y - 36} width="7.2" height="36" rx="1.6" fill={`url(#${id}-stripe)`} />
            <rect x={x - 3.6} y={y - 36} width="2.2" height="36" fill="rgba(255,255,255,0.25)" />
            <line x1={x} y1={y - 36} x2={x} y2={y - 41} stroke="#2a1a10" strokeWidth="1.2" strokeLinecap="round" />

            <AnimatePresence>
              {isLit && (
                <motion.g
                  key={`flame-${i}`}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{
                    opacity: 1,
                    scaleY: [1, 1.14, 0.93, 1.07, 0.97, 1],
                    scaleX: [1, 0.94, 1.05, 0.97, 1.02, 1],
                    skewX: [0, 3, -2.5, 1.5, -1, 0],
                  }}
                  exit={{ opacity: 0, scaleY: 0.1, scaleX: 0.5, transition: { duration: 0.22 } }}
                  transition={{
                    duration: 0.9 + seeded(i + 3) * 0.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ transformBox: "fill-box", transformOrigin: "50% 100%", pointerEvents: "none" }}
                >
                  <path
                    transform={`translate(${x} ${flameY})`}
                    d="M0 0 C -5.4 -4 -6 -11.5 0 -23 C 6 -11.5 5.4 -4 0 0 Z"
                    fill={`url(#${id}-flame)`}
                  />
                  <path
                    transform={`translate(${x} ${flameY})`}
                    d="M0 -1 C -2.4 -3 -2.6 -8 0 -13 C 2.6 -8 2.4 -3 0 -1 Z"
                    fill="#fffbe8"
                    opacity="0.95"
                  />
                  <circle cx={x} cy={flameY - 1} r="1.6" fill="#5aa0ff" opacity="0.55" />
                </motion.g>
              )}
            </AnimatePresence>

            {/* Smoke curl after the flame dies */}
            {!isLit && (
              <g style={{ pointerEvents: "none" }} filter={`url(#${id}-smoke)`}>
                {[0, 1, 2, 3].map((p) => (
                  <motion.circle
                    key={`smoke-${i}-${p}`}
                    cx={x}
                    cy={y - 42}
                    r={2.4 + p * 0.6}
                    fill="rgba(235,232,228,0.75)"
                    initial={{ opacity: 0, y: 0, x: 0, scale: 0.6 }}
                    animate={{
                      opacity: [0, 0.75, 0.45, 0],
                      y: [0, -22, -48, -78],
                      x: [0, 5 - p * 2, -6 + p, 4],
                      scale: [0.6, 1.2, 1.9, 2.6],
                    }}
                    transition={{ duration: 2.4, delay: p * 0.22, ease: "easeOut" }}
                  />
                ))}
              </g>
            )}

            {/* Generous invisible hit target for tapping / swiping a flame */}
            {candlesInteractive && isLit && (
              <rect
                data-candle={i}
                x={x - 13}
                y={flameY - 34}
                width="26"
                height="46"
                fill="transparent"
                style={{ cursor: "pointer" }}
                onPointerDown={(e) => {
                  try {
                    (e.target as Element).releasePointerCapture?.(e.pointerId);
                  } catch {
                    /* ignore */
                  }
                  onCandleHit?.(i);
                }}
                onPointerEnter={(e) => {
                  if (e.buttons > 0) onCandleHit?.(i);
                }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

