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

    it('disables thinking on 2.5 Flash so output is not truncated', () => {
        const provider = new GeminiProvider({apiKey: 'k', model: 'gemini-2.5-flash'})
        const payload = provider._buildPayload('hello', {model: 'gemini-2.5-flash', maxTokens: 100, temperature: 0.7})
        expect(payload.generationConfig.thinkingConfig).toEqual({thinkingBudget: 0})
    })

    it('does not set thinkingConfig on 2.5 Pro (cannot be disabled)', () => {
        const provider = new GeminiProvider({apiKey: 'k', model: 'gemini-2.5-pro'})
        const payload = provider._buildPayload('hello', {model: 'gemini-2.5-pro', maxTokens: 100, temperature: 0.7})
        expect(payload.generationConfig.thinkingConfig).toBeUndefined()
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
