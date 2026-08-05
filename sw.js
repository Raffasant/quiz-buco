const CACHE_NAME = 'quiz-buco-v9';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

// Arquivos "de conteúdo", que mudam com frequência (banco de questões etc.):
// sempre tenta a rede primeiro, só cai pro cache se estiver offline.
const NETWORK_FIRST = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isNetworkFirst(request) {
  if (request.mode === 'navigate') return true;
  const url = new URL(request.url);
  return NETWORK_FIRST.some((path) => url.pathname.endsWith(path.replace('./', '/')) || url.pathname.endsWith('/'));
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (isNetworkFirst(event.request)) {
    // NETWORK-FIRST: busca a versão mais nova; só usa o cache se a rede falhar (offline).
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // CACHE-FIRST: para assets estáticos (ícones, manifest), que raramente mudam.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
