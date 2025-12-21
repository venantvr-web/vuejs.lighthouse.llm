import {ref, computed} from 'vue'

/**
 * Composable for managing filter state
 * @param {Object} initialFilters - Initial filter values { [key]: [] }
 * @returns {Object} Filter state and methods
 */
export function useFilters(initialFilters = {}) {
    // State
    const searchQuery = ref('')
    const activeFilters = ref({...initialFilters})
    const dateRange = ref({start: null, end: null})

    // Computed
    const hasActiveFilters = computed(() => {
        // Check search query
        if (searchQuery.value.trim()) return true

        // Check filters
        const hasFilterValues = Object.values(activeFilters.value).some(
            arr => Array.isArray(arr) && arr.length > 0
        )
        if (hasFilterValues) return true

        // Check date range
        if (dateRange.value.start || dateRange.value.end) return true

        return false
    })

    const activeFilterCount = computed(() => {
        let count = 0

        if (searchQuery.value.trim()) count++

        Object.values(activeFilters.value).forEach(arr => {
            if (Array.isArray(arr)) count += arr.length
        })

        if (dateRange.value.start) count++
        if (dateRange.value.end) count++

        return count
    })

    // Methods
    function setFilter(key, values) {
        activeFilters.value = {
            ...activeFilters.value,
            [key]: Array.isArray(values) ? values : [values]
        }
    }

    function clearFilter(key) {
        activeFilters.value = {
            ...activeFilters.value,
            [key]: []
        }
    }

    function clearAllFilters() {
        searchQuery.value = ''
        dateRange.value = {start: null, end: null}

        const cleared = {}
        Object.keys(activeFilters.value).forEach(key => {
            cleared[key] = []
        })
        activeFilters.value = cleared
    }

    function setDateRange(start, end) {
        dateRange.value = {start, end}
    }

    function clearDateRange() {
        dateRange.value = {start: null, end: null}
    }

    /**
     * Filter an array of items based on current filter state
     * @param {Array} items - Items to filter
     * @param {Object} config - Filter configuration
     * @param {string} config.searchField - Field to search (e.g., 'domain')
     * @param {string} config.timestampField - Field for date filtering (e.g., 'timestamp')
     * @param {Object} config.filterFields - Map of filter keys to item fields
     * @returns {Array} Filtered items
     */
    function filterItems(items, config = {}) {
        const {
            searchField = 'domain',
            timestampField = 'timestamp',
            filterFields = {}
        } = config

        return items.filter(item => {
            // Text search
            if (searchQuery.value.trim()) {
                const searchValue = item[searchField]?.toLowerCase() || ''
                if (!searchValue.includes(searchQuery.value.toLowerCase().trim())) {
                    return false
                }
            }

            // Filter values
            for (const [filterKey, itemField] of Object.entries(filterFields)) {
                const activeValues = activeFilters.value[filterKey]
                if (activeValues && activeValues.length > 0) {
                    const itemValue = item[itemField]
                    if (!activeValues.includes(itemValue)) {
                        return false
                    }
                }
            }

            // Date range
            if (dateRange.value.start || dateRange.value.end) {
                const itemTimestamp = item[timestampField]
                if (itemTimestamp) {
                    if (dateRange.value.start && itemTimestamp < dateRange.value.start.getTime()) {
                        return false
                    }
                    if (dateRange.value.end && itemTimestamp > dateRange.value.end.getTime()) {
                        return false
                    }
                }
            }

            return true
        })
    }

    return {
        // State
        searchQuery,
        activeFilters,
        dateRange,

        // Computed
        hasActiveFilters,
        activeFilterCount,

        // Methods
        setFilter,
        clearFilter,
        clearAllFilters,
        setDateRange,
        clearDateRange,
        filterItems
    }
}

export default useFilters
