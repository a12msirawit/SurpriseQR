"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles, Gift, AlertCircle, Music, Image as ImageIcon, Clock, Heart, ThumbsUp, Smile, ArrowLeft, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";
import type { Card, UserTier, CardScene, ReactionType, DatabaseSceneType } from "@/types/database";
import { verifyCardPin, incrementCardViewCount, submitCardReaction } from "@/app/c/[hash_id]/actions";

import SurpriseQR from "@/components/cards/SurpriseQR";
import { defaultSurpriseQRData } from "@/data/templates";
import type { SurpriseQRData } from "@/types/templates";
import {
  resolveTemplateRenderStrategy,
  type TemplateRenderStrategy,
} from "@/lib/template-resolution";

// Template-id sets and strategy resolution live in @/lib/template-resolution
// (pure + unit-tested). Re-exported here for existing consumers of this file.
export type { TemplateRenderStrategy };

interface CardViewerProps {
  card: Card;
  ownerTier: UserTier;
  hashId: string;
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

/**
 * Best-effort merge of LegacyCard columns (image_url, audio_url, message) into
 * the Anniversary Surprise spec schema. Cards created through the dashboard
 * flow persist the full config verbatim in content.config, which wins; legacy
 * rows simply get the defaults + whatever columns exist.
 */
function buildSurpriseQRData(
  card: Card,
  embeddedContent: Record<string, unknown>,
): SurpriseQRData {
  const rawConfigRaw = embeddedContent.config;
  const rawConfig =
    rawConfigRaw && typeof rawConfigRaw === "object"
      ? (rawConfigRaw as Record<string, unknown>)
      : undefined;
  const settingsRaw =
    rawConfig?.settings && typeof rawConfig.settings === "object"
      ? (rawConfig.settings as Record<string, unknown>)
      : (embeddedContent.settings as Record<string, unknown> | undefined);
  const contentRaw =
    rawConfig?.content && typeof rawConfig.content === "object"
      ? (rawConfig.content as Record<string, unknown>)
      : (embeddedContent.content as Record<string, unknown> | undefined);

  const d = defaultSurpriseQRData;
  const str = (v: unknown, fallback: string) => getStringValue(v) || fallback;
  const media = (v: unknown, fallback: string) => {
    if (v && typeof v === "object") {
      const src = getStringValue((v as Record<string, unknown>).src);
      if (src) return { type: "url" as const, src };
    }
    return { type: "url" as const, src: str(v, fallback) };
  };
  const mediaArray = (
    v: unknown,
    fallbackSrcs: string[],
  ): Array<{ type: "url"; src: string }> => {
    if (Array.isArray(v)) {
      return v.slice(0, fallbackSrcs.length).map((item, i) =>
        media(item, fallbackSrcs[i] || ""),
      );
    }
    return fallbackSrcs.map((src) => ({ type: "url" as const, src }));
  };
  const paras =
    contentRaw &&
    Array.isArray((contentRaw.letter as Record<string, unknown> | undefined)?.paragraphs)
      ? ((contentRaw.letter as Record<string, unknown>).paragraphs as unknown[]).map((p) =>
          getStringValue(p),
        )
      : d.content.letter.paragraphs;

  const menuRaw =
    contentRaw?.menu && typeof contentRaw.menu === "object"
      ? (contentRaw.menu as Record<string, unknown>)
      : {};

  return {
    settings: {
      enablePin:
        settingsRaw && typeof settingsRaw.enablePin === "boolean"
          ? settingsRaw.enablePin
          : d.settings.enablePin,
      pinCode: str(settingsRaw?.pinCode, d.settings.pinCode),
      warpDurationEnvelopeMs: Number(
        settingsRaw?.warpDurationEnvelopeMs ?? d.settings.warpDurationEnvelopeMs,
      ),
      warpDurationOptionMs: Number(
        settingsRaw?.warpDurationOptionMs ?? d.settings.warpDurationOptionMs,
      ),
      isPaid:
        settingsRaw && typeof settingsRaw.isPaid === "boolean"
          ? settingsRaw.isPaid
          : d.settings.isPaid,
      promptpayTarget: str(settingsRaw?.promptpayTarget, ""),
      promptpayAmount: Number(settingsRaw?.promptpayAmount ?? 0),
    },
    content: {
      title: str(contentRaw?.title, str(embeddedContent.title, d.content.title)),
      menu: {
        subTitle: str(menuRaw.subTitle, d.content.menu.subTitle),
        title: str(menuRaw.title, d.content.menu.title),
        card1Icon: str(menuRaw.card1Icon, d.content.menu.card1Icon),
        card1Title: str(menuRaw.card1Title, d.content.menu.card1Title),
        card1Desc: str(menuRaw.card1Desc, d.content.menu.card1Desc),
        card2Icon: str(menuRaw.card2Icon, d.content.menu.card2Icon),
        card2Title: str(menuRaw.card2Title, d.content.menu.card2Title),
        card2Desc: str(menuRaw.card2Desc, d.content.menu.card2Desc),
        card3Icon: str(menuRaw.card3Icon, d.content.menu.card3Icon),
        card3Title: str(menuRaw.card3Title, d.content.menu.card3Title),
        card3Desc: str(menuRaw.card3Desc, d.content.menu.card3Desc),
      },
      bgMusic: {
        type: "url",
        src: str(
          media(contentRaw?.bgMusic, "").src,
          media(embeddedContent.bgMusic, "").src || card.audio_url || "",
        ),
      },
      letter: {
        title: str(
          (contentRaw?.letter as Record<string, unknown> | undefined)?.title,
          d.content.letter.title,
        ),
        paragraphs: paras && paras.length > 0 ? paras : d.content.letter.paragraphs,
        headerImages: mediaArray(
          (contentRaw?.letter as Record<string, unknown> | undefined)?.headerImages,
          d.content.letter.headerImages.map((m) => m.src),
        ),
      },
      memories: {
        sectionTitle: str(
          contentRaw?.memories
            ? (contentRaw.memories as Record<string, unknown>).sectionTitle
            : "",
          d.content.memories.sectionTitle,
        ),
        filmstripImages: mediaArray(
          contentRaw?.memories
            ? (contentRaw.memories as Record<string, unknown>).filmstripImages
            : undefined,
          d.content.memories.filmstripImages.map((m) => m.src),
        ),
        polaroidImages: mediaArray(
          contentRaw?.memories
            ? (contentRaw.memories as Record<string, unknown>).polaroidImages
            : undefined,
          d.content.memories.polaroidImages.map((m) => m.src),
        ),
        description: str(
          contentRaw?.memories
            ? (contentRaw.memories as Record<string, unknown>).description
            : "",
          d.content.memories.description,
        ),
      },
       flowers: {
         subTitle: str(
           contentRaw?.flowers
             ? (contentRaw.flowers as Record<string, unknown>).subTitle
             : "",
           d.content.flowers.subTitle,
         ),
         title: str(
           contentRaw?.flowers
             ? (contentRaw.flowers as Record<string, unknown>).title
             : "",
           d.content.flowers.title,
         ),
         message: str(
          contentRaw?.flowers
            ? (contentRaw.flowers as Record<string, unknown>).message
            : "",
          d.content.flowers.message,
        ),
        highlightText: str(
          contentRaw?.flowers
            ? (contentRaw.flowers as Record<string, unknown>).highlightText
            : "",
          d.content.flowers.highlightText,
        ),
      },
      songMedia: {
        mediaType:
          contentRaw?.songMedia &&
          ["auto", "video", "audio", "youtube"].includes(
            (contentRaw.songMedia as Record<string, unknown>).mediaType as string,
          )
            ? ((contentRaw.songMedia as Record<string, unknown>).mediaType as
                | "auto"
                | "video"
                | "audio"
                | "youtube")
            : d.content.songMedia.mediaType,
        src: str(
          contentRaw?.songMedia
            ? (contentRaw.songMedia as Record<string, unknown>).src
            : "",
          "",
        ),
        audioSrc: str(
          contentRaw?.songMedia
            ? (contentRaw.songMedia as Record<string, unknown>).audioSrc
            : "",
          "",
        ),
        songTitle: str(
          contentRaw?.songMedia
            ? (contentRaw.songMedia as Record<string, unknown>).songTitle
            : "",
          d.content.songMedia.songTitle,
        ),
        songArtist: str(
          contentRaw?.songMedia
            ? (contentRaw.songMedia as Record<string, unknown>).songArtist
            : "",
          d.content.songMedia.songArtist,
        ),
        sectionTitle: str(
          contentRaw?.songMedia
            ? (contentRaw.songMedia as Record<string, unknown>).sectionTitle
            : "",
          d.content.songMedia.sectionTitle,
        ),
        accentImages: mediaArray(
          contentRaw?.songMedia
            ? (contentRaw.songMedia as Record<string, unknown>).accentImages
            : undefined,
          d.content.songMedia.accentImages.map((m) => m.src),
        ),
      },
      finale: {
        heroImage: media(
          contentRaw?.finale
            ? (contentRaw.finale as Record<string, unknown>).heroImage
            : (embeddedContent.heroImage as string),
          d.content.finale.heroImage.src,
        ),
        mainText: str(
          contentRaw?.finale
            ? (contentRaw.finale as Record<string, unknown>).mainText
            : "",
          d.content.finale.mainText,
        ),
        subText: str(
          contentRaw?.finale
            ? (contentRaw.finale as Record<string, unknown>).subText
            : "",
          d.content.finale.subText,
        ),
      },
    },
  };
}

export default function CardViewer({ card, ownerTier, hashId }: CardViewerProps) {
  const [pinInput, setPinInput] = useState("");
  const [pinVerified, setPinVerified] = useState(!card.pin_code);
  const [isOpened, setIsOpened] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [giftBoxOpened, setGiftBoxOpened] = useState(false);
  const [scratchRevealed, setScratchRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [reaction, setReaction] = useState<ReactionType | null>(null);
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [submittingReaction, setSubmittingReaction] = useState(false);
  const [reactionSubmitted, setReactionSubmitted] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  const scenes = card.scenes || [];
  const hasScenes = scenes.length > 0;
  const currentScene = hasScenes ? scenes[currentSceneIndex] : null;
  const embeddedContent = parseJsonObject(card.message);
  const renderStrategy = resolveTemplateRenderStrategy(card, embeddedContent);
  const embeddedScenes = Array.isArray(embeddedContent.scenes) ? embeddedContent.scenes : [];
  const resolvedScenes = scenes.length > 0 ? scenes : embeddedScenes.map((scene, index) => {
    const item = scene as Record<string, unknown>;
    return {
      id: getStringValue(item.id),
      card_id: card.id,
      scene_order: Number(item.scene_order) || index,
      scene_type: (getStringValue(item.scene_type) || "text") as DatabaseSceneType,
      content: getStringValue(item.content ?? item.body ?? item.title),
      created_at: getStringValue(item.created_at) || new Date().toISOString(),
    };
  });

  // Check unlock_at countdown
  useEffect(() => {
    if (card.unlock_at) {
      const unlockTime = new Date(card.unlock_at).getTime();
      const updateTime = () => {
        const now = Date.now();
        const remaining = unlockTime - now;
        setTimeRemaining(remaining > 0 ? remaining : null);
      };

      updateTime();
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
    }
  }, [card.unlock_at]);

  // Increment view count when the card is opened. The two full-bleed template
  // strategies render without the generic gates, so they count on mount.
  const isImmersiveStrategy = renderStrategy === "anniversary-surprise";
  useEffect(() => {
    if ((isOpened || isImmersiveStrategy) && !error) {
      incrementCardViewCount(hashId);
    }
  }, [isOpened, isImmersiveStrategy, hashId, error]);

  async function handlePinSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (pinInput.length < 4 || pinInput.length > 8) {
      setError("กรุณากรอกรหัส PIN ให้มีความยาวระหว่าง 4 ถึง 8 หลัก");
      return;
    }
    setVerifyingPin(true);

    const result = await verifyCardPin(hashId, pinInput);

    if (result.success) {
      setPinVerified(true);
    } else {
      setError(result.error || "Failed to verify PIN");
    }

    setVerifyingPin(false);
  }

  async function handleReactionSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmittingReaction(true);

    const result = await submitCardReaction(hashId, reaction, thankYouMessage || null);

    if (result.success) {
      setReactionSubmitted(true);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } else {
      setError(result.error || "Failed to submit reaction");
    }

    setSubmittingReaction(false);
  }

  function handleOpenCard() {
    setIsOpened(true);
    
    if (audioRef.current && card.audio_url) {
      audioRef.current.play().catch((err) => {
        console.error("Audio playback failed:", err);
      });
    }

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
    });
  }

  function nextScene() {
    if (hasScenes && currentSceneIndex < scenes.length - 1) {
      setCurrentSceneIndex(currentSceneIndex + 1);
    }
  }

  function prevScene() {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex(currentSceneIndex - 1);
    }
  }

  function toggleGiftBox() {
    setGiftBoxOpened(!giftBoxOpened);
    if (!giftBoxOpened) {
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  }

  function revealScratch() {
    setScratchRevealed(true);
    confetti({
      particleCount: 80,
      spread: 50,
      origin: { y: 0.6 },
    });
  }

  // Show countdown if card is locked by time
  if (timeRemaining !== null && timeRemaining > 0) {
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

    return (
      <main className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? "bg-[#06030c]" : "bg-slate-50"}`}>
        <section className="max-w-md w-full glass-panel bg-white/5 backdrop-blur-xl border border-space-border shadow-2xl rounded-3xl p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Clock className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">
              การ์ดยังไม่พร้อมใช้งาน
            </h1>
            <p className="text-slate-400">การ์ดนี้จะพร้อมใช้งานใน:</p>
          </div>

          <div className="bg-gradient-to-br from-white/5 to-white/10 border border-space-border rounded-2xl p-8 shadow-inner">
            <div className="text-5xl font-bold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent font-mono tracking-wider">
              {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <div className="text-sm text-slate-400 mt-3 font-medium">
              {hours > 0 && `${hours} ชั่วโมง `}
              {minutes > 0 && `${minutes} นาที `}
              {seconds > 0 && `${seconds} วินาที`}
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Full-bleed template strategies render ONLY the template itself: each one
  // owns its landing screen and PIN keypad, so the generic PIN / tap-to-open
  // gates and the badge/QR chrome are intentionally skipped here.
  if (renderStrategy === "anniversary-surprise") {
    return (
      <div className="h-[100dvh] w-screen overflow-hidden">
        <SurpriseQR
          config={buildSurpriseQRData(card, embeddedContent)}
          expectedPin={card.pin_code ?? ""}
        />
      </div>
    );
  }

  if (!pinVerified) {
    return (
      <main className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? "bg-[#06030c]" : "bg-slate-50"}`}>
        <section className="max-w-md w-full glass-panel bg-white/5 backdrop-blur-xl border border-space-border shadow-2xl rounded-3xl p-8 space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Lock className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white">
              ป้อนรหัส PIN
            </h1>
            <p className="text-slate-300">การ์ดนี้ถูกป้องกันด้วยรหัส PIN</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-slate-300 mb-2">
                รหัส PIN
              </label>
              <input
                id="pin"
                type="text"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                minLength={4}
                maxLength={8}
                required
                disabled={verifyingPin}
                className="w-full px-4 py-4 bg-white/5 placeholder-slate-500 border-2 border-space-border rounded-2xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-space-accent/30 focus:border-space-accent text-center text-3xl tracking-widest disabled:opacity-50 transition-all"
                placeholder="ระบุรหัส PIN 4 - 8 หลัก"
              />
              <p className="mt-1 text-xs text-slate-400">รหัส PIN ต้องมีความยาว 4 - 8 หลัก</p>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 p-4 rounded-2xl">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={verifyingPin}
              className="w-full px-6 py-4 btn-gradient text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifyingPin ? "กำลังยืนยัน..." : "ปลดล็อกการ์ด"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (!isOpened) {
    return (
      <main className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? "bg-[#06030c]" : "bg-slate-50"}`}>
        <section className="max-w-md w-full text-center space-y-8">
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-rose-500 to-purple-500 flex items-center justify-center shadow-2xl animate-pulse">
              <Gift className="w-16 h-16 text-white" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white">คุณได้รับการ์ดเซอร์ไพรส์!</h1>
            <p className="text-slate-300">แตะด้านล่างเพื่อเปิดข้อความพิเศษของคุณ</p>
          </div>

          <button
            id="open-card"
            type="button"
            onClick={handleOpenCard}
            className="px-10 py-5 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 hover:from-rose-600 hover:via-pink-600 hover:to-purple-600 text-white rounded-3xl font-bold text-lg shadow-2xl hover:shadow-rose-500/40 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-3 mx-auto"
          >
            <Sparkles className="w-6 h-6" />
            แตะเพื่อเปิดการ์ด
          </button>
        </section>
      </main>
    );
  }

  // Multi-scene viewer
  if (hasScenes && currentScene) {
    return (
      <main className={`min-h-screen p-4 md:p-8 ${darkMode ? "bg-[#06030c]" : "bg-slate-50"}`}>
          <div className="w-full max-w-4xl mx-auto">
            <button type="button" onClick={() => setDarkMode((value) => !value)} className="mb-4 rounded-xl border border-space-border bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 shadow-sm">{darkMode ? "พื้นหลังสว่าง" : "พื้นหลังดำ"}</button>
          {/* Progress Indicator */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-panel bg-white/5 backdrop-blur-xl border border-space-border shadow-lg rounded-2xl p-4 mb-6"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-300">
                ขั้นที่ {currentSceneIndex + 1} จาก {scenes.length}
              </span>
              <div className="flex gap-2">
                {scenes.map((_, index) => (
                  <motion.button
                    key={index}
                    onClick={() => setCurrentSceneIndex(index)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-10 h-10 rounded-full text-sm font-semibold transition-all ${
                      index === currentSceneIndex
                        ? "bg-gradient-to-r from-rose-500 to-purple-500 text-white shadow-lg scale-110"
                        : index < currentSceneIndex
                        ? "bg-emerald-500 text-white"
                        : "bg-white/10 text-slate-400 hover:bg-white/20"
                    }`}
                  >
                    {index < currentSceneIndex ? "✓" : index + 1}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Scene Content */}
          <AnimatePresence mode="wait">
            <motion.section
              key={currentSceneIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="glass-panel bg-white/5 backdrop-blur-xl border border-space-border shadow-2xl rounded-3xl p-6 md:p-8 space-y-6"
            >
              <div className="border-b border-space-border pb-6">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent"
                >
                  {currentScene.content.split("\n")[0].slice(0, 60)}
                </motion.h1>
                <p className="text-slate-400 mt-2 text-sm">
                  สำหรับ: {card.recipient_name} • จาก: {card.sender_name}
                </p>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-white/5 to-white/10 border border-space-border rounded-2xl p-6 shadow-inner"
              >
                <p className="text-slate-100 whitespace-pre-wrap leading-relaxed text-lg">
                  {currentScene.content}
                </p>
              </motion.div>

              {(currentScene.scene_type === "image" || currentScene.scene_type === "video") && currentScene.content && (
                 <motion.div
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.4 }}
                   className="bg-gradient-to-br from-white/5 to-white/10 border border-space-border rounded-2xl p-4 shadow-inner"
                 >
                   <img
                     src={currentScene.content}
                     alt="สื่อของฉาก"
                     className="w-full rounded-xl shadow-md"
                   />
                 </motion.div>
               )}

              {/* Interactive Elements based on scene type */}
              {(currentScene.scene_type as string) === "game" && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-6"
                >
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-rose-500" />
                    องค์ประกอบแบบโต้ตอบ
                  </h3>
                  
                  {/* Scratch Card */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-amber-300 rounded-2xl p-8 text-center shadow-sm"
                  >
                    {!scratchRevealed ? (
                      <div className="space-y-4">
                        <motion.div 
                          whileHover={{ rotate: 5 }}
                          className="w-24 h-24 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg"
                        >
                          <Sparkles className="w-12 h-12 text-white" />
                        </motion.div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={revealScratch}
                          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                        >
                          ลองขูดเพื่อดูผลลัพธ์
                        </motion.button>
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gradient-to-br from-yellow-100 to-amber-100 border border-yellow-300 rounded-2xl p-6 shadow-inner"
                      >
                        <p className="text-amber-800 font-bold text-lg">🎉 คุณพบของขวัญลับ!</p>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Gift Box */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-dashed border-rose-300 rounded-2xl p-8 text-center shadow-sm"
                  >
                    {!giftBoxOpened ? (
                      <div className="space-y-4">
                        <motion.div 
                          whileHover={{ rotate: -5 }}
                          className="w-24 h-24 mx-auto bg-gradient-to-br from-rose-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg"
                        >
                          <Gift className="w-12 h-12 text-white" />
                        </motion.div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={toggleGiftBox}
                          className="px-6 py-3 bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                        >
                          แตะกล่องของขวัญ
                        </motion.button>
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gradient-to-br from-green-100 to-emerald-100 border border-green-300 rounded-2xl p-6 shadow-inner"
                      >
                        <p className="text-green-800 font-bold text-lg">✨ เปิดกล่องของขวัญแล้ว!</p>
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-space-border">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={prevScene}
                  disabled={currentSceneIndex === 0}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  ก่อนหน้า
                </motion.button>

                {currentSceneIndex < scenes.length - 1 ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={nextScene}
                    className="px-6 py-3 bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    ถัดไป
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                ) : (
                  <div className="text-slate-500 text-sm font-medium">สิ้นสุดการ์ด</div>
                )}
              </div>
            </motion.section>
          </AnimatePresence>

          {/* Reaction Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {!reactionSubmitted ? (
              <div className="glass-panel bg-white/5 backdrop-blur-xl border border-space-border shadow-lg rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-space-accent" />
                  ตอบกลับการ์ดนี้
                </h3>
                
                <div className="flex flex-wrap gap-3">
                  {[
                    { type: 'heart' as ReactionType, icon: Heart, label: 'รัก' },
                    { type: 'thumbs_up' as ReactionType, icon: ThumbsUp, label: 'ถูกใจ' },
                    { type: 'smile' as ReactionType, icon: Smile, label: 'ยิ้ม' },
                  ].map(({ type, icon: Icon, label }) => (
                    <motion.button
                      key={type}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setReaction(reaction === type ? null : type)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                        reaction === type
                          ? 'bg-gradient-to-r from-space-accent/20 to-space-glow/20 border-space-accent/50 text-space-accent shadow-md'
                          : 'bg-white/5 border-space-border text-slate-300 hover:bg-white/10 hover:border-space-accent/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {label}
                    </motion.button>
                  ))}
                </div>

                <form onSubmit={handleReactionSubmit} className="space-y-3">
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">
                      ข้อความขอบคุณ (ไม่บังคับ)
                    </label>
                    <textarea
                      id="message"
                      value={thankYouMessage}
                      onChange={(e) => setThankYouMessage(e.target.value)}
                      rows={2}
                      maxLength={500}
                      className="w-full px-4 py-3 bg-white/5 border border-space-border rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-space-accent/30 focus:border-transparent transition-all resize-none"
                      placeholder="เพิ่มข้อความส่วนตัว..."
                    />
                  </div>
                  
                  {error && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <p>{error}</p>
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={submittingReaction || !reaction}
                    className="w-full px-4 py-3 btn-gradient text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingReaction ? "กำลังส่ง..." : "ส่งปฏิกิริยา"}
                  </motion.button>
                </form>
              </div>
            ) : (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6 text-center shadow-lg"
              >
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <Heart className="w-6 h-6" />
                  <span className="font-bold text-lg">ขอบคุณสำหรับปฏิกิริยาของคุณ!</span>
                </div>
              </motion.div>
            )}
          </motion.div>

          {ownerTier === "free" && (
            <footer className="text-center mt-6 text-slate-400 text-sm">
              สร้างด้วย SurpriseQR
            </footer>
          )}
        </div>
      </main>
    );
  }

  // Fallback to single view for cards without scenes
  return (
    <main className={`min-h-screen p-4 md:p-8 ${darkMode ? "bg-[#06030c]" : "bg-slate-50"}`}>
      <section className={`w-full max-w-4xl mx-auto backdrop-blur-xl border shadow-2xl rounded-3xl p-6 md:p-8 space-y-6 ${darkMode ? "border-space-border glass-panel bg-white/5 text-white" : "border-slate-200/60 bg-white/95 text-slate-800"}`}>
        <div className="flex justify-end"><button type="button" onClick={() => setDarkMode((value) => !value)} className="rounded-xl border border-space-border bg-white/5 px-4 py-2 text-sm font-bold text-slate-200">{darkMode ? "พื้นหลังสว่าง" : "พื้นหลังดำ"}</button></div>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-purple-500 flex items-center justify-center shadow-lg">
            <Gift className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="text-center space-y-2 mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent">
            สำหรับ: {card.recipient_name}
          </h1>
          <p className={darkMode ? "text-slate-300" : "text-slate-600"}>จาก: {card.sender_name}</p>
        </div>

        <div className="bg-gradient-to-br from-white/5 to-white/10 border border-space-border rounded-2xl p-6 shadow-inner">
          <p className={`whitespace-pre-wrap leading-relaxed text-lg ${darkMode ? "text-slate-100" : "text-slate-800"}`}>{card.message}</p>
        </div>

        {card.image_url && (
          <div className="bg-gradient-to-br from-white/5 to-white/10 border border-space-border rounded-2xl p-4 shadow-inner">
            <img 
              src={card.image_url} 
              alt="ภาพการ์ด" 
              className="w-full rounded-xl shadow-md"
            />
          </div>
        )}

        {card.audio_url && (
          <div className="bg-gradient-to-br from-white/5 to-white/10 border border-space-border rounded-2xl p-4 flex items-center gap-3 shadow-inner">
            <Music className="w-6 h-6 text-slate-400" />
            <audio ref={audioRef} controls src={card.audio_url} className="flex-1">
              เบราว์เซอร์ของคุณไม่รองรับไฟล์เสียง
            </audio>
          </div>
        )}

        {/* Reaction Section */}
        {!reactionSubmitted ? (
          <div className="glass-panel bg-white/5 backdrop-blur-xl border border-space-border shadow-lg rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-space-accent" />
              ตอบกลับการ์ดนี้
            </h3>
            
            <div className="flex flex-wrap gap-3">
              {[
                { type: 'heart' as ReactionType, icon: Heart, label: 'รัก' },
                { type: 'thumbs_up' as ReactionType, icon: ThumbsUp, label: 'ถูกใจ' },
                { type: 'smile' as ReactionType, icon: Smile, label: 'ยิ้ม' },
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setReaction(reaction === type ? null : type)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                    reaction === type
                      ? 'bg-gradient-to-r from-space-accent/20 to-space-glow/20 border-space-accent/50 text-space-accent shadow-md'
                      : 'bg-white/5 border-space-border text-slate-300 hover:bg-white/10 hover:border-space-accent/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleReactionSubmit} className="space-y-3">
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">
                  ข้อความขอบคุณ (ไม่บังคับ)
                </label>
                <textarea
                  id="message"
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-white/5 border border-space-border rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-space-accent/30 focus:border-transparent transition-all resize-none"
                  placeholder="เพิ่มข้อความส่วนตัว..."
                />
              </div>
              
              {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingReaction || !reaction}
                className="w-full px-4 py-3 btn-gradient text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingReaction ? "กำลังส่ง..." : "ส่งปฏิกิริยา"}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6 text-center shadow-lg">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <Heart className="w-6 h-6" />
              <span className="font-bold text-lg">ขอบคุณสำหรับปฏิกิริยาของคุณ!</span>
            </div>
          </div>
        )}

        {ownerTier === "free" && (
          <footer className="text-center pt-4 border-t border-space-border">
            <p className="text-slate-400 text-sm">สร้างด้วย SurpriseQR</p>
          </footer>
        )}
      </section>
    </main>
  );
}
