"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RotateCcw, Volume2, VolumeX, Maximize2, X, ChevronRight, ChevronLeft, Film } from "lucide-react";
import BackgroundAudioPlayer from "@/components/audio/BackgroundAudioPlayer";
import { playCameraShutter } from "./starlightSound";

export interface StarlightScene {
  id: string;
  image: string;
  caption: string;
  sceneNumber: string;
  actName: string;
  subCaption?: string;
}

interface TouchSpark {
  id: number;
  x: number;
  y: number;
}

interface StarlightMemoriesTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

// 28-Second Cinematic Cutscene Pacing
const CUTSCENE_DURATION_SEC = 28;

export default function StarlightMemoriesTemplate({
  config,
  studio = false,
  activeScreen,
  onSelectField,
}: StarlightMemoriesTemplateProps) {
  // Extract and normalize configuration
  const raw = (config as unknown as Record<string, unknown>) || {};
  const content = ((raw.content as Record<string, unknown>) || raw) as Record<string, unknown>;
  const menu = (content.menu as Record<string, unknown>) || {};
  const letter = (content.letter as Record<string, unknown>) || {};
  const memories = (content.memories as Record<string, unknown>) || {};
  const songMedia = (content.songMedia as Record<string, unknown>) || {};
  const finale = (content.finale as Record<string, unknown>) || {};
  const bgMusic = (content.bgMusic as Record<string, unknown>) || {};

  const title =
    (typeof content.title === "string" && content.title) ||
    (typeof raw.title === "string" && raw.title) ||
    (typeof menu.title === "string" && menu.title) ||
    "A Story of Us";

  const recipientName =
    (typeof raw.recipientName === "string" && raw.recipientName) ||
    (typeof menu.subTitle === "string" && menu.subTitle) ||
    "ถึงคนพิเศษของฉัน";

  const audioSrc =
    (typeof songMedia.audioSrc === "string" && songMedia.audioSrc) ||
    (typeof bgMusic.src === "string" && bgMusic.src) ||
    (typeof raw.audio_url === "string" && raw.audio_url) ||
    "";

  // Build 3 primary cinematic acts
  const scenes: StarlightScene[] = useMemo(() => {
    const rawPhotos = Array.isArray(memories.filmstripImages)
      ? (memories.filmstripImages as Array<{ src?: string }>)
      : Array.isArray(raw.photos)
      ? (raw.photos as Array<{ src?: string }>)
      : [];

    const validPhotoUrls = rawPhotos
      .map((p) => p.src)
      .filter((src): src is string => typeof src === "string" && Boolean(src));

    const paragraphs = Array.isArray(letter.paragraphs)
      ? (letter.paragraphs as string[]).filter(Boolean)
      : typeof raw.message === "string"
      ? raw.message.split("\n\n").filter(Boolean)
      : [
          "ทุกจุดเริ่มต้นของเราคือความบังเอิญที่สวยงามที่สุด",
          "ทุกช่วงเวลาที่ได้เดินทางร่วมกัน ทำให้โลกนี้น่าอยู่ขึ้นเสมอ",
          "ขอบคุณที่เข้ามาเป็นดั่งแสงดาวที่สว่างไสวที่สุดในหัวใจฉัน",
        ];

    const fallbackImages = [
      "/templates/galaxy-1.png",
      "/templates/galaxy-2.png",
      "/templates/starlight-memories.svg",
    ];

    const actNames = [
      "ACT 1: THE ENCOUNTER",
      "ACT 2: JOURNEY IN TIME",
      "ACT 3: THE HEARTBEAT",
    ];

    return [0, 1, 2].map((i) => ({
      id: `cutscene-act-${i + 1}`,
      image: validPhotoUrls[i] || fallbackImages[i % fallbackImages.length],
      caption: paragraphs[i] || paragraphs[0] || "ทุกความทรงจำยังคงส่องสว่างชัดเจนเสมอ",
      sceneNumber: `SCENE 0${i + 1}`,
      actName: actNames[i],
      subCaption: `MOMENT 0${i + 1}`,
    }));
  }, [memories.filmstripImages, raw.photos, letter.paragraphs, raw.message]);

  // Mode: 'cutscene' | 'gallery'
  const [mode, setMode] = useState<"cutscene" | "gallery">("cutscene");
  const [cutsceneTime, setCutsceneTime] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [showShutterFlash, setShowShutterFlash] = useState(false);
  const [showLightLeak, setShowLightLeak] = useState(false);
  const [touchSparks, setTouchSparks] = useState<TouchSpark[]>([]);
  const [selectedPolaroidIndex, setSelectedPolaroidIndex] = useState(0);
  const [zoomedScene, setZoomedScene] = useState<StarlightScene | null>(null);

  // Sync mode and cutscene timestamp with studio preview selector
  useEffect(() => {
    if (studio && activeScreen !== undefined) {
      if (activeScreen === 1) {
        setMode("cutscene");
        setCutsceneTime(1);
      } else if (activeScreen === 2) {
        setMode("cutscene");
        setCutsceneTime(6);
      } else if (activeScreen === 3) {
        setMode("cutscene");
        setCutsceneTime(14);
      } else if (activeScreen === 4) {
        setMode("cutscene");
        setCutsceneTime(22);
      } else if (activeScreen === 5) {
        setMode("gallery");
      }
    }
  }, [studio, activeScreen]);

  // Cutscene Timeline Controller (28 Seconds)
  // 0-4s: Intro, 4-12s: Act 1, 12-20s: Act 2, 20-28s: Act 3, 28s: Shutter Finale
  useEffect(() => {
    if (mode !== "cutscene") return;

    setCutsceneTime(0);
    const interval = setInterval(() => {
      setCutsceneTime((prev) => {
        const next = Math.round((prev + 0.1) * 10) / 10;

        // Trigger Light Leak flash on scene transitions (at 4s, 12s, 20s)
        if (Math.abs(next - 4.0) < 0.05 || Math.abs(next - 12.0) < 0.05 || Math.abs(next - 20.0) < 0.05) {
          setShowLightLeak(true);
          setTimeout(() => setShowLightLeak(false), 800);
        }

        // Shutter Finale at 28 seconds
        if (next >= CUTSCENE_DURATION_SEC) {
          clearInterval(interval);
          playCameraShutter();
          setShowShutterFlash(true);
          setTimeout(() => {
            setShowShutterFlash(false);
            setMode("gallery");
          }, 850);
          return CUTSCENE_DURATION_SEC;
        }

        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [mode]);

  // Current Act Index
  const currentAct = useMemo(() => {
    if (cutsceneTime < 4) return -1; // Intro
    if (cutsceneTime < 12) return 0; // Act 1
    if (cutsceneTime < 20) return 1; // Act 2
    return 2; // Act 3
  }, [cutsceneTime]);

  // Interactive Touch Sparks on Screen Tap
  const handleScreenTouch = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const newSpark: TouchSpark = {
      id: Date.now() + Math.random(),
      x: clientX,
      y: clientY,
    };

    setTouchSparks((prev) => [...prev.slice(-12), newSpark]);
    setTimeout(() => {
      setTouchSparks((prev) => prev.filter((s) => s.id !== newSpark.id));
    }, 1200);
  }, []);

  const handleReplayCutscene = () => {
    setShowShutterFlash(true);
    setTimeout(() => {
      setShowShutterFlash(false);
      setCutsceneTime(0);
      setMode("cutscene");
    }, 400);
  };

  return (
    <div
      onClick={handleScreenTouch}
      className="relative w-full h-full min-h-[640px] md:min-h-[720px] flex flex-col justify-between overflow-hidden bg-black text-slate-100 font-sans select-none"
    >
      {/* Background Audio Player */}
      {audioSrc && (
        <BackgroundAudioPlayer
          url={audioSrc}
          isPlaying={isPlayingAudio && !isAudioMuted}
          loop
        />
      )}

      {/* Interactive Touch Spark Particles */}
      <AnimatePresence>
        {touchSparks.map((spark) => (
          <motion.div
            key={spark.id}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [1, 2.2], opacity: [1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{ left: spark.x, top: spark.y }}
            className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
          >
            <Sparkles className="w-6 h-6 text-amber-200 drop-shadow-[0_0_12px_#fde047]" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Light Leak / Film Burn Glow Overlay */}
      <AnimatePresence>
        {showLightLeak && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-40 pointer-events-none bg-gradient-to-tr from-amber-500/35 via-violet-600/30 to-amber-300/20 mix-blend-screen"
          />
        )}
      </AnimatePresence>

      {/* Shutter Freeze Flash Overlay */}
      <AnimatePresence>
        {showShutterFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-50 pointer-events-none bg-white"
          />
        )}
      </AnimatePresence>

      {/* CINEMATIC LETTERBOX: TOP BAR */}
      <div
        className={`w-full bg-black z-30 shrink-0 flex items-center justify-between px-4 sm:px-6 overflow-hidden border-b border-white/5 transition-all duration-700 ${
          mode === "cutscene" ? "h-9 md:h-12 opacity-100" : "h-0 opacity-0"
        }`}
      >
        {/* Blinking REC Indicator */}
        <div className="flex items-center gap-2 text-[10px] md:text-xs font-mono tracking-widest text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_#ef4444]" />
          <span className="font-bold text-red-500">REC</span>
          <span className="text-white/40">|</span>
          <span className="text-slate-400">
            00:00:{String(Math.floor(cutsceneTime)).padStart(2, "0")}
          </span>
        </div>

        {/* Right audio controls */}
        <div className="flex items-center gap-2">
          {studio && (
            <div className="flex items-center bg-white/10 rounded-full p-0.5 text-[9px]">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMode("cutscene");
                }}
                className={`px-2 py-0.5 rounded-full ${mode === "cutscene" ? "bg-red-600 text-white" : "text-slate-400"}`}
              >
                Cutscene
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMode("gallery");
                }}
                className={`px-2 py-0.5 rounded-full ${mode === "gallery" ? "bg-red-600 text-white" : "text-slate-400"}`}
              >
                Gallery
              </button>
            </div>
          )}
          {audioSrc && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAudioMuted((prev) => !prev);
              }}
              className="text-slate-400 hover:text-white p-1"
            >
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <main className="relative flex-1 flex flex-col items-center justify-center overflow-hidden z-10 w-full h-full">
        {/* PHASE 1: CUTSCENE ACTS (0s - 28s) */}
        {mode === "cutscene" && (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {/* Act 0: The Black Screen Intro (0-4s) */}
            {currentAct === -1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5 }}
                onClick={(e) => {
                  if (onSelectField) {
                    e.stopPropagation();
                    onSelectField(1, "field-starlight-story-title");
                  }
                }}
                className={`flex flex-col items-center text-center space-y-3 px-4 rounded-2xl p-4 transition-all ${
                  onSelectField ? "cursor-pointer hover:ring-2 hover:ring-violet-400 hover:ring-dashed" : ""
                }`}
                title={onSelectField ? "คลิกเพื่อแก้ไขชื่อเรื่อง & เพลง (แท็บ 1)" : undefined}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 1.2 }}
                  className="w-12 h-12 rounded-full border border-amber-300/30 flex items-center justify-center text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                >
                  <Film className="w-5 h-5 animate-spin [animation-duration:12s]" />
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0, duration: 1.2 }}
                  className="text-2xl md:text-3xl font-light tracking-[0.35em] text-amber-100 uppercase"
                >
                  {title}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  transition={{ delay: 1.8, duration: 1 }}
                  className="text-xs md:text-sm font-light text-slate-300 tracking-widest"
                >
                  {recipientName}
                </motion.p>
              </motion.div>
            )}

            {/* Act 1, 2, 3: Fullscreen Cinematic Widescreen Canvas */}
            {currentAct >= 0 && scenes[currentAct] && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={scenes[currentAct].id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
                >
                  {/* Widescreen Canvas with Pan & Zoom Cinematic Camera */}
                  <div
                    onClick={(e) => {
                      if (onSelectField) {
                        e.stopPropagation();
                        onSelectField(currentAct + 2, `field-starlight-act-${currentAct + 1}`);
                      }
                    }}
                    className={`absolute inset-0 overflow-hidden ${
                      onSelectField ? "cursor-pointer group" : ""
                    }`}
                    title={onSelectField ? `คลิกเพื่อแก้ไขฉากที่ ${currentAct + 1} (แท็บ ${currentAct + 2})` : undefined}
                  >
                    <motion.div
                      className={`w-full h-full transition-all ${
                        onSelectField ? "group-hover:ring-4 group-hover:ring-violet-400/60 group-hover:ring-inset" : ""
                      }`}
                      initial={{
                        scale: currentAct === 1 ? 1.18 : 1.0,
                        y: currentAct === 0 ? "3%" : "-3%",
                      }}
                      animate={{
                        scale: currentAct === 1 ? 1.03 : 1.15,
                        y: currentAct === 0 ? "-3%" : "3%",
                      }}
                      transition={{ duration: 8.5, ease: "linear" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={scenes[currentAct].image}
                        alt={scenes[currentAct].caption}
                        className="w-full h-full object-cover filter contrast-[1.08] brightness-90"
                      />
                    </motion.div>

                    {/* Filmic Vignette & Ambient Darkness */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/70 pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.85)_100%)] pointer-events-none" />
                  </div>

                  {/* Subtitle Typography Bar */}
                  <div
                    onClick={(e) => {
                      if (onSelectField) {
                        e.stopPropagation();
                        onSelectField(currentAct + 2, `field-starlight-act-${currentAct + 1}`);
                      }
                    }}
                    className={`absolute bottom-6 md:bottom-10 left-0 right-0 z-20 flex flex-col items-center text-center px-6 max-w-3xl mx-auto space-y-2 rounded-xl p-2 transition-all ${
                      onSelectField ? "cursor-pointer hover:ring-2 hover:ring-amber-300/80 hover:ring-dashed bg-black/30 backdrop-blur-sm" : ""
                    }`}
                    title={onSelectField ? `คลิกเพื่อแก้ไขข้อความฉากที่ ${currentAct + 1} (แท็บ ${currentAct + 2})` : undefined}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.7 }}
                      className="text-[10px] md:text-xs font-mono tracking-[0.35em] text-amber-300/80 uppercase"
                    >
                      {scenes[currentAct].actName}
                    </motion.div>

                    <motion.p
                      initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                      className="text-lg md:text-2xl font-light text-slate-100 leading-relaxed tracking-wide drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)]"
                      style={{ fontFamily: "'Sarabun', 'Prompt', sans-serif" }}
                    >
                      {scenes[currentAct].caption}
                    </motion.p>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}

        {/* PHASE 2: GLOWING POLAROID STACK EXHIBITION */}
        {mode === "gallery" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full flex flex-col justify-between py-6 px-4 max-w-4xl mx-auto"
          >
            {/* Header */}
            <div
              onClick={(e) => {
                if (onSelectField) {
                  e.stopPropagation();
                  onSelectField(5, "field-starlight-finale-title");
                }
              }}
              className={`text-center space-y-1 rounded-xl p-2 transition-all ${
                onSelectField ? "cursor-pointer hover:ring-2 hover:ring-violet-400 hover:ring-dashed" : ""
              }`}
              title={onSelectField ? "คลิกเพื่อแก้ไขฉากส่งท้าย (แท็บ 5)" : undefined}
            >
              <span className="text-[10px] md:text-xs font-mono uppercase tracking-[0.35em] text-amber-300/80">
                {finale.mainText ? String(finale.mainText) : "FROZEN IN TIME"}
              </span>
              <h2 className="text-xl md:text-3xl font-light text-slate-100 tracking-wider">
                {finale.subText ? String(finale.subText) : "ความทรงจำที่หยุดเวลาไว้ด้วยความรัก"}
              </h2>
              <p className="text-xs text-slate-400 font-light">
                ปาดเลือกหยิบดูภาพโพลารอยด์ หรือแตะเพื่ออ่านข้อความความในใจ
              </p>
            </div>

            {/* Glowing Polaroid Stack */}
            <div className="relative w-full flex-1 flex items-center justify-center my-4 min-h-[340px]">
              {scenes.map((scene, idx) => {
                const isActive = idx === selectedPolaroidIndex;
                const offset = idx - selectedPolaroidIndex;

                return (
                  <motion.div
                    key={scene.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectField) {
                        onSelectField(5, "field-starlight-finale-msg");
                        return;
                      }
                      if (isActive) {
                        setZoomedScene(scene);
                      } else {
                        setSelectedPolaroidIndex(idx);
                      }
                    }}
                    animate={{
                      scale: isActive ? 1 : 0.88 - Math.abs(offset) * 0.05,
                      x: offset * 45,
                      rotate: offset * 6,
                      zIndex: 30 - Math.abs(offset) * 5,
                      opacity: Math.abs(offset) > 2 ? 0 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 25 }}
                    className={`absolute w-[76vw] sm:w-[50vw] md:w-[320px] bg-[#fbf9f4] p-3 pb-6 rounded-xl shadow-2xl cursor-pointer border border-white/20 transition-shadow ${
                      isActive
                        ? "shadow-[0_0_60px_rgba(251,191,36,0.35)] ring-2 ring-amber-300/40"
                        : "brightness-75"
                    }`}
                  >
                    {/* Polaroid Photo Canvas */}
                    <div className="relative aspect-[4/3] w-full bg-black rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={scene.image}
                        alt={scene.caption}
                        className="w-full h-full object-cover filter contrast-[1.05]"
                      />
                      <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[9px] font-mono text-amber-200">
                        {scene.sceneNumber}
                      </div>
                      <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 text-white/90">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Polaroid Handwritten Caption Note */}
                    <div className="pt-3 px-1">
                      <p className="text-xs sm:text-sm text-neutral-800 line-clamp-2 font-normal leading-relaxed text-center font-sans">
                        {scene.caption}
                      </p>
                      <span className="block text-[9px] text-neutral-400 text-center font-mono tracking-widest mt-2 uppercase">
                        {scene.actName}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPolaroidIndex((prev) => (prev > 0 ? prev - 1 : scenes.length - 1));
                }}
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="ภาพก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono text-amber-200/90 tracking-widest">
                {selectedPolaroidIndex + 1} / {scenes.length}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPolaroidIndex((prev) => (prev < scenes.length - 1 ? prev + 1 : 0));
                }}
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="ภาพถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Replay Cutscene Button */}
            <div className="flex justify-center pt-2 pb-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReplayCutscene();
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-slate-200 hover:text-white tracking-[0.2em] uppercase font-light transition-all duration-300 shadow-lg hover:border-amber-400/50 hover:shadow-[0_0_24px_rgba(251,191,36,0.3)]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                ชมคัดซีนภาพยนตร์อีกครั้ง
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* FULLSCREEN PHOTO INSPECTION MODAL */}
      <AnimatePresence>
        {zoomedScene && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedScene(null)}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl w-full bg-[#0a0a0f] border border-white/15 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(251,191,36,0.35)] flex flex-col"
            >
              <button
                type="button"
                onClick={() => setZoomedScene(null)}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black text-white/80 hover:text-white flex items-center justify-center transition-colors border border-white/10 backdrop-blur-md"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-black flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={zoomedScene.image}
                  alt={zoomedScene.caption}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="p-6 md:p-8 space-y-3 bg-[#0a0a0f] border-t border-white/10">
                <div className="flex items-center gap-2 text-xs font-mono tracking-[0.25em] text-amber-200/90 uppercase">
                  <span>{zoomedScene.sceneNumber}</span>
                  <span className="text-white/20">•</span>
                  <span>{zoomedScene.actName}</span>
                </div>
                <p className="text-base sm:text-lg md:text-xl text-slate-100 font-light leading-relaxed whitespace-pre-wrap">
                  {zoomedScene.caption}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CINEMATIC LETTERBOX: BOTTOM BAR */}
      <div
        className={`w-full bg-black z-30 shrink-0 flex items-center justify-center border-t border-white/5 overflow-hidden transition-all duration-700 ${
          mode === "cutscene" ? "h-9 md:h-12 opacity-100" : "h-0 opacity-0"
        }`}
      >
        <span className="text-[9px] md:text-[10px] font-mono tracking-[0.4em] text-slate-500 uppercase">
          CINEMATIC 21:9 WIDESCREEN EXPERIENCE
        </span>
      </div>
    </div>
  );
}
