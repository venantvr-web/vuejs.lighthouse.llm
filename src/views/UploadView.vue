<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLighthouseStore } from '@/stores/lighthouseStore'
import DropZone from '@/components/upload/DropZone.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'

const router = useRouter()
const lighthouseStore = useLighthouseStore()

const error = ref('')

const onReportLoaded = async (json) => {
  try {
    // Load into store with file source
    await lighthouseStore.loadFromFile(json)

    // Store in localStorage for persistence
    localStorage.setItem('current-report', JSON.stringify(json))

    // Navigate to dashboard
    router.push('/dashboard')
  } catch (err) {
    error.value = err.message || 'Erreur lors du chargement du rapport'
  }
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
            <router-link to="/" class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                  Lighthouse AI Analyzer
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Import de rapport JSON
                </p>
              </div>
            </router-link>
          </div>

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
    </header>

    <!-- Main content -->
    <main class="flex-1 flex items-center justify-center p-4">
      <div class="w-full max-w-2xl">
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Importez votre rapport Lighthouse
          </h2>
          <p class="text-gray-500 dark:text-gray-400">
            Glissez-deposez ou selectionnez un fichier JSON exporte depuis Chrome DevTools
          </p>
        </div>

        <!-- Error alert -->
        <ErrorAlert
          v-if="error"
          type="error"
          title="Erreur d'import"
          :message="error"
          dismissible
          class="mb-6"
          @dismiss="handleDismissError"
        />

        <!-- Drop zone -->
        <DropZone @report-loaded="onReportLoaded" />

        <!-- Help text -->
        <div class="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 class="font-medium text-gray-900 dark:text-white mb-2">
            Comment obtenir un rapport Lighthouse ?
          </h3>
          <ol class="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
            <li>Ouvrez Chrome DevTools (F12)</li>
            <li>Allez dans l'onglet "Lighthouse"</li>
            <li>Lancez une analyse</li>
            <li>Cliquez sur "Save as JSON" dans le menu</li>
          </ol>
        </div>

        <!-- Alternative option -->
        <div class="mt-8 text-center">
          <p class="text-gray-500 dark:text-gray-400 text-sm">
            Vous preferez une analyse en temps reel ?
            <router-link to="/lighthouse" class="text-primary-500 hover:text-primary-600 font-medium">
              Analysez votre URL directement
            </router-link>
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
