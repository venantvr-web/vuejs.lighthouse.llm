<script setup>
import {computed, onMounted, ref} from 'vue'
import {useWatchlistStore} from '@/stores/watchlistStore'
import {useScoreHistoryStore} from '@/stores/scoreHistoryStore'
import {useSiteStore} from '@/stores/siteStore'
import {usePersistentRef} from '@/composables/usePersistentRef'
import {useWatchlist} from '@/composables/useWatchlist'
import {useNotifications} from '@/composables/useNotifications'
import {formatDateISO, formatScore, getScoreColorClass} from '@/utils/formatters'
import WatchlistCard from '@/components/history/WatchlistCard.vue'
import {buildWatchlistCsv} from '@/utils/exporters'
import {downloadText} from '@/utils/download'
import AppHeader from '@/components/common/AppHeader.vue'
import {breachedCategories as computeBreached} from '@/utils/budgets'
import {useI18n} from '@/i18n'
import {useToast} from '@/composables/useToast'

const {t} = useI18n()
const toast = useToast()

const watchlistStore = useWatchlistStore()
const scoreHistory = useScoreHistoryStore()
const site = useSiteStore()
const {statsById, refreshingById, errorById, loadStats, loadItemStats, refreshItem} = useWatchlist()
const {isSupported: notificationsSupported, permission: notificationPermission, requestPermission, notify} = useNotifications()

const CATEGORY_LABELS = {
  performance: t('watchlist.categoryPerformance'),
  accessibility: t('watchlist.categoryAccessibility'),
  'best-practices': t('watchlist.categoryBestPractices'),
  seo: t('watchlist.categorySeo')
}

// Track which cards have their budget editor expanded
const budgetEditing = ref({})

function toggleBudgetEditor(id) {
  budgetEditing.value = {...budgetEditing.value, [id]: !budgetEditing.value[id]}
}

function handleSetBudget(item, {category, value}) {
  watchlistStore.setBudget(item.id, category, value)
}

// Categories of an item whose latest score is below its configured budget
function breachedCategories(item) {
  return computeBreached(item.budgets, statsById.value[item.id]?.latest?.scores)
}

// Add form state
// Préremplissage silencieux à partir du site actif
const newUrl = ref(site.origin)
const newLabel = ref('')
const newStrategy = usePersistentRef('watchlist.newStrategy', 'mobile')
const newSource = usePersistentRef('watchlist.newSource', 'pagespeed')
const addError = ref('')

const refreshingAll = ref(false)

const items = computed(() => watchlistStore.sortedItems)

// Aggregate health summary across all monitored sites
const summary = computed(() => {
  const stats = Object.values(statsById.value)
  const perfScores = stats
      .map(s => s.latest?.scores?.performance)
      .filter(v => typeof v === 'number')

  const avgPerf = perfScores.length
      ? perfScores.reduce((a, b) => a + b, 0) / perfScores.length
      : null

  const regressions = stats.filter(s => {
    const d = s.deltas?.performance
    return typeof d === 'number' && d < 0
  }).length

  const neverAudited = stats.filter(s => !s.latest).length

  const budgetBreaches = items.value.filter(item => breachedCategories(item).length > 0).length

  return {
    total: watchlistStore.count,
    avgPerf,
    regressions,
    neverAudited,
    budgetBreaches
  }
})

onMounted(async () => {
  await scoreHistory.initialize()
  await loadStats(items.value)
})

async function handleAdd() {
  addError.value = ''
  if (!newUrl.value.trim()) {
    addError.value = t('watchlist.errorUrlRequired')
    return
  }
  if (watchlistStore.hasUrl(newUrl.value)) {
    addError.value = t('watchlist.errorUrlExists')
    return
  }

  const item = watchlistStore.addItem(newUrl.value, {
    label: newLabel.value,
    strategy: newStrategy.value,
    source: newSource.value
  })

  if (!item) {
    addError.value = t('watchlist.errorUrlInvalid')
    return
  }

  // Mémorise le domaine ; on repart de l'origine pour enchaîner les pages du même site
  site.setFromUrl(newUrl.value)
  newUrl.value = site.origin
  newLabel.value = ''
  await loadItemStats(item)
}

function handleRemove(item) {
  if (confirm(t('watchlist.confirmRemove', {label: item.label}))) {
    watchlistStore.removeItem(item.id)
  }
}

/**
 * Re-audit a single item and surface regressions / budget breaches as a
 * browser notification when notifications are enabled.
 */
async function handleRefresh(item) {
  const result = await refreshItem(item)
  if (!result.success) return

  if (notificationPermission.value === 'granted') {
    const lines = []
    for (const r of result.regressions) {
      lines.push(t('watchlist.notifyRegression', {category: CATEGORY_LABELS[r.category], from: r.from, to: r.to, delta: r.delta}))
    }
    for (const b of result.breaches) {
      lines.push(t('watchlist.notifyBreach', {category: CATEGORY_LABELS[b.category], score: b.score, budget: b.budget}))
    }
    if (lines.length > 0) {
      notify(`⚠️ ${item.label}`, {
        body: lines.join('\n'),
        tag: `watchlist-${item.id}`
      })
    }
  }
}

function exportCsv() {
  downloadText(`watchlist-${formatDateISO()}.csv`, buildWatchlistCsv(items.value, statsById.value), 'text/csv;charset=utf-8')
  toast.success(t('toast.exported'))
}

async function handleRefreshAll() {
  refreshingAll.value = true
  try {
    for (const item of items.value) {
      await handleRefresh(item)
    }
  } finally {
    refreshingAll.value = false
  }
}

async function handleEnableNotifications() {
  await requestPermission()
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <AppHeader :subtitle="$t('watchlist.subtitle')" :title="$t('watchlist.title')">
      <template #actions>
        <button
            v-if="notificationsSupported && notificationPermission !== 'granted'"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            :title="$t('watchlist.enableAlertsTitle')"
            @click="handleEnableNotifications"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
          {{ $t('watchlist.enableAlerts') }}
        </button>
        <span
            v-else-if="notificationsSupported && notificationPermission === 'granted'"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-emerald-600 dark:text-emerald-400 text-sm font-medium"
            :title="$t('watchlist.alertsActiveTitle')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
          {{ $t('watchlist.alertsActive') }}
        </span>
        <button
            v-if="!watchlistStore.isEmpty"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            :title="$t('watchlist.exportCsvTitle')"
            @click="exportCsv"
        >
          CSV
        </button>
        <button
            v-if="!watchlistStore.isEmpty"
            :disabled="refreshingAll"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            @click="handleRefreshAll"
        >
          <svg
              :class="{ 'animate-spin': refreshingAll }"
              class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
          {{ refreshingAll ? $t('watchlist.refreshingAll') : $t('watchlist.refreshAll') }}
        </button>
      </template>
    </AppHeader>

    <main class="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
      <!-- Add form -->
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
        <div class="flex flex-col md:flex-row gap-3">
          <input
              v-model="newUrl"
              class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              :placeholder="$t('watchlist.urlPlaceholder')"
              type="url"
              @keyup.enter="handleAdd"
          />
          <input
              v-model="newLabel"
              class="md:w-44 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              :placeholder="$t('watchlist.labelPlaceholder')"
              type="text"
              @keyup.enter="handleAdd"
          />
          <select
              v-model="newStrategy"
              class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="mobile">{{ $t('common.mobile') }}</option>
            <option value="desktop">{{ $t('common.desktop') }}</option>
          </select>
          <select
              v-model="newSource"
              class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="pagespeed">{{ $t('watchlist.sourcePagespeed') }}</option>
            <option value="local">{{ $t('watchlist.sourceLocal') }}</option>
          </select>
          <button
              class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
              @click="handleAdd"
          >
            {{ $t('watchlist.add') }}
          </button>
        </div>
        <p v-if="addError" class="mt-2 text-sm text-red-500">{{ addError }}</p>
      </div>

      <!-- Summary strip -->
      <div v-if="!watchlistStore.isEmpty" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('watchlist.pagesTracked') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ summary.total }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('watchlist.avgPerf') }}</p>
          <p :class="getScoreColorClass(summary.avgPerf)" class="text-2xl font-bold mt-1">
            {{ formatScore(summary.avgPerf) }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('watchlist.regressions') }}</p>
          <p :class="summary.regressions > 0 ? 'text-red-500' : 'text-emerald-500'" class="text-2xl font-bold mt-1">
            {{ summary.regressions }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('watchlist.budgetBreaches') }}</p>
          <p :class="summary.budgetBreaches > 0 ? 'text-red-500' : 'text-emerald-500'" class="text-2xl font-bold mt-1">
            {{ summary.budgetBreaches }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('watchlist.neverAudited') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ summary.neverAudited }}</p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="watchlistStore.isEmpty" class="text-center py-20">
        <div class="w-16 h-16 mx-auto bg-primary-500/10 rounded-2xl flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{{ $t('watchlist.emptyTitle') }}</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          {{ $t('watchlist.emptyText') }}
        </p>
        <router-link
            class="mt-3 inline-block text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
            to="/lighthouse"
        >
          {{ $t('help.ctaAnalyzeUrl') }} →
        </router-link>
      </div>

      <!-- Cards grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <WatchlistCard
            v-for="item in items"
            :key="item.id"
            :budget-editing="!!budgetEditing[item.id]"
            :error="errorById[item.id]"
            :item="item"
            :refreshing="!!refreshingById[item.id]"
            :stats="statsById[item.id] || null"
            @refresh="handleRefresh(item)"
            @remove="handleRemove(item)"
            @set-budget="payload => handleSetBudget(item, payload)"
            @toggle-budget="toggleBudgetEditor(item.id)"
        />
      </div>
    </main>
  </div>
</template>
