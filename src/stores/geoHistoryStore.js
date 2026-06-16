import {defineStore} from 'pinia'
import {ref} from 'vue'
import {useIndexedDB} from '@/composables/useIndexedDB'

const DB_NAME = 'geo-tracking'
const DB_VERSION = 1
const RUNS_STORE = 'runs'

/**
 * Store for GEO run results (one row per prompt × provider execution),
 * persisted in IndexedDB. Local-first, no backend.
 */
export const useGeoHistoryStore = defineStore('geoHistory', () => {
    const indexedDB = useIndexedDB(DB_NAME, DB_VERSION)

    const loading = ref(false)
    const error = ref(null)
    const initialized = ref(false)

    /**
     * Open the database, creating the runs store on first use.
     */
    async function initialize() {
        if (initialized.value) return
        loading.value = true
        error.value = null
        try {
            await indexedDB.open((db, oldVersion) => {
                if (oldVersion < 1 && !db.objectStoreNames.contains(RUNS_STORE)) {
                    const store = db.createObjectStore(RUNS_STORE, {keyPath: 'id'})
                    store.createIndex('promptId', 'promptId', {unique: false})
                    store.createIndex('timestamp', 'timestamp', {unique: false})
                }
            })
            initialized.value = true
        } catch (err) {
            error.value = err.message
            console.error('Failed to initialize GEO history:', err)
        } finally {
            loading.value = false
        }
    }

    /**
     * Persist a run result.
     * @param {object} run - Run record (must include promptId)
     * @returns {Promise<string>} The run id
     */
    async function addRun(run) {
        if (!initialized.value) await initialize()
        const entry = {id: crypto.randomUUID(), timestamp: Date.now(), ...run}
        await indexedDB.add(RUNS_STORE, entry)
        return entry.id
    }

    /**
     * Get all runs for a prompt, newest first.
     * @param {string} promptId - Prompt id
     * @returns {Promise<Array>}
     */
    async function getRunsForPrompt(promptId) {
        if (!initialized.value) await initialize()
        try {
            const runs = await indexedDB.getAllByIndex(RUNS_STORE, 'promptId', promptId)
            return runs.sort((a, b) => b.timestamp - a.timestamp)
        } catch (err) {
            console.error('Failed to get GEO runs:', err)
            return []
        }
    }

    /**
     * Delete every run for a prompt.
     * @param {string} promptId - Prompt id
     */
    async function deleteRunsForPrompt(promptId) {
        if (!initialized.value) await initialize()
        await indexedDB.removeByIndex(RUNS_STORE, 'promptId', promptId)
    }

    /**
     * Clear all GEO runs.
     */
    async function clearAll() {
        if (!initialized.value) await initialize()
        await indexedDB.clear(RUNS_STORE)
    }

    return {
        loading,
        error,
        initialized,
        initialize,
        addRun,
        getRunsForPrompt,
        deleteRunsForPrompt,
        clearAll
    }
})
