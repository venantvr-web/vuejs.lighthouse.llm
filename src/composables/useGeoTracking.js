import {ref} from 'vue'
import {buildLLMProvider} from '@/services/llm/buildProvider'
import {useGeoHistoryStore} from '@/stores/geoHistoryStore'
import {useSettingsStore} from '@/stores/settingsStore'
import {useSiteStore} from '@/stores/siteStore'
import {toSeries} from '@/utils/series'
import {extractDomain} from '@/utils/url'

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
 * Extrait les sources (domaines) citées dans une réponse d'IA : URL http(s)
 * présentes dans le texte, regroupées par hôte (www. et casse ignorés).
 * Déterministe (pas d'appel LLM) — répond à « quels sites l'IA cite-t-elle ? ».
 * @param {string} text - Réponse de l'IA
 * @returns {Array<{host: string, count: number}>} hôtes cités, triés par occurrences
 */
export function extractSources(text) {
    if (!text) return []
    const urlRe = /https?:\/\/[^\s)<>\]"'`]+/gi
    const map = new Map()
    let m
    while ((m = urlRe.exec(text)) !== null) {
        const raw = m[0].replace(/[.,;:!?)\]}>"']+$/, '')
        const host = extractDomain(raw).toLowerCase().replace(/^www\./, '')
        if (!host || !host.includes('.')) continue
        if (!map.has(host)) map.set(host, {host, count: 0})
        map.get(host).count++
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
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
 * Build a prompt asking the model to extract the brands it cited AND the
 * sentiment toward the tracked brand, as a single JSON object.
 * @param {string} answer - The AI engine's answer
 * @param {string} brand - The tracked brand
 * @param {string} [sector] - Brand's line of business (disambiguates the name)
 * @returns {string} Extraction prompt
 */
export function buildExtractionPrompt(answer, brand, sector = '') {
    const sectorHint = (sector || '').trim()
        ? `, acteur du secteur : ${sector.trim()} (ne le confonds pas avec une marque homonyme d'un autre secteur)`
        : ''
    return `Analyse la réponse d'un assistant ci-dessous, à propos de « ${brand} »${sectorHint}. ` +
        `Renvoie UNIQUEMENT un objet JSON, sans autre texte, de la forme ` +
        `{"brands": ["..."], "sentiment": "positive|neutral|negative|absent"} où :\n` +
        `- "brands" liste UNIQUEMENT les marques, produits ou entreprises qui sont de véritables ` +
        `**concurrents directs** de « ${brand} » (même secteur, alternatives possibles). ` +
        `N'inclus PAS : « ${brand} » lui-même, ni les réglementations/normes/lois/certifications ` +
        `(ex. RGPD, HIPAA, SOX, ISO 27001), ni les outils génériques non concurrents ` +
        `(bureautique, gestion de projet, tableurs, messagerie…). Si aucun concurrent réel, renvoie une liste vide.\n` +
        `- "sentiment" décrit la tonalité envers « ${brand} » (positive, neutral, negative, ou absent si non cité).\n\n` +
        `Réponse :\n${answer}`
}

/**
 * Parse a model's JSON list of brand names, tolerating code fences and noise.
 * @param {string} text - Model output
 * @returns {string[]} Extracted names
 */
export function parseBrandList(text) {
    if (!text) return []
    const cleaned = String(text).replace(/```(?:json)?/gi, '').trim()
    const match = cleaned.match(/\[[\s\S]*]/)
    if (!match) return []
    try {
        const parsed = JSON.parse(match[0])
        if (!Array.isArray(parsed)) return []
        return parsed.map(v => String(v).trim()).filter(Boolean)
    } catch {
        return []
    }
}

/**
 * Normalize a free-form sentiment value to a fixed vocabulary.
 * @param {string} value - Raw sentiment string (FR or EN)
 * @returns {'positive'|'neutral'|'negative'|'absent'|null}
 */
export function normalizeSentiment(value) {
    const v = String(value || '').trim().toLowerCase()
    if (/(posit)/.test(v)) return 'positive'
    if (/(négat|negat)/.test(v)) return 'negative'
    if (/(neutr)/.test(v)) return 'neutral'
    if (/(absent|none|aucun)/.test(v)) return 'absent'
    return null
}

/**
 * Parse the combined extraction object (brands + sentiment), tolerating code
 * fences and falling back to a bare array of brand names.
 * @param {string} text - Model output
 * @returns {{brands: string[], sentiment: string|null}}
 */
export function parseExtraction(text) {
    if (!text) return {brands: [], sentiment: null}
    const cleaned = String(text).replace(/```(?:json)?/gi, '').trim()
    const objMatch = cleaned.match(/\{[\s\S]*}/)
    if (objMatch) {
        try {
            const parsed = JSON.parse(objMatch[0])
            const brands = Array.isArray(parsed.brands)
                ? parsed.brands.map(v => String(v).trim()).filter(Boolean)
                : []
            return {brands, sentiment: normalizeSentiment(parsed.sentiment)}
        } catch {
            // fall through to array parsing
        }
    }
    return {brands: parseBrandList(text), sentiment: null}
}

/**
 * Keep only names that are neither the brand nor a known competitor.
 * Case-insensitive, de-duplicated, ignores 1-character tokens.
 * @param {string[]} names - Names extracted from the answer
 * @param {string} brand - Tracked brand
 * @param {string[]} competitors - Known competitors
 * @returns {string[]} Emerging competitor names
 */
export function extractEmerging(names, brand, competitors = []) {
    const known = new Set([brand, ...competitors].map(n => (n || '').trim().toLowerCase()).filter(Boolean))
    const seen = new Set()
    const result = []
    for (const raw of names) {
        const name = (raw || '').trim()
        const key = name.toLowerCase()
        if (name.length < 2 || known.has(key) || seen.has(key)) continue
        seen.add(key)
        result.push(name)
    }
    return result
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
    // Emerging competitors aggregated across engines: name -> set of engines
    const emergingMap = new Map()
    // Sources citées agrégées entre moteurs : hôte -> set de moteurs
    const sourcesMap = new Map()

    for (const provider of providers) {
        const list = grouped[provider] // newest first
        const latest = list[0]
        const sparkline = toSeries(list, r => (typeof r.shareOfVoice === 'number' ? r.shareOfVoice : null))

        byProvider[provider] = {latest, previous: list[1] || null, sparkline, lastRunAt: latest.timestamp}

        if (latest.brandMentioned) enginesCited++
        if (typeof latest.shareOfVoice === 'number') sovValues.push(latest.shareOfVoice)
        if (latest.timestamp > (lastRunAt || 0)) lastRunAt = latest.timestamp

        for (const name of latest.emergingCompetitors || []) {
            const key = name.toLowerCase()
            if (!emergingMap.has(key)) emergingMap.set(key, {name, engines: new Set()})
            emergingMap.get(key).engines.add(provider)
        }

        for (const s of latest.sources || []) {
            const host = (s.host || '').toLowerCase()
            if (!host) continue
            if (!sourcesMap.has(host)) sourcesMap.set(host, {host: s.host, engines: new Set()})
            sourcesMap.get(host).engines.add(provider)
        }
    }

    const avgShareOfVoice = sovValues.length
        ? Math.round(sovValues.reduce((a, b) => a + b, 0) / sovValues.length)
        : null

    // Concurrents émergents : triés par nombre de moteurs, bornés pour éviter le bruit
    const emergingCompetitors = [...emergingMap.values()]
        .map(e => ({name: e.name, engines: e.engines.size}))
        .sort((a, b) => b.engines - a.engines)
        .slice(0, 12)

    // Sources citées : triées par nombre de moteurs qui les citent, bornées
    const citedSources = [...sourcesMap.values()]
        .map(e => ({host: e.host, engines: e.engines.size}))
        .sort((a, b) => b.engines - a.engines)
        .slice(0, 12)

    return {providers, byProvider, engineCount: providers.length, enginesCited, avgShareOfVoice, emergingCompetitors, citedSources, lastRunAt}
}

// Weighting of the composite GEO score: how often the brand is cited matters
// a bit more than how loud it is when present.
const GEO_CITATION_WEIGHT = 0.6
const GEO_SOV_WEIGHT = 0.4

/**
 * Composite GEO score (0-100) from a list of (mention, share-of-voice) pairs.
 * Blends citation rate (% of engine answers citing the brand) and average
 * share of voice. Returns null when there is no data.
 * @param {Array<{mentioned: boolean, sov: number|null}>} pairs
 * @returns {number|null}
 */
function scoreFromPairs(pairs) {
    if (!pairs.length) return null
    const cited = pairs.filter(p => p.mentioned).length
    const citationRate = (cited / pairs.length) * 100
    const sovValues = pairs.map(p => p.sov).filter(v => typeof v === 'number')
    const avgSov = sovValues.length ? sovValues.reduce((a, b) => a + b, 0) / sovValues.length : 0
    return Math.round(GEO_CITATION_WEIGHT * citationRate + GEO_SOV_WEIGHT * avgSov)
}

/**
 * Aggregate a brand's overall GEO visibility from its per-prompt stats
 * (the output of groupRunsByProvider). Each prompt × engine latest run is one
 * data point. The trend compares the latest runs against the previous ones.
 * Pure and deterministic — safe to unit-test directly.
 * @param {Array<object>} statsList - Per-prompt stats (with byProvider)
 * @returns {{
 *   score: number|null,
 *   citationRate: number|null,
 *   avgShareOfVoice: number|null,
 *   enginesCited: number,
 *   engineRuns: number,
 *   promptCount: number,
 *   trend: number|null
 * }}
 */
export function computeGeoScore(statsList = []) {
    const current = []
    const previous = []
    for (const stats of statsList) {
        const byProvider = stats?.byProvider || {}
        for (const provider of Object.keys(byProvider)) {
            const latest = byProvider[provider]?.latest
            if (latest) {
                current.push({
                    mentioned: !!latest.brandMentioned,
                    sov: typeof latest.shareOfVoice === 'number' ? latest.shareOfVoice : null
                })
            }
            const prev = byProvider[provider]?.previous
            if (prev) {
                previous.push({
                    mentioned: !!prev.brandMentioned,
                    sov: typeof prev.shareOfVoice === 'number' ? prev.shareOfVoice : null
                })
            }
        }
    }

    const score = scoreFromPairs(current)
    const prevScore = scoreFromPairs(previous)
    const cited = current.filter(p => p.mentioned).length
    const sovValues = current.map(p => p.sov).filter(v => typeof v === 'number')

    return {
        score,
        citationRate: current.length ? Math.round((cited / current.length) * 100) : null,
        avgShareOfVoice: sovValues.length ? Math.round(sovValues.reduce((a, b) => a + b, 0) / sovValues.length) : null,
        enginesCited: cited,
        engineRuns: current.length,
        promptCount: statsList.length,
        trend: (score !== null && prevScore !== null) ? score - prevScore : null
    }
}


/**
 * Composable for GEO tracking: run tracked prompts against the configured LLM
 * provider, score brand visibility, persist runs and expose per-prompt stats.
 */
export function useGeoTracking() {
    const geoHistory = useGeoHistoryStore()
    const settings = useSettingsStore()
    const site = useSiteStore()

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
     * @param {{advancedAnalysis?: boolean}} options - Run options
     * @returns {Promise<{success: boolean, changes: string[]}>}
     */
    async function runPrompt(item, providers = [], options = {}) {
        if (!providers.length) {
            errorById.value = {...errorById.value, [item.id]: 'Aucun fournisseur sélectionné (configurez une clé).'}
            return {success: false, changes: []}
        }

        runningById.value = {...runningById.value, [item.id]: true}
        errorById.value = {...errorById.value, [item.id]: null}

        // Capture each provider's previous latest for change detection
        const prevByProvider = statsById.value[item.id]?.byProvider || {}

        const results = await Promise.allSettled(providers.map(async (descriptor) => {
            const provider = buildLLMProvider(settings, descriptor.id, descriptor.model)
            const answer = await provider.send(item.prompt)
            const analysis = analyzeResponse(answer, item.brand, item.competitors)
            const sources = extractSources(answer)

            // Optional second call: ask the model which brands it cited and the
            // sentiment toward the tracked brand.
            let emergingCompetitors = []
            let sentiment = null
            if (options.advancedAnalysis) {
                try {
                    const sector = site.sectorFor(item.brand)
                    const extraction = await provider.send(buildExtractionPrompt(answer, item.brand, sector))
                    const {brands, sentiment: s} = parseExtraction(extraction)
                    emergingCompetitors = extractEmerging(brands, item.brand, item.competitors)
                    sentiment = analysis.brandMentioned ? s : 'absent'
                } catch {
                    emergingCompetitors = []
                }
            }

            await geoHistory.addRun({
                promptId: item.id,
                provider: descriptor.id,
                model: descriptor.model,
                response: answer,
                emergingCompetitors,
                sources,
                sentiment,
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
