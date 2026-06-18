import {ref} from 'vue'
import {useSettingsStore} from '@/stores/settingsStore'
import {buildLLMProvider} from '@/services/llm/buildProvider'
import {buildIndexabilityPrompt, buildIndexabilitySignals, INDEXABILITY_SYSTEM} from '@/services/indexabilityDiagnosis'

/**
 * Diagnostic d'indexabilité par le LLM, en streaming, à partir des signaux
 * collectés par l'écran Ressources. Réutilise le fournisseur LLM configuré.
 */
export function useIndexabilityDiagnosis() {
    const settings = useSettingsStore()

    const diagnosing = ref(false)
    const diagnosis = ref('')
    const error = ref(null)
    const tokenCount = ref(0)

    // Fournisseur actif, conservé pour pouvoir annuler le flux
    let activeProvider = null

    /**
     * Lance le diagnostic à partir de l'état des vérifications.
     * @param {object} state - { origin, resources, sitemaps, jsonLd, readiness, brokenPages }
     */
    async function run(state) {
        if (!settings.isConfigured) {
            error.value = 'Configurez un fournisseur LLM dans les paramètres.'
            return
        }
        error.value = null
        diagnosing.value = true
        diagnosis.value = ''
        tokenCount.value = 0

        const prompt = buildIndexabilityPrompt(buildIndexabilitySignals(state))

        try {
            activeProvider = buildLLMProvider(settings, settings.currentProvider, settings.currentModel)
            for await (const chunk of activeProvider.stream(prompt, {systemMessage: INDEXABILITY_SYSTEM})) {
                if (!diagnosing.value) break // annulé
                diagnosis.value += chunk
                tokenCount.value += chunk.split(/\s+/).filter(Boolean).length
            }
        } catch (e) {
            if (diagnosing.value) error.value = `Erreur : ${e.message}`
        } finally {
            diagnosing.value = false
            activeProvider = null
        }
    }

    function cancel() {
        diagnosing.value = false
        if (activeProvider) activeProvider.abort()
    }

    return {diagnosing, diagnosis, error, tokenCount, run, cancel}
}

export default useIndexabilityDiagnosis
