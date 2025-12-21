import {ref, computed} from 'vue'

/**
 * Composable for managing multi-select state
 * @param {number} maxItems - Maximum number of items that can be selected (default: 2)
 * @param {Object} options - Configuration options
 * @param {string} options.matchKey - Optional key to match items on (e.g., 'pagePath' for same-URL comparison)
 * @returns {Object} Selection state and methods
 */
export function useSelection(maxItems = 2, options = {}) {
    const {matchKey = null} = options

    // State
    const selectedItems = ref([])
    const selectionMode = ref(false)

    // Computed
    /**
     * The locked value for matching (from first selected item)
     * When matchKey is set, only items with this value can be selected
     */
    const lockedValue = computed(() => {
        if (!matchKey || selectedItems.value.length === 0) return null
        return selectedItems.value[0][matchKey]
    })

    const canSelect = computed(() => selectedItems.value.length < maxItems)

    const canCompare = computed(() => selectedItems.value.length === maxItems)

    const selectedCount = computed(() => selectedItems.value.length)

    const selectedIds = computed(() => selectedItems.value.map(item => item.id))

    /**
     * Check if an item can be selected based on matchKey constraint
     */
    function canSelectItem(item) {
        if (!canSelect.value) return false
        if (!matchKey) return true
        if (selectedItems.value.length === 0) return true
        return item[matchKey] === lockedValue.value
    }

    // Methods
    function toggleSelection(item) {
        const index = selectedItems.value.findIndex(i => i.id === item.id)

        if (index > -1) {
            // Remove item
            selectedItems.value.splice(index, 1)
        } else if (canSelectItem(item)) {
            // Add item only if it matches the constraint
            selectedItems.value.push(item)
        }
    }

    function isSelected(itemId) {
        return selectedItems.value.some(item => item.id === itemId)
    }

    function selectItem(item) {
        if (!isSelected(item.id) && canSelect.value) {
            selectedItems.value.push(item)
        }
    }

    function deselectItem(itemId) {
        const index = selectedItems.value.findIndex(item => item.id === itemId)
        if (index > -1) {
            selectedItems.value.splice(index, 1)
        }
    }

    function clearSelection() {
        selectedItems.value = []
    }

    function enterSelectionMode() {
        selectionMode.value = true
    }

    function exitSelectionMode() {
        selectionMode.value = false
        clearSelection()
    }

    function toggleSelectionMode() {
        if (selectionMode.value) {
            exitSelectionMode()
        } else {
            enterSelectionMode()
        }
    }

    /**
     * Get the selected items for comparison
     * Returns array of [itemA, itemB] or empty array if not enough items
     */
    function getComparisonPair() {
        if (!canCompare.value) return []
        return [selectedItems.value[0], selectedItems.value[1]]
    }

    return {
        // State
        selectedItems,
        selectionMode,

        // Computed
        canSelect,
        canCompare,
        selectedCount,
        selectedIds,
        lockedValue,

        // Methods
        toggleSelection,
        isSelected,
        selectItem,
        deselectItem,
        clearSelection,
        enterSelectionMode,
        exitSelectionMode,
        toggleSelectionMode,
        getComparisonPair,
        canSelectItem
    }
}

export default useSelection
