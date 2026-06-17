<script setup>
import {computed} from 'vue'
import {buildActionPlan, useActionPlan} from '@/composables/useActionPlan'
import {formatMetric} from '@/utils/formatters'
import MarkdownViewer from '@/components/analysis/MarkdownViewer.vue'

const props = defineProps({
  opportunities: {type: Array, default: () => []},
  url: {type: String, default: ''}
})

const {generating, error, fixPlan, generateFixPlan} = useActionPlan()

const tickets = computed(() => buildActionPlan(props.opportunities))

const impactClass = {
  'élevé': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  'moyen': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  'faible': 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
}
const effortClass = {
  'faible': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  'moyen': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  'élevé': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
}
</script>

<template>
  <section v-if="tickets.length">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Plan d'action priorisé</h2>
      <button
          :disabled="generating"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          @click="generateFixPlan(tickets, url)"
      >
        <svg
            :class="{ 'animate-spin': generating }"
            class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
        {{ generating ? 'Génération…' : 'Générer les correctifs (IA)' }}
      </button>
    </div>

    <p v-if="error" class="text-sm text-red-500 mb-4">{{ error }}</p>

    <!-- Prioritized tickets -->
    <div class="card divide-y divide-gray-100 dark:divide-gray-700">
      <div
          v-for="(ticket, index) in tickets"
          :key="ticket.id"
          class="p-4 flex items-start gap-4"
      >
        <span class="text-sm font-bold text-gray-400 dark:text-gray-500 w-6 shrink-0 text-right">{{ index + 1 }}</span>
        <div class="min-w-0 flex-1">
          <h3 class="font-medium text-gray-900 dark:text-white">{{ ticket.title }}</h3>
          <p v-if="ticket.displayValue" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ ticket.displayValue }}
            <span v-if="ticket.savingsMs"> · gain potentiel {{ formatMetric(ticket.savingsMs) }}</span>
          </p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span :class="impactClass[ticket.impactLabel]" class="px-2 py-0.5 rounded text-[10px] font-medium">
            Impact {{ ticket.impactLabel }}
          </span>
          <span :class="effortClass[ticket.effortLabel]" class="px-2 py-0.5 rounded text-[10px] font-medium">
            Effort {{ ticket.effortLabel }}
          </span>
        </div>
      </div>
    </div>

    <!-- AI remediation plan -->
    <div v-if="fixPlan" class="card p-6 mt-4">
      <h3 class="font-semibold text-gray-900 dark:text-white mb-3">Correctifs suggérés</h3>
      <MarkdownViewer :content="fixPlan"/>
    </div>
  </section>
</template>
