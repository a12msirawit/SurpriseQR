"use client";

import React, { useEffect, useRef } from "react";

interface RoyalChamberCanvasProps {
  stage: 1 | 2 | 3;
  sealBurstTrigger: number;
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
}

interface EmberMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  twinklePhase: number;
  twinkleSpd: number;
  color: string;
}

interface GoldSparkBurst {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
  rot: number;
  vRot: number;
}

const GOLD_PALETTE = ["#fef08a", "#d4af37", "#fbbf24", "#fffbeb", "#f59e0b"];

/**
 * Full-chamber 60fps Canvas backdrop:
 * Soft antique chandelier light rays, slow bokeh gold embers,
 * mouse-following candlelight sheen, and ceremonial seal-break ember shockwave.
 */
export default function RoyalChamberCanvas({
  stage,
  sealBurstTrigger,
  pointerRef,
}: RoyalChamberCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const burstsRef = useRef<GoldSparkBurst[]>([]);
  const stageRef = useRef(stage);
  stageRef.current = stage;

  useEffect(() => {
    if (sealBurstTrigger <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width || window.innerWidth;
    const h = canvas.height || window.innerHeight;
    const cx = w * 0.5;
    const cy = h * 0.52;

    for (let i = 0; i < 64; i++) {
      const ang = (i / 64) * Math.PI * 2 + Math.random() * 0.2;
      const spd = 2.4 + Math.random() * 6.5;
      burstsRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 0.8,
        size: 2.5 + Math.random() * 4.5,
        alpha: 1,
        decay: 0.011 + Math.random() * 0.008,
        color: GOLD_PALETTE[i % GOLD_PALETTE.length],
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
      });
    }
  }, [sealBurstTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const getSize = () => {
      const p = canvas.parentElement;
      return {
        w: p?.clientWidth || window.innerWidth,
        h: p?.clientHeight || window.innerHeight,
      };
    };

    let { w, h } = getSize();
    canvas.width = w;
    canvas.height = h;

    const onResize = () => {
      const next = getSize();
      w = canvas.width = next.w;
      h = canvas.height = next.h;
    };

    window.addEventListener("resize", onResize);
    const resizeObs =
      typeof ResizeObserver !== "undefined" && canvas.parentElement
        ? new ResizeObserver(onResize)
        : null;
    if (resizeObs && canvas.parentElement) {
      resizeObs.observe(canvas.parentElement);
    }

    const motes: EmberMote[] = Array.from({ length: 48 }).map((_, idx) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.28,
      vy: -0.22 - Math.random() * 0.45,
      size: 1.2 + Math.random() * 3.2,
      alpha: 0.35 + Math.random() * 0.45,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpd: 0.02 + Math.random() * 0.03,
      color: idx % 5 === 0 ? "#fda4af" : GOLD_PALETTE[idx % GOLD_PALETTE.length],
    }));

    let rafId = 0;
    let tick = 0;

    const frame = () => {
      tick += 1;
      ctx.clearRect(0, 0, w, h);

      // Subtle architectural chandelier glow shafts from top center
      const rayGrad = ctx.createRadialGradient(
        w * 0.5,
        -h * 0.08,
        10,
        w * 0.5,
        h * 0.25,
        Math.max(w, h) * 0.75
      );
      rayGrad.addColorStop(
        0,
        stageRef.current === 3
          ? "rgba(251, 191, 36, 0.16)"
          : "rgba(212, 175, 55, 0.12)"
      );
      rayGrad.addColorStop(0.5, "rgba(136, 19, 55, 0.06)");
      rayGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = rayGrad;
      ctx.fillRect(0, 0, w, h);

      // Interactive warm candlelight halo following cursor
      const rect = canvas.getBoundingClientRect();
      const { x: px, y: py } = pointerRef.current;
      const lx = px > 0 ? px - rect.left : w * 0.5;
      const ly = py > 0 ? py - rect.top : h * 0.48;
      const candleRadius = Math.min(w, h) * 0.28;
      const cGrad = ctx.createRadialGradient(lx, ly, 4, lx, ly, candleRadius);
      cGrad.addColorStop(0, "rgba(253, 224, 71, 0.09)");
      cGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(lx, ly, candleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Ambient gilded dust motes
      motes.forEach((m) => {
        m.x += m.vx + Math.sin(tick * 0.015 + m.twinklePhase) * 0.15;
        m.y += m.vy;
        m.twinklePhase += m.twinkleSpd;

        if (m.y < -15) m.y = h + 15;
        if (m.x < -15) m.x = w + 15;
        if (m.x > w + 15) m.x = -15;

        const a = m.alpha * (0.55 + Math.sin(m.twinklePhase) * 0.45);
        ctx.save();
        ctx.globalAlpha = Math.max(0.05, a);
        ctx.fillStyle = m.color;
        ctx.shadowColor = m.color;
        ctx.shadowBlur = m.size * 3.5;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Gold leaf bursts
      burstsRef.current = burstsRef.current.filter((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.06;
        b.vx *= 0.975;
        b.rot += b.vRot;
        b.alpha -= b.decay;
        if (b.alpha <= 0.02) return false;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.globalAlpha = Math.max(0, b.alpha);
        ctx.fillStyle = b.color;
        ctx.shadowColor = "#fef08a";
        ctx.shadowBlur = 8;
        ctx.fillRect(-b.size * 0.6, -b.size * 0.35, b.size * 1.2, b.size * 0.7);
        ctx.restore();
        return true;
      });

      if (burstsRef.current.length > 180) {
        burstsRef.current.splice(0, burstsRef.current.length - 180);
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => {
      window.removeEventListener("resize", onResize);
      resizeObs?.disconnect();
      window.cancelAnimationFrame(rafId);
    };
  }, [pointerRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  );
}

