<script setup>
import {computed} from 'vue'

const props = defineProps({
  session: {
    type: Object,
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  position: {
    type: String,
    default: 'left',
    validator: (v) => ['left', 'right'].includes(v)
  }
})

const formattedDate = computed(() => {
  if (!props.session?.timestamp) return '-'
  return new Date(props.session.timestamp).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const averageScore = computed(() => {
  if (!props.session?.aggregateScores) return null
  const values = Object.values(props.session.aggregateScores)
      .map(s => s.avg)
      .filter(v => v !== null && v !== undefined)
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
})

const formattedAverage = computed(() => {
  if (averageScore.value === null) return '-'
  return Math.round(averageScore.value * 100)
})

function getScoreColorClass(score) {
  if (score === null) return 'bg-gray-200 dark:bg-gray-700'
  const value = score * 100
  if (value >= 90) return 'bg-emerald-500'
  if (value >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}
</script>

<template>
  <div
      :class="[
        'bg-white dark:bg-gray-800 rounded-xl border p-4',
        position === 'left'
          ? 'border-blue-200 dark:border-blue-800'
          : 'border-purple-200 dark:border-purple-800'
      ]"
  >
    <!-- Label -->
    <div
        :class="[
          'text-xs font-medium px-2 py-0.5 rounded inline-block mb-3',
          position === 'left'
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
        ]"
    >
      {{ label || (position === 'left' ? 'Reference' : 'Comparaison') }}
    </div>

    <!-- Domain -->
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate mb-1">
      {{ session.domain || 'Domaine inconnu' }}
    </h3>

    <!-- Date -->
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
      {{ formattedDate }}
    </p>

    <!-- Stats row -->
    <div class="flex items-center justify-between">
      <!-- Pages analyzed -->
      <div class="text-sm">
        <span class="text-gray-500 dark:text-gray-400">Pages:</span>
        <span class="ml-1 font-medium text-gray-900 dark:text-white">
          {{ session.pagesAnalyzed || 0 }}/{{ session.pageCount || 0 }}
        </span>
      </div>

      <!-- Average score -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500 dark:text-gray-400">Moyenne:</span>
        <div
            :class="[
              'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold',
              getScoreColorClass(averageScore)
            ]"
        >
          {{ formattedAverage }}
        </div>
      </div>
    </div>

    <!-- Strategy & Service badges -->
    <div class="flex gap-2 mt-3">
      <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
        {{ session.strategy || 'mobile' }}
      </span>
      <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
        {{ session.service || 'pagespeed' }}
      </span>
    </div>
  </div>
</template>
