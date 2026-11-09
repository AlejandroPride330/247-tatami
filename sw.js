// Service worker: guarda la app para que abra sin cobertura.
// Primero intenta la red (para recibir actualizaciones) y, si falla, usa la copia guardada.
const CACHE = 'tatami-v3';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/store.js',
  'js/logic.js',
  'js/seed.js',
  'js/ui.js',
  'js/util.js',
  'js/media.js',
  'js/privacy.js',
  'js/views/lista.js',
  'js/views/disciplinas.js',
  'js/views/cobrar.js',
  'js/views/alumnos.js',
  'js/views/caja.js',
  'js/views/ajustes.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('index.html'))),
  );
});
