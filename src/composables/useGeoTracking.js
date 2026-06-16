import {ref} from 'vue'
import LLMProviderFactory from '@/services/llm/LLMProviderFactory'
import {useGeoHistoryStore} from '@/stores/geoHistoryStore'
import {useSettingsStore} from '@/stores/settingsStore'

// A drop of 15 share-of-voice points between runs counts as a notable change.
const SOV_DROP_THRESHOLD = 15

/**
 * Escape a string for safe use inside a RegExp.
 * @param {string} str - Raw string
 * @returns {string} Escaped string
 */
export function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Count case-insensitive occurrences of a term in a text.
 * @param {string} text - Haystack
 * @param {string} term - Needle
 * @returns {number} Occurrence count
 */
export function countOccurrences(text, term) {
    const cleanTerm = (term || '').trim()
    if (!cleanTerm || !text) return 0
    const matches = text.match(new RegExp(escapeRegExp(cleanTerm), 'gi'))
    return matches ? matches.length : 0
}

/**
 * Analyze an AI answer for brand visibility against competitors.
 * @param {string} text - The AI engine's answer
 * @param {string} brand - Brand to look for
 * @param {string[]} competitors - Competitor names
 * @returns {{
 *   brandMentioned: boolean,
 *   brandMentions: number,
 *   competitorsFound: Array<{name: string, count: number}>,
 *   shareOfVoice: number|null,
 *   position: number|null
 * }}
 */
export function analyzeResponse(text, brand, competitors = []) {
    const answer = text || ''
    const brandMentions = countOccurrences(answer, brand)

    const competitorsFound = competitors
        .map(name => ({name, count: countOccurrences(answer, name)}))
        .filter(c => c.count > 0)

    const competitorMentions = competitorsFound.reduce((sum, c) => sum + c.count, 0)
    const totalMentions = brandMentions + competitorMentions

    const shareOfVoice = totalMentions > 0
        ? Math.round((brandMentions / totalMentions) * 100)
        : null

    // Position = rank of the brand by first appearance among all entities present.
    let position = null
    if (brandMentions > 0) {
        const lower = answer.toLowerCase()
        const entities = [{name: brand, idx: lower.indexOf(brand.toLowerCase())}]
        for (const c of competitorsFound) {
            entities.push({name: c.name, idx: lower.indexOf(c.name.toLowerCase())})
        }
        entities.sort((a, b) => a.idx - b.idx)
        position = entities.findIndex(e => e.name === brand) + 1
    }

    return {
        brandMentioned: brandMentions > 0,
        brandMentions,
        competitorsFound,
        shareOfVoice,
        position
    }
}

/**
 * Compare a fresh run against the previous one and flag notable changes.
 * @param {object} item - Tracked prompt
 * @param {object} latest - Latest analysis (brandMentioned, shareOfVoice)
 * @param {object} previous - Previous run record (may be null)
 * @returns {string[]} Human-readable change messages
 */
export function detectChanges(item, latest, previous) {
    const changes = []
    if (!previous) return changes

    if (previous.brandMentioned && !latest.brandMentioned) {
        changes.push(`« ${item.brand} » n'est plus cité`)
    } else if (!previous.brandMentioned && latest.brandMentioned) {
        changes.push(`« ${item.brand} » est désormais cité`)
    }

    if (typeof latest.shareOfVoice === 'number' && typeof previous.shareOfVoice === 'number') {
        const delta = latest.shareOfVoice - previous.shareOfVoice
        if (delta <= -SOV_DROP_THRESHOLD) {
            changes.push(`Part de voix en baisse : ${previous.shareOfVoice}% → ${latest.shareOfVoice}%`)
        }
    }

    return changes
}

/**
 * Group a prompt's runs by provider and build a comparison summary.
 * Runs must be sorted newest-first.
 * @param {Array} runs - Run records for a single prompt
 * @returns {{
 *   providers: string[],
 *   byProvider: Object,
 *   engineCount: number,
 *   enginesCited: number,
 *   avgShareOfVoice: number|null,
 *   lastRunAt: number|null
 * }}
 */
export function groupRunsByProvider(runs) {
    const grouped = {}
    for (const run of runs) {
        if (!grouped[run.provider]) grouped[run.provider] = []
        grouped[run.provider].push(run)
    }

    const providers = Object.keys(grouped)
    const byProvider = {}
    const sovValues = []
    let enginesCited = 0
    let lastRunAt = null

    for (const provider of providers) {
        const list = grouped[provider] // newest first
        const latest = list[0]
        const sparkline = [...list]
            .reverse()
            .map(r => (typeof r.shareOfVoice === 'number' ? r.shareOfVoice : null))
            .filter(v => v !== null)
            .slice(-12)

        byProvider[provider] = {latest, previous: list[1] || null, sparkline, lastRunAt: latest.timestamp}

        if (latest.brandMentioned) enginesCited++
        if (typeof latest.shareOfVoice === 'number') sovValues.push(latest.shareOfVoice)
        if (latest.timestamp > (lastRunAt || 0)) lastRunAt = latest.timestamp
    }

    const avgShareOfVoice = sovValues.length
        ? Math.round(sovValues.reduce((a, b) => a + b, 0) / sovValues.length)
        : null

    return {providers, byProvider, engineCount: providers.length, enginesCited, avgShareOfVoice, lastRunAt}
}

/**
 * Build a configured LLM provider for a given GEO provider descriptor.
 * @param {object} settings - settings store
 * @param {{id: string, model: string}} descriptor - provider id + model
 * @returns {import('@/services/llm/BaseLLMProvider').default}
 */
function buildProviderFor(settings, descriptor) {
    const cfg = {
        model: descriptor.model,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens
    }
    if (descriptor.id === 'ollama') {
        cfg.baseURL = settings.ollamaBaseUrl
    } else {
        cfg.apiKey = settings.providerKeys[descriptor.id]
    }
    return LLMProviderFactory.create(descriptor.id, cfg)
}

/**
 * Composable for GEO tracking: run tracked prompts against the configured LLM
 * provider, score brand visibility, persist runs and expose per-prompt stats.
 */
export function useGeoTracking() {
    const geoHistory = useGeoHistoryStore()
    const settings = useSettingsStore()

    const statsById = ref({})
    const runningById = ref({})
    const errorById = ref({})

    /**
     * Build enriched, per-provider stats for a prompt from its stored runs.
     * @param {object} item - Tracked prompt
     */
    async function loadItemStats(item) {
        const runs = await geoHistory.getRunsForPrompt(item.id)
        statsById.value = {
            ...statsById.value,
            [item.id]: {...groupRunsByProvider(runs), count: runs.length}
        }
    }

    /**
     * Load stats for every tracked prompt.
     * @param {Array} items - Tracked prompts
     */
    async function loadStats(items) {
        await Promise.all(items.map(loadItemStats))
    }

    /**
     * Run a prompt across several providers in parallel, scoring and
     * persisting one result per provider.
     * @param {object} item - Tracked prompt
     * @param {Array<{id: string, label: string, model: string}>} providers - Providers to query
     * @returns {Promise<{success: boolean, changes: string[]}>}
     */
    async function runPrompt(item, providers = []) {
        if (!providers.length) {
            errorById.value = {...errorById.value, [item.id]: 'Aucun fournisseur sélectionné (configurez une clé).'}
            return {success: false, changes: []}
        }

        runningById.value = {...runningById.value, [item.id]: true}
        errorById.value = {...errorById.value, [item.id]: null}

        // Capture each provider's previous latest for change detection
        const prevByProvider = statsById.value[item.id]?.byProvider || {}

        const results = await Promise.allSettled(providers.map(async (descriptor) => {
            const provider = buildProviderFor(settings, descriptor)
            const answer = await provider.send(item.prompt)
            const analysis = analyzeResponse(answer, item.brand, item.competitors)
            await geoHistory.addRun({
                promptId: item.id,
                provider: descriptor.id,
                model: descriptor.model,
                response: answer,
                ...analysis
            })
            return {descriptor, analysis}
        }))

        await loadItemStats(item)

        const changes = []
        const errors = []
        for (let i = 0; i < results.length; i++) {
            const result = results[i]
            const label = providers[i].label
            if (result.status === 'fulfilled') {
                const prevLatest = prevByProvider[providers[i].id]?.latest || null
                for (const change of detectChanges(item, result.value.analysis, prevLatest)) {
                    changes.push(`[${label}] ${change}`)
                }
            } else {
                errors.push(`${label} : ${result.reason?.message || 'échec'}`)
            }
        }

        if (errors.length) {
            errorById.value = {...errorById.value, [item.id]: errors.join(' · ')}
        }
        runningById.value = {...runningById.value, [item.id]: false}

        return {success: errors.length < providers.length, changes}
    }

    return {
        statsById,
        runningById,
        errorById,
        loadStats,
        loadItemStats,
        runPrompt
    }
}

export default useGeoTracking
