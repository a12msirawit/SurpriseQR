"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { Sparkles, ZoomIn } from "lucide-react";

interface MistParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  grow: number;
  alpha: number;
  decay: number;
  color: string;
  kind: "smoke" | "sparkle";
}

interface InteractiveFogFrameProps {
  imageUrl: string;
  imageAlt: string;
  mistCleared: boolean;
  studio?: boolean;
  onFallbackImage: () => void;
  onMistClearedChange: (cleared: boolean) => void;
  onBrushStrokeSound: (grandClear?: boolean) => void;
  onInspectPhoto?: () => void;
  imageEditableProps?: React.HTMLAttributes<HTMLDivElement>;
}

const SPARKLE_COLORS = ["#fde68a", "#fb923c", "#d8b4fe", "#f9a8d4", "#fef3c7"];

/**
 * Interactive moonlight-mist brush frame over Photo 1.
 * Supports true pointer/touch brushing with destination-out mist erasure,
 * swirling smoke clouds, stardust sparkles, and a grand blast reveal.
 */
export default function InteractiveFogFrame({
  imageUrl,
  imageAlt,
  mistCleared,
  studio = false,
  onFallbackImage,
  onMistClearedChange,
  onBrushStrokeSound,
  onInspectPhoto,
  imageEditableProps,
}: InteractiveFogFrameProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<MistParticle[]>([]);
  const lastSampleCheckRef = useRef<number>(0);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const mistClearedRef = useRef(mistCleared);
  mistClearedRef.current = mistCleared;

  const paintBaseMist = useCallback(() => {
    const canvas = fogCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);

    // Rich moonlit violet-indigo veil
    const baseGrad = ctx.createLinearGradient(0, 0, w, h);
    baseGrad.addColorStop(0, "rgba(18, 8, 36, 0.92)");
    baseGrad.addColorStop(0.5, "rgba(30, 14, 54, 0.88)");
    baseGrad.addColorStop(1, "rgba(22, 9, 40, 0.93)");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    // Layered billowing clouds & warm amber moonbeams inside the mist
    for (let i = 0; i < 28; i++) {
      const cx = ((i * 97) % 100) * 0.01 * w;
      const cy = ((i * 53 + 17) % 100) * 0.01 * h;
      const r = 46 + (i % 5) * 26;
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
      const isWarm = i % 4 === 0;
      g.addColorStop(
        0,
        isWarm ? "rgba(251, 146, 60, 0.24)" : "rgba(216, 180, 254, 0.28)"
      );
      g.addColorStop(
        0.55,
        isWarm ? "rgba(192, 132, 252, 0.14)" : "rgba(139, 92, 246, 0.12)"
      );
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft floating stardust specs baked into mist
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 71 + 19) % 100) * 0.01 * w;
      const sy = ((i * 39 + 11) % 100) * 0.01 * h;
      ctx.fillStyle =
        i % 3 === 0 ? "rgba(253, 224, 71, 0.45)" : "rgba(233, 213, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + (i % 3) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const spawnBrushEffects = useCallback(
    (x: number, y: number, vxBias: number, vyBias: number, intense = false) => {
      const smokeCount = intense ? 7 : 3;
      const sparkleCount = intense ? 8 : 3;

      for (let i = 0; i < smokeCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 0.6 + Math.random() * (intense ? 2.8 : 1.6);
        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * 22,
          y: y + (Math.random() - 0.5) * 22,
          vx: Math.cos(ang) * spd + vxBias * 0.15,
          vy: Math.sin(ang) * spd + vyBias * 0.15 - 0.45,
          radius: 14 + Math.random() * 18,
          grow: 0.45 + Math.random() * 0.45,
          alpha: intense ? 0.55 : 0.4,
          decay: intense ? 0.014 : 0.018,
          color: i % 2 === 0 ? "rgba(233, 213, 255, 1)" : "rgba(254, 215, 170, 1)",
          kind: "smoke",
        });
      }

      for (let i = 0; i < sparkleCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1 + Math.random() * (intense ? 3.5 : 2.1);
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(ang) * spd + vxBias * 0.1,
          vy: Math.sin(ang) * spd + vyBias * 0.1 - 0.3,
          radius: 1.8 + Math.random() * 2.6,
          grow: 0,
          alpha: 0.95,
          decay: 0.022 + Math.random() * 0.015,
          color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
          kind: "sparkle",
        });
      }
    },
    []
  );

  // Grand swirling dispersion burst when clearing or crossing threshold
  const prevClearedRef = useRef(mistCleared);
  useEffect(() => {
    const fx = fxCanvasRef.current;
    const fog = fogCanvasRef.current;

    if (mistCleared && !prevClearedRef.current && fx) {
      const w = fx.width || 400;
      const h = fx.height || 260;
      const cx = w * 0.5;
      const cy = h * 0.5;
      for (let i = 0; i < 42; i++) {
        const angle = (i / 42) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 12 + Math.random() * (w * 0.25);
        const speed = 2.2 + Math.random() * 3.8;
        particlesRef.current.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * (dist * 0.55),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.7 - 0.5,
          radius: 18 + Math.random() * 22,
          grow: 0.55,
          alpha: 0.62,
          decay: 0.013,
          color: i % 3 === 0 ? "rgba(253, 224, 71, 1)" : "rgba(233, 213, 255, 1)",
          kind: "smoke",
        });
        particlesRef.current.push({
          x: cx + Math.cos(angle) * dist * 0.6,
          y: cy + Math.sin(angle) * dist * 0.4,
          vx: Math.cos(angle) * (speed * 1.15),
          vy: Math.sin(angle) * (speed * 1.15),
          radius: 2 + Math.random() * 3,
          grow: 0,
          alpha: 1,
          decay: 0.018,
          color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
          kind: "sparkle",
        });
      }
    } else if (!mistCleared && prevClearedRef.current && fog) {
      paintBaseMist();
      lastPointerRef.current = null;
    }

    prevClearedRef.current = mistCleared;
  }, [mistCleared, paintBaseMist]);

  // Size both canvases and run lightweight FX particle loop
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const fog = fogCanvasRef.current;
    const fx = fxCanvasRef.current;
    if (!wrapper || !fog || !fx) return;

    const syncSize = () => {
      const w = Math.max(240, wrapper.clientWidth);
      const h = Math.max(180, wrapper.clientHeight);
      if (fog.width !== w || fog.height !== h) {
        fog.width = w;
        fog.height = h;
        if (!mistClearedRef.current) {
          paintBaseMist();
        }
      }
      if (fx.width !== w || fx.height !== h) {
        fx.width = w;
        fx.height = h;
      }
    };

    syncSize();
    const obs =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSize) : null;
    obs?.observe(wrapper);

    const ctx = fx.getContext("2d");
    let rafId = 0;

    const tick = () => {
      if (ctx) {
        ctx.clearRect(0, 0, fx.width, fx.height);
        particlesRef.current = particlesRef.current.filter((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.965;
          p.vy *= 0.965;
          p.radius += p.grow;
          p.alpha -= p.decay;
          if (p.alpha <= 0.015) return false;

          ctx.save();
          if (p.kind === "smoke") {
            const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius);
            g.addColorStop(
              0,
              p.color.replace(", 1)", `, ${(p.alpha * 0.45).toFixed(3)})`)
            );
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          return true;
        });

        if (particlesRef.current.length > 180) {
          particlesRef.current.splice(0, particlesRef.current.length - 180);
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      obs?.disconnect();
      window.cancelAnimationFrame(rafId);
    };
  }, [paintBaseMist]);

  const checkClearedProgress = useCallback(() => {
    const now = performance.now();
    if (now - lastSampleCheckRef.current < 150) return;
    lastSampleCheckRef.current = now;

    const fog = fogCanvasRef.current;
    if (!fog || mistClearedRef.current) return;
    const ctx = fog.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    try {
      const { width, height } = fog;
      const data = ctx.getImageData(0, 0, width, height).data;
      let cleared = 0;
      let total = 0;
      const step = 16;
      for (let y = 8; y < height; y += step) {
        for (let x = 8; x < width; x += step) {
          const alpha = data[(y * width + x) * 4 + 3];
          total += 1;
          if (alpha < 65) cleared += 1;
        }
      }
      if (total > 0 && cleared / total >= 0.5) {
        onBrushStrokeSound(true);
        onMistClearedChange(true);
      }
    } catch {
      // ignore readback errors
    }
  }, [onBrushStrokeSound, onMistClearedChange]);

  const eraseMistAt = (x: number, y: number, radius = 56, intense = false) => {
    const fog = fogCanvasRef.current;
    if (!fog || mistClearedRef.current || studio) return;
    const ctx = fog.getContext("2d");
    if (!ctx) return;

    const prev = lastPointerRef.current;
    const vx = prev ? x - prev.x : 0;
    const vy = prev ? y - prev.y : 0;
    lastPointerRef.current = { x, y };

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";

    const brushSteps = prev
      ? Math.min(5, Math.max(1, Math.ceil(Math.hypot(vx, vy) / 18)))
      : 1;
    for (let s = 0; s < brushSteps; s++) {
      const t = brushSteps === 1 ? 1 : (s + 1) / brushSteps;
      const bx = prev ? prev.x + vx * t : x;
      const by = prev ? prev.y + vy * t : y;
      const grad = ctx.createRadialGradient(bx, by, radius * 0.2, bx, by, radius);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(0.65, "rgba(0,0,0,0.7)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    spawnBrushEffects(x, y, vx, vy, intense);
    onBrushStrokeSound(false);
    checkClearedProgress();
  };

  return (
    <div
      ref={wrapperRef}
      {...imageEditableProps}
      onPointerMove={(e) => {
        if (mistCleared || studio) return;
        // Desktop mouse brushes effortlessly on hover; touch brushes during drag
        if (e.pointerType === "mouse" || e.buttons > 0) {
          const rect = e.currentTarget.getBoundingClientRect();
          eraseMistAt(e.clientX - rect.left, e.clientY - rect.top, 56, false);
        }
      }}
      onPointerDown={(e) => {
        if (mistCleared || studio) return;
        const rect = e.currentTarget.getBoundingClientRect();
        lastPointerRef.current = null;
        eraseMistAt(e.clientX - rect.left, e.clientY - rect.top, 74, true);
      }}
      onPointerLeave={() => {
        lastPointerRef.current = null;
      }}
      onClick={(e) => {
        if (imageEditableProps?.onClick) {
          imageEditableProps.onClick(e);
          return;
        }
        if ((mistCleared || studio) && onInspectPhoto) {
          onInspectPhoto();
        }
      }}
      className={`group relative touch-pan-y overflow-hidden rounded-2xl border border-amber-300/35 bg-black ${
        imageEditableProps?.onClick
          ? "cursor-pointer"
          : mistCleared
            ? "cursor-zoom-in"
            : "cursor-grab active:cursor-grabbing"
      }`}
    >
      <img
        src={imageUrl}
        alt={imageAlt}
        onError={onFallbackImage}
        className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] sm:h-72"
      />

      {/* Brushable Fog Curtain */}
      <canvas
        ref={fogCanvasRef}
        className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-700 ${
          mistCleared || studio ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Swirling Mist & Stardust FX Overlay */}
      <canvas
        ref={fxCanvasRef}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />

      {!mistCleared && !studio ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/40 bg-[#140724]/80 px-3.5 py-1 text-[11px] font-medium text-amber-100 shadow-lg backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-orange-300" />
            <span>ปัดนิ้วหรือเมาส์ไล่หมอก เพื่อเผยภาพความทรงจำ</span>
          </span>
        </div>
      ) : onInspectPhoto && !imageEditableProps?.onClick ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInspectPhoto();
          }}
          className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-black/75 px-3 py-1.5 text-[11px] font-bold text-amber-100 shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-orange-500/30"
        >
          <ZoomIn className="h-3.5 w-3.5 text-amber-300" />
          <span>กดดูรูปขนาดเต็ม</span>
        </button>
      ) : null}
    </div>
  );
}
