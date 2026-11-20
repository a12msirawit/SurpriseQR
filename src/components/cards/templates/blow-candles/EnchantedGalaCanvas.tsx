"use client";

import React, { useEffect, useRef } from "react";

interface EnchantedGalaCanvasProps {
  litCount: number;
  isWarping: boolean;
  celebrationActive: boolean;
  extinguishAscent: boolean;
  muted?: boolean;
  burstTrigger?: number;
}

interface StarParticle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  z: number;
  size: number;
  twinklePhase: number;
  color: string;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  color: string;
  trail: boolean;
}

interface BokehOrb {
  xPct: number;
  yPct: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  hue: string;
}

const SPARK_COLORS = [
  "254, 240, 138", // champagne gold
  "253, 186, 116", // warm amber
  "251, 164, 185", // rose quartz
  "244, 114, 182", // gala pink
  "221, 214, 254", // twilight lavender
  "255, 251, 235", // diamond white
];

export default function EnchantedGalaCanvas({
  litCount,
  isWarping,
  celebrationActive,
  extinguishAscent,
  burstTrigger = 0,
}: EnchantedGalaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparksRef = useRef<SparkParticle[]>([]);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const stateRef = useRef({
    litCount,
    isWarping,
    celebrationActive,
    extinguishAscent,
  });
  stateRef.current = {
    litCount,
    isWarping,
    celebrationActive,
    extinguishAscent,
  };

  // Trigger extra celebratory bursts on celebration entry or heart reactions
  useEffect(() => {
    if (burstTrigger <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width || window.innerWidth;
    const h = canvas.height || window.innerHeight;

    const origins = [
      { x: w * 0.22, y: h * 0.28 },
      { x: w * 0.78, y: h * 0.28 },
      { x: w * 0.5, y: h * 0.22 },
    ];
    origins.forEach((orig) => {
      const color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
      for (let i = 0; i < 34; i++) {
        const angle = (Math.PI * 2 * i) / 34 + (Math.random() - 0.5) * 0.14;
        const speed = 1.8 + Math.random() * 4.4;
        sparksRef.current.push({
          x: orig.x,
          y: orig.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1.5 + Math.random() * 2.2,
          alpha: 0.96,
          decay: 0.013 + Math.random() * 0.01,
          gravity: 0.045,
          color: i % 3 === 0 ? "255, 251, 235" : color,
          trail: true,
        });
      }
    });
  }, [burstTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const getSize = () => {
      const parent = canvas.parentElement;
      return {
        w: parent?.clientWidth || window.innerWidth,
        h: parent?.clientHeight || window.innerHeight,
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

    // 3D Starfield normalized around center [-1..1] for hyperspace warp
    const stars: StarParticle[] = Array.from({ length: 130 }).map(() => {
      const x = (Math.random() - 0.5) * 2;
      const y = (Math.random() - 0.5) * 2;
      return {
        x,
        y,
        prevX: x,
        prevY: y,
        z: 0.15 + Math.random() * 0.95,
        size: 0.8 + Math.random() * 1.9,
        twinklePhase: Math.random() * Math.PI * 2,
        color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
      };
    });

    // Soft floating volumetric bokeh clouds
    const bokehs: BokehOrb[] = Array.from({ length: 18 }).map((_, idx) => ({
      xPct: Math.random(),
      yPct: Math.random(),
      vx: (Math.random() - 0.5) * 0.00028,
      vy: -0.00018 - Math.random() * 0.00025,
      radius: 26 + Math.random() * 68,
      alpha: 0.05 + Math.random() * 0.075,
      phase: Math.random() * Math.PI * 2,
      hue: idx % 2 === 0 ? "251, 191, 36" : "244, 114, 182",
    }));

    // Interactive pointer trail listeners bound to parent stage
    const host = canvas.parentElement;
    const spawnTrail = (clientX: number, clientY: number) => {
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      pointerRef.current = { x: px, y: py, active: true };
      for (let i = 0; i < 3; i++) {
        sparksRef.current.push({
          x: px + (Math.random() - 0.5) * 10,
          y: py + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 1.2,
          vy: -0.4 - Math.random() * 1.3,
          size: 1.2 + Math.random() * 2,
          alpha: 0.9,
          decay: 0.025 + Math.random() * 0.015,
          gravity: 0.02,
          color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
          trail: false,
        });
      }
    };

    const spawnTapBurst = (clientX: number, clientY: number) => {
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const hue = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
      const count = stateRef.current.celebrationActive ? 22 : 12;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 1.2 + Math.random() * 3.1;
        sparksRef.current.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1.3 + Math.random() * 2,
          alpha: 0.92,
          decay: 0.022 + Math.random() * 0.01,
          gravity: 0.04,
          color: i % 2 === 0 ? hue : "255, 250, 220",
          trail: stateRef.current.celebrationActive,
        });
      }
    };

    const onPointerMove = (e: PointerEvent) => spawnTrail(e.clientX, e.clientY);
    const onPointerDown = (e: PointerEvent) => spawnTapBurst(e.clientX, e.clientY);

    host?.addEventListener("pointermove", onPointerMove, { passive: true });
    host?.addEventListener("pointerdown", onPointerDown, { passive: true });

    let rafId = 0;
    let tick = 0;
    let warpSpeed = 0.0007;

    const frame = () => {
      tick += 1;
      const { isWarping: warpingNow, celebrationActive: celebNow, extinguishAscent: ascentNow, litCount: litNow } =
        stateRef.current;

      // Smoothly accelerate/decelerate star warp velocity
      const targetSpeed = warpingNow ? 0.055 : ascentNow ? 0.014 : 0.0012;
      warpSpeed += (targetSpeed - warpSpeed) * 0.09;

      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.45;

      // 1. Volumetric Stage Spotlight Beams from upper chandeliers
      ctx.save();
      const rayPulse = 0.72 + Math.sin(tick * 0.02) * 0.28;
      const warmthFactor = litNow > 0 ? 1 : 0.65;
      const rays = [
        { topX: w * 0.25, bottomX: w * 0.55, spread: w * 0.22, hue: "253, 224, 136", alpha: 0.055 },
        { topX: w * 0.75, bottomX: w * 0.45, spread: w * 0.22, hue: "244, 114, 182", alpha: 0.048 },
        { topX: w * 0.5, bottomX: w * 0.5, spread: w * 0.34, hue: "254, 240, 138", alpha: 0.065 },
      ];
      rays.forEach((ray) => {
        const grad = ctx.createLinearGradient(ray.topX, 0, ray.bottomX, h * 0.9);
        grad.addColorStop(0, `rgba(${ray.hue}, ${ray.alpha * rayPulse * warmthFactor})`);
        grad.addColorStop(0.55, `rgba(${ray.hue}, ${ray.alpha * 0.4 * rayPulse * warmthFactor})`);
        grad.addColorStop(1, `rgba(${ray.hue}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(ray.topX - 24, 0);
        ctx.lineTo(ray.topX + 24, 0);
        ctx.lineTo(ray.bottomX + ray.spread, h);
        ctx.lineTo(ray.bottomX - ray.spread, h);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();

      // 2. Soft Drifting Luxury Bokeh Globes across full viewport
      bokehs.forEach((b) => {
        b.xPct += b.vx;
        b.yPct += b.vy;
        if (b.yPct < -0.15) {
          b.yPct = 1.15;
          b.xPct = Math.random();
        }
        if (b.xPct < -0.15) b.xPct = 1.15;
        if (b.xPct > 1.15) b.xPct = -0.15;

        const bx = b.xPct * w;
        const by = b.yPct * h;
        const a = b.alpha * (0.7 + Math.sin(tick * 0.025 + b.phase) * 0.3);
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, b.radius);
        grad.addColorStop(0, `rgba(${b.hue}, ${a})`);
        grad.addColorStop(0.6, `rgba(${b.hue}, ${a * 0.35})`);
        grad.addColorStop(1, `rgba(${b.hue}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, b.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Starfield & Radial Hyperspace Warp Trails
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.prevX = s.x;
        s.prevY = s.y;

        s.z -= warpSpeed;
        if (s.z <= 0.04) {
          s.x = (Math.random() - 0.5) * 2;
          s.y = (Math.random() - 0.5) * 2;
          s.prevX = s.x;
          s.prevY = s.y;
          s.z = 1.0;
        }

        const scale = Math.min(w, h) * 0.62;
        const sx = cx + (s.x / s.z) * scale;
        const sy = cy + (s.y / s.z) * scale;
        const px = cx + (s.prevX / (s.z + warpSpeed * 1.4)) * scale;
        const py = cy + (s.prevY / (s.z + warpSpeed * 1.4)) * scale;

        if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) {
          s.z = 1.0;
          s.x = (Math.random() - 0.5) * 2;
          s.y = (Math.random() - 0.5) * 2;
          continue;
        }

        const twinkle = 0.55 + Math.sin(tick * 0.05 + s.twinklePhase) * 0.45;
        const depthAlpha = Math.min(1, (1.08 - s.z) * 1.15) * twinkle;

        if (warpingNow || warpSpeed > 0.008) {
          ctx.strokeStyle = `rgba(${s.color}, ${Math.min(0.95, depthAlpha)})`;
          ctx.lineWidth = s.size * (warpingNow ? 1.55 : 1.0);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${s.color}, ${depthAlpha * 0.85})`;
          ctx.beginPath();
          ctx.arc(sx, sy, s.size * (1.2 - s.z * 0.4), 0, Math.PI * 2);
          ctx.fill();

          // Occasional subtle 4-point star glint on bright foreground stars
          if (i % 7 === 0 && depthAlpha > 0.6) {
            ctx.strokeStyle = `rgba(255, 251, 235, ${depthAlpha * 0.55})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(sx - 5, sy);
            ctx.lineTo(sx + 5, sy);
            ctx.moveTo(sx, sy - 5);
            ctx.lineTo(sx, sy + 5);
            ctx.stroke();
          }
        }
      }

      // 4. Periodic Symmetrical Fireworks in Celebration Mode
      if (celebNow && tick % 58 === 0) {
        const fx = (Math.random() > 0.5 ? 0.18 + Math.random() * 0.2 : 0.62 + Math.random() * 0.2) * w;
        const fy = (0.14 + Math.random() * 0.28) * h;
        const hue = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
        for (let i = 0; i < 28; i++) {
          const ang = (Math.PI * 2 * i) / 28 + Math.random() * 0.15;
          const spd = 1.4 + Math.random() * 3.6;
          sparksRef.current.push({
            x: fx,
            y: fy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            size: 1.4 + Math.random() * 1.9,
            alpha: 0.94,
            decay: 0.015 + Math.random() * 0.008,
            gravity: 0.04,
            color: i % 3 === 0 ? "255, 251, 235" : hue,
            trail: true,
          });
        }
      }

      // 5. Upward Golden Wish Sparks during Extinguish Ascent
      if (ascentNow && tick % 2 === 0) {
        sparksRef.current.push({
          x: cx + (Math.random() - 0.5) * 140,
          y: h * 0.56,
          vx: (Math.random() - 0.5) * 1.4,
          vy: -2.4 - Math.random() * 3.2,
          size: 1.5 + Math.random() * 2.4,
          alpha: 0.95,
          decay: 0.014,
          gravity: -0.02,
          color: Math.random() > 0.4 ? "254, 240, 138" : "251, 164, 185",
          trail: true,
        });
      }

      // 6. Update & Draw Interactive Sparkles + Firework Tails
      sparksRef.current = sparksRef.current.filter((p) => {
        const oldX = p.x;
        const oldY = p.y;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.985;
        p.alpha -= p.decay;

        if (p.alpha <= 0.02) return false;

        if (p.trail) {
          ctx.strokeStyle = `rgba(${p.color}, ${p.alpha * 0.65})`;
          ctx.lineWidth = p.size * 0.85;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(oldX - p.vx * 1.6, oldY - p.vy * 1.6);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }

        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
        glow.addColorStop(0, `rgba(${p.color}, ${p.alpha})`);
        glow.addColorStop(1, `rgba(${p.color}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      if (sparksRef.current.length > 260) {
        sparksRef.current.splice(0, sparksRef.current.length - 260);
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => {
      window.removeEventListener("resize", onResize);
      resizeObs?.disconnect();
      host?.removeEventListener("pointermove", onPointerMove);
      host?.removeEventListener("pointerdown", onPointerDown);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  );
}

