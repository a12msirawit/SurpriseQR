"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import confetti from "canvas-confetti";
import CrtOverlay from "./CrtOverlay";
import RetroWindow from "./RetroWindow";
import RetroButton from "./RetroButton";
import BackgroundAudioPlayer from "@/components/audio/BackgroundAudioPlayer";
import {
  playRetroClick,
  playRetroAlert,
  playRetroSuccess,
} from "./retroSound";
import { AlertTriangle, FileText, Save, Music, ImageIcon, Heart, Sparkles, Gift, RotateCcw, LayoutGrid, Volume2, Play, Pause, Square } from "lucide-react";

interface RetroY2KTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

interface NotepadContentProps {
  fullText: string;
  onNextStage: () => void;
  onComplete?: () => void;
  isComplete?: boolean;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

/**
 * Isolated Notepad Typewriter component.
 * Encapsulating character typing prevents full-page and window re-renders.
 */
const NotepadContent = React.memo(function NotepadContent({
  fullText,
  onNextStage,
  onComplete,
  isComplete = false,
  onSelectField,
}: NotepadContentProps) {
  const [typedChars, setTypedChars] = useState(() => (isComplete ? fullText.length : 0));
  const hasFinishedRef = useRef(isComplete);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Typewriter effect runs only once when not finished
  useEffect(() => {
    if (hasFinishedRef.current) {
      setTypedChars(fullText.length);
      return;
    }

    const interval = setInterval(() => {
      setTypedChars((prev) => {
        if (prev >= fullText.length) {
          clearInterval(interval);
          if (!hasFinishedRef.current) {
            hasFinishedRef.current = true;
            setTimeout(() => {
              onCompleteRef.current?.();
            }, 0);
          }
          return fullText.length;
        }
        const next = prev + 1;
        if (next >= fullText.length) {
          clearInterval(interval);
          if (!hasFinishedRef.current) {
            hasFinishedRef.current = true;
            setTimeout(() => {
              onCompleteRef.current?.();
            }, 0);
          }
          return fullText.length;
        }
        return next;
      });
    }, 28);

    return () => clearInterval(interval);
  }, [fullText]);

  const handleShowAll = () => {
    hasFinishedRef.current = true;
    setTypedChars(fullText.length);
    setTimeout(() => {
      onCompleteRef.current?.();
    }, 0);
  };

  return (
    <div>
      {/* Fake Notepad Menu Bar */}
      <div className="flex items-center gap-3 px-2 py-0.5 border-b border-[#808080] text-[11px] text-neutral-800">
        <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1">File</span>
        <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1">Edit</span>
        <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1">Format</span>
        <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1">Help</span>
      </div>

      {/* Sunken Notepad Canvas with Yellowish Tint Paper */}
      <div className="p-2">
        <div
          onClick={(e) => {
            if (onSelectField) {
              e.stopPropagation();
              onSelectField(3, "field-retro-letter-content");
            }
          }}
          title={onSelectField ? "คลิกเพื่อแก้ไขเนื้อหาจดหมาย (แท็บ 3)" : undefined}
          className={`min-h-[220px] max-h-[280px] overflow-y-auto p-3.5 bg-[#ffffea] border-t-2 border-l-2 border-t-[#808080] border-l-[#808080] border-b-2 border-r-2 border-b-[#ffffff] border-r-[#ffffff] text-xs md:text-sm leading-relaxed whitespace-pre-wrap select-text text-neutral-900 shadow-inner transition-all ${
            onSelectField
              ? "cursor-pointer hover:ring-2 hover:ring-cyan-500 hover:ring-dashed"
              : ""
          }`}
        >
          {fullText.slice(0, typedChars)}
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-black animate-pulse align-middle" />
        </div>
      </div>

      {/* Next Step Shortcut Button */}
      <div className="px-2 pb-2 flex justify-between items-center gap-2">
        {!isComplete ? (
          <button
            type="button"
            onClick={handleShowAll}
            className="text-[10px] text-neutral-600 underline hover:text-black cursor-pointer"
          >
            แสดงข้อความทั้งหมด
          </button>
        ) : (
          <span className="text-[10px] text-emerald-700 font-bold">
            ข้อความแสดงครบแล้ว
          </span>
        )}
        <RetroButton
          variant="primary"
          onClick={onNextStage}
          className="px-4 py-1.5"
        >
          {isComplete ? "เปิดเพลงและฉลองต่อ >>" : "แสดงทั้งหมดและไปต่อ >>"}
        </RetroButton>
      </div>
    </div>
  );
});

const RetroY2KTemplate = React.memo(function RetroY2KTemplate({
  config,
  studio = false,
  activeScreen,
  onSelectField,
}: RetroY2KTemplateProps) {
  // Confetti instance specifically bound to canvas
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiInstanceRef = useRef<confetti.CreateTypes | null>(null);

  const fireConfetti = (options?: confetti.Options) => {
    if (!confettiCanvasRef.current) return;
    try {
      if (!confettiInstanceRef.current) {
        confettiInstanceRef.current = confetti.create(confettiCanvasRef.current, {
          resize: true,
          useWorker: false,
        });
      }
      confettiInstanceRef.current({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#00ffff", "#ff007f", "#ffff00", "#ffffff", "#00ff66"],
        ...options,
      });
    } catch {
      // fallback safe ignore
    }
  };

  // Parse card configuration
  const data = useMemo(() => {
    const raw = (config as Record<string, unknown>) || {};
    const content = (raw.content as Record<string, unknown>) || {};
    const menu = (content.menu as Record<string, unknown>) || {};
    const letter = (content.letter as Record<string, unknown>) || {};
    const songMedia = (content.songMedia as Record<string, unknown>) || {};
    const memories = (content.memories as Record<string, unknown>) || {};
    const finale = (content.finale as Record<string, unknown>) || {};

    const rawParagraphs = letter.paragraphs;
    const paragraphs: string[] = Array.isArray(rawParagraphs) && rawParagraphs.length > 0
      ? (rawParagraphs as string[])
      : [
          "ทุกช่วงเวลาที่ผ่านมากับเธอ",
          "คือความทรงจำที่อบอุ่นและมีค่าที่สุดในชีวิต",
          "ขอบคุณที่คอยอยู่เคียงข้างและเป็นรอยยิ้มให้กันเสมอ",
        ];

    // Gather photos from memories or defaults
    const polaroidImages = Array.isArray(memories.polaroidImages)
      ? (memories.polaroidImages as Array<{ src?: string }>)
      : [];
    const filmstripImages = Array.isArray(memories.filmstripImages)
      ? (memories.filmstripImages as Array<{ src?: string }>)
      : [];
    const allPhotoUrls = [...polaroidImages, ...filmstripImages]
      .map((p) => p?.src)
      .filter((s): s is string => typeof s === "string" && s.length > 0);

    const photos = allPhotoUrls.length > 0
      ? allPhotoUrls
      : ["/templates/galaxy-1.png", "/templates/galaxy-2.png", "/templates/surprise-qr.svg"];

    const bgMusic = (content.bgMusic as Record<string, unknown>) || {};

    return {
      title: typeof content.title === "string" && content.title ? content.title : "Retro Y2K Surprise",
      alertTitle: typeof menu.title === "string" && menu.title
        ? menu.title
        : "SYSTEM ALERT: Heartbeat Overload.exe",
      alertMessage: typeof menu.subTitle === "string" && menu.subTitle
        ? menu.subTitle
        : "ตรวจพบความรู้สึกพิเศษเกินขนาดในไดรฟ์ C:\\\nต้องการเปิดอ่านข้อความเซอร์ไพรส์หรือไม่?",
      alertYesText: typeof menu.card1Title === "string" && menu.card1Title
        ? menu.card1Title
        : "Yes (Y)",
      alertCancelText: typeof menu.card1Desc === "string" && menu.card1Desc
        ? menu.card1Desc
        : "Cancel",
      letterTitle: typeof letter.title === "string" && letter.title ? letter.title : "Heartfelt_Message.txt",
      paragraphs,
      photos,
      photoCaption: typeof memories.description === "string" ? memories.description : "",
      songTitle: typeof songMedia.songTitle === "string" && songMedia.songTitle ? songMedia.songTitle : "Our_Special_Melody.mp3",
      songArtist: typeof songMedia.songArtist === "string" && songMedia.songArtist ? songMedia.songArtist : "Winamp 2.91",
      audioSrc: typeof songMedia.audioSrc === "string" && songMedia.audioSrc
        ? songMedia.audioSrc
        : typeof bgMusic.src === "string"
        ? bgMusic.src
        : "",
      finaleTitle: typeof finale.mainText === "string" && finale.mainText ? finale.mainText : "YOU ARE MY FAVORITE PERSON",
      finaleSubText: typeof finale.subText === "string" && finale.subText ? finale.subText : "ขอบคุณที่เข้ามาเป็นเรื่องราวดีๆ ในทุกๆ วัน",
    };
  }, [config]);

  // Stage: 1 = System Alert / Runaway cancel, 2 = Notepad & PhotoViewer, 3 = Winamp & Finale
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [isNotepadComplete, setIsNotepadComplete] = useState(false);

  // Sync with studio step selector if present
  useEffect(() => {
    if (activeScreen !== undefined && studio) {
      if (activeScreen <= 1) {
        setStage(1);
        setIsNotepadComplete(false);
      } else if (activeScreen <= 3) {
        setStage(2);
      } else if (activeScreen === 4) {
        setStage(2);
        setIsNotepadComplete(true);
      } else {
        setStage(3);
        setIsNotepadComplete(true);
      }
    }
  }, [activeScreen, studio]);

  // Runaway button offset
  const [cancelOffset, setCancelOffset] = useState({ x: 0, y: 0 });
  const [escapeAttempts, setEscapeAttempts] = useState(0);

  // Letter text for Notepad
  const fullLetterText = useMemo(() => data.paragraphs.join("\n\n"), [data.paragraphs]);

  // Photo viewer index
  const [photoIndex, setPhotoIndex] = useState(0);

  // Winamp player state (Starts playing upon clicking Yes in Stage 1, or immediately in studio mode)
  const [isPlaying, setIsPlaying] = useState(() => Boolean(studio && activeScreen && activeScreen > 1));
  const [currentTrackTime, setCurrentTrackTime] = useState(0);

  // Desktop clock
  const [clockTime, setClockTime] = useState("12:00 PM");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockTime(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Runaway cancel button logic
  const handleCancelHover = () => {
    playRetroAlert();
    setEscapeAttempts((prev) => prev + 1);
    const randomX = (Math.random() - 0.5) * 240;
    const randomY = (Math.random() - 0.5) * 160;
    setCancelOffset({ x: randomX, y: randomY });
  };

  // Winamp audio progress ticker
  useEffect(() => {
    if (stage !== 3 || !isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTrackTime((t) => (t >= 214 ? 0 : t + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, isPlaying]);

  // Trigger celebration confetti on Stage 3 via scoped canvas
  useEffect(() => {
    if (stage === 3) {
      playRetroSuccess();
      fireConfetti();
    }
  }, [stage]);

  const desktopRef = useRef<HTMLDivElement>(null);

  // Formatting helper for Winamp timer: mm:ss
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={desktopRef}
      className="relative w-full h-full min-h-[640px] md:min-h-[720px] flex flex-col justify-between overflow-hidden bg-[#008080] font-mono text-black select-none"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(20, 160, 160, 0.4) 0%, rgba(0, 128, 128, 1) 100%)
        `,
      }}
    >
      {/* Hidden Audio Player for Winamp (supports MP3 and YouTube links) */}
      {data.audioSrc && (
        <BackgroundAudioPlayer
          url={data.audioSrc}
          isPlaying={isPlaying}
          loop
          onTimeUpdate={(sec) => {
            setCurrentTrackTime(sec);
          }}
        />
      )}

      {/* Scoped Confetti Canvas strictly contained inside Live Preview frame */}
      <canvas
        ref={confettiCanvasRef}
        id="retro-confetti-canvas"
        className="absolute inset-0 pointer-events-none w-full h-full z-20"
      />

      {/* CRT Scanline & Grain overlay */}
      <CrtOverlay />

      {/* Desktop Icons */}
      <div className="absolute top-4 left-4 flex flex-col gap-5 z-10 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            playRetroClick();
            setStage(1);
          }}
          className="group flex flex-col items-center gap-1 w-18 text-center p-1 rounded hover:bg-[#000080]/30 focus:bg-[#000080]/50"
        >
          <div className="w-10 h-10 flex items-center justify-center drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
            <Save className="w-6 h-6 text-slate-800" />
          </div>
          <span className="text-[11px] font-bold text-white px-1 leading-tight drop-shadow-[1px_1px_1px_rgba(0,0,0,1)]">
            My Surprise
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            playRetroClick();
            setStage(2);
          }}
          className="group flex flex-col items-center gap-1 w-18 text-center p-1 rounded hover:bg-[#000080]/30 focus:bg-[#000080]/50"
        >
          <div className="w-10 h-10 flex items-center justify-center drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
            <FileText className="w-6 h-6 text-slate-800" />
          </div>
          <span className="text-[11px] font-bold text-white px-1 leading-tight drop-shadow-[1px_1px_1px_rgba(0,0,0,1)]">
            Letter.txt
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            playRetroClick();
            setStage(3);
          }}
          className="group flex flex-col items-center gap-1 w-18 text-center p-1 rounded hover:bg-[#000080]/30 focus:bg-[#000080]/50"
        >
          <div className="w-10 h-10 flex items-center justify-center drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
            <Music className="w-6 h-6 text-slate-800" />
          </div>
          <span className="text-[11px] font-bold text-white px-1 leading-tight drop-shadow-[1px_1px_1px_rgba(0,0,0,1)]">
            Winamp.exe
          </span>
        </button>
      </div>

      {/* Main Interactive Desktop Work Area */}
      <div className="relative flex-1 flex items-center justify-center p-4 md:p-8 z-20 overflow-y-auto">
        {/* STAGE 1: SYSTEM ALERT / HEARTBEAT OVERLOAD */}
        {stage === 1 && (
          <RetroWindow
            title={data.alertTitle}
            icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-300 inline" />}
            dragConstraints={desktopRef}
            className="w-full max-w-[440px]"
            statusText="Memory check: 100% capacity filled with love"
            onTitleClick={
              onSelectField
                ? (e) => {
                    e.stopPropagation();
                    onSelectField(1, "field-retro-alert-title");
                  }
                : undefined
            }
            titleTooltip={onSelectField ? "คลิกเพื่อแก้ไขหัวข้อ Alert (แท็บ 1)" : undefined}
          >
            <div className="p-4 space-y-4">
              <div
                onClick={(e) => {
                  if (onSelectField) {
                    e.stopPropagation();
                    onSelectField(1, "field-retro-alert-message");
                  }
                }}
                title={onSelectField ? "คลิกเพื่อแก้ไขข้อความแจ้งเตือน (แท็บ 1)" : undefined}
                className={`flex items-start gap-4 p-2 rounded transition-all ${
                  onSelectField
                    ? "cursor-pointer hover:ring-2 hover:ring-dashed hover:ring-cyan-500 hover:bg-cyan-500/10"
                    : ""
                }`}
              >
                {/* 90s Warning Icon */}
                <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-full bg-[#fce043] border-2 border-black text-2xl font-black shadow-[2px_2px_0px_rgba(0,0,0,0.4)]">
                  !
                </div>
                <div className="space-y-1.5 text-xs md:text-sm">
                  <p className="font-bold text-[#000080]">
                    CRITICAL EXCEPTION 0x98_HEARTBEAT:
                  </p>
                  <p className="text-neutral-800 leading-relaxed whitespace-pre-line">
                    {data.alertMessage}
                  </p>
                  {escapeAttempts > 0 && (
                    <p className="text-[11px] text-red-600 font-bold italic animate-pulse">
                      * ปฏิเสธไม่ได้หรอกนะ! (ความพยายามหนี: {escapeAttempts} ครั้ง)
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons: Yes and Runaway Cancel */}
              <div className="relative pt-3 flex items-center justify-end gap-3 border-t border-[#808080]">
                <RetroButton
                  variant="primary"
                  onClick={() => {
                    playRetroAlert();
                    setIsPlaying(true);
                    setStage(2);
                    setIsNotepadComplete(false);
                  }}
                  className="px-6 py-2 bg-[#d4d4d4] hover:bg-[#e0e0e0]"
                >
                  {data.alertYesText}
                </RetroButton>

                <div
                  style={{
                    transform: `translate(${cancelOffset.x}px, ${cancelOffset.y}px)`,
                    transition: "transform 0.15s ease-out",
                  }}
                >
                  <RetroButton
                    onMouseEnter={handleCancelHover}
                    onTouchStart={handleCancelHover}
                    onClick={handleCancelHover}
                    className="px-5 py-2"
                  >
                    {data.alertCancelText}
                  </RetroButton>
                </div>
              </div>
            </div>
          </RetroWindow>
        )}

        {/* STAGE 2: NOTEPAD.EXE & PHOTOVIEWER.EXE */}
        {stage === 2 && (
          <div className="w-full max-w-4xl flex flex-col lg:flex-row items-center justify-center gap-6 my-auto">
            {/* Notepad Window */}
            <RetroWindow
              title={`Notepad.exe - ${data.letterTitle}`}
              icon={<FileText className="w-3.5 h-3.5 text-white inline" />}
              dragConstraints={desktopRef}
              className={`w-full transition-all duration-500 ${
                isNotepadComplete ? "lg:w-[480px]" : "max-w-[540px] mx-auto"
              }`}
              statusText="Ln 1, Col 1 | 100% | Windows (CRLF)"
              onTitleClick={
                onSelectField
                  ? (e) => {
                      e.stopPropagation();
                      onSelectField(2, "field-retro-letter-title");
                    }
                  : undefined
              }
              titleTooltip={onSelectField ? "คลิกเพื่อแก้ไขชื่อไฟล์ (แท็บ 2)" : undefined}
            >
              <NotepadContent
                fullText={fullLetterText}
                onNextStage={() => {
                  playRetroClick();
                  setStage(3);
                }}
                onComplete={() => setIsNotepadComplete(true)}
                isComplete={isNotepadComplete}
                onSelectField={onSelectField}
              />
            </RetroWindow>

            {/* PhotoViewer.exe Window (only displays once Notepad finishes typing) */}
            {isNotepadComplete && (
              <RetroWindow
                title="PhotoViewer.exe - Memory.bmp"
                icon={<ImageIcon className="w-3.5 h-3.5 text-white inline" />}
                dragConstraints={desktopRef}
                className="w-full lg:w-[360px]"
                statusText={`Photo ${photoIndex + 1} of ${data.photos.length} [100% Zoom]`}
                onTitleClick={
                  onSelectField
                    ? (e) => {
                        e.stopPropagation();
                        onSelectField(4, "field-retro-photo-viewer");
                      }
                    : undefined
                }
                titleTooltip={onSelectField ? "คลิกเพื่อจัดการรูปภาพ (แท็บ 4)" : undefined}
              >
                <div className="p-3 space-y-2.5">
                  {/* Sunken picture frame */}
                  <div
                    onClick={(e) => {
                      if (onSelectField) {
                        e.stopPropagation();
                        onSelectField(4, "field-retro-photo-viewer");
                      }
                    }}
                    title={onSelectField ? "คลิกเพื่อแก้ไขรูปภาพความทรงจำ (แท็บ 4)" : undefined}
                    className={`relative aspect-[4/3] w-full overflow-hidden bg-black border-t-2 border-l-2 border-t-[#808080] border-l-[#808080] border-b-2 border-r-2 border-b-[#ffffff] border-r-[#ffffff] flex items-center justify-center transition-all ${
                      onSelectField
                        ? "cursor-pointer hover:ring-2 hover:ring-cyan-500 hover:ring-dashed"
                        : ""
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.photos[photoIndex]}
                      alt={`Memory ${photoIndex + 1}`}
                      className="w-full h-full object-contain filter contrast-105 pointer-events-none"
                    />
                    <div className="absolute bottom-1 right-2 bg-black/70 px-1.5 py-0.5 text-[9px] text-green-400 font-mono pointer-events-none">
                      {photoIndex + 1}/{data.photos.length}
                    </div>
                  </div>

                  {/* Optional Photo Caption */}
                  {data.photoCaption && (
                    <p
                      onClick={(e) => {
                        if (onSelectField) {
                          e.stopPropagation();
                          onSelectField(4, "field-retro-photo-caption");
                        }
                      }}
                      title={onSelectField ? "คลิกเพื่อแก้ไขคำบรรยายภาพ (แท็บ 4)" : undefined}
                      className={`text-center text-[11px] text-neutral-800 bg-[#e0e0e0] px-2 py-1 border-t border-l border-t-[#808080] border-l-[#808080] border-b border-r border-b-[#ffffff] border-r-[#ffffff] truncate transition-all ${
                        onSelectField
                          ? "cursor-pointer hover:ring-2 hover:ring-cyan-500 hover:ring-dashed"
                          : ""
                      }`}
                    >
                      {data.photoCaption}
                    </p>
                  )}

                  {/* Picture controls */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <RetroButton
                      onClick={() => {
                        playRetroClick();
                        setPhotoIndex((prev) => (prev > 0 ? prev - 1 : data.photos.length - 1));
                      }}
                      className="flex-1 py-1 text-xs"
                    >
                      &lt; Prev
                    </RetroButton>
                    <RetroButton
                      onClick={() => {
                        playRetroClick();
                        setPhotoIndex((prev) => (prev < data.photos.length - 1 ? prev + 1 : 0));
                      }}
                      className="flex-1 py-1 text-xs"
                    >
                      Next &gt;
                    </RetroButton>
                  </div>
                </div>
              </RetroWindow>
            )}
          </div>
        )}

        {/* STAGE 3: WINAMP PLAYER & FINALE CELEBRATION */}
        {stage === 3 && (
          <div className="w-full max-w-xl flex flex-col items-center justify-center gap-5 my-auto">
            {/* WINAMP 90s CLASSIC PLAYER */}
            <div className="w-full max-w-[420px] bg-[#232329] border-t-2 border-l-2 border-t-[#5f5f6b] border-l-[#5f5f6b] border-b-2 border-r-2 border-b-[#0e0e12] border-r-[#0e0e12] p-2 text-white shadow-[4px_4px_12px_rgba(0,0,0,0.8)] font-mono">
              {/* Winamp Title Bar */}
              <div
                onClick={(e) => {
                  if (onSelectField) {
                    e.stopPropagation();
                    onSelectField(5, "field-retro-song-title");
                  }
                }}
                title={onSelectField ? "คลิกเพื่อแก้ไขชื่อเพลง (แท็บ 5)" : undefined}
                className={`flex items-center justify-between bg-gradient-to-r from-[#000080] via-[#1055a0] to-[#000080] px-2 py-0.5 text-[11px] font-black tracking-wide text-white transition-all ${
                  onSelectField ? "cursor-pointer hover:underline hover:text-cyan-200" : ""
                }`}
              >
                <span className="truncate">WINAMP - {data.songTitle}</span>
                <span className="text-[9px] text-cyan-300">v2.91</span>
              </div>

              {/* Display & Spectrum Visualizer */}
              <div
                onClick={(e) => {
                  if (onSelectField) {
                    e.stopPropagation();
                    onSelectField(5, "field-retro-song-title");
                  }
                }}
                title={onSelectField ? "คลิกเพื่อแก้ไขชื่อเพลงและศิลปิน (แท็บ 5)" : undefined}
                className={`mt-1.5 p-2 bg-[#000000] border-t-2 border-l-2 border-t-[#0e0e12] border-l-[#0e0e12] border-b-2 border-r-2 border-b-[#444455] border-r-[#444455] flex flex-col gap-2 transition-all ${
                  onSelectField ? "cursor-pointer hover:ring-2 hover:ring-cyan-400 hover:ring-dashed" : ""
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-[#00ff00]">
                  <span className="font-bold tracking-widest">{formatTimer(currentTrackTime)}</span>
                  <span className="text-[10px] text-emerald-400 truncate max-w-[180px]">
                    {data.songArtist || "SurpriseQR"}
                  </span>
                  <span className="text-[9px] text-emerald-500">192 kbps</span>
                </div>

                {/* Animated Equalizer Bars */}
                <div className="h-10 flex items-end justify-between gap-[3px] px-1 py-0.5 bg-[#0a0f0a] border border-[#1b3a1b]">
                  {[55, 80, 45, 95, 70, 85, 40, 90, 60, 75, 50, 85, 65, 90, 45, 70].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-emerald-500 via-yellow-400 to-rose-500 transition-all duration-150"
                      style={{
                        height: isPlaying ? `${Math.max(15, (h + (i % 3) * 12) % 100)}%` : "8%",
                        opacity: isPlaying ? 0.95 : 0.4,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Player Controls */}
              <div className="mt-2 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playRetroClick();
                      setIsPlaying(!isPlaying);
                    }}
                    className="px-3 py-1 bg-[#404050] hover:bg-[#505065] active:bg-[#303040] border-t border-l border-t-[#808090] border-l-[#808090] border-b border-r border-b-black border-r-black text-xs font-black text-white"
                  >
                    {isPlaying ? <span className="inline-flex items-center gap-1"><Pause className="w-3 h-3 inline" /> PAUSE</span> : <span className="inline-flex items-center gap-1"><Play className="w-3 h-3 inline" /> PLAY</span>}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playRetroClick();
                      setCurrentTrackTime(0);
                    }}
                    className="px-2 py-1 bg-[#404050] hover:bg-[#505065] text-xs font-bold text-white border border-black inline-flex items-center gap-1"
                  >
                    <Square className="w-2.5 h-2.5 fill-current" /> STOP
                  </button>
                </div>
                <span
                  onClick={(e) => {
                    if (onSelectField) {
                      e.stopPropagation();
                      onSelectField(6, "field-retro-audio-src");
                    }
                  }}
                  title={onSelectField ? "คลิกเพื่อแก้ไขไฟล์เพลง (แท็บ 6)" : undefined}
                  className={`text-[10px] text-neutral-400 italic px-1.5 py-0.5 rounded transition-all ${
                    onSelectField ? "cursor-pointer hover:ring-1 hover:ring-cyan-400 hover:text-cyan-300" : ""
                  }`}
                >
                  STEREO • 44.1kHz
                </span>
              </div>
            </div>

            {/* FINALE CELEBRATION WINDOW */}
            <RetroWindow
              title="SURPRISE_SUCCESS.EXE - Completed"
              icon={<Heart className="w-3.5 h-3.5 text-rose-300 inline fill-rose-300" />}
              dragConstraints={desktopRef}
              className="w-full max-w-[480px]"
              statusText="Status: Love overloaded successfully! 100%"
              onTitleClick={
                onSelectField
                  ? (e) => {
                      e.stopPropagation();
                      onSelectField(7, "field-retro-finale-title");
                    }
                  : undefined
              }
              titleTooltip={onSelectField ? "คลิกเพื่อแก้ไขหัวข้อฉลอง (แท็บ 7)" : undefined}
            >
              <div className="p-4 text-center space-y-3.5">
                <div className="flex items-center justify-center gap-3 text-rose-500 animate-bounce"><Sparkles className="w-6 h-6 text-amber-400" /><Heart className="w-7 h-7 text-rose-500 fill-rose-500" /><Gift className="w-7 h-7 text-purple-500" /><Sparkles className="w-6 h-6 text-amber-400" /></div>

                <div
                  onClick={(e) => {
                    if (onSelectField) {
                      e.stopPropagation();
                      onSelectField(7, "field-retro-finale-message");
                    }
                  }}
                  title={onSelectField ? "คลิกเพื่อแก้ไขข้อความฉลองสุดท้าย (แท็บ 7)" : undefined}
                  className={`p-3 bg-white border-t-2 border-l-2 border-t-[#808080] border-l-[#808080] border-b-2 border-r-2 border-b-[#ffffff] border-r-[#ffffff] space-y-2 transition-all ${
                    onSelectField ? "cursor-pointer hover:ring-2 hover:ring-cyan-500 hover:ring-dashed" : ""
                  }`}
                >
                  <h2 className="text-base md:text-lg font-black text-[#000080]">
                    {data.finaleTitle}
                  </h2>
                  <p className="text-xs md:text-sm text-neutral-800 leading-relaxed whitespace-pre-line">
                    {data.finaleSubText}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-1">
                  <RetroButton
                    variant="primary"
                    onClick={() => {
                      playRetroSuccess();
                      fireConfetti({ particleCount: 100, spread: 80 });
                    }}
                    className="px-5 py-2 text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 inline mr-1" />จุดพลุฉลอง
                  </RetroButton>

                  <RetroButton
                    onClick={() => {
                      playRetroClick();
                      setStage(1);
                      setEscapeAttempts(0);
                      setCancelOffset({ x: 0, y: 0 });
                    }}
                    className="px-4 py-2 text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 inline mr-1" />เริ่มต้นใหม่
                  </RetroButton>
                </div>
              </div>
            </RetroWindow>
          </div>
        )}
      </div>

      {/* WINDOWS 98 RETRO TASKBAR AT BOTTOM */}
      <footer className="relative z-30 w-full h-9 bg-[#c0c0c0] border-t-2 border-t-[#ffffff] border-b-2 border-b-[#000000] flex items-center justify-between px-1.5 shadow-[0px_-2px_4px_rgba(0,0,0,0.2)]">
        {/* Start Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playRetroClick();
              setStage((prev) => ((prev % 3 + 1) as 1 | 2 | 3));
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#c0c0c0] border-t-2 border-l-2 border-t-[#ffffff] border-l-[#ffffff] border-b-2 border-r-2 border-b-[#000000] border-r-[#000000] active:border-t-[#000000] active:border-l-[#000000] active:border-b-[#ffffff] active:border-r-[#ffffff] text-xs font-black text-black active:translate-x-[1px] active:translate-y-[1px]"
          >
            <LayoutGrid className="w-3.5 h-3.5 inline text-black mr-1" />
            <span className="font-extrabold tracking-tight">Start</span>
          </button>

          {/* Active Window Task on Taskbar */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#b0b0b0] border-t-2 border-l-2 border-t-[#000000] border-l-[#000000] border-b-2 border-r-2 border-b-[#ffffff] border-r-[#ffffff] text-[11px] font-bold text-black max-w-[200px] truncate">
            <span>{stage === 1 ? <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-600" /> : stage === 2 ? <FileText className="w-3 h-3 inline mr-1" /> : <Music className="w-3 h-3 inline mr-1" />}</span>
            <span className="truncate">
              {stage === 1
                ? "Heartbeat Overload"
                : stage === 2
                ? "Notepad.exe"
                : "Winamp - Love"}
            </span>
          </div>
        </div>

        {/* System Tray (Clock & Sound Icon) */}
        <div className="flex items-center gap-2 px-2 py-0.5 bg-[#c0c0c0] border-t-2 border-l-2 border-t-[#808080] border-l-[#808080] border-b-2 border-r-2 border-b-[#ffffff] border-r-[#ffffff] text-[11px] text-black">
          <span
            className="cursor-pointer hover:opacity-80"
            title="Sound Active"
            onClick={() => playRetroClick()}
          >
            <Volume2 className="w-3.5 h-3.5 inline text-black" />
          </span>
          <span className="font-bold">{clockTime}</span>
        </div>
      </footer>
    </div>
  );
});

export default RetroY2KTemplate;
