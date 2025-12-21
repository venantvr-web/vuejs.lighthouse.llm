<script setup>
import {computed, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import ScoreGauge from '@/components/dashboard/ScoreGauge.vue'
import DropZone from '@/components/upload/DropZone.vue'
import SessionComparisonCard from '@/components/comparison/SessionComparisonCard.vue'
import ScoreDiffIndicator from '@/components/comparison/ScoreDiffIndicator.vue'
import TemplateComparisonTable from '@/components/comparison/TemplateComparisonTable.vue'
import {useComparison, COMPARISON_CATEGORIES} from '@/composables/useComparison'
import {formatDateTime} from '@/utils/formatters'

const route = useRoute()
const router = useRouter()
const {
  itemA,
  itemB,
  hasComparison,
  comparison,
  setItems,
  loadFromStorage,
  formatDiff,
  formatScore,
  getStatusClass,
  compareSessionsWithTemplates
} = useComparison()

// Mode: 'file' (default), 'session', 'history'
const mode = computed(() => route.query.mode || 'file')

// File mode state
const reportA = ref(null)
const reportB = ref(null)

// Session/History mode state
const sessionComparison = ref(null)

onMounted(() => {
  // Load from storage for session/history modes
  if (mode.value === 'session' || mode.value === 'history') {
    const loaded = loadFromStorage('comparison-items')
    if (loaded && itemA.value && itemB.value) {
      if (mode.value === 'session') {
        sessionComparison.value = compareSessionsWithTemplates(itemA.value, itemB.value)
      }
    }
  }
})

// File mode handlers
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
  accessibility: 'Accessibilite',
  seo: 'SEO',
  'best-practices': 'Bonnes Pratiques'
}

const clearReport = (which) => {
  if (which === 'A') reportA.value = null
  else reportB.value = null
}

// Navigation
function goBack() {
  if (mode.value === 'session') {
    router.push('/crawl/history')
  } else if (mode.value === 'history') {
    router.push('/history')
  } else {
    router.push('/dashboard')
  }
}

// Page title
const pageTitle = computed(() => {
  switch (mode.value) {
    case 'session':
      return 'Comparer les sessions de crawl'
    case 'history':
      return 'Comparer les analyses'
    default:
      return 'Comparer les rapports'
  }
})

// Get score from item (normalized)
function getItemScore(item, category) {
  if (!item) return null

  // Direct score object
  if (item.scores && typeof item.scores[category] === 'number') {
    return item.scores[category]
  }

  // Session aggregate scores
  if (item.aggregateScores && item.aggregateScores[category]) {
    return item.aggregateScores[category].avg
  }

  return null
}

</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-6xl mx-auto px-4 py-4">
        <div class="flex items-center gap-4">
          <button
              class="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              @click="goBack"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            <span>Retour</span>
          </button>
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-6xl mx-auto px-4 py-8">
      <!-- File Mode -->
      <template v-if="mode === 'file'">
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

        <!-- File comparison results -->
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
                  Excellente evolution ! Tous les scores se sont ameliores ou sont restes stables.
                </template>
                <template v-else-if="Object.values(scoreDiffs).every(d => d <= 0)">
                  Attention, des regressions ont ete detectees sur plusieurs categories.
                </template>
                <template v-else>
                  Evolution mitigee : certaines categories se sont ameliorees, d'autres ont regresse.
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
      </template>

      <!-- Session/History Mode -->
      <template v-else-if="mode === 'session' || mode === 'history'">
        <!-- No data loaded -->
        <div v-if="!hasComparison" class="text-center py-16">
          <div class="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune comparaison selectionnee
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-6">
            Selectionnez deux {{ mode === 'session' ? 'sessions' : 'analyses' }} pour les comparer.
          </p>
          <button
              class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              @click="goBack"
          >
            Retour a la liste
          </button>
        </div>

        <!-- Session comparison -->
        <template v-else-if="mode === 'session'">
          <!-- Session cards -->
          <div class="grid md:grid-cols-2 gap-6 mb-8">
            <SessionComparisonCard
                :label="'Reference'"
                :session="itemA"
                position="left"
            />
            <SessionComparisonCard
                :label="'Comparaison'"
                :session="itemB"
                position="right"
            />
          </div>

          <!-- Score comparison -->
          <div class="card p-6 mb-8">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Evolution des scores
            </h2>

            <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div
                  v-for="cat in comparison?.categories || []"
                  :key="cat.key"
                  class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
              >
                <div class="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {{ cat.label }}
                </div>

                <div class="flex items-center justify-between mb-2">
                  <span class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ formatScore(cat.scoreB) }}
                  </span>
                  <ScoreDiffIndicator :diff="cat.diff"/>
                </div>

                <div class="text-xs text-gray-400">
                  Avant: {{ formatScore(cat.scoreA) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Template comparison (if available) -->
          <div
              v-if="sessionComparison?.templateComparison?.length > 0"
              class="card p-6"
          >
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Comparaison par template
            </h2>

            <TemplateComparisonTable
                :label-a="'Reference'"
                :label-b="'Comparaison'"
                :templates="sessionComparison.templateComparison"
            />
          </div>

          <!-- Summary -->
          <div class="card p-6 mt-8">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Resume
            </h2>

            <div class="grid sm:grid-cols-3 gap-6">
              <div class="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div class="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  {{ comparison?.summary?.improved || 0 }}
                </div>
                <div class="text-sm text-emerald-700 dark:text-emerald-300">
                  Amelioration{{ (comparison?.summary?.improved || 0) > 1 ? 's' : '' }}
                </div>
              </div>

              <div class="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div class="text-3xl font-bold text-gray-600 dark:text-gray-400 mb-1">
                  {{ comparison?.summary?.unchanged || 0 }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  Stable{{ (comparison?.summary?.unchanged || 0) > 1 ? 's' : '' }}
                </div>
              </div>

              <div class="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div class="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                  {{ comparison?.summary?.declined || 0 }}
                </div>
                <div class="text-sm text-red-700 dark:text-red-300">
                  Regression{{ (comparison?.summary?.declined || 0) > 1 ? 's' : '' }}
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- History comparison (individual analyses) -->
        <template v-else-if="mode === 'history'">
          <!-- Analysis cards -->
          <div class="grid md:grid-cols-2 gap-6 mb-8">
            <!-- Analysis A -->
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
              <div class="text-xs font-medium px-2 py-0.5 rounded inline-block mb-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                Reference
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate mb-1">
                {{ itemA?.url || itemA?.domain || 'URL inconnue' }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ formatDateTime(itemA?.timestamp) }}
              </p>
            </div>

            <!-- Analysis B -->
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-purple-200 dark:border-purple-800 p-4">
              <div class="text-xs font-medium px-2 py-0.5 rounded inline-block mb-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                Comparaison
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate mb-1">
                {{ itemB?.url || itemB?.domain || 'URL inconnue' }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ formatDateTime(itemB?.timestamp) }}
              </p>
            </div>
          </div>

          <!-- Score comparison -->
          <div class="card p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Evolution des scores
            </h2>

            <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div
                  v-for="cat in comparison?.categories || []"
                  :key="cat.key"
                  class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
              >
                <div class="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {{ cat.label }}
                </div>

                <div class="flex items-center justify-between mb-2">
                  <span class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ formatScore(cat.scoreB) }}
                  </span>
                  <ScoreDiffIndicator :diff="cat.diff"/>
                </div>

                <div class="text-xs text-gray-400">
                  Avant: {{ formatScore(cat.scoreA) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div class="card p-6 mt-8">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Resume
            </h2>

            <div class="grid sm:grid-cols-3 gap-6">
              <div class="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div class="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  {{ comparison?.summary?.improved || 0 }}
                </div>
                <div class="text-sm text-emerald-700 dark:text-emerald-300">
                  Amelioration{{ (comparison?.summary?.improved || 0) > 1 ? 's' : '' }}
                </div>
              </div>

              <div class="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div class="text-3xl font-bold text-gray-600 dark:text-gray-400 mb-1">
                  {{ comparison?.summary?.unchanged || 0 }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  Stable{{ (comparison?.summary?.unchanged || 0) > 1 ? 's' : '' }}
                </div>
              </div>

              <div class="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div class="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                  {{ comparison?.summary?.declined || 0 }}
                </div>
                <div class="text-sm text-red-700 dark:text-red-300">
                  Regression{{ (comparison?.summary?.declined || 0) > 1 ? 's' : '' }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </template>
    </main>
  </div>
</template>
