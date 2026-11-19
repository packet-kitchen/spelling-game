// Little sound effects made with the Web Audio API (no sound files needed).
import { state } from './state.js';

let ctx = null;

export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq, start, dur, { type = 'sine', vol = 0.12, slideTo = 0 } = {}) {
  if (!ctx || !state.settings.sounds) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  tap() { tone(660, 0, 0.08, { type: 'triangle', vol: 0.06 }); },
  key() { tone(520 + Math.random() * 120, 0, 0.07, { type: 'triangle', vol: 0.05 }); },
  pop() { tone(300, 0, 0.12, { slideTo: 900, vol: 0.08 }); },
  good() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.25, { vol: 0.09 }));
    [1568, 2093].forEach((f, i) => tone(f, 0.34 + i * 0.06, 0.2, { vol: 0.04 }));
  },
  sparkle() {
    for (let i = 0; i < 6; i++) tone(1200 + Math.random() * 1400, i * 0.05, 0.12, { vol: 0.035 });
  },
  oops() {
    tone(440, 0, 0.18, { type: 'triangle', vol: 0.07 });
    tone(370, 0.16, 0.25, { type: 'triangle', vol: 0.07 });
  },
  wobble() { tone(220, 0, 0.15, { type: 'triangle', vol: 0.06, slideTo: 180 }); },
  fanfare() {
    const notes = [523, 523, 659, 784, 659, 784, 1047];
    const times = [0, 0.12, 0.24, 0.36, 0.56, 0.68, 0.84];
    notes.forEach((f, i) => tone(f, times[i], i === notes.length - 1 ? 0.6 : 0.16, { type: 'triangle', vol: 0.09 }));
    for (let i = 0; i < 8; i++) tone(1500 + Math.random() * 1500, 0.9 + i * 0.05, 0.15, { vol: 0.03 });
  },
};
