<script setup>
import {ref} from 'vue'
import {formatRelativeTime, getScoreColorClass} from '@/utils/formatters'
import Sparkline from '@/components/common/Sparkline.vue'

const props = defineProps({
  item: {type: Object, required: true},
  stats: {type: Object, default: null},
  running: {type: Boolean, default: false},
  error: {type: String, default: null}
})

const emit = defineEmits(['run', 'remove'])

const showResponse = ref(false)
</script>

<template>
  <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col">
    <!-- Header -->
    <div class="flex items-start justify-between gap-2 mb-3">
      <div class="min-w-0">
        <h3 class="font-semibold text-gray-900 dark:text-white line-clamp-2" :title="item.prompt">
          {{ item.prompt }}
        </h3>
        <div class="flex flex-wrap items-center gap-1.5 mt-2">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
            {{ item.brand }}
          </span>
          <span
              v-if="item.competitors.length"
              class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            {{ item.competitors.length }} concurrent{{ item.competitors.length > 1 ? 's' : '' }}
          </span>
        </div>
      </div>
      <button
          class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors shrink-0"
          title="Retirer"
          @click="emit('remove')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
      </button>
    </div>

    <!-- Latest result -->
    <div v-if="stats?.latest" class="mb-3">
      <div class="flex items-center gap-4 mb-3">
        <!-- Brand visibility -->
        <div>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Marque citée</p>
          <p
              :class="stats.latest.brandMentioned ? 'text-emerald-500' : 'text-red-500'"
              class="text-lg font-bold leading-tight"
          >
            {{ stats.latest.brandMentioned ? 'Oui' : 'Non' }}
            <span v-if="stats.latest.brandMentioned && stats.latest.position" class="text-xs font-medium text-gray-500 dark:text-gray-400">
              (#{{ stats.latest.position }})
            </span>
          </p>
        </div>
        <!-- Share of voice -->
        <div>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Part de voix</p>
          <p
              :class="getScoreColorClass((stats.latest.shareOfVoice ?? 0) / 100)"
              class="text-lg font-bold leading-tight"
          >
            {{ stats.latest.shareOfVoice !== null ? stats.latest.shareOfVoice + '%' : '—' }}
          </p>
        </div>
      </div>

      <!-- Competitors found -->
      <div v-if="stats.latest.competitorsFound?.length" class="flex flex-wrap gap-1 mb-3">
        <span
            v-for="c in stats.latest.competitorsFound"
            :key="c.name"
            class="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
        >
          {{ c.name }} ×{{ c.count }}
        </span>
      </div>

      <!-- Sparkline -->
      <div v-if="stats.sparkline?.length > 1" class="mb-3">
        <p class="text-[10px] text-gray-400 dark:text-gray-500 mb-1">Évolution part de voix</p>
        <Sparkline :values="stats.sparkline" :width="240" color="#6366f1"/>
      </div>

      <!-- Response preview -->
      <button
          class="text-[11px] text-primary-500 hover:underline"
          @click="showResponse = !showResponse"
      >
        {{ showResponse ? 'Masquer' : 'Voir' }} la réponse ({{ stats.latest.provider }}/{{ stats.latest.model }})
      </button>
      <p
          v-if="showResponse"
          class="mt-2 text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto p-2 rounded bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700"
      >{{ stats.latest.response }}</p>
    </div>

    <!-- Never run -->
    <div v-else class="flex-1 flex items-center justify-center py-4 mb-2">
      <p class="text-sm text-gray-400 dark:text-gray-500">Jamais exécuté</p>
    </div>

    <!-- Error -->
    <p v-if="error" class="text-xs text-red-500 mb-2">{{ error }}</p>

    <!-- Footer -->
    <div class="mt-auto flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50">
      <span class="text-xs text-gray-400 dark:text-gray-500">
        <template v-if="stats?.lastRunAt">Exécuté {{ formatRelativeTime(stats.lastRunAt) }}</template>
        <template v-else>—</template>
      </span>
      <button
          :disabled="running"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors disabled:opacity-50"
          @click="emit('run')"
      >
        <svg
            :class="{ 'animate-spin': running }"
            class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
        {{ running ? 'Analyse…' : 'Exécuter' }}
      </button>
    </div>
  </div>
</template>
