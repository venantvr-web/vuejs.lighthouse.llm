import {defineStore} from 'pinia'
import {ref} from 'vue'
import {useIndexedDB} from '@/composables/useIndexedDB'

const DB_NAME = 'ai-artifacts-history'
const DB_VERSION = 1
const STORE = 'artifacts'

/**
 * Types d'artefacts IA historisés.
 */
export const AI_ARTIFACT_TYPES = {
    ANALYSIS: 'analysis',
    INDEXABILITY: 'indexability',
    STRUCTURED_DATA: 'structured-data',
    LLMS_TXT: 'llms-txt',
    LLMS_FULL: 'llms-full'
}

/**
 * Historique des sorties générées par l'IA (analyses, diagnostics
 * d'indexabilité, JSON-LD), persisté en IndexedDB et consultable depuis une
 * page dédiée.
 */
export const useAiHistoryStore = defineStore('aiHistory', () => {
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
                    store.createIndex('type', 'type', {unique: false})
                    store.createIndex('url', 'url', {unique: false})
                }
            })
            initialized.value = true
        } catch (err) {
            error.value = err.message
            console.error('Failed to init AI history:', err)
        }
    }

    /**
     * Enregistre un nouvel artefact.
     * @param {object} artifact - { type, title, url, provider, model, content, format, meta }
     * @returns {Promise<string>} id de l'entrée
     */
    async function addArtifact(artifact) {
        if (!initialized.value) await initialize()
        const entry = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type: artifact.type,
            title: artifact.title || '',
            url: artifact.url || '',
            provider: artifact.provider || '',
            model: artifact.model || '',
            format: artifact.format || 'markdown',
            content: artifact.content || '',
            meta: artifact.meta || {}
        }
        await indexedDB.add(STORE, entry)
        return entry.id
    }

    /**
     * Met à jour le contenu d'un artefact existant (ex. après « Continuer »).
     * @param {string} id
     * @param {object} patch - champs à fusionner (ex. { content })
     */
    async function updateArtifact(id, patch) {
        if (!initialized.value) await initialize()
        const existing = await indexedDB.get(STORE, id)
        if (!existing) return
        await indexedDB.put(STORE, {...existing, ...patch, timestamp: Date.now()})
    }

    /** Tous les artefacts, du plus récent au plus ancien. */
    async function getAll() {
        if (!initialized.value) await initialize()
        try {
            const all = await indexedDB.getAll(STORE)
            return all.sort((a, b) => b.timestamp - a.timestamp)
        } catch (err) {
            console.error('Failed to read AI history:', err)
            return []
        }
    }

    async function remove(id) {
        if (!initialized.value) await initialize()
        await indexedDB.remove(STORE, id)
    }

    async function clearAll() {
        if (!initialized.value) await initialize()
        await indexedDB.clear(STORE)
    }

    return {initialized, error, initialize, addArtifact, updateArtifact, getAll, remove, clearAll}
})
