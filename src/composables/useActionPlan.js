import {ref} from 'vue'
import {buildLLMProvider} from '@/services/llm/buildProvider'
import {useSettingsStore} from '@/stores/settingsStore'

/**
 * Heuristic implementation effort per Lighthouse audit id.
 * 1 = faible (config/asset), 2 = moyen, 3 = élevé (refonte/code applicatif).
 */
const EFFORT_BY_AUDIT = {
    'uses-text-compression': 1,
    'uses-long-cache-ttl': 1,
    'uses-optimized-images': 1,
    'modern-image-formats': 1,
    'offscreen-images': 1,
    'unminified-css': 1,
    'unminified-javascript': 1,
    'uses-rel-preconnect': 1,
    'uses-rel-preload': 1,
    'font-display': 1,
    'efficient-animated-content': 1,
    'render-blocking-resources': 2,
    'unused-css-rules': 2,
    'unused-javascript': 2,
    'server-response-time': 2,
    'redirects': 2,
    'duplicated-javascript': 2,
    'legacy-javascript': 2,
    'bootup-time': 3,
    'mainthread-work-breakdown': 3,
    'third-party-summary': 3,
    'dom-size': 3,
    'largest-contentful-paint-element': 3,
    'total-blocking-time': 3
}

const DEFAULT_EFFORT = 2

/**
 * Estimate the impact (0-100) of fixing an opportunity.
 * Combines how far the audit is from passing with the potential savings.
 * @param {object} opp - Opportunity from the parser
 * @returns {number} Impact score 0-100
 */
export function estimateImpact(opp) {
    const severity = (opp.score === null || opp.score === undefined) ? 0.5 : (1 - opp.score)
    const ms = opp.savings?.ms || 0
    // Savings bonus saturates around ~2s of potential gain.
    const savingsBonus = Math.min(ms / 2000, 1)
    const impact = severity * 70 + savingsBonus * 30
    return Math.round(Math.max(0, Math.min(100, impact)))
}

/**
 * Estimate implementation effort for an opportunity.
 * @param {object} opp - Opportunity
 * @returns {number} Effort level 1-3
 */
export function estimateEffort(opp) {
    return EFFORT_BY_AUDIT[opp.id] ?? DEFAULT_EFFORT
}

function impactLabel(score) {
    if (score >= 66) return 'élevé'
    if (score >= 33) return 'moyen'
    return 'faible'
}

function effortLabel(effort) {
    return effort === 1 ? 'faible' : effort === 3 ? 'élevé' : 'moyen'
}

/**
 * Build a prioritized action plan from Lighthouse opportunities.
 * Tickets are sorted by priority (impact / effort), then by time savings.
 * @param {Array} opportunities - Opportunities from useLighthouseParser
 * @param {object} options - { limit }
 * @returns {Array} Prioritized tickets
 */
export function buildActionPlan(opportunities = [], options = {}) {
    const limit = options.limit ?? 12

    return opportunities
        .filter(opp => opp.score === null || opp.score === undefined || opp.score < 1)
        .map(opp => {
            const impact = estimateImpact(opp)
            const effort = estimateEffort(opp)
            return {
                id: opp.id,
                title: opp.title,
                description: opp.description || '',
                displayValue: opp.displayValue || '',
                savingsMs: opp.savings?.ms || 0,
                savingsBytes: opp.savings?.bytes || 0,
                impact,
                impactLabel: impactLabel(impact),
                effort,
                effortLabel: effortLabel(effort),
                priority: Math.round((impact / effort) * 10) / 10
            }
        })
        .sort((a, b) => (b.priority - a.priority) || (b.savingsMs - a.savingsMs))
        .slice(0, limit)
}

/**
 * Composable wrapping the action plan engine plus optional AI remediation.
 */
export function useActionPlan() {
    const settings = useSettingsStore()
    const generating = ref(false)
    const error = ref(null)
    const fixPlan = ref('')

    /**
     * Ask the configured LLM for concrete remediation steps for the top tickets.
     * @param {Array} tickets - Prioritized tickets (from buildActionPlan)
     * @param {string} url - Audited URL (for context)
     * @returns {Promise<string>} Markdown remediation plan
     */
    async function generateFixPlan(tickets, url = '') {
        if (!settings.isConfigured) {
            error.value = 'Aucun fournisseur LLM configuré (voir Paramètres).'
            return ''
        }
        generating.value = true
        error.value = null
        try {
            const provider = buildLLMProvider(settings, settings.currentProvider, settings.currentModel)

            const list = tickets
                .map((t, i) => `${i + 1}. ${t.title} (impact ${t.impactLabel}, effort ${t.effortLabel}${t.displayValue ? `, ${t.displayValue}` : ''})`)
                .join('\n')
            const prompt = `Tu es un expert en performance web. Pour le site ${url || '(non précisé)'}, ` +
                `voici les optimisations Lighthouse priorisées :\n\n${list}\n\n` +
                `Pour chacune, donne en français : la cause probable, les étapes concrètes de correction, ` +
                `et un court extrait de code quand c'est pertinent. Sois concis et actionnable, en Markdown.`

            fixPlan.value = await provider.send(prompt)
            return fixPlan.value
        } catch (err) {
            error.value = err.message || 'Échec de la génération'
            return ''
        } finally {
            generating.value = false
        }
    }

    return {generating, error, fixPlan, generateFixPlan}
}

export default useActionPlan
