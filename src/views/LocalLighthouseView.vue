<script setup>
import AppHeader from '@/components/common/AppHeader.vue'
import PageIntro from '@/components/common/PageIntro.vue'
import {computed, onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {useLighthouseStore} from '@/stores/lighthouseStore'
import {useSiteStore} from '@/stores/siteStore'
import {usePersistentRef} from '@/composables/usePersistentRef'
import {useScopedPersistentRef} from '@/composables/useScopedPersistentRef'
import UrlInput from '@/components/input/UrlInput.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import {analyzeUrl, checkServerHealth, getEstimatedTime, STRATEGIES} from '@/services/localLighthouse'
import {useI18n} from '@/i18n'

const {t} = useI18n()
const router = useRouter()
const lighthouseStore = useLighthouseStore()
const site = useSiteStore()

// Préremplissage silencieux à partir du site actif
const url = useScopedPersistentRef('localLighthouse.url', () => site.lastUrl || site.origin)
const loading = ref(false)
const error = ref('')
const progress = ref(0)
const strategy = usePersistentRef('local.strategy', STRATEGIES.MOBILE)

// Server health state
const serverAvailable = ref(false)
const serverChecking = ref(true)

const estimatedTime = computed(() => getEstimatedTime())

let abortController = null

// Check server health on mount
onMounted(async () => {
  await checkServer()
})

async function checkServer() {
  serverChecking.value = true
  const health = await checkServerHealth()
  serverAvailable.value = health.available && health.chromium
  serverChecking.value = false
}

async function handleSubmit(inputUrl) {
  // Mémorise le domaine pour les autres écrans
  site.setFromUrl(inputUrl)
  loading.value = true
  error.value = ''
  progress.value = 0

  // Create abort controller for cancellation
  abortController = new AbortController()

  // Simulate progress (we could add real progress via WebSocket later)
  const progressInterval = setInterval(() => {
    if (progress.value < 90) {
      progress.value += Math.random() * 8
    }
  }, 800)

  try {
    const report = await analyzeUrl(inputUrl, {
      strategy: strategy.value,
      signal: abortController.signal
    })

    clearInterval(progressInterval)
    progress.value = 100

    // Load report into store
    await lighthouseStore.loadFromLocal(report, inputUrl, strategy.value)

    // Store in localStorage for persistence
    localStorage.setItem('current-report', JSON.stringify(report))

    // Navigate to dashboard
    router.push('/dashboard')
  } catch (err) {
    clearInterval(progressInterval)
    error.value = err.message || t('localLighthouse.genericError')
    loading.value = false
    progress.value = 0
  }
}

function handleCancel() {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  loading.value = false
  progress.value = 0
}

function handleDismissError() {
  error.value = ''
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <AppHeader :subtitle="$t('localLighthouse.headerSubtitle')" :title="$t('localLighthouse.headerTitle')"/>

    <!-- Main content -->
    <PageIntro :text="$t('intro.local')" width="4xl"/>

    <main class="flex-1 flex items-center justify-center p-4">
      <div class="w-full max-w-2xl">
        <!-- Checking server -->
        <div v-if="serverChecking" class="text-center py-12">
          <LoadingSpinner size="lg" :text="$t('localLighthouse.checkingServer')"/>
        </div>

        <!-- Server not available -->
        <div v-else-if="!serverAvailable" class="text-center py-12">
          <div class="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {{ $t('localLighthouse.serverUnavailableTitle') }}
          </h2>
          <p class="text-gray-500 dark:text-gray-400 mb-6">
            {{ $t('localLighthouse.serverUnavailableBody') }}
          </p>

          <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
            <p class="text-sm font-mono text-gray-700 dark:text-gray-300 mb-2">
              {{ $t('localLighthouse.startServerLabel') }}
            </p>
            <code class="block bg-gray-900 text-green-400 p-3 rounded text-sm">
              make lighthouse-start
            </code>
          </div>

          <div class="flex justify-center gap-4">
            <button
                class="btn btn-primary"
                type="button"
                @click="checkServer"
            >
              {{ $t('common.retry') }}
            </button>
            <router-link class="btn btn-secondary" to="/lighthouse">
              {{ $t('localLighthouse.usePageSpeed') }}
            </router-link>
          </div>
        </div>

        <!-- Loading state -->
        <div v-else-if="loading" class="text-center py-12">
          <LoadingSpinner :progress="progress" size="xl"/>
          <p class="mt-6 text-lg text-gray-600 dark:text-gray-300">
            {{ $t('localLighthouse.analyzing') }}
          </p>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {{ $t('localLighthouse.estimatedTime', { seconds: estimatedTime }) }}
          </p>
          <button
              class="mt-6 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
              type="button"
              @click="handleCancel"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>

        <!-- URL Input form -->
        <div v-else>
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {{ $t('localLighthouse.title') }}
            </h2>
            <p class="text-gray-500 dark:text-gray-400">
              {{ $t('localLighthouse.subtitle') }}
            </p>
          </div>

          <!-- Server status badge -->
          <div class="flex justify-center mb-6">
            <span class="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">
              <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              {{ $t('localLighthouse.serverConnected') }}
            </span>
          </div>

          <!-- Strategy selector -->
          <div class="flex justify-center mb-6">
            <div class="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              <button
                  :class="strategy === 'mobile'
                  ? 'bg-green-500 text-white'
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
                  ? 'bg-green-500 text-white'
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

          <!-- Error alert -->
          <ErrorAlert
              v-if="error"
              :message="error"
              class="mb-6"
              dismissible
              :title="$t('localLighthouse.errorTitle')"
              type="error"
              @dismiss="handleDismissError"
          />

          <!-- URL input -->
          <UrlInput
              v-model="url"
              :loading="loading"
              placeholder="https://example.com"
              @submit="handleSubmit"
          />

          <!-- Info box -->
          <div class="mt-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div class="flex gap-3">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <div class="text-sm text-green-700 dark:text-green-300">
                <p class="font-medium mb-1">{{ $t('localLighthouse.infoTitle') }}</p>
                <ul class="list-disc list-inside space-y-1">
                  <li>{{ $t('localLighthouse.advantageNoLimit') }}</li>
                  <li>{{ $t('localLighthouse.advantageFaster') }}</li>
                  <li>{{ $t('localLighthouse.advantagePrivate') }}</li>
                  <li>{{ $t('localLighthouse.advantageIntranet') }}</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Alternative option -->
          <div class="mt-8 text-center">
            <p class="text-gray-500 dark:text-gray-400 text-sm">
              {{ $t('localLighthouse.altQuestion') }}
              <router-link class="text-primary-500 hover:text-primary-600 font-medium" to="/lighthouse">
                {{ $t('localLighthouse.altLink') }}
              </router-link>
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
