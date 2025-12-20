/**
 * PWA (Progressive Web App) Expert Prompts
 * Focus: Service Worker, Manifest, Offline capability
 */

export const pwaPrompts = {
  quickAnalysis: {
    name: 'Analyse Rapide PWA',
    description: 'Vérification conformité PWA',
    category: 'pwa',
    strategy: 'quick',
    variables: ['url', 'score', 'manifest', 'serviceWorker', 'offline', 'installable'],
    tags: ['pwa', 'manifest', 'service-worker', 'offline'],
    template: `# Analyse PWA - {{url}}

## Rôle
Tu es un Expert Progressive Web Apps (PWA), spécialisé dans les Service Workers et l'expérience hors ligne.

## Score PWA
{{formatScore:score}}

## Composants PWA

### Manifest Web App
{{#if manifest}}
✅ **Présent:** manifest.json détecté
{{/if}}
{{#if noManifest}}
❌ **Absent:** Aucun manifest détecté
{{/if}}

### Service Worker
{{#if serviceWorker}}
✅ **Enregistré:** Service Worker actif
{{/if}}
{{#if noServiceWorker}}
❌ **Absent:** Aucun Service Worker
{{/if}}

### Capacité Hors Ligne
{{#if offline}}
✅ **Fonctionnelle:** L'application fonctionne hors ligne
{{/if}}
{{#if noOffline}}
❌ **Non disponible:** Pas de support hors ligne
{{/if}}

### Installabilité
{{#if installable}}
✅ **Installable:** L'application peut être installée
{{/if}}
{{#if notInstallable}}
⚠️ **Problèmes:** Critères d'installation non satisfaits
{{/if}}

## Demande

En tant qu'expert PWA, analyse et fournis:

### 1. Manifest Web App Complet

\`\`\`json
// public/manifest.json
{
  "name": "Nom Complet de l'Application",
  "short_name": "App",
  "description": "Description de l'application",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4285f4",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/mobile.png",
      "sizes": "750x1334",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
\`\`\`

**Intégration dans index.html:**
\`\`\`html
<head>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#4285f4">
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
</head>
\`\`\`

### 2. Service Worker avec Workbox

**Installation Workbox:**
\`\`\`bash
npm install workbox-cli workbox-build --save-dev
\`\`\`

**Service Worker (public/sw.js):**
\`\`\`javascript
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// Precache assets générés par build
precacheAndRoute(self.__WB_MANIFEST)

// Cache des images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 jours
      })
    ]
  })
)

// Cache des API calls
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60 // 5 minutes
      })
    ]
  })
)

// Cache des ressources statiques (JS, CSS, fonts)
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'static-resources'
  })
)

// Offline fallback
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('offline').then((cache) => cache.add(OFFLINE_URL))
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL)
      })
    )
  }
})
\`\`\`

**Enregistrement Vue.js:**
\`\`\`javascript
// src/registerServiceWorker.js
export const registerSW = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration)

          // Vérifier les mises à jour
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nouvelle version disponible
                showUpdateNotification()
              }
            })
          })
        })
        .catch((error) => {
          console.error('SW registration failed:', error)
        })
    })
  }
}

// main.js
import { registerSW } from './registerServiceWorker'
registerSW()
\`\`\`

### 3. Configuration Vite pour PWA

\`\`\`javascript
// vite.config.js
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'Mon Application PWA',
        short_name: 'App',
        description: 'Description de mon app',
        theme_color: '#4285f4',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\\/\\/api\\.example\\.com\\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
})
\`\`\`

### 4. Page Offline

\`\`\`html
<!-- public/offline.html -->
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hors ligne</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      text-align: center;
      background: #f5f5f5;
    }
    .offline-container {
      max-width: 400px;
      padding: 2rem;
    }
    h1 { color: #333; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="offline-container">
    <h1>Vous êtes hors ligne</h1>
    <p>Cette page nécessite une connexion internet. Veuillez vérifier votre connexion et réessayer.</p>
  </div>
</body>
</html>
\`\`\`

### 5. Prompt d'Installation

\`\`\`vue
<script setup>
import { ref, onMounted } from 'vue'

const deferredPrompt = ref(null)
const showInstallPrompt = ref(false)

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    showInstallPrompt.value = true
  })

  window.addEventListener('appinstalled', () => {
    console.log('PWA installed')
    showInstallPrompt.value = false
  })
})

const installPWA = async () => {
  if (!deferredPrompt.value) return

  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice

  if (outcome === 'accepted') {
    console.log('User accepted install')
  }

  deferredPrompt.value = null
  showInstallPrompt.value = false
}
</script>

<template>
  <div v-if="showInstallPrompt" class="install-banner">
    <p>Installer l'application pour une meilleure expérience</p>
    <button @click="installPWA">Installer</button>
    <button @click="showInstallPrompt = false">Plus tard</button>
  </div>
</template>
\`\`\`

### 6. Checklist PWA

- ✅ Manifest.json complet avec toutes les tailles d'icônes
- ✅ Service Worker enregistré et fonctionnel
- ✅ HTTPS activé (requis pour PWA)
- ✅ Page offline de fallback
- ✅ Stratégies de cache appropriées
- ✅ Prompt d'installation
- ✅ Theme color et splash screens
- ✅ Tests sur mobile (Android/iOS)

Fournis une implémentation PWA complète et production-ready.`
  },

  offlineStrategy: {
    name: 'Stratégie Hors Ligne Avancée',
    description: 'Optimisation expérience offline',
    category: 'pwa',
    strategy: 'deep',
    variables: ['url', 'cacheStrategy', 'offlinePages', 'syncStrategy'],
    tags: ['pwa', 'offline', 'cache', 'sync'],
    template: `# Stratégie Hors Ligne Avancée - {{url}}

## Rôle
Tu es un Expert PWA spécialisé dans les stratégies de cache et la synchronisation hors ligne.

## Stratégie Actuelle

{{#if cacheStrategy}}
**Cache Strategy:** {{cacheStrategy}}
{{/if}}

{{#if offlinePages}}
**Pages Offline:** {{offlinePages}}
{{/if}}

## Demande

Implémente une stratégie hors ligne robuste:

### 1. Stratégies de Cache Workbox

\`\`\`javascript
// sw.js
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate
} from 'workbox-strategies'

// Cache First - Ressources statiques (images, fonts)
// Priorité au cache, fallback réseau
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 jours
      })
    ]
  })
)

// Network First - Contenu dynamique (API)
// Priorité réseau, fallback cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60 // 5 minutes
      })
    ]
  })
)

// Stale While Revalidate - Contenu semi-dynamique
// Cache immédiat + mise à jour en background
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources'
  })
)
\`\`\`

### 2. Background Sync

\`\`\`javascript
// sw.js - Background Sync pour actions utilisateur
import { BackgroundSyncPlugin } from 'workbox-background-sync'

const bgSyncPlugin = new BackgroundSyncPlugin('myQueueName', {
  maxRetentionTime: 24 * 60 // Retry for max 24 hours
})

registerRoute(
  /\\/api\\/submit/,
  new NetworkOnly({
    plugins: [bgSyncPlugin]
  }),
  'POST'
)

// Composable Vue pour sync
// src/composables/useOfflineSync.js
import { ref } from 'vue'

export const useOfflineSync = () => {
  const pendingActions = ref([])

  const queueAction = async (action) => {
    if (!navigator.onLine) {
      pendingActions.value.push(action)
      // Stocker dans IndexedDB
      await saveToIndexedDB(action)
      return { queued: true }
    }

    return executeAction(action)
  }

  const syncPending = async () => {
    if (!navigator.onLine) return

    for (const action of pendingActions.value) {
      try {
        await executeAction(action)
        await removeFromIndexedDB(action.id)
      } catch (error) {
        console.error('Sync failed:', error)
      }
    }

    pendingActions.value = []
  }

  // Auto-sync quand connexion rétablie
  window.addEventListener('online', syncPending)

  return {
    queueAction,
    syncPending,
    pendingActions
  }
}
\`\`\`

### 3. Détection État Connexion

\`\`\`vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isOnline = ref(navigator.onLine)

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})
</script>

<template>
  <div class="app">
    <div v-if="!isOnline" class="offline-banner">
      ⚠️ Vous êtes hors ligne. Certaines fonctionnalités sont limitées.
    </div>

    <!-- Contenu app -->
  </div>
</template>
\`\`\`

### 4. IndexedDB pour Stockage Local

\`\`\`javascript
// src/utils/indexedDB.js
const DB_NAME = 'my-pwa-db'
const DB_VERSION = 1
const STORE_NAME = 'offline-data'

export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export const saveToIndexedDB = async (data) => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.add(data)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const getAllFromIndexedDB = async () => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
\`\`\`

### 5. Optimistic UI Updates

\`\`\`vue
<script setup>
import { ref } from 'vue'
import { useOfflineSync } from '@/composables/useOfflineSync'

const { queueAction } = useOfflineSync()
const items = ref([])
const optimisticItems = ref([])

const addItem = async (item) => {
  // Mise à jour optimiste
  const tempId = \`temp-\${Date.now()}\`
  const optimisticItem = { ...item, id: tempId, pending: true }
  optimisticItems.value.push(optimisticItem)

  try {
    const result = await queueAction({
      type: 'ADD_ITEM',
      data: item
    })

    if (result.queued) {
      // Garder l'item optimiste avec indication
      return
    }

    // Remplacer par l'item réel du serveur
    optimisticItems.value = optimisticItems.value.filter(i => i.id !== tempId)
    items.value.push(result.data)
  } catch (error) {
    // Retirer l'item optimiste en cas d'erreur
    optimisticItems.value = optimisticItems.value.filter(i => i.id !== tempId)
    throw error
  }
}

const allItems = computed(() => [...items.value, ...optimisticItems.value])
</script>

<template>
  <ul>
    <li
      v-for="item in allItems"
      :key="item.id"
      :class="{ 'pending': item.pending }"
    >
      {{ item.name }}
      <span v-if="item.pending" class="sync-indicator">⏳</span>
    </li>
  </ul>
</template>
\`\`\`

### 6. Tests Offline

\`\`\`javascript
// tests/offline.spec.js
import { test, expect } from '@playwright/test'

test.describe('Offline functionality', () => {
  test('should show offline banner when disconnected', async ({ page, context }) => {
    await page.goto('/')

    // Simuler offline
    await context.setOffline(true)

    const banner = page.locator('.offline-banner')
    await expect(banner).toBeVisible()
  })

  test('should cache and serve pages offline', async ({ page, context }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Passer offline
    await context.setOffline(true)

    // Recharger la page
    await page.reload()

    // La page devrait toujours charger
    await expect(page.locator('body')).toBeVisible()
  })
})
\`\`\`

Fournis une stratégie offline complète avec sync et optimistic UI.`
  }
};

export default pwaPrompts;
