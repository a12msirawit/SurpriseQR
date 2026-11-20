/**
 * Songkran Splendor — Web Audio API Synthesizer for Full-Screen Water Cannons,
 * Balloon Pops, Tidal Wave Surf, Glass Wiping, Powder Puffs, Bamboo Shake & Long-Drum!
 */

let songkranCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!songkranCtx || songkranCtx.state === "closed") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      songkranCtx = new AudioContextClass();
    }
    if (songkranCtx.state === "suspended") {
      void songkranCtx.resume().catch(() => {});
    }
    return songkranCtx;
  } catch {
    return null;
  }
}

export function unlockSongkranAudio() {
  getCtx();
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) channel[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Playful water drop "bloop!" chime. */
export function playWaterDrop(pitchOffset = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const baseFreq = 420 + Math.random() * 140 + pitchOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.1, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch {
    // Ignore
  }
}

/** High-pressure water jet splash + foaming bubbles. */
export function playWaterSplash(power = 1) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const vol = Math.min(1.25, Math.max(0.5, power));

    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.38);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.setValueAtTime(1.0, now);
    bp.frequency.setValueAtTime(2200, now);
    bp.frequency.exponentialRampToValueAtTime(520, now + 0.34);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.24 * vol, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    src.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.38);

    [0.02, 0.07, 0.12].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const bg = ctx.createGain();
      const f = 500 + idx * 150 + Math.random() * 100;
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + delay);
      osc.frequency.exponentialRampToValueAtTime(f * 1.9, now + delay + 0.065);
      bg.gain.setValueAtTime(0.0001, now + delay);
      bg.gain.exponentialRampToValueAtTime(0.075 * vol, now + delay + 0.015);
      bg.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.1);
      osc.connect(bg);
      bg.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.11);
    });
  } catch {
    // Ignore
  }
}

/** Juicy rubber water balloon pop + heavy splash. */
export function playBalloonWaterPop() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(290, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.09);
    og.gain.setValueAtTime(0.32, now);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    osc.connect(og);
    og.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);

    playWaterSplash(1.15);
  } catch {
    // Ignore
  }
}

/** Giant rolling tidal wave wash + bright festive splash surf. */
export function playTidalWave() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx, 1.35);
    const lp = ctx.createBiquadFilter();
    lp.type = "bandpass";
    lp.Q.value = 0.85;
    lp.frequency.setValueAtTime(280, now);
    lp.frequency.exponentialRampToValueAtTime(1750, now + 0.45);
    lp.frequency.exponentialRampToValueAtTime(340, now + 1.25);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.28, now + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);

    noise.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 1.35);

    // Bright upbeat pentatonic chime arrival
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const cg = ctx.createGain();
      const t = now + 0.48 + i * 0.055;
      o.type = "sine";
      o.frequency.setValueAtTime(freq, t);
      cg.gain.setValueAtTime(0.0001, t);
      cg.gain.exponentialRampToValueAtTime(0.075, t + 0.02);
      cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
      o.connect(cg);
      cg.connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.7);
    });
  } catch {
    // Ignore
  }
}

/** Playful glass wipe sparkle sound when rubbing off screen mist. */
export function playGlassWipe() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1150, now);
    osc.frequency.exponentialRampToValueAtTime(1680, now + 0.08);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.045, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch {
    // Ignore
  }
}

/** Soft cooling powder puff sound ("ปุ้ง!") when stamping Songkran dinsor-phong. */
export function playPowderPuff() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.14);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1200, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    src.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.14);

    const pop = ctx.createOscillator();
    const pg = ctx.createGain();
    pop.type = "sine";
    pop.frequency.setValueAtTime(620, now);
    pop.frequency.exponentialRampToValueAtTime(920, now + 0.07);
    pg.gain.setValueAtTime(0.08, now);
    pg.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    pop.connect(pg);
    pg.connect(ctx.destination);
    pop.start(now);
    pop.stop(now + 0.12);
  } catch {
    // Ignore
  }
}

/** Bamboo fortune stick shake rattle + bright ranat reveal chime. */
export function playBambooShake() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [0, 0.07, 0.14, 0.21].forEach((delay) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320 + Math.random() * 160, now + delay);
      g.gain.setValueAtTime(0.12, now + delay);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.045);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.05);
    });

    [659.25, 880, 1046.5, 1318.51].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t = now + 0.26 + i * 0.05;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  } catch {
    // Ignore
  }
}

/** Energetic Thai festival long-drum ("กลองยาว") + water cannon combo! */
export function playDrumSplashCombo() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [0, 0.13].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(idx === 0 ? 155 : 195, now + delay);
      osc.frequency.exponentialRampToValueAtTime(62, now + delay + 0.14);
      g.gain.setValueAtTime(0.28, now + delay);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.16);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.18);
    });
    playWaterSplash(1.25);
  } catch {
    // Ignore
  }
}

const RANAT_NOTES: Array<[number, number]> = [
  [523.25, 0.45], [587.33, 0.45], [659.25, 0.45], [783.99, 0.45],
  [880.0, 0.9], [783.99, 0.45], [659.25, 0.45],
  [783.99, 0.45], [659.25, 0.45], [587.33, 0.45], [523.25, 0.45],
  [587.33, 0.9], [659.25, 0.9],
  [783.99, 0.45], [880.0, 0.45], [1046.5, 0.9],
  [880.0, 0.45], [783.99, 0.45], [659.25, 0.9],
  [523.25, 1.6],
];

export function startSongkranAmbience(): () => void {
  const ctx = getCtx();
  if (!ctx) return () => {};

  const beatSec = 0.38;
  const master = ctx.createGain();
  master.gain.value = 0.12;
  master.connect(ctx.destination);

  const nodes: OscillatorNode[] = [];
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = () => {
    if (stopped) return;
    let t = ctx.currentTime + 0.08;
    RANAT_NOTES.forEach(([freq, beats]) => {
      const dur = beats * beatSec;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.75, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.28, dur * 1.1));
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + Math.max(0.32, dur * 1.2));
      nodes.push(osc);
      t += dur;
    });

    const totalMs = RANAT_NOTES.reduce((acc, [, b]) => acc + b * beatSec, 0) * 1000 + 1600;
    timer = setTimeout(schedule, totalMs);
  };

  schedule();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    } catch {
      // Ignore
    }
    setTimeout(() => {
      nodes.forEach((n) => {
        try {
          n.stop();
        } catch {
          // Ignore
        }
      });
      try {
        master.disconnect();
      } catch {
        // Ignore
      }
    }, 280);
  };
}
