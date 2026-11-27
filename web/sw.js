// Offline support for the website version (iPhone Home Screen app, browsers).
// The Android app loads from file:// and never registers this.
//
// App code (HTML/JS/CSS/manifest) is network-first, so a new release shows up
// as soon as the phone is online; the cached copy is only the offline fallback.
// The map, icons and fonts rarely change and are served from the cache.
const CACHE = 'kingdom-ledger-v1';
const CORE = [
  './', 'index.html', 'app.js', 'style.css', 'manifest.json',
  'assets/map.png', 'assets/icon-180.png', 'assets/icon-192.png', 'assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isFont(url){ return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'; }

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if(!sameOrigin && !isFont(url)) return; // GitHub API (update check) etc. go straight to the network

  const isAsset = isFont(url) || /\.(png|jpg|jpeg|webp|svg|woff2?)$/i.test(url.pathname);
  if(isAsset){
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if(res && (res.ok || res.type === 'opaque')){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(req).then(res => {
      if(res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
