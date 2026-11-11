// Procedural Web Audio API sound generator for Midnight Cinema 35mm
// 100% client-side, zero external audio asset dependency.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Authentic tactile paper tear sound:
 * Granular noise burst with sweeping bandpass filter simulating paper fiber friction.
 */
export function playPaperTear() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 0.28;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    // Generate modulated pinkish noise with erratic fiber pops
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      const pink = b0 + b1 + b2 + white * 0.5362;
      
      // Amplitude envelope: ramp up quickly, maintain rough texture, ramp down
      const progress = i / bufferSize;
      const microJitter = 0.8 + 0.4 * Math.sin(progress * 80);
      const envelope = Math.sin(progress * Math.PI) * microJitter;
      output[i] = pink * envelope * 0.6;
    }

    const whiteNoiseSource = ctx.createBufferSource();
    whiteNoiseSource.buffer = buffer;

    // Filter sweeping through crisp paper tear frequencies
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + duration);
    filter.Q.setValueAtTime(2.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    whiteNoiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoiseSource.start(now);
    whiteNoiseSource.stop(now + duration);
  } catch (err) {
    console.warn("Paper tear audio failed:", err);
  }
}

/**
 * 35mm mechanical film sprocket advance click:
 * Fast metallic transient click + low body punch.
 */
export function playFilmClick() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Sharp mechanical click
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.025);

    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);

    // 2. Low mechanical sprocket body thump
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.04);

    subGain.gain.setValueAtTime(0.25, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.04);
  } catch (err) {
    console.warn("Film click audio failed:", err);
  }
}

let projectorOsc: OscillatorNode | null = null;
let projectorGain: GainNode | null = null;

/**
 * Start subtle 24fps 35mm vintage projector motor hum.
 */
export function startProjectorHum() {
  try {
    const ctx = getAudioContext();
    if (!ctx || projectorOsc) return;
    const now = ctx.currentTime;

    projectorOsc = ctx.createOscillator();
    projectorGain = ctx.createGain();

    // 24 Hz motor flutter with low harmonics
    projectorOsc.type = "sawtooth";
    projectorOsc.frequency.setValueAtTime(24, now);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(140, now);

    projectorGain.gain.setValueAtTime(0.001, now);
    projectorGain.gain.exponentialRampToValueAtTime(0.04, now + 0.5);

    projectorOsc.connect(filter);
    filter.connect(projectorGain);
    projectorGain.connect(ctx.destination);

    projectorOsc.start(now);
  } catch (err) {
    console.warn("Projector hum failed:", err);
  }
}

/**
 * Stop subtle 35mm projector motor hum.
 */
export function stopProjectorHum() {
  try {
    if (projectorOsc && projectorGain) {
      const ctx = getAudioContext();
      if (ctx) {
        const now = ctx.currentTime;
        projectorGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        projectorOsc.stop(now + 0.3);
      }
      projectorOsc = null;
      projectorGain = null;
    }
  } catch (err) {
    console.warn("Stop projector hum failed:", err);
  }
}

