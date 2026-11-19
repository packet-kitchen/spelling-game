// Offline support. Files are served from the cache straight away and refreshed
// in the background, so an update shows up the next time the game is opened.
// Bump VERSION when releasing changes.
const VERSION = 'v2';
const CACHE = `unicorn-spelling-${VERSION}`;
// Runtime files for the natural voice never change for a given path, so they
// live in their own cache that survives app updates. (Rename the cache if a
// vendor file is ever replaced.)
const VENDOR_CACHE = 'unicorn-spelling-vendor-v1';
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
  './js/keyboard.js',
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
];

async function cacheVendorFiles() {
  const cache = await caches.open(VENDOR_CACHE);
  for (const f of VENDOR_FILES) {
    if (!(await cache.match(f))) await cache.add(f);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([
    caches.open(CACHE).then((c) => c.addAll(FILES)),
    // The voice runtime is big; if it can't be fetched now it is fetched when needed.
    cacheVendorFiles().catch(() => {}),
  ]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('unicorn-spelling-') && k !== CACHE && k !== VENDOR_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/vendor/')) {
    event.respondWith(
      caches.open(VENDOR_CACHE).then(async (cache) => {
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
