"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import {
  Delete,
  Heart,
  Image as ImageIcon,
  Lock,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { SurpriseQRData } from "@/types/templates";
import { isYouTubeUrl, extractYouTubeId } from "@/lib/audio-helper";

export interface Lunar3DTemplateProps {
  config?: Partial<SurpriseQRData>;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

type LunarStage = "distant" | "warp1" | "pin" | "warp2" | "explore";

/** Generate deterministic NASA-style multi-octave fBm + cratered Moon albedo & bump textures on Canvas. */
function createProceduralMoonTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const width = 1024;
  const height = 512;

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = width;
  colorCanvas.height = height;
  const cCtx = colorCanvas.getContext("2d")!;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext("2d")!;

  // Deterministic tileable hash for seamless equirectangular noise
  const hash2D = (ix: number, iy: number, periodX: number) => {
    const wx = ((ix % periodX) + periodX) % periodX;
    let n = Math.imul(wx, 374761393) + Math.imul(iy, 668265263);
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };

  const smoothNoise = (x: number, y: number, periodX: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = hash2D(ix, iy, periodX);
    const b = hash2D(ix + 1, iy, periodX);
    const c = hash2D(ix, iy + 1, periodX);
    const d = hash2D(ix + 1, iy + 1, periodX);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };

  const fbm = (u: number, v: number, baseFreq: number, octaves: number) => {
    let val = 0;
    let amp = 0.5;
    let freq = baseFreq;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      val += smoothNoise(u * freq, v * (freq * 0.5), freq) * amp;
      norm += amp;
      freq *= 2;
      amp *= 0.5;
    }
    return val / norm;
  };

  const colorImg = cCtx.createImageData(width, height);
  const bumpImg = bCtx.createImageData(width, height);
  const cData = colorImg.data;
  const bData = bumpImg.data;

  // Pixel-level multi-octave lunar terrain: organic maria basins + highlands + fine rocky regolith
  for (let y = 0; y < height; y++) {
    const v = y / height;
    const latFade = Math.sin(v * Math.PI);
    for (let x = 0; x < width; x++) {
      const u = x / width;
      // Macro volcanic maria mask (irregular basaltic plains)
      const macro = fbm(u + 0.13, v + 0.07, 6, 4);
      // Mid-scale highland ridges & rocky mottling
      const detail = fbm(u + 0.41, v + 0.29, 24, 4);
      // High-frequency fine lunar dust grain
      const micro = smoothNoise(u * 192, v * 96, 192);

      // Shape basaltic maria basins where macro < ~0.48
      const mariaMask = Math.max(0, Math.min(1, (0.52 - macro) * 3.4)) * latFade;
      const highland = 0.64 + detail * 0.28 + (micro - 0.5) * 0.09;
      const lum = Math.max(0.24, Math.min(0.95, highland - mariaMask * 0.34));

      // Subtle cool-warm lunar mineral tint (slightly cooler gray in maria, warm ivory in highlands)
      const r = Math.round(lum * (234 - mariaMask * 18));
      const g = Math.round(lum * (231 - mariaMask * 14));
      const b = Math.round(lum * (226 - mariaMask * 4));

      const heightVal = Math.max(
        0,
        Math.min(255, Math.round((0.5 + (detail - 0.5) * 0.62 + (micro - 0.5) * 0.24 - mariaMask * 0.18) * 255))
      );

      const idx = (y * width + x) * 4;
      cData[idx] = r;
      cData[idx + 1] = g;
      cData[idx + 2] = b;
      cData[idx + 3] = 255;

      bData[idx] = heightVal;
      bData[idx + 1] = heightVal;
      bData[idx + 2] = heightVal;
      bData[idx + 3] = 255;
    }
  }

  cCtx.putImageData(colorImg, 0, 0);
  bCtx.putImageData(bumpImg, 0, 0);

  // Seeded PRNG for crisp multi-scale impact craters & Tycho-style bright ejecta rays
  let seed = 42197;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Bright subtle ejecta rays on 6 young major craters
  for (let i = 0; i < 6; i++) {
    const cx = rand() * width;
    const cy = 64 + rand() * (height - 128);
    const rays = 8 + Math.floor(rand() * 7);
    const maxLen = 42 + rand() * 78;
    cCtx.save();
    cCtx.translate(cx, cy);
    for (let rIdx = 0; rIdx < rays; rIdx++) {
      const ang = (rIdx / rays) * Math.PI * 2 + (rand() - 0.5) * 0.4;
      const len = maxLen * (0.45 + rand() * 0.65);
      const rg = cCtx.createLinearGradient(0, 0, Math.cos(ang) * len, Math.sin(ang) * len);
      rg.addColorStop(0, "rgba(248, 246, 238, 0.28)");
      rg.addColorStop(0.5, "rgba(240, 238, 230, 0.1)");
      rg.addColorStop(1, "rgba(240, 238, 230, 0)");
      cCtx.strokeStyle = rg;
      cCtx.lineWidth = 1.5 + rand() * 3.5;
      cCtx.beginPath();
      cCtx.moveTo(0, 0);
      cCtx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
      cCtx.stroke();
    }
    cCtx.restore();
  }

  // 380 realistic craters with depressed interior, bright rim wall, and subtle central peaks
  for (let i = 0; i < 380; i++) {
    const x = rand() * width;
    const y = 26 + rand() * (height - 52);
    const radius =
      i < 16 ? 15 + rand() * 22 : i < 90 ? 5.5 + rand() * 10 : 1.5 + rand() * 4.5;

    // Color crater: shaded bowl + crisp bright ejecta rim
    const cg = cCtx.createRadialGradient(x, y, radius * 0.08, x, y, radius * 1.15);
    cg.addColorStop(0, "rgba(62, 62, 70, 0.34)");
    cg.addColorStop(0.68, "rgba(86, 85, 92, 0.2)");
    cg.addColorStop(0.86, "rgba(246, 244, 236, 0.36)");
    cg.addColorStop(1, "rgba(246, 244, 236, 0)");
    cCtx.fillStyle = cg;
    cCtx.beginPath();
    cCtx.arc(x, y, radius * 1.15, 0, Math.PI * 2);
    cCtx.fill();

    // Bump crater: sunken basin floor + raised steep rim wall
    const bg = bCtx.createRadialGradient(x, y, radius * 0.06, x, y, radius * 1.12);
    bg.addColorStop(0, "rgba(24, 24, 24, 0.78)");
    bg.addColorStop(0.65, "rgba(56, 56, 56, 0.45)");
    bg.addColorStop(0.86, "rgba(248, 248, 248, 0.85)");
    bg.addColorStop(1, "rgba(128, 128, 128, 0)");
    bCtx.fillStyle = bg;
    bCtx.beginPath();
    bCtx.arc(x, y, radius * 1.12, 0, Math.PI * 2);
    bCtx.fill();

    // Subtle central peak on large impact craters
    if (radius > 16) {
      const pg = bCtx.createRadialGradient(x, y, 0.5, x, y, radius * 0.24);
      pg.addColorStop(0, "rgba(225, 225, 225, 0.75)");
      pg.addColorStop(1, "rgba(128, 128, 128, 0)");
      bCtx.fillStyle = pg;
      bCtx.beginPath();
      bCtx.arc(x, y, radius * 0.24, 0, Math.PI * 2);
      bCtx.fill();
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;

  return { map, bumpMap };
}

/** Generate a soft natural radial moonlight glow texture (no harsh ring edges). */
function createSoftMoonGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, half * 0.32, half, half, half);
  grad.addColorStop(0, "rgba(230, 236, 255, 0.32)");
  grad.addColorStop(0.35, "rgba(215, 224, 250, 0.16)");
  grad.addColorStop(0.68, "rgba(175, 194, 240, 0.05)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Draw any image URL cleanly center-cropped into a crisp 1024x1024 1:1 CanvasTexture that wraps flush onto the Moon. */
function createSquarePhotoTexture(
  src: string,
  onReady: (tex: THREE.CanvasTexture) => void
) {
  const size = 1024;
  const pad = 20;
  const inner = size - pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const drawFrame = () => {
    ctx.strokeStyle = "rgba(248, 236, 200, 0.72)";
    ctx.lineWidth = 6;
    ctx.strokeRect(pad - 3, pad - 3, inner + 6, inner + 6);
  };

  const drawFallback = () => {
    ctx.clearRect(0, 0, size, size);
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, "#241942");
    g.addColorStop(1, "#532356");
    ctx.fillStyle = g;
    ctx.fillRect(pad, pad, inner, inner);
    drawFrame();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    onReady(tex);
  };

  if (!src) {
    drawFallback();
    return;
  }

  const img = new Image();
  if (/^https?:\/\//i.test(src)) {
    img.crossOrigin = "anonymous";
  }
  img.onload = () => {
    const minSide = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const sx = ((img.naturalWidth || img.width) - minSide) / 2;
    const sy = ((img.naturalHeight || img.height) - minSide) / 2;
    ctx.clearRect(0, 0, size, size);
    // Subtle dark backing under border for crisp contrast on lunar surface
    ctx.fillStyle = "rgba(18, 16, 28, 0.85)";
    ctx.fillRect(pad - 6, pad - 6, inner + 12, inner + 12);
    ctx.drawImage(img, sx, sy, minSide, minSide, pad, pad, inner, inner);
    drawFrame();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    onReady(tex);
  };
  img.onerror = drawFallback;
  img.src = src;
}

/** Soft cosmic hyperspace whoosh Web Audio SFX */
function playWarpSfx() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.55);
    osc.frequency.exponentialRampToValueAtTime(220, now + 1.05);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.15);
  } catch {
    // ignore Web Audio block
  }
}

/** Celestial shimmer chord when discovering the backside photo */
function playDiscoveryChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + idx * 0.09;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.075, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.95);
    });
  } catch {
    // ignore
  }
}

export default function Lunar3DTemplate({
  config,
  studio = false,
  activeScreen,
  expectedPin,
  onSelectField,
}: Lunar3DTemplateProps) {
  const settings = config?.settings;
  const content = config?.content;

  const targetPin = (expectedPin || settings?.pinCode || "1234").trim() || "1234";
  const cardTitle = content?.title || "The Secret Behind The Moon";
  const subtitle = content?.menu?.subTitle || "ลองแตะที่ดวงจันทร์";
  const musicSrc = content?.bgMusic?.src || content?.songMedia?.audioSrc || "";
  const backPhotoSrc =
    content?.memories?.polaroidImages?.find((p) => p?.src?.trim())?.src?.trim() ||
    "/templates/galaxy-1.png";
  const letterTitle = content?.letter?.title || "ความลับด้านหลังดวงจันทร์";
  const letterParagraphs =
    content?.letter?.paragraphs && content.letter.paragraphs.length > 0
      ? content.letter.paragraphs
      : [
          "เหมือนกับดวงจันทร์ที่มีด้านลับซ่อนไว้ ฉันก็มีความรู้สึกดีๆ ที่เก็บไว้ให้เธอคนเดียวเหมือนกัน",
          "ขอบคุณที่อยู่เป็นแสงสว่างในทุกค่ำคืนของฉันนะ",
        ];
  const signOff = content?.finale?.subText || "รักเธอเสมอ";

  const [stage, setStage] = useState<LunarStage>("distant");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [keepsakeOpen, setKeepsakeOpen] = useState(false);

  const stageRef = useRef<LunarStage>(stage);
  stageRef.current = stage;
  const backChimePlayedRef = useRef(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const backPhotoSrcRef = useRef(backPhotoSrc);
  backPhotoSrcRef.current = backPhotoSrc;
  const photoMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const moonGroupRef = useRef<THREE.Group | null>(null);
  const targetRotRef = useRef({ x: 0.08, y: 0 });
  const currentRotRef = useRef({ x: 0.08, y: 0 });
  const exploreZoomZRef = useRef(4.55);
  const warpFactorRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const isYtMusic = Boolean(musicSrc && isYouTubeUrl(musicSrc));
  const ytVideoId = isYtMusic ? extractYouTubeId(musicSrc) : null;

  // Sync Studio activeScreen -> stage & rotation preview
  useEffect(() => {
    if (!studio || activeScreen === undefined) return;
    if (activeScreen === 1) {
      setStage("distant");
      setKeepsakeOpen(false);
      targetRotRef.current = { x: 0.08, y: 0 };
    } else if (activeScreen === 2) {
      setStage("pin");
      setKeepsakeOpen(false);
      targetRotRef.current = { x: 0.08, y: 0.2 };
    } else if (activeScreen >= 3) {
      setStage("explore");
      // Rotate smoothly to show the backside 1:1 photo in Studio Tab 3!
      targetRotRef.current = { x: 0.04, y: Math.PI };
    }
  }, [studio, activeScreen]);

  // Ambient lunar pad synth fallback
  const stopSynth = useCallback(() => {
    if (synthTimerRef.current) {
      window.clearInterval(synthTimerRef.current);
      synthTimerRef.current = null;
    }
  }, []);

  const startSynth = useCallback(() => {
    stopSynth();
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const notes = [261.63, 329.63, 392.0, 493.88, 392.0, 329.63, 293.66, 392.0];
      let step = 0;
      const tick = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = notes[step % notes.length];
        step += 1;
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.055, t + 0.14);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 1.3);
      };
      tick();
      synthTimerRef.current = window.setInterval(tick, 1050);
    } catch {
      // ignore
    }
  }, [stopSynth]);

  useEffect(() => {
    return () => {
      stopSynth();
      if (audioRef.current) audioRef.current.pause();
    };
  }, [stopSynth]);

  const startMusic = useCallback(() => {
    setIsPlaying(true);
    if (isYtMusic) {
      stopSynth();
      return;
    }
    if (musicSrc) {
      stopSynth();
      if (audioRef.current) {
        audioRef.current.src = musicSrc;
        audioRef.current.volume = 0.48;
        void audioRef.current.play().catch(() => {});
      }
      return;
    }
    startSynth();
  }, [isYtMusic, musicSrc, startSynth, stopSynth]);

  const toggleMusic = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      stopSynth();
      if (audioRef.current) audioRef.current.pause();
    } else {
      startMusic();
    }
  }, [isPlaying, startMusic, stopSynth]);

  const triggerMoonClickWarp = useCallback(() => {
    if (stageRef.current !== "distant") return;
    playWarpSfx();
    setStage("warp1");
    window.setTimeout(() => {
      setStage("pin");
    }, 1050);
  }, []);

  const handlePinDigit = useCallback(
    (digit: string) => {
      if (stage !== "pin" || pinInput.length >= targetPin.length) return;
      const next = pinInput + digit;
      setPinInput(next);
      setPinError(false);
      if (next.length === targetPin.length) {
        if (next === targetPin) {
          playWarpSfx();
          startMusic();
          setStage("warp2");
          setPinInput("");
          window.setTimeout(() => {
            setStage("explore");
          }, 1150);
        } else {
          setPinError(true);
          window.setTimeout(() => {
            setPinInput("");
            setPinError(false);
          }, 620);
        }
      }
    },
    [stage, pinInput, targetPin, startMusic]
  );

  // Keyboard PIN entry
  useEffect(() => {
    if (stage !== "pin" || studio) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) handlePinDigit(e.key);
      else if (e.key === "Backspace") setPinInput((p) => p.slice(0, -1));
      else if (e.key === "Escape") {
        setPinInput("");
        setStage("distant");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stage, studio, handlePinDigit]);

  // Update 1:1 backside photo texture dynamically when backPhotoSrc changes
  useEffect(() => {
    if (!photoMatRef.current) return;
    createSquarePhotoTexture(backPhotoSrc, (tex) => {
      if (!photoMatRef.current) {
        tex.dispose();
        return;
      }
      const oldMap = photoMatRef.current.map;
      photoMatRef.current.map = tex;
      photoMatRef.current.needsUpdate = true;
      if (oldMap) oldMap.dispose();
    });
  }, [backPhotoSrc]);

  // Main Three.js 3D WebGL Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(0, 0, 11.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Realistic natural space lighting (soft ambient + angled sunlight + gentle earthshine rim)
    const ambientLight = new THREE.AmbientLight(0xb8c6e8, 0.24);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ea, 2.25);
    keyLight.position.set(6.5, 3.6, 7.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x8fb3f2, 0.45);
    rimLight.position.set(-6.5, -2.2, -5.5);
    scene.add(rimLight);

    const backFillLight = new THREE.DirectionalLight(0xf6f1e6, 0.72);
    backFillLight.position.set(0.5, 1.2, -8);
    scene.add(backFillLight);

    // 1. Deep 3D Starfield + Hyperspace Star Streaks
    const starCount = 1400;
    const starPositions = new Float32Array(starCount * 6); // 2 vertices per star streak
    const starBase: Array<{ x: number; y: number; z: number; speed: number }> = [];
    const starColors = new Float32Array(starCount * 6);
    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xbfdbfe),
      new THREE.Color(0xfef3c7),
      new THREE.Color(0xfbcfe8),
    ];

    for (let i = 0; i < starCount; i++) {
      const r = 4.2 + Math.random() * 44;
      const theta = Math.random() * Math.PI * 2;
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;
      const z = -95 + Math.random() * 110;
      starBase.push({ x, y, z, speed: 0.55 + Math.random() * 1.1 });

      const c = palette[i % palette.length];
      for (let v = 0; v < 2; v++) {
        starColors[i * 6 + v * 3] = c.r;
        starColors[i * 6 + v * 3 + 1] = c.g;
        starColors[i * 6 + v * 3 + 2] = c.b;
      }
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const starStreaks = new THREE.LineSegments(starGeo, starMat);
    scene.add(starStreaks);

    // 2. Moon Group (rotates 360° smoothly)
    const moonGroup = new THREE.Group();
    moonGroupRef.current = moonGroup;
    scene.add(moonGroup);

    const MOON_RADIUS = 1.68;
    const { map: moonMap, bumpMap: moonBump } = createProceduralMoonTextures();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    moonMap.anisotropy = maxAniso;
    moonBump.anisotropy = maxAniso;
    const moonGeo = new THREE.SphereGeometry(MOON_RADIUS, 96, 96);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonMap,
      bumpMap: moonBump,
      bumpScale: 0.11,
      roughness: 0.96,
      metalness: 0.0,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moonMesh);

    // Soft natural radial moonlight glow behind the Moon (smooth atmospheric falloff, no harsh ring)
    const glowTex = createSoftMoonGlowTexture();
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
    });
    const glowSprite = new THREE.Sprite(glowMat);
    glowSprite.scale.set(MOON_RADIUS * 3.3, MOON_RADIUS * 3.3, 1);
    scene.add(glowSprite);

    // 3. Large Curved 1:1 Photo Patch wrapping flush across almost the entire back hemisphere of the Moon (-Z face)
    // Project a uniform 1:1 square grid directly onto the sphere (R_surf) so there is zero distortion and every vertex hugs the Moon!
    const R_surf = MOON_RADIUS + 0.014;
    const patchSize = MOON_RADIUS * 1.32; // Corners reach ~93% of Moon radius — covers almost the entire back hemisphere!
    const photoGeo = new THREE.PlaneGeometry(patchSize, patchSize, 48, 48);
    const posAttr = photoGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      const pz = Math.sqrt(Math.max(0.01, R_surf * R_surf - px * px - py * py));
      posAttr.setXYZ(i, px, py, pz);
    }
    photoGeo.computeVertexNormals();

    const photoMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      side: THREE.FrontSide,
    });
    photoMatRef.current = photoMat;
    const photoMesh = new THREE.Mesh(photoGeo, photoMat);
    photoMesh.rotation.y = Math.PI; // Place strictly on the back hemisphere (-Z) facing outward
    moonGroup.add(photoMesh);

    // Initial photo texture load
    createSquarePhotoTexture(backPhotoSrcRef.current, (tex) => {
      if (!photoMatRef.current) {
        tex.dispose();
        return;
      }
      photoMatRef.current.map = tex;
      photoMatRef.current.needsUpdate = true;
    });

    // Subtle distant stardust ring around the Moon
    const ringCount = 160;
    const ringPos = new Float32Array(ringCount * 3);
    for (let i = 0; i < ringCount; i++) {
      const a = (i / ringCount) * Math.PI * 2;
      const rad = MOON_RADIUS + 0.52 + Math.random() * 0.55;
      ringPos[i * 3] = Math.cos(a) * rad;
      ringPos[i * 3 + 1] = (Math.random() - 0.5) * 0.36;
      ringPos[i * 3 + 2] = Math.sin(a) * rad;
    }
    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute("position", new THREE.BufferAttribute(ringPos, 3));
    const ringMat = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 0.032,
      transparent: true,
      opacity: 0.42,
    });
    const orbitDust = new THREE.Points(ringGeo, ringMat);
    orbitDust.rotation.z = 0.24;
    moonGroup.add(orbitDust);

    // Raycaster & Pointer Drag (360° Rotation + Pinch/Wheel Zoom + Moon/Photo Click)
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const activePointers = new Map<number, { x: number; y: number }>();
    let lastPinchDist: number | null = null;
    let isDragging = false;
    let movedDist = 0;
    let prevX = 0;
    let prevY = 0;

    const getPointerNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        movedDist = 999; // prevent pinch from triggering click
        return;
      }
      isDragging = true;
      movedDist = 0;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      const st = stageRef.current;
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      // Mobile 2-finger pinch-to-zoom in explore mode
      if (activePointers.size === 2 && st === "explore") {
        const pts = Array.from(activePointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (lastPinchDist !== null) {
          const delta = lastPinchDist - dist;
          exploreZoomZRef.current = Math.max(
            2.65,
            Math.min(9.2, exploreZoomZRef.current + delta * 0.015)
          );
        }
        lastPinchDist = dist;
        return;
      }

      if (!isDragging) {
        getPointerNdc(e.clientX, e.clientY);
        raycaster.setFromCamera(pointerNdc, camera);
        if (st === "distant") {
          const hit = raycaster.intersectObject(moonMesh, false);
          renderer.domElement.style.cursor = hit.length > 0 ? "pointer" : "default";
        } else if (st === "explore") {
          const hitPhoto = raycaster.intersectObject(photoMesh, false);
          renderer.domElement.style.cursor = hitPhoto.length > 0 ? "pointer" : "grab";
        } else {
          renderer.domElement.style.cursor = "default";
        }
        return;
      }

      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      movedDist += Math.hypot(dx, dy);

      if (st === "explore") {
        renderer.domElement.style.cursor = "grabbing";
        targetRotRef.current.y += dx * 0.0085;
        targetRotRef.current.x = Math.max(
          -Math.PI * 0.48,
          Math.min(Math.PI * 0.48, targetRotRef.current.x + dy * 0.0085)
        );
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) {
        lastPinchDist = null;
      }
      const wasClick = movedDist < 10 && activePointers.size === 0;
      if (activePointers.size === 0) isDragging = false;
      const st = stageRef.current;
      if (!wasClick) return;

      getPointerNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);

      if (st === "distant") {
        const hits = raycaster.intersectObject(moonMesh, false);
        if (hits.length > 0) {
          triggerMoonClickWarp();
        }
      } else if (st === "explore") {
        const photoHits = raycaster.intersectObject(photoMesh, false);
        if (photoHits.length > 0) {
          setKeepsakeOpen(true);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (stageRef.current !== "explore") return;
      e.preventDefault();
      exploreZoomZRef.current = Math.max(
        2.65,
        Math.min(9.2, exploreZoomZRef.current + e.deltaY * 0.0032)
      );
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("pointerdown", onPointerDown);
    domEl.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Animation loop
    let rafId = 0;
    const clock = new THREE.Clock();
    const backNormal = new THREE.Vector3();

    const animate = () => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const st = stageRef.current;

      // Target camera Z & FOV per stage
      let targetZ = 11.5;
      let targetFov = 45;
      let targetWarp = 0;

      if (st === "distant") {
        targetZ = 11.5;
        targetFov = 45;
        targetWarp = 0;
        // Keep the front face of the Moon steady (never rotate to reveal the backside photo!)
        targetRotRef.current.y = 0;
        targetRotRef.current.x = 0.06;
      } else if (st === "warp1") {
        targetZ = 6.8;
        targetFov = 68;
        targetWarp = 1;
        targetRotRef.current.y = 0;
      } else if (st === "pin") {
        targetZ = 7.4;
        targetFov = 46;
        targetWarp = 0;
        targetRotRef.current.y = 0;
      } else if (st === "warp2") {
        targetZ = 4.25;
        targetFov = 74;
        targetWarp = 1.25;
      } else if (st === "explore") {
        targetZ = exploreZoomZRef.current;
        targetFov = 46;
        targetWarp = 0;
      }

      // Only show the backside photo once unlocked in explore mode (extra guarantee!)
      photoMesh.visible = st === "explore";

      camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * 3.8);
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 4.5);
        camera.updateProjectionMatrix();
      }
      warpFactorRef.current += (targetWarp - warpFactorRef.current) * Math.min(1, dt * 5.2);

      // Smooth damped 360° Moon rotation
      currentRotRef.current.x += (targetRotRef.current.x - currentRotRef.current.x) * Math.min(1, dt * 7);
      currentRotRef.current.y += (targetRotRef.current.y - currentRotRef.current.y) * Math.min(1, dt * 7);
      moonGroup.rotation.x = currentRotRef.current.x;
      moonGroup.rotation.y = currentRotRef.current.y;
      orbitDust.rotation.y += dt * 0.16;

      // Play subtle discovery chime when user rotates around to see the 1:1 backside photo
      if (st === "explore") {
        backNormal.set(0, 0, -1).applyEuler(moonGroup.rotation);
        if (backNormal.z > 0.45 && !backChimePlayedRef.current) {
          backChimePlayedRef.current = true;
          playDiscoveryChime();
        }
      }

      // Update starfield streaks
      const posArr = starGeo.attributes.position.array as Float32Array;
      const wf = warpFactorRef.current;
      const speedMult = 1.4 + wf * 68;
      const streakLen = 0.08 + wf * 5.8;

      for (let i = 0; i < starCount; i++) {
        const s = starBase[i];
        s.z += dt * s.speed * speedMult;
        if (s.z > 14) {
          s.z = -95;
        }
        const idx = i * 6;
        posArr[idx] = s.x;
        posArr[idx + 1] = s.y;
        posArr[idx + 2] = s.z;
        posArr[idx + 3] = s.x;
        posArr[idx + 4] = s.y;
        posArr[idx + 5] = s.z - streakLen;
      }
      starGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(rafId);
      domEl.removeEventListener("pointerdown", onPointerDown);
      domEl.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", onResize);
      moonGeo.dispose();
      moonMat.dispose();
      moonMap.dispose();
      moonBump.dispose();
      glowTex.dispose();
      glowMat.dispose();
      photoGeo.dispose();
      if (photoMat.map) photoMat.map.dispose();
      photoMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
    };
  }, [triggerMoonClickWarp]);

  const handleStudioSelect = (
    e: React.MouseEvent,
    tabIndex: number,
    fieldId: string
  ) => {
    if (!studio || !onSelectField) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectField(tabIndex, fieldId);
  };

  return (
    <div
      className="relative flex h-full min-h-[100dvh] w-full flex-col overflow-hidden select-none text-white"
      style={{
        background:
          "radial-gradient(ellipse at 50% 48%, #151935 0%, #090b19 56%, #03040a 100%)",
      }}
    >
      {/* Hidden audio */}
      <audio ref={audioRef} loop playsInline className="hidden" />
      {isPlaying && isYtMusic && ytVideoId && (
        <iframe
          title="Lunar 3D Music"
          src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&loop=1&playlist=${ytVideoId}&enablejsapi=1`}
          allow="autoplay; encrypted-media"
          className="pointer-events-none fixed -left-[9999px] h-px w-px opacity-0"
        />
      )}

      {/* Fullscreen Three.js 3D WebGL Moon Canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 h-full w-full touch-none"
      />

      {/* Frameless Sound Toggle Icon Only (no border, no background) */}
      <button
        type="button"
        onClick={(e) => {
          if (studio && onSelectField) {
            handleStudioSelect(e, 2, "field-lunar-song");
            return;
          }
          toggleMusic();
        }}
        data-studio-focus="field-lunar-song"
        aria-label={isPlaying ? "ปิดเสียงเพลง" : "เปิดเสียงเพลง"}
        title={studio ? "คลิกเพื่อแก้ไขเพลงประกอบ" : isPlaying ? "ปิดเสียงเพลง" : "เปิดเสียงเพลง"}
        className="absolute right-5 top-5 z-20 cursor-pointer bg-transparent p-1.5 text-amber-100/85 drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] transition hover:scale-110 hover:text-amber-200 focus:outline-none"
      >
        {isPlaying ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 opacity-65" />}
      </button>

      {/* Overlay UI per Stage (clean, pure space — no floating HUD buttons) */}
      <div className="pointer-events-none relative z-10 flex flex-1 flex-col items-center justify-between px-4 pb-10 pt-8 sm:pt-10">
        {/* STAGE 1: DISTANT MOON TITLE & PLAIN HINT TEXT */}
        <AnimatePresence>
          {stage === "distant" && (
            <>
              <motion.div
                key="distant-top"
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.6 }}
                className="pointer-events-auto text-center"
              >
                <h1
                  data-studio-focus="field-lunar-title"
                  title={studio ? "คลิกเพื่อแก้ไขชื่อการ์ด" : undefined}
                  onClick={(e) => handleStudioSelect(e, 1, "field-lunar-title")}
                  className="font-serif text-2xl font-semibold tracking-wider text-amber-50 drop-shadow-[0_2px_18px_rgba(254,243,199,0.45)] sm:text-4xl"
                >
                  {cardTitle}
                </h1>
              </motion.div>

              <motion.p
                key="distant-bottom"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: [0.55, 0.95, 0.55], y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{
                  opacity: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
                  y: { duration: 0.6 },
                }}
                data-studio-focus="field-lunar-sub"
                title={studio ? "คลิกเพื่อแก้ไขข้อความใต้ดวงจันทร์" : undefined}
                onClick={(e) => handleStudioSelect(e, 1, "field-lunar-sub")}
                className="pointer-events-auto text-center text-sm font-medium tracking-widest text-amber-100/90 drop-shadow-[0_2px_12px_rgba(253,230,138,0.35)]"
              >
                {subtitle}
              </motion.p>
            </>
          )}
        </AnimatePresence>

        {/* STAGE 2: PASSCODE MODAL AFTER STARFIELD WARP #1 */}
        <AnimatePresence>
          {stage === "pin" && (
            <motion.div
              key="pin-modal"
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.06 }}
              transition={{ duration: 0.4 }}
              className="pointer-events-auto my-auto w-full max-w-xs"
            >
              <motion.div
                animate={pinError ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-3xl border border-amber-200/30 bg-[#0d1024]/82 p-6 text-center shadow-[0_24px_75px_rgba(0,0,0,0.72)] backdrop-blur-xl"
              >
                <button
                  type="button"
                  aria-label="ย้อนกลับ"
                  onClick={() => {
                    setPinInput("");
                    setStage("distant");
                  }}
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition hover:bg-white/15 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber-200/40 bg-amber-300/15 text-amber-200">
                  <Lock className="h-5 w-5" />
                </div>

                <h2 className="font-serif text-lg font-semibold text-amber-50">
                  รหัสลับสู่ดวงจันทร์
                </h2>
                <p className="mt-1 text-xs text-slate-300">
                  {pinError ? "รหัสไม่ถูกต้อง ลองใหม่อีกครั้งนะ" : "กรอกรหัส 4 หลักเพื่อเข้าใกล้ดวงจันทร์"}
                </p>

                {/* PIN Dots */}
                <div
                  data-studio-focus="field-lunar-pin"
                  title={studio ? "คลิกเพื่อแก้ไขรหัสผ่าน 4 หลัก" : undefined}
                  onClick={(e) => handleStudioSelect(e, 1, "field-lunar-pin")}
                  className="mt-4 flex items-center justify-center gap-3.5 py-2"
                >
                  {Array.from({ length: targetPin.length }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-3.5 w-3.5 rounded-full border transition-all ${
                        i < pinInput.length
                          ? pinError
                            ? "scale-110 border-rose-400 bg-rose-500 shadow-[0_0_10px_#f43f5e]"
                            : "scale-110 border-amber-200 bg-amber-300 shadow-[0_0_12px_#fde68a]"
                          : "border-amber-100/40 bg-transparent"
                      }`}
                    />
                  ))}
                </div>

                {/* Glass Numpad */}
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handlePinDigit(num)}
                      className="flex h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-lg font-bold text-amber-50 transition hover:border-amber-200/50 hover:bg-amber-300/20 active:scale-95"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPinInput("")}
                    className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 transition hover:bg-white/15"
                  >
                    C
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePinDigit("0")}
                    className="flex h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-lg font-bold text-amber-50 transition hover:border-amber-200/50 hover:bg-amber-300/20 active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    aria-label="ลบตัวเลข"
                    onClick={() => setPinInput((p) => p.slice(0, -1))}
                    className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/15"
                  >
                    <Delete className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Moonlight Keepsake Modal (Full 1:1 Photo + Heartfelt Letter) */}
      <AnimatePresence>
        {keepsakeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setKeepsakeOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.92, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 18 }}
              onClick={(e) => e.stopPropagation()}
              className="custom-scrollbar relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-amber-200/35 bg-[#10142b]/95 p-5 text-center shadow-[0_28px_90px_rgba(0,0,0,0.8)]"
            >
              <button
                type="button"
                aria-label="ปิดหน้าต่าง"
                onClick={() => setKeepsakeOpen(false)}
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-black/85"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Crisp 1:1 Photo */}
              <div
                data-studio-focus="field-lunar-photo"
                title={studio ? "คลิกเพื่อแก้ไขรูป 1:1 ด้านหลังดวงจันทร์" : undefined}
                onClick={(e) => handleStudioSelect(e, 3, "field-lunar-photo")}
                className="mx-auto aspect-square w-full overflow-hidden rounded-2xl border-2 border-amber-200/50 bg-black/40 shadow-[0_0_28px_rgba(253,230,138,0.22)]"
              >
                {backPhotoSrc ? (
                  <img
                    src={backPhotoSrc}
                    alt={letterTitle}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-amber-200/50">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                )}
              </div>

              {/* Heartfelt Letter */}
              <div className="mt-5 px-2 text-center">
                <div className="mb-2 flex items-center justify-center gap-1.5 text-amber-300">
                  <Heart className="h-4 w-4 fill-amber-300" />
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <h2
                  data-studio-focus="field-lunar-letter-title"
                  title={studio ? "คลิกเพื่อแก้ไขหัวข้อข้อความ" : undefined}
                  onClick={(e) => handleStudioSelect(e, 3, "field-lunar-letter-title")}
                  className="font-serif text-xl font-bold text-amber-100"
                >
                  {letterTitle}
                </h2>
                <div
                  data-studio-focus="field-lunar-letter-body"
                  title={studio ? "คลิกเพื่อแก้ไขข้อความความรู้สึก" : undefined}
                  onClick={(e) => handleStudioSelect(e, 3, "field-lunar-letter-body")}
                  className="mt-3 space-y-3 text-sm leading-relaxed text-slate-200"
                >
                  {letterParagraphs.map((para, idx) => (
                    <p key={idx} className="whitespace-pre-line">
                      {para}
                    </p>
                  ))}
                </div>
                {signOff && (
                  <p
                    data-studio-focus="field-lunar-signoff"
                    title={studio ? "คลิกเพื่อแก้ไขคำลงท้าย" : undefined}
                    onClick={(e) => handleStudioSelect(e, 3, "field-lunar-signoff")}
                    className="mt-4 font-serif text-sm font-semibold text-amber-200"
                  >
                    {signOff}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
