<script setup>
import {computed, onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {CRAWL_SERVICES, CRAWL_STATUS, useCrawlStore} from '@/stores/crawlStore'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import FilterChips from '@/components/common/FilterChips.vue'
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import SelectionCheckbox from '@/components/common/SelectionCheckbox.vue'
import {useFilters} from '@/composables/useFilters'
import {useSelection} from '@/composables/useSelection'
import {useComparison} from '@/composables/useComparison'

const router = useRouter()
const crawlStore = useCrawlStore()
const {saveToStorage} = useComparison()

const loading = ref(true)
const error = ref('')
const deleteConfirm = ref(null)

// Selection mode
const {
  selectedItems,
  selectionMode,
  canSelect,
  canCompare,
  selectedCount,
  toggleSelection,
  isSelected,
  clearSelection,
  enterSelectionMode,
  exitSelectionMode,
  getComparisonPair
} = useSelection(2)

// Filters
const {
  searchQuery,
  activeFilters,
  dateRange,
  hasActiveFilters,
  clearAllFilters,
  filterItems
} = useFilters({
  status: [],
  service: [],
  strategy: []
})

// Filter configuration
const filterConfig = [
  {
    key: 'status',
    label: 'Statut',
    options: [
      {value: CRAWL_STATUS.COMPLETED, label: 'Termine'},
      {value: CRAWL_STATUS.PARTIAL, label: 'Partiel'},
      {value: CRAWL_STATUS.FAILED, label: 'Echec'},
      {value: CRAWL_STATUS.CANCELLED, label: 'Annule'}
    ]
  },
  {
    key: 'service',
    label: 'Service',
    options: [
      {value: CRAWL_SERVICES.PAGESPEED, label: 'PageSpeed'},
      {value: CRAWL_SERVICES.LOCAL, label: 'Local'}
    ]
  },
  {
    key: 'strategy',
    label: 'Strategie',
    options: [
      {value: 'mobile', label: 'Mobile'},
      {value: 'desktop', label: 'Desktop'}
    ]
  }
]

// Computed
const sessions = computed(() => crawlStore.sortedSessions)

const filteredSessions = computed(() => {
  return filterItems(sessions.value, {
    searchField: 'domain',
    timestampField: 'timestamp',
    filterFields: {
      status: 'status',
      service: 'service',
      strategy: 'strategy'
    }
  })
})

const isEmpty = computed(() => sessions.value.length === 0)

// Get status class
function getStatusClass(status) {
  switch (status) {
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
}

// Get status label
function getStatusLabel(status) {
  switch (status) {
    case CRAWL_STATUS.COMPLETED:
      return 'Termine'
    case CRAWL_STATUS.PARTIAL:
      return 'Partiel'
    case CRAWL_STATUS.FAILED:
      return 'Echec'
    case CRAWL_STATUS.CANCELLED:
      return 'Annule'
    default:
      return status || 'Inconnu'
  }
}

// Format date
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

// Format relative time
function formatRelativeTime(timestamp) {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'A l\'instant'
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days < 7) return `Il y a ${days}j`
  return formatDate(timestamp)
}

// Get average score
function getAverageScore(aggregateScores) {
  if (!aggregateScores) return null
  const values = Object.values(aggregateScores).map(s => s.avg).filter(v => v !== null)
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

// Format score
function formatScore(score) {
  if (score === null || score === undefined) return '-'
  return Math.round(score * 100)
}

// Get score color class
function getScoreColorClass(score) {
  if (score === null || score === undefined) return 'bg-gray-200 dark:bg-gray-700'
  const value = score * 100
  if (value >= 90) return 'bg-emerald-500'
  if (value >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

// View session
function viewSession(sessionId) {
  router.push(`/crawl/results/${sessionId}`)
}

// Delete session
async function confirmDelete(sessionId) {
  deleteConfirm.value = sessionId
}

async function deleteSession(sessionId) {
  try {
    await crawlStore.deleteSession(sessionId)
    deleteConfirm.value = null
  } catch (err) {
    error.value = err.message
  }
}

function cancelDelete() {
  deleteConfirm.value = null
}

// Compare selected sessions
function compareSelected() {
  if (!canCompare.value) return
  const [sessionA, sessionB] = getComparisonPair()
  saveToStorage(sessionA, sessionB, 'comparison-items')
  router.push('/comparison?mode=session')
}

// Initialize
onMounted(async () => {
  try {
    await crawlStore.initialize()
    await crawlStore.loadSessions()
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
      <div class="max-w-5xl mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <router-link class="flex items-center gap-3" to="/crawl">
              <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </div>
              <div>
                <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                  Historique des Crawls
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ sessions.length }} session{{ sessions.length > 1 ? 's' : '' }} enregistree{{ sessions.length > 1 ? 's' : '' }}
                </p>
              </div>
            </router-link>
          </div>

          <!-- Compare button -->
          <button
              v-if="!selectionMode && sessions.length >= 2"
              class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
              @click="enterSelectionMode"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            Comparer
          </button>

          <button
              v-if="selectionMode"
              class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
              @click="exitSelectionMode"
          >
            Annuler
          </button>

          <router-link
              class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              to="/crawl"
          >
            Nouveau crawl
          </router-link>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 p-4">
      <div class="max-w-5xl mx-auto">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
          <LoadingSpinner size="lg"/>
        </div>

        <!-- Error -->
        <ErrorAlert
            v-else-if="error"
            :message="error"
            class="mb-6"
            dismissible
            title="Erreur"
            type="error"
            @dismiss="error = ''"
        />

        <!-- Filters -->
        <div v-else-if="!isEmpty" class="space-y-4">
          <!-- Search & Filters bar -->
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div class="flex flex-col lg:flex-row gap-4">
              <!-- Search -->
              <div class="flex-1">
                <SearchInput
                    v-model="searchQuery"
                    placeholder="Rechercher par domaine..."
                />
              </div>

              <!-- Filters -->
              <div class="flex flex-wrap items-center gap-3">
                <FilterChips
                    v-model="activeFilters"
                    :filters="filterConfig"
                />
                <DateRangePicker v-model="dateRange"/>
              </div>
            </div>

            <!-- Active filters summary -->
            <div v-if="hasActiveFilters" class="mt-4 flex items-center justify-between">
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ filteredSessions.length }} resultat{{ filteredSessions.length > 1 ? 's' : '' }}
                sur {{ sessions.length }} session{{ sessions.length > 1 ? 's' : '' }}
              </p>
              <button
                  class="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  @click="clearAllFilters"
              >
                Effacer les filtres
              </button>
            </div>
          </div>

          <!-- Sessions list -->
          <div
              v-for="session in filteredSessions"
              :key="session.id"
              :class="[
                'bg-white dark:bg-gray-800 rounded-xl border p-4 transition-colors cursor-pointer',
                isSelected(session.id)
                  ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                  : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600'
              ]"
              @click="selectionMode ? toggleSelection(session) : viewSession(session.id)"
          >
            <div class="flex items-start justify-between gap-4">
              <!-- Selection checkbox -->
              <SelectionCheckbox
                  v-if="selectionMode"
                  :disabled="!canSelect"
                  :selected="isSelected(session.id)"
                  class="mt-1 flex-shrink-0"
                  @toggle="toggleSelection(session)"
              />

              <!-- Left: Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-lg font-medium text-gray-900 dark:text-white truncate">
                    {{ session.domain }}
                  </h3>
                  <span :class="['px-2 py-0.5 rounded text-xs font-medium', getStatusClass(session.status)]">
                    {{ getStatusLabel(session.status) }}
                  </span>
                </div>
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                  <span>{{ formatRelativeTime(session.timestamp) }}</span>
                  <span>{{ session.pagesAnalyzed }}/{{ session.pageCount }} pages</span>
                  <span>{{ session.service }}</span>
                  <span>{{ session.strategy }}</span>
                </div>
              </div>

              <!-- Right: Average score + actions -->
              <div class="flex items-center gap-4">
                <!-- Average score -->
                <div v-if="getAverageScore(session.aggregateScores) !== null" class="text-center">
                  <div
                      :class="getScoreColorClass(getAverageScore(session.aggregateScores))"
                      class="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold"
                  >
                    {{ formatScore(getAverageScore(session.aggregateScores)) }}
                  </div>
                  <span class="text-xs text-gray-500 dark:text-gray-400 mt-1 block">Moyenne</span>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2" @click.stop>
                  <button
                      class="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Supprimer"
                      @click="confirmDelete(session.id)"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Template summary (if available) -->
            <div v-if="session.templates && session.templates.length > 0" class="mt-4 flex flex-wrap gap-2">
              <span
                  v-for="template in session.templates.slice(0, 5)"
                  :key="template.name"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300"
              >
                <span
                    :style="{ backgroundColor: template.color }"
                    class="w-2 h-2 rounded-full"
                ></span>
                {{ template.name }} ({{ template.count }})
              </span>
              <span
                  v-if="session.templates.length > 5"
                  class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400"
              >
                +{{ session.templates.length - 5 }} autres
              </span>
            </div>
          </div>

          <!-- No results after filtering -->
          <div v-if="filteredSessions.length === 0 && hasActiveFilters" class="text-center py-12">
            <div class="w-12 h-12 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </div>
            <p class="text-gray-500 dark:text-gray-400 mb-2">Aucun resultat pour ces criteres</p>
            <button
                class="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                @click="clearAllFilters"
            >
              Effacer les filtres
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="isEmpty" class="text-center py-16">
          <div class="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucun crawl enregistre
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-6">
            Lancez votre premier crawl pour analyser plusieurs pages de votre site.
          </p>
          <router-link
              class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              to="/crawl"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            Lancer un crawl
          </router-link>
        </div>
      </div>
    </main>

    <!-- Delete confirmation modal -->
    <Teleport to="body">
      <div
          v-if="deleteConfirm"
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          @click.self="cancelDelete"
      >
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Supprimer cette session ?
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-6">
            Cette action est irreversible. Les donnees de cette session de crawl seront definitivement supprimees.
          </p>
          <div class="flex justify-end gap-3">
            <button
                class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
                @click="cancelDelete"
            >
              Annuler
            </button>
            <button
                class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                @click="deleteSession(deleteConfirm)"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>

      <!-- Floating comparison bar -->
      <Transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="transform translate-y-full opacity-0"
          enter-to-class="transform translate-y-0 opacity-100"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="transform translate-y-0 opacity-100"
          leave-to-class="transform translate-y-full opacity-0"
      >
        <div
            v-if="selectionMode && selectedCount > 0"
            class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-6 z-40"
        >
          <div class="text-sm text-gray-600 dark:text-gray-400">
            <span class="font-semibold text-gray-900 dark:text-white">{{ selectedCount }}</span>
            session{{ selectedCount > 1 ? 's' : '' }} selectionnee{{ selectedCount > 1 ? 's' : '' }}
          </div>

          <div class="flex items-center gap-3">
            <button
                class="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
                @click="clearSelection"
            >
              Effacer
            </button>
            <button
                :class="[
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                  canCompare
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                ]"
                :disabled="!canCompare"
                @click="compareSelected"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              Comparer
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
