import {ref, watch} from 'vue'
import {useSettingsStore} from '@/stores/settingsStore'
import {buildLLMProvider} from '@/services/llm/buildProvider'
import {buildContinuationPrompt, consolidateContinuation, trimToLastCompleteLine} from '@/services/llm/continuation'
import {AI_ARTIFACT_TYPES, useAiHistoryStore} from '@/stores/aiHistoryStore'
import {fetchResource, originFromUrl} from '@/services/resourceCheck'
import {fetchSiteSnapshot} from '@/services/llmSnapshot'
import {buildLlmsTxtPrompt, extractMainText, LLMS_FULL_SYSTEM, LLMS_TXT_SYSTEM, stripCodeFence} from '@/services/llmsTxt'
import {useScopedPersistentRef} from '@/composables/useScopedPersistentRef'
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

    // Analyse du domaine — mémorisée pour restaurer l'écran au rechargement
    const analyzing = ref(false)
    const analyzeError = ref(null)
    const context = useScopedPersistentRef('llmStudio.context', null)
    // Fichiers actuellement publiés (veille)
    const liveLlms = useScopedPersistentRef('llmStudio.liveLlms', null)      // { present, content }
    const liveLlmsFull = useScopedPersistentRef('llmStudio.liveLlmsFull', null)

    // Génération (la sortie en cours est affichée en direct ; sa version finale
    // est mémorisée pour réapparaître au rechargement — sans réécrire à chaque jeton)
    const generating = ref(false)
    const output = ref('')
    const outputKind = ref('llms')  // 'llms' | 'full'
    const savedOutput = useScopedPersistentRef('llmStudio.lastOutput', '')
    const savedKind = useScopedPersistentRef('llmStudio.lastOutputKind', 'llms')
    const genError = ref(null)
    const tokenCount = ref(0)
    const truncated = ref(false)

    // Restaure la dernière sortie générée à l'ouverture
    if (savedOutput.value && !output.value) {
        output.value = savedOutput.value
        outputKind.value = savedKind.value
    }

    // Au changement de marque/domaine, savedOutput (scopé) est rechargé : on
    // resynchronise l'affichage en cours sur la sortie du nouveau contexte.
    watch(savedOutput, (val) => {
        if (generating.value) return
        output.value = val || ''
        outputKind.value = savedKind.value || 'llms'
    })

    let activeProvider = null
    let lastPrompt = ''
    let lastSystem = LLMS_TXT_SYSTEM
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
            const snap = await fetchSiteSnapshot(origin)
            context.value = snap.context
            liveLlms.value = snap.liveLlms
            liveLlmsFull.value = snap.liveLlmsFull
        } catch (e) {
            analyzeError.value = e.message === 'home-unreachable'
                ? t('llmStudio.errorFetchHome')
                : (e.message || t('llmStudio.errorAnalyze'))
        } finally {
            analyzing.value = false
            doneProgress()
        }
    }

    async function persist(kind) {
        if (!output.value.trim() || !context.value) return
        // Mémorise la version finale pour la restaurer au rechargement
        savedOutput.value = output.value
        savedKind.value = kind
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

    async function streamInto(prompt, {append = false, system = LLMS_TXT_SYSTEM} = {}) {
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
            for await (const chunk of activeProvider.stream(prompt, {systemMessage: system})) {
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
     * Récupère le contenu réel de la page d'accueil + des pages de la navigation
     * d'en-tête (corpus pour llms-full.txt). Dédupliqué et borné en nombre.
     * @param {object} ctx - contexte du domaine
     * @param {number} max
     * @returns {Promise<Array<{url: string, title: string, text: string}>>}
     */
    async function fetchHeaderPages(ctx, max = 12) {
        // Accueil en tête, puis les liens d'en-tête, sans doublon (slash final ignoré)
        const candidates = [{url: ctx.origin, title: ctx.title || 'Accueil'}, ...(ctx.headerLinks || [])]
        const seen = new Set()
        const links = []
        for (const l of candidates) {
            const key = (l.url || '').replace(/\/$/, '')
            if (!key || seen.has(key)) continue
            seen.add(key)
            links.push(l)
            if (links.length >= max) break
        }
        const results = await Promise.all(links.map(async (l) => {
            try {
                const res = await fetchResource(l.url)
                if (!res.available) return null
                const text = extractMainText(res.content)
                return text ? {url: l.url, title: l.text, text} : null
            } catch {
                return null
            }
        }))
        return results.filter(Boolean)
    }

    /**
     * Génère le fichier demandé.
     * @param {{full?: boolean, keywords?: string, concepts?: object}} options
     */
    async function generate({full = false, keywords = '', concepts = {}} = {}) {
        if (!context.value) return
        lastArtifactId = null
        outputKind.value = full ? 'full' : 'llms'
        // Pour llms-full.txt : on récupère le contenu réel des pages du header
        // (les plus utiles) pour bâtir un vrai corpus.
        const pages = full ? await fetchHeaderPages(context.value) : []
        lastPrompt = buildLlmsTxtPrompt(context.value, {full, keywords, pages, concepts})
        lastSystem = full ? LLMS_FULL_SYSTEM : LLMS_TXT_SYSTEM
        await streamInto(lastPrompt, {system: lastSystem})
        // Filet de sécurité : retire un éventuel bloc de code englobant
        if (!generating.value) output.value = stripCodeFence(output.value)
        await persist(outputKind.value)
    }

    /**
     * Reprend une réponse tronquée. On repart de la dernière ligne complète
     * (la ligne coupée, parfois en plein milieu d'une URL, est régénérée), on
     * mémorise le point de jointure, puis on consolide la couture une fois la
     * génération terminée — pour ne jamais casser le Markdown.
     */
    async function continueGeneration() {
        if (!lastPrompt || !output.value || generating.value) return
        const head = trimToLastCompleteLine(output.value)
        const boundary = head.length  // marqueur de reprise
        output.value = head
        await streamInto(buildContinuationPrompt(lastPrompt, head), {append: true, system: lastSystem})
        if (!generating.value) {
            output.value = consolidateContinuation(output.value, boundary)
            output.value = stripCodeFence(output.value)
        }
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
