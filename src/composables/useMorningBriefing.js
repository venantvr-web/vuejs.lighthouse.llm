import {computed, ref} from 'vue'
import {useWatchlistStore} from '@/stores/watchlistStore'
import {useGeoStore} from '@/stores/geoStore'
import {useResourceHistoryStore} from '@/stores/resourceHistoryStore'
import {useWatchlist} from '@/composables/useWatchlist'
import {useGeoTracking} from '@/composables/useGeoTracking'
import {useResourceCheck} from '@/composables/useResourceCheck'
import {breachedCategories} from '@/utils/budgets'
import {computeGeoReadiness, originFromUrl} from '@/services/resourceCheck'
import {checkServerHealth} from '@/services/localLighthouse'

const PERF_REGRESSION = 0.03

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
 * @returns {Array<{level: 'critical'|'warning', site: string, message: string}>}
 */
export function buildDigest({items = [], watchStats = {}, resourceByOrigin = {}, geoItems = [], geoStats = {}} = {}) {
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
 * Morning briefing: aggregates watchlist, resources and GEO into one view and
 * runs the daily checks in one click. Local-first (runs on demand).
 */
export function useMorningBriefing() {
    const watchlistStore = useWatchlistStore()
    const geoStore = useGeoStore()
    const resourceHistory = useResourceHistoryStore()
    const watch = useWatchlist()
    const geo = useGeoTracking()
    const resourceCheck = useResourceCheck()

    const resourceByOrigin = ref({})
    const running = ref(false)
    const progress = ref({done: 0, total: 0})
    const lastRunAt = ref(null)

    const items = computed(() => watchlistStore.sortedItems)
    const geoItems = computed(() => geoStore.sortedItems)
    const origins = computed(() => [...new Set(items.value.map(i => originFromUrl(i.url)).filter(Boolean))])

    const digest = computed(() => buildDigest({
        items: items.value,
        watchStats: watch.statsById.value,
        resourceByOrigin: resourceByOrigin.value,
        geoItems: geoItems.value,
        geoStats: geo.statsById.value
    }))

    /**
     * Load the latest stored data (no network) to render the briefing.
     */
    async function load() {
        await resourceHistory.initialize()
        await watch.loadStats(items.value)
        await geo.loadStats(geoItems.value)

        const byOrigin = {}
        for (const origin of origins.value) {
            const snaps = await resourceHistory.getSnapshots(origin)
            byOrigin[origin] = {latest: snaps[0] || null, previous: snaps[1] || null}
        }
        resourceByOrigin.value = byOrigin
    }

    /**
     * Run the morning checks: re-audit every watchlist URL, then refresh the
     * resource snapshots per origin if the local server is available.
     */
    async function runChecks() {
        running.value = true
        const serverHealthy = (await checkServerHealth().catch(() => ({available: false}))).available
        progress.value = {done: 0, total: items.value.length + (serverHealthy ? origins.value.length : 0)}

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

            await load()
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
        digest,
        running,
        progress,
        lastRunAt,
        load,
        runChecks
    }
}

export default useMorningBriefing
