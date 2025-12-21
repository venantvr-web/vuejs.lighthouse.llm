import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {useIndexedDB} from '@/composables/useIndexedDB'

const DB_NAME = 'lighthouse-history'
const DB_VERSION = 5
const STORE_NAME = 'scores'
const CRAWL_SESSIONS_STORE = 'crawl-sessions'
const REPORTS_STORE = 'reports'

/**
 * Extract domain from URL
 * @param {string} url - Full URL
 * @returns {string} Domain name
 */
function extractDomain(url) {
    try {
        const urlObj = new URL(url)
        return urlObj.hostname
    } catch {
        return url
    }
}

/**
 * Store for managing Lighthouse score history with IndexedDB
 */
export const useScoreHistoryStore = defineStore('scoreHistory', () => {
    const indexedDB = useIndexedDB(DB_NAME, DB_VERSION)

    // State
    const domains = ref([])
    const currentDomain = ref(null)
    const currentScores = ref([])
    const loading = ref(false)
    const error = ref(null)
    const initialized = ref(false)
    const includeCrawl = ref(false) // Toggle to include crawl entries in history

    // Getters
    const sortedDomains = computed(() => {
        return [...domains.value].sort((a, b) => b.lastAnalysis - a.lastAnalysis)
    })

    const domainCount = computed(() => domains.value.length)

    const totalAnalyses = computed(() => {
        return domains.value.reduce((sum, d) => sum + d.count, 0)
    })

    const isEmpty = computed(() => domains.value.length === 0)

    const currentDomainScores = computed(() => {
        return [...currentScores.value].sort((a, b) => b.timestamp - a.timestamp)
    })

    const latestScoreForCurrentDomain = computed(() => {
        if (currentScores.value.length === 0) return null
        return currentDomainScores.value[0]
    })

    // Actions

    /**
     * Initialize the database
     * @param {boolean} forceReset - If true, delete and recreate the database
     */
    async function initialize(forceReset = false) {
        if (initialized.value && !forceReset) return

        loading.value = true
        error.value = null

        // Force reset if requested
        if (forceReset) {
            try {
                await indexedDB.deleteDatabase()
                console.log('[IndexedDB] Database deleted for reset')
            } catch (err) {
                console.warn('[IndexedDB] Could not delete database:', err)
            }
        }

        try {
            await indexedDB.open((db, oldVersion, newVersion) => {
                console.log(`[IndexedDB] Upgrading from v${oldVersion} to v${newVersion}`)
                // Version 1: Create scores store
                if (oldVersion < 1) {
                    const store = db.createObjectStore(STORE_NAME, {keyPath: 'id'})
                    store.createIndex('domain', 'domain', {unique: false})
                    store.createIndex('timestamp', 'timestamp', {unique: false})
                    store.createIndex('domain_timestamp', ['domain', 'timestamp'], {unique: false})
                }

                // Version 2: Add crawl support
                if (oldVersion < 2) {
                    // Create crawl-sessions store
                    if (!db.objectStoreNames.contains(CRAWL_SESSIONS_STORE)) {
                        const crawlStore = db.createObjectStore(CRAWL_SESSIONS_STORE, {keyPath: 'id'})
                        crawlStore.createIndex('domain', 'domain', {unique: false})
                        crawlStore.createIndex('timestamp', 'timestamp', {unique: false})
                        crawlStore.createIndex('status', 'status', {unique: false})
                    }

                    // Add new indexes to scores store for crawl support
                    // Note: Cannot add indexes to existing store in upgrade transaction
                    // New fields (crawlSessionId, pageTemplate, pagePath) will be added dynamically
                }

                // Version 3: Fix missing stores (recovery from corrupted state)
                if (oldVersion < 3) {
                    // Recreate scores store if missing
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        const store = db.createObjectStore(STORE_NAME, {keyPath: 'id'})
                        store.createIndex('domain', 'domain', {unique: false})
                        store.createIndex('timestamp', 'timestamp', {unique: false})
                        store.createIndex('domain_timestamp', ['domain', 'timestamp'], {unique: false})
                    }
                    // Recreate crawl-sessions store if missing
                    if (!db.objectStoreNames.contains(CRAWL_SESSIONS_STORE)) {
                        const crawlStore = db.createObjectStore(CRAWL_SESSIONS_STORE, {keyPath: 'id'})
                        crawlStore.createIndex('domain', 'domain', {unique: false})
                        crawlStore.createIndex('timestamp', 'timestamp', {unique: false})
                        crawlStore.createIndex('status', 'status', {unique: false})
                    }
                }

                // Version 4: Add reports store for full Lighthouse JSON reports
                if (oldVersion < 4) {
                    if (!db.objectStoreNames.contains(REPORTS_STORE)) {
                        const reportsStore = db.createObjectStore(REPORTS_STORE, {keyPath: 'id'})
                        reportsStore.createIndex('scoreId', 'scoreId', {unique: true})
                        reportsStore.createIndex('timestamp', 'timestamp', {unique: false})
                    }
                }
            })

            // Load domains list
            await loadDomains()
            initialized.value = true
        } catch (err) {
            // Handle version conflict - database has higher version
            if (err.name === 'VersionError' || err.message?.includes('higher version')) {
                console.warn('[IndexedDB] Version conflict detected, resetting database...')
                try {
                    await indexedDB.deleteDatabase()
                    // Retry initialization after reset
                    loading.value = false
                    initialized.value = false
                    return initialize(false)
                } catch (resetErr) {
                    console.error('[IndexedDB] Failed to reset database:', resetErr)
                }
            }
            error.value = err.message
            console.error('Failed to initialize score history:', err)
        } finally {
            loading.value = false
        }
    }

    /**
     * Load list of domains with their analysis counts
     * @param {boolean} includeCrawl - Include crawl entries (default: false for simple history)
     */
    async function loadDomains(includeCrawl = false) {
        try {
            const allScores = await indexedDB.getAll(STORE_NAME)

            // Filter: exclude crawl entries for simple history
            const filteredScores = includeCrawl
                ? allScores
                : allScores.filter(s => !s.crawlSessionId)

            // Group by domain
            const domainMap = new Map()

            for (const score of filteredScores) {
                if (!domainMap.has(score.domain)) {
                    domainMap.set(score.domain, {
                        domain: score.domain,
                        count: 0,
                        lastAnalysis: 0,
                        latestScores: null
                    })
                }

                const domainData = domainMap.get(score.domain)
                domainData.count++

                if (score.timestamp > domainData.lastAnalysis) {
                    domainData.lastAnalysis = score.timestamp
                    domainData.latestScores = score.scores
                }
            }

            domains.value = Array.from(domainMap.values())
        } catch (err) {
            console.error('Failed to load domains:', err)
            throw err
        }
    }

    /**
     * Add a new score entry
     * @param {string} url - Full URL analyzed
     * @param {object} scoreData - Score data
     * @param {object} metadata - Additional metadata
     * @param {object} crawlInfo - Optional crawl information
     * @returns {Promise<string>} - ID of the new entry
     */
    async function addScore(url, scoreData, metadata = {}, crawlInfo = null) {
        if (!initialized.value) {
            await initialize()
        }

        const domain = extractDomain(url)
        const id = crypto.randomUUID()
        const timestamp = Date.now()

        const entry = {
            id,
            domain,
            url,
            timestamp,
            source: metadata.source || 'unknown',
            strategy: metadata.strategy || 'mobile',
            scores: scoreData.scores || {},
            coreWebVitals: scoreData.coreWebVitals || {},
            lighthouseVersion: metadata.lighthouseVersion || null,
            // Crawl-specific fields (v2)
            crawlSessionId: crawlInfo?.sessionId || null,
            pageTemplate: crawlInfo?.template || null,
            pagePath: crawlInfo?.path || new URL(url).pathname
        }

        try {
            await indexedDB.add(STORE_NAME, entry)

            // Update domains list
            await loadDomains()

            // If viewing this domain, refresh scores
            if (currentDomain.value === domain) {
                await loadScoresForDomain(domain)
            }

            return id
        } catch (err) {
            error.value = err.message
            console.error('Failed to add score:', err)
            throw err
        }
    }

    /**
     * Load scores for a specific domain
     * @param {string} domain - Domain name
     * @param {boolean} includeCrawl - Include crawl entries (default: false)
     */
    async function loadScoresForDomain(domain, includeCrawl = false) {
        if (!initialized.value) {
            await initialize()
        }

        loading.value = true
        currentDomain.value = domain

        try {
            const allScores = await indexedDB.getAllByIndex(STORE_NAME, 'domain', domain)
            // Filter: exclude crawl entries for simple history
            currentScores.value = includeCrawl
                ? allScores
                : allScores.filter(s => !s.crawlSessionId)
        } catch (err) {
            error.value = err.message
            console.error('Failed to load scores for domain:', err)
        } finally {
            loading.value = false
        }
    }

    /**
     * Delete all scores for a domain
     * @param {string} domain - Domain name
     * @returns {Promise<number>} - Number of deleted entries
     */
    async function deleteDomain(domain) {
        if (!initialized.value) {
            await initialize()
        }

        try {
            const count = await indexedDB.removeByIndex(STORE_NAME, 'domain', domain)

            // Clear current if viewing this domain
            if (currentDomain.value === domain) {
                currentDomain.value = null
                currentScores.value = []
            }

            // Reload domains
            await loadDomains()

            return count
        } catch (err) {
            error.value = err.message
            console.error('Failed to delete domain:', err)
            throw err
        }
    }

    /**
     * Delete a single score entry
     * @param {string} id - Entry ID
     */
    async function deleteScore(id) {
        if (!initialized.value) {
            await initialize()
        }

        try {
            await indexedDB.remove(STORE_NAME, id)

            // Reload current domain scores
            if (currentDomain.value) {
                await loadScoresForDomain(currentDomain.value)
            }

            // Reload domains
            await loadDomains()
        } catch (err) {
            error.value = err.message
            console.error('Failed to delete score:', err)
            throw err
        }
    }

    /**
     * Clear all history
     */
    async function clearAll() {
        if (!initialized.value) {
            await initialize()
        }

        try {
            await indexedDB.clear(STORE_NAME)
            await indexedDB.clear(REPORTS_STORE)
            domains.value = []
            currentDomain.value = null
            currentScores.value = []
        } catch (err) {
            error.value = err.message
            console.error('Failed to clear history:', err)
            throw err
        }
    }

    /**
     * Add a new score entry with full report
     * @param {string} url - Full URL analyzed
     * @param {object} scoreData - Score data
     * @param {object} metadata - Additional metadata
     * @param {object} crawlInfo - Optional crawl information
     * @param {object} fullReport - Full Lighthouse JSON report
     * @returns {Promise<string>} - ID of the new entry
     */
    async function addScoreWithReport(url, scoreData, metadata = {}, crawlInfo = null, fullReport = null) {
        const scoreId = await addScore(url, scoreData, metadata, crawlInfo)

        if (fullReport) {
            try {
                const reportEntry = {
                    id: crypto.randomUUID(),
                    scoreId,
                    report: fullReport,
                    timestamp: Date.now()
                }
                await indexedDB.add(REPORTS_STORE, reportEntry)
            } catch (err) {
                console.error('Failed to store full report:', err)
                // Don't throw - score was still saved successfully
            }
        }

        return scoreId
    }

    /**
     * Get a score entry by ID
     * @param {string} id - Score entry ID
     * @returns {Promise<object|null>} - Score entry or null
     */
    async function getScoreById(id) {
        if (!initialized.value) {
            await initialize()
        }

        try {
            return await indexedDB.get(STORE_NAME, id)
        } catch (err) {
            console.error('Failed to get score by ID:', err)
            return null
        }
    }

    /**
     * Get full Lighthouse report for a score entry
     * @param {string} scoreId - Score entry ID
     * @returns {Promise<object|null>} - Full report or null
     */
    async function getFullReport(scoreId) {
        if (!initialized.value) {
            await initialize()
        }

        try {
            const reports = await indexedDB.getAllByIndex(REPORTS_STORE, 'scoreId', scoreId)
            return reports.length > 0 ? reports[0].report : null
        } catch (err) {
            console.error('Failed to get full report:', err)
            return null
        }
    }

    /**
     * Check if a full report exists for a score entry
     * @param {string} scoreId - Score entry ID
     * @returns {Promise<boolean>}
     */
    async function hasFullReport(scoreId) {
        if (!initialized.value) {
            await initialize()
        }

        try {
            const reports = await indexedDB.getAllByIndex(REPORTS_STORE, 'scoreId', scoreId)
            return reports.length > 0
        } catch (err) {
            console.error('Failed to check for full report:', err)
            return false
        }
    }

    /**
     * Delete full report for a score entry
     * @param {string} scoreId - Score entry ID
     */
    async function deleteFullReport(scoreId) {
        if (!initialized.value) {
            await initialize()
        }

        try {
            const reports = await indexedDB.getAllByIndex(REPORTS_STORE, 'scoreId', scoreId)
            for (const report of reports) {
                await indexedDB.remove(REPORTS_STORE, report.id)
            }
        } catch (err) {
            console.error('Failed to delete full report:', err)
        }
    }

    /**
     * Migrate data from localStorage (historyStore) to IndexedDB
     * This should be called once during app initialization
     * @returns {Promise<{migrated: number, skipped: number}>}
     */
    async function migrateFromLocalStorage() {
        const LEGACY_STORAGE_KEY = 'lighthouse-history'
        const MIGRATION_FLAG_KEY = 'lighthouse-history-migrated'

        // Check if migration already done
        if (localStorage.getItem(MIGRATION_FLAG_KEY)) {
            return {migrated: 0, skipped: 0, alreadyMigrated: true}
        }

        if (!initialized.value) {
            await initialize()
        }

        const stored = localStorage.getItem(LEGACY_STORAGE_KEY)
        if (!stored) {
            localStorage.setItem(MIGRATION_FLAG_KEY, 'true')
            return {migrated: 0, skipped: 0}
        }

        let migrated = 0
        let skipped = 0

        try {
            const analyses = JSON.parse(stored)

            if (!Array.isArray(analyses)) {
                console.warn('Invalid localStorage format for migration')
                return {migrated: 0, skipped: 0}
            }

            for (const analysis of analyses) {
                try {
                    // Convert localStorage format to IndexedDB format
                    const url = analysis.url || 'https://unknown'
                    const domain = extractDomain(url)
                    const timestamp = analysis.timestamp
                        ? new Date(analysis.timestamp).getTime()
                        : Date.now()

                    const entry = {
                        id: analysis.id || crypto.randomUUID(),
                        domain,
                        url,
                        timestamp,
                        source: 'file', // Legacy data came from file uploads
                        strategy: 'mobile', // Default
                        scores: analysis.scores || {},
                        coreWebVitals: analysis.coreWebVitals || {},
                        lighthouseVersion: analysis.lighthouseVersion || null,
                        crawlSessionId: null,
                        pageTemplate: null,
                        pagePath: new URL(url).pathname
                    }

                    await indexedDB.add(STORE_NAME, entry)
                    migrated++
                } catch (entryErr) {
                    console.warn('Failed to migrate entry:', entryErr)
                    skipped++
                }
            }

            // Mark migration as complete
            localStorage.setItem(MIGRATION_FLAG_KEY, 'true')

            // Optionally clear old localStorage data (commented out for safety)
            // localStorage.removeItem(LEGACY_STORAGE_KEY)

            // Reload domains after migration
            await loadDomains()

            console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped`)
        } catch (err) {
            console.error('Migration failed:', err)
        }

        return {migrated, skipped}
    }

    /**
     * Export all data or data for a specific domain as JSON
     * @param {string} domain - Optional domain filter
     * @returns {string} JSON string
     */
    async function exportToJSON(domain = null) {
        if (!initialized.value) {
            await initialize()
        }

        try {
            let data
            if (domain) {
                data = await indexedDB.getAllByIndex(STORE_NAME, 'domain', domain)
            } else {
                data = await indexedDB.getAll(STORE_NAME)
            }

            return JSON.stringify({
                exportDate: new Date().toISOString(),
                domain: domain || 'all',
                count: data.length,
                scores: data
            }, null, 2)
        } catch (err) {
            error.value = err.message
            throw err
        }
    }

    /**
     * Import data from JSON
     * @param {string} jsonString - JSON data
     * @returns {Promise<number>} - Number of imported entries
     */
    async function importFromJSON(jsonString) {
        if (!initialized.value) {
            await initialize()
        }

        try {
            const data = JSON.parse(jsonString)
            const scores = data.scores || []

            let imported = 0
            for (const score of scores) {
                // Generate new ID to avoid conflicts
                score.id = crypto.randomUUID()
                await indexedDB.add(STORE_NAME, score)
                imported++
            }

            // Reload domains
            await loadDomains()

            return imported
        } catch (err) {
            error.value = err.message
            throw err
        }
    }

    /**
     * Get statistics for a domain
     * @param {string} domain - Domain name
     * @returns {object} Statistics
     */
    function getStatistics(domain) {
        const scores = domain ? currentScores.value : []

        if (scores.length === 0) {
            return null
        }

        const categories = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa']
        const stats = {}

        for (const category of categories) {
            const values = scores
                .map(s => s.scores?.[category])
                .filter(v => v !== undefined && v !== null)

            if (values.length > 0) {
                stats[category] = {
                    avg: values.reduce((a, b) => a + b, 0) / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    latest: values[0],
                    trend: values.length > 1 ? values[0] - values[values.length - 1] : 0
                }
            }
        }

        return stats
    }

    /**
     * Get chart data for a category
     * @param {string} category - Category name
     * @returns {object} Chart data
     */
    function getChartData(category) {
        const sorted = currentDomainScores.value

        return {
            labels: sorted.map(s => new Date(s.timestamp).toLocaleDateString('fr-FR')),
            datasets: [{
                label: category,
                data: sorted.map(s => (s.scores?.[category] || 0) * 100),
                fill: false,
                tension: 0.3
            }]
        }
    }

    /**
     * Set the includeCrawl flag and reload data
     * @param {boolean} value - Whether to include crawl entries
     */
    async function setIncludeCrawl(value) {
        includeCrawl.value = value
        await loadDomains(value)
        if (currentDomain.value) {
            await loadScoresForDomain(currentDomain.value, value)
        }
    }

    /**
     * Toggle the includeCrawl flag
     */
    async function toggleIncludeCrawl() {
        await setIncludeCrawl(!includeCrawl.value)
    }

    return {
        // State
        domains,
        currentDomain,
        currentScores,
        loading,
        error,
        initialized,
        includeCrawl,

        // Getters
        sortedDomains,
        domainCount,
        totalAnalyses,
        isEmpty,
        currentDomainScores,
        latestScoreForCurrentDomain,

        // Actions
        initialize,
        loadDomains,
        addScore,
        addScoreWithReport,
        loadScoresForDomain,
        deleteDomain,
        deleteScore,
        clearAll,
        exportToJSON,
        importFromJSON,
        getStatistics,
        getChartData,
        setIncludeCrawl,
        toggleIncludeCrawl,
        // Report management
        getScoreById,
        getFullReport,
        hasFullReport,
        deleteFullReport,
        // Migration
        migrateFromLocalStorage
    }
})
