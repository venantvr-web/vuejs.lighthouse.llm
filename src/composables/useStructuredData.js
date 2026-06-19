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

/**
 * Analyse les données structurées des pages crawlées et génère, via le LLM, le
 * JSON-LD manquant ou incomplet. Réutilise le proxy local (fetchResource) et le
 * fournisseur LLM configuré.
 */
export function useStructuredData() {
    const settings = useSettingsStore()

    // État par URL : { status, context, loading, error, generating, generated, genError }
    const byUrl = reactive({})
    const analyzing = ref(false)

    function entry(url) {
        if (!byUrl[url]) {
            byUrl[url] = {status: null, context: null, loading: false, error: null, generating: false, generated: '', genError: null}
        }
        return byUrl[url]
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
            }
        } catch (err) {
            e.genError = `Erreur : ${err.message}`
        } finally {
            e.generating = false
        }
    }

    return {byUrl, analyzing, entry, analyzeUrl, analyzeAll, generate}
}

export default useStructuredData
