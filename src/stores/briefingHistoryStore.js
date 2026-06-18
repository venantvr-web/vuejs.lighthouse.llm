import {defineStore} from 'pinia'
import {ref} from 'vue'
import {useIndexedDB} from '@/composables/useIndexedDB'

const DB_NAME = 'briefing-history'
const DB_VERSION = 1
const STORE = 'snapshots'

/**
 * Store for morning-briefing digest snapshots (alert counts over time),
 * persisted in IndexedDB. Local-first, no backend.
 */
export const useBriefingHistoryStore = defineStore('briefingHistory', () => {
    const indexedDB = useIndexedDB(DB_NAME, DB_VERSION)
    const initialized = ref(false)
    const error = ref(null)

    async function initialize() {
        if (initialized.value) return
        try {
            await indexedDB.open((db, oldVersion) => {
                if (oldVersion < 1 && !db.objectStoreNames.contains(STORE)) {
                    const store = db.createObjectStore(STORE, {keyPath: 'id'})
                    store.createIndex('timestamp', 'timestamp', {unique: false})
                }
            })
            initialized.value = true
        } catch (err) {
            error.value = err.message
            console.error('Failed to initialize briefing history:', err)
        }
    }

    /**
     * Persist a digest snapshot.
     * @param {object} snapshot - { total, critical, warning }
     * @returns {Promise<string>} snapshot id
     */
    async function addSnapshot(snapshot) {
        if (!initialized.value) await initialize()
        const entry = {id: crypto.randomUUID(), timestamp: Date.now(), ...snapshot}
        await indexedDB.add(STORE, entry)
        return entry.id
    }

    /**
     * Get all snapshots, newest first.
     * @returns {Promise<Array>}
     */
    async function getSnapshots() {
        if (!initialized.value) await initialize()
        try {
            const all = await indexedDB.getAll(STORE)
            return all.sort((a, b) => b.timestamp - a.timestamp)
        } catch (err) {
            console.error('Failed to get briefing snapshots:', err)
            return []
        }
    }

    async function clearAll() {
        if (!initialized.value) await initialize()
        await indexedDB.clear(STORE)
    }

    return {initialized, error, initialize, addSnapshot, getSnapshots, clearAll}
})
