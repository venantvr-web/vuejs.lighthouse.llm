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
})
