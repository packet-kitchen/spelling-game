// Text-to-speech. Uses the voice chosen in the grown-ups settings:
//   'eleven'  ElevenLabs "Alice" (voice/eleven.js): recorded clips + new words with a key
//   'piper'   the offline natural voice "Cori" (voice/neural.js)
//   'browser' the Chromebook's built-in voices
// Whatever the chosen voice can't say falls back to the Chromebook voice.

import { state } from './state.js';
import * as neural from './voice/neural.js';
import * as eleven from './voice/eleven.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voices = [];
const keepAlive = new Set(); // Chrome can garbage-collect utterances mid-speech
let token = 0;

function loadVoices() {
  if (!synth) return;
  voices = synth.getVoices() || [];
}
if (synth) {
  loadVoices();
  if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', loadVoices);
  else synth.onvoiceschanged = loadVoices;
}

export function speechAvailable() {
  return !!synth;
}

export function englishVoices() {
  loadVoices();
  const en = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  const score = (v) => (/en[-_]GB/i.test(v.lang) ? 0 : 1) * 10 + (/google/i.test(v.name) ? 0 : 1);
  return en.sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));
}

export function chosenVoice() {
  loadVoices();
  const want = state.settings.voiceURI;
  if (want) {
    const v = voices.find((x) => x.voiceURI === want);
    if (v) return v;
  }
  const gb = voices.filter((v) => /en[-_]GB/i.test(v.lang));
  return (
    gb.find((v) => /google uk english female/i.test(v.name)) ||
    gb.find((v) => /google/i.test(v.name)) ||
    gb.find((v) => /female|libby|sonia|serena|kate|martha/i.test(v.name)) ||
    gb[0] ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    null
  );
}

// Speak one piece of text. Always resolves (even if speech fails or hangs).
export function speak(text, opts = {}) {
  const t = text && String(text).trim();
  if (t && eleven.wanted()) return eleven.play(t).then((ok) => (ok ? undefined : browserSpeak(t, opts)));
  if (t && neural.wanted()) return neural.play(t).then((ok) => (ok ? undefined : browserSpeak(t, opts)));
  return browserSpeak(text, opts);
}

// Get phrases ready ahead of time with whichever voice is chosen.
export function prepare(texts, priority = 'later') {
  if (eleven.wanted()) return eleven.prepare(texts);
  if (neural.wanted()) neural.prefetch(texts, priority);
  return Promise.resolve();
}

function browserSpeak(text, opts = {}) {
  return new Promise((resolve) => {
    if (!synth || !text) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const v = chosenVoice();
    if (v) u.voice = v;
    u.lang = v ? v.lang : 'en-GB';
    u.rate = opts.rate || state.settings.rate || 0.85;
    u.pitch = opts.pitch || 1.05;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      keepAlive.delete(u);
      resolve();
    };
    u.onend = done;
    u.onerror = done;
    // Safety net: some voices never fire "end".
    const timer = setTimeout(done, 2500 + (text.length * 95) / u.rate);
    keepAlive.add(u);
    try {
      if (synth.paused) synth.resume();
      synth.speak(u);
    } catch {
      done();
    }
  });
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Speak several bits with small pauses. A newer call stops an older one.
export async function say(...parts) {
  const my = ++token;
  stop(false);
  const list = parts.flat().filter((p) => typeof p === 'number' || (p && String(p).trim()));
  const strings = list.filter((p) => typeof p === 'string');
  if (eleven.wanted()) eleven.prepare(strings);
  else neural.prefetchNow(strings);
  await pause(40); // Chrome sometimes drops speech queued straight after cancel()
  for (const p of list) {
    if (my !== token) return false;
    if (typeof p === 'number') { await pause(p); continue; }
    await speak(p);
    if (my !== token) return false;
    await pause(eleven.wanted() ? 100 : neural.isReady() ? 120 : 220);
  }
  return my === token;
}

export function stop(bumpToken = true) {
  if (bumpToken) token++;
  neural.stop();
  eleven.stop();
  if (synth) {
    try { synth.cancel(); } catch { /* ignore */ }
  }
}

// "because ... I wore my coat because it was cold ... because"
export function sayWord(entry, { intro = '', withSentence = true } = {}) {
  const parts = [];
  if (intro) parts.push(intro);
  parts.push(entry.text);
  if (withSentence && entry.sentence) {
    parts.push(entry.sentence);
    parts.push(entry.text);
  }
  return say(parts);
}
