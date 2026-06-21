<script setup>
import {computed} from 'vue'
import {formatDate} from '@/utils/formatters'
import {canonicalUrl} from '@/utils/url'
import DeleteButton from '@/components/common/DeleteButton.vue'
import {useI18n} from '@/i18n'

const {t} = useI18n()

const props = defineProps({
  domains: {
    type: Array,
    required: true
  },
  selectedDomain: {
    type: String,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select', 'delete'])

const sortedDomains = computed(() => {
  return [...props.domains].sort((a, b) => b.lastAnalysis - a.lastAnalysis)
})

function getScoreColor(score) {
  if (score === null || score === undefined) return 'var(--color-text-muted)'
  if (score >= 0.9) return 'var(--color-score-good)'
  if (score >= 0.5) return 'var(--color-score-average)'
  return 'var(--color-score-poor)'
}
</script>

<template>
  <div class="domain-list">
    <div class="domain-list-header">
      <h3>{{ $t('history.domainsTitle') }}</h3>
      <span class="domain-count">{{ domains.length }}</span>
    </div>

    <div v-if="loading" class="domain-list-loading">
      <div class="loading-spinner"></div>
      <span>{{ $t('common.loading') }}</span>
    </div>

    <div v-else-if="domains.length === 0" class="domain-list-empty">
      <p>{{ $t('history.domainsEmpty') }}</p>
      <p class="hint">{{ $t('history.domainsEmptyHint') }}</p>
    </div>

    <ul v-else class="domains">
      <li
          v-for="domain in sortedDomains"
          :key="domain.domain"
          :class="{ selected: domain.domain === selectedDomain }"
          class="domain-item"
          @click="emit('select', domain.domain)"
      >
        <div class="domain-info">
          <span class="domain-name">{{ canonicalUrl(domain.domain) }}</span>
          <span class="domain-meta">
            {{ domain.count > 1 ? $t('history.domainAnalysisPlural', {count: domain.count}) : $t('history.domainAnalysisSingular', {count: domain.count}) }}
            <span class="separator">-</span>
            {{ formatDate(domain.lastAnalysis) }}
          </span>
        </div>

        <div v-if="domain.latestScores" class="domain-score">
          <span
              :style="{ color: getScoreColor(domain.latestScores.performance) }"
              class="score-badge"
          >
            {{
              domain.latestScores.performance !== null
                  ? Math.round(domain.latestScores.performance * 100)
                  : '-'
            }}
          </span>
        </div>

        <DeleteButton :label="$t('history.deleteDomainTitle')" @click="emit('delete', domain.domain)"/>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.domain-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
  overflow: hidden;
}

.domain-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.domain-list-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.domain-count {
  background-color: var(--color-primary);
  color: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}

.domain-list-loading,
.domain-list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--color-text-muted);
  text-align: center;
}

.domain-list-loading .loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.domain-list-empty .hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.domains {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.domain-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.15s ease;
}

.domain-item:hover {
  background-color: var(--color-bg-hover);
}

.domain-item.selected {
  background-color: var(--color-primary-light);
  border-left: 3px solid var(--color-primary);
}

.domain-info {
  flex: 1;
  min-width: 0;
}

.domain-name {
  display: block;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.domain-meta {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 0.125rem;
}

.separator {
  margin: 0 0.25rem;
}

.domain-score {
  display: flex;
  align-items: center;
}

.score-badge {
  font-weight: 600;
  font-size: 0.875rem;
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.15s ease;
}

.domain-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: var(--color-danger);
  background-color: var(--color-danger-light);
}
</style>
