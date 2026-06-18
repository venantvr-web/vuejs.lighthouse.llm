<script setup>
import {computed} from 'vue'
import {formatRelativeTime, formatScore, getScoreColorClass} from '@/utils/formatters'
import {breachedCategories as computeBreached} from '@/utils/budgets'
import Sparkline from '@/components/common/Sparkline.vue'

const props = defineProps({
  item: {type: Object, required: true},
  stats: {type: Object, default: null},
  refreshing: {type: Boolean, default: false},
  error: {type: String, default: null},
  budgetEditing: {type: Boolean, default: false}
})

const emit = defineEmits(['refresh', 'remove', 'toggle-budget', 'set-budget'])

const CATEGORIES = [
  {id: 'performance', label: 'Perf.'},
  {id: 'accessibility', label: 'A11y'},
  {id: 'best-practices', label: 'Pratiques'},
  {id: 'seo', label: 'SEO'}
]

// Category ids whose latest score is below the item's configured budget
const breachedCategories = computed(() => computeBreached(props.item.budgets, props.stats?.latest?.scores))

function deltaPoints(delta) {
  if (typeof delta !== 'number') return null
  return Math.round(delta * 100)
}

function onBudgetInput(category, event) {
  const raw = event.target.value
  emit('set-budget', {category, value: raw === '' ? null : raw})
}
</script>

<template>
  <div
      :class="breachedCategories.length > 0
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
            :class="budgetEditing ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-400 hover:text-primary-500'"
            class="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            title="Budgets de performance"
            @click="emit('toggle-budget')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M3 6l9-4 9 4M4 10v10a1 1 0 001 1h3m10-11v11a1 1 0 01-1 1h-3m-6 0h6m-6 0v-6a1 1 0 011-1h4a1 1 0 011 1v6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
        </button>
        <button
            class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
            title="Retirer"
            @click="emit('remove')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Budget editor -->
    <div v-if="budgetEditing" class="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
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
              @input="onBudgetInput(cat.id, $event)"
          />
        </label>
      </div>
    </div>

    <!-- Scores -->
    <div v-if="stats?.latest" class="grid grid-cols-4 gap-2 mb-4">
      <div v-for="cat in CATEGORIES" :key="cat.id" class="text-center">
        <p class="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{{ cat.label }}</p>
        <p
            :class="[
              getScoreColorClass(stats.latest.scores?.[cat.id]),
              breachedCategories.includes(cat.id) ? 'underline decoration-red-500 decoration-2 underline-offset-2' : ''
            ]"
            :title="breachedCategories.includes(cat.id) ? `Budget ${item.budgets[cat.id]} non atteint` : ''"
            class="text-lg font-bold leading-none"
        >
          {{ formatScore(stats.latest.scores?.[cat.id]) }}
        </p>
        <p
            v-if="deltaPoints(stats.deltas?.[cat.id])"
            :class="deltaPoints(stats.deltas[cat.id]) > 0 ? 'text-emerald-500' : 'text-red-500'"
            class="text-[10px] font-medium mt-0.5"
        >
          {{ deltaPoints(stats.deltas[cat.id]) > 0 ? '▲' : '▼' }}
          {{ Math.abs(deltaPoints(stats.deltas[cat.id])) }}
        </p>
      </div>
    </div>

    <!-- Never audited -->
    <div v-else class="flex-1 flex items-center justify-center py-4 mb-2">
      <p class="text-sm text-gray-400 dark:text-gray-500">Jamais audité</p>
    </div>

    <!-- Sparkline -->
    <div v-if="stats?.sparkline?.length > 1" class="mb-4">
      <p class="text-[10px] text-gray-400 dark:text-gray-500 mb-1">Tendance performance</p>
      <Sparkline :values="stats.sparkline" :width="240" color="#6366f1"/>
    </div>

    <!-- Per-item error -->
    <p v-if="error" class="text-xs text-red-500 mb-2">{{ error }}</p>

    <!-- Footer -->
    <div class="mt-auto flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50">
      <span class="text-xs text-gray-400 dark:text-gray-500">
        <template v-if="stats?.lastCheckedAt">
          Vérifié {{ formatRelativeTime(stats.lastCheckedAt) }}
        </template>
        <template v-else>—</template>
      </span>
      <button
          :disabled="refreshing"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors disabled:opacity-50"
          @click="emit('refresh')"
      >
        <svg
            :class="{ 'animate-spin': refreshing }"
            class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
        {{ refreshing ? 'Analyse…' : 'Ré-auditer' }}
      </button>
    </div>
  </div>
</template>
