import {ref, computed} from 'vue'

/**
 * Composable for managing multi-select state
 * @param {number} maxItems - Maximum number of items that can be selected (default: 2)
 * @returns {Object} Selection state and methods
 */
export function useSelection(maxItems = 2) {
    // State
    const selectedItems = ref([])
    const selectionMode = ref(false)

    // Computed
    const canSelect = computed(() => selectedItems.value.length < maxItems)

    const canCompare = computed(() => selectedItems.value.length === maxItems)

    const selectedCount = computed(() => selectedItems.value.length)

    const selectedIds = computed(() => selectedItems.value.map(item => item.id))

    // Methods
    function toggleSelection(item) {
        const index = selectedItems.value.findIndex(i => i.id === item.id)

        if (index > -1) {
            // Remove item
            selectedItems.value.splice(index, 1)
        } else if (canSelect.value) {
            // Add item
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

        // Methods
        toggleSelection,
        isSelected,
        selectItem,
        deselectItem,
        clearSelection,
        enterSelectionMode,
        exitSelectionMode,
        toggleSelectionMode,
        getComparisonPair
    }
}

export default useSelection
