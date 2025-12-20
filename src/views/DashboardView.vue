<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ScoreGauge from '@/components/dashboard/ScoreGauge.vue'

const router = useRouter()
const report = ref(null)
const loading = ref(true)

onMounted(() => {
  const stored = localStorage.getItem('current-report')
  if (stored) {
    try {
      report.value = JSON.parse(stored)
    } catch (e) {
      console.error('Failed to parse stored report:', e)
      router.push('/')
    }
  } else {
    router.push('/')
  }
  loading.value = false
})

const categories = computed(() => {
  if (!report.value?.categories) return []

  const cats = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa']
  const labels = {
    'performance': 'Performance',
    'accessibility': 'Accessibilite',
    'best-practices': 'Bonnes Pratiques',
    'seo': 'SEO',
    'pwa': 'PWA'
  }

  return cats
    .filter(id => report.value.categories[id])
    .map(id => ({
      id,
      label: labels[id],
      score: Math.round((report.value.categories[id]?.score || 0) * 100)
    }))
})

const url = computed(() => report.value?.finalUrl || report.value?.requestedUrl || '')

const coreWebVitals = computed(() => {
  if (!report.value?.audits) return []

  const metrics = [
    { id: 'largest-contentful-paint', name: 'LCP', unit: 's' },
    { id: 'cumulative-layout-shift', name: 'CLS', unit: '' },
    { id: 'total-blocking-time', name: 'TBT', unit: 'ms' },
    { id: 'first-contentful-paint', name: 'FCP', unit: 's' },
    { id: 'speed-index', name: 'SI', unit: 's' }
  ]

  return metrics
    .filter(m => report.value.audits[m.id])
    .map(m => ({
      name: m.name,
      value: report.value.audits[m.id].displayValue || 'N/A',
      score: report.value.audits[m.id].score || 0
    }))
})

const goToAnalysis = (categoryId) => {
  router.push(`/analysis/${categoryId}`)
}

const clearReport = () => {
  localStorage.removeItem('current-report')
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-6xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <router-link to="/" class="flex items-center gap-2">
              <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span class="font-bold text-gray-900 dark:text-white">Lighthouse AI</span>
            </router-link>

            <!-- URL badge -->
            <div v-if="url" class="hidden sm:flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
              <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span class="text-gray-600 dark:text-gray-300 truncate max-w-xs">{{ url }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <router-link to="/settings" class="btn btn-ghost">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </router-link>
            <button @click="clearReport" class="btn btn-secondary text-sm">
              Nouveau rapport
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
    </div>

    <!-- Main content -->
    <main v-else class="max-w-6xl mx-auto px-4 py-8">
      <!-- Scores grid -->
      <section class="mb-12">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Vue d'ensemble</h2>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          <button
            v-for="cat in categories"
            :key="cat.id"
            @click="goToAnalysis(cat.id)"
            class="card p-6 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer group"
          >
            <ScoreGauge
              :score="cat.score"
              :label="cat.label"
              size="md"
            />
            <div class="mt-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span class="text-xs text-primary-600 dark:text-primary-400 font-medium">
                Analyser →
              </span>
            </div>
          </button>
        </div>
      </section>

      <!-- Core Web Vitals -->
      <section v-if="coreWebVitals.length" class="mb-12">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Core Web Vitals</h2>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <div
            v-for="metric in coreWebVitals"
            :key="metric.name"
            class="card p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ metric.name }}</span>
              <span
                class="w-2 h-2 rounded-full"
                :class="{
                  'bg-lighthouse-green': metric.score >= 0.9,
                  'bg-lighthouse-orange': metric.score >= 0.5 && metric.score < 0.9,
                  'bg-lighthouse-red': metric.score < 0.5
                }"
              />
            </div>
            <div class="text-xl font-bold text-gray-900 dark:text-white">
              {{ metric.value }}
            </div>
          </div>
        </div>
      </section>

      <!-- Quick actions -->
      <section>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Actions rapides</h2>

        <div class="grid sm:grid-cols-2 gap-4">
          <router-link
            to="/analysis/performance"
            class="card p-6 hover:shadow-lg transition-shadow flex items-center gap-4"
          >
            <div class="w-12 h-12 bg-lighthouse-green/10 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-lighthouse-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">Optimiser la Performance</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">Obtenez des recommandations IA pour ameliorer vos Core Web Vitals</p>
            </div>
          </router-link>

          <router-link
            to="/comparison"
            class="card p-6 hover:shadow-lg transition-shadow flex items-center gap-4"
          >
            <div class="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">Comparer les rapports</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">Analysez l'evolution de votre site dans le temps</p>
            </div>
          </router-link>
        </div>
      </section>
    </main>
  </div>
</template>
