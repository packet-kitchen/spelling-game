// Natural "neural" voice (Piper) for the game.
//
// The voice model is downloaded once from Hugging Face (about 63 MB) and kept
// in this browser's Cache Storage. Speech is generated in a background worker,
// and every phrase is saved after it is made, so it plays instantly next time.

import { state } from '../state.js';
import { playSource, stopPlayback } from './player.js';
import { cleanText } from './phrases.js';

const HF = 'https://huggingface.co/rhasspy/piper-voices/resolve/42301ec547bc2939386cf0ae9f9050ca05b1d3af/';
const MODEL_CACHE = 'unicorn-voice-models-v1';
const CLIP_CACHE = 'unicorn-voice-clips-v1';

export const PIPER_VOICES = [
  { id: 'en_GB-cori-medium', name: 'Cori', about: 'English, calm and clear', path: 'en/en_GB/cori/medium/en_GB-cori-medium', mb: 63 },
  { id: 'en_GB-jenny_dioco-medium', name: 'Jenny', about: 'Southern English, bright', path: 'en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium', mb: 63 },
  { id: 'en_GB-alba-medium', name: 'Alba', about: 'Scottish', path: 'en/en_GB/alba/medium/en_GB-alba-medium', mb: 63 },
  { id: 'en_GB-southern_english_female-low', name: 'Southern', about: 'Southern English, simpler', path: 'en/en_GB/southern_english_female/low/en_GB-southern_english_female-low', mb: 63 },
];
export const DEFAULT_PIPER_VOICE = PIPER_VOICES[0].id;

export function voiceById(id) {
  return PIPER_VOICES.find((v) => v.id === id) || PIPER_VOICES[0];
}

function urlsFor(v) {
  return { modelUrl: HF + v.path + '.onnx', configUrl: HF + v.path + '.onnx.json' };
}

const supported = typeof Worker !== 'undefined' && typeof caches !== 'undefined' && typeof WebAssembly !== 'undefined';

// ---------------------------------------------------------------------------
// Status that the grown-ups page and home screen can show.
// status: 'off' | 'idle' | 'downloading' | 'starting' | 'ready' | 'error' | 'unsupported'
export const voiceStatus = { status: supported ? 'idle' : 'unsupported', voiceId: null, progress: 0, error: '' };
const listeners = new Set();
export function onVoiceStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function setStatus(patch) {
  Object.assign(voiceStatus, patch);
  listeners.forEach((fn) => { try { fn(voiceStatus); } catch { /* ignore */ } });
}

export function wanted() {
  return supported && state.settings.voiceEngine === 'piper';
}
export function isReady() {
  return wanted() && voiceStatus.status === 'ready' && voiceStatus.voiceId === state.settings.piperVoice;
}

// ---------------------------------------------------------------------------
// Worker plumbing

let worker = null;
let seq = 0;
const calls = new Map();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./piper-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (ev) => {
      const m = ev.data || {};
      const c = calls.get(m.id);
      if (!c) return;
      if (m.type === 'progress') { if (c.onProgress) c.onProgress(m); return; }
      calls.delete(m.id);
      if (m.type === 'error') c.reject(new Error(m.message));
      else c.resolve(m);
    };
    worker.onerror = (ev) => {
      const err = new Error(ev.message || 'The voice engine stopped');
      calls.forEach((c) => c.reject(err));
      calls.clear();
      worker = null;
      setStatus({ status: 'error', error: err.message });
    };
  }
  return worker;
}

function call(msg, onProgress, transfer) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    calls.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ ...msg, id }, transfer || []);
  });
}

// ---------------------------------------------------------------------------
// Loading

let loading = null;

export async function isDownloaded(id = state.settings.piperVoice) {
  if (!supported) return false;
  try {
    const c = await caches.open(MODEL_CACHE);
    return !!(await c.match(urlsFor(voiceById(id)).modelUrl));
  } catch {
    return false;
  }
}

// Start (or continue) getting the chosen voice ready. Safe to call often.
export function ensureLoaded() {
  if (!wanted()) return Promise.resolve(false);
  const v = voiceById(state.settings.piperVoice);
  if (isReady()) return Promise.resolve(true);
  if (loading && loading.id === v.id) return loading.promise;
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  // 'starting' until bytes actually arrive (an already-downloaded voice never shows 'downloading')
  setStatus({ status: 'starting', voiceId: v.id, progress: 0, error: '' });
  const promise = call({ type: 'load', ...urlsFor(v) }, (m) => {
    if (loading && loading.id !== v.id) return;
    if (m.phase === 'starting') setStatus({ status: 'starting', progress: 1 });
    else setStatus({ status: 'downloading', progress: m.total ? m.loaded / m.total : 0 });
  })
    .then(() => {
      if (state.settings.piperVoice !== v.id) return false;
      setStatus({ status: 'ready', voiceId: v.id, progress: 1, error: '' });
      return true;
    })
    .catch((e) => {
      if (loading && loading.id === v.id) loading = null;
      setStatus({ status: 'error', voiceId: v.id, error: friendlyError(e) });
      return false;
    });
  loading = { id: v.id, promise };
  return promise;
}

function friendlyError(e) {
  const msg = String((e && e.message) || e);
  if (/fetch|network|download/i.test(msg)) return 'Could not download the voice. Is the Chromebook online?';
  return msg;
}

// Called when the grown-up changes voice settings.
export function settingsChanged() {
  if (!wanted()) {
    stop();
    setStatus({ status: supported ? 'off' : 'unsupported' });
    return;
  }
  if (voiceStatus.voiceId !== state.settings.piperVoice || voiceStatus.status === 'error' || voiceStatus.status === 'off') {
    loading = null;
    ensureLoaded();
  }
}

export async function removeDownloads() {
  stop();
  queue.length = 0;
  memory.clear();
  if (worker) { worker.terminate(); worker = null; }
  calls.clear();
  loading = null;
  await caches.delete(MODEL_CACHE).catch(() => {});
  await caches.delete(CLIP_CACHE).catch(() => {});
  setStatus({ status: wanted() ? 'idle' : 'off', voiceId: null, progress: 0, error: '' });
}

// ---------------------------------------------------------------------------
// Clips: made once, then kept (memory + Cache Storage)

function lengthScale() {
  const rate = Number(state.settings.rate) || 0.85;
  return Math.round((1 / rate) * 100) / 100;
}
function clipKey(text) {
  return `${state.settings.piperVoice}|${lengthScale()}|${text}`;
}
function clipUrl(key) {
  return new URL('__voice__/' + encodeURIComponent(key), location.href).href;
}

const memory = new Map();
const MEMORY_MAX = 300;
function remember(key, blob) {
  memory.delete(key);
  memory.set(key, blob);
  if (memory.size > MEMORY_MAX) memory.delete(memory.keys().next().value);
}

// priority: lower runs first. Speech needed right now jumps the queue.
const PRIORITY = { now: 0, soon: 1, later: 2 };
const queue = [];
const jobs = new Map();
let nowBatch = 0;
let jobSeq = 0;
let busy = false;

export function getClip(text, priority = 'now') {
  const t = cleanText(text);
  const key = clipKey(t);
  if (memory.has(key)) return Promise.resolve(memory.get(key));
  const rank = PRIORITY[priority] ?? PRIORITY.later;
  const existing = jobs.get(key);
  if (existing) {
    if (rank < existing.rank) {
      existing.rank = rank;
      sortQueue();
    }
    return existing.promise;
  }
  const job = { key, text: t, ls: lengthScale(), voiceId: state.settings.piperVoice, rank, order: ++jobSeq };
  job.promise = (async () => {
    try {
      const cache = await caches.open(CLIP_CACHE);
      const hit = await cache.match(clipUrl(key));
      if (hit) {
        const blob = await hit.blob();
        remember(key, blob);
        return blob;
      }
    } catch { /* fall through to making it */ }
    return new Promise((resolve, reject) => {
      job.resolve = resolve;
      job.reject = reject;
      queue.push(job);
      sortQueue();
      pump();
    });
  })();
  jobs.set(key, job);
  job.promise.then(() => jobs.delete(key), () => jobs.delete(key));
  return job.promise;
}

function sortQueue() {
  queue.sort((a, b) => a.rank - b.rank || a.order - b.order);
}

async function pump() {
  if (busy || !queue.length) return;
  if (!isReady()) {
    // Not ready yet: wait for loading, then carry on (or give up if switched off).
    const ok = await ensureLoaded();
    if (!ok) {
      while (queue.length) queue.shift().reject(new Error('Voice not available'));
      return;
    }
  }
  if (busy || !queue.length) return;
  busy = true;
  const job = queue.shift();
  try {
    const r = await call({ type: 'synth', text: job.text, lengthScale: job.ls });
    const blob = new Blob([r.wav], { type: 'audio/wav' });
    remember(job.key, blob);
    job.resolve(blob);
    caches.open(CLIP_CACHE).then((c) => c.put(clipUrl(job.key), new Response(blob, { headers: { 'content-type': 'audio/wav' } }))).catch(() => {});
  } catch (e) {
    job.reject(e);
  } finally {
    busy = false;
    pump();
  }
}

// Prepare phrases in the background so they play instantly later.
export function prefetch(texts, priority = 'later') {
  if (!wanted()) return;
  const seen = new Set();
  for (const raw of texts) {
    const t = cleanText(raw);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    getClip(t, priority).catch(() => {});
  }
}

// Speech that is about to be said: the newest request goes first, in order.
export function prefetchNow(texts) {
  if (!isReady()) return;
  nowBatch++;
  let i = 0;
  for (const raw of texts) {
    const t = cleanText(raw);
    if (!t) continue;
    const key = clipKey(t);
    if (memory.has(key)) continue;
    getClip(t, 'now').catch(() => {});
    const job = jobs.get(key);
    if (job) job.rank = Math.min(job.rank, -nowBatch * 1000 + i++);
  }
  sortQueue();
}

// ---------------------------------------------------------------------------
// Playback

let playToken = 0;

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

// A clip that was made before (no voice model needed to play it).
async function savedClip(text) {
  const key = clipKey(text);
  if (memory.has(key)) return memory.get(key);
  try {
    const hit = await (await caches.open(CLIP_CACHE)).match(clipUrl(key));
    if (!hit) return null;
    const blob = await hit.blob();
    remember(key, blob);
    return blob;
  } catch {
    return null;
  }
}

// Resolves true when played (or stopped), false if the voice couldn't do it
// (the caller then falls back to the Chromebook voice).
export async function play(text) {
  const t = cleanText(text);
  if (!t || !wanted()) return false;
  const my = ++playToken;
  let blob = await savedClip(t);
  if (my !== playToken) return true;
  if (!blob) {
    if (!isReady()) return false; // still loading: use the Chromebook voice this time
    try {
      blob = await withTimeout(getClip(t, 'now'), 12000);
    } catch {
      return my !== playToken; // stopped meanwhile counts as done
    }
  }
  if (my !== playToken) return true;
  await playSource(blob);
  return true;
}

export function stop() {
  playToken++;
  stopPlayback();
}

