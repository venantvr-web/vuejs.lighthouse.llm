import {defineStore} from 'pinia'
import {ref} from 'vue'
import {useIndexedDB} from '@/composables/useIndexedDB'

const DB_NAME = 'resource-history'
const DB_VERSION = 1
const STORE = 'snapshots'

/**
 * Store for SEO/GEO resource snapshots (GEO-readiness score and broken-URL
 * count over time), persisted in IndexedDB. Local-first, no backend.
 */
export const useResourceHistoryStore = defineStore('resourceHistory', () => {
    const indexedDB = useIndexedDB(DB_NAME, DB_VERSION)
    const initialized = ref(false)
    const error = ref(null)

    async function initialize() {
        if (initialized.value) return
        try {
            await indexedDB.open((db, oldVersion) => {
                if (oldVersion < 1 && !db.objectStoreNames.contains(STORE)) {
                    const store = db.createObjectStore(STORE, {keyPath: 'id'})
                    store.createIndex('origin', 'origin', {unique: false})
                    store.createIndex('timestamp', 'timestamp', {unique: false})
                }
            })
            initialized.value = true
        } catch (err) {
            error.value = err.message
            console.error('Failed to initialize resource history:', err)
        }
    }

    /**
     * Persist a snapshot.
     * @param {object} snapshot - { origin, readiness, brokenCount }
     * @returns {Promise<string>} snapshot id
     */
    async function addSnapshot(snapshot) {
        if (!initialized.value) await initialize()
        const entry = {id: crypto.randomUUID(), timestamp: Date.now(), ...snapshot}
        await indexedDB.add(STORE, entry)
        return entry.id
    }

    /**
     * Get snapshots for an origin, newest first.
     * @param {string} origin - Site origin
     * @returns {Promise<Array>}
     */
    async function getSnapshots(origin) {
        if (!initialized.value) await initialize()
        try {
            const all = await indexedDB.getAllByIndex(STORE, 'origin', origin)
            return all.sort((a, b) => b.timestamp - a.timestamp)
        } catch (err) {
            console.error('Failed to get resource snapshots:', err)
            return []
        }
    }

    async function clearAll() {
        if (!initialized.value) await initialize()
        await indexedDB.clear(STORE)
    }

    return {initialized, error, initialize, addSnapshot, getSnapshots, clearAll}
})
