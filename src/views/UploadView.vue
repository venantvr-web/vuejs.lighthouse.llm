<script setup>
import AppHeader from '@/components/common/AppHeader.vue'
import {ref} from 'vue'
import {useRouter} from 'vue-router'
import {useLighthouseStore} from '@/stores/lighthouseStore'
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
    <AppHeader subtitle="Import d'un rapport Lighthouse JSON" title="Importer un rapport"/>

    <!-- Main content -->
    <main class="flex-1 flex items-center justify-center p-4">
      <div class="w-full max-w-2xl">
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Importez votre rapport Lighthouse
          </h2>
          <p class="text-gray-500 dark:text-gray-400">
            Glissez-déposez ou sélectionnez un fichier JSON exporté depuis Chrome DevTools
          </p>
        </div>

        <!-- Error alert -->
        <ErrorAlert
            v-if="error"
            :message="error"
            class="mb-6"
            dismissible
            title="Erreur d'import"
            type="error"
            @dismiss="handleDismissError"
        />

        <!-- Drop zone -->
        <DropZone @report-loaded="onReportLoaded"/>

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
            Vous préférez une analyse en temps réel ?
            <router-link class="text-primary-500 hover:text-primary-600 font-medium" to="/lighthouse">
              Analysez votre URL directement
            </router-link>
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
