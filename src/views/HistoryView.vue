<script setup>
import {computed, onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {useScoreHistoryStore} from '@/stores/scoreHistoryStore'
import {useExportPDF} from '@/composables/useExportPDF'
import DomainList from '@/components/history/DomainList.vue'
import AnalysisTable from '@/components/history/AnalysisTable.vue'
import ScoreChartGrid from '@/components/history/ScoreChartGrid.vue'

const router = useRouter()
const historyStore = useScoreHistoryStore()
const {generatePDF, loading: pdfLoading} = useExportPDF()

const chartsRef = ref(null)

const showDeleteConfirm = ref(false)
const domainToDelete = ref(null)
const scoreToDelete = ref(null)
const exportLoading = ref(false)

onMounted(async () => {
  await historyStore.initialize()
})

const selectedDomainData = computed(() => {
  if (!historyStore.currentDomain) return null
  return historyStore.domains.find(d => d.domain === historyStore.currentDomain)
})

async function handleSelectDomain(domain) {
  await historyStore.loadScoresForDomain(domain)
}

function confirmDeleteDomain(domain) {
  domainToDelete.value = domain
  scoreToDelete.value = null
  showDeleteConfirm.value = true
}

function confirmDeleteScore(id) {
  scoreToDelete.value = id
  domainToDelete.value = null
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (domainToDelete.value) {
    await historyStore.deleteDomain(domainToDelete.value)
  } else if (scoreToDelete.value) {
    await historyStore.deleteScore(scoreToDelete.value)
  }
  showDeleteConfirm.value = false
  domainToDelete.value = null
  scoreToDelete.value = null
}

function cancelDelete() {
  showDeleteConfirm.value = false
  domainToDelete.value = null
  scoreToDelete.value = null
}

async function exportJSON() {
  exportLoading.value = true
  try {
    const json = await historyStore.exportToJSON(historyStore.currentDomain)
    const blob = new Blob([json], {type: 'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = historyStore.currentDomain
        ? `lighthouse-history-${historyStore.currentDomain}.json`
        : 'lighthouse-history-all.json'
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Export failed:', err)
  } finally {
    exportLoading.value = false
  }
}

async function exportAllJSON() {
  exportLoading.value = true
  try {
    const json = await historyStore.exportToJSON()
    const blob = new Blob([json], {type: 'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lighthouse-history-all.json'
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Export failed:', err)
  } finally {
    exportLoading.value = false
  }
}

async function exportPDF() {
  if (!historyStore.currentDomain) return
  try {
    await generatePDF(
        historyStore.currentDomain,
        historyStore.currentScores,
        chartsRef.value
    )
  } catch (err) {
    console.error('PDF export failed:', err)
  }
}

async function confirmClearAll() {
  if (confirm('Supprimer tout l\'historique ? Cette action est irreversible.')) {
    await historyStore.clearAll()
  }
}

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="history-view">
    <!-- Header -->
    <header class="history-header">
      <div class="header-left">
        <button class="back-btn" title="Retour" @click="goHome">
          <svg fill="none" height="20" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="20">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Historique des Analyses</h1>
      </div>
      <div class="header-actions">
        <button
            :disabled="historyStore.isEmpty || exportLoading"
            class="btn btn-secondary"
            @click="exportAllJSON"
        >
          <svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Exporter tout
        </button>
        <button
            :disabled="historyStore.isEmpty"
            class="btn btn-danger"
            @click="confirmClearAll"
        >
          <svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          Tout supprimer
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="history-content">
      <!-- Sidebar - Domain List -->
      <aside class="history-sidebar">
        <DomainList
            :domains="historyStore.domains"
            :loading="historyStore.loading"
            :selected-domain="historyStore.currentDomain"
            @delete="confirmDeleteDomain"
            @select="handleSelectDomain"
        />
      </aside>

      <!-- Main Panel -->
      <main class="history-main">
        <!-- Empty State -->
        <div v-if="historyStore.isEmpty" class="empty-state">
          <div class="empty-icon">
            <svg fill="none" height="64" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" width="64">
              <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2>Aucun historique</h2>
          <p>Commencez par analyser une URL pour enregistrer vos premiers scores.</p>
          <button class="btn btn-primary" @click="goHome">
            Analyser une URL
          </button>
        </div>

        <!-- No Domain Selected -->
        <div v-else-if="!historyStore.currentDomain" class="no-selection">
          <div class="no-selection-icon">
            <svg fill="none" height="48" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" width="48">
              <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
            </svg>
          </div>
          <p>Selectionnez un domaine pour voir son historique</p>
        </div>

        <!-- Domain Details -->
        <div v-else class="domain-details">
          <!-- Domain Header -->
          <div class="domain-header">
            <div class="domain-info">
              <h2>{{ historyStore.currentDomain }}</h2>
              <span class="analysis-count">
                {{ selectedDomainData?.count || 0 }} analyse{{ (selectedDomainData?.count || 0) > 1 ? 's' : '' }}
              </span>
            </div>
            <div class="domain-actions">
              <button
                  :disabled="exportLoading"
                  class="btn btn-secondary btn-sm"
                  @click="exportJSON"
              >
                <svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="14">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                JSON
              </button>
              <button
                  :disabled="pdfLoading"
                  class="btn btn-primary btn-sm"
                  @click="exportPDF"
              >
                <svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="14">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                </svg>
                PDF
              </button>
            </div>
          </div>

          <!-- Charts Grid -->
          <section class="charts-section">
            <h3>Evolution des scores</h3>
            <div ref="chartsRef">
              <ScoreChartGrid :scores="historyStore.currentScores"/>
            </div>
          </section>

          <!-- Analysis Table -->
          <section class="table-section">
            <h3>Historique detaille</h3>
            <AnalysisTable
                :scores="historyStore.currentScores"
                @delete="confirmDeleteScore"
            />
          </section>
        </div>
      </main>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click="cancelDelete">
        <div class="modal" @click.stop>
          <h3>Confirmer la suppression</h3>
          <p v-if="domainToDelete">
            Supprimer toutes les analyses pour <strong>{{ domainToDelete }}</strong> ?
          </p>
          <p v-else>
            Supprimer cette analyse ?
          </p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="cancelDelete">
              Annuler
            </button>
            <button class="btn btn-danger" @click="handleDelete">
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.history-view {
  min-height: 100vh;
  background-color: var(--color-bg);
  display: flex;
  flex-direction: column;
}

/* Header */
.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}

.back-btn:hover {
  background-color: var(--color-bg-hover);
}

.history-header h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

/* Content Layout */
.history-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.history-sidebar {
  width: 280px;
  min-width: 280px;
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
}

.history-main {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* Empty States */
.empty-state,
.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  color: var(--color-text-muted);
}

.empty-icon,
.no-selection-icon {
  color: var(--color-border);
  margin-bottom: 1rem;
}

.empty-state h2 {
  margin: 0 0 0.5rem;
  color: var(--color-text);
}

.empty-state p {
  margin: 0 0 1.5rem;
}

/* Domain Details */
.domain-details {
  max-width: 1200px;
  margin: 0 auto;
}

.domain-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.domain-info h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--color-text);
}

.analysis-count {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.domain-actions {
  display: flex;
  gap: 0.5rem;
}

/* Sections */
.charts-section,
.table-section {
  margin-bottom: 2rem;
}

.charts-section h3,
.table-section h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.btn-secondary {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-bg-hover);
}

.btn-danger {
  background-color: var(--color-danger);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: var(--color-danger-dark);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--color-bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal h3 {
  margin: 0 0 1rem;
  font-size: 1.125rem;
  color: var(--color-text);
}

.modal p {
  margin: 0 0 1.5rem;
  color: var(--color-text-muted);
}

.modal strong {
  color: var(--color-text);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .history-content {
    flex-direction: column;
  }

  .history-sidebar {
    width: 100%;
    min-width: unset;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .history-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .header-left {
    justify-content: flex-start;
  }

  .header-actions {
    justify-content: flex-end;
  }
}
</style>
