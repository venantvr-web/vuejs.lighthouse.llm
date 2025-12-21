<script setup>
import {computed} from 'vue'
import {useRouter} from 'vue-router'
import CrawlBadge from '@/components/history/CrawlBadge.vue'
import SelectionCheckbox from '@/components/common/SelectionCheckbox.vue'

const router = useRouter()

const props = defineProps({
  scores: {
    type: Array,
    required: true
  },
  selectionMode: {
    type: Boolean,
    default: false
  },
  selectedIds: {
    type: Array,
    default: () => []
  },
  canSelect: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['delete', 'view', 'toggle-selection'])

function isSelected(id) {
  return props.selectedIds.includes(id)
}

function navigateToCrawl(sessionId) {
  router.push(`/crawl/results/${sessionId}`)
}

const sortedScores = computed(() => {
  return [...props.scores].sort((a, b) => b.timestamp - a.timestamp)
})

const categories = [
  {key: 'performance', label: 'Perf'},
  {key: 'accessibility', label: 'A11y'},
  {key: 'best-practices', label: 'BP'},
  {key: 'seo', label: 'SEO'},
  {key: 'pwa', label: 'PWA'}
]

function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatScore(score) {
  if (score === null || score === undefined) return '-'
  return Math.round(score * 100)
}

function getScoreClass(score) {
  if (score === null || score === undefined) return ''
  if (score >= 0.9) return 'score-good'
  if (score >= 0.5) return 'score-average'
  return 'score-poor'
}

function getSourceLabel(source) {
  const labels = {
    pagespeed: 'PageSpeed',
    local: 'Local',
    file: 'Fichier'
  }
  return labels[source] || source || '-'
}

function getStrategyLabel(strategy) {
  return strategy === 'desktop' ? 'Desktop' : 'Mobile'
}
</script>

<template>
  <div class="analysis-table-container">
    <table class="analysis-table">
      <thead>
      <tr>
        <th v-if="selectionMode" class="col-select"></th>
        <th class="col-date">Date</th>
        <th class="col-source">Source</th>
        <th class="col-strategy">Mode</th>
        <th class="col-crawl">Crawl</th>
        <th v-for="cat in categories" :key="cat.key" class="col-score">
          {{ cat.label }}
        </th>
        <th class="col-actions">Actions</th>
      </tr>
      </thead>
      <tbody>
      <tr
          v-for="score in sortedScores"
          :key="score.id"
          :class="{
            'row-selected': selectionMode && isSelected(score.id),
            'row-selectable': selectionMode
          }"
          @click="selectionMode ? emit('toggle-selection', score) : null"
      >
        <td v-if="selectionMode" class="col-select">
          <SelectionCheckbox
              :disabled="!canSelect"
              :selected="isSelected(score.id)"
              size="sm"
              @toggle="emit('toggle-selection', score)"
          />
        </td>
        <td class="col-date">
          <span class="date-value">{{ formatDateTime(score.timestamp) }}</span>
        </td>
        <td class="col-source">
            <span :class="score.source" class="source-badge">
              {{ getSourceLabel(score.source) }}
            </span>
        </td>
        <td class="col-strategy">
            <span :class="score.strategy" class="strategy-badge">
              {{ getStrategyLabel(score.strategy) }}
            </span>
        </td>
        <td class="col-crawl">
          <CrawlBadge
              v-if="score.crawlSessionId"
              :session-id="score.crawlSessionId"
              :template-name="score.pageTemplate"
              size="xs"
              @click="navigateToCrawl"
          />
          <span v-else class="no-crawl">-</span>
        </td>
        <td
            v-for="cat in categories"
            :key="cat.key"
            :class="getScoreClass(score.scores?.[cat.key])"
            class="col-score"
        >
          {{ formatScore(score.scores?.[cat.key]) }}
        </td>
        <td class="col-actions">
          <button
              class="action-btn delete"
              title="Supprimer"
              @click="emit('delete', score.id)"
          >
            <svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="14">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </td>
      </tr>
      </tbody>
    </table>

    <div v-if="scores.length === 0" class="empty-state">
      Aucune analyse pour ce domaine.
    </div>
  </div>
</template>

<style scoped>
.analysis-table-container {
  overflow-x: auto;
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
}

.analysis-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.analysis-table th,
.analysis-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.analysis-table th {
  font-weight: 600;
  color: var(--color-text-muted);
  background-color: var(--color-bg-tertiary);
  white-space: nowrap;
}

.analysis-table tbody tr:hover {
  background-color: var(--color-bg-hover);
}

.col-date {
  min-width: 150px;
}

.col-source,
.col-strategy {
  min-width: 80px;
}

.col-crawl {
  min-width: 90px;
  text-align: center !important;
}

.no-crawl {
  color: var(--color-text-muted);
}

.col-score {
  min-width: 50px;
  text-align: center !important;
  font-weight: 600;
}

.col-actions {
  width: 60px;
  text-align: center !important;
}

.date-value {
  color: var(--color-text);
}

.source-badge,
.strategy-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.source-badge.pagespeed {
  background-color: var(--color-info-light);
  color: var(--color-info);
}

.source-badge.local {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.source-badge.file {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

.strategy-badge.mobile {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}

.strategy-badge.desktop {
  background-color: var(--color-secondary-light);
  color: var(--color-secondary);
}

.score-good {
  color: var(--color-score-good);
}

.score-average {
  color: var(--color-score-average);
}

.score-poor {
  color: var(--color-score-poor);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.action-btn:hover {
  color: var(--color-danger);
  background-color: var(--color-danger-light);
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
}

/* Selection styles */
.col-select {
  width: 40px;
  text-align: center !important;
}

.row-selectable {
  cursor: pointer;
}

.row-selected {
  background-color: var(--color-primary-light) !important;
}

.row-selected td {
  border-color: var(--color-primary);
}
</style>
