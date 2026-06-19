import {afterEach, describe, expect, it, vi} from 'vitest'
import GeminiProvider from '@/services/llm/GeminiProvider'

describe('GeminiProvider.listModels', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('keeps only generateContent models and strips the models/ prefix', async () => {
        const payload = {
            models: [
                {name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportedGenerationMethods: ['generateContent']},
                {name: 'models/gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', supportedGenerationMethods: ['generateContent', 'countTokens']},
                {name: 'models/embedding-001', displayName: 'Embedding', supportedGenerationMethods: ['embedContent']}
            ]
        }
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true,
            json: async () => payload
        })))

        const provider = new GeminiProvider({apiKey: 'k', model: 'gemini-2.5-flash'})
        const models = await provider.listModels()

        expect(models).toEqual([
            {value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash'},
            {value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro'}
        ])
    })

    it('defaults to a current model', () => {
        const provider = new GeminiProvider({apiKey: 'k'})
        expect(provider.getDefaultModel()).toBe('gemini-2.5-flash')
    })

    it('disables thinking on 2.5 Flash and Flash-Lite so output is not truncated', () => {
        const provider = new GeminiProvider({apiKey: 'k', model: 'gemini-2.5-flash'})
        expect(provider._buildPayload('hi', {model: 'gemini-2.5-flash', maxTokens: 100, temperature: 0.7})
            .generationConfig.thinkingConfig).toEqual({thinkingBudget: 0})
        expect(provider._buildPayload('hi', {model: 'gemini-2.5-flash-lite', maxTokens: 100, temperature: 0.7})
            .generationConfig.thinkingConfig).toEqual({thinkingBudget: 0})
    })

    it('bounds (not disables) thinking on 2.5 Pro to keep room for the answer', () => {
        const provider = new GeminiProvider({apiKey: 'k', model: 'gemini-2.5-pro'})
        const payload = provider._buildPayload('hello', {model: 'gemini-2.5-pro', maxTokens: 100, temperature: 0.7})
        expect(payload.generationConfig.thinkingConfig).toEqual({thinkingBudget: 1024})
    })

    it('does not set thinkingConfig on 2.0 Flash (unsupported) and caps maxOutputTokens', () => {
        const provider = new GeminiProvider({apiKey: 'k', model: 'gemini-2.0-flash'})
        const payload = provider._buildPayload('hello', {model: 'gemini-2.0-flash', maxTokens: 99999, temperature: 0.7})
        expect(payload.generationConfig.thinkingConfig).toBeUndefined()
        expect(payload.generationConfig.maxOutputTokens).toBe(32768)
    })

    it('excludes internal thought parts from extracted content', () => {
        const provider = new GeminiProvider({apiKey: 'k'})
        const data = {
            candidates: [{
                content: {
                    parts: [
                        {text: 'réflexion interne', thought: true},
                        {text: 'Réponse visible'}
                    ]
                }
            }]
        }
        expect(provider._extractContent(data)).toBe('Réponse visible')
    })
})
