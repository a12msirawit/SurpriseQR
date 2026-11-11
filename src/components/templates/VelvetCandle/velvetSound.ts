/**
 * Velvet Candle & Cake — synthesized Web Audio effects.
 * Zero external audio files: every sound is generated on the fly.
 */

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedCtx || sharedCtx.state === "closed") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      sharedCtx = new AudioContextClass();
    }
    if (sharedCtx.state === "suspended") {
      void sharedCtx.resume();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Create/resume the shared AudioContext inside a user gesture. */
export function unlockAudio() {
  getCtx();
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Soft "fuu" exhale when the candles go out. */
export function playBlowOut() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.9);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(260, now + 0.8);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.32, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.9);
  } catch {
    /* ignore */
  }
}

/** Tiny puff when a single flame is snuffed by a tap. */
export function playSnuff() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.25);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.25);
  } catch {
    /* ignore */
  }
}

/** Balloon pop: sharp noise crack + low thump. */
export function playPop() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.12);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    src.connect(hp);
    hp.connect(g);
    g.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.12);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.35, now);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(og);
    og.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch {
    /* ignore */
  }
}

/** Knife slice whoosh. */
export function playSlice() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.45);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(600, now);
    bp.frequency.exponentialRampToValueAtTime(3200, now + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.22, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    src.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.45);
  } catch {
    /* ignore */
  }
}

/** Warm sparkle chime used for reveals. */
export function playChime() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [1046.5, 1318.5, 1568].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      const t = now + i * 0.07;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
  } catch {
    /* ignore */
  }
}

const NOTE: Record<string, number> = {
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
};

const BIRTHDAY_MELODY: Array<[string, number]> = [
  ["G4", 0.75], ["G4", 0.25], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2],
  ["G4", 0.75], ["G4", 0.25], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
  ["G4", 0.75], ["G4", 0.25], ["G5", 1], ["E5", 1], ["C5", 1], ["B4", 1], ["A4", 2],
  ["F5", 0.75], ["F5", 0.25], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 2.5],
];

/**
 * Music-box rendition of the birthday melody. Used when the creator did not
 * supply a song link. Returns a stop function.
 */
export function playBirthdayMelody(loop = true): () => void {
  const ctx = getCtx();
  if (!ctx) return () => {};
  const beat = 0.42;
  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);
  const nodes: OscillatorNode[] = [];
  let stopped = false;
  let loopTimer: ReturnType<typeof setTimeout> | null = null;

  const schedule = () => {
    if (stopped) return;
    let t = ctx.currentTime + 0.05;
    BIRTHDAY_MELODY.forEach(([note, beats]) => {
      const freq = NOTE[note];
      const dur = beats * beat;
      [1, 2].forEach((harmonic, h) => {
        const osc = ctx.createOscillator();
        osc.type = h === 0 ? "sine" : "triangle";
        osc.frequency.value = freq * harmonic;
        const g = ctx.createGain();
        const peak = h === 0 ? 0.9 : 0.18;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.35, dur * 1.4));
        osc.connect(g);
        g.connect(master);
        osc.start(t);
        osc.stop(t + Math.max(0.4, dur * 1.5));
        nodes.push(osc);
      });
      t += dur;
    });
    const total = BIRTHDAY_MELODY.reduce((acc, [, b]) => acc + b * beat, 0);
    if (loop) {
      loopTimer = setTimeout(schedule, (total + 1.6) * 1000);
    }
  };

  schedule();

  return () => {
    stopped = true;
    if (loopTimer) clearTimeout(loopTimer);
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      nodes.forEach((n) => {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
      });
      try {
        master.disconnect();
      } catch {
        /* ignore */
      }
    }, 350);
  };
}
