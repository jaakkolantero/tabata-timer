// Bump VERSION whenever a cached asset changes. No automatic skipWaiting:
// an update is activated only when the user explicitly applies it while idle.
const VERSION = 'v1';
const PREFIX = `tabata-${self.registration.scope}-`;
const CACHE = PREFIX + VERSION;
const ASSETS = ['./', './index.html', './styles.css', './app.js', './timer.js', './wake-lock.js', './pwa.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
 event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('message', event => { if (event.data?.type === 'APPLY_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
 const url = new URL(event.request.url);
 if (event.request.method !== 'GET' || !url.href.startsWith(self.registration.scope) || url.origin !== self.location.origin) return;
 event.respondWith((async () => {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request, {ignoreSearch: true});
  if (cached) return cached;
  try { return await fetch(event.request); }
  catch (error) { if (event.request.mode === 'navigate') return cache.match('./index.html'); throw error; }
 })());
});
