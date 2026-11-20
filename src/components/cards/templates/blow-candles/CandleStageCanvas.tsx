"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { BlowCandlesStage } from "./types";

interface CandleStageCanvasProps {
  candles: boolean[];
  windStrength: number;
  cakeOpened: boolean;
  stage: BlowCandlesStage;
  onCandleTap?: (index: number) => void;
  onTouchHoldStart?: () => void;
  onTouchHoldEnd?: () => void;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
  color: string;
  kind: "ember" | "smoke" | "breeze";
}

const CANDLE_POSITIONS = [
  { idx: 0, x: 134, y: 125, height: 44, tilt: -2 },
  { idx: 1, x: 156, y: 120, height: 48, tilt: -1 },
  { idx: 2, x: 180, y: 127, height: 54, tilt: 0 },
  { idx: 3, x: 204, y: 120, height: 48, tilt: 1 },
  { idx: 4, x: 226, y: 125, height: 44, tilt: 2 },
];

const CANDLE_RENDER_ORDER = [...CANDLE_POSITIONS].sort((a, b) => a.y - b.y);

export default function CandleStageCanvas({
  candles,
  windStrength,
  cakeOpened,
  stage,
  onCandleTap,
  onTouchHoldStart,
  onTouchHoldEnd,
}: CandleStageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<EmberParticle[]>([]);
  const prevCandlesRef = useRef<boolean[]>(candles);
  const [holding, setHolding] = useState(false);

  const litCount = useMemo(
    () => candles.filter(Boolean).length,
    [candles]
  );

  // Spawn smoke & golden wish sparks whenever a candle extinguishes
  useEffect(() => {
    const prev = prevCandlesRef.current;
    candles.forEach((isLit, idx) => {
      if (prev[idx] && !isLit) {
        const pos = CANDLE_POSITIONS[idx];
        const baseX = (pos.x / 360) * 360;
        const baseY = pos.y - pos.height - 6;

        for (let i = 0; i < 16; i++) {
          particlesRef.current.push({
            x: baseX + (Math.random() - 0.5) * 10,
            y: baseY + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 0.9,
            vy: -0.7 - Math.random() * 1.4,
            radius: 3 + Math.random() * 6,
            alpha: 0.45 + Math.random() * 0.25,
            decay: 0.0055 + Math.random() * 0.004,
            color: i % 2 === 0 ? "226, 212, 240" : "245, 224, 210",
            kind: "smoke",
          });
        }

        for (let i = 0; i < 14; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
          const speed = 1.2 + Math.random() * 2.4;
          particlesRef.current.push({
            x: baseX,
            y: baseY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 1.4 + Math.random() * 2.2,
            alpha: 0.95,
            decay: 0.014 + Math.random() * 0.012,
            color: i % 3 === 0 ? "255, 232, 163" : "251, 146, 178",
            kind: "ember",
          });
        }
      }
    });
    prevCandlesRef.current = [...candles];
  }, [candles]);

  // Continuous ambient particle loop (embers, smoke ribbons, wind streaks)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let tick = 0;

    const render = () => {
      tick += 1;
      const w = 360;
      const h = 360;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, w, h);

      // Ambient warm flame embers
      if (litCount > 0 && tick % 4 === 0) {
        const litIndices = candles
          .map((on, i) => (on ? i : -1))
          .filter((i) => i >= 0);
        const pick =
          litIndices[Math.floor(Math.random() * litIndices.length)];
        if (pick !== undefined) {
          const pos = CANDLE_POSITIONS[pick];
          particlesRef.current.push({
            x: pos.x + (Math.random() - 0.5) * 12,
            y: pos.y - pos.height - 16,
            vx: windStrength * 2.4 + (Math.random() - 0.5) * 0.5,
            vy: -0.6 - Math.random() * 1.1,
            radius: 1 + Math.random() * 1.8,
            alpha: 0.78,
            decay: 0.012 + Math.random() * 0.01,
            color: Math.random() > 0.35 ? "253, 211, 128" : "253, 164, 175",
            kind: "ember",
          });
        }
      }

      // Sweeping luminous wind streaks while blowing
      if (windStrength > 0.1 && tick % 2 === 0) {
        particlesRef.current.push({
          x: 24 + Math.random() * 48,
          y: 62 + Math.random() * 96,
          vx: 3.4 + windStrength * 5.2,
          vy: (Math.random() - 0.5) * 0.8,
          radius: 1.5 + Math.random() * 1.5,
          alpha: Math.min(0.68, windStrength * 0.75),
          decay: 0.025,
          color: "186, 230, 253",
          kind: "breeze",
        });
      }

      // Celebratory floating stardust when cake chamber opens
      if ((cakeOpened || stage === "grand_celebration") && tick % 5 === 0) {
        particlesRef.current.push({
          x: 90 + Math.random() * 180,
          y: 205 + Math.random() * 40,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -0.9 - Math.random() * 1.2,
          radius: 1.2 + Math.random() * 2.1,
          alpha: 0.85,
          decay: 0.011,
          color: Math.random() > 0.5 ? "253, 224, 136" : "251, 182, 206",
          kind: "ember",
        });
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.kind === "smoke") {
          p.vx += Math.sin(tick * 0.08 + p.y * 0.05) * 0.04;
          p.radius += 0.11;
        }

        if (p.alpha <= 0.01) return false;

        if (p.kind === "breeze") {
          ctx.strokeStyle = `rgba(${p.color}, ${p.alpha})`;
          ctx.lineWidth = p.radius;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 16 - windStrength * 14, p.y + 1.5);
          ctx.stroke();
        } else {
          const grad = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            p.radius * (p.kind === "ember" ? 2.4 : 1.4)
          );
          grad.addColorStop(0, `rgba(${p.color}, ${p.alpha})`);
          grad.addColorStop(1, `rgba(${p.color}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(
            p.x,
            p.y,
            p.radius * (p.kind === "ember" ? 2.4 : 1.4),
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        return true;
      });

      if (particlesRef.current.length > 140) {
        particlesRef.current.splice(0, particlesRef.current.length - 140);
      }

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(rafId);
  }, [candles, litCount, windStrength, cakeOpened, stage]);

  const handlePointerDown = () => {
    setHolding(true);
    onTouchHoldStart?.();
  };

  const handlePointerUpOrCancel = () => {
    setHolding(false);
    onTouchHoldEnd?.();
  };

  const candleGlowOpacity = Math.min(1, litCount * 0.2);
  const flameTiltDeg = Math.min(44, windStrength * 42);
  const flameScaleY = Math.max(0.42, 1 - windStrength * 0.56);

  return (
    <div
      className="relative mx-auto flex h-[252px] w-[252px] select-none items-center justify-center sm:h-[284px] sm:w-[284px]"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUpOrCancel}
      onPointerLeave={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
    >
      {/* Dynamic candlelight radial stage bloom */}
      <div
        className="pointer-events-none absolute inset-4 rounded-full blur-3xl transition-all duration-700"
        style={{
          background:
            litCount > 0
              ? `radial-gradient(circle, rgba(251,191,36,${0.28 * candleGlowOpacity}) 0%, rgba(244,114,182,${0.22 * candleGlowOpacity}) 46%, transparent 75%)`
              : "radial-gradient(circle, rgba(167,139,250,0.22) 0%, rgba(244,114,182,0.12) 48%, transparent 74%)",
        }}
      />

      {/* Tactile wind hold pulse ring */}
      {(holding || windStrength > 0.14) && (
        <div
          className="pointer-events-none absolute inset-6 animate-ping rounded-full border border-sky-200/35"
          style={{ animationDuration: "1.4s" }}
        />
      )}

      {/* Particle overlay canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      />

      {/* Luxury 3-Tier Royal Birthday Cake SVG */}
      <svg
        viewBox="0 0 360 360"
        className="relative z-10 h-full w-full drop-shadow-[0_24px_45px_rgba(0,0,0,0.65)]"
        aria-label="Birthday cake stage"
      >
        <defs>
          <radialGradient id="pedestalRim" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="48%" stopColor="#e5b869" />
            <stop offset="100%" stopColor="#925e21" />
          </radialGradient>

          <linearGradient id="pedestalStem" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c4d18" />
            <stop offset="35%" stopColor="#f8df9d" />
            <stop offset="65%" stopColor="#d49e46" />
            <stop offset="100%" stopColor="#693f11" />
          </linearGradient>

          <linearGradient id="cakeTierBody" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d99a9e" />
            <stop offset="28%" stopColor="#fbe3df" />
            <stop offset="56%" stopColor="#fff7f5" />
            <stop offset="85%" stopColor="#eec1c7" />
            <stop offset="100%" stopColor="#b97682" />
          </linearGradient>

          <linearGradient id="cakeIcingGlaze" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff8f1" />
            <stop offset="55%" stopColor="#f6cfd5" />
            <stop offset="100%" stopColor="#d88f9e" />
          </linearGradient>

          <linearGradient id="goldRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a6722a" />
            <stop offset="42%" stopColor="#fde69b" />
            <stop offset="65%" stopColor="#f3c169" />
            <stop offset="100%" stopColor="#9e6b22" />
          </linearGradient>

          <linearGradient id="candleStick" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d8b468" />
            <stop offset="45%" stopColor="#fff7e2" />
            <stop offset="100%" stopColor="#b88446" />
          </linearGradient>

          <radialGradient id="flameOuter" cx="50%" cy="60%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="32%" stopColor="#fde047" />
            <stop offset="72%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="rgba(244,63,94,0)" />
          </radialGradient>

          <radialGradient id="secretPrismGlow" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#f9a8d4" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground Shadow */}
        <ellipse
          cx="180"
          cy="334"
          rx="126"
          ry="16"
          fill="rgba(6, 4, 14, 0.72)"
        />

        {/* Golden Fluted Pedestal Stand */}
        <path
          d="M150 288 C154 306, 142 320, 118 326 L242 326 C218 320, 206 306, 210 288 Z"
          fill="url(#pedestalStem)"
        />
        <ellipse cx="180" cy="326" rx="64" ry="8" fill="url(#pedestalRim)" />
        <ellipse cx="180" cy="284" rx="134" ry="18" fill="url(#pedestalRim)" />
        <ellipse
          cx="180"
          cy="281"
          rx="126"
          ry="14"
          fill="#261326"
          opacity="0.45"
        />

        {/* Bottom Grand Tier */}
        <path
          d="M66 226 L66 276 C66 289, 294 289, 294 276 L294 226 Z"
          fill="url(#cakeTierBody)"
        />
        <path
          d="M66 270 C66 282, 294 282, 294 270"
          fill="none"
          stroke="url(#goldRibbon)"
          strokeWidth="6"
        />
        <ellipse cx="180" cy="226" rx="114" ry="16" fill="#fff3ee" />
        {/* Bottom Tier Icing Drips */}
        <path
          d="M66 226 C66 239, 82 246, 86 256 C90 264, 98 258, 102 246 C106 236, 120 242, 124 260 C128 270, 138 265, 142 248 C146 238, 162 244, 166 256 C171 268, 184 264, 189 248 C194 238, 208 242, 214 260 C219 270, 230 264, 234 248 C238 238, 254 242, 259 256 C264 266, 274 260, 278 246 C282 238, 294 236, 294 226 Z"
          fill="url(#cakeIcingGlaze)"
          opacity="0.92"
        />
        {/* Couture Golden Filigree Swoops & Sugar Jewels on Bottom Tier */}
        <path
          d="M74 252 Q110 272 145 256 Q180 275 215 256 Q250 272 286 252"
          fill="none"
          stroke="url(#goldRibbon)"
          strokeWidth="1.6"
          strokeOpacity="0.85"
        />
        {[110, 145, 180, 215, 250].map((jx, idx) => (
          <g key={`jewel-b-${idx}`} transform={`translate(${jx} ${idx % 2 === 0 ? 265 : 256})`}>
            <polygon points="0,-4.5 3.5,0 0,4.5 -3.5,0" fill="#fde68a" stroke="#b45309" strokeWidth="0.6" />
          </g>
        ))}

        {/* Middle Royal Tier */}
        <path
          d="M90 170 L90 220 C90 232, 270 232, 270 220 L270 170 Z"
          fill="url(#cakeTierBody)"
        />
        <path
          d="M90 214 C90 225, 270 225, 270 214"
          fill="none"
          stroke="url(#goldRibbon)"
          strokeWidth="4.5"
        />
        <ellipse cx="180" cy="170" rx="90" ry="14" fill="#fff5f2" />
        {/* Middle Tier Pearl Trim */}
        {Array.from({ length: 15 }).map((_, idx) => {
          const t = idx / 14;
          const px = 98 + t * 164;
          const py = 221 + Math.sin(t * Math.PI) * 5;
          return (
            <circle
              key={`pearl-m-${idx}`}
              cx={px}
              cy={py}
              r="3.2"
              fill="#fffaf0"
              stroke="#e9c17a"
              strokeWidth="0.7"
            />
          );
        })}

        {/* Cameo Oval "Make a Wish" Medallion */}
        <g transform="translate(180 198)">
          <ellipse
            rx="38"
            ry="15"
            fill="#2b1224"
            stroke="url(#goldRibbon)"
            strokeWidth="2.4"
          />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fill="#fde6a8"
            fontSize="9.5"
            fontFamily="Georgia, serif"
            fontStyle="italic"
            letterSpacing="0.8"
          >
            Make a Wish
          </text>
        </g>

        {/* Top Crown Tier */}
        <path
          d="M114 124 L114 166 C114 176, 246 176, 246 166 L246 124 Z"
          fill="url(#cakeTierBody)"
        />
        <ellipse cx="180" cy="124" rx="66" ry="12" fill="#fff8f5" />
        <path
          d="M114 124 C114 134, 128 140, 133 148 C137 154, 145 148, 149 138 C154 132, 166 136, 171 148 C176 156, 185 154, 190 141 C195 133, 206 136, 211 149 C216 156, 224 150, 228 140 C233 134, 246 132, 246 124 Z"
          fill="url(#cakeIcingGlaze)"
          opacity="0.95"
        />

        {/* Subtle Pearl Garland on Top Rim */}
        {Array.from({ length: 11 }).map((_, idx) => {
          const t = idx / 10;
          const px = 121 + t * 118;
          const py = 167 + Math.sin(t * Math.PI) * 3.5;
          return (
            <circle
              key={`pearl-t-${idx}`}
              cx={px}
              cy={py}
              r="2.6"
              fill="#fffaf0"
              stroke="#eab96a"
              strokeWidth="0.6"
            />
          );
        })}

        {/* Cake Treasure Chamber Radiance when opened */}
        {cakeOpened && (
          <g>
            <ellipse
              cx="180"
              cy="158"
              rx="85"
              ry="74"
              fill="url(#secretPrismGlow)"
            />
            <polygon
              points="128,162 158,72 202,72 232,162"
              fill="rgba(254, 240, 138, 0.16)"
            />
          </g>
        )}

        {/* Warm Candlelight Reflection on Top Cake Surface */}
        {litCount > 0 && (
          <ellipse
            cx="180"
            cy="124"
            rx="54"
            ry="8"
            fill="#fde68a"
            opacity={0.14 * Math.min(1, litCount * 0.25)}
          />
        )}

        {/* 5 Interactive Birthday Candles Planted in Frosting */}
        {CANDLE_RENDER_ORDER.map((pos) => {
          const isLit = Boolean(candles[pos.idx]);
          const topY = pos.y - pos.height;
          return (
            <g
              key={pos.idx}
              transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.tilt})`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onCandleTap?.(pos.idx);
              }}
            >
              {/* Invisible wide touch hit area for easy mobile tapping */}
              <rect
                x="-14"
                y={-pos.height - 34}
                width="28"
                height={pos.height + 38}
                fill="transparent"
              />

              {/* Planted Whipped Cream Rosette & Gold Socket Ring */}
              <ellipse cx="0" cy="1.8" rx="9" ry="3.4" fill="rgba(160, 90, 108, 0.34)" />
              <ellipse cx="-3.6" cy="0.6" rx="4.2" ry="2.4" fill="#fff5f2" />
              <ellipse cx="3.6" cy="0.6" rx="4.2" ry="2.4" fill="#fff5f2" />
              <ellipse
                cx="0"
                cy="0.8"
                rx="7.2"
                ry="2.5"
                fill="#ffe9e4"
                stroke="#e9b872"
                strokeWidth="0.7"
              />

              {/* Candle Body sunk cleanly into cream collar */}
              <rect
                x="-5"
                y={-pos.height}
                width="10"
                height={pos.height + 1}
                rx="3.8"
                fill="url(#candleStick)"
              />
              {/* Spiral Gold Ribbon Stripe */}
              <path
                d={`M-5 ${-pos.height + 10} L5 ${-pos.height + 16} M-5 ${-pos.height + 24} L5 ${-pos.height + 30} M-5 ${-pos.height + 38} L5 ${-pos.height + 44}`}
                stroke="#d97706"
                strokeOpacity="0.35"
                strokeWidth="2.2"
              />

              {/* Wick */}
              <line
                x1="0"
                y1={-pos.height}
                x2={windStrength * 2.5}
                y2={-pos.height - 6}
                stroke={isLit ? "#451a03" : "#78350f"}
                strokeWidth="1.6"
                strokeLinecap="round"
              />

              {/* Extinguished ember dot */}
              {!isLit && (
                <circle
                  cx="0"
                  cy={-pos.height - 6}
                  r="1.7"
                  fill="#fb7185"
                  opacity="0.7"
                />
              )}

              {/* Lit Flame + Reactive Wind Lean */}
              {isLit && (
                <g
                  transform={`translate(0, ${-pos.height - 7}) rotate(${flameTiltDeg}) scale(1, ${flameScaleY})`}
                >
                  {/* Warm Outer Aura */}
                  <circle cx="0" cy="-12" r="22" fill="url(#flameOuter)" opacity="0.45" />
                  {/* Main Outer Teardrop */}
                  <path
                    d="M0,-28 C7,-18 9,-8 0,0 C-9,-8 -7,-18 0,-28 Z"
                    fill="#fb923c"
                    className="animate-pulse"
                  />
                  {/* Golden Inner Flame */}
                  <path
                    d="M0,-22 C4.5,-14 5.5,-7 0,-1 C-5.5,-7 -4.5,-14 0,-22 Z"
                    fill="#fde047"
                  />
                  {/* Pure White-Blue Core */}
                  <ellipse cx="0" cy="-6" rx="2" ry="4.8" fill="#ffffff" />
                </g>
              )}

              {/* Subtle top wax highlight */}
              <ellipse
                cx="0"
                cy={-pos.height + 1}
                rx="4.8"
                ry="1.8"
                fill="#fffbeb"
              />
              <circle cx="0" cy={topY - pos.y} r="0" fill="none" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
