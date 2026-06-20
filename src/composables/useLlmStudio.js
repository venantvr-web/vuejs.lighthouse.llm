import {ref} from 'vue'
import {useSettingsStore} from '@/stores/settingsStore'
import {buildLLMProvider} from '@/services/llm/buildProvider'
import {buildContinuationPrompt} from '@/services/llm/continuation'
import {AI_ARTIFACT_TYPES, useAiHistoryStore} from '@/stores/aiHistoryStore'
import {fetchResource, originFromUrl} from '@/services/resourceCheck'
import {discoverBySitemap} from '@/services/urlDiscovery'
import {buildLlmsTxtPrompt, buildSiteContext, LLMS_TXT_SYSTEM} from '@/services/llmsTxt'
import {useToast} from '@/composables/useToast'
import {doneProgress, startProgress} from '@/composables/useProgress'
import {useI18n} from '@/i18n'

/**
 * Studio LLM : analyse un domaine (page d'accueil + sitemap), génère un
 * llms.txt / llms-full.txt par IA (en streaming) et vérifie l'état des fichiers
 * publiés en ligne pour la veille. Réutilise le fournisseur LLM configuré.
 */
export function useLlmStudio() {
    const settings = useSettingsStore()
    const aiHistory = useAiHistoryStore()
    const toast = useToast()
    const {t} = useI18n()

    // Analyse du domaine
    const analyzing = ref(false)
    const analyzeError = ref(null)
    const context = ref(null)
    // Fichiers actuellement publiés (veille)
    const liveLlms = ref(null)      // { present, content }
    const liveLlmsFull = ref(null)

    // Génération
    const generating = ref(false)
    const output = ref('')
    const outputKind = ref('llms')  // 'llms' | 'full'
    const genError = ref(null)
    const tokenCount = ref(0)
    const truncated = ref(false)

    let activeProvider = null
    let lastPrompt = ''
    let lastArtifactId = null

    /**
     * Analyse le domaine : récupère la page d'accueil, le sitemap et les
     * fichiers llms.txt / llms-full.txt déjà publiés.
     * @param {string} url
     */
    async function analyze(url) {
        const origin = originFromUrl(url)
        if (!origin) {
            analyzeError.value = t('llmStudio.errorInvalidUrl')
            return
        }
        analyzing.value = true
        analyzeError.value = null
        context.value = null
        liveLlms.value = null
        liveLlmsFull.value = null
        startProgress()

        try {
            const base = origin.replace(/\/$/, '')
            const [home, sitemapUrls, llms, llmsFull] = await Promise.all([
                fetchResource(origin),
                discoverBySitemap(origin, {maxPages: 2000}).catch(() => []),
                fetchResource(`${base}/llms.txt`),
                fetchResource(`${base}/llms-full.txt`)
            ])

            if (!home.available) {
                analyzeError.value = t('llmStudio.errorFetchHome')
                return
            }

            context.value = buildSiteContext({origin, html: home.content, sitemapUrls})
            liveLlms.value = {present: llms.available, content: llms.available ? llms.content : ''}
            liveLlmsFull.value = {present: llmsFull.available, content: llmsFull.available ? llmsFull.content : ''}
        } catch (e) {
            analyzeError.value = e.message || t('llmStudio.errorAnalyze')
        } finally {
            analyzing.value = false
            doneProgress()
        }
    }

    async function persist(kind) {
        if (!output.value.trim() || !context.value) return
        const isFull = kind === 'full'
        try {
            const payload = {
                type: isFull ? AI_ARTIFACT_TYPES.LLMS_FULL : AI_ARTIFACT_TYPES.LLMS_TXT,
                title: `${isFull ? 'llms-full.txt' : 'llms.txt'} — ${context.value.origin}`,
                url: context.value.origin,
                provider: settings.currentProvider,
                model: settings.currentModel,
                format: 'markdown',
                content: output.value,
                meta: {truncated: truncated.value, kind}
            }
            if (lastArtifactId) await aiHistory.updateArtifact(lastArtifactId, {content: payload.content, meta: payload.meta})
            else lastArtifactId = await aiHistory.addArtifact(payload)
        } catch (e) {
            console.error('Failed to save llms.txt to history:', e)
        }
    }

    async function streamInto(prompt, {append = false} = {}) {
        if (!settings.isConfigured) {
            genError.value = t('llmStudio.errorNoProvider')
            return
        }
        genError.value = null
        truncated.value = false
        generating.value = true
        startProgress()
        if (!append) {
            output.value = ''
            tokenCount.value = 0
        }

        try {
            activeProvider = buildLLMProvider(settings, settings.currentProvider, settings.currentModel)
            for await (const chunk of activeProvider.stream(prompt, {systemMessage: LLMS_TXT_SYSTEM})) {
                if (!generating.value) break // annulé
                output.value += chunk
                tokenCount.value += chunk.split(/\s+/).filter(Boolean).length
            }
            truncated.value = !!activeProvider?.lastResponseTruncated
        } catch (e) {
            if (generating.value) {
                genError.value = `Erreur : ${e.message}`
                toast.fromError(t('llmStudio.errorGenerate'), e)
            }
        } finally {
            generating.value = false
            doneProgress()
            activeProvider = null
        }
    }

    /**
     * Génère le fichier demandé.
     * @param {{full?: boolean, keywords?: string}} options
     */
    async function generate({full = false, keywords = ''} = {}) {
        if (!context.value) return
        lastArtifactId = null
        outputKind.value = full ? 'full' : 'llms'
        lastPrompt = buildLlmsTxtPrompt(context.value, {full, keywords})
        await streamInto(lastPrompt)
        await persist(outputKind.value)
    }

    /** Reprend une réponse tronquée. */
    async function continueGeneration() {
        if (!lastPrompt || !output.value || generating.value) return
        output.value += '\n'
        await streamInto(buildContinuationPrompt(lastPrompt, output.value), {append: true})
        await persist(outputKind.value)
    }

    function cancel() {
        generating.value = false
        if (activeProvider) activeProvider.abort()
    }

    return {
        // analyse
        analyzing, analyzeError, context, liveLlms, liveLlmsFull, analyze,
        // génération
        generating, output, outputKind, genError, tokenCount, truncated,
        generate, continueGeneration, cancel
    }
}

export default useLlmStudio
