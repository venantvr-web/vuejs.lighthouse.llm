<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCrawlStore, CRAWL_STATUS } from '@/stores/crawlStore'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'

const router = useRouter()
const crawlStore = useCrawlStore()

const loading = ref(true)
const error = ref('')
const deleteConfirm = ref(null)

// Computed
const sessions = computed(() => crawlStore.sortedSessions)

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
  if (score === null || score === undefined) return 'bg-gray-200'
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
            <router-link to="/crawl" class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

          <router-link
            to="/crawl"
            class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
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
          <LoadingSpinner size="lg" />
        </div>

        <!-- Error -->
        <ErrorAlert
          v-else-if="error"
          type="error"
          title="Erreur"
          :message="error"
          dismissible
          class="mb-6"
          @dismiss="error = ''"
        />

        <!-- Empty state -->
        <div v-else-if="isEmpty" class="text-center py-16">
          <div class="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucun crawl enregistre
          </h3>
          <p class="text-gray-500 mb-6">
            Lancez votre premier crawl pour analyser plusieurs pages de votre site.
          </p>
          <router-link
            to="/crawl"
            class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Lancer un crawl
          </router-link>
        </div>

        <!-- Sessions list -->
        <div v-else class="space-y-4">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors cursor-pointer"
            @click="viewSession(session.id)"
          >
            <div class="flex items-start justify-between gap-4">
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
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
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
                    class="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold"
                    :class="getScoreColorClass(getAverageScore(session.aggregateScores))"
                  >
                    {{ formatScore(getAverageScore(session.aggregateScores)) }}
                  </div>
                  <span class="text-xs text-gray-500 mt-1 block">Moyenne</span>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2" @click.stop>
                  <button
                    class="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Supprimer"
                    @click="confirmDelete(session.id)"
                  >
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                  class="w-2 h-2 rounded-full"
                  :style="{ backgroundColor: template.color }"
                ></span>
                {{ template.name }} ({{ template.count }})
              </span>
              <span
                v-if="session.templates.length > 5"
                class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500"
              >
                +{{ session.templates.length - 5 }} autres
              </span>
            </div>
          </div>
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
          <p class="text-gray-500 mb-6">
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
    </Teleport>
  </div>
</template>
