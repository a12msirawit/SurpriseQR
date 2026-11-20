"use client";

import React, { useEffect, useRef, useState } from "react";
import { Heart, Sparkles, Star } from "lucide-react";
import { playBalloonPop } from "./blowCandlesSound";

interface CelebrationLayerProps {
  active: boolean;
  muted?: boolean;
  burstSignal?: number;
  onBalloonPop?: (poppedCount: number) => void;
}

interface BalloonSpec {
  id: number;
  leftPercent: number;
  delaySec: number;
  durationSec: number;
  hueFrom: string;
  hueTo: string;
  icon: "star" | "heart" | "sparkle";
}

const BALLOONS: BalloonSpec[] = [
  {
    id: 1,
    leftPercent: 10,
    delaySec: 0,
    durationSec: 7.4,
    hueFrom: "#fda4af",
    hueTo: "#e11d48",
    icon: "heart",
  },
  {
    id: 2,
    leftPercent: 28,
    delaySec: 1.1,
    durationSec: 8.2,
    hueFrom: "#fef08a",
    hueTo: "#d97706",
    icon: "star",
  },
  {
    id: 3,
    leftPercent: 50,
    delaySec: 0.45,
    durationSec: 7.1,
    hueFrom: "#fbcfe8",
    hueTo: "#be185d",
    icon: "sparkle",
  },
  {
    id: 4,
    leftPercent: 72,
    delaySec: 1.7,
    durationSec: 8.5,
    hueFrom: "#ddd6fe",
    hueTo: "#7c3aed",
    icon: "star",
  },
  {
    id: 5,
    leftPercent: 87,
    delaySec: 0.75,
    durationSec: 7.6,
    hueFrom: "#fed7aa",
    hueTo: "#ea580c",
    icon: "heart",
  },
];

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vRot: number;
  tilt: number;
  color: string;
  shape: "rect" | "circle";
}

const CONFETTI_COLORS = [
  "#fde68a",
  "#fda4af",
  "#f472b6",
  "#c4b5fd",
  "#fffbeb",
  "#f59e0b",
];

function spawnConfettiVolley(
  width: number,
  height: number,
  count: number
): ConfettiPiece[] {
  return Array.from({ length: count }).map(() => {
    const fromLeft = Math.random() > 0.5;
    return {
      x: fromLeft
        ? width * (0.08 + Math.random() * 0.25)
        : width * (0.67 + Math.random() * 0.25),
      y: height * (0.42 + Math.random() * 0.35),
      vx: (fromLeft ? 1 : -1) * (2.2 + Math.random() * 5.6),
      vy: -6.2 - Math.random() * 6.8,
      size: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.16,
      tilt: Math.random() * Math.PI,
      color:
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: Math.random() > 0.3 ? "rect" : "circle",
    };
  });
}

export default function CelebrationLayer({
  active,
  muted = false,
  burstSignal = 0,
  onBalloonPop,
}: CelebrationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const piecesRef = useRef<ConfettiPiece[]>([]);
  const [poppedIds, setPoppedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!active) {
      setPoppedIds([]);
      piecesRef.current = [];
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const getSize = () => {
      const host = canvas.parentElement;
      return {
        w: host?.clientWidth || window.innerWidth,
        h: host?.clientHeight || window.innerHeight,
      };
    };

    const initial = getSize();
    let width = (canvas.width = initial.w);
    let height = (canvas.height = initial.h);

    const onResize = () => {
      const next = getSize();
      width = canvas.width = next.w;
      height = canvas.height = next.h;
    };
    window.addEventListener("resize", onResize);
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && canvas.parentElement
        ? new ResizeObserver(onResize)
        : null;
    if (resizeObserver && canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    piecesRef.current = spawnConfettiVolley(width, height, 85);

    let rafId = 0;

    const frame = () => {
      ctx.clearRect(0, 0, width, height);
      const pieces = piecesRef.current;

      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;
        p.vx *= 0.992;
        p.rot += p.vRot;
        p.tilt += 0.08;

        if (p.y > height + 24) {
          p.y = -20 - Math.random() * 80;
          p.x = Math.random() * width;
          p.vy = 1.6 + Math.random() * 2.2;
          p.vx = (Math.random() - 0.5) * 1.4;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(Math.cos(p.tilt), 1);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.88;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.65);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => {
      window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(rafId);
    };
  }, [active]);

  useEffect(() => {
    if (!active || burstSignal <= 0) return;
    const host = canvasRef.current?.parentElement;
    const extra = spawnConfettiVolley(
      host?.clientWidth || window.innerWidth,
      host?.clientHeight || window.innerHeight,
      48
    );
    piecesRef.current = [...piecesRef.current.slice(-110), ...extra];
  }, [active, burstSignal]);

  if (!active) return null;

  const handlePopBalloon = (id: number) => {
    if (poppedIds.includes(id)) return;
    playBalloonPop(muted);
    const host = canvasRef.current?.parentElement;
    const extra = spawnConfettiVolley(
      host?.clientWidth || window.innerWidth,
      host?.clientHeight || window.innerHeight,
      24
    );
    piecesRef.current = [...piecesRef.current.slice(-120), ...extra];
    const next = [...poppedIds, id];
    setPoppedIds(next);
    onBalloonPop?.(next.length);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full" />

      {/* Interactive metallic foil balloons */}
      {BALLOONS.map((b) => {
        const isPopped = poppedIds.includes(b.id);
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => handlePopBalloon(b.id)}
            aria-label="Tap balloon"
            className={`pointer-events-auto absolute -bottom-28 flex flex-col items-center transition-all duration-300 hover:scale-110 active:scale-90 ${
              isPopped ? "scale-150 opacity-0 pointer-events-none" : "opacity-95"
            }`}
            style={{
              left: `${b.leftPercent}%`,
              animation: `blowBalloonRise ${b.durationSec}s ease-in-out ${b.delaySec}s infinite`,
            }}
          >
            <div
              className="relative flex h-16 w-12 items-center justify-center rounded-[50%_50%_46%_46%/55%_55%_45%_45%] border border-white/30 shadow-[inset_-6px_-10px_18px_rgba(0,0,0,0.35),inset_5px_7px_12px_rgba(255,255,255,0.45),0_10px_28px_rgba(0,0,0,0.4)]"
              style={{
                background: `radial-gradient(circle at 32% 28%, ${b.hueFrom}, ${b.hueTo})`,
              }}
            >
              {/* Gloss highlight */}
              <div className="absolute left-2.5 top-2.5 h-4 w-2 rotate-[18deg] rounded-full bg-white/55 blur-[0.5px]" />
              {b.icon === "heart" && (
                <Heart className="h-4 w-4 fill-white/80 text-white" />
              )}
              {b.icon === "star" && (
                <Star className="h-4 w-4 fill-white/80 text-white" />
              )}
              {b.icon === "sparkle" && (
                <Sparkles className="h-4 w-4 text-white" />
              )}
            </div>
            {/* Balloon knot & shimmering string */}
            <div
              className="h-1.5 w-2.5 -mt-0.5 rounded-b-sm"
              style={{ backgroundColor: b.hueTo }}
            />
            <div className="h-14 w-px bg-gradient-to-b from-amber-200/75 via-rose-200/40 to-transparent" />
          </button>
        );
      })}

      <style jsx>{`
        @keyframes blowBalloonRise {
          0% {
            transform: translateY(0) translateX(0) rotate(-3deg);
            opacity: 0;
          }
          12% {
            opacity: 0.95;
          }
          50% {
            transform: translateY(-58vh) translateX(14px) rotate(4deg);
          }
          88% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(-115vh) translateX(-10px) rotate(-3deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
