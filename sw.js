/* B-Heaven service worker.
   - Pages (menu, shisha, business lunch, /ar, /es): network first, so menu edits made in /admin
     show up straight away; the last good copy is used when the guest has no signal.
   - Dish and drink photos: cache first (the hashed .webp files never change).
   - Fonts and the other images: served from cache, refreshed in the background.
   - /api, /admin and anything that is not a GET are never touched. */
const VERSION = 'v1';
const PAGES = 'bh-pages-' + VERSION;
const IMAGES = 'bh-img-' + VERSION;
const STATIC = 'bh-static-' + VERSION;
const KEEP = [PAGES, IMAGES, STATIC];
const MAX_IMAGES = 220;
const NETWORK_TIMEOUT = 3500;

const PRECACHE = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png', '/manifest.webmanifest', '/pwa.js', '/booking.js', '/offers.js'];
// The main pages are stored on install, so the menu opens offline even if the guest only saw one page.
const PRECACHE_PAGES = ['/menu/', '/shisha/', '/business-lunch/'];
const PAGE_PATH = /^\/(?:(?:ar|es)\/)?(?:menu|shisha|business-lunch)\/?$/;

// One cache key per page: origin + path with a trailing slash, query string ignored.
function pageKey(url) {
  const path = /\.[a-z0-9]+$/i.test(url.pathname) || url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
  return url.origin + path;
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    Promise.all([
      caches.open(STATIC).then((c) => c.addAll(PRECACHE)),
      // a page that fails to precache must not block the install
      caches.open(PAGES).then((c) => Promise.allSettled(PRECACHE_PAGES.map((u) => c.add(new Request(u, { cache: 'reload' }))))),
    ]).then(() => self.skipWaiting())
  );
});

// The open page asks us to store itself (covers the /ar/ and /es/ versions and a guest's very first view).
self.addEventListener('message', (e) => {
  const d = e.data;
  if (!d || d.type !== 'cache-page' || typeof d.url !== 'string') return;
  let u;
  try { u = new URL(d.url, self.location.origin); } catch (err) { return; }
  if (u.origin !== self.location.origin || !PAGE_PATH.test(u.pathname)) return;
  const key = pageKey(u);
  e.waitUntil(
    caches.open(PAGES).then(async (c) => {
      if (await c.match(key)) return;
      const res = await fetch(key, { cache: 'reload' });
      if (res.ok) await c.put(key, res);
    }).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('bh-') && !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((r) => { clearTimeout(t); resolve(r); }, (err) => { clearTimeout(t); reject(err); });
  });
}

async function pageStrategy(request, event) {
  const cache = await caches.open(PAGES);
  const url = new URL(request.url);
  const key = pageKey(url); // ignores ?source=app and other query strings
  const network = fetch(request);
  try {
    const res = await withTimeout(network, NETWORK_TIMEOUT);
    if (res && res.ok) event.waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (err) {
    const cached = await cache.match(key);
    if (cached) {
      network.catch(() => {}); // let a slow request finish quietly
      return cached;
    }
    // a slow connection can still deliver after the timeout; give it a final chance
    try { const late = await network; if (late) return late; } catch (e) {}
    return (await caches.match('/offline.html')) || Response.error();
  }
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && (res.ok || res.type === 'opaque')) {
    await cache.put(request, res.clone());
    if (max) trim(cacheName, max);
  }
  return res;
}

async function staleWhileRevalidate(request, cacheName, event) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone()); return res; })
    .catch(() => null);
  if (hit) { event.waitUntil(refresh); return hit; }
  return (await refresh) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // fonts: cross-origin, safe to cache
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, STATIC, event));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  // pages
  if (request.mode === 'navigate') {
    event.respondWith(pageStrategy(request, event));
    return;
  }

  // the app scripts: served from cache, refreshed in the background (so the booking form works offline-to-WhatsApp-ready)
  if (url.pathname === '/pwa.js' || url.pathname === '/booking.js' || url.pathname === '/offers.js') {
    event.respondWith(staleWhileRevalidate(request, STATIC, event));
    return;
  }

  // hashed, immutable dish photos
  if (/^\/menu\/img\/[0-9a-f]{12}\.webp$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGES, MAX_IMAGES).catch(() => Response.error()));
    return;
  }

  // other images and icons: show the cached copy, refresh in the background
  if (/\.(?:webp|jpg|jpeg|png|ico|svg)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, IMAGES, event));
    return;
  }
});

// ---- push notifications (sent from /admin) ----
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'B-Heaven by Barceló';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: d.tag || 'bh',
    data: { url: typeof d.url === 'string' && d.url.charAt(0) === '/' && d.url.charAt(1) !== '/' ? d.url : '/menu/?source=app' },
    dir: 'auto',
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || '/menu/?source=app', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (new URL(c.url).origin === self.location.origin && 'navigate' in c) return c.navigate(target).then((w) => w && w.focus());
    }
    return self.clients.openWindow(target);
  }));
});

// the phone rotated the push address: tell the app to subscribe again next time it opens
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil(self.clients.matchAll({ includeUncontrolled: true }).then((list) => list.forEach((c) => c.postMessage({ type: 'push-resubscribe' }))));
});
