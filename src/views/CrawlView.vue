<script setup>
import AppHeader from '@/components/common/AppHeader.vue'
import PageIntro from '@/components/common/PageIntro.vue'
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {CRAWL_SERVICES, CRAWL_STATUS, useCrawlStore} from '@/stores/crawlStore'
import {useSiteStore} from '@/stores/siteStore'
import {useSettingsStore} from '@/stores/settingsStore'
import {DISCOVERY_MODES, isSitemapUrl} from '@/services/urlDiscovery'
import {getProxyBase, isDirectFetch, proxyUrl} from '@/services/requestConfig'
import {checkServerHealth} from '@/services/localLighthouse'
import {usePersistentRef} from '@/composables/usePersistentRef'
import UrlInput from '@/components/input/UrlInput.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import {useI18n} from '@/i18n'
import {useToast} from '@/composables/useToast'
import {useNotifications} from '@/composables/useNotifications'
import {doneProgress, startProgress} from '@/composables/useProgress'

const {t} = useI18n()
const toast = useToast()
const {notifyDone} = useNotifications()
const router = useRouter()
const crawlStore = useCrawlStore()
const site = useSiteStore()
const settings = useSettingsStore()

// PageSpeed sans clé API : le quota anonyme partagé de Google est saturé en
// permanence (HTTP 429), donc l'analyse échoue. On le signale avant de lancer.
const noPageSpeedKey = computed(() => service.value === CRAWL_SERVICES.PAGESPEED && !settings.pageSpeedApiKey)

// Form state
const baseUrl = ref('')
const discoveryMode = ref(DISCOVERY_MODES.AUTO)
const service = ref(CRAWL_SERVICES.PAGESPEED)
const strategy = ref('mobile')
const manualUrls = ref('')
const maxPages = ref(20)

// UI state
const error = ref('')
// Dernière session de crawl (mémorisée) : on offre toujours un lien vers ses résultats,
// même quand le crawl a réussi (on y a navigué) puis qu'on revient sur cette page.
const lastSessionId = usePersistentRef('crawl.lastSessionId', null)
const localServerAvailable = ref(false)
const checkingServer = ref(true)
const showOnboarding = ref(false)
const urlsListRef = ref(null)
const currentUrlRef = ref(null)

// LocalStorage key for preferences
const PREFS_KEY = 'crawl-preferences'

// Load saved preferences
function loadPreferences() {
  try {
    const saved = localStorage.getItem(PREFS_KEY)
    if (saved) {
      const prefs = JSON.parse(saved)
      if (prefs.baseUrl && typeof prefs.baseUrl === 'string') {
        baseUrl.value = prefs.baseUrl
      }
      if (prefs.discoveryMode && Object.values(DISCOVERY_MODES).includes(prefs.discoveryMode)) {
        discoveryMode.value = prefs.discoveryMode
      }
      if (prefs.service && Object.values(CRAWL_SERVICES).includes(prefs.service)) {
        service.value = prefs.service
      }
      if (prefs.strategy && ['mobile', 'desktop'].includes(prefs.strategy)) {
        strategy.value = prefs.strategy
      }
      if (prefs.maxPages && typeof prefs.maxPages === 'number' && prefs.maxPages >= 1 && prefs.maxPages <= 20) {
        maxPages.value = prefs.maxPages
      }
      if (prefs.manualUrls && typeof prefs.manualUrls === 'string') {
        manualUrls.value = prefs.manualUrls
      }
    }
  } catch {
    // Ignore invalid stored preferences
  }
}

// Save preferences to localStorage
function savePreferences() {
  try {
    const prefs = {
      baseUrl: baseUrl.value,
      discoveryMode: discoveryMode.value,
      service: service.value,
      strategy: strategy.value,
      maxPages: maxPages.value,
      manualUrls: manualUrls.value
    }
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Ignore storage errors
  }
}

// Watch for preference changes and save
watch([baseUrl, discoveryMode, service, strategy, maxPages, manualUrls], savePreferences)

// Computed
const isRunning = computed(() => crawlStore.isRunning)
const progress = computed(() => crawlStore.progress)
const currentUrl = computed(() => crawlStore.currentUrl)

// Auto-scroll to current URL being analyzed
watch(currentUrl, () => {
  if (currentUrlRef.value) {
    currentUrlRef.value.scrollIntoView({behavior: 'smooth', block: 'center'})
  }
})
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
      return t('crawl.statusDiscovering', {count: discoveredUrls.value.length})
    case CRAWL_STATUS.ANALYZING:
      return t('crawl.statusAnalyzing', {done: analyzedCount.value, total: discoveredUrls.value.length})
    case CRAWL_STATUS.COMPLETED:
      return t('crawl.statusCompleted')
    case CRAWL_STATUS.PARTIAL:
      return t('crawl.statusPartial')
    case CRAWL_STATUS.CANCELLED:
      return t('crawl.statusCancelled')
    case CRAWL_STATUS.FAILED:
      return t('crawl.statusFailed')
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

// Le mode manuel accepte des URL de sitemap : leur dépliage nécessite le proxy.
const manualHasSitemap = computed(() =>
    manualUrls.value.split('\n').map(l => l.trim()).filter(Boolean).some(isSitemapUrl)
)

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
    const response = await fetch(proxyUrl('/health'), {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    return response.ok
  } catch {
    return false
  }
}

// Indicateur d'état du relais HTTP
const directMode = isDirectFetch()
const relayBase = getProxyBase()
const relayStatus = ref('checking') // 'checking' | 'ok' | 'down' | 'direct'

async function checkRelay() {
  if (directMode) {
    relayStatus.value = 'direct'
    return
  }
  relayStatus.value = (await checkProxyServer()) ? 'ok' : 'down'
}

// Handle form submission
async function handleSubmit() {
  if (!canSubmit.value) return

  // Mémorise le domaine pour les autres écrans
  site.setFromUrl(baseUrl.value)
  error.value = ''
  lastSessionId.value = null

  // Le relais est requis pour Auto/Sitemap, et pour le mode Manuel si la liste
  // contient un sitemap à déplier. En mode direct, aucun relais nécessaire.
  if (!directMode && (discoveryMode.value !== DISCOVERY_MODES.MANUAL || manualHasSitemap.value)) {
    const proxyAvailable = await checkProxyServer()
    if (!proxyAvailable) {
      error.value = t('crawl.errorRelayRequired')
      toast.warning(t('toast.relayUnavailable'), {details: t('crawl.errorRelayRequired')})
      return
    }
  }

  startProgress()
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

    if (session && session.status === CRAWL_STATUS.PARTIAL) {
      toast.warning(t('toast.crawlPartial', {done: session.pagesAnalyzed, total: session.pageCount}))
      notifyDone(t('toast.crawlPartial', {done: session.pagesAnalyzed, total: session.pageCount}), session.domain)
    } else if (session && session.status !== CRAWL_STATUS.FAILED) {
      toast.success(t('toast.crawlDone', {count: session.pagesAnalyzed}))
      notifyDone(t('toast.crawlDone', {count: session.pagesAnalyzed}), session.domain)
    }

    // La session est enregistrée quel que soit le statut → on mémorise un lien
    if (session) lastSessionId.value = session.id
    if (session && session.status !== CRAWL_STATUS.FAILED) {
      router.push(`/crawl/results/${session.id}`)
    }
  } catch (err) {
    error.value = err.message || t('crawl.errorGeneric')
    toast.fromError(t('toast.crawlFailed'), err)
  } finally {
    doneProgress()
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
  loadPreferences()
  // Préremplissage silencieux : à défaut de préférence enregistrée, on part du site actif
  if (!baseUrl.value) baseUrl.value = site.origin
  await crawlStore.initialize()
  await checkLocalServer()
  checkRelay()
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
    <AppHeader :subtitle="$t('crawl.headerSubtitle')" :title="$t('crawl.headerTitle')">
      <template #actions>
        <button
            class="header-btn"
            :title="$t('crawl.guideTooltip')"
            type="button"
            @click="showOnboarding = true"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
          <span class="hidden sm:inline">{{ $t('crawl.guide') }}</span>
        </button>
        <router-link
            class="header-btn"
            :title="$t('crawl.historyTooltip')"
            to="/crawl/history"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
          <span class="hidden sm:inline">{{ $t('crawl.history') }}</span>
        </router-link>
      </template>
    </AppHeader>

    <PageIntro :text="$t('intro.crawl')" width="3xl"/>

    <!-- Main content -->
    <main class="flex-1 p-4">
      <div class="max-w-3xl mx-auto">
        <!-- Indicateur d'état du relais HTTP -->
        <div
            v-if="!isRunning"
            :class="{
              'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300': relayStatus === 'ok' || relayStatus === 'direct',
              'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300': relayStatus === 'down',
              'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400': relayStatus === 'checking'
            }"
            class="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
        >
          <span
              :class="{
                'bg-emerald-500': relayStatus === 'ok' || relayStatus === 'direct',
                'bg-amber-500': relayStatus === 'down',
                'bg-gray-400 animate-pulse': relayStatus === 'checking'
              }"
              class="w-2 h-2 rounded-full"
          ></span>
          <span v-if="relayStatus === 'direct'">{{ $t('crawl.relayDirect') }}</span>
          <span v-else-if="relayStatus === 'ok'">{{ relayBase ? $t('crawl.relayOkWith', { base: relayBase }) : $t('crawl.relayOkIntegrated') }}</span>
          <span v-else-if="relayStatus === 'down'">{{ $t('crawl.relayDown') }}</span>
          <span v-else>{{ $t('crawl.relayChecking') }}</span>
        </div>

        <!-- Loading/Progress state -->
        <div v-if="isRunning" class="py-12">
          <!-- Progress header -->
          <div class="text-center mb-8">
            <LoadingSpinner :progress="progressPercentage" size="xl"/>
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
                <div :class="progress.stage === 'discovering'
                    ? 'bg-emerald-500 text-white'
                    : progress.stage === 'analyzing' || progress.stage === 'completed'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'"
                     class="w-6 h-6 rounded-full flex items-center justify-center"
                >
                  <svg v-if="progress.stage !== 'discovering'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                  <span v-else class="text-xs">1</span>
                </div>
                <span :class="progress.stage === 'discovering' ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'">
                  {{ $t('crawl.stepDiscovery') }}
                </span>
              </div>

              <div class="flex-1 h-0.5 mx-4 bg-gray-200 dark:bg-gray-700">
                <div :style="{ width: progress.stage === 'discovering' ? '50%' : progress.stage !== 'idle' ? '100%' : '0%' }"
                     class="h-full bg-emerald-500 transition-all"
                ></div>
              </div>

              <div class="flex items-center gap-2">
                <div :class="progress.stage === 'analyzing'
                    ? 'bg-emerald-500 text-white'
                    : progress.stage === 'completed'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'"
                     class="w-6 h-6 rounded-full flex items-center justify-center"
                >
                  <svg v-if="progress.stage === 'completed'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                  <span v-else class="text-xs">2</span>
                </div>
                <span :class="progress.stage === 'analyzing' ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'">
                  {{ $t('crawl.stepAnalysis') }}
                </span>
              </div>
            </div>
          </div>

          <!-- Discovered URLs list -->
          <div v-if="discoveredUrls.length > 0" class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {{ $t('crawl.discoveredUrls', { count: discoveredUrls.length }) }}
            </h3>
            <div ref="urlsListRef" class="max-h-40 overflow-y-auto space-y-1">
              <div
                  v-for="(url, index) in discoveredUrls"
                  :key="url"
                  :ref="url === currentUrl ? (el) => currentUrlRef = el : undefined"
                  class="flex items-center gap-2 text-sm"
              >
                <span class="w-5 text-right text-gray-400 dark:text-gray-500">{{ index + 1 }}.</span>
                <span
                    :class="crawlResults.some(r => r.url === url)
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : url === currentUrl
                      ? 'text-gray-900 dark:text-white font-medium'
                      : 'text-gray-500 dark:text-gray-400'"
                    class="truncate"
                >
                  {{ url }}
                </span>
                <svg v-if="crawlResults.some(r => r.url === url)" class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
                <LoadingSpinner v-else-if="url === currentUrl" class="flex-shrink-0" size="sm"/>
              </div>
            </div>
          </div>

          <!-- Cancel button -->
          <div class="text-center">
            <button
                class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
                type="button"
                @click="handleCancel"
            >
              {{ $t('common.cancel') }}
            </button>
          </div>
        </div>

        <!-- Configuration form -->
        <div v-else>
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {{ $t('crawl.formTitle') }}
            </h2>
            <p class="text-gray-500 dark:text-gray-400">
              {{ $t('crawl.formSubtitle') }}
            </p>
          </div>

          <!-- Error alert -->
          <ErrorAlert
              v-if="error || crawlStore.error"
              :message="error || crawlStore.error"
              class="mb-6"
              dismissible
              :title="$t('crawl.errorTitle')"
              type="error"
              @dismiss="handleDismissError"
          />

          <!-- Lien vers les derniers résultats (même après un crawl réussi) -->
          <div v-if="lastSessionId" class="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span class="text-gray-500 dark:text-gray-400">{{ $t('crawl.lastCrawl') }}</span>
            <router-link
                :to="`/crawl/results/${lastSessionId}`"
                class="font-medium text-primary-600 dark:text-primary-400 hover:underline"
            >
              {{ $t('crawl.viewResults') }} →
            </router-link>
            <router-link
                :to="{ path: '/history', query: { tab: 'crawls' } }"
                class="font-medium text-primary-600 dark:text-primary-400 hover:underline"
            >
              {{ $t('crawl.viewInHistory') }} →
            </router-link>
          </div>

          <div class="space-y-6">
            <!-- URL Input -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ $t('crawl.baseUrlLabel') }}
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
                {{ $t('crawl.discoveryModeLabel') }}
              </label>
              <div class="grid grid-cols-3 gap-3">
                <button
                    :class="discoveryMode === DISCOVERY_MODES.AUTO
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
                    class="p-4 rounded-lg border-2 text-left transition-all"
                    type="button"
                    @click="discoveryMode = DISCOVERY_MODES.AUTO"
                >
                  <svg :class="discoveryMode === DISCOVERY_MODES.AUTO ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'" class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                  <div class="font-medium text-gray-900 dark:text-white">{{ $t('crawl.modeAuto') }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ $t('crawl.modeAutoDesc') }}</div>
                </button>

                <button
                    :class="discoveryMode === DISCOVERY_MODES.SITEMAP
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
                    class="p-4 rounded-lg border-2 text-left transition-all"
                    type="button"
                    @click="discoveryMode = DISCOVERY_MODES.SITEMAP"
                >
                  <svg :class="discoveryMode === DISCOVERY_MODES.SITEMAP ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'" class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                  <div class="font-medium text-gray-900 dark:text-white">{{ $t('crawl.modeSitemap') }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ $t('crawl.modeSitemapDesc') }}</div>
                </button>

                <button
                    :class="discoveryMode === DISCOVERY_MODES.MANUAL
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
                    class="p-4 rounded-lg border-2 text-left transition-all"
                    type="button"
                    @click="discoveryMode = DISCOVERY_MODES.MANUAL"
                >
                  <svg :class="discoveryMode === DISCOVERY_MODES.MANUAL ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'" class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                  <div class="font-medium text-gray-900 dark:text-white">{{ $t('crawl.modeManual') }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ $t('crawl.modeManualDesc') }}</div>
                </button>
              </div>
            </div>

            <!-- Manual URLs textarea -->
            <div v-if="discoveryMode === DISCOVERY_MODES.MANUAL">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ $t('crawl.manualUrlsLabel') }}
              </label>
              <textarea
                  v-model="manualUrls"
                  class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="https://example.com/page-1
https://example.com/page-2
https://example.com/sitemap.xml"
                  rows="6"
              ></textarea>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ $t('crawl.manualUrlsHint', { count: maxPages }) }}
              </p>
            </div>

            <!-- Service selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ $t('crawl.serviceLabel') }}
              </label>
              <div class="grid grid-cols-2 gap-3">
                <button
                    :class="service === CRAWL_SERVICES.PAGESPEED
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
                    class="p-4 rounded-lg border-2 text-left transition-all"
                    type="button"
                    @click="service = CRAWL_SERVICES.PAGESPEED"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <svg :class="service === CRAWL_SERVICES.PAGESPEED ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span class="font-medium text-gray-900 dark:text-white">{{ $t('crawl.pageSpeedName') }}</span>
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ $t('crawl.pageSpeedDesc') }}</div>
                </button>

                <button
                    :class="[
                    service === CRAWL_SERVICES.LOCAL
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                    !localServerAvailable && 'opacity-60'
                  ]"
                    :disabled="!localServerAvailable"
                    class="p-4 rounded-lg border-2 text-left transition-all relative"
                    type="button"
                    @click="localServerAvailable && (service = CRAWL_SERVICES.LOCAL)"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <svg :class="service === CRAWL_SERVICES.LOCAL ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                    </svg>
                    <span class="font-medium text-gray-900 dark:text-white">{{ $t('crawl.localName') }}</span>
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ $t('crawl.localDesc') }}</div>

                  <!-- Server status -->
                  <div v-if="checkingServer" class="absolute top-2 right-2">
                    <LoadingSpinner size="sm"/>
                  </div>
                  <div v-else-if="!localServerAvailable" class="absolute top-2 right-2 text-xs text-orange-500">
                    {{ $t('crawl.serverUnavailable') }}
                  </div>
                  <div v-else class="absolute top-2 right-2 text-xs text-emerald-500">
                    {{ $t('crawl.serverOnline') }}
                  </div>
                </button>
              </div>

              <!-- Avertissement : PageSpeed sans clé API -->
              <p
                  v-if="noPageSpeedKey"
                  class="mt-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2"
              >
                {{ $t('crawl.noKeyWarning') }}
                <router-link class="font-medium text-primary-600 dark:text-primary-400 hover:underline" to="/settings">
                  {{ $t('crawl.noKeyWarningLink') }} →
                </router-link>
              </p>
            </div>

            <!-- Strategy -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ $t('crawl.strategyLabel') }}
              </label>
              <div class="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                <button
                    :class="strategy === 'mobile'
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
                    class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                    type="button"
                    @click="strategy = 'mobile'"
                >
                  <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                  {{ $t('common.mobile') }}
                </button>
                <button
                    :class="strategy === 'desktop'
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
                    class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                    type="button"
                    @click="strategy = 'desktop'"
                >
                  <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                  {{ $t('common.desktop') }}
                </button>
              </div>
            </div>

            <!-- Max pages slider -->
            <div class="max-pages-section">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {{ $t('crawl.maxPagesLabel') }}
              </label>
              <div class="flex items-center gap-4">
                <input
                    v-model.number="maxPages"
                    class="flex-1 h-2 rounded-lg appearance-none cursor-pointer slider-track"
                    max="20"
                    min="1"
                    type="range"
                />
                <div class="w-14 h-10 flex items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                  <span class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ maxPages }}</span>
                </div>
              </div>
              <div class="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-2 px-1">
                <span>{{ $t('crawl.onePage') }}</span>
                <span>{{ $t('crawl.twentyPages') }}</span>
              </div>
            </div>

            <!-- Submit button -->
            <button
                :disabled="!canSubmit"
                class="submit-crawl-button w-full"
                type="button"
                @click="handleSubmit"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <span>{{ $t('crawl.submit') }}</span>
            </button>
          </div>

          <!-- Info box -->
          <div class="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div class="flex gap-3">
              <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <div class="text-sm text-blue-700 dark:text-blue-300">
                <p class="font-medium mb-1">{{ $t('crawl.aboutTitle') }}</p>
                <p>
                  {{ $t('crawl.aboutText') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Rate limiting warning -->
          <div class="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div class="flex gap-3">
              <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <div class="text-sm text-amber-700 dark:text-amber-300">
                <p class="font-medium mb-1">{{ $t('crawl.execTimeTitle') }}</p>
                <p>
                  {{ $t('crawl.execTimeText', { count: maxPages, min: Math.ceil(maxPages * 1.5 / 60), max: Math.ceil(maxPages * 2 / 60) + 1 }) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Onboarding Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showOnboarding" class="modal-overlay" @click.self="showOnboarding = false">
          <div class="modal-content">
            <!-- Header -->
            <div class="modal-header">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ $t('crawl.guideModalTitle') }}</h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('crawl.guideModalSubtitle') }}</p>
                </div>
              </div>
              <button
                  class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  type="button"
                  @click="showOnboarding = false"
              >
                <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </button>
            </div>

            <!-- Content -->
            <div class="modal-body">
              <!-- Discovery modes -->
              <div class="guide-section">
                <h4 class="guide-section-title">
                  <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                  {{ $t('crawl.guideDiscoveryTitle') }}
                </h4>

                <div class="guide-grid">
                  <div class="guide-card guide-card-warning">
                    <div class="guide-card-header">
                      <span class="guide-card-badge guide-card-badge-warning">{{ $t('crawl.guideServerRequired') }}</span>
                      <strong>{{ $t('crawl.modeAuto') }}</strong>
                    </div>
                    <p>{{ $t('crawl.guideAutoDesc') }}</p>
                  </div>

                  <div class="guide-card guide-card-warning">
                    <div class="guide-card-header">
                      <span class="guide-card-badge guide-card-badge-warning">{{ $t('crawl.guideServerRequired') }}</span>
                      <strong>{{ $t('crawl.modeSitemap') }}</strong>
                    </div>
                    <p>{{ $t('crawl.guideSitemapDesc') }}</p>
                  </div>

                  <div class="guide-card guide-card-success">
                    <div class="guide-card-header">
                      <span class="guide-card-badge guide-card-badge-success">{{ $t('crawl.guideNoServer') }}</span>
                      <strong>{{ $t('crawl.modeManual') }}</strong>
                    </div>
                    <p>{{ $t('crawl.guideManualDesc') }}</p>
                  </div>
                </div>
              </div>

              <!-- Analysis services -->
              <div class="guide-section">
                <h4 class="guide-section-title">
                  <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                  {{ $t('crawl.guideServicesTitle') }}
                </h4>

                <div class="guide-grid">
                  <div class="guide-card guide-card-success">
                    <div class="guide-card-header">
                      <span class="guide-card-badge guide-card-badge-success">{{ $t('crawl.guideNoServer') }}</span>
                      <strong>{{ $t('crawl.pageSpeedName') }}</strong>
                    </div>
                    <p>{{ $t('crawl.guidePageSpeedDesc') }}</p>
                  </div>

                  <div class="guide-card guide-card-warning">
                    <div class="guide-card-header">
                      <span class="guide-card-badge guide-card-badge-warning">{{ $t('crawl.guideServerRequired') }}</span>
                      <strong>{{ $t('crawl.localName') }}</strong>
                    </div>
                    <p>{{ $t('crawl.guideLocalDesc') }}</p>
                  </div>
                </div>
              </div>

              <!-- Compatibility table -->
              <div class="guide-section">
                <h4 class="guide-section-title">
                  <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                  {{ $t('crawl.guideCompatTitle') }}
                </h4>

                <div class="overflow-x-auto">
                  <table class="guide-table">
                    <thead>
                      <tr>
                        <th>{{ $t('crawl.guideColDiscovery') }}</th>
                        <th>{{ $t('crawl.guideColService') }}</th>
                        <th>{{ $t('crawl.guideColServer') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{{ $t('crawl.modeManual') }}</td>
                        <td>{{ $t('crawl.pageSpeedName') }}</td>
                        <td><span class="text-emerald-600 dark:text-emerald-400 font-medium">{{ $t('crawl.guideNotRequired') }}</span></td>
                      </tr>
                      <tr>
                        <td>{{ $t('crawl.modeManual') }}</td>
                        <td>{{ $t('crawl.localName') }}</td>
                        <td><span class="text-amber-600 dark:text-amber-400 font-medium">{{ $t('crawl.guideRequired') }}</span></td>
                      </tr>
                      <tr>
                        <td>{{ $t('crawl.guideAutoSitemap') }}</td>
                        <td>{{ $t('crawl.pageSpeedName') }}</td>
                        <td><span class="text-amber-600 dark:text-amber-400 font-medium">{{ $t('crawl.guideRequired') }}</span></td>
                      </tr>
                      <tr>
                        <td>{{ $t('crawl.guideAutoSitemap') }}</td>
                        <td>{{ $t('crawl.localName') }}</td>
                        <td><span class="text-amber-600 dark:text-amber-400 font-medium">{{ $t('crawl.guideRequired') }}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Server instructions -->
              <div class="guide-section">
                <h4 class="guide-section-title">
                  <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                  {{ $t('crawl.guideServerTitle') }}
                </h4>

                <div class="guide-code">
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{{ $t('crawl.guideFirstInstall') }}</p>
                  <code class="guide-code-block">npm run server:install</code>

                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-2 mt-4">{{ $t('crawl.guideStart') }}</p>
                  <code class="guide-code-block">npm run server</code>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer">
              <button
                  class="btn-primary"
                  type="button"
                  @click="showOnboarding = false"
              >
                {{ $t('crawl.guideUnderstood') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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

/* Header buttons */
.header-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  text-decoration: none;
}

.header-btn:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border-color: var(--border-secondary);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
}

.modal-content {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 1rem;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-primary);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-primary);
  display: flex;
  justify-content: flex-end;
}

/* Guide sections */
.guide-section {
  margin-bottom: 1.5rem;
}

.guide-section:last-child {
  margin-bottom: 0;
}

.guide-section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.guide-card {
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
}

.guide-card p {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  line-height: 1.5;
  margin: 0;
}

.guide-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.guide-card-header strong {
  color: var(--text-primary);
  font-size: 0.9375rem;
}

.guide-card-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.guide-card-badge-success {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.guide-card-badge-warning {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

html.dark .guide-card-badge-success {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

html.dark .guide-card-badge-warning {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.guide-card-success {
  border-color: rgba(16, 185, 129, 0.3);
}

.guide-card-warning {
  border-color: rgba(245, 158, 11, 0.3);
}

/* Guide table */
.guide-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.guide-table th,
.guide-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-primary);
}

.guide-table th {
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-secondary);
}

.guide-table td {
  color: var(--text-primary);
}

.guide-table tbody tr:hover {
  background: var(--bg-secondary);
}

/* Guide code */
.guide-code-block {
  display: block;
  padding: 0.75rem 1rem;
  background: #1f2937;
  color: #34d399;
  border-radius: 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
}

/* Primary button */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px -2px rgba(16, 185, 129, 0.4);
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95) translateY(10px);
}
</style>
