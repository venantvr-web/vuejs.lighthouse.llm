<script setup>
import {computed} from 'vue'

const props = defineProps({
  /**
   * Filter configuration
   * Array of { key: string, label: string, options: Array<{ value: any, label: string }> }
   */
  filters: {
    type: Array,
    required: true
  },
  /**
   * Active filters
   * Object { [key]: value[] }
   */
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue'])

function isSelected(filterKey, optionValue) {
  const activeValues = props.modelValue[filterKey] || []
  return activeValues.includes(optionValue)
}

function toggleOption(filterKey, optionValue) {
  const currentValues = [...(props.modelValue[filterKey] || [])]
  const index = currentValues.indexOf(optionValue)

  if (index > -1) {
    currentValues.splice(index, 1)
  } else {
    currentValues.push(optionValue)
  }

  emit('update:modelValue', {
    ...props.modelValue,
    [filterKey]: currentValues
  })
}

const hasActiveFilters = computed(() => {
  return Object.values(props.modelValue).some(arr => arr && arr.length > 0)
})

function clearAll() {
  const cleared = {}
  props.filters.forEach(f => {
    cleared[f.key] = []
  })
  emit('update:modelValue', cleared)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Filter groups -->
    <div
        v-for="filter in filters"
        :key="filter.key"
        class="flex flex-wrap items-center gap-2"
    >
      <span class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[80px]">
        {{ filter.label }}:
      </span>
      <div class="flex flex-wrap gap-2">
        <button
            v-for="option in filter.options"
            :key="option.value"
            type="button"
            :class="[
              'px-3 py-1.5 text-sm rounded-full border transition-all',
              isSelected(filter.key, option.value)
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400'
            ]"
            @click="toggleOption(filter.key, option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- Clear all button -->
    <div v-if="hasActiveFilters" class="pt-2">
      <button
          type="button"
          class="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          @click="clearAll"
      >
        Effacer tous les filtres
      </button>
    </div>
  </div>
</template>
