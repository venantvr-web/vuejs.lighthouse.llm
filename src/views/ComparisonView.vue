<script setup>
import {computed, ref} from 'vue'
import ScoreGauge from '@/components/dashboard/ScoreGauge.vue'
import DropZone from '@/components/upload/DropZone.vue'

const reportA = ref(null)
const reportB = ref(null)

const onReportALoaded = (json) => {
  reportA.value = json
}

const onReportBLoaded = (json) => {
  reportB.value = json
}

const getScores = (report) => {
  if (!report?.categories) return {}
  return {
    performance: Math.round((report.categories.performance?.score || 0) * 100),
    accessibility: Math.round((report.categories.accessibility?.score || 0) * 100),
    seo: Math.round((report.categories.seo?.score || 0) * 100),
    'best-practices': Math.round((report.categories['best-practices']?.score || 0) * 100)
  }
}

const scoresA = computed(() => getScores(reportA.value))
const scoresB = computed(() => getScores(reportB.value))

const scoreDiffs = computed(() => {
  if (!reportA.value || !reportB.value) return {}

  const diffs = {}
  for (const key of Object.keys(scoresA.value)) {
    diffs[key] = scoresB.value[key] - scoresA.value[key]
  }
  return diffs
})

const categoryLabels = {
  performance: 'Performance',
  accessibility: 'Accessibilité',
  seo: 'SEO',
  'best-practices': 'Bonnes Pratiques'
}

const clearReport = (which) => {
  if (which === 'A') reportA.value = null
  else reportB.value = null
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-6xl mx-auto px-4 py-4">
        <div class="flex items-center gap-4">
          <router-link class="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" to="/dashboard">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            <span>Retour</span>
          </router-link>
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">Comparer les rapports</h1>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-6xl mx-auto px-4 py-8">
      <div class="grid md:grid-cols-2 gap-8">
        <!-- Report A -->
        <div>
          <div class="flex items-center gap-2 mb-4">
            <span class="w-3 h-3 bg-blue-500 rounded-full"></span>
            <h2 class="font-semibold text-gray-900 dark:text-white">Rapport A (Avant)</h2>
          </div>

          <div v-if="!reportA">
            <DropZone @report-loaded="onReportALoaded"/>
          </div>

          <div v-else class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <span class="text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ reportA.finalUrl || reportA.requestedUrl }}
              </span>
              <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="clearReport('A')">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </button>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div v-for="(score, key) in scoresA" :key="key" class="text-center">
                <ScoreGauge :label="categoryLabels[key]" :score="score" size="sm"/>
              </div>
            </div>
          </div>
        </div>

        <!-- Report B -->
        <div>
          <div class="flex items-center gap-2 mb-4">
            <span class="w-3 h-3 bg-purple-500 rounded-full"></span>
            <h2 class="font-semibold text-gray-900 dark:text-white">Rapport B (Apres)</h2>
          </div>

          <div v-if="!reportB">
            <DropZone @report-loaded="onReportBLoaded"/>
          </div>

          <div v-else class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <span class="text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ reportB.finalUrl || reportB.requestedUrl }}
              </span>
              <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="clearReport('B')">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </button>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div v-for="(score, key) in scoresB" :key="key" class="text-center">
                <ScoreGauge :label="categoryLabels[key]" :score="score" size="sm"/>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Comparison results -->
      <div v-if="reportA && reportB" class="mt-12">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Evolution des scores</h2>

        <div class="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div
              v-for="(diff, key) in scoreDiffs"
              :key="key"
              class="card p-4"
          >
            <div class="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {{ categoryLabels[key] }}
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-baseline gap-2">
                <span class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ scoresB[key] }}
                </span>
                <span class="text-sm text-gray-400">
                  ({{ scoresA[key] }})
                </span>
              </div>

              <div
                  :class="{
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400': diff > 0,
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400': diff < 0,
                  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400': diff === 0
                }"
                  class="flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium"
              >
                <svg v-if="diff > 0" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M5 10l7-7m0 0l7 7m-7-7v18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
                <svg v-else-if="diff < 0" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 14l-7 7m0 0l-7-7m7 7V3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
                <span>{{ diff > 0 ? '+' : '' }}{{ diff }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div class="mt-8 card p-6">
          <h3 class="font-semibold text-gray-900 dark:text-white mb-4">Resume</h3>

          <div class="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
            <p>
              <template v-if="Object.values(scoreDiffs).every(d => d >= 0)">
                Excellente évolution ! Tous les scores se sont améliorés ou sont restés stables.
              </template>
              <template v-else-if="Object.values(scoreDiffs).every(d => d <= 0)">
                Attention, des régressions ont été détectées sur plusieurs catégories.
              </template>
              <template v-else>
                Évolution mitigée : certaines catégories se sont améliorées, d'autres ont régressé.
              </template>
            </p>

            <ul>
              <li v-for="(diff, key) in scoreDiffs" :key="key">
                <strong>{{ categoryLabels[key] }}</strong>:
                <span v-if="diff > 0" class="text-green-600 dark:text-green-400">+{{ diff }} points</span>
                <span v-else-if="diff < 0" class="text-red-600 dark:text-red-400">{{ diff }} points</span>
                <span v-else class="text-gray-500">stable</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
