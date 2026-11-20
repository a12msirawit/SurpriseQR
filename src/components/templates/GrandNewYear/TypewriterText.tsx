"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface TypewriterTextProps {
  text: string;
  /** Milliseconds per Thai grapheme cluster (default ~46ms — smooth, readable pace). */
  speedMs?: number;
  /** Optional delay before typing starts. */
  startDelayMs?: number;
  /** Skip animation and render full text immediately (e.g. in Studio editing mode). */
  instant?: boolean;
  /** Optional key to force re-typing when revisiting a card/flip. */
  replayKey?: string | number;
  className?: string;
  showCursor?: boolean;
  /** Called once all characters finish rendering. */
  onComplete?: () => void;
}

function splitGraphemes(input: string): string[] {
  if (!input) return [];
  try {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      const seg = new Intl.Segmenter("th", { granularity: "grapheme" });
      return Array.from(seg.segment(input), (item) => item.segment);
    }
  } catch {
    // Fallback below
  }
  return Array.from(input);
}

/**
 * Thai-safe grapheme-aware typewriter text reveal.
 * Reveals readable messages one character cluster at a time at a calm, comfortable pace.
 */
export default function TypewriterText({
  text,
  speedMs = 46,
  startDelayMs = 220,
  instant = false,
  replayKey = 0,
  className,
  showCursor = true,
  onComplete,
}: TypewriterTextProps) {
  const graphemes = useMemo(() => splitGraphemes(text), [text]);
  const [visibleCount, setVisibleCount] = useState<number>(instant ? graphemes.length : 0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let cancelled = false;
    if (instant || graphemes.length === 0) {
      setVisibleCount(graphemes.length);
      const t = setTimeout(() => {
        if (!cancelled) onCompleteRef.current?.();
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }

    setVisibleCount(0);
    let current = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const delayId = setTimeout(() => {
      if (cancelled) return;
      intervalId = setInterval(() => {
        if (cancelled) return;
        current += 1;
        setVisibleCount(current);
        if (current >= graphemes.length) {
          if (intervalId) clearInterval(intervalId);
          intervalId = null;
          onCompleteRef.current?.();
        }
      }, speedMs);
    }, startDelayMs);

    return () => {
      cancelled = true;
      clearTimeout(delayId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [graphemes, instant, replayKey, speedMs, startDelayMs]);

  const displayed = instant ? text : graphemes.slice(0, visibleCount).join("");
  const isTyping = !instant && visibleCount < graphemes.length;

  return (
    <span className={className}>
      {displayed}
      {showCursor && isTyping && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[0.95em] w-[1.5px] translate-y-[0.12em] animate-pulse bg-amber-300/90"
        />
      )}
    </span>
  );
}
