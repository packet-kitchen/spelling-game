// ElevenLabs voice ("Alice").
//
// 1. Fixed phrases and the Year 2 tricky words are recorded in advance
//    (audio/alice/, see tools/record-voice.mjs) and play straight away.
// 2. Anything else (this week's school words, other lists) is made with the
//    grown-up's ElevenLabs API key the first time it is needed, then saved in
//    this browser so it never costs credits again.
//
// The API key is kept in this browser's localStorage only. It is never part of
// the website's code or of backup files.

import { state } from '../state.js';
import { ELEVEN, elevenRequest } from './eleven-config.js';
import { cleanText } from './phrases.js';
import { playSource, stopPlayback } from './player.js';

const KEY_STORE = 'unicorn-spelling-elevenlabs-key';
const CLIP_CACHE = 'unicorn-eleven-clips-v1';
const AUDIO_BASE = new URL(`../../audio/${ELEVEN.dir}/`, import.meta.url);

export function wanted() {
  return state.settings.voiceEngine === 'eleven';
}

// ---------------------------------------------------------------------------
// API key (this Chromebook only)

export function getKey() {
  try { return localStorage.getItem(KEY_STORE) || ''; } catch { return ''; }
}
export function setKey(key) {
  try {
    if (key) localStorage.setItem(KEY_STORE, key.trim());
    else localStorage.removeItem(KEY_STORE);
  } catch { /* ignore */ }
  setStatus({ key: key ? 'unchecked' : 'none', error: '' });
}

// key: 'none' | 'unchecked' | 'ok' | 'bad' | 'no-credits' | 'offline'
export const elevenStatus = { key: getKey() ? 'unchecked' : 'none', error: '' };
const listeners = new Set();
export function onElevenStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function setStatus(patch) {
  Object.assign(elevenStatus, patch);
  listeners.forEach((fn) => { try { fn(elevenStatus); } catch { /* ignore */ } });
}

// ---------------------------------------------------------------------------
// Recorded clips

let manifest = null;
let manifestLoading = null;
export function loadManifest() {
  if (manifest) return Promise.resolve(manifest);
  if (!manifestLoading) {
    manifestLoading = fetch(new URL('manifest.json', AUDIO_BASE))
      .then((r) => (r.ok ? r.json() : { clips: {} }))
      .then((m) => { manifest = m.clips || {}; return manifest; })
      .catch(() => { manifestLoading = null; return {}; });
  }
  return manifestLoading;
}

async function recordedUrl(text) {
  const m = await loadManifest();
  const file = m[text];
  return file ? new URL(file, AUDIO_BASE).href : null;
}

export async function isRecorded(text) {
  return !!(await recordedUrl(cleanText(text)));
}

// ---------------------------------------------------------------------------
// Clips made on this Chromebook

const memory = new Map();
function clipUrl(text) {
  return new URL(`__eleven__/${ELEVEN.voiceId}/${ELEVEN.modelId}/${encodeURIComponent(text)}`, location.href).href;
}
async function savedClip(text) {
  if (memory.has(text)) return memory.get(text);
  try {
    const hit = await (await caches.open(CLIP_CACHE)).match(clipUrl(text));
    if (!hit) return null;
    const blob = await hit.blob();
    memory.set(text, blob);
    return blob;
  } catch {
    return null;
  }
}

// At most two requests at a time; the same text is only ever requested once.
const jobs = new Map();
const queue = [];
let running = 0;

function generate(text) {
  if (jobs.has(text)) return jobs.get(text).promise;
  const job = { text };
  job.promise = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
  jobs.set(text, job);
  job.promise.then(() => jobs.delete(text), () => jobs.delete(text));
  queue.push(job);
  pump();
  return job.promise;
}

function pump() {
  while (running < 2 && queue.length) {
    const job = queue.shift();
    running++;
    request(job.text)
      .then(job.resolve, job.reject)
      .finally(() => { running--; pump(); });
  }
}

async function request(text, key = getKey()) {
  if (!key) throw new Error('No ElevenLabs key');
  const { url, body } = elevenRequest(text);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    setStatus({ key: elevenStatus.key === 'ok' ? 'ok' : elevenStatus.key, error: 'Could not reach ElevenLabs. Is the Chromebook online?' });
    throw e;
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    if (res.status === 401 && !/quota|credits/i.test(detail)) setStatus({ key: 'bad', error: 'ElevenLabs did not accept the key.' });
    else if (/quota|credit/i.test(detail) || res.status === 402) setStatus({ key: 'no-credits', error: 'The ElevenLabs account is out of credits.' });
    else setStatus({ error: `ElevenLabs error ${res.status}` });
    throw new Error(`ElevenLabs ${res.status}`);
  }
  const blob = await res.blob();
  if (blob.size < 300) throw new Error('Empty audio');
  if (key === getKey()) setStatus({ key: 'ok', error: '' });
  memory.set(text, blob);
  caches.open(CLIP_CACHE)
    .then((c) => c.put(clipUrl(text), new Response(blob, { headers: { 'content-type': 'audio/mpeg' } })))
    .catch(() => {});
  return blob;
}

// ---------------------------------------------------------------------------
// Public API used by speech.js

function playbackRate() {
  // The speed slider's middle ("Steady", 0.85) plays clips as recorded.
  const r = (Number(state.settings.rate) || 0.85) / 0.85;
  return Math.max(0.7, Math.min(1.3, r));
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

let playToken = 0;

// true: played (or stopped). false: not available, use another voice.
export async function play(text) {
  const t = cleanText(text);
  if (!t) return false;
  const my = ++playToken;
  let src = await recordedUrl(t);
  if (!src) src = await savedClip(t);
  if (my !== playToken) return true;
  if (!src) {
    if (!getKey() || elevenStatus.key === 'bad' || elevenStatus.key === 'no-credits') return false;
    try {
      src = await withTimeout(generate(t), 10000);
    } catch {
      return my !== playToken;
    }
    if (my !== playToken) return true;
  }
  await playSource(src, { rate: playbackRate() });
  return true;
}

export function stop() {
  playToken++;
  stopPlayback();
}

// Make clips for phrases that aren't recorded or saved yet (uses credits once).
// Resolves when everything asked for is ready (or has failed).
export async function prepare(texts) {
  if (!getKey()) return;
  const m = await loadManifest();
  const pending = [];
  for (const raw of texts) {
    const t = cleanText(raw);
    if (!t || m[t] || memory.has(t)) continue;
    if (jobs.has(t)) { pending.push(jobs.get(t).promise.catch(() => {})); continue; }
    pending.push(savedClip(t).then((hit) => (hit ? hit : generate(t))).catch(() => {}));
  }
  await Promise.all(pending);
}

// Check a key by saying "Hello!" with it (about 3 credits).
export async function testKey(key) {
  const blob = await request('Hello!', key);
  setStatus({ key: 'ok', error: '' });
  await playSource(blob, { rate: playbackRate() });
  return true;
}

// Rough credits needed for texts that aren't ready yet (Flash: half a credit per character).
export async function creditsNeeded(texts) {
  const m = await loadManifest();
  let chars = 0;
  for (const raw of texts) {
    const t = cleanText(raw);
    if (!t || m[t] || (await savedClip(t))) continue;
    chars += t.length;
  }
  return Math.ceil(chars / 2);
}
