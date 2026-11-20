"use client";

let sharedCtx: AudioContext | null = null;
let noiseCache: AudioBuffer | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx) sharedCtx = new Ctx();
  if (sharedCtx.state === "suspended") {
    void sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseCache && noiseCache.sampleRate === ctx.sampleRate) {
    return noiseCache;
  }
  const len = Math.floor(ctx.sampleRate * 1.4);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseCache = buf;
  return buf;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  offset: number,
  dur: number,
  gainPeak = 0.06,
  type: OscillatorType = "triangle",
  slideToFreq?: number
) {
  const start = ctx.currentTime + offset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideToFreq) {
    osc.frequency.exponentialRampToValueAtTime(slideToFreq, start + dur);
  }
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

export function unlockHalloweenAudio() {
  getCtx();
}

export function playDoorCreakBoom(muted = false) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;

  // Heavy iron knocker thud
  playTone(ctx, 130, 0, 0.42, 0.14, "sine", 42);
  playTone(ctx, 195, 0.14, 0.36, 0.11, "sine", 48);

  // Creaky gate groan
  playTone(ctx, 290, 0.28, 0.55, 0.045, "sawtooth", 195);
  playTone(ctx, 435, 0.32, 0.48, 0.025, "triangle", 310);
}

export function playSpiderBoing(muted = false) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;

  playTone(ctx, 240, 0, 0.24, 0.09, "sine", 620);
  playTone(ctx, 740, 0.08, 0.22, 0.055, "triangle", 510);
  playTone(ctx, 987.77, 0.15, 0.18, 0.04, "sine");
}

export function playGhostBoo(muted = false) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const mainGain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(620, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
  osc.frequency.exponentialRampToValueAtTime(340, now + 0.65);

  lfo.type = "sine";
  lfo.frequency.setValueAtTime(7.5, now);
  lfoGain.gain.setValueAtTime(24, now);

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  mainGain.gain.setValueAtTime(0.0001, now);
  mainGain.gain.exponentialRampToValueAtTime(0.085, now + 0.06);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);

  osc.connect(mainGain);
  mainGain.connect(ctx.destination);

  osc.start(now);
  lfo.start(now);
  osc.stop(now + 0.72);
  lfo.stop(now + 0.72);
}

export function playCauldronBubble(muted = false) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;

  const bloops = [
    [280, 480, 0],
    [340, 620, 0.09],
    [410, 790, 0.19],
    [520, 960, 0.28],
  ];
  bloops.forEach(([from, to, delay]) => {
    playTone(ctx, from, delay, 0.14, 0.075, "sine", to);
  });
}

export function playGravityFlip(muted = false) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;

  playTone(ctx, 220, 0, 0.36, 0.07, "triangle", 880);
  playTone(ctx, 660, 0.1, 0.32, 0.055, "sine", 1320);
}

export function playPlanchetteGliss(muted = false) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;

  // Mystical harmonic minor crystal sweep
  const notes = [440, 523.25, 659.25, 830.61, 1046.5];
  notes.forEach((f, idx) => {
    playTone(ctx, f, idx * 0.07, 0.65, 0.048, "sine");
  });
}

export function playCandyCollect(muted = false) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;

  playTone(ctx, 783.99, 0, 0.18, 0.06, "triangle");
  playTone(ctx, 1046.5, 0.06, 0.24, 0.065, "sine");
}

let lastMistAudioAt = 0;

/** Soft shimmering breeze whoosh synced with mist-brushing strokes. */
export function playMistWhoosh(muted = false, grandClear = false) {
  if (muted) return;
  const nowMs = performance.now();
  if (!grandClear && nowMs - lastMistAudioAt < 260) return;
  lastMistAudioAt = nowMs;

  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.setValueAtTime(grandClear ? 1.8 : 2.6, now);
  filter.frequency.setValueAtTime(340, now);
  filter.frequency.exponentialRampToValueAtTime(
    grandClear ? 1650 : 1050,
    now + (grandClear ? 0.55 : 0.24)
  );

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(grandClear ? 0.075 : 0.032, now + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, now + (grandClear ? 0.62 : 0.28));

  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(now);
  src.stop(now + (grandClear ? 0.66 : 0.3));

  if (grandClear) {
    playTone(ctx, 659.25, 0.06, 0.32, 0.045, "sine");
    playTone(ctx, 880, 0.14, 0.36, 0.05, "sine");
    playTone(ctx, 1174.66, 0.22, 0.45, 0.042, "triangle");
  }
}

/** Mystery lock solved crystalline chime. */
export function playPuzzleSolveChime(muted = false) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;

  const arp = [523.25, 659.25, 783.99, 1046.5];
  arp.forEach((f, idx) => {
    playTone(ctx, f, idx * 0.07, 0.38, 0.055, "triangle");
  });
}

/** Envelope wax seal pop + chaotic bat-wing flutter burst across the screen. */
export function playBatSwarmFlutter(muted = false) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;

  // Paper envelope rip + mystic sparkle reveal
  playTone(ctx, 392.0, 0, 0.25, 0.05, "sine", 587.33);
  playTone(ctx, 587.33, 0.08, 0.35, 0.05, "triangle", 880);
  playTone(ctx, 987.77, 0.16, 0.55, 0.04, "sine");

  // Rapid layered flapping wing noise pulses
  const wingFlapOffsets = [0.02, 0.09, 0.15, 0.22, 0.3, 0.39, 0.49, 0.6];
  wingFlapOffsets.forEach((delay, idx) => {
    const start = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.setValueAtTime(1.6, start);
    bp.frequency.setValueAtTime(420 + (idx % 3) * 210, start);
    bp.frequency.exponentialRampToValueAtTime(1400, start + 0.11);

    const g = ctx.createGain();
    const peak = Math.max(0.018, 0.09 - idx * 0.008);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);

    src.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    src.start(start);
    src.stop(start + 0.15);
  });
}

export function playTrickOrTreatShower(muted = false) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;

  const melody: Array<[number, number, number]> = [
    [440, 0, 0.22],
    [523.25, 0.08, 0.22],
    [659.25, 0.16, 0.26],
    [830.61, 0.25, 0.3],
    [880, 0.36, 0.55],
    [1318.51, 0.48, 0.72],
  ];
  melody.forEach(([freq, delay, dur]) => {
    playTone(ctx, freq, delay, dur, 0.072, "triangle");
  });

  // Confetti pop noise burst
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "highpass";
  bp.frequency.setValueAtTime(1600, now);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.08, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  src.connect(bp);
  bp.connect(g);
  g.connect(ctx.destination);
  src.start(now);
  src.stop(now + 0.25);
}

// Quirky spooky harpsichord waltz arpeggio loop (harmonic minor feel)
const SPOOKY_WALTZ: Array<[number, number]> = [
  [293.66, 360], // D4
  [440.0, 260],  // A4
  [554.37, 260], // C#5
  [587.33, 360], // D5
  [523.25, 260], // C5
  [440.0, 260],  // A4
  [349.23, 360], // F4
  [440.0, 260],  // A4
  [523.25, 260], // C5
  [493.88, 360], // B4
  [440.0, 260],  // A4
  [329.63, 420], // E4
];

export function startSpookyOrganLoop(shouldPlay: () => boolean): () => void {
  let stopped = false;
  let stepIdx = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const tick = () => {
    if (stopped) return;
    const [freq, waitMs] = SPOOKY_WALTZ[stepIdx % SPOOKY_WALTZ.length];
    if (shouldPlay()) {
      const ctx = getCtx();
      if (ctx && ctx.state === "running") {
        playTone(ctx, freq, 0, 0.48, 0.022, "triangle");
        if (stepIdx % 3 === 0) {
          playTone(ctx, freq * 0.5, 0, 0.65, 0.018, "sine");
        }
      }
    }
    stepIdx += 1;
    timer = setTimeout(tick, waitMs);
  };

  timer = setTimeout(tick, 460);
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

