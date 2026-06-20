<script setup>
import AppHeader from '@/components/common/AppHeader.vue'
import {computed, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {CRAWL_STATUS, useCrawlStore} from '@/stores/crawlStore'
import {TEMPLATE_COLORS} from '@/services/templateDetector'
import ScoreGauge from '@/components/dashboard/ScoreGauge.vue'
import StructuredDataPanel from '@/components/crawl/StructuredDataPanel.vue'
import HelpTip from '@/components/common/HelpTip.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import {jsPDF} from 'jspdf'
import {formatScore, getScoreColorClass, formatDateTimeMedium, formatDateISO} from '@/utils/formatters'
import {useI18n} from '@/i18n'
import {useToast} from '@/composables/useToast'

const {t} = useI18n()
const toast = useToast()
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
      return t('common.statusCompleted')
    case CRAWL_STATUS.PARTIAL:
      return t('common.statusPartial')
    case CRAWL_STATUS.FAILED:
      return t('common.statusFailed')
    case CRAWL_STATUS.CANCELLED:
      return t('common.statusCancelled')
    default:
      return session.value?.status || t('common.unknown')
  }
})

// Get template color
function getTemplateColor(template) {
  return TEMPLATE_COLORS[template] || TEMPLATE_COLORS.other
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

  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'})
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `crawl-${session.value.domain}-${formatDateISO(session.value.timestamp)}.json`
  link.click()
  URL.revokeObjectURL(url)
  toast.success(t('toast.exported'))
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
  doc.text(t('crawlResults.pdfTitle'), margin, y)
  y += 12

  // Domain info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(t('crawlResults.pdfDomain', {domain: session.value.domain}), margin, y)
  y += 7
  doc.text(t('crawlResults.pdfBaseUrl', {url: session.value.baseUrl}), margin, y)
  y += 7
  doc.text(t('crawlResults.pdfDate', {date: formatDateTimeMedium(session.value.timestamp)}), margin, y)
  y += 7
  doc.text(t('crawlResults.pdfPagesAnalyzed', {analyzed: session.value.pagesAnalyzed, total: session.value.pageCount}), margin, y)
  y += 7
  doc.text(t('crawlResults.pdfServiceStrategy', {service: session.value.service, strategy: session.value.strategy}), margin, y)
  y += 15

  // Aggregate scores
  if (session.value.aggregateScores) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(t('crawlResults.pdfAggregateScores'), margin, y)
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
    doc.text(t('crawlResults.pdfScoresByTemplate'), margin, y)
    y += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    session.value.templates.forEach(template => {
      doc.text(t('crawlResults.pdfTemplateLine', {name: template.name, count: template.count}), margin, y)
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
    doc.text(t('crawlResults.pdfDetailByPage'), margin, y)
    y += 10

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')

    // Table header
    doc.setFont('helvetica', 'bold')
    doc.text(t('crawlResults.colUrl'), margin, y)
    doc.text(t('crawlResults.colPerf'), 120, y)
    doc.text(t('crawlResults.colA11y'), 135, y)
    doc.text(t('crawlResults.colBp'), 150, y)
    doc.text(t('crawlResults.colSeo'), 165, y)
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
  doc.save(`crawl-${session.value.domain}-${formatDateISO(session.value.timestamp)}.pdf`)
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
      error.value = t('crawlResults.sessionNotFound')
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
    <AppHeader
        :subtitle="session ? $t('crawlResults.headerSubtitle', { domain: session.domain, count: session.pagesAnalyzed }) : ''"
        :title="$t('crawlResults.headerTitle')"
    >
      <template #actions>
        <div v-if="session" class="flex items-center gap-1 mr-2">
          <button
              class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              :title="$t('crawlResults.exportJsonTooltip')"
              @click="exportJSON"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            JSON
          </button>
          <button
              class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              :title="$t('crawlResults.exportPdfTooltip')"
              @click="exportPDF"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            PDF
          </button>
        </div>
        <router-link
            class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            to="/crawl/history"
        >
          {{ $t('crawlResults.history') }}
        </router-link>
        <router-link
            class="px-3 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
            to="/crawl"
        >
          {{ $t('crawlResults.newCrawl') }}
        </router-link>
      </template>
    </AppHeader>

    <!-- Main content -->
    <main class="flex-1 p-4">
      <div class="max-w-6xl mx-auto">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
          <LoadingSpinner size="lg"/>
        </div>

        <!-- Error -->
        <ErrorAlert
            v-else-if="error"
            :message="error"
            class="mb-6"
            :title="$t('crawlResults.errorTitle')"
            type="error"
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
                {{ formatDateTimeMedium(session.timestamp) }}
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t('crawlResults.mode') }}: {{ session.discoveryMode }}
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t('crawlResults.service') }}: {{ session.service }}
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t('crawlResults.strategy') }}: {{ session.strategy }}
              </span>
            </div>
            <div class="text-lg font-medium text-gray-900 dark:text-white">
              {{ session.baseUrl }}
            </div>
          </div>

          <!-- Aggregate scores -->
          <div v-if="aggregateScores" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              {{ $t('crawlResults.aggregateTitle') }}
              <HelpTip :text="$t('help.crawlAggregateWhat')"/>
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
                  {{ $t('crawlResults.minMax', { min: formatScore(data.min), max: formatScore(data.max) }) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Template breakdown -->
          <div v-if="templates.length > 0" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              {{ $t('crawlResults.templatesTitle') }}
              <HelpTip :text="$t('help.crawlTemplatesWhat')"/>
            </h2>
            <div class="space-y-4">
              <div
                  v-for="template in templates"
                  :key="template.name"
                  :class="selectedTemplate === template.name
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
                  class="p-4 rounded-lg border-2 cursor-pointer transition-all"
                  @click="filterByTemplate(template.name)"
              >
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div
                        :style="{ backgroundColor: getTemplateColor(template.name) }"
                        class="w-4 h-4 rounded"
                    ></div>
                    <span class="font-medium text-gray-900 dark:text-white">
                      {{ template.name }}
                    </span>
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                      {{ template.count > 1 ? $t('crawlResults.pageCountPlural', { count: template.count }) : $t('crawlResults.pageCountSingular', { count: template.count }) }}
                    </span>
                  </div>
                  <svg
                      :class="selectedTemplate === template.name && 'rotate-180'"
                      class="w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                  >
                    <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                </div>

                <!-- Score bars -->
                <div class="grid grid-cols-5 gap-4">
                  <div v-for="(catData, cat) in template.avgScores" :key="cat">
                    <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span class="truncate">{{ cat.replace('-', ' ') }}</span>
                      <span :class="getScoreColorClass(catData.avg)">{{ formatScore(catData.avg) }}</span>
                    </div>
                    <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                          :class="catData.avg >= 0.9 ? 'bg-emerald-500' : catData.avg >= 0.5 ? 'bg-amber-500' : 'bg-red-500'"
                          :style="{ width: `${catData.avg * 100}%` }"
                          class="h-full rounded-full transition-all"
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
                {{ $t('crawlResults.detailTitle') }}
                <span v-if="selectedTemplate" class="text-sm font-normal text-gray-500 dark:text-gray-400">
                  {{ $t('crawlResults.detailFilter', { template: selectedTemplate }) }}
                </span>
              </h2>
              <button
                  v-if="selectedTemplate"
                  class="text-sm text-emerald-500 hover:text-emerald-600"
                  @click="selectedTemplate = null"
              >
                {{ $t('crawlResults.seeAll') }}
              </button>
            </div>

            <!-- Légende des pastilles de statut -->
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-xs text-gray-500 dark:text-gray-400">
              <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>{{ $t('crawlResults.dotAnalyzed') }}</span>
              <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-red-500"></span>{{ $t('crawlResults.dotError') }}</span>
              <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-gray-300"></span>{{ $t('crawlResults.dotPending') }}</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                <tr class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th class="pb-3 font-medium">{{ $t('crawlResults.colUrl') }}</th>
                  <th class="pb-3 font-medium">{{ $t('crawlResults.colTemplate') }}</th>
                  <th class="pb-3 font-medium text-center">{{ $t('crawlResults.colPerf') }}</th>
                  <th class="pb-3 font-medium text-center">{{ $t('crawlResults.colA11y') }}</th>
                  <th class="pb-3 font-medium text-center">{{ $t('crawlResults.colBp') }}</th>
                  <th class="pb-3 font-medium text-center">{{ $t('crawlResults.colSeo') }}</th>
                  <th class="pb-3 font-medium text-center">{{ $t('crawlResults.colPwa') }}</th>
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
                            :title="$t('crawlResults.dotAnalyzed')"
                            class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                        ></span>
                      <span
                          v-else-if="urlInfo.error"
                          :title="urlInfo.error || $t('crawlResults.dotError')"
                          class="w-2 h-2 rounded-full bg-red-500 shrink-0"
                      ></span>
                      <span
                          v-else
                          :title="$t('crawlResults.dotPending')"
                          class="w-2 h-2 rounded-full bg-gray-300 shrink-0"
                      ></span>
                      <a
                          :href="urlInfo.url"
                          :title="urlInfo.url"
                          class="text-sm text-gray-900 dark:text-white hover:text-emerald-500 truncate max-w-xs"
                          target="_blank"
                      >
                        {{ urlInfo.path || urlInfo.url }}
                      </a>
                    </div>
                  </td>
                  <td class="py-3">
                      <span
                          :style="{
                          backgroundColor: getTemplateColor(urlInfo.template) + '20',
                          color: getTemplateColor(urlInfo.template)
                        }"
                          class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
                      >
                        {{ urlInfo.template || 'other' }}
                      </span>
                  </td>
                  <td class="py-3 text-center">
                      <span :class="['font-medium', getScoreColorClass(urlInfo.scores?.performance)]">
                        {{ formatScore(urlInfo.scores?.performance) }}
                      </span>
                  </td>
                  <td class="py-3 text-center">
                      <span :class="['font-medium', getScoreColorClass(urlInfo.scores?.accessibility)]">
                        {{ formatScore(urlInfo.scores?.accessibility) }}
                      </span>
                  </td>
                  <td class="py-3 text-center">
                      <span :class="['font-medium', getScoreColorClass(urlInfo.scores?.['best-practices'])]">
                        {{ formatScore(urlInfo.scores?.['best-practices']) }}
                      </span>
                  </td>
                  <td class="py-3 text-center">
                      <span :class="['font-medium', getScoreColorClass(urlInfo.scores?.seo)]">
                        {{ formatScore(urlInfo.scores?.seo) }}
                      </span>
                  </td>
                  <td class="py-3 text-center">
                      <span :class="['font-medium', getScoreColorClass(urlInfo.scores?.pwa)]">
                        {{ formatScore(urlInfo.scores?.pwa) }}
                      </span>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>

            <div v-if="filteredUrls.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
              {{ $t('crawlResults.noUrlForFilter') }}
            </div>
          </div>

          <!-- Structured data (JSON-LD) generation -->
          <StructuredDataPanel :urls="urls" class="mt-6"/>

          <div class="mt-6 text-right">
            <router-link
                class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                :to="{ path: '/history', query: { tab: 'crawls' } }"
            >
              {{ $t('help.compareCrawls') }} →
            </router-link>
          </div>
        </div>

        <!-- No session -->
        <div v-else class="text-center py-12">
          <p class="text-gray-500 dark:text-gray-400 mb-4">{{ $t('crawlResults.noSession') }}</p>
          <router-link
              class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              to="/crawl"
          >
            {{ $t('crawlResults.startCrawl') }}
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>
