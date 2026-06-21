import {computed, ref} from 'vue'
import {useSettingsStore} from '@/stores/settingsStore'
import {useSiteStore} from '@/stores/siteStore'
import {useScopedPersistentRef} from '@/composables/useScopedPersistentRef'
import {buildLLMProvider} from '@/services/llm/buildProvider'
import {fetchSiteSnapshot} from '@/services/llmSnapshot'
import {buildConceptExtractionPrompt, parseConcepts} from '@/services/conceptLearning'

/**
 * Concepts appris d'une marque (produits, cibles, thèmes), **mémorisés par
 * site** (couple marque/domaine). Sert à préremplir les prompts GEO via des
 * badges. L'apprentissage interroge le site (page d'accueil + sitemap) puis le
 * LLM configuré pour en extraire une structure réutilisable.
 */
export function useBrandConcepts() {
    const settings = useSettingsStore()
    const site = useSiteStore()

    const concepts = useScopedPersistentRef('geo.concepts', () => ({products: [], audiences: [], keywords: []}))
    const learnedAt = useScopedPersistentRef('geo.conceptsLearnedAt', null)
    const learning = ref(false)
    const error = ref('')

    const hasConcepts = computed(() => {
        const c = concepts.value || {}
        return (c.products?.length || 0) + (c.audiences?.length || 0) + (c.keywords?.length || 0) > 0
    })

    /**
     * Apprend (ou réapprend) les concepts du site actif.
     * @returns {Promise<boolean>} true si l'apprentissage a réussi
     */
    async function learn() {
        error.value = ''
        if (!settings.isConfigured) {
            error.value = 'no-llm'
            return false
        }
        if (!site.activeDomain) {
            error.value = 'no-site'
            return false
        }
        learning.value = true
        try {
            const snapshot = await fetchSiteSnapshot(site.origin)
            const provider = buildLLMProvider(settings, settings.currentProvider, settings.currentModel)
            const prompt = buildConceptExtractionPrompt(snapshot.context, {
                brand: site.activeBrand,
                sector: site.activeSector
            })
            const text = await provider.send(prompt)
            concepts.value = parseConcepts(text)
            learnedAt.value = Date.now()
            return true
        } catch (err) {
            error.value = err?.message === 'home-unreachable' ? 'unreachable' : (err?.message || 'failed')
            return false
        } finally {
            learning.value = false
        }
    }

    /** Efface les concepts appris du site actif. */
    function clearConcepts() {
        concepts.value = {products: [], audiences: [], keywords: []}
        learnedAt.value = null
    }

    return {concepts, learnedAt, learning, error, hasConcepts, learn, clearConcepts}
}

export default useBrandConcepts
