"use client";

import React, { useEffect, useRef } from "react";

interface BatSwarmBurst {
  count: number;
  x: number;
  y: number;
}

interface SwarmBat {
  x: number;
  y: number;
  vx: number;
  vy: number;
  wobbleAmp: number;
  wobbleFreq: number;
  scale: number;
  grow: number;
  flapPhase: number;
  flapSpeed: number;
  alpha: number;
  decay: number;
}

interface HauntedAbyssCanvasProps {
  scrollProgress: number;
  isFastScrolling: boolean;
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  candyShowerTrigger: number;
  cauldronBurstTrigger: number;
  batSwarmBurst?: BatSwarmBurst;
}

interface BatUnit {
  xPct: number;
  yPct: number;
  vx: number;
  vy: number;
  scale: number;
  flapPhase: number;
  flapSpeed: number;
}

interface SpiritParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  color: string;
  kind: "wisp" | "candy" | "potion";
  rot: number;
  vRot: number;
}

const CANDY_COLORS = [
  "#fb923c", // pumpkin orange
  "#a855f7", // mystic violet
  "#84cc16", // potion lime
  "#fde047", // candy corn yellow
  "#f43f5e", // crimson sweet
  "#e9d5ff", // spectral white
];

export default function HauntedAbyssCanvas({
  scrollProgress,
  isFastScrolling,
  pointerRef,
  candyShowerTrigger,
  cauldronBurstTrigger,
  batSwarmBurst,
}: HauntedAbyssCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<SpiritParticle[]>([]);
  const swarmBatsRef = useRef<SwarmBat[]>([]);
  const stateRef = useRef({
    scrollProgress,
    isFastScrolling,
  });
  stateRef.current = {
    scrollProgress,
    isFastScrolling,
  };

  // Dramatic Flock of Bats erupting out of opened mystery envelope
  const swarmTriggerCount = batSwarmBurst?.count ?? 0;
  useEffect(() => {
    if (swarmTriggerCount <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width || window.innerWidth;
    const h = canvas.height || window.innerHeight;
    const rect = canvas.getBoundingClientRect();

    const ox =
      batSwarmBurst && batSwarmBurst.x > 0
        ? batSwarmBurst.x - rect.left
        : w * 0.5;
    const oy =
      batSwarmBurst && batSwarmBurst.y > 0
        ? batSwarmBurst.y - rect.top
        : h * 0.56;

    for (let i = 0; i < 46; i++) {
      const fanAngle = -Math.PI * 0.5 + (Math.random() - 0.5) * 2.55;
      const speed = 3.2 + Math.random() * 6.8;
      swarmBatsRef.current.push({
        x: ox + (Math.random() - 0.5) * 32,
        y: oy + (Math.random() - 0.5) * 18,
        vx: Math.cos(fanAngle) * speed,
        vy: Math.sin(fanAngle) * speed - 1.2,
        wobbleAmp: 0.4 + Math.random() * 1.4,
        wobbleFreq: 0.08 + Math.random() * 0.08,
        scale: 0.48 + Math.random() * 0.62,
        grow: 0.008 + Math.random() * 0.012,
        flapPhase: Math.random() * Math.PI * 2,
        flapSpeed: 0.34 + Math.random() * 0.24,
        alpha: 0.96,
        decay: 0.0045 + Math.random() * 0.004,
      });
    }

    // Golden-violet magic embers accompanying the bat flock
    for (let i = 0; i < 34; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 4.5;
      particlesRef.current.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1.5,
        size: 2.2 + Math.random() * 3.5,
        alpha: 0.95,
        decay: 0.016,
        gravity: 0.04,
        color: i % 2 === 0 ? "#fde047" : "#c084fc",
        kind: "wisp",
        rot: 0,
        vRot: 0,
      });
    }
  }, [swarmTriggerCount, batSwarmBurst]);

  // Trick-or-Treat Candy & Spooky Confetti Explosion
  useEffect(() => {
    if (candyShowerTrigger <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width || window.innerWidth;
    const h = canvas.height || window.innerHeight;

    for (let i = 0; i < 85; i++) {
      const fromLeft = i % 2 === 0;
      particlesRef.current.push({
        x: fromLeft ? w * 0.15 : w * 0.85,
        y: h * 0.72,
        vx: (fromLeft ? 1 : -1) * (2.5 + Math.random() * 6.5),
        vy: -6.5 - Math.random() * 7.2,
        size: 5 + Math.random() * 6,
        alpha: 1,
        decay: 0.008 + Math.random() * 0.006,
        gravity: 0.14,
        color: CANDY_COLORS[i % CANDY_COLORS.length],
        kind: "candy",
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.18,
      });
    }
  }, [candyShowerTrigger]);

  // Neon Potion Bubble Splash when stirring Witch Cauldron
  useEffect(() => {
    if (cauldronBurstTrigger <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width || window.innerWidth;
    const h = canvas.height || window.innerHeight;

    for (let i = 0; i < 36; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const spd = 2.2 + Math.random() * 4.8;
      particlesRef.current.push({
        x: w * 0.5 + (Math.random() - 0.5) * 40,
        y: h * 0.55,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 4 + Math.random() * 7,
        alpha: 0.95,
        decay: 0.012 + Math.random() * 0.008,
        gravity: 0.05,
        color: i % 2 === 0 ? "#a3e635" : "#c084fc",
        kind: "potion",
        rot: 0,
        vRot: 0,
      });
    }
  }, [cauldronBurstTrigger]);

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

    const bats: BatUnit[] = Array.from({ length: 11 }).map((_, idx) => ({
      xPct: Math.random(),
      yPct: 0.08 + (idx / 11) * 0.72,
      vx: (idx % 2 === 0 ? 1 : -1) * (0.0008 + Math.random() * 0.0014),
      vy: (Math.random() - 0.5) * 0.0003,
      scale: 0.55 + Math.random() * 0.65,
      flapPhase: Math.random() * Math.PI * 2,
      flapSpeed: 0.14 + Math.random() * 0.08,
    }));

    const drawBat = (
      bx: number,
      by: number,
      scale: number,
      flap: number,
      dir: number,
      alpha: number
    ) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(scale * (dir >= 0 ? 1 : -1), scale);
      ctx.fillStyle = `rgba(15, 7, 26, ${alpha})`;
      ctx.strokeStyle = `rgba(192, 132, 252, ${alpha * 0.35})`;
      ctx.lineWidth = 0.8;

      const wingLift = Math.sin(flap) * 11;
      ctx.beginPath();
      // Body
      ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
      // Left wing
      ctx.moveTo(-2, -1);
      ctx.quadraticCurveTo(-14, -12 + wingLift, -22, 2 + wingLift * 0.6);
      ctx.quadraticCurveTo(-11, 4, -3, 2);
      // Right wing
      ctx.moveTo(2, -1);
      ctx.quadraticCurveTo(14, -12 + wingLift, 22, 2 + wingLift * 0.6);
      ctx.quadraticCurveTo(11, 4, 3, 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    let rafId = 0;
    let tick = 0;

    const frame = () => {
      tick += 1;
      const { scrollProgress: prog, isFastScrolling: fast } = stateRef.current;
      const { x: px, y: py } = pointerRef.current;

      ctx.clearRect(0, 0, w, h);

      // Dynamic Flashlight Halo following pointer/touch
      const rect = canvas.getBoundingClientRect();
      const lx = px > 0 ? px - rect.left : w * (0.5 + Math.sin(tick * 0.015) * 0.18);
      const ly = py > 0 ? py - rect.top : h * (0.45 + Math.cos(tick * 0.012) * 0.14);

      const torchRadius = Math.min(w, h) * 0.36;
      const torchGrad = ctx.createRadialGradient(lx, ly, 4, lx, ly, torchRadius);
      torchGrad.addColorStop(0, "rgba(251, 146, 60, 0.18)");
      torchGrad.addColorStop(0.45, "rgba(168, 85, 247, 0.08)");
      torchGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = torchGrad;
      ctx.beginPath();
      ctx.arc(lx, ly, torchRadius, 0, Math.PI * 2);
      ctx.fill();

      // Flying Bat Silhouettes speeding up during fast scroll
      const speedMult = fast ? 3.2 : 1;
      bats.forEach((b) => {
        b.xPct += b.vx * speedMult;
        b.yPct += b.vy + Math.sin(tick * 0.04 + b.flapPhase) * 0.0006;
        b.flapPhase += b.flapSpeed * (fast ? 1.8 : 1);

        if (b.xPct < -0.1) b.xPct = 1.1;
        if (b.xPct > 1.1) b.xPct = -0.1;

        const batAlpha = 0.5 + (1 - Math.abs(prog - 0.5)) * 0.3;
        drawBat(b.xPct * w, b.yPct * h, b.scale, b.flapPhase, b.vx, batAlpha);
      });

      // Ambient drifting spooky wisps matched to current depth zone
      if (tick % 6 === 0) {
        const depthHue =
          prog < 0.33
            ? "#fb923c"
            : prog < 0.66
              ? "#a3e635"
              : "#c084fc";
        particlesRef.current.push({
          x: Math.random() * w,
          y: h + 15,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.7 - Math.random() * 1.1 - (fast ? 1.8 : 0),
          size: 1.5 + Math.random() * 3,
          alpha: 0.55,
          decay: 0.0045,
          gravity: 0,
          color: depthHue,
          kind: "wisp",
          rot: 0,
          vRot: 0,
        });
      }

      // Render particles (wisps, potion bubbles, candy confetti)
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.992;
        p.rot += p.vRot;
        p.alpha -= p.decay;

        if (p.alpha <= 0.02 || p.y > h + 50) return false;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        if (p.kind === "candy") {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        } else if (p.kind === "potion") {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 0.8;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        return true;
      });

      if (particlesRef.current.length > 220) {
        particlesRef.current.splice(0, particlesRef.current.length - 220);
      }

      // Render burst flock of bats unleashed from opened envelope
      swarmBatsRef.current = swarmBatsRef.current.filter((sb) => {
        sb.flapPhase += sb.flapSpeed;
        sb.x += sb.vx + Math.sin(tick * sb.wobbleFreq) * sb.wobbleAmp;
        sb.y += sb.vy + Math.cos(tick * sb.wobbleFreq * 1.2) * (sb.wobbleAmp * 0.6);
        sb.vx *= 1.008;
        sb.vy *= 1.006;
        sb.scale = Math.min(1.65, sb.scale + sb.grow);
        sb.alpha -= sb.decay;

        if (
          sb.alpha <= 0.03 ||
          sb.x < -80 ||
          sb.x > w + 80 ||
          sb.y < -80 ||
          sb.y > h + 80
        ) {
          return false;
        }

        drawBat(sb.x, sb.y, sb.scale, sb.flapPhase, sb.vx, sb.alpha);
        return true;
      });

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => {
      window.removeEventListener("resize", onResize);
      resizeObs?.disconnect();
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
