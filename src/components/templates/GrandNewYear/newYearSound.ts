/**
 * Grand New Year Celebration — Synthesized Web Audio SFX & Celestial Chime Engine.
 * Zero external sound files required; gracefully handles browser autoplay restrictions.
 */

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedCtx || sharedCtx.state === "closed") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      sharedCtx = new AudioContextClass();
    }
    if (sharedCtx.state === "suspended") {
      void sharedCtx.resume().catch(() => {});
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Resume/initialize AudioContext inside a user interaction. */
export function unlockNewYearAudio() {
  getCtx();
}

function createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    channel[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** Delicate crystal spark chime when interacting with sparklers or stars. */
export function playSparkTick() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const pentatonic = [1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];
    const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.075, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  } catch {
    // Ignore restricted audio state
  }
}

/** Accelerating golden ignition shimmer + subtle crackle before warp. */
export function playIgnitionSwirl() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.52);
    });
  } catch {
    // Ignore
  }
}

/** Slow celestial hyperspace warp whoosh + deep sub swell + harmonic shimmer. */
export function playWarpWhoosh() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;

    // 1. Ethereal cosmic noise sweep
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 1.35);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.setValueAtTime(2.6, now);
    bp.frequency.setValueAtTime(220, now);
    bp.frequency.exponentialRampToValueAtTime(1450, now + 0.55);
    bp.frequency.exponentialRampToValueAtTime(320, now + 1.25);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.0001, now);
    nGain.gain.exponentialRampToValueAtTime(0.24, now + 0.45);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);

    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 1.35);

    // 2. Warm sub-bass glide
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(48, now);
    sub.frequency.exponentialRampToValueAtTime(98, now + 0.55);
    sub.frequency.exponentialRampToValueAtTime(55, now + 1.2);
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.exponentialRampToValueAtTime(0.18, now + 0.42);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 1.28);

    // 3. Celestial arrival chord shimmer around mid-warp
    [587.33, 880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + 0.48 + i * 0.06;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.065, start + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.95);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 1.0);
    });
  } catch {
    // Ignore
  }
}

/** Delicate ascending rocket launch whistle. */
export function playFireworkLaunch() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(1650, now + 0.36);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch {
    // Ignore
  }
}

/** Deep booming firework burst + cascading golden crackle sparkles. */
export function playFireworkBoom(intensity = 1) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const vol = Math.min(1.2, Math.max(0.5, intensity));

    // Sub boom thump
    const boomOsc = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boomOsc.type = "sine";
    boomOsc.frequency.setValueAtTime(135, now);
    boomOsc.frequency.exponentialRampToValueAtTime(36, now + 0.38);
    boomGain.gain.setValueAtTime(0.32 * vol, now);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    boomOsc.connect(boomGain);
    boomGain.connect(ctx.destination);
    boomOsc.start(now);
    boomOsc.stop(now + 0.45);

    // Filtered atmospheric blast tail
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.8);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(2200, now);
    lp.frequency.exponentialRampToValueAtTime(240, now + 0.72);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.28 * vol, now);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

    noise.connect(lp);
    lp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.8);

    // Staggered golden crackle sparks
    for (let i = 0; i < 4; i++) {
      const delay = 0.08 + i * 0.09 + Math.random() * 0.05;
      const crk = ctx.createBufferSource();
      crk.buffer = createNoiseBuffer(ctx, 0.06);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.setValueAtTime(3200 + i * 500, now + delay);
      const cGain = ctx.createGain();
      cGain.gain.setValueAtTime(0.08 * vol, now + delay);
      cGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.05);
      crk.connect(hp);
      hp.connect(cGain);
      cGain.connect(ctx.destination);
      crk.start(now + delay);
      crk.stop(now + delay + 0.06);
    }
  } catch {
    // Ignore
  }
}

/** Royal wax seal opening chime + warm harp chord. */
export function playEnvelopeOpen() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [392, 493.88, 587.33, 783.99, 987.77].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.065;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.11, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  } catch {
    // Ignore
  }
}

/** Mystical oracle card draw celesta arpeggio. */
export function playFortuneChime() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 987.77, 1318.51].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.055;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.72);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.75);
    });
  } catch {
    // Ignore
  }
}

/** Crisp paper perforation tick while dragging to tear the railway ticket stub. */
export function playTicketTearTick(progress = 0.5) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.045);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(1600 + progress * 1400, now);
    bp.Q.setValueAtTime(1.8, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);
    noise.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.045);
  } catch {
    // Ignore
  }
}

/** Satisfying brass ticket-conductor stamp thump + metallic ring. */
export function playTicketStamp() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(185, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.14);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);

    // Subtle crisp chime overtone
    const chime = ctx.createOscillator();
    const cGain = ctx.createGain();
    chime.type = "sine";
    chime.frequency.setValueAtTime(1174.66, now + 0.02);
    cGain.gain.setValueAtTime(0.001, now + 0.02);
    cGain.gain.exponentialRampToValueAtTime(0.08, now + 0.04);
    cGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    chime.connect(cGain);
    cGain.connect(ctx.destination);
    chime.start(now + 0.02);
    chime.stop(now + 0.45);
  } catch {
    // Ignore
  }
}

/** Warm nostalgic Midnight Express dual-tone whistle + steam whoosh. */
export function playTrainWhistle() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Soft two-note express chime-whistle (E5 + B5)
    const freqs = [587.33, 739.99, 880];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1500, now);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f * 0.985, now);
      osc.frequency.linearRampToValueAtTime(f, now + 0.12);
      osc.frequency.setValueAtTime(f, now + 0.52);
      osc.frequency.linearRampToValueAtTime(f * 0.97, now + 0.92);

      const vol = idx === 0 ? 0.085 : idx === 1 ? 0.065 : 0.045;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol, now + 0.11);
      gain.gain.setValueAtTime(vol * 0.85, now + 0.55);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.98);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.02);
    });

    // Gentle steam hiss release
    const steam = ctx.createBufferSource();
    steam.buffer = createNoiseBuffer(ctx, 0.85);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(950, now);
    bp.frequency.exponentialRampToValueAtTime(420, now + 0.8);
    bp.Q.setValueAtTime(1.1, now);
    const sGain = ctx.createGain();
    sGain.gain.setValueAtTime(0.001, now);
    sGain.gain.exponentialRampToValueAtTime(0.09, now + 0.12);
    sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.82);
    steam.connect(bp);
    bp.connect(sGain);
    sGain.connect(ctx.destination);
    steam.start(now);
    steam.stop(now + 0.85);
  } catch {
    // Ignore
  }
}

/** Playful rising rattle + sparkle when shaking the wrapped New Year gift box. */
export function playGiftShake(step = 1) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const base = 440 + step * 95;
    [base, base * 1.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.055;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + 0.09);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.11, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  } catch {
    // Ignore
  }
}

/** Joyful lid pop + magical shimmering fanfare when the gift box opens. */
export function playGiftPop() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Cork-like warm pop
    const pop = ctx.createOscillator();
    const pGain = ctx.createGain();
    pop.type = "sine";
    pop.frequency.setValueAtTime(180, now);
    pop.frequency.exponentialRampToValueAtTime(620, now + 0.065);
    pGain.gain.setValueAtTime(0.24, now);
    pGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    pop.connect(pGain);
    pGain.connect(ctx.destination);
    pop.start(now);
    pop.stop(now + 0.12);

    // Ascending magical celebration chord
    [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + 0.04 + idx * 0.05;
      osc.type = idx % 2 === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.095, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  } catch {
    // Ignore
  }
}

/** Soft polaroid paper flip swoosh. */
export function playCardFlip() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.14);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(900, now);
    bp.frequency.exponentialRampToValueAtTime(2200, now + 0.12);
    bp.Q.setValueAtTime(1.5, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    noise.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.14);
  } catch {
    // Ignore
  }
}

/** Rhythmic steam-train rail chug acceleration during Departure cutscene. */
export function playTrainChug() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const beats = [0, 0.24, 0.45, 0.63, 0.79, 0.93, 1.06, 1.18];
    beats.forEach((offset, idx) => {
      const t = now + offset;
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.09);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(520 + idx * 55, t);
      bp.Q.setValueAtTime(1.4, t);
      const gain = ctx.createGain();
      const peak = idx % 2 === 0 ? 0.11 : 0.065;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
      noise.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + 0.09);
    });
  } catch {
    // Ignore
  }
}

/** Brass cabin sliding doors opening with warm chime during Cabin Door cutscene. */
export function playDoorSlide() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Soft mechanical wooden slide swoosh
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.75);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(650, now);
    lp.frequency.exponentialRampToValueAtTime(280, now + 0.7);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.001, now);
    nGain.gain.exponentialRampToValueAtTime(0.09, now + 0.12);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
    noise.connect(lp);
    lp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.75);

    // Warm golden reveal chime
    [523.25, 659.25, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + 0.16 + i * 0.07;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.075, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.68);
    });
  } catch {
    // Ignore
  }
}

/** Resonant countdown clock tick (3... 2... 1...) before midnight breakthrough. */
export function playClockTick(step = 3) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const freq = step === 3 ? 523.25 : step === 2 ? 659.25 : 783.99;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);

    // Subtle sub heartbeat thump
    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(110, now);
    sub.frequency.exponentialRampToValueAtTime(46, now + 0.16);
    sGain.gain.setValueAtTime(0.18, now);
    sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    sub.connect(sGain);
    sGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.2);
  } catch {
    // Ignore
  }
}

/** Crisp burning-fuse sizzle & micro-crackles as the spark races between fireworks. */
export function playFuseSizzle(durationSec = 0.65) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, durationSec);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(3400, now);
    bp.frequency.linearRampToValueAtTime(4800, now + durationSec * 0.6);
    bp.frequency.linearRampToValueAtTime(2800, now + durationSec);
    bp.Q.setValueAtTime(1.6, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.04);
    gain.gain.setValueAtTime(0.09, now + durationSec * 0.72);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    noise.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + durationSec + 0.02);
  } catch {
    // Ignore
  }
}

/** Slow, suspenseful shimmering harmonic swell when revealing the mystery floating photo. */
export function playMysteryRevealSwirl() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Soft low atmospheric drone swell
    const pad = ctx.createOscillator();
    const padGain = ctx.createGain();
    pad.type = "sine";
    pad.frequency.setValueAtTime(220, now);
    pad.frequency.exponentialRampToValueAtTime(329.63, now + 2.2);
    padGain.gain.setValueAtTime(0.0001, now);
    padGain.gain.exponentialRampToValueAtTime(0.09, now + 1.3);
    padGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
    pad.connect(padGain);
    padGain.connect(ctx.destination);
    pad.start(now);
    pad.stop(now + 2.9);

    // Slow crystalline arpeggio culminating at the reveal midpoint (~1.6s)
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + 0.35 + idx * 0.24;
      osc.type = idx % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.075, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.3);
    });
  } catch {
    // Ignore
  }
}

/** Grand Midnight 00:00 Celebration Bell & Chord Fanfare. */
export function playMidnightBell() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [261.63, 523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.03;
      osc.type = idx === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, t);
      const peak = idx === 0 ? 0.14 : 0.09;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.5);
    });
  } catch {
    // Ignore
  }
}

/** Warm ascending harmonic swell when sky lanterns drift upward. */
export function playLanternRelease() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [349.23, 440, 523.25, 659.25, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.09;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.08, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.45);
    });
  } catch {
    // Ignore
  }
}

const AMBIENT_NOTES: Array<[number, number]> = [
  [392.0, 1.0], [523.25, 1.5], [523.25, 0.5], [523.25, 1.0], [659.25, 1.0],
  [587.33, 1.5], [523.25, 0.5], [587.33, 1.0], [659.25, 1.0],
  [523.25, 1.5], [523.25, 0.5], [659.25, 1.0], [783.99, 1.0], [880.0, 2.5],
  [880.0, 1.0], [783.99, 1.5], [659.25, 0.5], [659.25, 1.0], [523.25, 1.0],
  [587.33, 1.5], [523.25, 0.5], [587.33, 1.0], [659.25, 1.0],
  [523.25, 1.5], [440.0, 0.5], [440.0, 1.0], [392.0, 1.0], [523.25, 2.8],
];

/**
 * Soft celestial celesta/music-box New Year melody when creator omits a custom BGM URL.
 * Returns a stop cleanup function.
 */
export function startNewYearAmbience(): () => void {
  const ctx = getCtx();
  if (!ctx) return () => {};

  const beatSec = 0.52;
  const master = ctx.createGain();
  master.gain.value = 0.14;
  master.connect(ctx.destination);

  const nodes: OscillatorNode[] = [];
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = () => {
    if (stopped) return;
    let t = ctx.currentTime + 0.08;
    AMBIENT_NOTES.forEach(([freq, beats]) => {
      const dur = beats * beatSec;
      [1, 2].forEach((mult, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq * mult, t);
        const peak = idx === 0 ? 0.85 : 0.15;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(peak, t + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.45, dur * 1.35));
        osc.connect(gain);
        gain.connect(master);
        osc.start(t);
        osc.stop(t + Math.max(0.5, dur * 1.45));
        nodes.push(osc);
      });
      t += dur;
    });

    const loopMs = AMBIENT_NOTES.reduce((acc, [, b]) => acc + b * beatSec, 0) * 1000 + 2200;
    timer = setTimeout(schedule, loopMs);
  };

  schedule();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
    } catch {
      // Ignore
    }
    setTimeout(() => {
      nodes.forEach((n) => {
        try {
          n.stop();
        } catch {
          // Already stopped
        }
      });
      try {
        master.disconnect();
      } catch {
        // Ignore
      }
    }, 320);
  };
}

