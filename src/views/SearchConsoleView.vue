<script setup>
import {computed, ref, watch} from 'vue'
import {useI18n} from '@/i18n'
import {useSettingsStore} from '@/stores/settingsStore'
import {buildPageFilter, dateRangeISO, deltaRatio, previousDateRangeISO, reportToCsv, rowsToCsv, snapshotSeries, summarizeRows, useSearchConsole} from '@/composables/useSearchConsole'
import {useSearchConsoleHistoryStore} from '@/stores/searchConsoleHistoryStore'
import {useSiteStore} from '@/stores/siteStore'
import {extractDomain} from '@/utils/url'
import {usePersistentRef} from '@/composables/usePersistentRef'
import {useScopedPersistentRef} from '@/composables/useScopedPersistentRef'
import {useExport} from '@/composables/useExport'
import {formatNumber} from '@/utils/formatters'
import Sparkline from '@/components/common/Sparkline.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import PageIntro from '@/components/common/PageIntro.vue'
import Modal from '@/components/common/Modal.vue'
import MarkdownViewer from '@/components/analysis/MarkdownViewer.vue'
import scGuide from '../../docs/SEARCH_CONSOLE.md?raw'

const {t} = useI18n()
const settings = useSettingsStore()
const history = useSearchConsoleHistoryStore()
const site = useSiteStore()
const {downloadFile} = useExport()
const {connected, loading, error, sites, connect, connectWithKey, disconnect, query, fetchReport, fetchTotals, inspectUrl} = useSearchConsole()

// Nombre maximal de lignes affichées dans le tableau (l'export contient tout).
const DISPLAY_CAP = 200

// Méthode d'authentification : OAuth (popup) ou compte de service (clé JSON)
const authMethod = usePersistentRef('searchconsole.authMethod', 'oauth')

// Nom d'hôte d'une propriété Search Console ("https://ex.com/" ou "sc-domain:ex.com")
function siteHost(s) {
  if (!s) return ''
  return s.startsWith('sc-domain:') ? s.slice('sc-domain:'.length) : extractDomain(s)
}

const selectedSite = useScopedPersistentRef('searchconsole.selectedSite', '')
const days = usePersistentRef('searchconsole.days', 28)
const dimension = usePersistentRef('searchconsole.dimension', 'query')
const searchType = usePersistentRef('searchconsole.type', 'web')
const compare = usePersistentRef('searchconsole.compare', false)
const pageFilter = useScopedPersistentRef('searchconsole.pageFilter', '')
const inspectionUrl = useScopedPersistentRef('searchconsole.inspectionUrl', '')

// Groupe de filtres actif (restreint à une URL), ou null.
const activeFilters = computed(() => buildPageFilter(pageFilter.value.trim()))

// Liste des pages (pour l'autocomplétion) — chargée à la demande, mise en cache.
const pageList = ref([])
const pagesLoaded = ref(false)

async function reloadPages() {
  if (!selectedSite.value) return
  const pages = await query(selectedSite.value, {days: days.value, dimensions: ['page'], all: true, type: searchType.value})
  pageList.value = pages.map(p => p.key)
  pagesLoaded.value = true
}

async function ensurePages() {
  if (!pagesLoaded.value) await reloadPages()
}

// Recharger les suggestions si l'on change de propriété.
watch(selectedSite, () => {
  pagesLoaded.value = false
  pageList.value = []
})

// Série de clics par jour, densifiée sur TOUTE la fenêtre demandée (0 si pas
// de données ce jour-là) : l'axe X couvre la vraie période, et l'on voit les
// jours sans trafic. Itération en UTC pour rester aligné sur les clés Google.
const dateSeries = computed(() => {
  if (analyzedDimension.value !== 'date' || !analyzedRange.value) return []
  const byDay = new Map(rows.value.map(r => [r.key, r.clicks]))
  const out = []
  const cursor = new Date(`${analyzedRange.value.startDate}T00:00:00Z`)
  const end = new Date(`${analyzedRange.value.endDate}T00:00:00Z`)
  while (cursor <= end) {
    out.push(byDay.get(cursor.toISOString().slice(0, 10)) ?? 0)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
})

// Repères d'axes : la fenêtre demandée (X) et la couverture réelle des données.
const dateSeriesMeta = computed(() => {
  if (dateSeries.value.length < 2 || !analyzedRange.value) return null
  const dates = rows.value.map(r => r.key).filter(Boolean).sort()
  const lastData = dates.length ? dates[dates.length - 1] : null
  // Ancienneté de la dernière donnée (le lag normal de Search Console est ~2-3 j).
  const staleDays = lastData
      ? Math.round((Date.now() - new Date(`${lastData}T00:00:00Z`).getTime()) / 86400000)
      : null
  return {
    start: analyzedRange.value.startDate,
    end: analyzedRange.value.endDate,
    min: Math.min(...dateSeries.value),
    max: Math.max(...dateSeries.value),
    daysWithData: dates.length,
    totalDays: dateSeries.value.length,
    lastData,
    staleDays
  }
})

// Seuil au-delà duquel l'absence de donnée récente est suspecte (lag normal ~3 j).
const STALE_THRESHOLD = 5

// Formate une date ('YYYY-MM-DD' ou timestamp) en date locale courte.
function fmtDate(v) {
  const d = typeof v === 'number' ? new Date(v) : new Date(`${v}T00:00:00`)
  return d.toLocaleDateString()
}
const rows = ref([])
const clicksTrend = ref([])
const trendMeta = ref(null)
const report = ref(null)
const compareTotals = ref(null)
const inspection = ref(null)
const appliedFilter = ref('')
const analyzedRange = ref(null)
const analyzedDimension = ref('')
const showGuide = ref(false)

const summary = computed(() => summarizeRows(rows.value))
const displayedRows = computed(() => rows.value.slice(0, DISPLAY_CAP))

const METRICS = ['clicks', 'impressions', 'ctr', 'position']

function deltaForMetric(metric) {
  if (!compareTotals.value) return null
  return deltaRatio(compareTotals.value.current[metric], compareTotals.value.previous[metric])
}

function formatDelta(ratio) {
  if (ratio === null || ratio === undefined) return '—'
  const pct = ratio * 100
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`
}

// Variation favorable : à la hausse, sauf la position (plus bas = mieux).
function deltaClass(metric, ratio) {
  if (ratio === null || ratio === undefined) return 'text-gray-400'
  const good = metric === 'position' ? ratio < 0 : ratio > 0
  return good ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
}

const inspectionRows = computed(() => {
  const r = inspection.value
  if (!r) return []
  const idx = r.indexStatusResult || {}
  return [
    {label: t('searchConsole.inspectVerdict'), value: idx.verdict},
    {label: t('searchConsole.inspectCoverage'), value: idx.coverageState},
    {label: t('searchConsole.inspectLastCrawl'), value: idx.lastCrawlTime ? new Date(idx.lastCrawlTime).toLocaleString() : null},
    {label: t('searchConsole.inspectCanonical'), value: idx.googleCanonical},
    {label: t('searchConsole.inspectRobots'), value: idx.robotsTxtState},
    {label: t('searchConsole.inspectMobile'), value: r.mobileUsabilityResult?.verdict},
    {label: t('searchConsole.inspectRich'), value: r.richResultsResult?.verdict}
  ].filter(x => x.value)
})

// Libellé traduit d'une dimension Search Console.
const DIMENSION_LABELS = {query: 'queries', page: 'pages', country: 'countries', device: 'devices', date: 'dates', searchAppearance: 'appearance'}

function dimensionLabel(dim) {
  return t(`searchConsole.${DIMENSION_LABELS[dim] || dim}`)
}

// Slug d'hôte pour les noms de fichiers exportés.
function hostSlug() {
  return (siteHost(selectedSite.value) || 'search-console').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')
}

const reportCounts = computed(() =>
    report.value ? Object.entries(report.value).map(([dim, r]) => ({dim, count: r.length})) : []
)

function exportCsv() {
  if (!rows.value.length) return
  downloadFile(rowsToCsv(rows.value, dimension.value), `search-console-${hostSlug()}-${dimension.value}.csv`, 'text/csv')
}

function exportJson() {
  if (!rows.value.length) return
  const payload = {
    site: selectedSite.value, days: days.value, dimension: dimension.value,
    generatedAt: new Date().toISOString(), summary: summary.value, rows: rows.value
  }
  downloadFile(JSON.stringify(payload, null, 2), `search-console-${hostSlug()}-${dimension.value}.json`, 'application/json')
}

async function handleReport() {
  if (!selectedSite.value) return
  const host = siteHost(selectedSite.value)
  if (host) site.setFromUrl(`https://${host}`)
  appliedFilter.value = pageFilter.value.trim()
  report.value = await fetchReport(selectedSite.value, {days: days.value, type: searchType.value, filters: activeFilters.value})
}

function clearFilter() {
  pageFilter.value = ''
  handleQuery()
}

async function handleInspect() {
  if (!selectedSite.value || !inspectionUrl.value) return
  inspection.value = await inspectUrl(selectedSite.value, inspectionUrl.value)
}

function downloadReportJson() {
  if (!report.value) return
  const payload = {site: selectedSite.value, days: days.value, generatedAt: new Date().toISOString(), byDimension: report.value}
  downloadFile(JSON.stringify(payload, null, 2), `search-console-${hostSlug()}-rapport.json`, 'application/json')
}

function downloadReportCsv() {
  if (!report.value) return
  downloadFile(reportToCsv(report.value), `search-console-${hostSlug()}-rapport.csv`, 'text/csv')
}

function onClientIdInput(event) {
  settings.setSearchConsoleClientId(event.target.value)
}

function onServiceAccountInput(event) {
  settings.setSearchConsoleServiceAccount(event.target.value)
}

// Présélectionne une propriété après connexion (celle du site actif, sinon la 1re)
function preselectSite() {
  if (sites.value.length && !sites.value.includes(selectedSite.value)) {
    const match = site.activeDomain ? sites.value.find(s => siteHost(s) === site.activeDomain) : null
    selectedSite.value = match || sites.value[0]
  }
}

async function handleConnect() {
  await connect(settings.searchConsoleClientId)
  preselectSite()
}

async function handleConnectKey() {
  await connectWithKey(settings.searchConsoleServiceAccount)
  preselectSite()
}

async function handleQuery() {
  if (!selectedSite.value) return
  // Mémorise le domaine de la propriété interrogée pour les autres écrans
  const host = siteHost(selectedSite.value)
  if (host) site.setFromUrl(`https://${host}`)
  compareTotals.value = null
  const filters = activeFilters.value
  appliedFilter.value = pageFilter.value.trim()
  analyzedRange.value = dateRangeISO(days.value)
  analyzedDimension.value = dimension.value
  rows.value = await query(selectedSite.value, {days: days.value, dimensions: [dimension.value], all: true, type: searchType.value, filters})
  if (compare.value) {
    const current = await fetchTotals(selectedSite.value, {days: days.value, type: searchType.value, filters})
    const previous = await fetchTotals(selectedSite.value, {range: previousDateRangeISO(days.value), type: searchType.value, filters})
    compareTotals.value = {current, previous}
  }
  if (rows.value.length) {
    const s = summarizeRows(rows.value)
    await history.addSnapshot({
      site: selectedSite.value,
      days: days.value,
      dimension: dimension.value,
      clicks: s.clicks,
      impressions: s.impressions,
      ctr: s.ctr,
      position: s.position
    })
    await loadTrend()
  }
}

async function loadTrend() {
  const snapshots = await history.getSnapshots(selectedSite.value)
  clicksTrend.value = snapshotSeries(snapshots, 'clicks')
  if (snapshots.length) {
    const byTime = [...snapshots].sort((a, b) => a.timestamp - b.timestamp)
    trendMeta.value = {
      first: byTime[0].timestamp,
      last: byTime[byTime.length - 1].timestamp,
      min: Math.min(...clicksTrend.value),
      max: Math.max(...clicksTrend.value)
    }
  } else {
    trendMeta.value = null
  }
}

function formatPercent(ctr) {
  return `${(ctr * 100).toFixed(1)}%`
}

function formatPosition(p) {
  return p ? p.toFixed(1) : '—'
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <AppHeader :subtitle="$t('searchConsole.headerSubtitle')" :title="$t('searchConsole.headerTitle')"/>

    <PageIntro :text="$t('intro.searchConsole')" width="6xl"/>

    <div class="max-w-6xl w-full mx-auto px-4 pt-2 flex justify-end">
      <button
          class="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
          type="button"
          @click="showGuide = true"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
        {{ $t('searchConsole.guide') }}
      </button>
    </div>

    <main class="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
      <!-- Connection -->
      <div v-if="!connected" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
        <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">{{ $t('searchConsole.connectTitle') }}</p>

        <!-- Choix de la méthode d'authentification -->
        <div class="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 my-3">
          <button
              :class="authMethod === 'oauth' ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-300'"
              class="px-3 py-1 rounded-md text-xs font-medium transition-colors"
              type="button"
              @click="authMethod = 'oauth'"
          >
            {{ $t('searchConsole.methodOAuth') }}
          </button>
          <button
              :class="authMethod === 'service' ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-300'"
              class="px-3 py-1 rounded-md text-xs font-medium transition-colors"
              type="button"
              @click="authMethod = 'service'"
          >
            {{ $t('searchConsole.methodServiceAccount') }}
          </button>
        </div>

        <!-- Méthode OAuth (Client ID) -->
        <template v-if="authMethod === 'oauth'">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">{{ $t('searchConsole.connectIntro') }}</p>
          <div class="flex flex-col md:flex-row gap-3">
            <input
                :value="settings.searchConsoleClientId"
                class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="xxxxxxxx.apps.googleusercontent.com"
                type="text"
                @input="onClientIdInput"
            />
            <button
                :disabled="loading || !settings.searchConsoleClientId"
                class="btn btn-primary text-sm shrink-0"
                @click="handleConnect"
            >
              {{ loading ? $t('searchConsole.connecting') : $t('searchConsole.connect') }}
            </button>
          </div>
        </template>

        <!-- Méthode compte de service (clé JSON) -->
        <template v-else>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">{{ $t('searchConsole.serviceAccountIntro') }}</p>
          <ol class="text-xs text-gray-500 dark:text-gray-400 list-decimal list-inside space-y-0.5 mb-3">
            <li>{{ $t('searchConsole.serviceStep1') }}</li>
            <li>{{ $t('searchConsole.serviceStep2') }}</li>
            <li>{{ $t('searchConsole.serviceStep3') }}</li>
          </ol>
          <textarea
              :value="settings.searchConsoleServiceAccount"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              :placeholder="'{\n  &quot;type&quot;: &quot;service_account&quot;,\n  &quot;client_email&quot;: &quot;…iam.gserviceaccount.com&quot;,\n  &quot;private_key&quot;: &quot;-----BEGIN PRIVATE KEY-----…&quot;\n}'"
              rows="5"
              @input="onServiceAccountInput"
          />
          <p class="mt-2 text-[11px] text-amber-600 dark:text-amber-400">⚠️ {{ $t('searchConsole.serviceAccountWarning') }}</p>
          <button
              :disabled="loading || !settings.searchConsoleServiceAccount"
              class="btn btn-primary text-sm mt-3"
              @click="handleConnectKey"
          >
            {{ loading ? $t('searchConsole.connecting') : $t('searchConsole.connect') }}
          </button>
        </template>

        <p v-if="error" class="mt-2 text-sm text-red-500">{{ error }}</p>
      </div>

      <!-- Connected controls -->
      <template v-else>
        <div class="flex flex-wrap items-end gap-3 mb-6">
          <label class="text-xs text-gray-600 dark:text-gray-300">
            <span class="block mb-1">{{ $t('searchConsole.site') }}</span>
            <select v-model="selectedSite" class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
              <option v-for="site in sites" :key="site" :value="site">{{ site }}</option>
            </select>
          </label>
          <label class="text-xs text-gray-600 dark:text-gray-300">
            <span class="block mb-1">{{ $t('searchConsole.period') }}</span>
            <select v-model.number="days" class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
              <option :value="7">{{ $t('searchConsole.days7') }}</option>
              <option :value="28">{{ $t('searchConsole.days28') }}</option>
              <option :value="90">{{ $t('searchConsole.days90') }}</option>
              <option :value="180">{{ $t('searchConsole.months6') }}</option>
              <option :value="365">{{ $t('searchConsole.months12') }}</option>
              <option :value="480">{{ $t('searchConsole.months16') }}</option>
            </select>
          </label>
          <label class="text-xs text-gray-600 dark:text-gray-300">
            <span class="block mb-1">{{ $t('searchConsole.searchType') }}</span>
            <select v-model="searchType" class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
              <option value="web">{{ $t('searchConsole.typeWeb') }}</option>
              <option value="image">{{ $t('searchConsole.typeImage') }}</option>
              <option value="video">{{ $t('searchConsole.typeVideo') }}</option>
              <option value="news">{{ $t('searchConsole.typeNews') }}</option>
              <option value="discover">{{ $t('searchConsole.typeDiscover') }}</option>
            </select>
          </label>
          <label class="text-xs text-gray-600 dark:text-gray-300">
            <span class="block mb-1">{{ $t('searchConsole.dimension') }}</span>
            <select v-model="dimension" class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
              <option value="query">{{ $t('searchConsole.queries') }}</option>
              <option value="page">{{ $t('searchConsole.pages') }}</option>
              <option value="country">{{ $t('searchConsole.countries') }}</option>
              <option value="device">{{ $t('searchConsole.devices') }}</option>
              <option value="date">{{ $t('searchConsole.dates') }}</option>
              <option value="searchAppearance">{{ $t('searchConsole.appearance') }}</option>
            </select>
          </label>
          <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 pb-2">
            <input v-model="compare" type="checkbox" class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"/>
            {{ $t('searchConsole.compare') }}
          </label>
          <label class="text-xs text-gray-600 dark:text-gray-300 grow min-w-[18rem]">
            <span class="block mb-1">{{ $t('searchConsole.pageFilter') }}</span>
            <div class="flex gap-2">
              <input
                  v-model="pageFilter"
                  :placeholder="$t('searchConsole.pageFilterPlaceholder')"
                  class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  list="sc-pages"
                  type="text"
                  @focus="ensurePages"
              />
              <button
                  :disabled="loading || !selectedSite"
                  :title="$t('searchConsole.loadPages')"
                  class="shrink-0 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm disabled:opacity-50"
                  type="button"
                  @click="reloadPages"
              >
                ↻
              </button>
            </div>
            <datalist id="sc-pages">
              <option v-for="p in pageList" :key="p" :value="p"/>
            </datalist>
            <span v-if="pagesLoaded" class="block mt-1 text-[11px] text-gray-400">{{ formatNumber(pageList.length) }} {{ $t('searchConsole.pagesAvailable') }}</span>
          </label>
          <button
              :disabled="loading || !selectedSite"
              class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              @click="handleQuery"
          >
            {{ loading ? $t('common.loading') : $t('searchConsole.analyze') }}
          </button>
          <button
              :disabled="loading || !selectedSite"
              class="px-4 py-2 rounded-lg border border-primary-600 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-sm font-medium transition-colors disabled:opacity-50"
              @click="handleReport"
          >
            {{ loading ? $t('common.loading') : $t('searchConsole.fullReport') }}
          </button>
          <button class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm" @click="disconnect">
            {{ $t('searchConsole.disconnect') }}
          </button>
        </div>

        <p v-if="error" class="text-sm text-red-500 mb-4">{{ error }}</p>

        <!-- Inspection d'URL -->
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{{ $t('searchConsole.inspectTitle') }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">{{ $t('searchConsole.inspectHint') }}</p>
          <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">{{ $t('searchConsole.inspectUrlLabel') }}</label>
          <div class="flex flex-col md:flex-row gap-3">
            <input
                v-model="inspectionUrl"
                class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://www.exemple.tld/page/"
                type="text"
            />
            <button
                :disabled="loading || !inspectionUrl"
                class="btn btn-primary text-sm shrink-0"
                @click="handleInspect"
            >
              {{ loading ? $t('common.loading') : $t('searchConsole.inspect') }}
            </button>
          </div>
          <div v-if="inspectionRows.length" class="mt-4">
            <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <li v-for="f in inspectionRows" :key="f.label" class="flex items-center justify-between gap-2 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm">
                <span class="text-gray-500 dark:text-gray-400">{{ f.label }}</span>
                <span class="font-medium text-gray-900 dark:text-white text-right truncate" :title="f.value">{{ f.value }}</span>
              </li>
            </ul>
            <a
                v-if="inspection && inspection.inspectionResultLink"
                :href="inspection.inspectionResultLink"
                class="inline-block mt-3 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                rel="noopener noreferrer"
                target="_blank"
            >
              {{ $t('searchConsole.inspectOpen') }} →
            </a>
          </div>
        </div>

        <!-- Bandeau : périmètre filtré sur une page -->
        <div v-if="appliedFilter" class="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
          <svg class="w-5 h-5 text-primary-600 dark:text-primary-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M3 4h18M6 8h12M10 12h4M9 16h6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
          <p class="text-sm text-primary-900 dark:text-primary-100 min-w-0">
            {{ $t('searchConsole.filteredOn') }}
            <strong class="break-all">{{ appliedFilter }}</strong>
          </p>
          <button
              class="ml-auto shrink-0 text-xs font-medium text-primary-700 dark:text-primary-300 hover:underline"
              type="button"
              @click="clearFilter"
          >
            {{ $t('searchConsole.clearFilter') }}
          </button>
        </div>

        <!-- Comparaison de périodes (totaux) -->
        <div v-if="compareTotals" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{{ $t('searchConsole.compareTitle') }}</p>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div v-for="m in METRICS" :key="m" class="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t(`searchConsole.${m === 'clicks' ? 'clicks' : m === 'impressions' ? 'impressions' : m === 'ctr' ? 'avgCtr' : 'avgPosition'}`) }}</p>
              <p class="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {{ m === 'ctr' ? formatPercent(compareTotals.current[m]) : m === 'position' ? formatPosition(compareTotals.current[m]) : formatNumber(compareTotals.current[m]) }}
              </p>
              <p class="text-xs mt-0.5" :class="deltaClass(m, deltaForMetric(m))">
                {{ formatDelta(deltaForMetric(m)) }}
                <span class="text-gray-400">
                  ({{ m === 'ctr' ? formatPercent(compareTotals.previous[m]) : m === 'position' ? formatPosition(compareTotals.previous[m]) : formatNumber(compareTotals.previous[m]) }})
                </span>
              </p>
            </div>
          </div>
        </div>

        <!-- Rapport complet (toutes dimensions, toutes lignes) -->
        <div v-if="report" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('searchConsole.reportTitle') }}</p>
            <div class="flex gap-2">
              <button class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700" @click="downloadReportCsv">
                {{ $t('searchConsole.downloadCsv') }}
              </button>
              <button class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700" @click="downloadReportJson">
                {{ $t('searchConsole.downloadJson') }}
              </button>
            </div>
          </div>
          <ul class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <li v-for="rc in reportCounts" :key="rc.dim" class="flex items-center justify-between gap-2 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm">
              <span class="text-gray-600 dark:text-gray-300">{{ dimensionLabel(rc.dim) }}</span>
              <span class="font-semibold text-gray-900 dark:text-white">{{ formatNumber(rc.count) }}</span>
            </li>
          </ul>
        </div>

        <!-- Summary -->
        <div v-if="rows.length" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('searchConsole.clicks') }}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ formatNumber(summary.clicks) }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('searchConsole.impressions') }}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ formatNumber(summary.impressions) }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('searchConsole.avgCtr') }}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ formatPercent(summary.ctr) }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('searchConsole.avgPosition') }}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ formatPosition(summary.position) }}</p>
          </div>
        </div>

        <!-- Saisonnalité : clics par date sur la fenêtre choisie -->
        <div v-if="dateSeriesMeta" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{{ $t('searchConsole.seasonality') }}</p>
          <Sparkline :auto-scale="true" :values="dateSeries" :width="640" color="#10b981"/>
          <div class="flex justify-between text-[11px] text-gray-400 mt-1">
            <span>{{ fmtDate(dateSeriesMeta.start) }}</span>
            <span>{{ formatNumber(dateSeriesMeta.min) }}–{{ formatNumber(dateSeriesMeta.max) }} {{ $t('searchConsole.clicksPerDay') }}</span>
            <span>{{ fmtDate(dateSeriesMeta.end) }}</span>
          </div>
          <p class="text-[11px] text-gray-400 mt-1">
            {{ $t('searchConsole.coverage', {withData: formatNumber(dateSeriesMeta.daysWithData), total: formatNumber(dateSeriesMeta.totalDays)}) }}
            <span v-if="dateSeriesMeta.lastData"> · {{ $t('searchConsole.lastData') }} {{ fmtDate(dateSeriesMeta.lastData) }}</span>
          </p>
          <p
              v-if="dateSeriesMeta.staleDays != null && dateSeriesMeta.staleDays > STALE_THRESHOLD"
              class="mt-2 text-xs text-red-600 dark:text-red-400 font-medium"
          >
            ⚠️ {{ $t('searchConsole.trackingStale', {n: formatNumber(dateSeriesMeta.staleDays)}) }}
          </p>
        </div>

        <!-- Clicks trend across saved snapshots -->
        <div v-if="clicksTrend.length > 1 && trendMeta" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{{ $t('searchConsole.clicksTrend') }}</p>
          <Sparkline :auto-scale="true" :values="clicksTrend" :width="640" color="#6366f1"/>
          <div class="flex justify-between text-[11px] text-gray-400 mt-1">
            <span>{{ fmtDate(trendMeta.first) }}</span>
            <span>{{ formatNumber(trendMeta.min) }}–{{ formatNumber(trendMeta.max) }} {{ $t('searchConsole.clicksPerAnalysis') }}</span>
            <span>{{ fmtDate(trendMeta.last) }}</span>
          </div>
        </div>

        <!-- Export toolbar -->
        <div v-if="rows.length" class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ formatNumber(rows.length) }} {{ $t('searchConsole.rowsUnit') }}
            <span v-if="rows.length > DISPLAY_CAP"> — {{ $t('searchConsole.displayCapNote', {n: DISPLAY_CAP}) }}</span>
          </p>
          <div class="flex gap-2">
            <button class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700" @click="exportCsv">
              {{ $t('searchConsole.exportCsv') }}
            </button>
            <button class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700" @click="exportJson">
              {{ $t('searchConsole.exportJson') }}
            </button>
          </div>
        </div>

        <!-- Rows table -->
        <div v-if="rows.length" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
            <tr>
              <th class="text-left font-medium px-4 py-2">{{ dimensionLabel(dimension) }}</th>
              <th class="text-right font-medium px-4 py-2">{{ $t('searchConsole.clicks') }}</th>
              <th class="text-right font-medium px-4 py-2">{{ $t('searchConsole.impr') }}</th>
              <th class="text-right font-medium px-4 py-2">{{ $t('searchConsole.ctr') }}</th>
              <th class="text-right font-medium px-4 py-2">{{ $t('searchConsole.position') }}</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-for="row in displayedRows" :key="row.key">
              <td class="px-4 py-2 text-gray-900 dark:text-white truncate max-w-xs" :title="row.key">{{ row.key }}</td>
              <td class="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{{ formatNumber(row.clicks) }}</td>
              <td class="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{{ formatNumber(row.impressions) }}</td>
              <td class="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{{ formatPercent(row.ctr) }}</td>
              <td class="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{{ formatPosition(row.position) }}</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="!loading && !report" class="text-center py-16 text-sm text-gray-500 dark:text-gray-400">
          {{ $t('searchConsole.emptyHint') }}
        </div>
      </template>
    </main>

    <!-- Guide (documentation embarquée) -->
    <Modal :open="showGuide" :title="$t('searchConsole.guideTitle')" @close="showGuide = false">
      <MarkdownViewer :content="scGuide"/>
    </Modal>
  </div>
</template>
