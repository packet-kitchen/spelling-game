// Runs the Piper neural voice in a background worker so the game never freezes.
//
//   text --(espeak-ng phonemizer, WebAssembly)--> phoneme ids
//        --(Piper VITS model, onnxruntime-web)--> audio samples --> WAV
//
// Messages in:  { id, type: 'load', modelUrl, configUrl }
//               { id, type: 'synth', text, lengthScale }
// Messages out: { id, type: 'progress', loaded, total }
//               { id, type: 'done', ...result }
//               { id, type: 'error', message }

import * as ort from '../../vendor/ort/ort.wasm.min.mjs';
import { createPiperPhonemize } from '../../vendor/piper/piper_phonemize.mjs';

const VENDOR = new URL('../../vendor/', import.meta.url).href;
const MODEL_CACHE = 'unicorn-voice-models-v1';

ort.env.wasm.wasmPaths = VENDOR + 'ort/';
ort.env.wasm.numThreads = 1; // threads need cross-origin isolation, which static hosting can't give
ort.env.logLevel = 'error';

let phonemizer = null;
let printed = [];
let model = null; // { url, session, config }

function getPhonemizer() {
  if (!phonemizer) {
    phonemizer = createPiperPhonemize({
      print: (line) => printed.push(line),
      printErr: () => {},
      locateFile: (file) => VENDOR + 'piper/' + file,
    });
  }
  return phonemizer;
}

async function phonemeIds(text, espeakVoice) {
  const mod = await getPhonemizer();
  printed = [];
  mod.callMain(['-l', espeakVoice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
  const ids = [];
  for (const line of printed) {
    const t = line.trim();
    if (!t.startsWith('{')) continue;
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed.phoneme_ids)) ids.push(...parsed.phoneme_ids);
  }
  if (!ids.length) throw new Error('Could not turn the text into sounds');
  return ids;
}

// Download once, then keep in Cache Storage so it works offline.
async function cachedFetch(url, onProgress) {
  const cache = await caches.open(MODEL_CACHE);
  const hit = await cache.match(url);
  if (hit) return hit.arrayBuffer();
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const total = Number(res.headers.get('content-length')) || 0;
  let buf;
  if (res.body && onProgress) {
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;
    let last = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (loaded - last > 512 * 1024 || loaded === total) {
        last = loaded;
        onProgress(loaded, total);
      }
    }
    buf = await new Blob(chunks).arrayBuffer();
  } else {
    buf = await res.arrayBuffer();
  }
  await cache.put(url, new Response(buf, { headers: { 'content-type': res.headers.get('content-type') || 'application/octet-stream' } }));
  return buf;
}

async function load({ modelUrl, configUrl }, progress) {
  if (model && model.url === modelUrl) return { sampleRate: model.config.audio.sample_rate };
  const config = JSON.parse(new TextDecoder().decode(await cachedFetch(configUrl)));
  const bytes = await cachedFetch(modelUrl, progress);
  progress(1, 1, 'starting');
  const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  await getPhonemizer();
  model = { url: modelUrl, session, config };
  // warm up so the first real word isn't slow
  await synth({ text: 'Hello.', lengthScale: 1 });
  return { sampleRate: config.audio.sample_rate };
}

async function synth({ text, lengthScale }) {
  if (!model) throw new Error('Voice not loaded');
  const t0 = performance.now();
  const { config, session } = model;
  const ids = await phonemeIds(text, (config.espeak && config.espeak.voice) || 'en-gb');
  const inf = config.inference || {};
  const feeds = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids, (x) => BigInt(x)), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([inf.noise_scale ?? 0.667, (inf.length_scale ?? 1) * (lengthScale || 1), inf.noise_w ?? 0.8]), [3]),
  };
  if ((config.num_speakers || 1) > 1) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
  const out = await session.run(feeds);
  const audio = out.output.data;
  const wav = toWav(audio, config.audio.sample_rate);
  return { wav, ms: Math.round(performance.now() - t0), seconds: audio.length / config.audio.sample_rate };
}

// Float samples -> 16-bit mono WAV, gently normalised, with a short fade in/out.
function toWav(samples, rate) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const gain = peak > 0 ? Math.min(3, 0.9 / peak) : 1;
  const fade = Math.min(Math.floor(rate * 0.01), samples.length >> 2);
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    let s = samples[i] * gain;
    if (i < fade) s *= i / fade;
    else if (i > n - fade) s *= (n - i) / fade;
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32767, true);
  }
  return buf;
}

// One job at a time: the model can't run two things at once.
let chain = Promise.resolve();
self.onmessage = (ev) => {
  const msg = ev.data || {};
  chain = chain.then(async () => {
    try {
      if (msg.type === 'load') {
        const r = await load(msg, (loaded, total, phase) => self.postMessage({ id: msg.id, type: 'progress', loaded, total, phase }));
        self.postMessage({ id: msg.id, type: 'done', ...r });
      } else if (msg.type === 'synth') {
        const r = await synth(msg);
        self.postMessage({ id: msg.id, type: 'done', ...r }, [r.wav]);
      }
    } catch (e) {
      self.postMessage({ id: msg.id, type: 'error', message: String((e && e.message) || e) });
    }
  });
};
