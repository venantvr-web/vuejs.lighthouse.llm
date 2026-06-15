/**
 * Service worker for the Lighthouse AI Analyzer PWA.
 *
 * Safety-first strategy (avoids the classic "blank page" PWA failure):
 *  - Navigations are ALWAYS network-first. While online the user gets the
 *    fresh index.html, so a stale shell can never reference dead hashed
 *    chunks. The cached shell is only used as an offline fallback.
 *  - Build assets under /assets/ are content-hashed (immutable) -> cache-first.
 *  - Other same-origin GET requests -> network-first with cache fallback.
 *  - Cross-origin calls (PageSpeed API, LLM providers, local server) are never
 *    intercepted.
 *
 * Bump CACHE_VERSION to invalidate every previous cache on activation.
 */

const CACHE_VERSION = 'v2'
const CACHE_NAME = `lighthouse-ai-${CACHE_VERSION}`
const OFFLINE_URL = '/index.html'
const PRECACHE = [OFFLINE_URL, '/manifest.webmanifest', '/icon.svg', '/favicon.ico']

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            // Don't let a single missing file abort the whole install.
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

    // Navigations: network-first, cached shell only as offline fallback.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone()
                    caches.open(CACHE_NAME).then((cache) => cache.put(OFFLINE_URL, copy))
                    return response
                })
                .catch(() => caches.match(OFFLINE_URL))
        )
        return
    }

    // Immutable hashed build assets: cache-first.
    if (url.pathname.startsWith('/assets/')) {
        event.respondWith(
            caches.match(request).then((cached) => cached || fetch(request).then((response) => {
                if (response && response.status === 200) {
                    const copy = response.clone()
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
                }
                return response
            }))
        )
        return
    }

    // Other same-origin GET: network-first, fall back to cache when offline.
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response && response.status === 200) {
                    const copy = response.clone()
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
                }
                return response
            })
            .catch(() => caches.match(request))
    )
})
