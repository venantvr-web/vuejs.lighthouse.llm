import {computed, ref} from 'vue'
import {useWatchlistStore} from '@/stores/watchlistStore'
import {useGeoStore} from '@/stores/geoStore'
import {useResourceHistoryStore} from '@/stores/resourceHistoryStore'
import {useSearchConsoleHistoryStore} from '@/stores/searchConsoleHistoryStore'
import {useBriefingHistoryStore} from '@/stores/briefingHistoryStore'
import {useSettingsStore} from '@/stores/settingsStore'
import {toSeries} from '@/utils/series'
import {useWatchlist} from '@/composables/useWatchlist'
import {useGeoTracking} from '@/composables/useGeoTracking'
import {useResourceCheck} from '@/composables/useResourceCheck'
import {breachedCategories} from '@/utils/budgets'
import {computeGeoReadiness, originFromUrl} from '@/services/resourceCheck'
import {checkServerHealth} from '@/services/localLighthouse'

const PERF_REGRESSION = 0.03
// A clicks drop of 20% or more between two GSC snapshots is worth surfacing.
const CLICKS_DROP_RATIO = 0.2

const CATEGORY_LABELS = {
    performance: 'Performance',
    accessibility: 'Accessibilité',
    'best-practices': 'Bonnes pratiques',
    seo: 'SEO'
}

/**
 * Build the "to handle today" digest from already-collected data.
 * Pure and unit-tested.
 *
 * @param {object} data
 * @param {Array} data.items - Watchlist items
 * @param {object} data.watchStats - Per-item watchlist stats (statsById)
 * @param {object} data.resourceByOrigin - { origin: { latest, previous } } snapshots
 * @param {Array} data.geoItems - GEO tracked prompts
 * @param {object} data.geoStats - Per-prompt GEO stats (statsById)
 * @param {object} data.searchConsole - { site: [snapshots newest-first] }
 * @returns {Array<{level: 'critical'|'warning', site: string, message: string}>}
 */
export function buildDigest({items = [], watchStats = {}, resourceByOrigin = {}, geoItems = [], geoStats = {}, searchConsole = {}} = {}) {
    const alerts = []

    // Watchlist: regressions and budget breaches
    for (const item of items) {
        const stats = watchStats[item.id]
        if (!stats?.latest) continue

        const delta = stats.deltas?.performance
        if (typeof delta === 'number' && delta <= -PERF_REGRESSION) {
            alerts.push({level: 'critical', site: item.label, message: `Performance en baisse (${Math.round(delta * 100)} pts)`})
        }
        for (const cat of breachedCategories(item.budgets, stats.latest.scores)) {
            alerts.push({level: 'warning', site: item.label, message: `${CATEGORY_LABELS[cat]} sous le budget`})
        }
    }

    // Resources: readiness drop and broken URLs
    for (const [origin, snaps] of Object.entries(resourceByOrigin)) {
        const latest = snaps?.latest
        const previous = snaps?.previous
        if (!latest) continue

        if (previous && typeof latest.readiness === 'number' && typeof previous.readiness === 'number'
            && latest.readiness < previous.readiness) {
            alerts.push({level: 'warning', site: origin, message: `Score GEO-readiness en baisse (${previous.readiness} → ${latest.readiness})`})
        }
        if (typeof latest.brokenCount === 'number' && latest.brokenCount > 0) {
            alerts.push({level: 'critical', site: origin, message: `${latest.brokenCount} URL cassées`})
        }
    }

    // Search Console: clicks dropping between the two latest snapshots
    for (const [site, snaps] of Object.entries(searchConsole)) {
        const latest = snaps?.[0]
        const previous = snaps?.[1]
        if (!latest || !previous || !previous.clicks) continue
        if (latest.clicks <= previous.clicks * (1 - CLICKS_DROP_RATIO)) {
            alerts.push({level: 'warning', site, message: `Clics Search Console en baisse (${previous.clicks} → ${latest.clicks})`})
        }
    }

    // GEO: brand absent from every engine
    for (const item of geoItems) {
        const stats = geoStats[item.id]
        if (stats?.providers?.length && stats.enginesCited === 0) {
            alerts.push({level: 'warning', site: item.brand, message: `Absente des moteurs IA : « ${item.prompt} »`})
        }
    }

    // Critical first, stable otherwise
    return alerts.sort((a, b) => (a.level === 'critical' ? 0 : 1) - (b.level === 'critical' ? 0 : 1))
}

/**
 * Summarize a digest into alert counts (for historisation).
 * @param {Array} digest - Alerts ({ level })
 * @returns {{total: number, critical: number, warning: number}}
 */
export function summarizeDigest(digest = []) {
    const critical = digest.filter(a => a.level === 'critical').length
    return {total: digest.length, critical, warning: digest.length - critical}
}

/**
 * Morning briefing: aggregates watchlist, resources and GEO into one view and
 * runs the daily checks in one click. Local-first (runs on demand).
 */
export function useMorningBriefing() {
    const watchlistStore = useWatchlistStore()
    const geoStore = useGeoStore()
    const resourceHistory = useResourceHistoryStore()
    const searchConsoleHistory = useSearchConsoleHistoryStore()
    const briefingHistory = useBriefingHistoryStore()
    const settings = useSettingsStore()
    const watch = useWatchlist()
    const geo = useGeoTracking()
    const resourceCheck = useResourceCheck()

    const resourceByOrigin = ref({})
    const searchConsole = ref({})
    const history = ref([])
    const running = ref(false)
    const progress = ref({done: 0, total: 0})
    const lastRunAt = ref(null)
    // GEO runs cost LLM calls, so it is opt-in for the morning run.
    const includeGeo = ref(false)

    const items = computed(() => watchlistStore.sortedItems)
    const geoItems = computed(() => geoStore.sortedItems)
    const origins = computed(() => [...new Set(items.value.map(i => originFromUrl(i.url)).filter(Boolean))])
    const geoProviders = computed(() => settings.geoProviders.filter(p => p.ready))
    const geoAvailable = computed(() => geoItems.value.length > 0 && geoProviders.value.length > 0)

    const digest = computed(() => buildDigest({
        items: items.value,
        watchStats: watch.statsById.value,
        resourceByOrigin: resourceByOrigin.value,
        geoItems: geoItems.value,
        geoStats: geo.statsById.value,
        searchConsole: searchConsole.value
    }))

    // Alert trends across saved runs (oldest-first, for sparklines)
    const digestTrend = computed(() => toSeries(history.value, s => (typeof s.total === 'number' ? s.total : null)))
    const criticalTrend = computed(() => toSeries(history.value, s => (typeof s.critical === 'number' ? s.critical : null)))
    const warningTrend = computed(() => toSeries(history.value, s => (typeof s.warning === 'number' ? s.warning : null)))

    /**
     * Load the latest stored data (no network) to render the briefing.
     */
    async function load() {
        await resourceHistory.initialize()
        await searchConsoleHistory.initialize()
        await briefingHistory.initialize()
        await watch.loadStats(items.value)
        await geo.loadStats(geoItems.value)

        const byOrigin = {}
        for (const origin of origins.value) {
            const snaps = await resourceHistory.getSnapshots(origin)
            byOrigin[origin] = {latest: snaps[0] || null, previous: snaps[1] || null}
        }
        resourceByOrigin.value = byOrigin
        searchConsole.value = await searchConsoleHistory.getSnapshotsBySite()
        history.value = await briefingHistory.getSnapshots()
    }

    /**
     * Run the morning checks: re-audit every watchlist URL, then refresh the
     * resource snapshots per origin if the local server is available.
     */
    async function runChecks() {
        running.value = true
        const serverHealthy = (await checkServerHealth().catch(() => ({available: false}))).available
        const runGeo = includeGeo.value && geoAvailable.value
        progress.value = {
            done: 0,
            total: items.value.length
                + (serverHealthy ? origins.value.length : 0)
                + (runGeo ? geoItems.value.length : 0)
        }

        try {
            for (const item of items.value) {
                await watch.refreshItem(item)
                progress.value = {...progress.value, done: progress.value.done + 1}
            }

            if (serverHealthy) {
                for (const origin of origins.value) {
                    await resourceCheck.check(origin)
                    const readiness = computeGeoReadiness(
                        resourceCheck.resources.value,
                        resourceCheck.sitemaps.value,
                        {jsonLd: resourceCheck.jsonLd.value.present}
                    ).score
                    await resourceHistory.addSnapshot({origin, readiness, brokenCount: null})
                    progress.value = {...progress.value, done: progress.value.done + 1}
                }
            }

            // GEO (opt-in): keep it cheap — no advanced second call
            if (runGeo) {
                for (const item of geoItems.value) {
                    await geo.runPrompt(item, geoProviders.value, {advancedAnalysis: false})
                    progress.value = {...progress.value, done: progress.value.done + 1}
                }
            }

            await load()
            // Record the digest snapshot so the alert trend builds over runs
            await briefingHistory.addSnapshot(summarizeDigest(digest.value))
            history.value = await briefingHistory.getSnapshots()
            lastRunAt.value = Date.now()
        } finally {
            running.value = false
        }
    }

    return {
        items,
        geoItems,
        watchStats: watch.statsById,
        geoStats: geo.statsById,
        resourceByOrigin,
        searchConsole,
        digest,
        digestTrend,
        criticalTrend,
        warningTrend,
        history,
        running,
        progress,
        lastRunAt,
        includeGeo,
        geoAvailable,
        load,
        runChecks
    }
}

export default useMorningBriefing
