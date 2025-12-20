<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCrawlStore, CRAWL_SERVICES, CRAWL_STATUS } from '@/stores/crawlStore'
import { DISCOVERY_MODES } from '@/services/urlDiscovery'
import { checkServerHealth } from '@/services/localLighthouse'
import UrlInput from '@/components/input/UrlInput.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'

const router = useRouter()
const crawlStore = useCrawlStore()

// Form state
const baseUrl = ref('')
const discoveryMode = ref(DISCOVERY_MODES.AUTO)
const service = ref(CRAWL_SERVICES.PAGESPEED)
const strategy = ref('mobile')
const manualUrls = ref('')
const maxPages = ref(20)

// UI state
const error = ref('')
const localServerAvailable = ref(false)
const checkingServer = ref(true)

// Computed
const isRunning = computed(() => crawlStore.isRunning)
const progress = computed(() => crawlStore.progress)
const currentUrl = computed(() => crawlStore.currentUrl)
const discoveredUrls = computed(() => crawlStore.discoveredUrls)
const analyzedCount = computed(() => crawlStore.analyzedCount)
const crawlResults = computed(() => crawlStore.crawlResults)

const progressPercentage = computed(() => {
  if (progress.value.stage === 'discovering') {
    return Math.min(30, (progress.value.current / 20) * 30)
  }
  if (progress.value.stage === 'analyzing') {
    return 30 + (progress.value.percentage * 0.7)
  }
  if (progress.value.stage === 'completed') return 100
  return 0
})

const statusText = computed(() => {
  switch (crawlStore.crawlStatus) {
    case CRAWL_STATUS.DISCOVERING:
      return `Decouverte des URLs... (${discoveredUrls.value.length})`
    case CRAWL_STATUS.ANALYZING:
      return `Analyse en cours... (${analyzedCount.value}/${discoveredUrls.value.length})`
    case CRAWL_STATUS.COMPLETED:
      return 'Analyse terminee !'
    case CRAWL_STATUS.PARTIAL:
      return 'Analyse partielle terminee'
    case CRAWL_STATUS.CANCELLED:
      return 'Analyse annulee'
    case CRAWL_STATUS.FAILED:
      return 'Echec de l\'analyse'
    default:
      return ''
  }
})

const canSubmit = computed(() => {
  if (!baseUrl.value) return false
  if (discoveryMode.value === DISCOVERY_MODES.MANUAL) {
    const urls = manualUrls.value.split('\n').filter(u => u.trim())
    return urls.length > 0
  }
  return true
})

// Check local server availability
async function checkLocalServer() {
  checkingServer.value = true
  try {
    const health = await checkServerHealth()
    localServerAvailable.value = health.available && health.chromium
  } catch {
    localServerAvailable.value = false
  } finally {
    checkingServer.value = false
  }
}

// Check if proxy server is available
async function checkProxyServer() {
  try {
    const response = await fetch('http://localhost:3001/health', {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    return response.ok
  } catch {
    return false
  }
}

// Handle form submission
async function handleSubmit() {
  if (!canSubmit.value) return

  error.value = ''

  // For Auto and Sitemap modes, check if proxy server is available
  if (discoveryMode.value !== DISCOVERY_MODES.MANUAL) {
    const proxyAvailable = await checkProxyServer()
    if (!proxyAvailable) {
      error.value = 'Le serveur local n\'est pas disponible. Demarrez-le avec "npm run server" (ou "npm run server:install" si premiere fois), ou utilisez le mode Manuel.'
      return
    }
  }

  try {
    const config = {
      baseUrl: baseUrl.value,
      discoveryMode: discoveryMode.value,
      service: service.value,
      strategy: strategy.value,
      maxPages: maxPages.value,
      urlList: discoveryMode.value === DISCOVERY_MODES.MANUAL ? manualUrls.value : ''
    }

    const session = await crawlStore.startCrawl(config)

    if (session && session.status !== CRAWL_STATUS.FAILED) {
      router.push(`/crawl/results/${session.id}`)
    }
  } catch (err) {
    error.value = err.message || 'Une erreur est survenue lors du crawl'
  }
}

// Handle cancel
function handleCancel() {
  crawlStore.cancelCrawl()
}

// Handle error dismiss
function handleDismissError() {
  error.value = ''
  crawlStore.resetCrawl()
}

// Initialize
onMounted(async () => {
  await crawlStore.initialize()
  await checkLocalServer()
})

onUnmounted(() => {
  // Don't reset if navigating to results
  if (!router.currentRoute.value.path.includes('/crawl/results')) {
    crawlStore.resetCrawl()
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="border-b border-gray-200 dark:border-gray-800">
      <div class="max-w-5xl mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <router-link to="/" class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div>
                <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                  Mode Crawl
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Analyse multi-pages par templates
                </p>
              </div>
            </router-link>
          </div>

          <div class="flex items-center gap-2">
            <router-link
              to="/crawl/history"
              class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Historique
            </router-link>
            <router-link
              to="/settings"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </router-link>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 p-4">
      <div class="max-w-3xl mx-auto">
        <!-- Loading/Progress state -->
        <div v-if="isRunning" class="py-12">
          <!-- Progress header -->
          <div class="text-center mb-8">
            <LoadingSpinner size="xl" :progress="progressPercentage" />
            <p class="mt-6 text-lg font-medium text-gray-900 dark:text-white">
              {{ statusText }}
            </p>
            <p v-if="currentUrl" class="mt-2 text-sm text-gray-500 dark:text-gray-400 truncate max-w-md mx-auto">
              {{ currentUrl }}
            </p>
          </div>

          <!-- Progress steps -->
          <div class="max-w-md mx-auto mb-8">
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full flex items-center justify-center"
                  :class="progress.stage === 'discovering'
                    ? 'bg-emerald-500 text-white'
                    : progress.stage === 'analyzing' || progress.stage === 'completed'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'"
                >
                  <svg v-if="progress.stage !== 'discovering'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span v-else class="text-xs">1</span>
                </div>
                <span :class="progress.stage === 'discovering' ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500'">
                  Decouverte
                </span>
              </div>

              <div class="flex-1 h-0.5 mx-4 bg-gray-200 dark:bg-gray-700">
                <div class="h-full bg-emerald-500 transition-all"
                  :style="{ width: progress.stage === 'discovering' ? '50%' : progress.stage !== 'idle' ? '100%' : '0%' }"
                ></div>
              </div>

              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full flex items-center justify-center"
                  :class="progress.stage === 'analyzing'
                    ? 'bg-emerald-500 text-white'
                    : progress.stage === 'completed'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'"
                >
                  <svg v-if="progress.stage === 'completed'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span v-else class="text-xs">2</span>
                </div>
                <span :class="progress.stage === 'analyzing' ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500'">
                  Analyse
                </span>
              </div>
            </div>
          </div>

          <!-- Discovered URLs list -->
          <div v-if="discoveredUrls.length > 0" class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              URLs decouvertes ({{ discoveredUrls.length }})
            </h3>
            <div class="max-h-40 overflow-y-auto space-y-1">
              <div
                v-for="(url, index) in discoveredUrls"
                :key="url"
                class="flex items-center gap-2 text-sm"
              >
                <span class="w-5 text-right text-gray-400">{{ index + 1 }}.</span>
                <span
                  class="truncate"
                  :class="crawlResults.some(r => r.url === url)
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : url === currentUrl
                      ? 'text-gray-900 dark:text-white font-medium'
                      : 'text-gray-500'"
                >
                  {{ url }}
                </span>
                <svg v-if="crawlResults.some(r => r.url === url)" class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <LoadingSpinner v-else-if="url === currentUrl" size="sm" class="flex-shrink-0" />
              </div>
            </div>
          </div>

          <!-- Cancel button -->
          <div class="text-center">
            <button
              type="button"
              class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
              @click="handleCancel"
            >
              Annuler
            </button>
          </div>
        </div>

        <!-- Configuration form -->
        <div v-else>
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Crawler de site multi-pages
            </h2>
            <p class="text-gray-500 dark:text-gray-400">
              Analysez plusieurs pages et obtenez des scores agreges par template
            </p>
          </div>

          <!-- Error alert -->
          <ErrorAlert
            v-if="error || crawlStore.error"
            type="error"
            title="Erreur de crawl"
            :message="error || crawlStore.error"
            dismissible
            class="mb-6"
            @dismiss="handleDismissError"
          />

          <div class="space-y-6">
            <!-- URL Input -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                URL de base
              </label>
              <UrlInput
                v-model="baseUrl"
                :loading="false"
                placeholder="https://example.com"
                @submit="handleSubmit"
              />
            </div>

            <!-- Discovery mode -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mode de decouverte des URLs
              </label>
              <div class="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  class="p-4 rounded-lg border-2 text-left transition-all"
                  :class="discoveryMode === DISCOVERY_MODES.AUTO
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
                  @click="discoveryMode = DISCOVERY_MODES.AUTO"
                >
                  <svg class="w-6 h-6 mb-2" :class="discoveryMode === DISCOVERY_MODES.AUTO ? 'text-emerald-500' : 'text-gray-400'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <div class="font-medium text-gray-900 dark:text-white">Auto</div>
                  <div class="text-xs text-gray-500 mt-1">Suit les liens internes</div>
                </button>

                <button
                  type="button"
                  class="p-4 rounded-lg border-2 text-left transition-all"
                  :class="discoveryMode === DISCOVERY_MODES.SITEMAP
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
                  @click="discoveryMode = DISCOVERY_MODES.SITEMAP"
                >
                  <svg class="w-6 h-6 mb-2" :class="discoveryMode === DISCOVERY_MODES.SITEMAP ? 'text-emerald-500' : 'text-gray-400'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div class="font-medium text-gray-900 dark:text-white">Sitemap</div>
                  <div class="text-xs text-gray-500 mt-1">Parse sitemap.xml</div>
                </button>

                <button
                  type="button"
                  class="p-4 rounded-lg border-2 text-left transition-all"
                  :class="discoveryMode === DISCOVERY_MODES.MANUAL
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
                  @click="discoveryMode = DISCOVERY_MODES.MANUAL"
                >
                  <svg class="w-6 h-6 mb-2" :class="discoveryMode === DISCOVERY_MODES.MANUAL ? 'text-emerald-500' : 'text-gray-400'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <div class="font-medium text-gray-900 dark:text-white">Manuel</div>
                  <div class="text-xs text-gray-500 mt-1">Liste d'URLs</div>
                </button>
              </div>
            </div>

            <!-- Manual URLs textarea -->
            <div v-if="discoveryMode === DISCOVERY_MODES.MANUAL">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Liste des URLs (une par ligne)
              </label>
              <textarea
                v-model="manualUrls"
                rows="6"
                class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="https://example.com/page-1
https://example.com/page-2
https://example.com/page-3"
              ></textarea>
              <p class="mt-1 text-xs text-gray-500">
                Maximum {{ maxPages }} URLs. Les lignes commencant par # sont ignorees.
              </p>
            </div>

            <!-- Service selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service d'analyse
              </label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  class="p-4 rounded-lg border-2 text-left transition-all"
                  :class="service === CRAWL_SERVICES.PAGESPEED
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
                  @click="service = CRAWL_SERVICES.PAGESPEED"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <svg class="w-5 h-5" :class="service === CRAWL_SERVICES.PAGESPEED ? 'text-emerald-500' : 'text-gray-400'" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span class="font-medium text-gray-900 dark:text-white">PageSpeed Insights</span>
                  </div>
                  <div class="text-xs text-gray-500">API Google, pas de serveur local requis</div>
                </button>

                <button
                  type="button"
                  class="p-4 rounded-lg border-2 text-left transition-all relative"
                  :class="[
                    service === CRAWL_SERVICES.LOCAL
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                    !localServerAvailable && 'opacity-60'
                  ]"
                  :disabled="!localServerAvailable"
                  @click="localServerAvailable && (service = CRAWL_SERVICES.LOCAL)"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <svg class="w-5 h-5" :class="service === CRAWL_SERVICES.LOCAL ? 'text-emerald-500' : 'text-gray-400'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                    <span class="font-medium text-gray-900 dark:text-white">Local Lighthouse</span>
                  </div>
                  <div class="text-xs text-gray-500">Serveur local, plus rapide</div>

                  <!-- Server status -->
                  <div v-if="checkingServer" class="absolute top-2 right-2">
                    <LoadingSpinner size="sm" />
                  </div>
                  <div v-else-if="!localServerAvailable" class="absolute top-2 right-2 text-xs text-orange-500">
                    Serveur non disponible
                  </div>
                  <div v-else class="absolute top-2 right-2 text-xs text-emerald-500">
                    En ligne
                  </div>
                </button>
              </div>
            </div>

            <!-- Strategy -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Strategie
              </label>
              <div class="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                  :class="strategy === 'mobile'
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
                  @click="strategy = 'mobile'"
                >
                  <svg class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Mobile
                </button>
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                  :class="strategy === 'desktop'
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
                  @click="strategy = 'desktop'"
                >
                  <svg class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Desktop
                </button>
              </div>
            </div>

            <!-- Max pages slider -->
            <div class="max-pages-section">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Nombre maximum de pages
              </label>
              <div class="flex items-center gap-4">
                <input
                  v-model.number="maxPages"
                  type="range"
                  min="1"
                  max="20"
                  class="flex-1 h-2 rounded-lg appearance-none cursor-pointer slider-track"
                />
                <div class="w-14 h-10 flex items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                  <span class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ maxPages }}</span>
                </div>
              </div>
              <div class="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-2 px-1">
                <span>1 page</span>
                <span>20 pages</span>
              </div>
            </div>

            <!-- Submit button -->
            <button
              type="button"
              class="submit-crawl-button w-full"
              :disabled="!canSubmit"
              @click="handleSubmit"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span>Lancer le crawl</span>
            </button>
          </div>

          <!-- Info box -->
          <div class="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div class="flex gap-3">
              <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="text-sm text-blue-700 dark:text-blue-300">
                <p class="font-medium mb-1">A propos du mode Crawl</p>
                <p>
                  Le crawl analyse plusieurs pages de votre site et detecte automatiquement
                  les types de templates (page d'accueil, fiche produit, listing...).
                  Les scores sont agreges par template et par domaine.
                </p>
              </div>
            </div>
          </div>

          <!-- Rate limiting warning -->
          <div class="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div class="flex gap-3">
              <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div class="text-sm text-amber-700 dark:text-amber-300">
                <p class="font-medium mb-1">Temps d'execution</p>
                <p>
                  L'analyse de {{ maxPages }} pages peut prendre environ {{ Math.ceil(maxPages * 1.5 / 60) }}-{{ Math.ceil(maxPages * 2 / 60) + 1 }} minutes
                  en raison des limitations de debit de l'API.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Submit button with gradient */
.submit-crawl-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-crawl-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -4px rgba(16, 185, 129, 0.4);
}

.submit-crawl-button:disabled {
  background: var(--text-muted);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Slider styling */
.slider-track {
  background: linear-gradient(to right, #10b981 0%, #10b981 calc(var(--value, 100) * 1%), #e5e7eb calc(var(--value, 100) * 1%), #e5e7eb 100%);
  background: var(--bg-tertiary);
}

.slider-track::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  cursor: pointer;
  border: 3px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: transform 0.15s ease;
}

.slider-track::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.slider-track::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  cursor: pointer;
  border: 3px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

/* Dark mode slider track */
html.dark .slider-track {
  background: var(--bg-tertiary);
}

html.dark .slider-track::-webkit-slider-thumb {
  border-color: #374151;
}

html.dark .slider-track::-moz-range-thumb {
  border-color: #374151;
}
</style>
