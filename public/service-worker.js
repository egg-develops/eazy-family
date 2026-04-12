const CACHE_NAME = 'eazy-family-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/favicon.ico',
  '/favicon.svg',
];

// Install — pre-cache static shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(err => console.warn('[SW] Pre-cache failed:', err))
  );
  self.skipWaiting();
});

// Activate — purge old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API/Supabase, cache-first for static assets
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin requests (Supabase, fonts, etc.) — let them go direct
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network-first, fall back to cached index.html (SPA shell)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets (JS/CSS/images): cache-first, update in background
  const isStatic = url.pathname.match(/\.(js|css|png|ico|svg|woff2?|ttf)$/);
  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(response => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // Everything else: network-first, cache as fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
