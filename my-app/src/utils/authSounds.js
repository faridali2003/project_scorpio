/** Lightweight login success chime — Web Audio, no external files. */
let sharedCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx) sharedCtx = new Ctx();
  return sharedCtx;
}

export function playLoginSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const melody = [
      { freq: 523.25, at: 0, dur: 0.12, gain: 0.12 },
      { freq: 659.25, at: 0.08, dur: 0.12, gain: 0.13 },
      { freq: 783.99, at: 0.16, dur: 0.14, gain: 0.14 },
      { freq: 1046.5, at: 0.26, dur: 0.28, gain: 0.16 },
      { freq: 1318.5, at: 0.38, dur: 0.22, gain: 0.1 },
    ];

    melody.forEach(({ freq, at, dur, gain: peak }) => {
      const start = ctx.currentTime + at;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    });
  } catch {
    /* audio blocked or unsupported — silent fail */
  }
}
