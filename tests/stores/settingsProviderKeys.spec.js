import {beforeEach, describe, expect, it} from 'vitest'
import {createPinia, setActivePinia} from 'pinia'
import {useSettingsStore} from '@/stores/settingsStore'

describe('settingsStore - multi-provider keys', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        localStorage.clear()
    })

    it('reports provider readiness based on keys', () => {
        const store = useSettingsStore()
        const openai = store.geoProviders.find(p => p.id === 'openai')
        expect(openai.ready).toBe(false)

        store.setProviderKey('openai', 'sk-test')
        const after = store.geoProviders.find(p => p.id === 'openai')
        expect(after.ready).toBe(true)
        expect(after.model).toBeTruthy()
    })

    it('marks ollama ready from base url + model, without a key', () => {
        const store = useSettingsStore()
        store.setOllamaBaseUrl('http://localhost:11434')
        store.setOllamaModel('llama3.2')
        const ollama = store.geoProviders.find(p => p.id === 'ollama')
        expect(ollama.ready).toBe(true)
    })

    it('persists provider keys across reloads', () => {
        const store = useSettingsStore()
        store.setProviderKey('gemini', 'g-key')

        setActivePinia(createPinia())
        const reloaded = useSettingsStore()
        expect(reloaded.providerKeys.gemini).toBe('g-key')
    })

    it('stores and persists the PageSpeed API key', () => {
        const store = useSettingsStore()
        expect(store.pageSpeedApiKey).toBe('')
        store.setPageSpeedApiKey('  AIza-test  ')
        expect(store.pageSpeedApiKey).toBe('AIza-test')

        setActivePinia(createPinia())
        const reloaded = useSettingsStore()
        expect(reloaded.pageSpeedApiKey).toBe('AIza-test')
    })

    it('seeds the provider key from the legacy single key on load', () => {
        // Simulate a legacy settings blob with only the single apiKey set
        localStorage.setItem('lighthouse-settings', JSON.stringify({
            llmProvider: 'openai',
            apiKey: 'sk-legacy'
        }))
        const store = useSettingsStore()
        expect(store.providerKeys.openai).toBe('sk-legacy')
        expect(store.geoProviders.find(p => p.id === 'openai').ready).toBe(true)
    })

    it('supports gemini as a provider', () => {
        const store = useSettingsStore()
        store.setLLMProvider('gemini')
        expect(store.llmProvider).toBe('gemini')
        expect(store.currentModel).toBe('gemini-2.5-flash')
        expect(store.modelOptions.length).toBeGreaterThan(0)
    })

    it('migrates the legacy llm-settings storage into the store', () => {
        localStorage.setItem('llm-settings', JSON.stringify({
            provider: 'gemini',
            apiKey: 'AIza-legacy',
            model: 'gemini-1.5-pro',
            ollamaUrl: 'http://localhost:11434'
        }))
        const store = useSettingsStore()
        expect(store.llmProvider).toBe('gemini')
        expect(store.llmModel).toBe('gemini-1.5-pro')
        expect(store.apiKey).toBe('AIza-legacy')
        expect(store.providerKeys.gemini).toBe('AIza-legacy')
        expect(store.isConfigured).toBe(true)
    })

    it('treats a provider key alone as configured', () => {
        const store = useSettingsStore()
        store.setLLMProvider('openai')
        store.setProviderKey('openai', 'sk-only-in-providerkeys')
        expect(store.isConfigured).toBe(true)
    })

    it('exposes Perplexity as a GEO provider gated by its key', () => {
        const store = useSettingsStore()
        const before = store.geoProviders.find(p => p.id === 'perplexity')
        expect(before).toBeTruthy()
        expect(before.ready).toBe(false)
        expect(before.model).toBe('sonar')

        store.setProviderKey('perplexity', 'pplx-test')
        expect(store.geoProviders.find(p => p.id === 'perplexity').ready).toBe(true)
    })

    it('supports perplexity as a selectable provider with model options', () => {
        const store = useSettingsStore()
        store.setLLMProvider('perplexity')
        expect(store.llmProvider).toBe('perplexity')
        expect(store.currentModel).toBe('sonar')
        expect(store.modelOptions.some(m => m.value === 'sonar')).toBe(true)
    })
})
