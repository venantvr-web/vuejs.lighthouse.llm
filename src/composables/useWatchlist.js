import {ref} from 'vue'
import {useScoreHistoryStore} from '@/stores/scoreHistoryStore'
import {useLighthouseParser} from '@/composables/useLighthouseParser'
import {analyzeUrl as analyzePageSpeed} from '@/services/pageSpeedInsights'
import {analyzeUrl as analyzeLocal} from '@/services/localLighthouse'

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']

// A drop of 3 points or more between two audits counts as a regression.
const REGRESSION_THRESHOLD = 0.03

/**
 * Extract category scores (0-1) from a raw Lighthouse report.
 * @param {object} report - Lighthouse report
 * @returns {object} Map of category id -> score
 */
function extractScores(report) {
    const scores = {}
    if (!report?.categories) return scores
    for (const [key, category] of Object.entries(report.categories)) {
        scores[key] = category.score
    }
    return scores
}

/**
 * Compute the per-category delta between the two most recent entries.
 * @param {object} latest - Latest score entry
 * @param {object} previous - Previous score entry
 * @returns {object} Map of category id -> delta (0-1 scale) or null
 */
function computeDeltas(latest, previous) {
    const deltas = {}
    if (!latest?.scores || !previous?.scores) return deltas
    for (const category of CATEGORIES) {
        const a = latest.scores[category]
        const b = previous.scores[category]
        if (typeof a === 'number' && typeof b === 'number') {
            deltas[category] = a - b
        }
    }
    return deltas
}

/**
 * Detect regressions and budget breaches for a freshly-audited item.
 * @param {object} item - Watchlist item (carries budgets)
 * @param {object} latest - Latest score entry
 * @param {object} previous - Previous score entry (may be null)
 * @returns {{regressions: Array, breaches: Array}}
 */
function analyzeAudit(item, latest, previous) {
    const regressions = []
    const breaches = []

    for (const category of CATEGORIES) {
        const score = latest?.scores?.[category]
        if (typeof score !== 'number') continue

        // Regression vs previous audit
        const prev = previous?.scores?.[category]
        if (typeof prev === 'number' && score - prev <= -REGRESSION_THRESHOLD) {
            regressions.push({
                category,
                from: Math.round(prev * 100),
                to: Math.round(score * 100),
                delta: Math.round((score - prev) * 100)
            })
        }

        // Budget breach
        const budget = item.budgets?.[category]
        if (typeof budget === 'number' && Math.round(score * 100) < budget) {
            breaches.push({
                category,
                score: Math.round(score * 100),
                budget
            })
        }
    }

    return {regressions, breaches}
}

/**
 * Composable joining the watchlist with score history, plus on-demand re-audits.
 * Local-first: audits run via PageSpeed Insights or the local Chromium server.
 */
export function useWatchlist() {
    const scoreHistory = useScoreHistoryStore()
    const parser = useLighthouseParser()

    // Per-item enriched stats keyed by watchlist item id
    const statsById = ref({})
    // Per-item re-audit state
    const refreshingById = ref({})
    const errorById = ref({})
    const loadingStats = ref(false)

    /**
     * Build enriched stats for a single watchlist item from stored history.
     * @param {object} item - Watchlist item
     */
    async function loadItemStats(item) {
        const entries = await scoreHistory.getScoresForUrl(item.url)
        const latest = entries[0] || null
        const previous = entries[1] || null

        // Oldest-first performance series for the sparkline (cap to last 12 points).
        const series = [...entries]
            .reverse()
            .map(e => (typeof e.scores?.performance === 'number' ? Math.round(e.scores.performance * 100) : null))
            .filter(v => v !== null)
            .slice(-12)

        statsById.value = {
            ...statsById.value,
            [item.id]: {
                latest,
                previous,
                deltas: computeDeltas(latest, previous),
                sparkline: series,
                count: entries.length,
                lastCheckedAt: latest?.timestamp || null
            }
        }
    }

    /**
     * Load stats for every item in the watchlist.
     * @param {Array} items - Watchlist items
     */
    async function loadStats(items) {
        loadingStats.value = true
        try {
            await Promise.all(items.map(loadItemStats))
        } finally {
            loadingStats.value = false
        }
    }

    /**
     * Run a fresh audit for an item, persist it, and refresh its stats.
     * @param {object} item - Watchlist item
     * @returns {Promise<{success: boolean, regressions: Array, breaches: Array}>}
     */
    async function refreshItem(item) {
        refreshingById.value = {...refreshingById.value, [item.id]: true}
        errorById.value = {...errorById.value, [item.id]: null}

        // Capture the pre-audit latest so we can diff against the new result
        const previous = statsById.value[item.id]?.latest || null

        try {
            const analyze = item.source === 'local' ? analyzeLocal : analyzePageSpeed
            const report = await analyze(item.url, {strategy: item.strategy})

            const scores = extractScores(report)
            const coreWebVitals = parser.getCoreWebVitals(report)

            await scoreHistory.addScoreWithReport(
                item.url,
                {scores, coreWebVitals},
                {
                    source: item.source,
                    strategy: item.strategy,
                    lighthouseVersion: report.lighthouseVersion || null
                },
                null,
                report
            )

            await loadItemStats(item)

            const latest = statsById.value[item.id]?.latest || {scores}
            const {regressions, breaches} = analyzeAudit(item, latest, previous)
            return {success: true, regressions, breaches}
        } catch (err) {
            errorById.value = {
                ...errorById.value,
                [item.id]: err.message || 'Échec de l\'analyse'
            }
            return {success: false, regressions: [], breaches: []}
        } finally {
            refreshingById.value = {...refreshingById.value, [item.id]: false}
        }
    }

    /**
     * Re-audit every item sequentially to avoid hammering the APIs.
     * @param {Array} items - Watchlist items
     */
    async function refreshAll(items) {
        for (const item of items) {
            await refreshItem(item)
        }
    }

    return {
        statsById,
        refreshingById,
        errorById,
        loadingStats,
        loadStats,
        loadItemStats,
        refreshItem,
        refreshAll
    }
}

export default useWatchlist
