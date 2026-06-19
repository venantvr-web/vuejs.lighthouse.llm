import {defineStore} from 'pinia'
import {computed, ref, watch} from 'vue'

const STORAGE_KEY = 'geo-prompts'

/**
 * Split a comma/newline separated list into a clean array of terms.
 * @param {string|string[]} value - Raw input
 * @returns {string[]} Trimmed, de-duplicated, non-empty terms
 */
export function parseTerms(value) {
    const raw = Array.isArray(value) ? value : String(value || '').split(/[,\n]/)
    const seen = new Set()
    const result = []
    for (const term of raw) {
        const trimmed = term.trim()
        if (trimmed && !seen.has(trimmed.toLowerCase())) {
            seen.add(trimmed.toLowerCase())
            result.push(trimmed)
        }
    }
    return result
}

/**
 * Store for the GEO (Generative Engine Optimization) tracked prompts.
 * A prompt = a query whose AI answer we monitor for brand visibility.
 * Persisted to localStorage (local-first, no backend).
 */
export const useGeoStore = defineStore('geo', () => {
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
     * Add a tracked prompt.
     * @param {object} options - Prompt config
     * @param {string} options.prompt - The query to send to the AI engine
     * @param {string} options.brand - The brand to look for in answers
     * @param {string|string[]} options.competitors - Competitor names
     * @returns {object|null} The created item, or null if invalid
     */
    function addItem({prompt, brand, competitors} = {}) {
        const cleanPrompt = (prompt || '').trim()
        const cleanBrand = (brand || '').trim()
        if (!cleanPrompt || !cleanBrand) return null

        const item = {
            id: crypto.randomUUID(),
            prompt: cleanPrompt,
            brand: cleanBrand,
            competitors: parseTerms(competitors),
            createdAt: Date.now()
        }
        items.value.push(item)
        return item
    }

    /**
     * Update an existing tracked prompt.
     * @param {string} id - Item id
     * @param {object} patch - Fields to update
     */
    function updateItem(id, patch = {}) {
        const item = items.value.find(i => i.id === id)
        if (!item) return
        if (patch.prompt !== undefined) item.prompt = patch.prompt.trim() || item.prompt
        if (patch.brand !== undefined) item.brand = patch.brand.trim() || item.brand
        if (patch.competitors !== undefined) item.competitors = parseTerms(patch.competitors)
    }

    /**
     * Remove a tracked prompt.
     * @param {string} id - Item id
     */
    function removeItem(id) {
        items.value = items.value.filter(item => item.id !== id)
    }

    /**
     * Clear all tracked prompts.
     */
    function clearAll() {
        items.value = []
    }

    function saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
        } catch (error) {
            console.error('Failed to save GEO prompts:', error)
        }
    }

    function loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (!stored) return
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed)) items.value = parsed
        } catch (error) {
            console.error('Failed to load GEO prompts:', error)
        }
    }

    // Auto-persist (sync so writes land before any reload)
    watch(items, saveToStorage, {deep: true, flush: 'sync'})

    loadFromStorage()

    return {
        items,
        count,
        isEmpty,
        sortedItems,
        addItem,
        updateItem,
        removeItem,
        clearAll,
        saveToStorage,
        loadFromStorage
    }
})
