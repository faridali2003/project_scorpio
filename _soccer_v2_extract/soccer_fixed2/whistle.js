let ctx = null;

function getCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return ctx;
}

function tone(freq, duration, type = 'sine', gain = 0.08) {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ac.destination);
  const t = ac.currentTime;
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration);
}

export function whistleKickoff() {
  tone(880, 0.12);
  setTimeout(() => tone(1100, 0.18), 100);
}

export function whistleGoal() {
  tone(660, 0.15);
  setTimeout(() => tone(880, 0.15), 120);
  setTimeout(() => tone(1100, 0.25), 240);
}

export function whistleFoul() {
  tone(520, 0.35, 'square', 0.06);
}

export function whistleHalf() {
  tone(740, 0.2);
  setTimeout(() => tone(740, 0.2), 220);
}
