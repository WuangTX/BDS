const CACHE_NAME = 'bds-studio-shell-v4';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Luôn kiểm tra phiên bản mới nhất trên máy chủ (bỏ qua disk cache cũ cho HTML/CSS/JS/JSON)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isCodeOrData = /\.(html|css|js|json|webmanifest)$/i.test(url.pathname) || url.pathname.endsWith('/');
  const fetchOpts = isCodeOrData ? { cache: 'no-cache' } : {};

  event.respondWith(
    fetch(event.request, fetchOpts)
      .then((response) => {
        if (response && response.status === 200 && !url.pathname.endsWith('.json')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
