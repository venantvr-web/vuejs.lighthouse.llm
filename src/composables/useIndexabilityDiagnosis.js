import {ref} from 'vue'
import {useSettingsStore} from '@/stores/settingsStore'
import {buildLLMProvider} from '@/services/llm/buildProvider'
import {buildIndexabilityPrompt, buildIndexabilitySignals, INDEXABILITY_SYSTEM} from '@/services/indexabilityDiagnosis'
import {buildContinuationPrompt} from '@/services/llm/continuation'
import {AI_ARTIFACT_TYPES, useAiHistoryStore} from '@/stores/aiHistoryStore'
import {useToast} from '@/composables/useToast'
import {useI18n} from '@/i18n'

/**
 * Diagnostic d'indexabilité par le LLM, en streaming, à partir des signaux
 * collectés par l'écran Ressources. Réutilise le fournisseur LLM configuré et
 * sait reprendre une réponse tronquée (« Continuer »).
 */
export function useIndexabilityDiagnosis() {
    const settings = useSettingsStore()
    const aiHistory = useAiHistoryStore()
    const toast = useToast()
    const {t} = useI18n()

    const diagnosing = ref(false)
    const diagnosis = ref('')
    const error = ref(null)
    const tokenCount = ref(0)
    const truncated = ref(false)

    // Fournisseur actif (pour annuler), dernier prompt (pour reprendre),
    // origine et id d'historique courants.
    let activeProvider = null
    let lastPrompt = ''
    let lastOrigin = ''
    let lastArtifactId = null

    async function persist() {
        if (!diagnosis.value.trim()) return
        try {
            const payload = {
                type: AI_ARTIFACT_TYPES.INDEXABILITY,
                title: `Indexabilité${lastOrigin ? ' — ' + lastOrigin : ''}`,
                url: lastOrigin,
                provider: settings.currentProvider,
                model: settings.currentModel,
                format: 'markdown',
                content: diagnosis.value,
                meta: {truncated: truncated.value}
            }
            if (lastArtifactId) await aiHistory.updateArtifact(lastArtifactId, {content: payload.content, meta: payload.meta})
            else lastArtifactId = await aiHistory.addArtifact(payload)
        } catch (e) {
            console.error('Failed to save diagnosis to history:', e)
        }
    }

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
            if (diagnosing.value) {
                error.value = `Erreur : ${e.message}`
                toast.fromError(t('toast.diagnosisFailed'), e)
            }
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
        lastArtifactId = null
        lastOrigin = state?.origin || ''
        lastPrompt = buildIndexabilityPrompt(buildIndexabilitySignals(state))
        await streamInto(lastPrompt)
        await persist()
    }

    /** Reprend une réponse tronquée là où elle s'est arrêtée. */
    async function continueDiagnosis() {
        if (!lastPrompt || !diagnosis.value || diagnosing.value) return
        diagnosis.value += '\n'
        await streamInto(buildContinuationPrompt(lastPrompt, diagnosis.value), {append: true})
        await persist()
    }

    function cancel() {
        diagnosing.value = false
        if (activeProvider) activeProvider.abort()
    }

    return {diagnosing, diagnosis, error, tokenCount, truncated, run, continueDiagnosis, cancel}
}

export default useIndexabilityDiagnosis
