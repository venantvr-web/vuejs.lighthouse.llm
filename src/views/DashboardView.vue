<script setup>
import AppHeader from '@/components/common/AppHeader.vue'
import {computed, onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import ScoreGauge from '@/components/dashboard/ScoreGauge.vue'
import ActionPlanPanel from '@/components/dashboard/ActionPlanPanel.vue'
import {useLighthouseParser} from '@/composables/useLighthouseParser'
import {useI18n} from '@/i18n'

const {t} = useI18n()
const router = useRouter()
const report = ref(null)
const loading = ref(true)
const parser = useLighthouseParser()

const opportunities = computed(() => (report.value ? parser.getOpportunities(report.value) : []))

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
    'performance': t('dashboard.categoryPerformance'),
    'accessibility': t('dashboard.categoryAccessibility'),
    'best-practices': t('dashboard.categoryBestPractices'),
    'seo': t('dashboard.categorySeo'),
    'pwa': t('dashboard.categoryPwa')
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
    {id: 'largest-contentful-paint', name: 'LCP', unit: 's'},
    {id: 'cumulative-layout-shift', name: 'CLS', unit: ''},
    {id: 'total-blocking-time', name: 'TBT', unit: 'ms'},
    {id: 'first-contentful-paint', name: 'FCP', unit: 's'},
    {id: 'speed-index', name: 'SI', unit: 's'}
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
    <AppHeader :subtitle="url || ''" :title="$t('dashboard.headerTitle')">
      <template #actions>
        <button class="btn btn-secondary text-sm" @click="clearReport">
          {{ $t('dashboard.newReport') }}
        </button>
      </template>
    </AppHeader>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
    </div>

    <!-- Main content -->
    <main v-else class="max-w-6xl mx-auto px-4 py-8">
      <!-- Scores grid -->
      <section class="mb-12">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">{{ $t('dashboard.overview') }}</h2>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          <button
              v-for="cat in categories"
              :key="cat.id"
              class="card p-6 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer group"
              @click="goToAnalysis(cat.id)"
          >
            <ScoreGauge
                :label="cat.label"
                :score="cat.score"
                size="md"
            />
            <div class="mt-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span class="text-xs text-primary-600 dark:text-primary-400 font-medium">
                {{ $t('dashboard.analyze') }}
              </span>
            </div>
          </button>
        </div>
      </section>

      <!-- Core Web Vitals -->
      <section v-if="coreWebVitals.length" class="mb-12">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">{{ $t('dashboard.coreWebVitals') }}</h2>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <div
              v-for="metric in coreWebVitals"
              :key="metric.name"
              class="card p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ metric.name }}</span>
              <span
                  :class="{
                  'bg-lighthouse-green': metric.score >= 0.9,
                  'bg-lighthouse-orange': metric.score >= 0.5 && metric.score < 0.9,
                  'bg-lighthouse-red': metric.score < 0.5
                }"
                  class="w-2 h-2 rounded-full"
              />
            </div>
            <div class="text-xl font-bold text-gray-900 dark:text-white">
              {{ metric.value }}
            </div>
          </div>
        </div>
      </section>

      <!-- Prioritized action plan -->
      <ActionPlanPanel :opportunities="opportunities" :url="url" class="mb-12"/>

      <!-- Quick actions -->
      <section>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">{{ $t('dashboard.quickActions') }}</h2>

        <div class="grid sm:grid-cols-2 gap-4">
          <router-link
              class="card p-6 hover:shadow-lg transition-shadow flex items-center gap-4"
              to="/analysis/performance"
          >
            <div class="w-12 h-12 bg-lighthouse-green/10 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-lighthouse-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ $t('dashboard.optimizePerformanceTitle') }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('dashboard.optimizePerformanceDescription') }}</p>
            </div>
          </router-link>

          <router-link
              class="card p-6 hover:shadow-lg transition-shadow flex items-center gap-4"
              to="/comparison"
          >
            <div class="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ $t('dashboard.compareReportsTitle') }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('dashboard.compareReportsDescription') }}</p>
            </div>
          </router-link>

          <router-link
              class="card p-6 hover:shadow-lg transition-shadow flex items-center gap-4"
              to="/watchlist"
          >
            <div class="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ $t('dashboard.watchlistTitle') }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('dashboard.watchlistDescription') }}</p>
            </div>
          </router-link>

          <router-link
              class="card p-6 hover:shadow-lg transition-shadow flex items-center gap-4"
              to="/history"
          >
            <div class="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ $t('dashboard.historyTitle') }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('dashboard.historyDescription') }}</p>
            </div>
          </router-link>
        </div>
      </section>
    </main>
  </div>
</template>
