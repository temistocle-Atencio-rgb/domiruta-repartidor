// DomiRuta Service Worker
const CACHE_NAME = 'domiruta-v3';

// Recursos esenciales que se pre-cachean al instalar
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './iconos/app-192.png',
  './iconos/app-512.png',
  './iconos/app-512-maskable.png',
  './iconos/moto.svg',
  './iconos/moto-izq.svg',
  './iconos/tienda.svg',
  './iconos/cliente.svg',
  './iconos/cliente-entregado.svg',
  './iconos/cliente-no-entregado.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Algunos recursos no se pudieron pre-cachear:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo manejar peticiones GET
  if (req.method !== 'GET') {
    return;
  }

  const url = new URL(req.url);

  // NUNCA cachear llamadas a Supabase ni mapas de OpenStreetMap
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('tile.openstreetmap.org') ||
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/rpc/')
  ) {
    return;
  }

  // 1. Navegación / Documento HTML: Network-first, fallback a caché
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            // una sola copia de la página (si no, se guarda una por cada enlace ?s=, ?p= o ?r=)
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const fallback = await caches.match('./index.html');
          if (fallback) return fallback;
          return caches.match('./');
        })
    );
    return;
  }

  // 2. Recursos estáticos (scripts, css, imágenes, fuentes): Stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise.then((r) => r || Response.error());
    })
  );
});

// ---------------------------------------------------------------
// Avisos (etapa F): llegan aunque la app esté cerrada
// ---------------------------------------------------------------
self.addEventListener('push', (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch (e) {
    datos = { texto: event.data ? event.data.text() : '' };
  }
  const titulo = (datos.titulo || 'DomiRuta').toString().slice(0, 80);
  const url = (datos.url || './').toString();
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: (datos.texto || '').toString().slice(0, 200),
      icon: 'iconos/app-192.png',
      badge: 'iconos/app-192.png',
      vibrate: [200, 100, 200],
      tag: url,
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const scope = self.registration.scope;
  let destino = scope;
  try {
    const u = new URL((event.notification.data && event.notification.data.url) || './', scope);
    if (u.href.startsWith(scope)) destino = u.href; // solo dentro de la app
  } catch (e) {
    destino = scope;
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (v.url.startsWith(scope) && 'focus' in v) {
          return v.navigate(destino).then((w) => (w || v).focus()).catch(() => v.focus());
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});
