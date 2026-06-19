<script setup>
import {computed} from 'vue'
import ScoreDiffIndicator from './ScoreDiffIndicator.vue'
import {formatScore, getScoreColorClass} from '@/utils/formatters'
import {useI18n} from '@/i18n'

const {t} = useI18n()

const props = defineProps({
  templates: {
    type: Array,
    required: true
  },
  labelA: {
    type: String,
    default: ''
  },
  labelB: {
    type: String,
    default: ''
  }
})

const labelAText = computed(() => props.labelA || t('comparison.reference'))
const labelBText = computed(() => props.labelB || t('comparison.comparisonLabel'))
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
      <tr class="border-b border-gray-200 dark:border-gray-700">
        <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
          {{ $t('comparison.templateHeader') }}
        </th>
        <th class="text-center py-3 px-4 font-medium text-blue-600 dark:text-blue-400">
          {{ labelAText }}
        </th>
        <th class="text-center py-3 px-4 font-medium text-purple-600 dark:text-purple-400">
          {{ labelBText }}
        </th>
        <th class="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
          {{ $t('comparison.evolution') }}
        </th>
      </tr>
      </thead>
      <tbody>
      <tr
          v-for="template in templates"
          :key="template.name"
          class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        <!-- Template name -->
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-900 dark:text-white">
              {{ template.name }}
            </span>
            <span
                v-if="!template.inA"
                class="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded"
            >
              {{ $t('comparison.statusNew') }}
            </span>
            <span
                v-else-if="!template.inB"
                class="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded"
            >
              {{ $t('comparison.statusRemoved') }}
            </span>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ template.countA || 0 }} → {{ template.countB || 0 }} {{ $t('comparison.pages') }}
          </div>
        </td>

        <!-- Score A -->
        <td class="py-3 px-4 text-center">
          <span
              v-if="template.avgScoreA !== null"
              :class="['font-semibold', getScoreColorClass(template.avgScoreA)]"
          >
            {{ formatScore(template.avgScoreA) }}
          </span>
          <span v-else class="text-gray-400">-</span>
        </td>

        <!-- Score B -->
        <td class="py-3 px-4 text-center">
          <span
              v-if="template.avgScoreB !== null"
              :class="['font-semibold', getScoreColorClass(template.avgScoreB)]"
          >
            {{ formatScore(template.avgScoreB) }}
          </span>
          <span v-else class="text-gray-400">-</span>
        </td>

        <!-- Diff -->
        <td class="py-3 px-4 text-center">
          <ScoreDiffIndicator :diff="template.diff"/>
        </td>
      </tr>
      </tbody>
    </table>

    <!-- Empty state -->
    <div v-if="templates.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
      {{ $t('comparison.noTemplates') }}
    </div>
  </div>
</template>
