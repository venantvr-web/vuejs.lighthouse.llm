<script setup>
import AppHeader from '@/components/common/AppHeader.vue'
import PageIntro from '@/components/common/PageIntro.vue'
import {computed, ref} from 'vue'
import {useRouter} from 'vue-router'
import {useLighthouseStore} from '@/stores/lighthouseStore'
import {useSettingsStore} from '@/stores/settingsStore'
import {useSiteStore} from '@/stores/siteStore'
import {usePersistentRef} from '@/composables/usePersistentRef'
import UrlInput from '@/components/input/UrlInput.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import {analyzeUrl, getEstimatedTime, STRATEGIES} from '@/services/pageSpeedInsights'
import {useI18n} from '@/i18n'

const {t} = useI18n()
const router = useRouter()
const lighthouseStore = useLighthouseStore()
const settings = useSettingsStore()
const site = useSiteStore()

// Préremplissage silencieux à partir du site actif
const url = usePersistentRef('lighthouse.url', site.lastUrl || site.origin)
const loading = ref(false)
const error = ref('')
const progress = ref(0)
const strategy = usePersistentRef('lighthouse.strategy', STRATEGIES.MOBILE)

const estimatedTime = computed(() => getEstimatedTime())

let abortController = null

async function handleSubmit(inputUrl) {
  // Mémorise le domaine pour les autres écrans
  site.setFromUrl(inputUrl)
  loading.value = true
  error.value = ''
  progress.value = 0

  // Create abort controller for cancellation
  abortController = new AbortController()

  // Simulate progress (PageSpeed API doesn't provide real progress)
  const progressInterval = setInterval(() => {
    if (progress.value < 90) {
      progress.value += Math.random() * 10
    }
  }, 1000)

  try {
    const report = await analyzeUrl(inputUrl, {
      strategy: strategy.value,
      apiKey: settings.pageSpeedApiKey || null,
      signal: abortController.signal
    })

    clearInterval(progressInterval)
    progress.value = 100

    // Load report into store
    await lighthouseStore.loadFromPageSpeed(report, inputUrl, strategy.value)

    // Store in localStorage for persistence
    localStorage.setItem('current-report', JSON.stringify(report))

    // Navigate to dashboard
    router.push('/dashboard')
  } catch (err) {
    clearInterval(progressInterval)
    error.value = err.message || t('lighthouse.genericError')
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
    <AppHeader :subtitle="$t('lighthouse.headerSubtitle')" :title="$t('lighthouse.headerTitle')"/>

    <!-- Main content -->
    <PageIntro :text="$t('intro.lighthouse')" width="4xl"/>

    <main class="flex-1 flex items-center justify-center p-4">
      <div class="w-full max-w-2xl">
        <!-- Loading state -->
        <div v-if="loading" class="text-center py-12">
          <LoadingSpinner :progress="progress" size="xl"/>
          <p class="mt-6 text-lg text-gray-600 dark:text-gray-300">
            {{ $t('lighthouse.analyzing') }}
          </p>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {{ $t('lighthouse.estimatedTime', { seconds: estimatedTime }) }}
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
              {{ $t('lighthouse.title') }}
            </h2>
            <p class="text-gray-500 dark:text-gray-400">
              {{ $t('lighthouse.subtitle') }}
            </p>
          </div>

          <!-- Strategy selector -->
          <div class="flex justify-center mb-6">
            <div class="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              <button
                  :class="strategy === 'mobile'
                  ? 'bg-primary-500 text-white'
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
                  ? 'bg-primary-500 text-white'
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
              :title="$t('lighthouse.errorTitle')"
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
          <div class="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div class="flex gap-3">
              <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <div class="text-sm text-blue-700 dark:text-blue-300">
                <p class="font-medium mb-1">{{ $t('lighthouse.infoTitle') }}</p>
                <p>
                  {{ $t('lighthouse.infoBody') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Alternative option -->
          <div class="mt-8 text-center">
            <p class="text-gray-500 dark:text-gray-400 text-sm">
              {{ $t('lighthouse.altQuestion') }}
              <router-link class="text-primary-500 hover:text-primary-600 font-medium" to="/upload">
                {{ $t('lighthouse.altLink') }}
              </router-link>
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
