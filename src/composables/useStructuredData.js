import {reactive, ref} from 'vue'
import {useSettingsStore} from '@/stores/settingsStore'
import {buildLLMProvider} from '@/services/llm/buildProvider'
import {fetchResource} from '@/services/resourceCheck'
import {
    analyzeStructuredData,
    buildStructuredDataPrompt,
    extractPageContext,
    parseStructuredData,
    STRUCTURED_DATA_SYSTEM
} from '@/services/structuredDataGen'
import {AI_ARTIFACT_TYPES, useAiHistoryStore} from '@/stores/aiHistoryStore'
import {useToast} from '@/composables/useToast'
import {useNotifications} from '@/composables/useNotifications'
import {doneProgress, startProgress} from '@/composables/useProgress'
import {useI18n} from '@/i18n'

/**
 * Analyse les données structurées des pages crawlées et génère, via le LLM, le
 * JSON-LD manquant ou incomplet. Réutilise le proxy local (fetchResource) et le
 * fournisseur LLM configuré.
 */
export function useStructuredData() {
    const settings = useSettingsStore()
    const aiHistory = useAiHistoryStore()
    const toast = useToast()
    const {notifyDone} = useNotifications()
    const {t} = useI18n()

    // État par URL : { status, context, loading, error, generating, generated, genError, fromHistory }
    const byUrl = reactive({})
    const analyzing = ref(false)
    // Progression de la génération en lot
    const batch = reactive({running: false, done: 0, total: 0})

    function entry(url) {
        if (!byUrl[url]) {
            byUrl[url] = {status: null, context: null, loading: false, error: null, generating: false, generated: '', genError: null, fromHistory: false}
        }
        return byUrl[url]
    }

    /**
     * Pré-remplit le JSON-LD déjà généré pour ces URL depuis l'historique IA,
     * afin d'éviter de rappeler le LLM (et de payer) à chaque réouverture.
     * @param {string[]} urls
     */
    async function hydrateFromHistory(urls) {
        try {
            const all = await aiHistory.getAll()
            const wanted = new Set(urls)
            // getAll() est trié du plus récent au plus ancien : on garde le 1er vu
            for (const a of all) {
                if (a.type !== AI_ARTIFACT_TYPES.STRUCTURED_DATA || !wanted.has(a.url)) continue
                const e = entry(a.url)
                if (!e.generated) {
                    e.generated = a.content
                    e.fromHistory = true
                }
            }
        } catch (err) {
            console.error('Failed to hydrate JSON-LD from history:', err)
        }
    }

    /**
     * Analyse une URL : récupère le HTML via le proxy et détecte le JSON-LD.
     * @param {string} url
     */
    async function analyzeUrl(url) {
        const e = entry(url)
        e.loading = true
        e.error = null
        try {
            const res = await fetchResource(url)
            if (!res.available) {
                e.error = `Page inaccessible (${res.status || 'erreur'}).`
                return
            }
            e.context = extractPageContext(res.content)
            e.status = analyzeStructuredData(res.content)
        } catch (err) {
            e.error = err.message || 'Échec de l\'analyse.'
        } finally {
            e.loading = false
        }
    }

    /**
     * Analyse séquentiellement une liste d'URL (évite de saturer le proxy).
     * @param {string[]} urls
     */
    async function analyzeAll(urls) {
        analyzing.value = true
        try {
            for (const url of urls) {
                if (!byUrl[url]?.status) await analyzeUrl(url)
            }
        } finally {
            analyzing.value = false
        }
    }

    /**
     * Génère le JSON-LD pour une URL (analyse d'abord si nécessaire).
     * @param {string} url
     */
    async function generate(url) {
        if (!settings.isConfigured) {
            entry(url).genError = 'Configurez un fournisseur LLM dans les paramètres.'
            return
        }
        const e = entry(url)
        if (!e.status) await analyzeUrl(url)
        if (!e.status) return

        e.generating = true
        e.genError = null
        e.generated = ''
        try {
            const prompt = buildStructuredDataPrompt({
                url,
                context: e.context || {},
                types: e.status.types,
                issues: e.status.issues
            })
            const provider = buildLLMProvider(settings, settings.currentProvider, settings.currentModel)
            const response = await provider.send(prompt, {systemMessage: STRUCTURED_DATA_SYSTEM})
            const {pretty, error} = parseStructuredData(response)
            if (error) {
                e.genError = error
            } else {
                e.generated = pretty
                try {
                    await aiHistory.addArtifact({
                        type: AI_ARTIFACT_TYPES.STRUCTURED_DATA,
                        title: `JSON-LD — ${url}`,
                        url,
                        provider: settings.currentProvider,
                        model: settings.currentModel,
                        format: 'jsonld',
                        content: pretty,
                        meta: {existingTypes: e.status.types}
                    })
                } catch (err) {
                    console.error('Failed to save JSON-LD to history:', err)
                }
            }
        } catch (err) {
            e.genError = `Erreur : ${err.message}`
            toast.fromError(t('toast.jsonLdFailed'), err)
        } finally {
            e.generating = false
        }
    }

    /**
     * Génère, en lot et séquentiellement, le JSON-LD des pages où il manque (ou
     * est incomplet), en sautant celles déjà générées ou réhydratées.
     * @param {string[]} urls
     */
    async function generateAllMissing(urls) {
        if (!settings.isConfigured || batch.running) return
        await analyzeAll(urls)
        const targets = urls.filter((u) => byUrl[u]?.status?.needsGeneration && !byUrl[u]?.generated)
        if (!targets.length) return

        batch.running = true
        batch.done = 0
        batch.total = targets.length
        startProgress()
        try {
            for (const url of targets) {
                await generate(url)
                batch.done++
            }
            const ok = targets.filter((u) => byUrl[u]?.generated).length
            if (ok > 0) {
                toast.success(t('toast.jsonLdDone', {count: ok}))
                notifyDone(t('toast.jsonLdDone', {count: ok}))
            }
        } finally {
            batch.running = false
            doneProgress()
        }
    }

    return {byUrl, analyzing, batch, entry, analyzeUrl, analyzeAll, generate, generateAllMissing, hydrateFromHistory}
}

export default useStructuredData
