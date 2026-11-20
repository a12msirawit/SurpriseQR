"use client";

import React, { useEffect, useRef } from "react";
import {
  playFireworkBoom,
  playFireworkLaunch,
  unlockNewYearAudio,
} from "./newYearSound";

export type TrainSceneMode = "station" | "window" | "cabin" | "arrival";

export interface RocketLaunchCommand {
  id: number;
  xPct: number; // 0..1 across canvas width
  yPct?: number; // 0..1 target burst height
  big?: boolean;
}

interface MidnightTrainCanvasProps {
  mode: TrainSceneMode;
  isTransitioning: boolean;
  muted: boolean;
  burstTrigger?: number;
  interactiveSky?: boolean;
  autoFireworks?: boolean;
  rocketCommand?: RocketLaunchCommand | null;
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  color: string;
}

interface SnowFlake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  gold: boolean;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  alpha: number;
  decay: number;
}

interface Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  palette: string[];
  trail: Array<{ x: number; y: number }>;
  audible: boolean;
  big: boolean;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  size: number;
  color: string;
  trail: Array<{ x: number; y: number }>;
}

interface FlashGlow {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
}

const PALETTES = [
  ["#FFFBEB", "#FDE68A", "#F59E0B", "#FB923C"],
  ["#FFF1F2", "#FDA4AF", "#FB7185", "#FDE047"],
  ["#EFF6FF", "#93C5FD", "#60A5FA", "#FDE68A"],
  ["#F5F3FF", "#C4B5FD", "#F472B6", "#FDE68A"],
  ["#ECFDF5", "#6EE7B7", "#FCD34D", "#FFFBEB"],
];

/**
 * Ambient canvas for Midnight Time Train 2026 -> 2027:
 * - Starry sky, golden snow bokeh, shooting stars
 * - Moving parallax mountain silhouette & pine trees in "window" & "arrival" modes
 * - Targeted rocket launches from bottom fuse rack + interactive tap-to-launch fireworks
 * - Express speed-streak light lines during station transitions
 */
export default function MidnightTrainCanvas({
  mode,
  isTransitioning,
  muted,
  burstTrigger = 0,
  interactiveSky = false,
  autoFireworks = true,
  rocketCommand = null,
}: MidnightTrainCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef(mode);
  const transRef = useRef(isTransitioning);
  const mutedRef = useRef(muted);
  const interactiveRef = useRef(interactiveSky);
  const autoFireworksRef = useRef(autoFireworks);
  const launchRef = useRef<
    ((x: number, y: number, audible: boolean, big?: boolean, fromX?: number) => void) | null
  >(null);
  const burstRef = useRef<((x: number, y: number, audible: boolean, big?: boolean) => void) | null>(
    null,
  );

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    transRef.current = isTransitioning;
  }, [isTransitioning]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    interactiveRef.current = interactiveSky;
  }, [interactiveSky]);

  useEffect(() => {
    autoFireworksRef.current = autoFireworks;
  }, [autoFireworks]);

  useEffect(() => {
    if (!burstTrigger) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 380;
    const h = canvas.clientHeight || 640;
    burstRef.current?.(w * 0.5, h * 0.24, !mutedRef.current, true);
    const t1 = setTimeout(() => {
      burstRef.current?.(w * 0.24, h * 0.2, false, true);
      burstRef.current?.(w * 0.78, h * 0.23, false, true);
    }, 240);
    return () => clearTimeout(t1);
  }, [burstTrigger]);

  // Targeted rocket launches driven by the bottom Chain-Fuse Fireworks Rack
  useEffect(() => {
    if (!rocketCommand || !launchRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 380;
    const h = canvas.clientHeight || 640;
    const sx = w * rocketCommand.xPct;
    const ty = h * (rocketCommand.yPct ?? 0.22 + Math.random() * 0.14);
    const tx = sx + (Math.random() - 0.5) * 32;
    launchRef.current(tx, ty, !mutedRef.current, rocketCommand.big ?? true, sx);
  }, [rocketCommand]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;
    let scrollFar = 0;
    let scrollNear = 0;
    let speedBoost = 0;
    let lastAutoFirework = performance.now();
    let lastShootingStar = performance.now();

    const stars: Star[] = [];
    const snow: SnowFlake[] = [];
    const shooters: ShootingStar[] = [];
    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    const flashes: FlashGlow[] = [];

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = rect?.width || 380;
      height = rect?.height || 640;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (stars.length === 0) {
        const starColors = ["#FEF3C7", "#FDE68A", "#E0E7FF", "#FFFFFF"];
        for (let i = 0; i < 68; i++) {
          stars.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.78,
            r: Math.random() * 1.5 + 0.45,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.025 + 0.01,
            color: starColors[i % starColors.length],
          });
        }
      }

      if (snow.length === 0) {
        for (let i = 0; i < 34; i++) {
          snow.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: -0.35 - Math.random() * 0.45,
            vy: 0.35 + Math.random() * 0.65,
            r: Math.random() * 2 + 0.8,
            alpha: 0.22 + Math.random() * 0.5,
            gold: i % 3 === 0,
          });
        }
      }
    };

    setup();
    const ro = new ResizeObserver(setup);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const detonate = (
      x: number,
      y: number,
      palette: string[],
      audible: boolean,
      big: boolean,
    ) => {
      flashes.push({
        x,
        y,
        radius: big ? 110 : 72,
        alpha: big ? 0.52 : 0.36,
        color: palette[1],
      });
      if (audible && !mutedRef.current) {
        playFireworkBoom(big ? 1.1 : 0.85);
      }
      const count = big ? 84 : 54;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.1;
        const spd = (big ? 1.8 : 1.3) + Math.random() * (big ? 4.5 : 3.2);
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          alpha: 1,
          decay: (big ? 0.0095 : 0.0125) + Math.random() * 0.008,
          size: (big ? 1.5 : 1.2) + Math.random() * 1.8,
          color: palette[i % palette.length],
          trail: [],
        });
      }
      if (big) {
        // Inner bright golden crown ring
        for (let i = 0; i < 24; i++) {
          const angle = (Math.PI * 2 * i) / 24;
          const spd = 1.9 + Math.random() * 0.6;
          sparks.push({
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            alpha: 1,
            decay: 0.011,
            size: 1.9,
            color: palette[0],
            trail: [],
          });
        }
      }
    };

    const launchRocket = (
      targetX: number,
      targetY: number,
      audible: boolean,
      big = false,
      fromX?: number,
    ) => {
      const startX = fromX ?? targetX + (Math.random() - 0.5) * 26;
      const startY = height * 0.86;
      const dist = Math.max(80, startY - targetY);
      const frames = big ? 28 + Math.random() * 6 : 22 + Math.random() * 8;
      const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      if (audible && !mutedRef.current) {
        playFireworkLaunch();
      }
      rockets.push({
        x: startX,
        y: startY,
        vx: (targetX - startX) / frames,
        vy: -(dist / frames) - 0.85,
        targetY,
        palette,
        trail: [],
        audible,
        big,
      });
    };

    launchRef.current = launchRocket;
    burstRef.current = (x: number, y: number, audible: boolean, big = false) => {
      const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      detonate(x, y, palette, audible, big);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (!interactiveRef.current) return;
      unlockNewYearAudio();
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      launchRocket(px, Math.min(py, height * 0.55), true, false);
    };

    canvas.addEventListener("pointerdown", handlePointerDown);

    const drawMountainLayer = (
      offset: number,
      baseY: number,
      amp: number,
      freq: number,
      fill: string,
    ) => {
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width + 24; x += 24) {
        const t = (x + offset) * freq;
        const y =
          baseY -
          Math.abs(Math.sin(t)) * amp -
          Math.sin(t * 2.1 + 1.3) * (amp * 0.35);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };

    const drawPineRow = (offset: number, baseY: number) => {
      ctx.fillStyle = "#060814";
      const spacing = 34;
      const startIdx = Math.floor(offset / spacing) - 1;
      const count = Math.ceil(width / spacing) + 3;
      for (let i = 0; i < count; i++) {
        const idx = startIdx + i;
        const x = idx * spacing - offset;
        const h = 18 + (Math.abs(idx * 37) % 19);
        const w = 9 + (Math.abs(idx * 13) % 6);
        ctx.beginPath();
        ctx.moveTo(x, baseY - h);
        ctx.lineTo(x - w, baseY + 6);
        ctx.lineTo(x + w, baseY + 6);
        ctx.closePath();
        ctx.fill();
      }
    };

    let frame = 0;
    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      frame += 1;
      const currentMode = modeRef.current;

      const targetBoost = transRef.current ? 1 : 0;
      speedBoost += (targetBoost - speedBoost) * 0.08;

      ctx.clearRect(0, 0, width, height);

      // 1. Twinkling stars
      const starDrift =
        currentMode === "window" ? 0.16 + speedBoost * 8 : speedBoost * 10;
      for (const s of stars) {
        s.phase += s.speed;
        s.x -= starDrift;
        if (s.x < -4) s.x = width + 4;
        const twinkle = 0.4 + 0.6 * Math.sin(s.phase);

        if (speedBoost > 0.12) {
          ctx.strokeStyle = s.color;
          ctx.globalAlpha = twinkle * 0.7;
          ctx.lineWidth = s.r;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + speedBoost * 34, s.y);
          ctx.stroke();
        } else {
          ctx.fillStyle = s.color;
          ctx.globalAlpha = twinkle * 0.85;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // 2. Occasional shooting stars
      if (now - lastShootingStar > (currentMode === "window" ? 2800 : 4800)) {
        lastShootingStar = now;
        shooters.push({
          x: width * (0.45 + Math.random() * 0.55),
          y: height * (0.06 + Math.random() * 0.25),
          vx: -(6.5 + Math.random() * 4),
          vy: 1.8 + Math.random() * 1.4,
          len: 52 + Math.random() * 34,
          alpha: 0.95,
          decay: 0.024,
        });
      }
      for (let i = shooters.length - 1; i >= 0; i--) {
        const sh = shooters[i];
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.alpha -= sh.decay;
        if (sh.alpha <= 0) {
          shooters.splice(i, 1);
          continue;
        }
        const grad = ctx.createLinearGradient(
          sh.x,
          sh.y,
          sh.x - sh.vx * 6,
          sh.y - sh.vy * 6,
        );
        grad.addColorStop(0, `rgba(254,243,199,${sh.alpha})`);
        grad.addColorStop(1, "rgba(254,243,199,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x - sh.vx * (sh.len / 8), sh.y - sh.vy * (sh.len / 8));
        ctx.stroke();
      }

      // 3. Auto-fireworks only when enabled
      if (
        autoFireworksRef.current &&
        (currentMode === "window" || currentMode === "arrival")
      ) {
        const interval = currentMode === "arrival" ? 1400 : 2100;
        if (now - lastAutoFirework > interval) {
          lastAutoFirework = now;
          const tx = width * (0.16 + Math.random() * 0.68);
          const ty = height * (0.14 + Math.random() * 0.26);
          launchRocket(tx, ty, false, false);
        }
      }

      // Draw burst flash halos
      for (let i = flashes.length - 1; i >= 0; i--) {
        const fl = flashes[i];
        fl.alpha -= 0.022;
        fl.radius += 1.6;
        if (fl.alpha <= 0.01) {
          flashes.splice(i, 1);
          continue;
        }
        const g = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, fl.radius);
        g.addColorStop(0, fl.color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = fl.alpha;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, fl.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Update & draw rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 11) r.trail.shift();
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.055;

        for (let t = 0; t < r.trail.length; t++) {
          const pt = r.trail[t];
          ctx.fillStyle = "#FDE68A";
          ctx.globalAlpha = (t / r.trail.length) * 0.78;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r.big ? 2.1 : 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (r.y <= r.targetY || r.vy >= -0.4) {
          detonate(r.x, r.y, r.palette, r.audible, r.big);
          rockets.splice(i, 1);
        }
      }

      // Update & draw firework sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.trail.push({ x: sp.x, y: sp.y });
        if (sp.trail.length > 5) sp.trail.shift();
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.964;
        sp.vy = sp.vy * 0.964 + 0.042;
        sp.alpha -= sp.decay;

        if (sp.alpha <= 0.02) {
          sparks.splice(i, 1);
          continue;
        }

        if (sp.trail.length > 1) {
          ctx.strokeStyle = sp.color;
          ctx.globalAlpha = sp.alpha * 0.45;
          ctx.lineWidth = sp.size * 0.7;
          ctx.beginPath();
          ctx.moveTo(sp.trail[0].x, sp.trail[0].y);
          ctx.lineTo(sp.x, sp.y);
          ctx.stroke();
        }
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = sp.alpha;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 4. Parallax winter landscape
      if (currentMode === "window" || currentMode === "arrival") {
        const moveFactor = currentMode === "window" ? 0.75 : 0.16;
        scrollFar += (0.5 + speedBoost * 6) * moveFactor;
        scrollNear += (1.55 + speedBoost * 14) * moveFactor;

        drawMountainLayer(
          scrollFar,
          height * 0.8,
          42,
          0.008,
          "rgba(15, 21, 52, 0.85)",
        );
        drawMountainLayer(
          scrollNear * 0.55,
          height * 0.86,
          26,
          0.013,
          "rgba(9, 13, 34, 0.94)",
        );
        drawPineRow(scrollNear, height * 0.9);
      }

      // 5. Drifting golden snow / stardust
      for (const fl of snow) {
        fl.x += fl.vx * (currentMode === "window" ? 2.4 : 1) - speedBoost * 12;
        fl.y += fl.vy;
        if (fl.x < -8) fl.x = width + 8;
        if (fl.y > height + 8) {
          fl.y = -8;
          fl.x = Math.random() * width;
        }
        ctx.fillStyle = fl.gold ? "#FDE68A" : "#E0E7FF";
        ctx.globalAlpha = fl.alpha * (0.75 + 0.25 * Math.sin(frame * 0.04 + fl.r));
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, fl.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 z-[5] h-full w-full ${
        interactiveSky ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
      }`}
    />
  );
}
