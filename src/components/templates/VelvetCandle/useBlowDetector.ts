"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MicStatus = "idle" | "requesting" | "listening" | "denied" | "unsupported";

interface UseBlowDetectorOptions {
  /** Called roughly every ~90ms while a sustained blow is detected. */
  onBlow: (intensity: number) => void;
}

/**
 * Detects a breath blown into the microphone using the Web Audio AnalyserNode.
 *
 * A blow is broadband noise with heavy low-frequency energy, so we require:
 *  - time-domain RMS well above the calibrated ambient noise floor, and
 *  - strong energy in the low band (< ~1.2 kHz),
 * sustained across several consecutive animation frames. Speech or a single
 * clap rarely satisfies both for long enough.
 */
export function useBlowDetector({ onBlow }: UseBlowDetectorOptions) {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [level, setLevel] = useState(0);

  const onBlowRef = useRef(onBlow);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastLevelUpdate = useRef(0);

  useEffect(() => {
    onBlowRef.current = onBlow;
  }, [onBlow]);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      void ctxRef.current.close().catch(() => {});
    }
    ctxRef.current = null;
    setLevel(0);
    setStatus((s) => (s === "listening" || s === "requesting" ? "idle" : s));
  }, []);

  const start = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    if (streamRef.current) return;
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.35;
      source.connect(analyser);

      streamRef.current = stream;
      ctxRef.current = ctx;
      setStatus("listening");

      const timeData = new Uint8Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const binHz = ctx.sampleRate / analyser.fftSize;
      const lowBins = Math.max(4, Math.floor(1200 / binHz));

      const startedAt = performance.now();
      let noiseFloor = 0.02;
      let calibrationSamples = 0;
      let sustained = 0;
      let lastFire = 0;

      const tick = () => {
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        let sumSq = 0;
        for (let i = 0; i < timeData.length; i++) {
          const v = (timeData[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / timeData.length);

        let lowSum = 0;
        for (let i = 1; i <= lowBins; i++) lowSum += freqData[i];
        const lowAvg = lowSum / lowBins;

        const now = performance.now();

        // Calibrate the ambient noise floor during the first ~600ms.
        if (now - startedAt < 600) {
          calibrationSamples += 1;
          noiseFloor += (rms - noiseFloor) / calibrationSamples;
        } else {
          const threshold = Math.max(0.09, noiseFloor * 3.2);
          const isBlowing = rms > threshold && lowAvg > 105;
          sustained = isBlowing ? sustained + 1 : Math.max(0, sustained - 2);

          if (sustained >= 5 && now - lastFire > 90) {
            lastFire = now;
            const intensity = Math.min(1, (rms - threshold) / 0.25 + 0.3);
            onBlowRef.current(intensity);
          }
        }

        if (now - lastLevelUpdate.current > 80) {
          lastLevelUpdate.current = now;
          setLevel(Math.min(1, rms * 4));
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setStatus("denied");
      stop();
      setStatus("denied");
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { status, level, start, stop };
}

