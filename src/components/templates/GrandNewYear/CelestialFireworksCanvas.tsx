"use client";

import React, { useEffect, useRef } from "react";
import {
  playFireworkBoom,
  playFireworkLaunch,
  playSparkTick,
  unlockNewYearAudio,
} from "./newYearSound";

export type FireworksMode = "off" | "distant" | "full";

interface CelestialFireworksCanvasProps {
  fireworksMode: FireworksMode;
  isWarping: boolean;
  muted: boolean;
  sparklerActive?: boolean;
  burstTrigger?: number;
}

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  phase: number;
  twinkleSpeed: number;
  hue: string;
}

interface Embers {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
}

interface Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  colorPalette: string[];
  style: "chrysanthemum" | "willow" | "crown" | "starburst";
  trail: Array<{ x: number; y: number }>;
  soundOnBoom: boolean;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  drag: number;
  gravity: number;
  alpha: number;
  decay: number;
  size: number;
  color: string;
  twinkle: boolean;
  trail: Array<{ x: number; y: number }>;
}

interface FlashHalo {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
}

const PALETTES: string[][] = [
  ["#FFFBEB", "#FDE68A", "#F59E0B", "#D97706"], // Imperial Gold
  ["#FFF1F2", "#FDA4AF", "#FB7185", "#FDE047"], // Rose Champagne & Gold
  ["#EFF6FF", "#93C5FD", "#60A5FA", "#FDE68A"], // Celestial Sapphire & Gold
  ["#ECFDF5", "#6EE7B7", "#FCD34D", "#FFFBEB"], // Jade & Gold
  ["#FAF5FF", "#D8B4FE", "#FBBF24", "#F472B6"], // Royal Amethyst
];

const STYLES: Array<Rocket["style"]> = ["chrysanthemum", "willow", "crown", "starburst"];

export default function CelestialFireworksCanvas({
  fireworksMode,
  isWarping,
  muted,
  sparklerActive = false,
  burstTrigger = 0,
}: CelestialFireworksCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef(fireworksMode);
  const warpingRef = useRef(isWarping);
  const mutedRef = useRef(muted);
  const sparklerRef = useRef(sparklerActive);
  const spawnBurstAtRef = useRef<((x: number, y: number, audible?: boolean) => void) | null>(null);

  useEffect(() => {
    modeRef.current = fireworksMode;
  }, [fireworksMode]);

  useEffect(() => {
    warpingRef.current = isWarping;
  }, [isWarping]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    sparklerRef.current = sparklerActive;
  }, [sparklerActive]);

  useEffect(() => {
    if (!burstTrigger || !spawnBurstAtRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 380;
    const h = canvas.clientHeight || 620;
    spawnBurstAtRef.current(w * 0.5, h * 0.28, !mutedRef.current);
    setTimeout(() => {
      spawnBurstAtRef.current?.(w * 0.24, h * 0.22, false);
      spawnBurstAtRef.current?.(w * 0.78, h * 0.25, false);
    }, 180);
  }, [burstTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;
    let warpSpeed = 0;

    const stars: Star[] = [];
    const embers: Embers[] = [];
    const rockets: Rocket[] = [];
    const sparks: SparkParticle[] = [];
    const flashes: FlashHalo[] = [];

    const setupSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = rect?.width || 380;
      height = rect?.height || 640;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (stars.length === 0) {
        const starColors = ["#FEF3C7", "#FDE68A", "#E0E7FF", "#FFFFFF", "#FDBA74"];
        for (let i = 0; i < 85; i++) {
          stars.push({
            x: (Math.random() - 0.5) * width,
            y: (Math.random() - 0.5) * height,
            z: Math.random() * 1.6 + 0.35,
            size: Math.random() * 1.7 + 0.5,
            phase: Math.random() * Math.PI * 2,
            twinkleSpeed: Math.random() * 0.025 + 0.01,
            hue: starColors[Math.floor(Math.random() * starColors.length)],
          });
        }
      }
    };

    setupSize();
    const resizeObs = new ResizeObserver(setupSize);
    if (canvas.parentElement) resizeObs.observe(canvas.parentElement);

    const detonate = (
      x: number,
      y: number,
      palette: string[],
      style: Rocket["style"],
      audible: boolean,
    ) => {
      flashes.push({
        x,
        y,
        radius: style === "willow" ? 95 : 75,
        alpha: 0.48,
        color: palette[1],
      });

      if (audible && !mutedRef.current) {
        playFireworkBoom(style === "crown" ? 1.1 : 0.9);
      }

      if (style === "chrysanthemum") {
        const count = 88;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.08;
          const speed = Math.random() * 4.4 + 2.2;
          sparks.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            drag: 0.968,
            gravity: 0.048,
            alpha: 1,
            decay: Math.random() * 0.008 + 0.011,
            size: Math.random() * 1.9 + 1.2,
            color: palette[Math.floor(Math.random() * palette.length)],
            twinkle: i % 3 === 0,
            trail: [],
          });
        }
      } else if (style === "willow") {
        const count = 72;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.14;
          const speed = Math.random() * 3.5 + 1.2;
          sparks.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.4,
            drag: 0.952,
            gravity: 0.072,
            alpha: 1,
            decay: Math.random() * 0.006 + 0.0085,
            size: Math.random() * 2.1 + 1.4,
            color: i % 2 === 0 ? "#FDE68A" : "#F59E0B",
            twinkle: true,
            trail: [],
          });
        }
      } else if (style === "crown") {
        // Inner golden ring + outer jewel ring
        for (let ring = 0; ring < 2; ring++) {
          const count = ring === 0 ? 36 : 64;
          const baseSpeed = ring === 0 ? 2.4 : 4.9;
          const ringColor = ring === 0 ? palette[0] : palette[2];
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = baseSpeed + (Math.random() - 0.5) * 0.65;
            sparks.push({
              x,
              y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              drag: 0.962,
              gravity: 0.045,
              alpha: 1,
              decay: 0.012,
              size: ring === 0 ? 2.0 : 1.7,
              color: ringColor,
              twinkle: ring === 1,
              trail: [],
            });
          }
        }
      } else {
        // Multi-arm starburst
        const arms = 6;
        for (let i = 0; i < 84; i++) {
          const armAngle = ((i % arms) / arms) * Math.PI * 2 + Math.floor(i / arms) * 0.08;
          const speed = 1.6 + (Math.floor(i / arms) / 14) * 4.5;
          sparks.push({
            x,
            y,
            vx: Math.cos(armAngle) * speed,
            vy: Math.sin(armAngle) * speed,
            drag: 0.966,
            gravity: 0.04,
            alpha: 1,
            decay: 0.013,
            size: Math.random() * 2 + 1.1,
            color: palette[i % palette.length],
            twinkle: true,
            trail: [],
          });
        }
      }
    };

    const launchRocket = (targetX: number, targetY: number, audible: boolean) => {
      const startX = targetX + (Math.random() - 0.5) * 34;
      const startY = height - 10;
      const distY = Math.max(80, startY - targetY);
      const frames = 26 + Math.random() * 8;
      const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      const style = STYLES[Math.floor(Math.random() * STYLES.length)];

      if (audible && !mutedRef.current) {
        playFireworkLaunch();
      }

      rockets.push({
        x: startX,
        y: startY,
        vx: (targetX - startX) / frames,
        vy: -(distY / frames) - 0.85,
        targetY,
        colorPalette: palette,
        style,
        trail: [],
        soundOnBoom: audible,
      });
    };

    spawnBurstAtRef.current = (x: number, y: number, audible = false) => {
      const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      const style = STYLES[Math.floor(Math.random() * STYLES.length)];
      detonate(x, y, palette, style, audible);
    };

    // Initial celebratory firework volley when entering Full Fireworks stage
    let lastAutoLaunch = performance.now();
    if (modeRef.current === "full") {
      setTimeout(() => launchRocket(width * 0.5, height * 0.24, false), 120);
      setTimeout(() => launchRocket(width * 0.25, height * 0.2, false), 420);
      setTimeout(() => launchRocket(width * 0.76, height * 0.26, false), 720);
    }

    const spawnPointerSparks = (px: number, py: number, count = 6) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2.2 + 0.5;
        embers.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.4,
          size: Math.random() * 2 + 0.9,
          alpha: 0.95,
          life: 0,
          maxLife: 24 + Math.random() * 18,
          color: i % 2 === 0 ? "#FDE68A" : "#F59E0B",
        });
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      unlockNewYearAudio();
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      if (modeRef.current === "full" || modeRef.current === "distant") {
        launchRocket(px, Math.min(py, height * 0.62), true);
      } else if (sparklerRef.current) {
        spawnPointerSparks(px, py, 14);
        if (!mutedRef.current) playSparkTick();
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!sparklerRef.current || warpingRef.current) return;
      if (Math.random() > 0.35) return;
      const rect = canvas.getBoundingClientRect();
      spawnPointerSparks(e.clientX - rect.left, e.clientY - rect.top, 2);
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);

    const render = (now: number) => {
      // Smoothly ease warpSpeed up during warp, down afterwards
      const targetWarp = warpingRef.current ? 1 : 0;
      warpSpeed += (targetWarp - warpSpeed) * 0.085;

      // Clear cleanly with transparent backdrop (lets CSS nebula glow shine through)
      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.48;

      // 1. Stars + Slow Hyperspace Warp Streaks
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.phase += s.twinkleSpeed;

        if (warpSpeed > 0.03) {
          // Radial acceleration from center
          const radialFactor = 1 + warpSpeed * 0.065 * s.z;
          const prevX = cx + s.x;
          const prevY = cy + s.y;
          s.x *= radialFactor;
          s.y *= radialFactor;

          if (Math.abs(s.x) > width * 0.65 || Math.abs(s.y) > height * 0.65) {
            s.x = (Math.random() - 0.5) * width * 0.28;
            s.y = (Math.random() - 0.5) * height * 0.28;
            continue;
          }

          const curX = cx + s.x;
          const curY = cy + s.y;
          const streakAlpha = Math.min(0.95, 0.25 + warpSpeed * 0.75);

          ctx.save();
          ctx.strokeStyle = s.hue;
          ctx.globalAlpha = streakAlpha;
          ctx.lineWidth = s.size * (1 + warpSpeed * 1.4);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(
            curX + (curX - prevX) * (2.5 * warpSpeed),
            curY + (curY - prevY) * (2.5 * warpSpeed),
          );
          ctx.stroke();
          ctx.restore();
        } else {
          const sx = cx + s.x;
          const sy = cy + s.y;
          const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(s.phase));
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = s.hue;
          ctx.beginPath();
          ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Soft golden warp tunnel vignette overlay when warping
      if (warpSpeed > 0.04) {
        const grad = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.max(width, height) * 0.65);
        grad.addColorStop(0, `rgba(253, 230, 138, ${0.18 * warpSpeed})`);
        grad.addColorStop(0.45, `rgba(245, 158, 11, ${0.08 * warpSpeed})`);
        grad.addColorStop(1, "rgba(5, 6, 15, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Gentle ambient floating gold stardust embers
      if (Math.random() < 0.22 && embers.length < 48) {
        embers.push({
          x: Math.random() * width,
          y: height + 10,
          vx: (Math.random() - 0.5) * 0.35,
          vy: -(Math.random() * 0.65 + 0.25),
          size: Math.random() * 1.8 + 0.6,
          alpha: 0.65,
          life: 0,
          maxLife: 160 + Math.random() * 110,
          color: Math.random() > 0.3 ? "#FDE68A" : "#F59E0B",
        });
      }

      for (let i = embers.length - 1; i >= 0; i--) {
        const em = embers[i];
        em.x += em.vx;
        em.y += em.vy;
        em.life += 1;
        const progress = em.life / em.maxLife;
        if (progress >= 1) {
          embers.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = em.alpha * Math.sin(progress * Math.PI);
          ctx.fillStyle = em.color;
          ctx.beginPath();
          ctx.arc(em.x, em.y, em.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 3. Auto firework launches in stage 2 / stage 4 distant mode
      if (!warpingRef.current && modeRef.current !== "off") {
        const interval = modeRef.current === "full" ? 1650 : 2800;
        if (now - lastAutoLaunch > interval) {
          lastAutoLaunch = now;
          const tx = width * (0.16 + Math.random() * 0.68);
          const ty = height * (modeRef.current === "full" ? 0.14 + Math.random() * 0.24 : 0.12 + Math.random() * 0.16);
          launchRocket(tx, ty, modeRef.current === "full" && !mutedRef.current && Math.random() > 0.35);
        }
      }

      // 4. Update rising rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 9) r.trail.shift();

        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.035;

        // Draw rocket trail
        if (r.trail.length > 1) {
          ctx.save();
          ctx.strokeStyle = "#FDE68A";
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(r.trail[0].x, r.trail[0].y);
          for (let j = 1; j < r.trail.length; j++) {
            ctx.lineTo(r.trail[j].x, r.trail[j].y);
          }
          ctx.stroke();
          ctx.restore();
        }

        // Rocket head glow
        ctx.save();
        ctx.fillStyle = "#FFFBEB";
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (r.y <= r.targetY || r.vy >= -0.4) {
          detonate(r.x, r.y, r.colorPalette, r.style, r.soundOnBoom);
          rockets.splice(i, 1);
        }
      }

      // 5. Detonation atmospheric flash haloes
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.alpha -= 0.028;
        if (f.alpha <= 0) {
          flashes.splice(i, 1);
        } else {
          const g = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.radius);
          g.addColorStop(0, `${f.color}66`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.save();
          ctx.globalAlpha = f.alpha;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 6. Update & draw firework sparks with glowing trails
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.trail.push({ x: sp.x, y: sp.y });
        if (sp.trail.length > 6) sp.trail.shift();

        sp.vx *= sp.drag;
        sp.vy *= sp.drag;
        sp.vy += sp.gravity;
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.alpha -= sp.decay;

        if (sp.alpha <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        const flicker = sp.twinkle && Math.random() > 0.72 ? 0.4 : 1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, sp.alpha * flicker);

        if (sp.trail.length > 1) {
          ctx.strokeStyle = sp.color;
          ctx.lineWidth = sp.size * 0.9;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(sp.trail[0].x, sp.trail[0].y);
          for (let j = 1; j < sp.trail.length; j++) {
            ctx.lineTo(sp.trail[j].x, sp.trail[j].y);
          }
          ctx.lineTo(sp.x, sp.y);
          ctx.stroke();
        }

        ctx.fillStyle = "#FFFBEB";
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObs.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 z-10 h-full w-full ${
        fireworksMode === "full" || sparklerActive ? "cursor-crosshair" : "pointer-events-none"
      }`}
    />
  );
}

