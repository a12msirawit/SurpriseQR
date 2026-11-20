"use client";

import React, { useEffect, useRef } from "react";
import {
  playBalloonWaterPop,
  playWaterDrop,
  playWaterSplash,
  unlockSongkranAudio,
} from "./songkranSound";

export type SongkranCanvasMode = "balloons" | "wipe" | "powder" | "carnival";

interface SongkranSplashCanvasProps {
  mode: SongkranCanvasMode;
  muted: boolean;
  cannonTrigger?: number;
  bucketTrigger?: number;
  onSplashAction?: () => void;
}

interface Balloon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  shineColor: string;
  bobPhase: number;
}

interface WaterStreamDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  trail: Array<{ x: number; y: number }>;
}

interface ScreenWaterDrip {
  x: number;
  y: number;
  r: number;
  vy: number;
  tailLen: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface RippleWave {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  color: string;
}

interface Blossom {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  size: number;
  color: string;
}

const BALLOON_PALETTE = [
  { fill: "#22D3EE", shine: "#CFFAFE" },
  { fill: "#F472B6", shine: "#FCE7F3" },
  { fill: "#FACC15", shine: "#FEF9C3" },
  { fill: "#34D399", shine: "#D1FAE5" },
  { fill: "#FB923C", shine: "#FFEDD5" },
];

const JET_COLORS = ["#FFFFFF", "#E0F2FE", "#67E8F9", "#22D3EE", "#FDE047"];

export default function SongkranSplashCanvas({
  mode,
  muted,
  cannonTrigger = 0,
  bucketTrigger = 0,
  onSplashAction,
}: SongkranSplashCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef(mode);
  const mutedRef = useRef(muted);
  const onActionRef = useRef(onSplashAction);

  const fireCannonsRef = useRef<((countMultiplier?: number) => void) | null>(null);
  const fireBucketFloodRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    onActionRef.current = onSplashAction;
  }, [onSplashAction]);

  useEffect(() => {
    if (!cannonTrigger) return;
    fireCannonsRef.current?.(1);
  }, [cannonTrigger]);

  useEffect(() => {
    if (!bucketTrigger) return;
    fireBucketFloodRef.current?.();
  }, [bucketTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;
    let isDragging = false;
    let lastSprayTs = 0;

    const balloons: Balloon[] = [];
    const drops: WaterStreamDrop[] = [];
    const screenDrips: ScreenWaterDrip[] = [];
    const ripples: RippleWave[] = [];
    const blossoms: Blossom[] = [];

    const spawnBalloon = (fromBottom = false) => {
      const p = BALLOON_PALETTE[Math.floor(Math.random() * BALLOON_PALETTE.length)];
      balloons.push({
        x: 36 + Math.random() * Math.max(80, width - 72),
        y: fromBottom ? height + 30 : 70 + Math.random() * (height * 0.65),
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(0.35 + Math.random() * 0.45),
        r: 16 + Math.random() * 7,
        color: p.fill,
        shineColor: p.shine,
        bobPhase: Math.random() * Math.PI * 2,
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = rect?.width || 380;
      height = rect?.height || 640;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (balloons.length === 0) {
        for (let i = 0; i < 6; i++) spawnBalloon(false);
      }

      if (blossoms.length === 0) {
        const bColors = ["#FDE047", "#FFFBEB", "#F9A8D4"];
        for (let i = 0; i < 16; i++) {
          blossoms.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: 0.25 + Math.random() * 0.45,
            vy: 0.4 + Math.random() * 0.55,
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.03,
            size: 4 + Math.random() * 3.5,
            color: bColors[i % bColors.length],
          });
        }
      }
    };

    resize();
    const obs = new ResizeObserver(resize);
    if (canvas.parentElement) obs.observe(canvas.parentElement);

    const soakScreenGlass = (amount = 10, originX?: number, originY?: number) => {
      for (let i = 0; i < amount; i++) {
        if (screenDrips.length >= 48) screenDrips.shift();
        screenDrips.push({
          x: originX !== undefined ? originX + (Math.random() - 0.5) * 140 : Math.random() * width,
          y: originY !== undefined ? originY + (Math.random() - 0.5) * 140 : Math.random() * (height * 0.75),
          r: 2.4 + Math.random() * 3.4,
          vy: 0.45 + Math.random() * 0.95,
          tailLen: 6 + Math.random() * 14,
          alpha: 0.78,
          life: 0,
          maxLife: 110 + Math.random() * 90,
        });
      }
    };

    const spawnBurst = (x: number, y: number, tint?: string, big = false) => {
      ripples.push({
        x,
        y,
        r: 6,
        maxR: big ? 135 : 85,
        alpha: 0.85,
        color: tint || "#67E8F9",
      });

      const count = big ? 48 : 28;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        const speed = (Math.random() * 5.2 + 2.2) * (big ? 1.25 : 1);
        drops.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.8,
          gravity: 0.16,
          drag: 0.96,
          size: Math.random() * 3.2 + 1.8,
          color: tint && i % 2 === 0 ? tint : JET_COLORS[i % JET_COLORS.length],
          alpha: 0.98,
          decay: 0.015 + Math.random() * 0.01,
          trail: [],
        });
      }
      soakScreenGlass(big ? 12 : 6, x, y);
    };

    const shootWaterJet = (fromX: number, fromY: number, toX: number, toY: number, count = 26) => {
      const dx = toX - fromX;
      const dy = toY - fromY;
      const dist = Math.max(40, Math.hypot(dx, dy));
      const baseAngle = Math.atan2(dy, dx);
      const baseSpeed = Math.min(14, Math.max(7.5, dist / 24));

      for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * 0.22;
        const speed = baseSpeed * (0.75 + Math.random() * 0.45);
        drops.push({
          x: fromX,
          y: fromY,
          vx: Math.cos(baseAngle + spread) * speed,
          vy: Math.sin(baseAngle + spread) * speed,
          gravity: 0.14,
          drag: 0.978,
          size: Math.random() * 3 + 1.8,
          color: JET_COLORS[i % JET_COLORS.length],
          alpha: 0.95,
          decay: 0.013 + Math.random() * 0.008,
          trail: [],
        });
      }
    };

    fireCannonsRef.current = (mult = 1) => {
      const targetX = width * (0.3 + Math.random() * 0.4);
      const targetY = height * (0.25 + Math.random() * 0.35);
      shootWaterJet(12, height - 10, targetX, targetY, Math.round(32 * mult));
      shootWaterJet(width - 12, height - 10, targetX, targetY, Math.round(32 * mult));
      soakScreenGlass(18);
      setTimeout(() => spawnBurst(targetX, targetY, "#67E8F9", true), 220);
    };

    fireBucketFloodRef.current = () => {
      // Giant wall of water splashing from bottom upward across full width!
      for (let k = 0; k < 5; k++) {
        const sx = width * (0.1 + k * 0.2);
        shootWaterJet(sx, height, sx + (Math.random() - 0.5) * 80, height * 0.15, 22);
      }
      soakScreenGlass(28);
      spawnBurst(width * 0.5, height * 0.52, "#22D3EE", true);
    };

    const splashAtPoint = (px: number, py: number, fromMove = false) => {
      // 1. Check balloon hit!
      if (!fromMove) {
        let hitBalloon = false;
        for (let i = balloons.length - 1; i >= 0; i--) {
          const b = balloons[i];
          if (Math.hypot(px - b.x, py - b.y) <= b.r + 22) {
            spawnBurst(b.x, b.y, b.color, true);
            balloons.splice(i, 1);
            hitBalloon = true;
            if (!mutedRef.current) playBalloonWaterPop();
            onActionRef.current?.();
            setTimeout(() => spawnBalloon(true), 700);
          }
        }
        if (hitBalloon) return;
      }

      // 2. Shoot pressurized water jet toward pointer!
      const fromLeft = px < width * 0.5;
      shootWaterJet(fromLeft ? 16 : width - 16, height - 12, px, py, fromMove ? 6 : 22);
      if (!fromMove) {
        spawnBurst(px, py, undefined, false);
        onActionRef.current?.();
        if (!mutedRef.current) {
          if (modeRef.current === "powder") playWaterDrop();
          else playWaterSplash(1);
        }
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      unlockSongkranAudio();
      isDragging = true;
      const rect = canvas.getBoundingClientRect();
      splashAtPoint(e.clientX - rect.left, e.clientY - rect.top, false);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const now = performance.now();
      if (now - lastSprayTs < 45) return;
      lastSprayTs = now;
      const rect = canvas.getBoundingClientRect();
      splashAtPoint(e.clientX - rect.left, e.clientY - rect.top, true);
      soakScreenGlass(1, e.clientX - rect.left, e.clientY - rect.top);
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    const drawBalloon = (b: Balloon, time: number) => {
      const bobX = Math.sin(time * 0.002 + b.bobPhase) * 3;
      const x = b.x + bobX;
      const y = b.y;
      ctx.save();
      // String curl
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + b.r * 1.1);
      ctx.quadraticCurveTo(x + 4, y + b.r + 10, x - 2, y + b.r + 18);
      ctx.stroke();

      // Glossy teardrop water balloon body
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.86;
      ctx.beginPath();
      ctx.ellipse(x, y, b.r * 0.92, b.r * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.stroke();

      // Glossy specular shine
      ctx.fillStyle = b.shineColor;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(x - b.r * 0.32, y - b.r * 0.36, b.r * 0.24, b.r * 0.38, -0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // 1. Floating Golden Ratchapruek & Festival Blossoms
      for (let i = 0; i < blossoms.length; i++) {
        const fl = blossoms[i];
        fl.x += fl.vx + Math.sin(time * 0.001 + i) * 0.2;
        fl.y += fl.vy;
        fl.rot += fl.vRot;
        if (fl.y > height + 16) {
          fl.y = -14;
          fl.x = Math.random() * width;
        }
        if (fl.x > width + 16) fl.x = -12;

        ctx.save();
        ctx.translate(fl.x, fl.y);
        ctx.rotate(fl.rot);
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = fl.color;
        for (let p = 0; p < 4; p++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.ellipse(0, -fl.size * 0.45, fl.size * 0.28, fl.size * 0.48, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 2. Interactive Floating Water Balloons (Stages 1, 2 & 4)
      if (modeRef.current === "balloons" || modeRef.current === "carnival") {
        for (let i = balloons.length - 1; i >= 0; i--) {
          const b = balloons[i];
          b.x += b.vx;
          b.y += b.vy;
          if (b.x < 24 || b.x > width - 24) b.vx *= -1;
          if (b.y < -30) {
            b.y = height + 30;
            b.x = 30 + Math.random() * Math.max(60, width - 60);
          }
          drawBalloon(b, time);
        }
      }

      // 3. Expanding Splash Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += (rp.maxR - rp.r) * 0.1 + 1.2;
        rp.alpha -= 0.022;
        if (rp.alpha <= 0) {
          ripples.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = rp.alpha;
          ctx.strokeStyle = rp.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 4. Pressurized Water Cannon Jet Drops
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.trail.push({ x: d.x, y: d.y });
        if (d.trail.length > 6) d.trail.shift();
        d.vx *= d.drag;
        d.vy *= d.drag;
        d.vy += d.gravity;
        d.x += d.vx;
        d.y += d.vy;
        d.alpha -= d.decay;

        if (d.alpha <= 0 || d.y > height + 20) {
          drops.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = d.alpha;
        if (d.trail.length > 1) {
          ctx.strokeStyle = d.color;
          ctx.lineWidth = d.size * 0.9;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(d.trail[0].x, d.trail[0].y);
          for (let j = 1; j < d.trail.length; j++) ctx.lineTo(d.trail[j].x, d.trail[j].y);
          ctx.lineTo(d.x, d.y);
          ctx.stroke();
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. Full-Screen Glass Drips Sliding Down Viewport
      for (let i = screenDrips.length - 1; i >= 0; i--) {
        const g = screenDrips[i];
        g.y += g.vy;
        g.life += 1;
        if (g.life >= g.maxLife || g.y > height + 20) {
          screenDrips.splice(i, 1);
          continue;
        }
        const fade = g.alpha * Math.sin((g.life / g.maxLife) * Math.PI);
        ctx.save();
        ctx.globalAlpha = fade;
        // Thin clear trail above droplet
        ctx.strokeStyle = "rgba(224, 242, 254, 0.35)";
        ctx.lineWidth = g.r * 0.65;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(g.x, g.y - g.tailLen);
        ctx.lineTo(g.x, g.y);
        ctx.stroke();

        // Spherical lens water bead
        ctx.fillStyle = "rgba(186, 230, 253, 0.45)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(g.x - g.r * 0.3, g.y - g.r * 0.3, g.r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      obs.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10 h-full w-full touch-none cursor-crosshair"
    />
  );
}
