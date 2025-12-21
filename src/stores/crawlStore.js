import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {useIndexedDB} from '@/composables/useIndexedDB'
import {useScoreHistoryStore} from '@/stores/scoreHistoryStore'
import {discoverUrls, DISCOVERY_MODES} from '@/services/urlDiscovery'
import {detectTemplates, TEMPLATE_COLORS} from '@/services/templateDetector'
import {analyzeUrl as analyzeWithPageSpeed} from '@/services/pageSpeedInsights'
import {analyzeUrl as analyzeWithLocal} from '@/services/localLighthouse'

const DB_NAME = 'lighthouse-history'
const DB_VERSION = 3
const CRAWL_SESSIONS_STORE = 'crawl-sessions'

/**
 * Crawl services
 */
export const CRAWL_SERVICES = {
    PAGESPEED: 'pagespeed',
    LOCAL: 'local'
}

/**
 * Crawl status
 */
export const CRAWL_STATUS = {
    IDLE: 'idle',
    DISCOVERING: 'discovering',
    ANALYZING: 'analyzing',
    COMPLETED: 'completed',
    PARTIAL: 'partial',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
}

/**
 * Store for managing crawl sessions
 */
export const useCrawlStore = defineStore('crawl', () => {
    const indexedDB = useIndexedDB(DB_NAME, DB_VERSION)

    // State
    const sessions = ref([])
    const currentSession = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const initialized = ref(false)

    // Crawl progress state
    const crawlStatus = ref(CRAWL_STATUS.IDLE)
    const discoveredUrls = ref([])
    const analyzedCount = ref(0)
    const currentUrl = ref('')
    const crawlResults = ref([])
    const abortController = ref(null)

    // Getters
    const isRunning = computed(() =>
        [CRAWL_STATUS.DISCOVERING, CRAWL_STATUS.ANALYZING].includes(crawlStatus.value)
    )

    const progress = computed(() => {
        if (crawlStatus.value === CRAWL_STATUS.DISCOVERING) {
            return {stage: 'discovering', current: discoveredUrls.value.length, total: 20}
        }
        if (crawlStatus.value === CRAWL_STATUS.ANALYZING) {
            return {
                stage: 'analyzing',
                current: analyzedCount.value,
                total: discoveredUrls.value.length,
                percentage: Math.round((analyzedCount.value / discoveredUrls.value.length) * 100)
            }
        }
        return {stage: crawlStatus.value, current: 0, total: 0}
    })

    const sortedSessions = computed(() =>
        [...sessions.value].sort((a, b) => b.timestamp - a.timestamp)
    )

    const currentSessionTemplateStats = computed(() => {
        if (!currentSession.value?.templates) return []
        return currentSession.value.templates
    })

    // Actions

    /**
     * Initialize the store
     */
    async function initialize() {
        if (initialized.value) return

        loading.value = true
        error.value = null

        try {
            await indexedDB.open((db, oldVersion) => {
                // Migration handled by scoreHistoryStore
                // Just ensure crawl-sessions store exists
                if (oldVersion < 2 && !db.objectStoreNames.contains(CRAWL_SESSIONS_STORE)) {
                    const store = db.createObjectStore(CRAWL_SESSIONS_STORE, {keyPath: 'id'})
                    store.createIndex('domain', 'domain', {unique: false})
                    store.createIndex('timestamp', 'timestamp', {unique: false})
                    store.createIndex('status', 'status', {unique: false})
                }
                // Version 3: Fix missing stores (recovery from corrupted state)
                if (oldVersion < 3 && !db.objectStoreNames.contains(CRAWL_SESSIONS_STORE)) {
                    const store = db.createObjectStore(CRAWL_SESSIONS_STORE, {keyPath: 'id'})
                    store.createIndex('domain', 'domain', {unique: false})
                    store.createIndex('timestamp', 'timestamp', {unique: false})
                    store.createIndex('status', 'status', {unique: false})
                }
            })

            await loadSessions()
            initialized.value = true
        } catch (err) {
            error.value = err.message
            console.error('Failed to initialize crawl store:', err)
        } finally {
            loading.value = false
        }
    }

    /**
     * Load all crawl sessions
     */
    async function loadSessions() {
        try {
            sessions.value = await indexedDB.getAll(CRAWL_SESSIONS_STORE)
        } catch (err) {
            console.error('Failed to load sessions:', err)
            sessions.value = []
        }
    }

    /**
     * Load a specific session
     * @param {string} sessionId - Session ID
     */
    async function loadSession(sessionId) {
        if (!initialized.value) await initialize()

        try {
            currentSession.value = await indexedDB.get(CRAWL_SESSIONS_STORE, sessionId)
            return currentSession.value
        } catch (err) {
            error.value = err.message
            console.error('Failed to load session:', err)
            return null
        }
    }

    /**
     * Normalize URL (add https:// if missing)
     * @param {string} url - URL to normalize
     * @returns {string} - Normalized URL
     */
    function normalizeUrl(url) {
        let normalized = url.trim()
        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            normalized = 'https://' + normalized
        }
        return normalized
    }

    /**
     * Start a new crawl
     * @param {object} config - Crawl configuration
     */
    async function startCrawl(config) {
        if (!initialized.value) await initialize()

        const {
            baseUrl: rawBaseUrl,
            discoveryMode = DISCOVERY_MODES.AUTO,
            service = CRAWL_SERVICES.PAGESPEED,
            strategy = 'mobile',
            urlList = '',
            customPatterns = [],
            maxPages = 20,
            delayMs = 1500
        } = config

        // Normalize base URL
        const baseUrl = normalizeUrl(rawBaseUrl)

        // Reset state
        error.value = null
        discoveredUrls.value = []
        analyzedCount.value = 0
        currentUrl.value = ''
        crawlResults.value = []
        abortController.value = new AbortController()

        const sessionId = crypto.randomUUID()
        const domain = extractDomain(baseUrl)
        const timestamp = Date.now()

        // Create session
        const session = {
            id: sessionId,
            domain,
            baseUrl,
            timestamp,
            status: CRAWL_STATUS.DISCOVERING,
            discoveryMode,
            service,
            strategy,
            pageCount: 0,
            pagesAnalyzed: 0,
            aggregateScores: null,
            templates: [],
            urls: []
        }

        currentSession.value = session

        try {
            // Step 1: Discover URLs
            crawlStatus.value = CRAWL_STATUS.DISCOVERING

            let urls
            if (discoveryMode === DISCOVERY_MODES.MANUAL) {
                urls = parseManualUrls(urlList, maxPages)
            } else {
                urls = await discoverUrls(baseUrl, discoveryMode, {
                    maxPages,
                    signal: abortController.value.signal,
                    onProgress: (p) => {
                        discoveredUrls.value = [...discoveredUrls.value, p.current].slice(0, maxPages)
                    }
                })
            }

            if (abortController.value.signal.aborted) {
                throw new Error('Crawl cancelled')
            }

            // Check if URLs were discovered
            if (!urls || urls.length === 0) {
                if (discoveryMode === DISCOVERY_MODES.AUTO) {
                    throw new Error('Aucune URL decouverte. Verifiez que l\'URL est accessible et que le site contient des liens internes.')
                } else if (discoveryMode === DISCOVERY_MODES.SITEMAP) {
                    throw new Error('Aucun sitemap trouve ou sitemap vide.')
                } else {
                    throw new Error('Aucune URL valide dans la liste fournie.')
                }
            }

            discoveredUrls.value = urls
            session.pageCount = urls.length

            // Step 2: Detect templates
            const urlsWithTemplates = detectTemplates(urls, customPatterns)
            session.urls = urlsWithTemplates.map(u => ({
                url: u.url,
                path: u.path,
                template: u.template,
                analyzed: false
            }))

            // Step 3: Analyze each URL
            crawlStatus.value = CRAWL_STATUS.ANALYZING

            const historyStore = useScoreHistoryStore()
            const analyzeFunc = service === CRAWL_SERVICES.LOCAL ? analyzeWithLocal : analyzeWithPageSpeed

            for (let i = 0; i < urls.length; i++) {
                if (abortController.value.signal.aborted) {
                    session.status = CRAWL_STATUS.CANCELLED
                    break
                }

                const urlInfo = session.urls[i]
                currentUrl.value = urlInfo.url

                try {
                    // Analyze URL
                    const report = await analyzeFunc(urlInfo.url, {
                        strategy,
                        signal: abortController.value.signal
                    })

                    // Extract scores
                    const scores = extractScores(report)
                    const coreWebVitals = extractCoreWebVitals(report)

                    // Save to history with crawl info
                    await historyStore.addScore(urlInfo.url, {scores, coreWebVitals}, {
                        source: service,
                        strategy,
                        lighthouseVersion: report.lighthouseVersion
                    }, {
                        sessionId,
                        template: urlInfo.template,
                        path: urlInfo.path
                    })

                    // Update session
                    urlInfo.analyzed = true
                    urlInfo.scores = scores

                    crawlResults.value.push({
                        url: urlInfo.url,
                        path: urlInfo.path,
                        template: urlInfo.template,
                        scores
                    })

                    analyzedCount.value = i + 1
                    session.pagesAnalyzed = i + 1

                } catch (err) {
                    console.warn(`Failed to analyze ${urlInfo.url}:`, err.message)
                    urlInfo.error = err.message
                }

                // Delay between requests (rate limiting)
                if (i < urls.length - 1) {
                    await delay(delayMs)
                }
            }

            // Step 4: Calculate aggregates
            session.aggregateScores = calculateAggregateScores(crawlResults.value)
            session.templates = calculateTemplateStats(crawlResults.value)

            // Determine final status
            if (session.pagesAnalyzed === session.pageCount) {
                session.status = CRAWL_STATUS.COMPLETED
                crawlStatus.value = CRAWL_STATUS.COMPLETED
            } else if (session.pagesAnalyzed > 0) {
                session.status = CRAWL_STATUS.PARTIAL
                crawlStatus.value = CRAWL_STATUS.PARTIAL
            } else {
                session.status = CRAWL_STATUS.FAILED
                crawlStatus.value = CRAWL_STATUS.FAILED
            }

            // Save session
            await indexedDB.add(CRAWL_SESSIONS_STORE, session)
            currentSession.value = session
            await loadSessions()

            return session

        } catch (err) {
            error.value = err.message
            crawlStatus.value = CRAWL_STATUS.FAILED
            session.status = CRAWL_STATUS.FAILED

            // Save partial session
            try {
                await indexedDB.add(CRAWL_SESSIONS_STORE, session)
            } catch {
                // Ignore save error
            }

            throw err
        }
    }

    /**
     * Cancel current crawl
     */
    function cancelCrawl() {
        if (abortController.value) {
            abortController.value.abort()
            crawlStatus.value = CRAWL_STATUS.CANCELLED
        }
    }

    /**
     * Delete a crawl session and its scores
     * @param {string} sessionId - Session ID
     */
    async function deleteSession(sessionId) {
        if (!initialized.value) await initialize()

        try {
            // Delete session
            await indexedDB.remove(CRAWL_SESSIONS_STORE, sessionId)

            // Note: Scores with this sessionId remain in history
            // They can be deleted separately if needed

            if (currentSession.value?.id === sessionId) {
                currentSession.value = null
            }

            await loadSessions()
        } catch (err) {
            error.value = err.message
            throw err
        }
    }

    /**
     * Get scores for a crawl session
     * @param {string} sessionId - Session ID
     * @returns {Promise<Array>} - Scores for this session
     */
    async function getSessionScores(sessionId) {
        const historyStore = useScoreHistoryStore()
        await historyStore.initialize()

        const allScores = await indexedDB.getAll('scores')
        return allScores.filter(s => s.crawlSessionId === sessionId)
    }

    /**
     * Reset crawl state
     */
    function resetCrawl() {
        crawlStatus.value = CRAWL_STATUS.IDLE
        discoveredUrls.value = []
        analyzedCount.value = 0
        currentUrl.value = ''
        crawlResults.value = []
        error.value = null
    }

    // Helper functions

    function extractDomain(url) {
        try {
            return new URL(url).hostname
        } catch {
            return url
        }
    }

    function parseManualUrls(text, maxPages) {
        return text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .filter(line => {
                try {
                    new URL(line)
                    return true
                } catch {
                    return false
                }
            })
            .slice(0, maxPages)
    }

    function extractScores(report) {
        const scores = {}
        if (report.categories) {
            Object.entries(report.categories).forEach(([key, cat]) => {
                scores[key] = cat.score
            })
        }
        return scores
    }

    function extractCoreWebVitals(report) {
        const cwv = {}
        const metrics = ['largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time']
        if (report.audits) {
            metrics.forEach(metric => {
                if (report.audits[metric]) {
                    cwv[metric] = {
                        value: report.audits[metric].numericValue,
                        score: report.audits[metric].score
                    }
                }
            })
        }
        return cwv
    }

    function calculateAggregateScores(results) {
        const categories = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa']
        const aggregates = {}

        for (const cat of categories) {
            const values = results
                .map(r => r.scores?.[cat])
                .filter(v => v !== null && v !== undefined)

            if (values.length > 0) {
                aggregates[cat] = {
                    avg: values.reduce((a, b) => a + b, 0) / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    count: values.length
                }
            }
        }

        return aggregates
    }

    function calculateTemplateStats(results) {
        const byTemplate = new Map()

        for (const result of results) {
            const template = result.template || 'other'
            if (!byTemplate.has(template)) {
                byTemplate.set(template, [])
            }
            byTemplate.get(template).push(result)
        }

        const stats = []
        for (const [template, items] of byTemplate) {
            const avgScores = calculateAggregateScores(items)
            stats.push({
                name: template,
                count: items.length,
                avgScores,
                color: TEMPLATE_COLORS[template] || TEMPLATE_COLORS.other,
                urls: items.map(i => i.url)
            })
        }

        return stats.sort((a, b) => b.count - a.count)
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    return {
        // State
        sessions,
        currentSession,
        loading,
        error,
        initialized,
        crawlStatus,
        discoveredUrls,
        analyzedCount,
        currentUrl,
        crawlResults,

        // Getters
        isRunning,
        progress,
        sortedSessions,
        currentSessionTemplateStats,

        // Actions
        initialize,
        loadSessions,
        loadSession,
        startCrawl,
        cancelCrawl,
        deleteSession,
        getSessionScores,
        resetCrawl
    }
})

export {DISCOVERY_MODES}
