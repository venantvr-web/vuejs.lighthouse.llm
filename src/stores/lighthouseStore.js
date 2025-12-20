import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {useLighthouseParser} from '@/composables/useLighthouseParser'
import {useScoreHistoryStore} from '@/stores/scoreHistoryStore'

/**
 * Report source types
 */
export const REPORT_SOURCES = {
    FILE: 'file',
    PAGESPEED: 'pagespeed',
    LOCAL: 'local'
}

/**
 * Store for managing Lighthouse report state
 */
export const useLighthouseStore = defineStore('lighthouse', () => {
    // State
    const currentReport = ref(null)
    const parsedData = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const fileName = ref(null)
    const loadedAt = ref(null)
    const source = ref(null) // 'file' or 'pagespeed'
    const analyzedUrl = ref(null) // URL analyzed (for pagespeed)
    const strategy = ref(null) // 'mobile' or 'desktop' (for pagespeed)

    // Initialize parser
    const parser = useLighthouseParser()

    // Getters
    const url = computed(() => {
        if (!currentReport.value) return null
        return currentReport.value.finalDisplayedUrl ||
            currentReport.value.finalUrl ||
            currentReport.value.requestedUrl
    })

    const scores = computed(() => {
        if (!currentReport.value?.categories) return null

        const categoryScores = {}
        Object.entries(currentReport.value.categories).forEach(([key, category]) => {
            categoryScores[key] = category.score
        })
        return categoryScores
    })

    const coreWebVitals = computed(() => {
        if (!currentReport.value) return null
        return parser.getCoreWebVitals(currentReport.value)
    })

    const opportunities = computed(() => {
        if (!currentReport.value) return []
        return parser.getOpportunities(currentReport.value)
    })

    const diagnostics = computed(() => {
        if (!currentReport.value) return []
        return parser.getDiagnostics(currentReport.value)
    })

    const categories = computed(() => {
        if (!currentReport.value?.categories) return null

        const categoriesData = {}
        Object.entries(currentReport.value.categories).forEach(([key, category]) => {
            categoriesData[key] = parser.extractCategoryData(category)
        })
        return categoriesData
    })

    const lighthouseVersion = computed(() => {
        return currentReport.value?.lighthouseVersion || null
    })

    const userAgent = computed(() => {
        return currentReport.value?.userAgent || null
    })

    const fetchTime = computed(() => {
        return currentReport.value?.fetchTime || null
    })

    const isLoaded = computed(() => {
        return currentReport.value !== null && !loading.value
    })

    const isFromPageSpeed = computed(() => {
        return source.value === REPORT_SOURCES.PAGESPEED
    })

    const isFromFile = computed(() => {
        return source.value === REPORT_SOURCES.FILE
    })

    const isFromLocal = computed(() => {
        return source.value === REPORT_SOURCES.LOCAL
    })

    // Actions
    /**
     * Load a Lighthouse report from file or JSON object
     * @param {File|object|string} file - File object, JSON object, or JSON string
     * @returns {Promise<boolean>} True if successful
     */
    async function loadReport(file) {
        loading.value = true
        error.value = null

        try {
            let json = file

            // If it's a File object, read it
            if (file instanceof File) {
                fileName.value = file.name
                const text = await file.text()
                json = JSON.parse(text)
            }
            // If it's a string, parse it
            else if (typeof file === 'string') {
                json = JSON.parse(file)
            }

            // Parse the report
            const parsed = parser.parseReport(json)

            if (!parsed) {
                throw new Error(parser.error.value || 'Failed to parse Lighthouse report')
            }

            // Store the report
            currentReport.value = parsed
            parsedData.value = {
                url: url.value,
                scores: scores.value,
                coreWebVitals: coreWebVitals.value,
                opportunities: opportunities.value,
                diagnostics: diagnostics.value,
                categories: categories.value
            }
            loadedAt.value = new Date().toISOString()

            // Auto-save to history (non-blocking)
            saveToHistory().catch(err => {
                console.warn('Failed to save to history:', err)
            })

            loading.value = false
            return true
        } catch (err) {
            error.value = err.message || 'Failed to load report'
            loading.value = false
            console.error('Failed to load Lighthouse report:', err)
            return false
        }
    }

    /**
     * Load a Lighthouse report from a file (explicit file source)
     * @param {object} json - JSON object from file
     * @returns {Promise<boolean>} True if successful
     */
    async function loadFromFile(json) {
        source.value = REPORT_SOURCES.FILE
        analyzedUrl.value = null
        strategy.value = null
        return loadReport(json)
    }

    /**
     * Load a Lighthouse report from PageSpeed Insights API
     * @param {object} json - JSON object from PageSpeed API
     * @param {string} inputUrl - URL that was analyzed
     * @param {string} inputStrategy - Strategy used ('mobile' or 'desktop')
     * @returns {Promise<boolean>} True if successful
     */
    async function loadFromPageSpeed(json, inputUrl, inputStrategy = 'mobile') {
        source.value = REPORT_SOURCES.PAGESPEED
        analyzedUrl.value = inputUrl
        strategy.value = inputStrategy
        fileName.value = null
        return loadReport(json)
    }

    /**
     * Load a Lighthouse report from local Chromium server
     * @param {object} json - JSON object from local Lighthouse server
     * @param {string} inputUrl - URL that was analyzed
     * @param {string} inputStrategy - Strategy used ('mobile' or 'desktop')
     * @returns {Promise<boolean>} True if successful
     */
    async function loadFromLocal(json, inputUrl, inputStrategy = 'mobile') {
        source.value = REPORT_SOURCES.LOCAL
        analyzedUrl.value = inputUrl
        strategy.value = inputStrategy
        fileName.value = null
        return loadReport(json)
    }

    /**
     * Get failed audits for a specific category
     * @param {string} categoryId - Category ID
     * @returns {array} Failed audits
     */
    function getFailedAudits(categoryId) {
        if (!currentReport.value) return []
        return parser.getFailedAudits(currentReport.value, categoryId)
    }

    /**
     * Get audit details by ID
     * @param {string} auditId - Audit ID
     * @returns {object|null} Audit details
     */
    function getAudit(auditId) {
        if (!currentReport.value?.audits) return null
        return currentReport.value.audits[auditId] || null
    }

    /**
     * Get category details by ID
     * @param {string} categoryId - Category ID
     * @returns {object|null} Category details
     */
    function getCategory(categoryId) {
        if (!currentReport.value?.categories) return null
        const category = currentReport.value.categories[categoryId]
        return category ? parser.extractCategoryData(category) : null
    }

    /**
     * Clear the current report
     */
    function clearReport() {
        currentReport.value = null
        parsedData.value = null
        loading.value = false
        error.value = null
        fileName.value = null
        loadedAt.value = null
        source.value = null
        analyzedUrl.value = null
        strategy.value = null
    }

    /**
     * Save current report to history (IndexedDB)
     * @returns {Promise<string|null>} Entry ID or null if failed
     */
    async function saveToHistory() {
        if (!currentReport.value || !url.value) return null

        try {
            const historyStore = useScoreHistoryStore()

            const entryId = await historyStore.addScore(url.value, {
                scores: scores.value,
                coreWebVitals: coreWebVitals.value
            }, {
                source: source.value,
                strategy: strategy.value,
                lighthouseVersion: lighthouseVersion.value
            })

            return entryId
        } catch (err) {
            console.error('Failed to save to history:', err)
            return null
        }
    }

    /**
     * Get report summary for export/history
     * @returns {object} Report summary
     */
    function getSummary() {
        if (!currentReport.value) return null

        return {
            url: url.value,
            fileName: fileName.value,
            lighthouseVersion: lighthouseVersion.value,
            fetchTime: fetchTime.value,
            loadedAt: loadedAt.value,
            scores: scores.value,
            coreWebVitals: coreWebVitals.value,
            source: source.value,
            analyzedUrl: analyzedUrl.value,
            strategy: strategy.value
        }
    }

    return {
        // State
        currentReport,
        parsedData,
        loading,
        error,
        fileName,
        loadedAt,
        source,
        analyzedUrl,
        strategy,

        // Getters
        url,
        scores,
        coreWebVitals,
        opportunities,
        diagnostics,
        categories,
        lighthouseVersion,
        userAgent,
        fetchTime,
        isLoaded,
        isFromPageSpeed,
        isFromFile,
        isFromLocal,

        // Actions
        loadReport,
        loadFromFile,
        loadFromPageSpeed,
        loadFromLocal,
        clearReport,
        getFailedAudits,
        getAudit,
        getCategory,
        getSummary,
        saveToHistory
    }
})
