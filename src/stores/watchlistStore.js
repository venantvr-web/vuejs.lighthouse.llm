import {defineStore} from 'pinia'
import {computed, ref, watch} from 'vue'

const STORAGE_KEY = 'lighthouse-watchlist'

/**
 * Extract domain from URL
 * @param {string} url - Full URL
 * @returns {string} Domain name
 */
function extractDomain(url) {
    try {
        return new URL(url).hostname
    } catch {
        return url
    }
}

/**
 * Normalize a URL for comparison (drop trailing slash, lowercase host)
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
export function normalizeUrl(url) {
    let normalized = (url || '').trim()
    if (!normalized) return ''
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = 'https://' + normalized
    }
    try {
        const u = new URL(normalized)
        u.hostname = u.hostname.toLowerCase()
        let result = u.origin + u.pathname.replace(/\/$/, '') + u.search
        return result
    } catch {
        return normalized.replace(/\/$/, '')
    }
}

/**
 * Store for managing the watchlist of monitored URLs.
 * Persisted to localStorage (local-first, no backend).
 */
export const useWatchlistStore = defineStore('watchlist', () => {
    // State
    const items = ref([])

    // Getters
    const count = computed(() => items.value.length)

    const isEmpty = computed(() => items.value.length === 0)

    const sortedItems = computed(() => {
        return [...items.value].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    })

    // Actions

    /**
     * Check whether a URL is already in the watchlist
     * @param {string} url - URL to check
     * @returns {boolean}
     */
    function hasUrl(url) {
        const normalized = normalizeUrl(url)
        return items.value.some(item => normalizeUrl(item.url) === normalized)
    }

    /**
     * Add a URL to the watchlist
     * @param {string} url - URL to monitor
     * @param {object} options - Options
     * @param {string} options.label - Optional display label
     * @param {string} options.strategy - 'mobile' | 'desktop'
     * @param {string} options.source - 'pagespeed' | 'local'
     * @returns {object|null} The created item, or null if duplicate/invalid
     */
    function addItem(url, options = {}) {
        const normalized = normalizeUrl(url)
        if (!normalized) return null
        if (hasUrl(normalized)) return null

        const item = {
            id: crypto.randomUUID(),
            url: normalized,
            domain: extractDomain(normalized),
            label: (options.label || '').trim() || extractDomain(normalized),
            strategy: options.strategy === 'desktop' ? 'desktop' : 'mobile',
            source: options.source === 'local' ? 'local' : 'pagespeed',
            // Per-category performance budgets (0-100), null = no budget
            budgets: {
                performance: null,
                accessibility: null,
                'best-practices': null,
                seo: null
            },
            createdAt: Date.now()
        }

        items.value.push(item)
        return item
    }

    /**
     * Set (or clear) a performance budget for a category on an item.
     * @param {string} id - Item id
     * @param {string} category - Category id
     * @param {number|null} value - Threshold 0-100, or null to clear
     */
    function setBudget(id, category, value) {
        const item = items.value.find(i => i.id === id)
        if (!item) return
        if (!item.budgets) item.budgets = {}
        if (value === null || value === '' || Number.isNaN(Number(value))) {
            item.budgets[category] = null
        } else {
            item.budgets[category] = Math.max(0, Math.min(100, Math.round(Number(value))))
        }
    }

    /**
     * Update an existing watchlist item
     * @param {string} id - Item id
     * @param {object} patch - Fields to update
     */
    function updateItem(id, patch = {}) {
        const item = items.value.find(i => i.id === id)
        if (!item) return
        if (patch.label !== undefined) item.label = patch.label.trim() || item.domain
        if (patch.strategy !== undefined) item.strategy = patch.strategy === 'desktop' ? 'desktop' : 'mobile'
        if (patch.source !== undefined) item.source = patch.source === 'local' ? 'local' : 'pagespeed'
    }

    /**
     * Remove an item from the watchlist
     * @param {string} id - Item id
     */
    function removeItem(id) {
        items.value = items.value.filter(item => item.id !== id)
    }

    /**
     * Clear the entire watchlist
     */
    function clearAll() {
        items.value = []
    }

    /**
     * Save the watchlist to localStorage
     */
    function saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
        } catch (error) {
            console.error('Failed to save watchlist:', error)
        }
    }

    /**
     * Load the watchlist from localStorage
     */
    function loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (!stored) return
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed)) {
                // Ensure forward-compatible shape for items saved by older versions
                items.value = parsed.map(item => ({
                    budgets: {performance: null, accessibility: null, 'best-practices': null, seo: null},
                    ...item
                }))
            }
        } catch (error) {
            console.error('Failed to load watchlist:', error)
        }
    }

    // Auto-persist on change (sync so writes land before any reload)
    watch(items, saveToStorage, {deep: true, flush: 'sync'})

    // Initialize
    loadFromStorage()

    return {
        // State
        items,
        // Getters
        count,
        isEmpty,
        sortedItems,
        // Actions
        hasUrl,
        addItem,
        updateItem,
        setBudget,
        removeItem,
        clearAll,
        saveToStorage,
        loadFromStorage
    }
})
