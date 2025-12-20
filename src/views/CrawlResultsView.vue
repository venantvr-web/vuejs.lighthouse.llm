<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCrawlStore, CRAWL_STATUS } from '@/stores/crawlStore'
import { TEMPLATE_COLORS } from '@/services/templateDetector'
import ScoreGauge from '@/components/dashboard/ScoreGauge.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import { jsPDF } from 'jspdf'

const route = useRoute()
const router = useRouter()
const crawlStore = useCrawlStore()

const loading = ref(true)
const error = ref('')
const selectedTemplate = ref(null)

// Computed
const session = computed(() => crawlStore.currentSession)

const aggregateScores = computed(() => {
  if (!session.value?.aggregateScores) return null
  return session.value.aggregateScores
})

const templates = computed(() => {
  if (!session.value?.templates) return []
  return session.value.templates
})

const urls = computed(() => {
  if (!session.value?.urls) return []
  return session.value.urls
})

const filteredUrls = computed(() => {
  if (!selectedTemplate.value) return urls.value
  return urls.value.filter(u => u.template === selectedTemplate.value)
})

const statusClass = computed(() => {
  switch (session.value?.status) {
    case CRAWL_STATUS.COMPLETED:
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    case CRAWL_STATUS.PARTIAL:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    case CRAWL_STATUS.FAILED:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case CRAWL_STATUS.CANCELLED:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  }
})

const statusLabel = computed(() => {
  switch (session.value?.status) {
    case CRAWL_STATUS.COMPLETED:
      return 'Termine'
    case CRAWL_STATUS.PARTIAL:
      return 'Partiel'
    case CRAWL_STATUS.FAILED:
      return 'Echec'
    case CRAWL_STATUS.CANCELLED:
      return 'Annule'
    default:
      return session.value?.status || 'Inconnu'
  }
})

// Format score for display
function formatScore(score) {
  if (score === null || score === undefined) return '-'
  return Math.round(score * 100)
}

// Get score color
function getScoreColor(score) {
  if (score === null || score === undefined) return 'text-gray-400 dark:text-gray-500'
  const value = score * 100
  if (value >= 90) return 'text-emerald-500'
  if (value >= 50) return 'text-amber-500'
  return 'text-red-500'
}

// Get template color
function getTemplateColor(template) {
  return TEMPLATE_COLORS[template] || TEMPLATE_COLORS.other
}

// Format date
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

// Filter by template
function filterByTemplate(template) {
  selectedTemplate.value = selectedTemplate.value === template ? null : template
}

// Export JSON
function exportJSON() {
  if (!session.value) return

  const data = {
    session: {
      id: session.value.id,
      domain: session.value.domain,
      baseUrl: session.value.baseUrl,
      timestamp: session.value.timestamp,
      status: session.value.status,
      discoveryMode: session.value.discoveryMode,
      service: session.value.service,
      strategy: session.value.strategy,
      pageCount: session.value.pageCount,
      pagesAnalyzed: session.value.pagesAnalyzed
    },
    aggregateScores: session.value.aggregateScores,
    templates: session.value.templates,
    urls: session.value.urls.map(u => ({
      url: u.url,
      path: u.path,
      template: u.template,
      analyzed: u.analyzed,
      scores: u.scores ? {
        performance: formatScore(u.scores.performance),
        accessibility: formatScore(u.scores.accessibility),
        'best-practices': formatScore(u.scores['best-practices']),
        seo: formatScore(u.scores.seo),
        pwa: formatScore(u.scores.pwa)
      } : null,
      error: u.error
    }))
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `crawl-${session.value.domain}-${new Date(session.value.timestamp).toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
}

// Export PDF
function exportPDF() {
  if (!session.value) return

  const doc = new jsPDF()
  const margin = 20
  let y = margin

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Rapport de Crawl Lighthouse', margin, y)
  y += 12

  // Domain info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Domaine: ${session.value.domain}`, margin, y)
  y += 7
  doc.text(`URL de base: ${session.value.baseUrl}`, margin, y)
  y += 7
  doc.text(`Date: ${formatDate(session.value.timestamp)}`, margin, y)
  y += 7
  doc.text(`Pages analysees: ${session.value.pagesAnalyzed}/${session.value.pageCount}`, margin, y)
  y += 7
  doc.text(`Service: ${session.value.service} | Strategie: ${session.value.strategy}`, margin, y)
  y += 15

  // Aggregate scores
  if (session.value.aggregateScores) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Scores agreges', margin, y)
    y += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const categories = Object.entries(session.value.aggregateScores)
    categories.forEach(([cat, data]) => {
      const avg = Math.round(data.avg * 100)
      const min = Math.round(data.min * 100)
      const max = Math.round(data.max * 100)
      doc.text(`${cat}: ${avg}% (min: ${min}%, max: ${max}%)`, margin, y)
      y += 6
    })
    y += 10
  }

  // Templates breakdown
  if (session.value.templates && session.value.templates.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Scores par template', margin, y)
    y += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    session.value.templates.forEach(template => {
      doc.text(`${template.name} (${template.count} pages)`, margin, y)
      y += 6
      if (template.avgScores) {
        const scores = Object.entries(template.avgScores)
          .map(([cat, data]) => `${cat}: ${Math.round(data.avg * 100)}%`)
          .join(' | ')
        doc.setFontSize(9)
        doc.text(`  ${scores}`, margin, y)
        doc.setFontSize(10)
        y += 6
      }
    })
    y += 10
  }

  // URLs table
  if (session.value.urls && session.value.urls.length > 0) {
    // New page if needed
    if (y > 230) {
      doc.addPage()
      y = margin
    }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Detail par page', margin, y)
    y += 10

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')

    // Table header
    doc.setFont('helvetica', 'bold')
    doc.text('URL', margin, y)
    doc.text('Perf', 120, y)
    doc.text('A11y', 135, y)
    doc.text('BP', 150, y)
    doc.text('SEO', 165, y)
    y += 5
    doc.setFont('helvetica', 'normal')

    session.value.urls.forEach(urlInfo => {
      if (y > 280) {
        doc.addPage()
        y = margin
      }

      const path = urlInfo.path || urlInfo.url
      const truncatedPath = path.length > 50 ? path.substring(0, 47) + '...' : path
      doc.text(truncatedPath, margin, y)

      if (urlInfo.scores) {
        doc.text(formatScore(urlInfo.scores.performance)?.toString() || '-', 120, y)
        doc.text(formatScore(urlInfo.scores.accessibility)?.toString() || '-', 135, y)
        doc.text(formatScore(urlInfo.scores['best-practices'])?.toString() || '-', 150, y)
        doc.text(formatScore(urlInfo.scores.seo)?.toString() || '-', 165, y)
      } else {
        doc.text('-', 120, y)
        doc.text('-', 135, y)
        doc.text('-', 150, y)
        doc.text('-', 165, y)
      }
      y += 5
    })
  }

  // Save
  doc.save(`crawl-${session.value.domain}-${new Date(session.value.timestamp).toISOString().split('T')[0]}.pdf`)
}

// Initialize
onMounted(async () => {
  try {
    await crawlStore.initialize()
    const sessionId = route.params.id

    if (sessionId) {
      await crawlStore.loadSession(sessionId)
    }

    if (!session.value) {
      error.value = 'Session introuvable'
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="border-b border-gray-200 dark:border-gray-800">
      <div class="max-w-6xl mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <router-link to="/crawl" class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                  Resultats du Crawl
                </h1>
                <p v-if="session" class="text-sm text-gray-500 dark:text-gray-400">
                  {{ session.domain }} - {{ session.pagesAnalyzed }} pages analysees
                </p>
              </div>
            </router-link>
          </div>

          <div class="flex items-center gap-2">
            <!-- Export buttons -->
            <div v-if="session" class="flex items-center gap-1 mr-2">
              <button
                @click="exportJSON"
                class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                title="Exporter en JSON"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                JSON
              </button>
              <button
                @click="exportPDF"
                class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                title="Exporter en PDF"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                PDF
              </button>
            </div>

            <router-link
              to="/crawl/history"
              class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Historique
            </router-link>
            <router-link
              to="/crawl"
              class="px-3 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
            >
              Nouveau crawl
            </router-link>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 p-4">
      <div class="max-w-6xl mx-auto">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>

        <!-- Error -->
        <ErrorAlert
          v-else-if="error"
          type="error"
          title="Erreur"
          :message="error"
          class="mb-6"
        />

        <!-- Results -->
        <div v-else-if="session" class="space-y-6">
          <!-- Session info -->
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex flex-wrap items-center gap-4 mb-4">
              <span :class="['px-3 py-1 rounded-full text-sm font-medium', statusClass]">
                {{ statusLabel }}
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ formatDate(session.timestamp) }}
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                Mode: {{ session.discoveryMode }}
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                Service: {{ session.service }}
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                Strategie: {{ session.strategy }}
              </span>
            </div>
            <div class="text-lg font-medium text-gray-900 dark:text-white">
              {{ session.baseUrl }}
            </div>
          </div>

          <!-- Aggregate scores -->
          <div v-if="aggregateScores" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Scores agreges du domaine
            </h2>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-6">
              <div v-for="(data, category) in aggregateScores" :key="category" class="text-center">
                <ScoreGauge
                  :score="Math.round(data.avg * 100)"
                  size="sm"
                />
                <div class="mt-2 text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {{ category.replace('-', ' ') }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  Min: {{ formatScore(data.min) }} / Max: {{ formatScore(data.max) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Template breakdown -->
          <div v-if="templates.length > 0" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Scores par template
            </h2>
            <div class="space-y-4">
              <div
                v-for="template in templates"
                :key="template.name"
                class="p-4 rounded-lg border-2 cursor-pointer transition-all"
                :class="selectedTemplate === template.name
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
                @click="filterByTemplate(template.name)"
              >
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-4 h-4 rounded"
                      :style="{ backgroundColor: getTemplateColor(template.name) }"
                    ></div>
                    <span class="font-medium text-gray-900 dark:text-white">
                      {{ template.name }}
                    </span>
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                      ({{ template.count }} page{{ template.count > 1 ? 's' : '' }})
                    </span>
                  </div>
                  <svg
                    class="w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform"
                    :class="selectedTemplate === template.name && 'rotate-180'"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <!-- Score bars -->
                <div class="grid grid-cols-5 gap-4">
                  <div v-for="(catData, cat) in template.avgScores" :key="cat">
                    <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span class="truncate">{{ cat.replace('-', ' ') }}</span>
                      <span :class="getScoreColor(catData.avg)">{{ formatScore(catData.avg) }}</span>
                    </div>
                    <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all"
                        :class="catData.avg >= 0.9 ? 'bg-emerald-500' : catData.avg >= 0.5 ? 'bg-amber-500' : 'bg-red-500'"
                        :style="{ width: `${catData.avg * 100}%` }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- URL list -->
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Detail par page
                <span v-if="selectedTemplate" class="text-sm font-normal text-gray-500 dark:text-gray-400">
                  (filtre: {{ selectedTemplate }})
                </span>
              </h2>
              <button
                v-if="selectedTemplate"
                class="text-sm text-emerald-500 hover:text-emerald-600"
                @click="selectedTemplate = null"
              >
                Voir tout
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th class="pb-3 font-medium">URL</th>
                    <th class="pb-3 font-medium">Template</th>
                    <th class="pb-3 font-medium text-center">Perf</th>
                    <th class="pb-3 font-medium text-center">A11y</th>
                    <th class="pb-3 font-medium text-center">BP</th>
                    <th class="pb-3 font-medium text-center">SEO</th>
                    <th class="pb-3 font-medium text-center">PWA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="urlInfo in filteredUrls"
                    :key="urlInfo.url"
                    class="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                  >
                    <td class="py-3 pr-4">
                      <div class="flex items-center gap-2">
                        <span
                          v-if="urlInfo.analyzed"
                          class="w-2 h-2 rounded-full bg-emerald-500"
                        ></span>
                        <span
                          v-else-if="urlInfo.error"
                          class="w-2 h-2 rounded-full bg-red-500"
                        ></span>
                        <span
                          v-else
                          class="w-2 h-2 rounded-full bg-gray-300"
                        ></span>
                        <a
                          :href="urlInfo.url"
                          target="_blank"
                          class="text-sm text-gray-900 dark:text-white hover:text-emerald-500 truncate max-w-xs"
                          :title="urlInfo.url"
                        >
                          {{ urlInfo.path || urlInfo.url }}
                        </a>
                      </div>
                    </td>
                    <td class="py-3">
                      <span
                        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
                        :style="{
                          backgroundColor: getTemplateColor(urlInfo.template) + '20',
                          color: getTemplateColor(urlInfo.template)
                        }"
                      >
                        {{ urlInfo.template || 'other' }}
                      </span>
                    </td>
                    <td class="py-3 text-center">
                      <span :class="['font-medium', getScoreColor(urlInfo.scores?.performance)]">
                        {{ formatScore(urlInfo.scores?.performance) }}
                      </span>
                    </td>
                    <td class="py-3 text-center">
                      <span :class="['font-medium', getScoreColor(urlInfo.scores?.accessibility)]">
                        {{ formatScore(urlInfo.scores?.accessibility) }}
                      </span>
                    </td>
                    <td class="py-3 text-center">
                      <span :class="['font-medium', getScoreColor(urlInfo.scores?.['best-practices'])]">
                        {{ formatScore(urlInfo.scores?.['best-practices']) }}
                      </span>
                    </td>
                    <td class="py-3 text-center">
                      <span :class="['font-medium', getScoreColor(urlInfo.scores?.seo)]">
                        {{ formatScore(urlInfo.scores?.seo) }}
                      </span>
                    </td>
                    <td class="py-3 text-center">
                      <span :class="['font-medium', getScoreColor(urlInfo.scores?.pwa)]">
                        {{ formatScore(urlInfo.scores?.pwa) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="filteredUrls.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
              Aucune URL trouvee pour ce filtre.
            </div>
          </div>
        </div>

        <!-- No session -->
        <div v-else class="text-center py-12">
          <p class="text-gray-500 dark:text-gray-400 mb-4">Aucune session trouvee</p>
          <router-link
            to="/crawl"
            class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            Lancer un crawl
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>
