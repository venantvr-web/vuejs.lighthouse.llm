/**
 * Service worker for the Lighthouse AI Analyzer PWA.
 *
 * Network-first for EVERY same-origin GET (navigation, CSS, JS, assets).
 * While online the browser always receives fresh content, so the worker can
 * never serve stale CSS/JS or a stale HTML shell. The cache is populated from
 * successful responses and used only as an offline fallback.
 *
 * Cross-origin calls (PageSpeed API, LLM providers, local server) are never
 * intercepted. Bump CACHE_VERSION to invalidate previous caches on activation.
 */

const CACHE_VERSION = 'v3'
const CACHE_NAME = `lighthouse-ai-${CACHE_VERSION}`
const OFFLINE_URL = '/index.html'
const PRECACHE = [OFFLINE_URL, '/manifest.webmanifest', '/icon.svg', '/favicon.ico']

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            // Don't let one missing file abort the whole install.
            .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
            .then(() => self.skipWaiting())
    )
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    )
})

self.addEventListener('fetch', (event) => {
    const {request} = event

    if (request.method !== 'GET') return

    const url = new URL(request.url)

    // Never touch cross-origin requests (APIs, LLM providers, local server…)
    if (url.origin !== self.location.origin) return

    // Network-first everywhere: always prefer fresh content; cache is a backup.
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const copy = response.clone()
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
                }
                return response
            })
            .catch(() => caches.match(request).then((cached) => {
                if (cached) return cached
                // Offline navigation fallback to the cached app shell.
                if (request.mode === 'navigate') return caches.match(OFFLINE_URL)
                return undefined
            }))
    )
})
