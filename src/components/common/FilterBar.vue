<script setup>
import {computed} from 'vue'
import SearchInput from './SearchInput.vue'
import FilterChips from './FilterChips.vue'
import DateRangePicker from './DateRangePicker.vue'

const props = defineProps({
  /**
   * Filter state object
   * { search: string, filters: Object, dateRange: { start: Date, end: Date } }
   */
  modelValue: {
    type: Object,
    default: () => ({
      search: '',
      filters: {},
      dateRange: {start: null, end: null}
    })
  },
  /**
   * Placeholder for search input
   */
  searchPlaceholder: {
    type: String,
    default: 'Rechercher...'
  },
  /**
   * Filter chips configuration
   * Array of { key: string, label: string, options: Array<{ value: any, label: string }> }
   */
  filterConfig: {
    type: Array,
    default: () => []
  },
  /**
   * Show date range picker
   */
  showDateRange: {
    type: Boolean,
    default: true
  },
  /**
   * Show filter chips
   */
  showFilters: {
    type: Boolean,
    default: true
  },
  /**
   * Debounce for search input (ms)
   */
  searchDebounce: {
    type: Number,
    default: 300
  }
})

const emit = defineEmits(['update:modelValue', 'filter', 'clear'])

// Computed bindings for child components
const searchValue = computed({
  get: () => props.modelValue.search || '',
  set: (val) => updateFilter('search', val)
})

const filtersValue = computed({
  get: () => props.modelValue.filters || {},
  set: (val) => updateFilter('filters', val)
})

const dateRangeValue = computed({
  get: () => props.modelValue.dateRange || {start: null, end: null},
  set: (val) => updateFilter('dateRange', val)
})

function updateFilter(key, value) {
  const newState = {
    ...props.modelValue,
    [key]: value
  }
  emit('update:modelValue', newState)
  emit('filter', newState)
}

const hasActiveFilters = computed(() => {
  const {search, filters, dateRange} = props.modelValue
  const hasSearch = search && search.length > 0
  const hasFilters = filters && Object.values(filters).some(arr => arr && arr.length > 0)
  const hasDateRange = dateRange && (dateRange.start || dateRange.end)
  return hasSearch || hasFilters || hasDateRange
})

function clearAll() {
  const cleared = {
    search: '',
    filters: {},
    dateRange: {start: null, end: null}
  }
  // Initialize filter keys from config
  if (props.filterConfig.length > 0) {
    props.filterConfig.forEach(f => {
      cleared.filters[f.key] = []
    })
  }
  emit('update:modelValue', cleared)
  emit('clear')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Top row: Search + Date picker -->
    <div class="flex flex-col sm:flex-row gap-3">
      <!-- Search input -->
      <div class="flex-1">
        <SearchInput
            v-model="searchValue"
            :placeholder="searchPlaceholder"
            :debounce="searchDebounce"
        />
      </div>

      <!-- Date range picker -->
      <DateRangePicker
          v-if="showDateRange"
          v-model="dateRangeValue"
      />
    </div>

    <!-- Filter chips -->
    <FilterChips
        v-if="showFilters && filterConfig.length > 0"
        v-model="filtersValue"
        :filters="filterConfig"
    />

    <!-- Clear all button (shown when any filters are active) -->
    <div
        v-if="hasActiveFilters"
        class="flex justify-end"
    >
      <button
          type="button"
          class="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-1"
          @click="clearAll"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
              d="M6 18L18 6M6 6l12 12"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
          />
        </svg>
        Effacer tous les filtres
      </button>
    </div>
  </div>
</template>
