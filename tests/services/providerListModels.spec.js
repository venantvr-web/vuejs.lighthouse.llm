import {afterEach, describe, expect, it, vi} from 'vitest'
import OpenAIProvider from '@/services/llm/OpenAIProvider'
import AnthropicProvider from '@/services/llm/AnthropicProvider'
import OllamaProvider from '@/services/llm/OllamaProvider'

function mockFetchOnce(payload) {
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, status: 200, json: async () => payload})))
}

describe('provider listModels', () => {
    afterEach(() => vi.restoreAllMocks())

    it('OpenAI keeps only chat models, sorted', async () => {
        mockFetchOnce({
            data: [
                {id: 'gpt-4o'},
                {id: 'gpt-4o-mini'},
                {id: 'text-embedding-3-small'},
                {id: 'o1-mini'},
                {id: 'dall-e-3'},
                {id: 'whisper-1'}
            ]
        })
        const models = await new OpenAIProvider({apiKey: 'k'}).listModels()
        const values = models.map(m => m.value)
        expect(values).toContain('gpt-4o')
        expect(values).toContain('o1-mini')
        expect(values).not.toContain('text-embedding-3-small')
        expect(values).not.toContain('dall-e-3')
        expect(values).not.toContain('whisper-1')
    })

    it('Anthropic maps id + display_name', async () => {
        mockFetchOnce({
            data: [
                {id: 'claude-3-5-sonnet-20241022', display_name: 'Claude 3.5 Sonnet'},
                {id: 'claude-3-5-haiku-20241022'}
            ]
        })
        const models = await new AnthropicProvider({apiKey: 'k'}).listModels()
        expect(models[0]).toEqual({value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet'})
        expect(models[1]).toEqual({value: 'claude-3-5-haiku-20241022', label: 'claude-3-5-haiku-20241022'})
    })

    it('Ollama maps installed model names', async () => {
        mockFetchOnce({models: [{name: 'llama3.2'}, {name: 'mistral'}]})
        const models = await new OllamaProvider({}).listModels()
        expect(models).toEqual([
            {value: 'llama3.2', label: 'llama3.2'},
            {value: 'mistral', label: 'mistral'}
        ])
    })
})
