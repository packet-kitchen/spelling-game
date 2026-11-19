// Offline support. Files are served from the cache straight away and refreshed
// in the background, so an update shows up the next time the game is opened.
// Bump VERSION when releasing changes.
const VERSION = 'v1';
const CACHE = `unicorn-spelling-${VERSION}`;
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
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('unicorn-spelling-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
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
