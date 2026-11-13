// Service worker : met toute l'application en cache pour un usage hors ligne.
// Les fichiers de l'app sont pris sur le réseau quand il est là, sinon dans le cache.
// Incrémentez VERSION si vous ajoutez de nouveaux fichiers à la liste ASSETS.
const VERSION = 'v4-2026-11-13';
const CORE = `cb-core-${VERSION}`;
const IMG = 'cb-img';

const PHOTOS = ['africaine', 'asiatique', 'autre', 'bar', 'burger', 'cafe', 'club', 'creperie', 'fastfood', 'francaise', 'fruitsdemer', 'grill',
  'indienne', 'italienne', 'japonaise', 'latino', 'orientale', 'pizza', 'pub', 'sucre', 'tapas', 'vege', 'wine'].map((p) => `img/photos/${p}.jpg`);

const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/config.js', 'js/hours.js', 'js/routing.js', 'js/basemap.js', 'js/graph.js', 'js/i18n.js',
  'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/leaflet.markercluster.js', 'vendor/qrcode.js',
  'fonts/bangers-latin.woff2', 'fonts/bangers-latin-ext.woff2', 'fonts/comicneue-400.woff2', 'fonts/comicneue-700.woff2',
  'data/venues.json', 'data/basemap.json', 'data/tram.json', 'data/photos.json', 'data/equipe.json', 'data/graph.json', 'data/parkings.json',
  'img/icon.svg', 'img/icon-192.png', 'img/icon-512.png',
  ...PHOTOS,
];

function fetchAndCache(req, revalidate = false) {
  return fetch(req, revalidate ? { cache: 'no-cache' } : undefined).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CORE).then((c) => c.put(req, copy)); }
    return res;
  });
}
const timeout = (p, ms) => new Promise((ok, ko) => { const t = setTimeout(() => ko(new Error('timeout')), ms); p.then((r) => { clearTimeout(t); ok(r); }, (e) => { clearTimeout(t); ko(e); }); });

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CORE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('cb-core-') && k !== CORE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // Polices, images, bibliothèques : ne changent jamais → cache d'abord
    if (/\/(fonts|img|vendor)\//.test(url.pathname)) {
      e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetchAndCache(req)));
      return;
    }
    // Pages, code et données : réseau d'abord (mises à jour immédiates), cache si hors ligne
    e.respondWith(
      timeout(fetchAndCache(req, true), 3500)
        .catch(() => caches.match(req, { ignoreSearch: true }))
        .then((res) => res || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())),
    );
    return;
  }

  // Photos externes (OSM / Wikimedia) : mises en cache au fil de l'eau
  if (req.destination === 'image') {
    e.respondWith(
      caches.open(IMG).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { c.put(req, res.clone()); return res; }).catch(() => Response.error()))),
    );
  }
});
