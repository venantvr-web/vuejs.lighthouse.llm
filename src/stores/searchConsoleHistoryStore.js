import {defineStore} from 'pinia'
import {ref} from 'vue'
import {useIndexedDB} from '@/composables/useIndexedDB'

const DB_NAME = 'search-console-history'
const DB_VERSION = 1
const STORE = 'snapshots'

/**
 * Store for Search Console snapshots (one per query), persisted in IndexedDB,
 * so the app can show trends over time. Local-first, no backend.
 */
export const useSearchConsoleHistoryStore = defineStore('searchConsoleHistory', () => {
    const indexedDB = useIndexedDB(DB_NAME, DB_VERSION)
    const initialized = ref(false)
    const error = ref(null)

    async function initialize() {
        if (initialized.value) return
        try {
            await indexedDB.open((db, oldVersion) => {
                if (oldVersion < 1 && !db.objectStoreNames.contains(STORE)) {
                    const store = db.createObjectStore(STORE, {keyPath: 'id'})
                    store.createIndex('site', 'site', {unique: false})
                    store.createIndex('timestamp', 'timestamp', {unique: false})
                }
            })
            initialized.value = true
        } catch (err) {
            error.value = err.message
            console.error('Failed to initialize Search Console history:', err)
        }
    }

    /**
     * Persist a snapshot (summary metrics for a site at a point in time).
     * @param {object} snapshot - { site, days, dimension, clicks, impressions, ctr, position }
     * @returns {Promise<string>} snapshot id
     */
    async function addSnapshot(snapshot) {
        if (!initialized.value) await initialize()
        const entry = {id: crypto.randomUUID(), timestamp: Date.now(), ...snapshot}
        await indexedDB.add(STORE, entry)
        return entry.id
    }

    /**
     * Get snapshots for a site, newest first.
     * @param {string} site - Site URL
     * @returns {Promise<Array>}
     */
    async function getSnapshots(site) {
        if (!initialized.value) await initialize()
        try {
            const all = await indexedDB.getAllByIndex(STORE, 'site', site)
            return all.sort((a, b) => b.timestamp - a.timestamp)
        } catch (err) {
            console.error('Failed to get Search Console snapshots:', err)
            return []
        }
    }

    /**
     * Get every snapshot grouped by site, each list newest-first.
     * @returns {Promise<Object>} { [site]: Array<snapshot> }
     */
    async function getSnapshotsBySite() {
        if (!initialized.value) await initialize()
        try {
            const all = await indexedDB.getAll(STORE)
            const bySite = {}
            for (const snap of all) {
                if (!bySite[snap.site]) bySite[snap.site] = []
                bySite[snap.site].push(snap)
            }
            for (const site of Object.keys(bySite)) {
                bySite[site].sort((a, b) => b.timestamp - a.timestamp)
            }
            return bySite
        } catch (err) {
            console.error('Failed to get Search Console snapshots by site:', err)
            return {}
        }
    }

    async function clearAll() {
        if (!initialized.value) await initialize()
        await indexedDB.clear(STORE)
    }

    return {initialized, error, initialize, addSnapshot, getSnapshots, getSnapshotsBySite, clearAll}
})
