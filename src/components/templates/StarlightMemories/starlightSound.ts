// Web Audio API Shutter Sound (Zero external mp3 dependencies)
export function playCameraShutter() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // White noise burst for mechanical shutter click
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2400;
    filter.Q.value = 3;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();

    // Second click (mirror slap down)
    setTimeout(() => {
      try {
        const slapBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const slapData = slapBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          slapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.025));
        }
        const slap = ctx.createBufferSource();
        slap.buffer = slapBuffer;
        const slapGain = ctx.createGain();
        slapGain.gain.setValueAtTime(0.5, ctx.currentTime);
        slapGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);
        slap.connect(slapGain);
        slapGain.connect(ctx.destination);
        slap.start();
      } catch {
        // ignore
      }
    }, 90);
  } catch {
    // Audio context not allowed or failed
  }
}

