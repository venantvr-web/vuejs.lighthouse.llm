import {ref, computed} from 'vue'
import {formatScore as formatScoreUtil} from '@/utils/formatters'
import {useScoreHistoryStore} from '@/stores/scoreHistoryStore'

/**
 * Categories used for comparison
 */
export const COMPARISON_CATEGORIES = [
    {key: 'performance', label: 'Performance', color: '#f97316'},
    {key: 'accessibility', label: 'Accessibilite', color: '#3b82f6'},
    {key: 'best-practices', label: 'Bonnes Pratiques', color: '#22c55e'},
    {key: 'seo', label: 'SEO', color: '#8b5cf6'},
    {key: 'pwa', label: 'PWA', color: '#ec4899'}
]

/**
 * Composable for comparing analyses or sessions
 * @returns {Object} Comparison state and methods
 */
export function useComparison() {
    // State
    const itemA = ref(null)
    const itemB = ref(null)
    const loading = ref(false)
    const error = ref(null)

    // Computed
    const hasComparison = computed(() => itemA.value !== null && itemB.value !== null)

    const canCompare = computed(() => hasComparison.value)

    /**
     * Get comparison data for two score objects
     * @returns {Object|null} Comparison results
     */
    const comparison = computed(() => {
        if (!hasComparison.value) return null

        const result = {
            itemA: itemA.value,
            itemB: itemB.value,
            categories: [],
            summary: {
                improved: 0,
                declined: 0,
                unchanged: 0,
                overallDiff: 0
            }
        }

        // Compare each category
        for (const cat of COMPARISON_CATEGORIES) {
            const scoreA = getScore(itemA.value, cat.key)
            const scoreB = getScore(itemB.value, cat.key)
            const diff = scoreB !== null && scoreA !== null ? scoreB - scoreA : null

            const categoryResult = {
                key: cat.key,
                label: cat.label,
                color: cat.color,
                scoreA,
                scoreB,
                diff,
                diffPercent: diff !== null ? Math.round(diff * 100) : null,
                status: getStatus(diff)
            }

            result.categories.push(categoryResult)

            // Update summary
            if (diff !== null) {
                if (diff > 0.01) result.summary.improved++
                else if (diff < -0.01) result.summary.declined++
                else result.summary.unchanged++
                result.summary.overallDiff += diff
            }
        }

        // Average overall diff
        const validDiffs = result.categories.filter(c => c.diff !== null).length
        if (validDiffs > 0) {
            result.summary.overallDiff = result.summary.overallDiff / validDiffs
        }

        return result
    })

    // Methods

    /**
     * Set items to compare
     * @param {Object} a - First item (reference/older)
     * @param {Object} b - Second item (comparison/newer)
     */
    function setItems(a, b) {
        itemA.value = a
        itemB.value = b
    }

    /**
     * Set items from sessionStorage data (legacy - stores full objects)
     * @param {string} key - Storage key
     * @deprecated Use loadFromStorageById instead
     */
    function loadFromStorage(key = 'comparison-items') {
        try {
            const stored = sessionStorage.getItem(key)
            if (stored) {
                const {a, b} = JSON.parse(stored)
                setItems(a, b)
                sessionStorage.removeItem(key)
                return true
            }
        } catch (err) {
            console.error('Failed to load comparison from storage:', err)
        }
        return false
    }

    /**
     * Save items to sessionStorage for cross-page navigation (legacy - stores full objects)
     * @param {Object} a - First item
     * @param {Object} b - Second item
     * @param {string} key - Storage key
     * @deprecated Use saveToStorageById instead
     */
    function saveToStorage(a, b, key = 'comparison-items') {
        try {
            sessionStorage.setItem(key, JSON.stringify({a, b}))
        } catch (err) {
            console.error('Failed to save comparison to storage:', err)
        }
    }

    /**
     * Save item IDs to sessionStorage for cross-page navigation
     * @param {string} idA - First item ID
     * @param {string} idB - Second item ID
     * @param {string} key - Storage key
     */
    function saveToStorageById(idA, idB, key = 'comparison-ids') {
        try {
            sessionStorage.setItem(key, JSON.stringify({idA, idB}))
        } catch (err) {
            console.error('Failed to save comparison IDs to storage:', err)
        }
    }

    /**
     * Load items from sessionStorage by IDs and fetch from IndexedDB
     * @param {string} key - Storage key
     * @returns {Promise<boolean>} True if successful
     */
    async function loadFromStorageById(key = 'comparison-ids') {
        try {
            const stored = sessionStorage.getItem(key)
            if (!stored) return false

            const {idA, idB} = JSON.parse(stored)
            if (!idA || !idB) return false

            const historyStore = useScoreHistoryStore()
            await historyStore.initialize()

            const [scoreA, scoreB] = await Promise.all([
                historyStore.getScoreById(idA),
                historyStore.getScoreById(idB)
            ])

            if (scoreA && scoreB) {
                setItems(scoreA, scoreB)
                sessionStorage.removeItem(key)
                return true
            }

            console.warn('Could not load one or both scores from storage')
            return false
        } catch (err) {
            console.error('Failed to load comparison from storage by ID:', err)
            return false
        }
    }

    /**
     * Clear comparison
     */
    function clear() {
        itemA.value = null
        itemB.value = null
    }

    /**
     * Get score from an item (handles both direct scores and nested)
     * @param {Object} item - Score item or session
     * @param {string} category - Category key
     * @returns {number|null}
     */
    function getScore(item, category) {
        if (!item) return null

        // Direct score object
        if (item.scores && typeof item.scores[category] === 'number') {
            return item.scores[category]
        }

        // Session aggregate scores
        if (item.aggregateScores && item.aggregateScores[category]) {
            return item.aggregateScores[category].avg
        }

        return null
    }

    /**
     * Get status from difference
     * @param {number|null} diff
     * @returns {'improved'|'declined'|'unchanged'|'unknown'}
     */
    function getStatus(diff) {
        if (diff === null) return 'unknown'
        if (diff > 0.01) return 'improved'
        if (diff < -0.01) return 'declined'
        return 'unchanged'
    }

    /**
     * Get CSS class for status
     * @param {string} status
     * @returns {string}
     */
    function getStatusClass(status) {
        switch (status) {
            case 'improved':
                return 'text-emerald-600 dark:text-emerald-400'
            case 'declined':
                return 'text-red-600 dark:text-red-400'
            case 'unchanged':
                return 'text-gray-500 dark:text-gray-400'
            default:
                return 'text-gray-400 dark:text-gray-500'
        }
    }

    /**
     * Get background class for status
     * @param {string} status
     * @returns {string}
     */
    function getStatusBgClass(status) {
        switch (status) {
            case 'improved':
                return 'bg-emerald-100 dark:bg-emerald-900/30'
            case 'declined':
                return 'bg-red-100 dark:bg-red-900/30'
            case 'unchanged':
                return 'bg-gray-100 dark:bg-gray-800'
            default:
                return 'bg-gray-50 dark:bg-gray-900'
        }
    }

    /**
     * Format diff as display string
     * @param {number|null} diff - Difference value (0-1 scale)
     * @returns {string}
     */
    function formatDiff(diff) {
        if (diff === null) return '-'
        const percent = Math.round(diff * 100)
        if (percent > 0) return `+${percent}`
        return `${percent}`
    }

    /**
     * Format score as percentage (wrapper for utils/formatters)
     * @param {number|null} score - Score value (0-1 scale)
     * @returns {string}
     */
    function formatScore(score) {
        return formatScoreUtil(score)
    }

    /**
     * Compare two sessions (for crawl comparison)
     * @param {Object} sessionA - First session
     * @param {Object} sessionB - Second session
     * @returns {Object} Comparison data with template breakdown
     */
    function compareSessionsWithTemplates(sessionA, sessionB) {
        if (!sessionA || !sessionB) return null

        // Basic session comparison
        const baseComparison = {
            ...comparison.value,
            sessionA,
            sessionB,
            templateComparison: []
        }

        // Compare templates if available
        if (sessionA.templates && sessionB.templates) {
            const allTemplateNames = new Set([
                ...sessionA.templates.map(t => t.name),
                ...sessionB.templates.map(t => t.name)
            ])

            for (const name of allTemplateNames) {
                const templateA = sessionA.templates.find(t => t.name === name)
                const templateB = sessionB.templates.find(t => t.name === name)

                baseComparison.templateComparison.push({
                    name,
                    inA: !!templateA,
                    inB: !!templateB,
                    countA: templateA?.count || 0,
                    countB: templateB?.count || 0,
                    avgScoreA: templateA?.avgScore || null,
                    avgScoreB: templateB?.avgScore || null,
                    diff: templateA?.avgScore && templateB?.avgScore
                        ? templateB.avgScore - templateA.avgScore
                        : null
                })
            }
        }

        return baseComparison
    }

    return {
        // State
        itemA,
        itemB,
        loading,
        error,

        // Computed
        hasComparison,
        canCompare,
        comparison,

        // Methods
        setItems,
        loadFromStorage,
        saveToStorage,
        saveToStorageById,
        loadFromStorageById,
        clear,
        getScore,
        getStatus,
        getStatusClass,
        getStatusBgClass,
        formatDiff,
        formatScore,
        compareSessionsWithTemplates,

        // Constants
        categories: COMPARISON_CATEGORIES
    }
}

export default useComparison
