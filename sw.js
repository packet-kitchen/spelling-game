// Offline support. Files are served from the cache straight away and refreshed
// in the background, so an update shows up the next time the game is opened.
// Bump VERSION when releasing changes.
const VERSION = 'v4';
const CACHE = `unicorn-spelling-${VERSION}`;
// Runtime files for the natural voice never change for a given path, so they
// live in their own cache that survives app updates. (Rename the cache if a
// vendor file is ever replaced.)
const VENDOR_CACHE = 'unicorn-spelling-vendor-v1';
// Recorded voice clips: file names come from the text and voice settings, so a
// file never changes; they are kept across app updates too.
const AUDIO_CACHE = 'unicorn-spelling-audio-v1';
const AUDIO_MANIFEST = './audio/alice/manifest.json';
const VENDOR_FILES = [
  './vendor/ort/ort.wasm.min.mjs',
  './vendor/ort/ort-wasm-simd-threaded.mjs',
  './vendor/ort/ort-wasm-simd-threaded.wasm',
  './vendor/piper/piper_phonemize.mjs',
  './vendor/piper/piper_phonemize.wasm',
  './vendor/piper/piper_phonemize.data',
];
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './fonts/andika-400.woff2',
  './fonts/andika-700.woff2',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/main.js',
  './js/router.js',
  './js/state.js',
  './js/words.js',
  './js/wordutils.js',
  './js/scheduler.js',
  './js/speech.js',
  './js/sfx.js',
  './js/ui.js',
  './js/buddy.js',
  './js/unicorns.js',
  './js/screens/home.js',
  './js/screens/play.js',
  './js/screens/mission.js',
  './js/screens/test.js',
  './js/screens/stable.js',
  './js/screens/parent.js',
  './js/voice/neural.js',
  './js/voice/phrases.js',
  './js/voice/piper-worker.js',
  './js/voice/eleven.js',
  './js/voice/eleven-config.js',
  './js/voice/player.js',
  AUDIO_MANIFEST,
];

async function cacheVendorFiles() {
  const cache = await caches.open(VENDOR_CACHE);
  for (const f of VENDOR_FILES) {
    if (!(await cache.match(f))) await cache.add(f);
  }
}

// All recorded clips, so the voice works offline from the start (about 4 MB).
async function cacheRecordedAudio() {
  const res = await fetch(AUDIO_MANIFEST, { cache: 'no-cache' });
  const { clips = {} } = await res.json();
  const base = new URL(AUDIO_MANIFEST, self.location.href);
  const cache = await caches.open(AUDIO_CACHE);
  const have = new Set((await cache.keys()).map((r) => r.url));
  const todo = [...new Set(Object.values(clips))].map((f) => new URL(f, base).href).filter((u) => !have.has(u));
  for (let i = 0; i < todo.length; i += 20) await cache.addAll(todo.slice(i, i + 20));
}

self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([
    caches.open(CACHE).then((c) => c.addAll(FILES)),
    cacheRecordedAudio().catch(() => {}),
    // The voice runtime is big; if it can't be fetched now it is fetched when needed.
    cacheVendorFiles().catch(() => {}),
  ]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('unicorn-spelling-') && ![CACHE, VENDOR_CACHE, AUDIO_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const longLived = url.pathname.includes('/vendor/') ? VENDOR_CACHE
    : url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3') ? AUDIO_CACHE : null;
  if (longLived) {
    event.respondWith(
      caches.open(longLived).then(async (cache) => {
        const hit = await cache.match(req, { ignoreSearch: true });
        if (hit) return hit;
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }));
    return;
  }
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }));
});
