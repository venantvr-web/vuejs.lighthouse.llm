/**
 * Service worker for the Lighthouse AI Analyzer PWA.
 *
 * Strategy:
 *  - Precache the app shell on install.
 *  - Navigations: network-first with an offline fallback to the cached shell.
 *  - Same-origin GET assets: stale-while-revalidate.
 *
 * Audit data lives in IndexedDB / localStorage (handled by the app), so the
 * worker only needs to keep the shell and static assets available offline.
 */

const CACHE_VERSION = 'v1'
const CACHE_NAME = `lighthouse-ai-${CACHE_VERSION}`
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/favicon.ico']

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
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

    // Only handle GET requests we can safely cache
    if (request.method !== 'GET') return

    const url = new URL(request.url)

    // Never cache cross-origin calls (PageSpeed API, LLM providers, local server…)
    if (url.origin !== self.location.origin) return

    // Navigations: network-first, fall back to cached shell when offline
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone()
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
                    return response
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
        )
        return
    }

    // Static assets: stale-while-revalidate
    event.respondWith(
        caches.match(request).then((cached) => {
            const network = fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone()
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
                    }
                    return response
                })
                .catch(() => cached)
            return cached || network
        })
    )
})
