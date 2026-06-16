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
 * Build a configured LLM provider from the current settings.
 * @returns {import('@/services/llm/BaseLLMProvider').default}
 */
function buildProvider(settings) {
    const cfg = {
        apiKey: settings.apiKey,
        model: settings.currentModel,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens
    }
    if (settings.currentProvider === 'ollama') {
        cfg.baseURL = settings.ollamaBaseUrl
    }
    return LLMProviderFactory.create(settings.currentProvider, cfg)
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
     * Build enriched stats for a prompt from its stored runs.
     * @param {object} item - Tracked prompt
     */
    async function loadItemStats(item) {
        const runs = await geoHistory.getRunsForPrompt(item.id)
        const latest = runs[0] || null

        const sparkline = [...runs]
            .reverse()
            .map(r => (typeof r.shareOfVoice === 'number' ? r.shareOfVoice : null))
            .filter(v => v !== null)
            .slice(-12)

        statsById.value = {
            ...statsById.value,
            [item.id]: {
                latest,
                previous: runs[1] || null,
                sparkline,
                count: runs.length,
                lastRunAt: latest?.timestamp || null
            }
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
     * Run a prompt against the configured provider, score and persist it.
     * @param {object} item - Tracked prompt
     * @returns {Promise<{success: boolean, changes: string[]}>}
     */
    async function runPrompt(item) {
        if (!settings.isConfigured) {
            errorById.value = {...errorById.value, [item.id]: 'Aucun fournisseur LLM configuré (voir Paramètres).'}
            return {success: false, changes: []}
        }

        runningById.value = {...runningById.value, [item.id]: true}
        errorById.value = {...errorById.value, [item.id]: null}

        const previous = statsById.value[item.id]?.latest || null

        try {
            const provider = buildProvider(settings)
            const answer = await provider.send(item.prompt)
            const analysis = analyzeResponse(answer, item.brand, item.competitors)

            await geoHistory.addRun({
                promptId: item.id,
                provider: settings.currentProvider,
                model: settings.currentModel,
                response: answer,
                ...analysis
            })

            await loadItemStats(item)
            return {success: true, changes: detectChanges(item, analysis, previous)}
        } catch (err) {
            errorById.value = {
                ...errorById.value,
                [item.id]: err.message || 'Échec de l\'exécution'
            }
            return {success: false, changes: []}
        } finally {
            runningById.value = {...runningById.value, [item.id]: false}
        }
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
