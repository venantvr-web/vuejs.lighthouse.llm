<script setup>
import {computed, ref} from 'vue'
import {useRouter} from 'vue-router'
import {useLighthouseStore} from '@/stores/lighthouseStore'
import UrlInput from '@/components/input/UrlInput.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import {analyzeUrl, getEstimatedTime, STRATEGIES} from '@/services/pageSpeedInsights'

const router = useRouter()
const lighthouseStore = useLighthouseStore()

const url = ref('')
const loading = ref(false)
const error = ref('')
const progress = ref(0)
const strategy = ref(STRATEGIES.MOBILE)

const estimatedTime = computed(() => getEstimatedTime())

let abortController = null

async function handleSubmit(inputUrl) {
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
    error.value = err.message || 'Une erreur est survenue lors de l\'analyse'
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
    <header class="border-b border-gray-200 dark:border-gray-800">
      <div class="max-w-5xl mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <router-link class="flex items-center gap-3" to="/">
              <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                  Lighthouse AI Analyzer
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Analyse live via PageSpeed Insights
                </p>
              </div>
            </router-link>
          </div>

          <router-link
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              to="/settings"
          >
            <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-linecap="round" stroke-linejoin="round"
                    stroke-width="2"/>
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </router-link>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 flex items-center justify-center p-4">
      <div class="w-full max-w-2xl">
        <!-- Loading state -->
        <div v-if="loading" class="text-center py-12">
          <LoadingSpinner :progress="progress" size="xl"/>
          <p class="mt-6 text-lg text-gray-600 dark:text-gray-300">
            Analyse en cours...
          </p>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Temps estimé : ~{{ estimatedTime }} secondes
          </p>
          <button
              class="mt-6 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
              type="button"
              @click="handleCancel"
          >
            Annuler
          </button>
        </div>

        <!-- URL Input form -->
        <div v-else>
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Analysez votre site web
            </h2>
            <p class="text-gray-500 dark:text-gray-400">
              Entrez l'URL de votre site pour lancer une analyse Lighthouse en temps réel
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
                Mobile
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
                Desktop
              </button>
            </div>
          </div>

          <!-- Error alert -->
          <ErrorAlert
              v-if="error"
              :message="error"
              class="mb-6"
              dismissible
              title="Erreur d'analyse"
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
                <p class="font-medium mb-1">À propos de l'analyse</p>
                <p>
                  Cette analyse utilise l'API PageSpeed Insights de Google pour exécuter
                  Lighthouse sur votre site. Les résultats sont identiques à ceux de Chrome DevTools.
                </p>
              </div>
            </div>
          </div>

          <!-- Alternative option -->
          <div class="mt-8 text-center">
            <p class="text-gray-500 dark:text-gray-400 text-sm">
              Vous avez déjà un rapport Lighthouse ?
              <router-link class="text-primary-500 hover:text-primary-600 font-medium" to="/upload">
                Importez-le ici
              </router-link>
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
