/* Beat Studio service worker — app shell only (samples fetched by the page) */
const SHELL_CACHE = 'beat-studio-shell-v3'
const FONT_CACHE = 'beat-studio-fonts-v3'

const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => ![SHELL_CACHE, FONT_CACHE].includes(k))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function isFontRequest(url) {
  return (
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
  )
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  try {
    const res = await fetch(request)
    if (res.ok) void cache.put(request, res.clone())
    return res
  } catch {
    if (hit) return hit
    throw new Error('offline')
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Strudel sample/CDN fetches must not go through the SW — intercepting breaks
  // CORS and surfaces NetworkError when cache-first fetch fails.
  if (
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname === 'raw.githubusercontent.com' ||
    url.hostname === 'github.com'
  ) {
    return
  }

  if (isFontRequest(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(FONT_CACHE)
        const hit = await cache.match(request)
        try {
          const res = await fetch(request)
          if (res.ok) void cache.put(request, res.clone())
          return res
        } catch {
          if (hit) return hit
          return fetch(request)
        }
      })(),
    )
    return
  }

  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request)
          .then((res) => {
            const copy = res.clone()
            void caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy))
            return res
          })
          .catch(() => caches.match('/index.html')),
      )
      return
    }

    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE))
  }
})
