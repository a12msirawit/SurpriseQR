"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseAudioBlowDetectionOptions {
  enabled: boolean;
  onBlowDetected: (intensity: number) => void;
}

/**
 * Detects sustained wind/blow energy from the user's microphone using a
 * high-pass filter + AnalyserNode so normal ambient speech rarely triggers.
 */
export function useAudioBlowDetection({
  enabled,
  onBlowDetected,
}: UseAudioBlowDetectionOptions) {
  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTriggerRef = useRef<number>(0);
  const onBlowRef = useRef(onBlowDetected);

  useEffect(() => {
    onBlowRef.current = onBlowDetected;
  }, [onBlowDetected]);

  const stopMic = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setMicActive(false);
    setMicLevel(0);
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopMic();
    }
  }, [enabled, stopMic]);

  useEffect(() => {
    return () => {
      stopMic();
    };
  }, [stopMic]);

  const startMic = useCallback(async () => {
    if (micActive) {
      stopMic();
      return;
    }
    setMicError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicError("อุปกรณ์นี้ไม่รองรับไมโครโฟน กรุณากดค้างที่เปลวเทียนแทน");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtx) {
        stream.getTracks().forEach((track) => track.stop());
        setMicError("เบราว์เซอร์ไม่รองรับ Web Audio กรุณากดค้างที่เปลวเทียนแทน");
        return;
      }

      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);

      // High-pass filter isolates broadband wind/breath turbulence above 350 Hz.
      const highPass = audioCtx.createBiquadFilter();
      highPass.type = "highpass";
      highPass.frequency.value = 350;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;

      source.connect(highPass);
      highPass.connect(analyser);

      streamRef.current = stream;
      audioCtxRef.current = audioCtx;
      setMicActive(true);

      const bins = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(bins);
        // Average mid-high turbulence bins (wind hiss)
        const slice = bins.slice(4, 36);
        const avg = slice.reduce((acc, val) => acc + val, 0) / slice.length;
        const normalized = Math.min(100, Math.round((avg / 110) * 100));
        setMicLevel(normalized);

        const now = Date.now();
        if (avg > 46 && now - lastTriggerRef.current > 180) {
          lastTriggerRef.current = now;
          onBlowRef.current(normalized);
        }
        rafRef.current = window.requestAnimationFrame(tick);
      };

      rafRef.current = window.requestAnimationFrame(tick);
    } catch {
      setMicError("ไม่สามารถเปิดไมโครโฟนได้ กรุณากดค้างที่เปลวเทียนแทน");
      stopMic();
    }
  }, [micActive, stopMic]);

  return {
    micActive,
    micLevel,
    micError,
    startMic,
    stopMic,
  };
}

