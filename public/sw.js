/* Beat Studio service worker — app shell + sample cache */
const SHELL_CACHE = 'beat-studio-shell-v1'
const SAMPLE_CACHE = 'beat-studio-samples-v1'
const FONT_CACHE = 'beat-studio-fonts-v1'

const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, SAMPLE_CACHE, FONT_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  )
})

function isSampleRequest(url) {
  return (
    url.hostname === 'raw.githubusercontent.com' &&
    (url.pathname.includes('dough-samples') ||
      url.pathname.includes('tidal-drum-machines') ||
      url.pathname.includes('Dirt-Samples') ||
      url.pathname.includes('piano'))
  )
}

function isFontRequest(url) {
  return (
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
  )
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (hit) return hit
  const res = await fetch(request)
  if (res.ok || res.type === 'opaque') {
    cache.put(request, res.clone())
  }
  return res
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone())
      return res
    })
    .catch(() => hit)
  return hit || network
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (isSampleRequest(url)) {
    event.respondWith(cacheFirst(request, SAMPLE_CACHE))
    return
  }

  if (isFontRequest(url)) {
    event.respondWith(cacheFirst(request, FONT_CACHE))
    return
  }

  // Same-origin navigations + built assets
  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request)
          .then((res) => {
            const copy = res.clone()
            caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy))
            return res
          })
          .catch(() => caches.match('/index.html')),
      )
      return
    }

    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE))
  }
})
