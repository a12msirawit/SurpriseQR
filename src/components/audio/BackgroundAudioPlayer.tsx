"use client";

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { extractYouTubeId, buildYouTubeAudioEmbedUrl } from "@/lib/audio-helper";

export interface BackgroundAudioPlayerProps {
  url?: string | null;
  isPlaying: boolean;
  loop?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTimeSec: number) => void;
}

export interface BackgroundAudioPlayerHandle {
  play: () => void;
  pause: () => void;
}

const BackgroundAudioPlayer = forwardRef<
  BackgroundAudioPlayerHandle,
  BackgroundAudioPlayerProps
>(function BackgroundAudioPlayer(
  { url, isPlaying, loop = true, onPlay, onPause, onEnded, onTimeUpdate },
  ref,
) {
  const youtubeId = url ? extractYouTubeId(url) : null;
  const isYouTube = Boolean(youtubeId);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isLoadedRef = useRef(false);

  // Send a command to YouTube IFrame via postMessage
  const sendYouTubeCommand = useCallback((command: string, args: unknown = "") => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    try {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: command,
          args: args,
        }),
        "*",
      );
    } catch {
      // Ignore cross-origin error
    }
  }, []);

  const play = useCallback(() => {
    if (isYouTube) {
      sendYouTubeCommand("playVideo");
      onPlay?.();
    } else if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => onPlay?.())
        .catch(() => {});
    }
  }, [isYouTube, sendYouTubeCommand, onPlay]);

  const pause = useCallback(() => {
    if (isYouTube) {
      sendYouTubeCommand("pauseVideo");
      onPause?.();
    } else if (audioRef.current) {
      audioRef.current.pause();
      onPause?.();
    }
  }, [isYouTube, sendYouTubeCommand, onPause]);

  useImperativeHandle(
    ref,
    () => ({
      play,
      pause,
    }),
    [play, pause],
  );

  // Handle play/pause state synchronization
  useEffect(() => {
    if (!url) return;

    if (isPlaying) {
      // Small timeout to allow YouTube iframe or audio to be ready on mount
      const timer = setTimeout(() => {
        play();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      pause();
    }
  }, [isPlaying, url, play, pause]);

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      if (isYouTube) {
        sendYouTubeCommand("pauseVideo");
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isYouTube, sendYouTubeCommand]);

  if (!url) return null;

  if (isYouTube && youtubeId) {
    const embedSrc = buildYouTubeAudioEmbedUrl(youtubeId, {
      autoplay: isPlaying,
      loop: loop,
      enableJsApi: true,
    });

    return (
      <iframe
        ref={iframeRef}
        key={youtubeId}
        src={embedSrc}
        title="Background Audio Player"
        allow="autoplay; encrypted-media"
        tabIndex={-1}
        aria-hidden="true"
        onLoad={() => {
          isLoadedRef.current = true;
          if (isPlaying) {
            sendYouTubeCommand("playVideo");
          }
        }}
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
          border: "none",
        }}
      />
    );
  }

  return (
    <audio
      ref={audioRef}
      src={url}
      loop={loop}
      preload="auto"
      onPlay={onPlay}
      onPause={onPause}
      onEnded={onEnded}
      onTimeUpdate={(e) => {
        onTimeUpdate?.(Math.floor(e.currentTarget.currentTime));
      }}
      style={{ display: "none" }}
    />
  );
});

export default BackgroundAudioPlayer;

