// Procedural Web Audio Synthesizer for Vintage Wax Seal & Royal Parchment
// Pure acoustic synthesis: zero external MP3 dependencies, crisp brass/chime/parchment acoustics.

let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function unlockVintageAudio() {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

export function playWaxCrack(muted = false) {
  if (muted) return;
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(160, now);
  osc1.frequency.exponentialRampToValueAtTime(42, now + 0.14);
  gain1.gain.setValueAtTime(0.45, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.19);

  const bufferSize = Math.floor(ctx.sampleRate * 0.18);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.exp(-i / (ctx.sampleRate * 0.032));
    data[i] = (Math.random() * 2 - 1) * env * 0.6;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2200, now);
  filter.Q.setValueAtTime(2.6, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.4, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);

  // Subtle brass detent chime
  const ping = ctx.createOscillator();
  const pingGain = ctx.createGain();
  ping.type = "sine";
  ping.frequency.setValueAtTime(1174.66, now + 0.04); // D6
  pingGain.gain.setValueAtTime(0.001, now + 0.04);
  pingGain.gain.linearRampToValueAtTime(0.11, now + 0.06);
  pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
  ping.connect(pingGain);
  pingGain.connect(ctx.destination);
  ping.start(now + 0.04);
  ping.stop(now + 0.88);
}

/**
 * Rich, unhurried orchestral celesta swell + chamber reverb shimmer on breaking the royal seal.
 */
export function playGrandUnsealSwell() {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const chord = [293.66, 369.99, 440.0, 587.33, 739.99, 880.0]; // D major 9th luminous bloom
  const now = ctx.currentTime;

  chord.forEach((freq, idx) => {
    const delay = idx * 0.12;
    const osc = ctx.createOscillator();
    const shimmer = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + delay);

    shimmer.type = "triangle";
    shimmer.frequency.setValueAtTime(freq * 2, now + delay);

    const shimGain = ctx.createGain();
    shimGain.gain.setValueAtTime(0.012, now + delay);

    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.linearRampToValueAtTime(0.075 - idx * 0.008, now + delay + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + delay + 3.2);

    osc.connect(gain);
    shimmer.connect(shimGain);
    shimGain.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    shimmer.start(now + delay);
    osc.stop(now + delay + 3.3);
    shimmer.stop(now + delay + 3.3);
  });
}

export function playPaperRustle() {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.65;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const progress = i / bufferSize;
    const env = Math.sin(progress * Math.PI) * 0.35;
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(1400, now);

  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.setValueAtTime(3800, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  noise.connect(filter);
  filter.connect(lpf);
  lpf.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
}

/**
 * Tactile brass cryptex key click + tuned music-box crystal note for PIN entry.
 */
export function playPinKeyChime(stepIndex: number) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [587.33, 659.25, 739.99, 880.0]; // D5, E5, F#5, A5
  const freq = notes[stepIndex % notes.length];

  // Brass mechanical click
  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.type = "triangle";
  click.frequency.setValueAtTime(240, now);
  click.frequency.exponentialRampToValueAtTime(80, now + 0.04);
  clickGain.gain.setValueAtTime(0.16, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  click.connect(clickGain);
  clickGain.connect(ctx.destination);
  click.start(now);
  click.stop(now + 0.06);

  // Crystal chime overtone
  const chime = ctx.createOscillator();
  const chimeGain = ctx.createGain();
  chime.type = "sine";
  chime.frequency.setValueAtTime(freq, now);
  chimeGain.gain.setValueAtTime(0.001, now);
  chimeGain.gain.linearRampToValueAtTime(0.095, now + 0.015);
  chimeGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.85);
  chime.connect(chimeGain);
  chimeGain.connect(ctx.destination);
  chime.start(now);
  chime.stop(now + 0.88);
}

/**
 * Ceremonial golden harp & brass vault unlatch sound when the 4-digit secret PIN succeeds.
 */
export function playVaultUnlockChime() {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [587.33, 739.99, 880.0, 1174.66, 1479.98]; // D5 -> F#5 -> A5 -> D6 -> F#6
  notes.forEach((freq, i) => {
    const t = now + i * 0.11;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0005, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0006, t + 2.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 2.15);
  });
}

/**
 * Muted wooden tumbler lock reject sound for wrong PIN.
 */
export function playVaultRejectChime() {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  [0, 0.14].forEach((offset, idx) => {
    const t = now + offset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(idx === 0 ? 155 : 122, t);
    osc.frequency.exponentialRampToValueAtTime(68, t + 0.12);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  });
}

export function playMusicBoxChime(freq: number = 880, duration: number = 1.4, volume = 0.09) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const gain = ctx.createGain();
  const overtoneGain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);

  overtone.type = "sine";
  overtone.frequency.setValueAtTime(freq * 2.0, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

  overtoneGain.gain.setValueAtTime(0.001, now);
  overtoneGain.gain.linearRampToValueAtTime(volume * 0.28, now + 0.01);
  overtoneGain.gain.exponentialRampToValueAtTime(0.0005, now + duration * 0.55);

  osc.connect(gain);
  overtone.connect(overtoneGain);
  overtoneGain.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  overtone.start(now);
  osc.stop(now + duration);
  overtone.stop(now + duration);
}

export function playRoyalArpeggio() {
  const notes = [587.33, 739.99, 880.0, 1174.66]; // D major 7th royal sparkle
  notes.forEach((n, idx) => {
    setTimeout(() => playMusicBoxChime(n, 1.35, 0.07), idx * 140);
  });
}

/**
 * Plays a tranquil royal music box waltz automatically once unsealed.
 * Returns a stop() cleanup callback.
 */
export function startRoyalMusicBoxLoop(): () => void {
  if (typeof window === "undefined") return () => {};

  const melody: Array<[number, number | null]> = [
    [587.33, 293.66], // D5 + D4
    [739.99, null],   // F#5
    [880.0, 440.0],   // A5 + A4
    [1174.66, null],  // D6
    [1108.73, 369.99],// C#6 + F#4
    [987.77, null],   // B5
    [880.0, 392.0],   // A5 + G4
    [739.99, null],   // F#5
    [659.25, 329.63], // E5 + E4
    [739.99, null],   // F#5
    [880.0, 220.0],   // A5 + A3
    [587.33, 293.66], // D5 + D4
  ];

  let step = 0;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    const [lead, bass] = melody[step % melody.length];
    playMusicBoxChime(lead, 1.8, 0.068);
    if (bass) {
      playMusicBoxChime(bass, 2.2, 0.042);
    }
    step += 1;
  };

  tick();
  const intervalId = window.setInterval(tick, 740);

  return () => {
    stopped = true;
    window.clearInterval(intervalId);
  };
}
