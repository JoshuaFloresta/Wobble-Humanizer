/**
 * Service worker for HumanInzer.
 *
 * The app is one bundle and the rewriting engine ships inside it, so caching
 * the shell is enough to make the whole tool work offline -- there is no
 * model to download and no API call on the critical path. The two Latin font
 * files are precached with it, since the interface is its handwriting.
 *
 * Strategy:
 *   navigations   network-first, falling back to the cached shell
 *   same-origin   stale-while-revalidate (hashed assets, so this is safe)
 *   /api/*        network-only, never cached (history must not go stale)
 */

const VERSION = 'humaninzer-v1';
const SHELL = [
  '/',
  '/index.html',
  '/fonts/kalam-700-latin.woff2',
  '/fonts/patrick-hand-400-latin.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // History and health are live data; a stale answer is worse than none.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
