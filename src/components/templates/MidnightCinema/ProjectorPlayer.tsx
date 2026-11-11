"use client";

import { useEffect, useState } from "react";
import { startProjectorHum, stopProjectorHum } from "./audio";
import BackgroundAudioPlayer from "@/components/audio/BackgroundAudioPlayer";

interface ProjectorPlayerProps {
  songTitle?: string;
  songArtist?: string;
  audioSrc?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

/**
 * Vintage 35mm Dual-Reel Projector Soundtrack Player.
 * Zero Emoji Policy — strictly vector SVG reel animation and clean typography.
 */
export default function ProjectorPlayer({
  songTitle = "Cinema Paradiso (Love Theme)",
  songArtist = "Ennio Morricone",
  audioSrc,
  onSelectField,
}: ProjectorPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      stopProjectorHum();
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      stopProjectorHum();
      setIsPlaying(false);
    } else {
      startProjectorHum();
      setIsPlaying(true);
    }
  };

  return (
    <div
      onClick={() => onSelectField?.(5, "field-cinema-soundtrack")}
      className="relative mx-auto w-full max-w-xl rounded-2xl border border-neutral-800 bg-[#07080d]/90 p-5 shadow-2xl backdrop-blur-md cursor-pointer group"
    >
      {audioSrc && (
        <BackgroundAudioPlayer
          url={audioSrc}
          isPlaying={isPlaying}
          loop
          onEnded={() => {
            setIsPlaying(false);
            stopProjectorHum();
          }}
        />
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
        {/* Animated 35mm Twin Reels Graphic */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Reel 1 (Supply Reel) */}
          <div className="relative flex items-center justify-center">
            <svg
              className={`h-12 w-12 text-amber-500/80 transition-transform ${
                isPlaying ? "animate-[spin_4s_linear_infinite]" : ""
              }`}
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="50" cy="50" r="46" strokeWidth="4" />
              <circle cx="50" cy="50" r="16" strokeWidth="4" fill="#090a0f" />
              {/* Spoke Holes */}
              <circle cx="50" cy="24" r="7" fill="#090a0f" strokeWidth="2" />
              <circle cx="73" cy="37" r="7" fill="#090a0f" strokeWidth="2" />
              <circle cx="73" cy="63" r="7" fill="#090a0f" strokeWidth="2" />
              <circle cx="50" cy="76" r="7" fill="#090a0f" strokeWidth="2" />
              <circle cx="27" cy="63" r="7" fill="#090a0f" strokeWidth="2" />
              <circle cx="27" cy="37" r="7" fill="#090a0f" strokeWidth="2" />
              <circle cx="50" cy="50" r="5" fill="currentColor" />
            </svg>
          </div>

          {/* Film Tape Path */}
          <div className="hidden sm:block h-0.5 w-6 bg-amber-500/30" />

          {/* Reel 2 (Takeup Reel) */}
          <div className="relative flex items-center justify-center">
            <svg
              className={`h-12 w-12 text-amber-400/90 transition-transform ${
                isPlaying ? "animate-[spin_4s_linear_infinite]" : ""
              }`}
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="50" cy="50" r="46" strokeWidth="4" />
              <circle cx="50" cy="50" r="16" strokeWidth="4" fill="#090a0f" />
              {/* Spoke Holes */}
              <circle cx="50" cy="24" r="7" fill="#090a0f" strokeWidth="2" />
              <circle cx="73" cy="37" r="7" fill="#090a0f" strokeWidth="2" />
              <circle cx="73" cy="63" r="7" fill="#090a0f" strokeWidth="2" />
              <circle cx="50" cy="76" r="7" fill="#090a0f" strokeWidth="2" />
              <circle cx="27" cy="63" r="7" fill="#090a0f" strokeWidth="2" />
              <circle cx="27" cy="37" r="7" fill="#090a0f" strokeWidth="2" />
              <circle cx="50" cy="50" r="5" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Track Metadata */}
        <div className="flex-1 text-center sm:text-left min-w-0">
          <p className="font-mono text-[10px] tracking-[0.25em] text-neutral-400 uppercase">
            ORIGINAL SOUNDTRACK
          </p>
          <h4 className="font-serif text-sm sm:text-base font-bold text-amber-100 truncate">
            {songTitle || "Cinema Paradiso"}
          </h4>
          <p className="font-mono text-xs text-neutral-400 truncate">
            {songArtist || "Ennio Morricone"}
          </p>
        </div>

        {/* Play / Pause Button (Strictly Pure Vector SVG, Zero Emoji) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          aria-label={isPlaying ? "หยุดเล่นเพลง" : "เริ่มเล่นเพลง"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-neutral-900 text-amber-200 shadow-lg transition-all duration-200 hover:border-amber-300 hover:bg-neutral-800 hover:text-white active:scale-95"
        >
          {isPlaying ? (
            /* Pause Vector */
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            /* Play Vector */
            <svg className="h-4 w-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

