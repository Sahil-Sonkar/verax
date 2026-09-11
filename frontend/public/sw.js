const CACHE = 'verax-shell-v2'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

function put(request, response) {
  if (!response.ok) return response
  const copy = response.clone()
  void caches.open(CACHE).then((cache) => cache.put(request, copy))
  return response
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/')) return
  const local = url.origin === self.location.origin
  const font = url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com'
  if (!local && !font) return

  if (local && request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => put(request, response))
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match('/'))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(request).then((response) => put(request, response))
      return cached ?? fresh
    }),
  )
})
