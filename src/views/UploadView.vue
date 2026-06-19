<script setup>
import AppHeader from '@/components/common/AppHeader.vue'
import {ref} from 'vue'
import {useRouter} from 'vue-router'
import {useLighthouseStore} from '@/stores/lighthouseStore'
import DropZone from '@/components/upload/DropZone.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import {useI18n} from '@/i18n'

const {t} = useI18n()
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
    error.value = err.message || t('upload.loadError')
  }
}

function handleDismissError() {
  error.value = ''
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <AppHeader :subtitle="$t('upload.headerSubtitle')" :title="$t('upload.headerTitle')"/>

    <!-- Main content -->
    <main class="flex-1 flex items-center justify-center p-4">
      <div class="w-full max-w-2xl">
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {{ $t('upload.title') }}
          </h2>
          <p class="text-gray-500 dark:text-gray-400">
            {{ $t('upload.subtitle') }}
          </p>
        </div>

        <!-- Error alert -->
        <ErrorAlert
            v-if="error"
            :message="error"
            class="mb-6"
            dismissible
            :title="$t('upload.errorTitle')"
            type="error"
            @dismiss="handleDismissError"
        />

        <!-- Drop zone -->
        <DropZone @report-loaded="onReportLoaded"/>

        <!-- Help text -->
        <div class="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 class="font-medium text-gray-900 dark:text-white mb-2">
            {{ $t('upload.helpTitle') }}
          </h3>
          <ol class="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
            <li>{{ $t('upload.helpStep1') }}</li>
            <li>{{ $t('upload.helpStep2') }}</li>
            <li>{{ $t('upload.helpStep3') }}</li>
            <li>{{ $t('upload.helpStep4') }}</li>
          </ol>
        </div>

        <!-- Alternative option -->
        <div class="mt-8 text-center">
          <p class="text-gray-500 dark:text-gray-400 text-sm">
            {{ $t('upload.altQuestion') }}
            <router-link class="text-primary-500 hover:text-primary-600 font-medium" to="/lighthouse">
              {{ $t('upload.altLink') }}
            </router-link>
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
