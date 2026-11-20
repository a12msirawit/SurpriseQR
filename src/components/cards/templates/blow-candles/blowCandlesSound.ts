"use client";

let sharedAudioCtx: AudioContext | null = null;
let noiseBufferCache: AudioBuffer | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === "suspended") {
    void sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBufferCache && noiseBufferCache.sampleRate === ctx.sampleRate) {
    return noiseBufferCache;
  }
  const length = Math.floor(ctx.sampleRate * 1.6);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.04 * white) / 1.04;
    data[i] = lastOut * 3.2;
  }
  noiseBufferCache = buffer;
  return buffer;
}

function playBellTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  peakGain = 0.08,
  type: OscillatorType = "sine"
) {
  const start = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const harmonic = ctx.createOscillator();
  const gain = ctx.createGain();
  const harmonicGain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  harmonic.type = "triangle";
  harmonic.frequency.setValueAtTime(freq * 2, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  harmonicGain.gain.setValueAtTime(0.0001, start);
  harmonicGain.gain.exponentialRampToValueAtTime(peakGain * 0.25, start + 0.015);
  harmonicGain.gain.exponentialRampToValueAtTime(0.0001, start + duration * 0.65);

  osc.connect(gain);
  harmonic.connect(harmonicGain);
  gain.connect(ctx.destination);
  harmonicGain.connect(ctx.destination);

  osc.start(start);
  harmonic.start(start);
  osc.stop(start + duration + 0.03);
  harmonic.stop(start + duration + 0.03);
}

export function unlockBlowAudio() {
  getAudioContext();
}

export function playCountdownTick(step: number, muted = false) {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const notes: Record<number, number> = {
    3: 523.25, // C5
    2: 587.33, // D5
    1: 659.25, // E5
    0: 783.99, // G5
  };
  const freq = notes[step] ?? 523.25;
  playBellTone(ctx, freq, 0, 0.45, 0.085);
  playBellTone(ctx, freq * 1.5, 0.03, 0.3, 0.028);
}

export function playCandleIgnite(muted = false) {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const sparkle = [659.25, 783.99, 987.77, 1318.51];
  sparkle.forEach((f, idx) => {
    playBellTone(ctx, f, idx * 0.055, 0.48, 0.055);
  });
}

export function playWindWhoosh(intensity = 0.7, muted = false) {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.45 + Math.min(0.45, intensity * 0.35);
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.setValueAtTime(1.4, now);
  filter.frequency.setValueAtTime(240, now);
  filter.frequency.exponentialRampToValueAtTime(760 + intensity * 480, now + 0.16);
  filter.frequency.exponentialRampToValueAtTime(190, now + duration);

  const gain = ctx.createGain();
  const peak = Math.min(0.18, 0.06 + intensity * 0.11);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.09);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  src.start(now);
  src.stop(now + duration + 0.05);
}

export function playCandleExtinguish(remaining = 0, muted = false) {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  playWindWhoosh(0.55, false);
  const basePitch = remaining === 0 ? 1046.5 : 880 - remaining * 75;
  playBellTone(ctx, basePitch, 0.04, 0.38, 0.06);
  if (remaining === 0) {
    playBellTone(ctx, 1318.51, 0.14, 0.55, 0.065);
    playBellTone(ctx, 1567.98, 0.24, 0.7, 0.055);
  }
}

export function playWarpShimmer(muted = false) {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const chord = [392.0, 493.88, 587.33, 739.99, 987.77];
  chord.forEach((f, i) => {
    playBellTone(ctx, f, i * 0.065, 0.95, 0.036);
  });
}

export function playCelebrationFanfare(muted = false) {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const sequence: Array<[number, number, number]> = [
    [523.25, 0, 0.35],
    [659.25, 0.09, 0.35],
    [783.99, 0.18, 0.38],
    [1046.5, 0.28, 0.78],
    [987.77, 0.42, 0.35],
    [1174.66, 0.52, 0.85],
    [1567.98, 0.66, 1.05],
  ];
  sequence.forEach(([freq, delay, dur]) => {
    playBellTone(ctx, freq, delay, dur, 0.068);
  });

  // Soft confetti burst noise
  const now = ctx.currentTime;
  const pop = ctx.createBufferSource();
  pop.buffer = getNoiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(1400, now);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, now);
  g.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
  pop.connect(hp);
  hp.connect(g);
  g.connect(ctx.destination);
  pop.start(now);
  pop.stop(now + 0.3);
}

export function playGiftOpenChime(muted = false) {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [587.33, 739.99, 880.0, 1174.66, 1479.98];
  notes.forEach((f, idx) => {
    playBellTone(ctx, f, idx * 0.075, 0.68, 0.062);
  });
}

export function playBalloonPop(muted = false) {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(420, now);
  osc.frequency.exponentialRampToValueAtTime(980, now + 0.055);
  gain.gain.setValueAtTime(0.09, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.11);

  playBellTone(ctx, 1318.51, 0.03, 0.32, 0.04);
}

// Gentle Happy Birthday music-box celesta loop (only active when unmuted)
const MUSIC_BOX_MELODY: Array<[number, number]> = [
  [392.0, 340], // G4
  [392.0, 220], // G4
  [440.0, 520], // A4
  [392.0, 520], // G4
  [523.25, 520], // C5
  [493.88, 920], // B4
  [392.0, 340], // G4
  [392.0, 220], // G4
  [440.0, 520], // A4
  [392.0, 520], // G4
  [587.33, 520], // D5
  [523.25, 920], // C5
  [392.0, 340], // G4
  [392.0, 220], // G4
  [783.99, 520], // G5
  [659.25, 520], // E5
  [523.25, 520], // C5
  [493.88, 520], // B4
  [440.0, 780], // A4
  [698.46, 340], // F5
  [698.46, 220], // F5
  [659.25, 520], // E5
  [523.25, 520], // C5
  [587.33, 520], // D5
  [523.25, 1180], // C5
];

export function startBirthdayMusicBox(shouldPlay: () => boolean): () => void {
  let stopped = false;
  let idx = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const step = () => {
    if (stopped) return;
    const [freq, waitMs] = MUSIC_BOX_MELODY[idx % MUSIC_BOX_MELODY.length];
    if (shouldPlay()) {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "running") {
        playBellTone(ctx, freq, 0, 0.72, 0.026, "sine");
        // Subtle warm octave bass on bar downbeats
        if (idx % 6 === 0) {
          playBellTone(ctx, freq * 0.5, 0.01, 0.9, 0.015, "sine");
        }
      }
    }
    idx += 1;
    timer = setTimeout(step, waitMs);
  };

  timer = setTimeout(step, 420);

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

