const CACHE = 'nepse-ai-v2';
const PRECACHE = ['/offline'];

// ── Install: pre-cache offline fallback only ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin GET requests
  if (url.origin !== self.location.origin || request.method !== 'GET') return;

  // Network-first for API routes and HTML navigation (always try fresh data)
  // This prevents stale HTML with outdated JS bundle URLs from breaking hydration
  const isNavigation = request.mode === 'navigate';
  const isApi = url.pathname.startsWith('/api/');
  if (isApi || isNavigation) {
    event.respondWith(
      fetch(request)
        .then(res => res)
        .catch(() => isNavigation
          ? caches.match('/offline') ?? new Response('Offline', { status: 503 })
          : caches.match(request)
        )
    );
    return;
  }

  // Cache-first for static assets (JS/CSS bundles with hashed names)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(cache => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => new Response('', { status: 503 }));
    })
  );
});
