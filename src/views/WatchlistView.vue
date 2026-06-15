<script setup>
import {computed, onMounted, ref} from 'vue'
import {useWatchlistStore} from '@/stores/watchlistStore'
import {useScoreHistoryStore} from '@/stores/scoreHistoryStore'
import {useWatchlist} from '@/composables/useWatchlist'
import {useNotifications} from '@/composables/useNotifications'
import {formatRelativeTime, formatScore, getScoreColorClass} from '@/utils/formatters'
import Sparkline from '@/components/common/Sparkline.vue'

const watchlistStore = useWatchlistStore()
const scoreHistory = useScoreHistoryStore()
const {statsById, refreshingById, errorById, loadStats, loadItemStats, refreshItem} = useWatchlist()
const {isSupported: notificationsSupported, permission: notificationPermission, requestPermission, notify} = useNotifications()

const CATEGORIES = [
  {id: 'performance', label: 'Perf.'},
  {id: 'accessibility', label: 'A11y'},
  {id: 'best-practices', label: 'Pratiques'},
  {id: 'seo', label: 'SEO'}
]

const CATEGORY_LABELS = {
  performance: 'Performance',
  accessibility: 'Accessibilité',
  'best-practices': 'Bonnes pratiques',
  seo: 'SEO'
}

// Track which cards have their budget editor expanded
const budgetEditing = ref({})

function toggleBudgetEditor(id) {
  budgetEditing.value = {...budgetEditing.value, [id]: !budgetEditing.value[id]}
}

function onBudgetInput(item, category, event) {
  const raw = event.target.value
  watchlistStore.setBudget(item.id, category, raw === '' ? null : raw)
}

// Categories of a card whose latest score is below its configured budget
function breachedCategories(item) {
  const latest = statsById.value[item.id]?.latest
  if (!latest?.scores || !item.budgets) return []
  return CATEGORIES
      .filter(cat => {
        const budget = item.budgets[cat.id]
        const score = latest.scores[cat.id]
        return typeof budget === 'number' && typeof score === 'number' && Math.round(score * 100) < budget
      })
      .map(cat => cat.id)
}

// Add form state
const newUrl = ref('')
const newLabel = ref('')
const newStrategy = ref('mobile')
const newSource = ref('pagespeed')
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
    addError.value = 'Veuillez saisir une URL.'
    return
  }
  if (watchlistStore.hasUrl(newUrl.value)) {
    addError.value = 'Cette URL est déjà suivie.'
    return
  }

  const item = watchlistStore.addItem(newUrl.value, {
    label: newLabel.value,
    strategy: newStrategy.value,
    source: newSource.value
  })

  if (!item) {
    addError.value = 'URL invalide.'
    return
  }

  newUrl.value = ''
  newLabel.value = ''
  await loadItemStats(item)
}

function handleRemove(item) {
  if (confirm(`Retirer « ${item.label} » de la watchlist ?`)) {
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
      lines.push(`${CATEGORY_LABELS[r.category]} : ${r.from} → ${r.to} (${r.delta})`)
    }
    for (const b of result.breaches) {
      lines.push(`${CATEGORY_LABELS[b.category]} sous le budget (${b.score} < ${b.budget})`)
    }
    if (lines.length > 0) {
      notify(`⚠️ ${item.label}`, {
        body: lines.join('\n'),
        tag: `watchlist-${item.id}`
      })
    }
  }
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

function deltaPoints(delta) {
  if (typeof delta !== 'number') return null
  return Math.round(delta * 100)
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="border-b border-gray-200 dark:border-gray-800">
      <div class="max-w-6xl mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <router-link
                class="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Accueil"
                to="/"
            >
              <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </router-link>
            <div>
              <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                Watchlist
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Suivi quotidien de la santé de vos pages
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Notifications toggle -->
            <button
                v-if="notificationsSupported && notificationPermission !== 'granted'"
                class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
                title="Recevoir une alerte navigateur en cas de régression ou de budget dépassé"
                @click="handleEnableNotifications"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              Activer les alertes
            </button>
            <span
                v-else-if="notificationsSupported && notificationPermission === 'granted'"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-emerald-600 dark:text-emerald-400 text-sm font-medium"
                title="Les alertes navigateur sont activées"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              Alertes actives
            </span>

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
              {{ refreshingAll ? 'Analyse en cours…' : 'Tout ré-auditer' }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
      <!-- Add form -->
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
        <div class="flex flex-col md:flex-row gap-3">
          <input
              v-model="newUrl"
              class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://exemple.com/page"
              type="url"
              @keyup.enter="handleAdd"
          />
          <input
              v-model="newLabel"
              class="md:w-44 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Nom (optionnel)"
              type="text"
              @keyup.enter="handleAdd"
          />
          <select
              v-model="newStrategy"
              class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="mobile">Mobile</option>
            <option value="desktop">Desktop</option>
          </select>
          <select
              v-model="newSource"
              class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="pagespeed">PageSpeed</option>
            <option value="local">Chromium local</option>
          </select>
          <button
              class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
              @click="handleAdd"
          >
            Ajouter
          </button>
        </div>
        <p v-if="addError" class="mt-2 text-sm text-red-500">{{ addError }}</p>
      </div>

      <!-- Summary strip -->
      <div v-if="!watchlistStore.isEmpty" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pages suivies</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ summary.total }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Perf. moyenne</p>
          <p :class="getScoreColorClass(summary.avgPerf)" class="text-2xl font-bold mt-1">
            {{ formatScore(summary.avgPerf) }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Régressions</p>
          <p :class="summary.regressions > 0 ? 'text-red-500' : 'text-emerald-500'" class="text-2xl font-bold mt-1">
            {{ summary.regressions }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Budgets dépassés</p>
          <p :class="summary.budgetBreaches > 0 ? 'text-red-500' : 'text-emerald-500'" class="text-2xl font-bold mt-1">
            {{ summary.budgetBreaches }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Jamais audité</p>
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
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aucune page suivie</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Ajoutez les URLs que vous voulez surveiller au quotidien. Chaque ré-audit est
          comparé au précédent pour détecter les régressions.
        </p>
      </div>

      <!-- Cards grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
            v-for="item in items"
            :key="item.id"
            :class="breachedCategories(item).length > 0
              ? 'border-red-300 dark:border-red-500/50 ring-1 ring-red-200 dark:ring-red-500/20'
              : 'border-gray-200 dark:border-gray-700'"
            class="bg-white dark:bg-gray-800 border rounded-xl p-5 flex flex-col"
        >
          <!-- Card header -->
          <div class="flex items-start justify-between gap-2 mb-4">
            <div class="min-w-0">
              <h3 class="font-semibold text-gray-900 dark:text-white truncate">{{ item.label }}</h3>
              <a
                  :href="item.url"
                  class="text-xs text-gray-500 dark:text-gray-400 hover:text-primary-500 truncate block"
                  rel="noopener noreferrer"
                  target="_blank"
              >{{ item.url }}</a>
              <div class="flex items-center gap-1.5 mt-1.5">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {{ item.strategy === 'desktop' ? 'Desktop' : 'Mobile' }}
                </span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {{ item.source === 'local' ? 'Chromium' : 'PageSpeed' }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-0.5 shrink-0">
              <button
                  :class="budgetEditing[item.id] ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-400 hover:text-primary-500'"
                  class="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  title="Budgets de performance"
                  @click="toggleBudgetEditor(item.id)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M3 6l9-4 9 4M4 10v10a1 1 0 001 1h3m10-11v11a1 1 0 01-1 1h-3m-6 0h6m-6 0v-6a1 1 0 011-1h4a1 1 0 011 1v6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </button>
              <button
                  class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                  title="Retirer"
                  @click="handleRemove(item)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Budget editor -->
          <div v-if="budgetEditing[item.id]" class="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
            <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Budgets (score minimum)
            </p>
            <div class="grid grid-cols-2 gap-2">
              <label v-for="cat in CATEGORIES" :key="cat.id" class="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span>{{ cat.label }}</span>
                <input
                    :value="item.budgets?.[cat.id] ?? ''"
                    class="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                    max="100"
                    min="0"
                    placeholder="—"
                    type="number"
                    @input="onBudgetInput(item, cat.id, $event)"
                />
              </label>
            </div>
          </div>

          <!-- Scores -->
          <div v-if="statsById[item.id]?.latest" class="grid grid-cols-4 gap-2 mb-4">
            <div v-for="cat in CATEGORIES" :key="cat.id" class="text-center">
              <p class="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{{ cat.label }}</p>
              <p
                  :class="[
                    getScoreColorClass(statsById[item.id].latest.scores?.[cat.id]),
                    breachedCategories(item).includes(cat.id) ? 'underline decoration-red-500 decoration-2 underline-offset-2' : ''
                  ]"
                  class="text-lg font-bold leading-none"
                  :title="breachedCategories(item).includes(cat.id) ? `Budget ${item.budgets[cat.id]} non atteint` : ''"
              >
                {{ formatScore(statsById[item.id].latest.scores?.[cat.id]) }}
              </p>
              <p
                  v-if="deltaPoints(statsById[item.id].deltas?.[cat.id])"
                  :class="deltaPoints(statsById[item.id].deltas[cat.id]) > 0 ? 'text-emerald-500' : 'text-red-500'"
                  class="text-[10px] font-medium mt-0.5"
              >
                {{ deltaPoints(statsById[item.id].deltas[cat.id]) > 0 ? '▲' : '▼' }}
                {{ Math.abs(deltaPoints(statsById[item.id].deltas[cat.id])) }}
              </p>
            </div>
          </div>

          <!-- Never audited -->
          <div v-else class="flex-1 flex items-center justify-center py-4 mb-2">
            <p class="text-sm text-gray-400 dark:text-gray-500">Jamais audité</p>
          </div>

          <!-- Sparkline -->
          <div v-if="statsById[item.id]?.sparkline?.length > 1" class="mb-4">
            <p class="text-[10px] text-gray-400 dark:text-gray-500 mb-1">Tendance performance</p>
            <Sparkline :values="statsById[item.id].sparkline" :width="240" color="#6366f1"/>
          </div>

          <!-- Per-item error -->
          <p v-if="errorById[item.id]" class="text-xs text-red-500 mb-2">{{ errorById[item.id] }}</p>

          <!-- Footer -->
          <div class="mt-auto flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50">
            <span class="text-xs text-gray-400 dark:text-gray-500">
              <template v-if="statsById[item.id]?.lastCheckedAt">
                Vérifié {{ formatRelativeTime(statsById[item.id].lastCheckedAt) }}
              </template>
              <template v-else>—</template>
            </span>
            <button
                :disabled="refreshingById[item.id]"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors disabled:opacity-50"
                @click="handleRefresh(item)"
            >
              <svg
                  :class="{ 'animate-spin': refreshingById[item.id] }"
                  class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              {{ refreshingById[item.id] ? 'Analyse…' : 'Ré-auditer' }}
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
