import {ref} from 'vue'
import {useSettingsStore} from '@/stores/settingsStore'
import {buildLLMProvider} from '@/services/llm/buildProvider'
import {buildIndexabilityPrompt, buildIndexabilitySignals, INDEXABILITY_SYSTEM} from '@/services/indexabilityDiagnosis'
import {buildContinuationPrompt} from '@/services/llm/continuation'

/**
 * Diagnostic d'indexabilité par le LLM, en streaming, à partir des signaux
 * collectés par l'écran Ressources. Réutilise le fournisseur LLM configuré et
 * sait reprendre une réponse tronquée (« Continuer »).
 */
export function useIndexabilityDiagnosis() {
    const settings = useSettingsStore()

    const diagnosing = ref(false)
    const diagnosis = ref('')
    const error = ref(null)
    const tokenCount = ref(0)
    const truncated = ref(false)

    // Fournisseur actif (pour annuler) et dernier prompt (pour reprendre)
    let activeProvider = null
    let lastPrompt = ''

    async function streamInto(prompt, {append = false} = {}) {
        if (!settings.isConfigured) {
            error.value = 'Configurez un fournisseur LLM dans les paramètres.'
            return
        }
        error.value = null
        truncated.value = false
        diagnosing.value = true
        if (!append) {
            diagnosis.value = ''
            tokenCount.value = 0
        }

        try {
            activeProvider = buildLLMProvider(settings, settings.currentProvider, settings.currentModel)
            for await (const chunk of activeProvider.stream(prompt, {systemMessage: INDEXABILITY_SYSTEM})) {
                if (!diagnosing.value) break // annulé
                diagnosis.value += chunk
                tokenCount.value += chunk.split(/\s+/).filter(Boolean).length
            }
            truncated.value = !!activeProvider?.lastResponseTruncated
        } catch (e) {
            if (diagnosing.value) error.value = `Erreur : ${e.message}`
        } finally {
            diagnosing.value = false
            activeProvider = null
        }
    }

    /**
     * Lance le diagnostic à partir de l'état des vérifications.
     * @param {object} state - { origin, resources, sitemaps, jsonLd, readiness, brokenPages, pageMeta }
     */
    async function run(state) {
        lastPrompt = buildIndexabilityPrompt(buildIndexabilitySignals(state))
        await streamInto(lastPrompt)
    }

    /** Reprend une réponse tronquée là où elle s'est arrêtée. */
    async function continueDiagnosis() {
        if (!lastPrompt || !diagnosis.value || diagnosing.value) return
        diagnosis.value += '\n'
        await streamInto(buildContinuationPrompt(lastPrompt, diagnosis.value), {append: true})
    }

    function cancel() {
        diagnosing.value = false
        if (activeProvider) activeProvider.abort()
    }

    return {diagnosing, diagnosis, error, tokenCount, truncated, run, continueDiagnosis, cancel}
}

export default useIndexabilityDiagnosis
