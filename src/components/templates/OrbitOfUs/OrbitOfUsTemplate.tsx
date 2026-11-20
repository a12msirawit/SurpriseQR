"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, Heart, Sparkles, Volume2, VolumeX } from "lucide-react";
import type { SurpriseQRData } from "@/types/templates";
import BackgroundAudioPlayer from "@/components/audio/BackgroundAudioPlayer";
import TypewriterText from "@/components/templates/GrandNewYear/TypewriterText";

export interface OrbitOfUsTemplateProps {
  config?: Partial<SurpriseQRData>;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

export type GalaxyPaletteKey = "rose-nebula" | "midnight-gold" | "sakura-galaxy";

interface PaletteTheme {
  coreHex: string;
  midHex: string;
  outerHex: string;
  goldHex: string;
  heartHex: string;
  frameStroke: string;
  textGlow: string;
  bgGradient: string;
}

const PALETTES: Record<GalaxyPaletteKey, PaletteTheme> = {
  "rose-nebula": {
    coreHex: "#fff1f2",
    midHex: "#f472b6",
    outerHex: "#818cf8",
    goldHex: "#fde68a",
    heartHex: "#fb7185",
    frameStroke: "#f472b6",
    textGlow: "rgba(244, 114, 182, 0.92)",
    bgGradient: "radial-gradient(ellipse at center, #1b0a2e 0%, #090516 58%, #020108 100%)",
  },
  "midnight-gold": {
    coreHex: "#fffbeb",
    midHex: "#fbbf24",
    outerHex: "#38bdf8",
    goldHex: "#fde047",
    heartHex: "#f59e0b",
    frameStroke: "#fbbf24",
    textGlow: "rgba(251, 191, 36, 0.92)",
    bgGradient: "radial-gradient(ellipse at center, #1c1632 0%, #070b1c 58%, #02030a 100%)",
  },
  "sakura-galaxy": {
    coreHex: "#fff5f7",
    midHex: "#f9a8d4",
    outerHex: "#c084fc",
    goldHex: "#fef08a",
    heartHex: "#f472b6",
    frameStroke: "#f9a8d4",
    textGlow: "rgba(249, 168, 212, 0.92)",
    bgGradient: "radial-gradient(ellipse at center, #250e30 0%, #0c061a 58%, #030109 100%)",
  },
};

type OrbitStage = "intro" | "warp1" | "pin" | "warp2" | "explore" | "heart";

interface OrbitPhotoItem {
  src: string;
}

interface ElapsedAnniversary {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Parse a start date (YYYY-MM-DD, YYYY-MM-DDTHH:mm, DD/MM/YYYY, or integer days)
 * into a local epoch timestamp in milliseconds for live Days/Hours/Minutes/Seconds counting.
 */
function parseAnniversaryStartMs(rawInput?: string): number {
  const trimmed = (rawInput ?? "").trim();
  const fallback = Date.now() - 365 * 86400000;
  if (!trimmed) return fallback;

  if (/^\d+$/.test(trimmed)) {
    return Date.now() - Math.max(0, Number(trimmed)) * 86400000;
  }

  const isoDateTime = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2}))?$/,
  );
  if (isoDateTime) {
    const year = Number(isoDateTime[1]);
    const month = Number(isoDateTime[2]) - 1;
    const day = Number(isoDateTime[3]);
    const hour = isoDateTime[4] ? Number(isoDateTime[4]) : 0;
    const min = isoDateTime[5] ? Number(isoDateTime[5]) : 0;
    const ms = new Date(year, month, day, hour, min, 0).getTime();
    if (Number.isFinite(ms)) return ms;
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})\s*[•/.-]\s*(\d{1,2})\s*[•/.-]\s*(\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]) - 1;
    const year = Number(dmyMatch[3]);
    const ms = new Date(year, month, day, 0, 0, 0).getTime();
    if (Number.isFinite(ms)) return ms;
  }

  return fallback;
}

function computeElapsedAnniversary(startMs: number): ElapsedAnniversary {
  const totalSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}

/** Soft radial glow dot texture for galaxy stars & core nebula. */
function createStarGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.22, "rgba(255, 255, 255, 0.82)");
  grad.addColorStop(0.52, "rgba(255, 255, 255, 0.22)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** 4-point diffraction star-flare texture for bright hero stars. */
function createDiffractionStarTexture(): THREE.CanvasTexture {
  const size = 128;
  const half = size / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const radial = ctx.createRadialGradient(half, half, 0, half, half, half);
  radial.addColorStop(0, "rgba(255, 255, 255, 1)");
  radial.addColorStop(0.18, "rgba(255, 255, 255, 0.78)");
  radial.addColorStop(0.45, "rgba(255, 255, 255, 0.16)");
  radial.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(half, half);
  for (let r = 0; r < 2; r++) {
    const spikeGrad = ctx.createLinearGradient(-half, 0, half, 0);
    spikeGrad.addColorStop(0, "rgba(255,255,255,0)");
    spikeGrad.addColorStop(0.42, "rgba(255,255,255,0.45)");
    spikeGrad.addColorStop(0.5, "rgba(255,255,255,0.95)");
    spikeGrad.addColorStop(0.58, "rgba(255,255,255,0.45)");
    spikeGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = spikeGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, half * 0.92, 2.2, r * (Math.PI / 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Render Thai/English phrase onto a high-DPI 1024x224 HTML5 Canvas after fonts load,
 * producing an ultra-crisp, high-contrast glowing 3D Sprite texture.
 */
function createPhraseCanvasTexture(phrase: string, theme: PaletteTheme): THREE.CanvasTexture {
  const width = 1024;
  const height = 224;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, width, height);

  const clipped = phrase.length > 30 ? `${phrase.slice(0, 29)}…` : phrase;
  ctx.font = '700 46px "Noto Sans Thai", "Plus Jakarta Sans", sans-serif';
  const measuredW = ctx.measureText(clipped).width;
  const pillW = Math.min(width - 64, Math.max(340, measuredW + 116));
  const pillH = 116;
  const padX = (width - pillW) / 2;
  const padY = (height - pillH) / 2;
  const r = pillH / 2;

  // High-contrast deep cosmic pill backdrop so stars behind never make text blurry
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(padX, padY, pillW, pillH, r);
  const bgGrad = ctx.createLinearGradient(padX, padY, padX + pillW, padY + pillH);
  bgGrad.addColorStop(0, "rgba(10, 6, 24, 0.92)");
  bgGrad.addColorStop(0.5, "rgba(24, 12, 46, 0.95)");
  bgGrad.addColorStop(1, "rgba(10, 6, 24, 0.92)");
  ctx.fillStyle = bgGrad;
  ctx.shadowColor = theme.textGlow;
  ctx.shadowBlur = 26;
  ctx.fill();

  ctx.lineWidth = 3.5;
  ctx.strokeStyle = theme.frameStroke;
  ctx.globalAlpha = 0.92;
  ctx.stroke();
  ctx.restore();

  // Razor-sharp white Thai/English typography with soft outer glow
  ctx.save();
  ctx.font = '700 46px "Noto Sans Thai", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = theme.textGlow;
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(clipped, width / 2, height / 2 + 2);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Paint the live Anniversary Days + Hours + Minutes + Seconds crest onto a reusable
 * offscreen Canvas so it ticks every second in 3D space with zero React re-renders.
 */
function paintAnniversaryGalaxyCrest(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  title: string,
  elapsed: ElapsedAnniversary,
  theme: PaletteTheme,
) {
  ctx.clearRect(0, 0, width, height);

  // Soft circular ambient backdrop glow
  const glow = ctx.createRadialGradient(
    width / 2,
    height * 0.52,
    12,
    width / 2,
    height * 0.52,
    400,
  );
  glow.addColorStop(0, "rgba(14, 8, 32, 0.72)");
  glow.addColorStop(0.58, "rgba(14, 8, 32, 0.28)");
  glow.addColorStop(1, "rgba(14, 8, 32, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const drawStar = (cx: number, cy: number, outerR: number, innerR: number, color: string) => {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI) / 4;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.shadowColor = theme.textGlow;
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.restore();
  };

  // Top universe title
  if (title.trim()) {
    ctx.save();
    ctx.font = '600 26px "Noto Sans Thai", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = theme.goldHex;
    ctx.shadowColor = theme.textGlow;
    ctx.shadowBlur = 14;
    ctx.fillText(title.trim().toUpperCase(), width / 2, 72);
    ctx.restore();
  }

  // Hero Elapsed Days line (e.g. "365 วัน")
  const dayLabel = `${elapsed.days.toLocaleString("en-US")} วัน`;
  ctx.save();
  ctx.font = '800 68px "Noto Sans Thai", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = theme.textGlow;
  ctx.shadowBlur = 28;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(dayLabel, width / 2, 148);
  const textW = ctx.measureText(dayLabel).width;
  ctx.restore();

  const starOffset = Math.min(width * 0.42, Math.max(175, textW / 2 + 48));
  drawStar(width / 2 - starOffset, 148, 12, 4, theme.goldHex);
  drawStar(width / 2 + starOffset, 148, 12, 4, theme.goldHex);

  // Delicate hairline divider
  const lineGrad = ctx.createLinearGradient(
    width / 2 - 240,
    204,
    width / 2 + 240,
    204,
  );
  lineGrad.addColorStop(0, "rgba(255,255,255,0)");
  lineGrad.addColorStop(0.25, theme.frameStroke);
  lineGrad.addColorStop(0.5, theme.goldHex);
  lineGrad.addColorStop(0.75, theme.frameStroke);
  lineGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = lineGrad;
  ctx.fillRect(width / 2 - 240, 202, 480, 2);

  // Live Ticking Time Line: Hours · Minutes · Seconds
  const hh = String(elapsed.hours).padStart(2, "0");
  const mm = String(elapsed.minutes).padStart(2, "0");
  const ss = String(elapsed.seconds).padStart(2, "0");
  const timeText = `${hh} ชม.   ${mm} นาที   ${ss} วินาที`;

  ctx.save();
  ctx.font = '600 34px "Noto Sans Thai", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = theme.textGlow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = theme.coreHex;
  ctx.fillText(timeText, width / 2, 254);
  ctx.restore();
}

function createAnniversaryGalaxyCrestResource(
  title: string,
  startMs: number,
  theme: PaletteTheme,
): {
  texture: THREE.CanvasTexture;
  update: () => void;
} {
  const width = 1024;
  const height = 340;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const update = () => {
    paintAnniversaryGalaxyCrest(
      ctx,
      width,
      height,
      title,
      computeElapsedAnniversary(startMs),
      theme,
    );
    texture.needsUpdate = true;
  };

  update();
  return { texture, update };
}

/**
 * Create a high-contrast 512x512 rounded-square photo card texture for 3D orbit planes.
 */
function createOrbitPhotoCardTexture(
  imageUrl: string,
  theme: PaletteTheme,
  index: number,
  onReady?: () => void,
): THREE.CanvasTexture {
  const size = 512;
  const pad = 18;
  const inner = size - pad * 2;
  const radius = 40;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const drawFrameAndContent = (img?: HTMLImageElement) => {
    ctx.clearRect(0, 0, size, size);

    // Subtle soft ambient glow behind frameless rounded photo
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad, pad, inner, inner, radius);
    ctx.shadowColor = theme.textGlow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(12, 8, 28, 0.9)";
    ctx.fill();
    ctx.restore();

    // Clipped 1:1 photo (clean & frameless)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad, pad, inner, inner, radius);
    ctx.clip();

    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const side = Math.min(iw, ih);
      const sx = (iw - side) / 2;
      const sy = (ih - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, pad, pad, inner, inner);
    } else {
      const g = ctx.createRadialGradient(
        size * 0.4,
        size * 0.38,
        20,
        size * 0.5,
        size * 0.5,
        inner * 0.7,
      );
      g.addColorStop(0, theme.coreHex);
      g.addColorStop(0.38, theme.midHex);
      g.addColorStop(0.78, theme.outerHex);
      g.addColorStop(1, "#090618");
      ctx.fillStyle = g;
      ctx.fillRect(pad, pad, inner, inner);

      ctx.fillStyle = "#ffffff";
      for (let s = 0; s < 24; s++) {
        const px = pad + 40 + ((s * 73 + index * 31) % (inner - 80));
        const py = pad + 40 + ((s * 59 + index * 47) % (inner - 80));
        ctx.globalAlpha = 0.4 + (s % 4) * 0.15;
        ctx.beginPath();
        ctx.arc(px, py, 1.8 + (s % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // Barely-there delicate glass edge sheen (no thick/harsh frame)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad + 1, pad + 1, inner - 2, inner - 2, radius);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.stroke();
    ctx.restore();
  };

  drawFrameAndContent();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  if (imageUrl && typeof window !== "undefined") {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      drawFrameAndContent(img);
      texture.needsUpdate = true;
      onReady?.();
    };
    img.src = imageUrl;
  }

  return texture;
}

/** Web Audio synthesized cosmic ambience & sound effects. */
class CosmicAudioEngine {
  private ctx: AudioContext | null = null;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;
  private activeNodes: AudioNode[] = [];

  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.ctx || this.ctx.state === "closed") {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === "suspended") {
        void this.ctx.resume().catch(() => { });
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public unlock() {
    this.ensureCtx();
  }

  public playBigBangWarp() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = "sine";
      sub.frequency.setValueAtTime(48, now);
      sub.frequency.exponentialRampToValueAtTime(132, now + 1.5);
      sub.frequency.exponentialRampToValueAtTime(44, now + 3.0);
      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.exponentialRampToValueAtTime(0.22, now + 1.15);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.1);
      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 3.2);

      [392, 523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + 0.35 + idx * 0.24;
        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.075, t + 0.16);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 2.2);
      });
    } catch {
      // Ignore
    }
  }

  public playKeyTick(freq = 880) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } catch {
      // Ignore
    }
  }

  public playPhotoChime() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [659.25, 987.77, 1318.51].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.065;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.075, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.8);
      });
    } catch {
      // Ignore
    }
  }

  public playHeartConvergence() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.14;
        osc.type = idx < 2 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq * 0.98, t);
        osc.frequency.exponentialRampToValueAtTime(freq, t + 0.45);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(idx < 2 ? 0.09 : 0.065, t + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 2.25);
      });
    } catch {
      // Ignore
    }
  }

  public startAmbience() {
    this.stopAmbience();
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const melody: Array<[number, number, number]> = [
      [523.25, 261.63, 1.4],
      [659.25, 329.63, 1.4],
      [783.99, 392.0, 1.8],
      [659.25, 329.63, 1.4],
      [880.0, 440.0, 1.6],
      [783.99, 392.0, 1.6],
      [659.25, 329.63, 1.4],
      [587.33, 293.66, 1.8],
      [523.25, 261.63, 2.4],
    ];

    const playCycle = () => {
      if (!this.ctx) return;
      let t = this.ctx.currentTime + 0.05;
      melody.forEach(([hiFreq, loFreq, dur]) => {
        if (!this.ctx) return;
        // High celesta bell
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(hiFreq, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.065, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + dur * 1.4);
        this.activeNodes.push(osc);

        // Warm low pad harmony
        const pad = this.ctx.createOscillator();
        const pGain = this.ctx.createGain();
        pad.type = "triangle";
        pad.frequency.setValueAtTime(loFreq, t);
        pGain.gain.setValueAtTime(0.0001, t);
        pGain.gain.exponentialRampToValueAtTime(0.04, t + 0.15);
        pGain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.45);
        pad.connect(pGain);
        pGain.connect(this.ctx.destination);
        pad.start(t);
        pad.stop(t + dur * 1.5);
        this.activeNodes.push(pad);

        t += dur * 0.74;
      });
      this.loopTimer = setTimeout(playCycle, 11200);
    };

    playCycle();
  }

  public stopAmbience() {
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    this.activeNodes.forEach((n) => {
      try {
        (n as OscillatorNode).stop();
      } catch {
        // Ignore
      }
    });
    this.activeNodes = [];
  }
}

export default function OrbitOfUsTemplate({
  config,
  studio = false,
  activeScreen,
  refreshToken = 0,
  expectedPin,
  onSelectField,
}: OrbitOfUsTemplateProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const audioEngineRef = useRef<CosmicAudioEngine | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  // Extract content cleanly from SurpriseQRData
  const universeTitle = config?.content?.title || "Orbit of Us";
  const anniversaryStartMs = useMemo(
    () => parseAnniversaryStartMs(config?.content?.menu?.card1Title),
    [config?.content?.menu?.card1Title],
  );
  const introText =
    config?.content?.menu?.subTitle ||
    "ในจักรวาลที่มีดาวนับล้านดวง ขอบคุณที่โคจรมาเจอกันนะ";
  const rawPalette = (config?.content?.menu?.card1Icon || "rose-nebula") as GalaxyPaletteKey;
  const paletteKey: GalaxyPaletteKey =
    rawPalette in PALETTES ? rawPalette : "rose-nebula";
  const theme = PALETTES[paletteKey];

  const targetPin = useMemo(() => {
    const rawPin = (expectedPin ?? config?.settings?.pinCode ?? "1234").trim();
    const digits = rawPin.replace(/\D/g, "").slice(0, 4);
    return digits || "1234";
  }, [config?.settings?.pinCode, expectedPin]);

  const floatingPhrases = useMemo(() => {
    const raw = config?.content?.flowers?.message || "";
    const lines = raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length > 0) return lines.slice(0, 15);
    return [
      "รักเธอนะ",
      "อยู่ด้วยกันไปนานๆ",
      "You are my universe",
      "ขอบคุณที่เป็นความสุข",
      "ทุกวันที่มีเธอคือของขวัญ",
      "My favorite orbit",
      "จับมือกันไปทุกจักรวาล",
      "กอดแน่นๆ นะ",
    ];
  }, [config?.content?.flowers?.message]);

  const orbitPhotos = useMemo<OrbitPhotoItem[]>(() => {
    const filmstrip = config?.content?.memories?.filmstripImages ?? [];
    if (filmstrip.length > 0) {
      return filmstrip.slice(0, 12).map((item, idx) => ({
        src:
          item.src && item.src !== "/templates/galaxy-3.png"
            ? item.src
            : `/templates/galaxy-${(idx % 2) + 1}.png`,
      }));
    }
    return [
      { src: "/templates/galaxy-1.png" },
      { src: "/templates/galaxy-2.png" },
      { src: "/templates/galaxy-1.png" },
      { src: "/templates/galaxy-2.png" },
      { src: "/templates/galaxy-1.png" },
      { src: "/templates/galaxy-2.png" },
    ];
  }, [config?.content?.memories?.filmstripImages]);

  const letterTitle = config?.content?.letter?.title || "ถึงคนที่เป็นทั้งจักรวาลของฉัน";
  const letterBody = useMemo(() => {
    const paras = config?.content?.letter?.paragraphs ?? [];
    const joined = paras.filter(Boolean).join("\n\n");
    return (
      joined ||
      "ตั้งแต่วันที่มีเธอเข้ามา โลกและจักรวาลของฉันก็สว่างไสวขึ้นทุกวัน ขอบคุณที่เป็นทั้งความสบายใจ รอยยิ้ม และบ้านที่อบอุ่นที่สุดเสมอมา\n\nอยู่โคจรข้างๆ กันแบบนี้ไปนานๆ เลยนะ"
    );
  }, [config?.content?.letter?.paragraphs]);
  const signOff = config?.content?.finale?.subText || "รักเธอที่สุดในจักรวาล";
  const audioSrc =
    config?.content?.bgMusic?.src || config?.content?.songMedia?.audioSrc || "";

  // Interactive Stage State: intro -> warp1 -> pin -> warp2 (with blinding light flash) -> explore -> heart
  const [stage, setStage] = useState<OrbitStage>(() => (studio ? "explore" : "intro"));
  const [warpFlash, setWarpFlash] = useState(false);
  const [introTextDone, setIntroTextDone] = useState(Boolean(studio));
  const [pinInput, setPinInput] = useState("");
  const [pinShake, setPinShake] = useState(false);

  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);
  const [selectedPhrase, setSelectedPhrase] = useState<string | null>(null);

  const [letterOpen, setLetterOpen] = useState(Boolean(studio && activeScreen === 4));
  const [letterTitleDone, setLetterTitleDone] = useState(Boolean(studio));
  const [letterBodyDone, setLetterBodyDone] = useState(Boolean(studio));
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  const stageRef = useRef<OrbitStage>(stage);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // Sync stage with Studio activeScreen tabs
  useEffect(() => {
    if (!activeScreen) return;
    clearTimers();
    if (activeScreen === 1) {
      setStage("intro");
      setIntroTextDone(true);
      setSelectedPhotoIdx(null);
      setSelectedPhrase(null);
      setLetterOpen(false);
    } else if (activeScreen === 2 || activeScreen === 3) {
      setStage("explore");
      setSelectedPhotoIdx(null);
      setSelectedPhrase(null);
      setLetterOpen(false);
    } else if (activeScreen === 4) {
      setStage("heart");
      setSelectedPhotoIdx(null);
      setSelectedPhrase(null);
      setLetterTitleDone(true);
      setLetterBodyDone(true);
      setLetterOpen(true);
    }
  }, [activeScreen, clearTimers, refreshToken]);

  // Audio lifecycle
  useEffect(() => {
    const engine = new CosmicAudioEngine();
    audioEngineRef.current = engine;
    return () => {
      clearTimers();
      engine.stopAmbience();
    };
  }, [clearTimers]);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    if (!musicPlaying || muted || audioSrc) {
      engine.stopAmbience();
      return;
    }
    engine.startAmbience();
  }, [audioSrc, musicPlaying, muted]);

  const editableProps = useCallback(
    (tabIndex: number, fieldId: string, label: string) =>
      onSelectField
        ? {
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onSelectField(tabIndex, fieldId);
          },
          title: `คลิกเพื่อแก้ไข${label}`,
          "data-editable-field": fieldId,
          "data-edit-label": `แก้ไข${label}`,
        }
        : {},
    [onSelectField],
  );

  // Tap screen on Intro -> Warp 1 -> PIN Screen
  const handleStartWarpToPin = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (stageRef.current !== "intro" || !introTextDone) return;
      audioEngineRef.current?.unlock();
      setMusicPlaying(true);
      if (!muted) {
        audioEngineRef.current?.playBigBangWarp();
      }
      clearTimers();
      setStage("warp1");
      schedule(() => {
        setPinInput("");
        setStage("pin");
      }, 1350);
    },
    [clearTimers, introTextDone, muted, schedule],
  );

  // Unlock PIN -> Warp 2 -> Big Bang into 3D Galaxy Explore
  const handlePinDigit = useCallback(
    (digit: string) => {
      if (stageRef.current !== "pin" || pinInput.length >= 4) return;
      audioEngineRef.current?.unlock();
      setMusicPlaying(true);
      if (!muted) audioEngineRef.current?.playKeyTick(740 + pinInput.length * 110);

      const next = `${pinInput}${digit}`;
      setPinInput(next);

      if (next.length === 4) {
        if (next === targetPin) {
          schedule(() => {
            if (!muted) audioEngineRef.current?.playBigBangWarp();
            setStage("warp2");
            // Slowly swelling supernova bloom over ~2.3s before gently revealing the 3D Galaxy
            schedule(() => {
              setWarpFlash(true);
            }, 750);
            schedule(() => {
              setStage("explore");
            }, 3050);
            schedule(() => {
              setWarpFlash(false);
            }, 4650);
          }, 220);
        } else {
          if (!muted) audioEngineRef.current?.playKeyTick(220);
          setPinShake(true);
          schedule(() => {
            setPinShake(false);
            setPinInput("");
          }, 520);
        }
      }
    },
    [muted, pinInput, schedule, targetPin],
  );

  const handlePinBackspace = useCallback(() => {
    if (stageRef.current !== "pin") return;
    audioEngineRef.current?.unlock();
    if (!muted) audioEngineRef.current?.playKeyTick(520);
    setPinInput((prev) => prev.slice(0, -1));
  }, [muted]);

  // Trigger Secret Core Finale: Galaxy particles converge into a giant beating 3D Heart!
  const handleTriggerHeartFinale = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      audioEngineRef.current?.unlock();
      if (!muted) {
        audioEngineRef.current?.playHeartConvergence();
      }
      setSelectedPhotoIdx(null);
      setSelectedPhrase(null);
      setStage("heart");
      setLetterTitleDone(Boolean(studio));
      setLetterBodyDone(Boolean(studio));
      clearTimers();
      schedule(
        () => {
          setLetterOpen(true);
        },
        studio ? 150 : 2100,
      );
    },
    [clearTimers, muted, schedule, studio],
  );

  const handleReturnToGalaxy = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      audioEngineRef.current?.unlock();
      if (!muted) {
        audioEngineRef.current?.playBigBangWarp();
      }
      setLetterOpen(false);
      setStage("explore");
    },
    [muted],
  );

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioEngineRef.current?.unlock();
    if (!musicPlaying) {
      setMusicPlaying(true);
      setMuted(false);
    } else {
      setMuted((m) => !m);
    }
  };

  // ==================== THREE.JS 3D WEBGL GALAXY, HYPERSPACE WARP & HEART MORPH ENGINE ====================
  const onPhotoSelectRef = useRef<(idx: number) => void>(() => { });
  const onPhraseSelectRef = useRef<(phrase: string) => void>(() => { });
  const onCoreTapRef = useRef<() => void>(() => { });
  const onDateTapRef = useRef<() => void>(() => { });

  useEffect(() => {
    onDateTapRef.current = () => {
      if (onSelectField) {
        onSelectField(1, "field-orbit-date");
      }
    };
  }, [onSelectField]);

  useEffect(() => {
    onPhotoSelectRef.current = (idx: number) => {
      if (stageRef.current !== "explore") return;
      audioEngineRef.current?.unlock();
      setMusicPlaying(true);
      if (!muted) audioEngineRef.current?.playPhotoChime();
      setSelectedPhrase(null);
      setSelectedPhotoIdx(idx);
    };
  }, [muted]);

  useEffect(() => {
    onPhraseSelectRef.current = (phrase: string) => {
      if (stageRef.current !== "explore") return;
      audioEngineRef.current?.unlock();
      setMusicPlaying(true);
      if (!muted) audioEngineRef.current?.playPhotoChime();
      setSelectedPhotoIdx(null);
      setSelectedPhrase(phrase);
    };
  }, [muted]);

  useEffect(() => {
    onCoreTapRef.current = () => {
      if (stageRef.current === "intro") {
        handleStartWarpToPin();
      } else if (stageRef.current === "explore") {
        handleTriggerHeartFinale();
      } else if (stageRef.current === "heart") {
        setLetterOpen((prev) => !prev);
      }
    };
  }, [handleStartWarpToPin, handleTriggerHeartFinale]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 640;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 160);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const disposables: Array<{ dispose: () => void }> = [];
    const starTex = createStarGlowTexture();
    const flareTex = createDiffractionStarTexture();
    disposables.push(starTex, flareTex);

    // 1. Build 3,500 Particle Buffers (introPos, galaxyPos, heartPos, colors)
    const PARTICLE_COUNT = 3500;
    const MORPH_COUNT = 2900;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const introPositions = new Float32Array(PARTICLE_COUNT * 3);
    const galaxyPositions = new Float32Array(PARTICLE_COUNT * 3);
    const heartPositions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const galaxyColors = new Float32Array(PARTICLE_COUNT * 3);
    const heartColors = new Float32Array(PARTICLE_COUNT * 3);

    const cCore = new THREE.Color(theme.coreHex);
    const cMid = new THREE.Color(theme.midHex);
    const cOuter = new THREE.Color(theme.outerHex);
    const cGold = new THREE.Color(theme.goldHex);
    const cHeart = new THREE.Color(theme.heartHex);
    const tmpColor = new THREE.Color();

    const ARMS = 5;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      if (i < MORPH_COUNT) {
        // A) Intro singularity cluster
        const ir = Math.pow(Math.random(), 2.2) * 0.42;
        const iTheta = Math.random() * Math.PI * 2;
        const iPhi = Math.acos(2 * Math.random() - 1);
        introPositions[i3] = ir * Math.sin(iPhi) * Math.cos(iTheta);
        introPositions[i3 + 1] = ir * Math.sin(iPhi) * Math.sin(iTheta);
        introPositions[i3 + 2] = ir * Math.cos(iPhi);

        // B) 5-Arm Logarithmic Spiral Galaxy + Dense Radiant Bulge Core
        if (i < 520) {
          const cr = Math.pow(Math.random(), 2.1) * 1.25;
          const cTh = Math.random() * Math.PI * 2;
          const cPh = Math.acos(2 * Math.random() - 1);
          galaxyPositions[i3] = cr * Math.sin(cPh) * Math.cos(cTh);
          galaxyPositions[i3 + 1] = cr * Math.cos(cPh) * 0.48;
          galaxyPositions[i3 + 2] = cr * Math.sin(cPh) * Math.sin(cTh);
          tmpColor.copy(cCore).lerp(cGold, Math.random() * 0.45);
        } else {
          const armIdx = i % ARMS;
          const distFrac = Math.pow(Math.random(), 1.35);
          const radius = 0.9 + distFrac * 8.2;
          const spinAngle = radius * 1.12;
          const branchAngle = ((Math.PI * 2) / ARMS) * armIdx;
          const scatter = (1 - distFrac * 0.45) * 0.55;
          const randX = (Math.random() - 0.5) * scatter * (Math.random() < 0.25 ? 2.1 : 1);
          const randY = (Math.random() - 0.5) * (0.26 + (1 - distFrac) * 0.38);
          const randZ = (Math.random() - 0.5) * scatter * (Math.random() < 0.25 ? 2.1 : 1);

          galaxyPositions[i3] = Math.cos(branchAngle + spinAngle) * radius + randX;
          galaxyPositions[i3 + 1] = randY;
          galaxyPositions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randZ;

          if (distFrac < 0.35) {
            tmpColor.copy(cCore).lerp(cMid, distFrac / 0.35);
          } else {
            tmpColor.copy(cMid).lerp(cOuter, (distFrac - 0.35) / 0.65);
          }
          if (i % 7 === 0) tmpColor.lerp(cGold, 0.55);
        }

        // C) 3D Parametric Heart Surface & Volume
        const t = Math.random() * Math.PI * 2;
        const u = (Math.random() - 0.5) * Math.PI;
        const shell = 0.78 + Math.pow(Math.random(), 0.55) * 0.28;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy =
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t);
        const depthProfile = Math.max(0.15, Math.sin(t));
        const hz = Math.sin(u) * 7.5 * depthProfile;
        const scaleH = 0.165 * shell;

        heartPositions[i3] = hx * scaleH;
        heartPositions[i3 + 1] = hy * scaleH + 0.35;
        heartPositions[i3 + 2] = hz * scaleH;

        const hColor = tmpColor.clone().copy(cHeart);
        if (i % 5 === 0) hColor.lerp(cGold, 0.65);
        else if (i % 3 === 0) hColor.lerp(cCore, 0.45);
        heartColors[i3] = hColor.r;
        heartColors[i3 + 1] = hColor.g;
        heartColors[i3 + 2] = hColor.b;
      } else {
        // Deep-space 360° background stars
        const sr = 15 + Math.random() * 25;
        const sTh = Math.random() * Math.PI * 2;
        const sPh = Math.acos(2 * Math.random() - 1);
        const sx = sr * Math.sin(sPh) * Math.cos(sTh);
        const sy = sr * Math.sin(sPh) * Math.sin(sTh);
        const sz = sr * Math.cos(sPh);
        introPositions[i3] = sx;
        introPositions[i3 + 1] = sy;
        introPositions[i3 + 2] = sz;
        galaxyPositions[i3] = sx;
        galaxyPositions[i3 + 1] = sy;
        galaxyPositions[i3 + 2] = sz;
        heartPositions[i3] = sx;
        heartPositions[i3 + 1] = sy;
        heartPositions[i3 + 2] = sz;
        tmpColor.copy(cCore).lerp(cOuter, Math.random() * 0.6);
        heartColors[i3] = tmpColor.r;
        heartColors[i3 + 1] = tmpColor.g;
        heartColors[i3 + 2] = tmpColor.b;
      }

      galaxyColors[i3] = tmpColor.r;
      galaxyColors[i3 + 1] = tmpColor.g;
      galaxyColors[i3 + 2] = tmpColor.b;

      const isCompressedStage =
        stageRef.current === "intro" ||
        stageRef.current === "warp1" ||
        stageRef.current === "pin";
      const startArr = isCompressedStage
        ? introPositions
        : stageRef.current === "heart"
          ? heartPositions
          : galaxyPositions;
      positions[i3] = startArr[i3];
      positions[i3 + 1] = startArr[i3 + 1];
      positions[i3 + 2] = startArr[i3 + 2];
      colors[i3] = galaxyColors[i3];
      colors[i3 + 1] = galaxyColors[i3 + 1];
      colors[i3 + 2] = galaxyColors[i3 + 2];
    }

    const particleGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    const colAttr = new THREE.BufferAttribute(colors, 3);
    particleGeo.setAttribute("position", posAttr);
    particleGeo.setAttribute("color", colAttr);
    disposables.push(particleGeo);

    const particleMat = new THREE.PointsMaterial({
      size: 0.17,
      map: starTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    disposables.push(particleMat);

    const galaxyPoints = new THREE.Points(particleGeo, particleMat);
    scene.add(galaxyPoints);

    // 1B. Bright Diffraction Hero Stars + Volumetric Nebula Clouds + Gossamer Orbit Rings
    const HERO_STAR_COUNT = 110;
    const heroPositions = new Float32Array(HERO_STAR_COUNT * 3);
    const heroGalaxyPos = new Float32Array(HERO_STAR_COUNT * 3);
    const heroHeartPos = new Float32Array(HERO_STAR_COUNT * 3);
    const heroColors = new Float32Array(HERO_STAR_COUNT * 3);

    for (let i = 0; i < HERO_STAR_COUNT; i++) {
      const i3 = i * 3;
      const srcIdx = (i * 23) % MORPH_COUNT;
      const s3 = srcIdx * 3;
      heroGalaxyPos[i3] = galaxyPositions[s3];
      heroGalaxyPos[i3 + 1] = galaxyPositions[s3 + 1];
      heroGalaxyPos[i3 + 2] = galaxyPositions[s3 + 2];
      heroHeartPos[i3] = heartPositions[s3];
      heroHeartPos[i3 + 1] = heartPositions[s3 + 1];
      heroHeartPos[i3 + 2] = heartPositions[s3 + 2];

      const isCompressedStage =
        stageRef.current === "intro" ||
        stageRef.current === "warp1" ||
        stageRef.current === "pin";
      const startArr = isCompressedStage
        ? introPositions
        : stageRef.current === "heart"
          ? heroHeartPos
          : heroGalaxyPos;
      heroPositions[i3] = startArr[i3];
      heroPositions[i3 + 1] = startArr[i3 + 1];
      heroPositions[i3 + 2] = startArr[i3 + 2];

      tmpColor.copy(cCore).lerp(cGold, (i % 3) * 0.35);
      heroColors[i3] = tmpColor.r;
      heroColors[i3 + 1] = tmpColor.g;
      heroColors[i3 + 2] = tmpColor.b;
    }

    const heroGeo = new THREE.BufferGeometry();
    const heroPosAttr = new THREE.BufferAttribute(heroPositions, 3);
    heroGeo.setAttribute("position", heroPosAttr);
    heroGeo.setAttribute("color", new THREE.BufferAttribute(heroColors, 3));
    disposables.push(heroGeo);

    const heroMat = new THREE.PointsMaterial({
      size: 0.42,
      map: flareTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    disposables.push(heroMat);
    const heroPoints = new THREE.Points(heroGeo, heroMat);
    scene.add(heroPoints);

    // 1C. 3D Hyperspace Warp Starfield Tunnel (Active during warp1 & warp2!)
    const WARP_STAR_COUNT = 420;
    const warpPositions = new Float32Array(WARP_STAR_COUNT * 3);
    for (let i = 0; i < WARP_STAR_COUNT; i++) {
      const i3 = i * 3;
      const r = 0.8 + Math.random() * 14;
      const a = Math.random() * Math.PI * 2;
      warpPositions[i3] = Math.cos(a) * r;
      warpPositions[i3 + 1] = Math.sin(a) * r;
      warpPositions[i3 + 2] = (Math.random() - 0.5) * 45;
    }
    const warpGeo = new THREE.BufferGeometry();
    const warpPosAttr = new THREE.BufferAttribute(warpPositions, 3);
    warpGeo.setAttribute("position", warpPosAttr);
    disposables.push(warpGeo);
    const warpMat = new THREE.PointsMaterial({
      size: 0.32,
      map: flareTex,
      color: new THREE.Color(theme.coreHex),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    disposables.push(warpMat);
    const warpStars = new THREE.Points(warpGeo, warpMat);
    scene.add(warpStars);

    // Volumetric Nebula Clouds
    const nebulaClouds: THREE.Sprite[] = [];
    for (let c = 0; c < 16; c++) {
      const armIdx = c % ARMS;
      const frac = 0.18 + (c / 16) * 0.7;
      const rad = 1.4 + frac * 5.8;
      const angle = ((Math.PI * 2) / ARMS) * armIdx + rad * 1.12;
      const cloudColor = new THREE.Color(c % 2 === 0 ? theme.midHex : theme.outerHex);
      const cMat = new THREE.SpriteMaterial({
        map: starTex,
        color: cloudColor,
        transparent: true,
        opacity: 0.11,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      disposables.push(cMat);
      const cloud = new THREE.Sprite(cMat);
      const cSize = 2.4 + (c % 4) * 0.65;
      cloud.scale.set(cSize, cSize, 1);
      cloud.userData = {
        gx: Math.cos(angle) * rad,
        gy: ((c % 3) - 1) * 0.22,
        gz: Math.sin(angle) * rad,
        hx: ((c % 5) - 2) * 0.42,
        hy: 0.25 + ((c % 3) - 1) * 0.32,
        hz: ((c % 3) - 1) * 0.22,
      };
      galaxyPoints.add(cloud);
      nebulaClouds.push(cloud);
    }

    // Subtle gossamer orbital rings
    const ringRadii = [4.0, 6.2];
    const orbitRings: THREE.LineLoop[] = [];
    ringRadii.forEach((rVal, rIdx) => {
      const pts: THREE.Vector3[] = [];
      const segs = 96;
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(Math.cos(a) * rVal, rIdx === 0 ? -0.15 : 0.18, Math.sin(a) * rVal),
        );
      }
      const rGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const rMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(rIdx === 0 ? theme.midHex : theme.goldHex),
        transparent: true,
        opacity: stageRef.current === "explore" ? 0.22 : 0,
        blending: THREE.AdditiveBlending,
      });
      disposables.push(rGeo, rMat);
      const loop = new THREE.LineLoop(rGeo, rMat);
      scene.add(loop);
      orbitRings.push(loop);
    });

    // 2. Refined Central Core Halo Sprite (Compact so it never washes out text or photos!)
    const coreMat = new THREE.SpriteMaterial({
      map: starTex,
      color: new THREE.Color(theme.midHex),
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposables.push(coreMat);
    const coreSprite = new THREE.Sprite(coreMat);
    coreSprite.scale.set(1.9, 1.9, 1);
    scene.add(coreSprite);

    const coreHitGeo = new THREE.SphereGeometry(1.1, 16, 16);
    const coreHitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    disposables.push(coreHitGeo, coreHitMat);
    const coreHitMesh = new THREE.Mesh(coreHitGeo, coreHitMat);
    coreHitMesh.userData = { isCore: true };
    scene.add(coreHitMesh);

    // 2B. 3D Floating Live Anniversary Counter (Days + Hours + Minutes + Seconds) above the 3D Galaxy!
    const dateCrest = createAnniversaryGalaxyCrestResource(
      universeTitle,
      anniversaryStartMs,
      theme,
    );
    disposables.push(dateCrest.texture);
    const dateCrestMat = new THREE.SpriteMaterial({
      map: dateCrest.texture,
      transparent: true,
      opacity: stageRef.current === "explore" || stageRef.current === "heart" ? 1 : 0,
      depthTest: false,
      depthWrite: false,
    });
    disposables.push(dateCrestMat);
    const dateCrestSprite = new THREE.Sprite(dateCrestMat);
    dateCrestSprite.renderOrder = 15;
    dateCrestSprite.scale.set(5.1, 1.7, 1);
    dateCrestSprite.position.set(0, 2.55, 0);
    scene.add(dateCrestSprite);

    if (typeof document !== "undefined" && "fonts" in document) {
      void document.fonts.ready.then(() => {
        if (cancelled) return;
        dateCrest.update();
      });
    }

    // 3. Orbiting 3D Photo Cards Group (Larger, crisp, slow-moving, easy to tap!)
    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    const photoMeshes: THREE.Mesh[] = [];
    const photoCardGeo = new THREE.PlaneGeometry(1.22, 1.22);
    disposables.push(photoCardGeo);

    orbitPhotos.forEach((item, idx) => {
      const tex = createOrbitPhotoCardTexture(item.src, theme, idx);
      tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      disposables.push(tex);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: stageRef.current === "explore" ? 1 : 0,
        side: THREE.DoubleSide,
      });
      disposables.push(mat);

      const mesh = new THREE.Mesh(photoCardGeo, mat);
      mesh.renderOrder = 10;
      const ringIdx = idx % 2;
      const ringRadius = ringIdx === 0 ? 4.0 : 6.2;
      const angle = (idx / Math.max(1, orbitPhotos.length)) * Math.PI * 2;
      const yOffset = ((idx % 3) - 1) * 0.78 + (ringIdx === 1 ? 0.25 : -0.2);

      // Slow, majestic orbital speed (~75% slower than before so tapping & reading is effortless!)
      mesh.userData = {
        photoIndex: idx,
        baseRadius: ringRadius,
        baseAngle: angle,
        baseY: yOffset,
        orbitSpeed: ringIdx === 0 ? 0.052 : 0.036,
        bobPhase: idx * 1.15,
      };
      orbitGroup.add(mesh);
      photoMeshes.push(mesh);
    });

    // 4. Orbiting 3D Thai/English Text Sprites (High-DPI, ultra-clear, slow-moving, tappable!)
    const phraseSprites: THREE.Sprite[] = [];
    let cancelled = false;

    const buildPhraseSprites = () => {
      if (cancelled) return;
      floatingPhrases.forEach((phrase, idx) => {
        const tex = createPhraseCanvasTexture(phrase, theme);
        disposables.push(tex);
        const mat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          opacity: stageRef.current === "explore" ? 0.98 : 0,
          depthTest: false,
          depthWrite: false,
        });
        disposables.push(mat);
        const sprite = new THREE.Sprite(mat);
        sprite.renderOrder = 12;
        sprite.scale.set(3.15, 0.7, 1);

        const radius = 3.2 + (idx % 3) * 1.65 + (idx % 2) * 0.5;
        const angle =
          (idx / Math.max(1, floatingPhrases.length)) * Math.PI * 2 + 0.42;
        const yOffset = ((idx % 5) - 2) * 0.65;

        sprite.userData = {
          phraseText: phrase,
          baseRadius: radius,
          baseAngle: angle,
          baseY: yOffset,
          orbitSpeed: 0.042 + (idx % 3) * 0.01,
          bobPhase: idx * 0.9,
        };
        orbitGroup.add(sprite);
        phraseSprites.push(sprite);
      });
    };

    if (typeof document !== "undefined" && "fonts" in document) {
      void document.fonts.ready.then(buildPhraseSprites).catch(buildPhraseSprites);
    } else {
      buildPhraseSprites();
    }

    // 5. Deep Space 3D Shooting Star Line
    const shooterGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-2.6, -0.8, 0),
    ]);
    const shooterMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(theme.goldHex),
      transparent: true,
      opacity: 0,
    });
    disposables.push(shooterGeo, shooterMat);
    const shooterLine = new THREE.Line(shooterGeo, shooterMat);
    scene.add(shooterLine);
    const shooterState = {
      active: false,
      x: 0,
      y: 0,
      z: -14,
      vx: -0.38,
      vy: -0.14,
      alpha: 0,
      nextSpawn: performance.now() + 2400,
    };

    // 6. Camera Spherical Orbit & Pinch/Wheel Zoom Controls
    let theta = 0.25;
    let phi = 1.15;
    let targetTheta = theta;
    let targetPhi = phi;
    let radius = stageRef.current === "explore" ? 9.2 : 13.8;
    let targetRadius = radius;

    let isPointerDown = false;
    let pointerDownX = 0;
    let pointerDownY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let movedDist = 0;
    const activePointers = new Map<number, { x: number; y: number }>();
    let lastPinchDist = 0;

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const dom = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size === 1) {
        isPointerDown = true;
        pointerDownX = e.clientX;
        pointerDownY = e.clientY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        movedDist = 0;
      } else if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (lastPinchDist > 0) {
          const delta = lastPinchDist - dist;
          targetRadius = Math.max(4.2, Math.min(16.5, targetRadius + delta * 0.025));
        }
        lastPinchDist = dist;
        movedDist = 99;
        return;
      }
      if (!isPointerDown) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      movedDist += Math.hypot(dx, dy);

      targetTheta -= dx * 0.007;
      targetPhi = Math.max(0.32, Math.min(Math.PI - 0.32, targetPhi - dy * 0.006));
    };

    const onPointerUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) lastPinchDist = 0;
      if (!isPointerDown) return;
      isPointerDown = false;

      const totalDelta = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
      if (movedDist < 14 && totalDelta < 14) {
        // In Intro stage, tapping ANYWHERE on screen starts the starfield warp!
        if (stageRef.current === "intro") {
          onCoreTapRef.current();
          return;
        }

        const rect = dom.getBoundingClientRect();
        ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);

        if (stageRef.current === "explore") {
          // 0. Check 3D Anniversary Date Crest at top-center of Galaxy (Studio click-to-edit)
          const dateHits = raycaster.intersectObject(dateCrestSprite, false);
          if (dateHits.length > 0 && onSelectField) {
            onDateTapRef.current();
            return;
          }

          // 1. Check Orbiting Photos first
          const photoHits = raycaster.intersectObjects(photoMeshes, false);
          if (photoHits.length > 0) {
            const pIdx = photoHits[0].object.userData.photoIndex;
            if (typeof pIdx === "number") {
              onPhotoSelectRef.current(pIdx);
              return;
            }
          }

          // 2. Check Orbiting Text Phrase Sprites (Tappable to inspect clearly!)
          const phraseHits = raycaster.intersectObjects(phraseSprites, false);
          if (phraseHits.length > 0) {
            const pText = phraseHits[0].object.userData.phraseText;
            if (typeof pText === "string") {
              onPhraseSelectRef.current(pText);
              return;
            }
          }
        }

        // 3. Check Central Galaxy Core -> Morphs stars into 3D Heart!
        const coreHits = raycaster.intersectObject(coreHitMesh, false);
        if (coreHits.length > 0) {
          onCoreTapRef.current();
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetRadius = Math.max(4.2, Math.min(16.5, targetRadius + e.deltaY * 0.006));
    };

    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("wheel", onWheel, { passive: false });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 380;
      const h = container.clientHeight || 640;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    // 7. Main 60 FPS Animation Loop
    let rafId = 0;
    let lastStage = stageRef.current;
    const clockStart = performance.now();
    let lastClockSec = Math.floor(Date.now() / 1000);

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const elapsed = (now - clockStart) * 0.001;
      const curStage = stageRef.current;
      const isWarping = curStage === "warp1" || curStage === "warp2";
      const isCompressed =
        curStage === "intro" || curStage === "warp1" || curStage === "pin";

      if (curStage !== lastStage) {
        if (curStage === "explore") {
          targetRadius = 9.0;
          targetPhi = 1.15;
        } else if (curStage === "heart") {
          targetRadius = 7.8;
          targetPhi = 1.48;
        } else if (curStage === "warp1" || curStage === "warp2") {
          targetRadius = 6.2;
        } else {
          targetRadius = 13.8;
        }
        lastStage = curStage;
      }

      // Slow, gentle auto-orbit when user isn't dragging
      if (!isPointerDown && activePointers.size === 0) {
        targetTheta += curStage === "heart" ? 0.0012 : 0.00075;
      }

      theta += (targetTheta - theta) * 0.075;
      phi += (targetPhi - phi) * 0.075;
      radius += (targetRadius - radius) * 0.06;

      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, curStage === "heart" ? 0.25 : 0, 0);

      // Hyperspace Warp Starfield Animation & Slow Camera FOV Glide (warp1 & warp2)
      const targetFov = curStage === "warp2" ? 72 : curStage === "warp1" ? 66 : 54;
      const fovLerp = curStage === "warp2" ? 0.024 : 0.055;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * fovLerp;
        camera.updateProjectionMatrix();
      }
      const targetWarpOpacity = isWarping ? 0.96 : 0;
      warpMat.opacity += (targetWarpOpacity - warpMat.opacity) * (curStage === "warp2" ? 0.045 : 0.1);
      if (warpMat.opacity > 0.02) {
        const wArr = warpPosAttr.array as Float32Array;
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        warpStars.position.copy(camera.position).addScaledVector(camDir, 12);
        warpStars.quaternion.copy(camera.quaternion);
        const warpSpeed = curStage === "warp2" ? 0.72 : 1.15;
        for (let i = 0; i < WARP_STAR_COUNT; i++) {
          const i3 = i * 3;
          wArr[i3 + 2] += warpSpeed;
          if (wArr[i3 + 2] > 22) {
            wArr[i3 + 2] = -22;
          }
        }
        warpPosAttr.needsUpdate = true;
      }

      // Particle Morphing (Singularity <-> Spiral Galaxy <-> Beating 3D Heart)
      const posArr = posAttr.array as Float32Array;
      const colArr = colAttr.array as Float32Array;
      const targetPos = isCompressed
        ? introPositions
        : curStage === "heart"
          ? heartPositions
          : galaxyPositions;
      const targetCol = curStage === "heart" ? heartColors : galaxyColors;
      const lerpSpeed = curStage === "heart" ? 0.045 : 0.058;

      for (let i = 0; i < MORPH_COUNT * 3; i++) {
        posArr[i] += (targetPos[i] - posArr[i]) * lerpSpeed;
        colArr[i] += (targetCol[i] - colArr[i]) * 0.05;
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      // Morph bright hero diffraction stars & volumetric nebula clouds
      const hArr = heroPosAttr.array as Float32Array;
      for (let i = 0; i < HERO_STAR_COUNT * 3; i++) {
        const hTarget = isCompressed
          ? introPositions[i]
          : curStage === "heart"
            ? heroHeartPos[i]
            : heroGalaxyPos[i];
        hArr[i] += (hTarget - hArr[i]) * lerpSpeed;
      }
      heroPosAttr.needsUpdate = true;
      heroMat.size = 0.4 + Math.sin(elapsed * 2.5) * 0.05;

      for (const cloud of nebulaClouds) {
        const ud = cloud.userData;
        const tx = isCompressed ? 0 : curStage === "heart" ? ud.hx : ud.gx;
        const ty = isCompressed ? 0 : curStage === "heart" ? ud.hy : ud.gy;
        const tz = isCompressed ? 0 : curStage === "heart" ? ud.hz : ud.gz;
        cloud.position.x += (tx - cloud.position.x) * 0.05;
        cloud.position.y += (ty - cloud.position.y) * 0.05;
        cloud.position.z += (tz - cloud.position.z) * 0.05;
      }

      for (const loop of orbitRings) {
        const rMat = loop.material as THREE.LineBasicMaterial;
        const tOp = curStage === "explore" ? 0.2 : 0;
        rMat.opacity += (tOp - rMat.opacity) * 0.06;
        loop.rotation.y = elapsed * 0.025;
      }

      // Rotate or pulse the particle system slowly
      if (curStage === "heart") {
        const beat =
          1 +
          Math.sin(elapsed * 4.0) * 0.045 +
          Math.max(0, Math.sin(elapsed * 8.0)) * 0.024;
        galaxyPoints.scale.set(beat, beat, beat);
        heroPoints.scale.set(beat, beat, beat);
        galaxyPoints.rotation.y *= 0.92;
        heroPoints.rotation.y = galaxyPoints.rotation.y;
      } else {
        galaxyPoints.scale.set(1, 1, 1);
        heroPoints.scale.set(1, 1, 1);
        galaxyPoints.rotation.y = elapsed * 0.028;
        heroPoints.rotation.y = galaxyPoints.rotation.y;
      }

      // Compact central core glow (never washes out text or photos)
      const coreScale = isCompressed
        ? 1.35 + Math.sin(elapsed * 2.8) * 0.18
        : curStage === "heart"
          ? 2.8 + Math.sin(elapsed * 4.0) * 0.3
          : 1.85 + Math.sin(elapsed * 2.2) * 0.16;
      coreSprite.scale.set(coreScale, coreScale, 1);

      // Update 3D Live Anniversary Counter (Days + Hours + Minutes + Seconds) once per second
      const showDateInGalaxy = curStage === "explore" || curStage === "heart";
      const targetDateOpacity = showDateInGalaxy ? 1 : 0;
      dateCrestMat.opacity += (targetDateOpacity - dateCrestMat.opacity) * 0.08;
      if (showDateInGalaxy) {
        const nowSec = Math.floor(Date.now() / 1000);
        if (nowSec !== lastClockSec) {
          lastClockSec = nowSec;
          dateCrest.update();
        }
      }
      const targetDateY = curStage === "heart" ? 2.95 : 2.55;
      dateCrestSprite.position.y +=
        (targetDateY + Math.sin(elapsed * 1.35) * 0.08 - dateCrestSprite.position.y) * 0.08;

      // Update Orbiting Photo Cards & Floating Text Sprites (Slow, graceful orbit!)
      const targetOrbitAlpha = curStage === "explore" ? 1 : 0;
      const targetOrbitScale = curStage === "explore" ? 1 : 0.05;

      for (const mesh of photoMeshes) {
        const ud = mesh.userData;
        const a = ud.baseAngle + elapsed * ud.orbitSpeed;
        const r = ud.baseRadius * (0.3 + 0.7 * (curStage === "explore" ? 1 : 0.2));
        mesh.position.x = Math.cos(a) * r;
        mesh.position.z = Math.sin(a) * r;
        mesh.position.y = ud.baseY + Math.sin(elapsed * 1.1 + ud.bobPhase) * 0.18;
        mesh.lookAt(camera.position);

        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity += (targetOrbitAlpha - mat.opacity) * 0.08;
        const s = mesh.scale.x + (targetOrbitScale - mesh.scale.x) * 0.08;
        mesh.scale.set(s, s, s);
      }

      for (const sp of phraseSprites) {
        const ud = sp.userData;
        const a = ud.baseAngle + elapsed * ud.orbitSpeed;
        sp.position.x = Math.cos(a) * ud.baseRadius;
        sp.position.z = Math.sin(a) * ud.baseRadius;
        sp.position.y = ud.baseY + Math.sin(elapsed * 0.95 + ud.bobPhase) * 0.14;

        const mat = sp.material as THREE.SpriteMaterial;
        const targetAlpha =
          curStage === "explore" ? 0.98 : curStage === "heart" ? 0.16 : 0;
        mat.opacity += (targetAlpha - mat.opacity) * 0.07;
      }

      // Update 3D Shooting Star
      if (!shooterState.active && now > shooterState.nextSpawn) {
        shooterState.active = true;
        shooterState.x = 9 + Math.random() * 6;
        shooterState.y = 5 + Math.random() * 4;
        shooterState.z = -10 - Math.random() * 8;
        shooterState.alpha = 0.95;
      }
      if (shooterState.active) {
        shooterState.x += shooterState.vx;
        shooterState.y += shooterState.vy;
        shooterState.alpha -= 0.022;
        shooterLine.position.set(shooterState.x, shooterState.y, shooterState.z);
        shooterMat.opacity = Math.max(0, shooterState.alpha);
        if (shooterState.alpha <= 0) {
          shooterState.active = false;
          shooterState.nextSpawn = now + 2800 + Math.random() * 2400;
        }
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("wheel", onWheel);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, [anniversaryStartMs, floatingPhrases, onSelectField, orbitPhotos, paletteKey, theme, universeTitle]);

  const activePhoto =
    selectedPhotoIdx !== null ? orbitPhotos[selectedPhotoIdx] ?? null : null;

  return (
    <div
      className="relative h-full min-h-[640px] w-full overflow-hidden font-sans text-white select-none"
      style={{ background: theme.bgGradient }}
    >
      {/* Reliable BGM Player supporting both .mp3 / uploaded audio AND YouTube URLs */}
      {audioSrc ? (
        <BackgroundAudioPlayer url={audioSrc} isPlaying={musicPlaying && !muted} loop />
      ) : null}

      {/* 3D WebGL Viewport */}
      <div
        ref={mountRef}
        className="absolute inset-0 z-10 h-full w-full cursor-grab active:cursor-grabbing touch-none"
      />

      {/* ==================== TOP BAR: ONLY FRAMELESS SOUND TOGGLE ICON ==================== */}
      <header className="pointer-events-none relative z-30 flex items-center justify-end px-5 pt-5">
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted || !musicPlaying ? "เปิดเสียง" : "ปิดเสียง"}
          className="pointer-events-auto p-1 text-pink-100/85 transition-transform hover:scale-110"
        >
          {muted || !musicPlaying ? (
            <VolumeX className="h-5 w-5 opacity-70" />
          ) : (
            <Volume2 className="h-5 w-5 text-pink-300 drop-shadow-[0_0_8px_rgba(244,114,182,0.85)]" />
          )}
        </button>
      </header>

      {/* ==================== STAGE 1: INTRO SINGULARITY (TAP SCREEN ANYWHERE — NO INSTRUCTIONAL TEXT) ==================== */}
      <AnimatePresence>
        {stage === "intro" && (
          <motion.div
            key="orbit-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.2, filter: "blur(10px)" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            onClick={handleStartWarpToPin}
            className="pointer-events-auto absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-end pb-24 px-6 text-center"
          >
            <div className="max-w-sm rounded-2xl border border-white/10 bg-slate-950/65 px-5 py-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.75)] backdrop-blur-md">
              <p
                {...editableProps(1, "field-orbit-intro", "ข้อความเปิดฉาก")}
                className={`min-h-[2.6rem] text-sm leading-relaxed font-medium text-pink-50 ${onSelectField ? "cursor-pointer" : ""
                  }`}
              >
                <TypewriterText
                  text={introText}
                  speedMs={46}
                  startDelayMs={300}
                  instant={Boolean(studio)}
                  onComplete={() => setIntroTextDone(true)}
                />
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== STAGE 2: FRAMELESS MINIMAL PIN (ONLY . . . . AND BUTTONS) ==================== */}
      <AnimatePresence>
        {stage === "pin" && (
          <motion.div
            key="orbit-pin"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.15, filter: "blur(10px)" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center px-5"
          >
            <motion.div
              animate={pinShake ? { x: [-12, 12, -8, 8, -4, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              {...editableProps(1, "field-orbit-pin", "รหัสผ่าน 4 หลัก")}
              className="flex flex-col items-center"
            >
              {/* 4 Minimal PIN Dots (. . . .) */}
              <div className="mb-8 flex items-center gap-4">
                {[0, 1, 2, 3].map((i) => {
                  const filled = i < pinInput.length;
                  return (
                    <span
                      key={i}
                      className={`h-3 w-3 rounded-full transition-all duration-200 ${filled
                          ? "scale-125 bg-white shadow-[0_0_14px_rgba(244,114,182,0.95)]"
                          : "bg-white/25"
                        }`}
                    />
                  );
                })}
              </div>

              {/* Frameless Floating Circular Keypad */}
              <div className="grid grid-cols-3 gap-4">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handlePinDigit(d)}
                    className="flex h-15 w-15 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-lg font-medium text-white/90 backdrop-blur-sm transition-all hover:border-pink-300/50 hover:bg-pink-500/15 hover:text-white active:scale-90"
                  >
                    {d}
                  </button>
                ))}
                <div />
                <button
                  type="button"
                  onClick={() => handlePinDigit("0")}
                  className="flex h-15 w-15 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-lg font-medium text-white/90 backdrop-blur-sm transition-all hover:border-pink-300/50 hover:bg-pink-500/15 hover:text-white active:scale-90"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinBackspace}
                  aria-label="ลบตัวเลข"
                  className="flex h-15 w-15 items-center justify-center rounded-full text-white/60 transition-all hover:text-white active:scale-90"
                >
                  <Delete className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== REALISTIC CIRCULAR OPTICAL SUPERNOVA BLOOM AFTER PIN WARP ==================== */}
      <AnimatePresence>
        {warpFlash && (
          <motion.div
            key="warp-supernova-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-hidden"
          >
            {/* Layer 1: Wide Soft Circular Atmospheric Nebula Halo (100% circular, transparent outer edge) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.12 }}
              animate={{
                opacity: [0, 0.45, 0.88, 1, 0],
                scale: [0.12, 0.55, 1.15, 1.55, 1.85],
              }}
              transition={{
                duration: 3.8,
                times: [0, 0.25, 0.52, 0.66, 1],
                ease: "easeInOut",
              }}
              className="absolute h-[135vmax] w-[135vmax] rounded-full blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,242,250,0.88) 24%, rgba(253,230,138,0.45) 44%, rgba(244,114,182,0.18) 58%, rgba(0,0,0,0) 72%)",
              }}
            />

            {/* Layer 2: Blinding White Star Core Orb expanding organically */}
            <motion.div
              initial={{ opacity: 0, scale: 0.08 }}
              animate={{
                opacity: [0, 0.75, 1, 1, 0],
                scale: [0.08, 0.42, 1.35, 2.6, 3.2],
              }}
              transition={{
                duration: 3.8,
                times: [0, 0.24, 0.5, 0.65, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute h-[70vmax] w-[70vmax] rounded-full blur-xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.96) 28%, rgba(255,245,220,0.55) 48%, rgba(255,255,255,0) 70%)",
              }}
            />

            {/* Layer 3: Subtle Anamorphic Cinema Horizontal Lens Flare Streak */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0.1 }}
              animate={{
                opacity: [0, 0.75, 0.95, 0],
                scaleX: [0.1, 0.75, 1.25, 1.5],
              }}
              transition={{
                duration: 3.2,
                times: [0, 0.35, 0.6, 1],
                ease: "easeInOut",
              }}
              className="absolute h-3 w-[120vmax] rounded-full blur-md"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(253,230,138,0.55) 28%, rgba(255,255,255,1) 50%, rgba(253,230,138,0.55) 72%, rgba(255,255,255,0) 100%)",
              }}
            />

            {/* Layer 4: Smooth Full-Screen White-Out Veil ONLY at the peak (no edge possible) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0.95, 0.92, 0] }}
              transition={{
                duration: 3.85,
                times: [0, 0.42, 0.6, 0.68, 1],
                ease: "easeInOut",
              }}
              className="absolute inset-0 bg-[#fff9fc]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== FOCUSED ORBIT PHOTO MODAL (COMPACT & SOFT FRAMELESS PHOTO) ==================== */}
      <AnimatePresence>
        {activePhoto && selectedPhotoIdx !== null && (
          <motion.div
            key={`photo-modal-${selectedPhotoIdx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32 }}
            onClick={() => setSelectedPhotoIdx(null)}
            className="pointer-events-auto absolute inset-0 z-30 flex cursor-pointer items-center justify-center bg-black/65 px-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.78, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.82, y: 10, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              {...editableProps(3, "field-orbit-photos", "รูปภาพในวงโคจร")}
              className="relative aspect-square w-full max-w-[250px] overflow-hidden rounded-2xl shadow-[0_22px_55px_rgba(0,0,0,0.85),0_0_28px_rgba(244,114,182,0.2)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhoto.src}
                alt="Orbit Memory"
                onError={(e) => {
                  e.currentTarget.src = "/templates/galaxy-1.png";
                }}
                className="h-full w-full object-cover"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== FOCUSED ORBIT TEXT PHRASE MODAL ==================== */}
      <AnimatePresence>
        {selectedPhrase && (
          <motion.div
            key={`phrase-modal-${selectedPhrase}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32 }}
            onClick={() => setSelectedPhrase(null)}
            className="pointer-events-auto absolute inset-0 z-30 flex cursor-pointer items-center justify-center bg-black/65 px-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.84, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              {...editableProps(2, "field-orbit-phrases", "ข้อความลอยในวงโคจร")}
              className="flex w-full max-w-[320px] flex-col items-center rounded-3xl border border-pink-300/50 bg-[#140b28]/95 px-6 py-7 text-center shadow-[0_24px_60px_rgba(0,0,0,0.88),0_0_40px_rgba(244,114,182,0.32)]"
            >
              <Sparkles className="mb-3 h-5 w-5 text-amber-300" />
              <p className="text-lg leading-relaxed font-bold text-white drop-shadow-[0_0_16px_rgba(244,114,182,0.65)]">
                &ldquo;
                <TypewriterText
                  text={selectedPhrase}
                  speedMs={44}
                  startDelayMs={150}
                  replayKey={selectedPhrase}
                  instant={Boolean(studio)}
                />
                &rdquo;
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== STAGE 4: SECRET 3D HEART & FINALE LETTER ==================== */}
      <AnimatePresence>
        {stage === "heart" && letterOpen && (
          <motion.div
            key="heart-letter-card"
            initial={{ opacity: 0, y: 26, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            onClick={handleReturnToGalaxy}
            className="pointer-events-auto absolute inset-0 z-30 flex cursor-pointer items-end justify-center bg-black/25 px-4 pb-6"
          >
            <div className="relative w-full max-w-[340px] rounded-3xl border border-pink-300/40 bg-[#110922]/88 px-5 pt-6 pb-5 text-center shadow-[0_24px_60px_rgba(0,0,0,0.85),0_0_36px_rgba(244,114,182,0.24)] backdrop-blur-xl">
              <div className="pointer-events-none absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-pink-200/80 bg-gradient-to-br from-pink-400 to-rose-600 text-white shadow-[0_0_18px_rgba(244,114,182,0.8)]">
                <Heart className="h-4 w-4 fill-white" />
              </div>

              <h3
                {...editableProps(4, "field-orbit-letter-title", "หัวข้อจดหมาย")}
                className={`mb-2 min-h-[1.6rem] rounded-lg px-2 text-base font-bold text-pink-200 ${onSelectField ? "cursor-pointer" : ""
                  }`}
              >
                <TypewriterText
                  text={letterTitle}
                  speedMs={44}
                  startDelayMs={200}
                  instant={Boolean(studio)}
                  showCursor={false}
                  onComplete={() => setLetterTitleDone(true)}
                />
              </h3>

              <p
                {...editableProps(4, "field-orbit-letter-body", "ข้อความความรู้สึก")}
                className={`max-h-36 min-h-[4rem] overflow-y-auto whitespace-pre-line rounded-lg px-2 py-1 text-xs leading-relaxed text-pink-50/90 ${onSelectField ? "cursor-pointer" : ""
                  }`}
              >
                {letterTitleDone && (
                  <TypewriterText
                    text={letterBody}
                    speedMs={42}
                    startDelayMs={180}
                    instant={Boolean(studio)}
                    onComplete={() => setLetterBodyDone(true)}
                  />
                )}
              </p>

              {letterBodyDone && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  {...editableProps(4, "field-orbit-signoff", "คำลงท้าย")}
                  className={`mt-2.5 rounded px-2 text-xs font-semibold text-amber-200/90 ${onSelectField ? "cursor-pointer" : ""
                    }`}
                >
                  {signOff}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
