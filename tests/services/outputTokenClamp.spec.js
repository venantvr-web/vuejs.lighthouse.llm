import {describe, expect, it} from 'vitest'
import OpenAIProvider from '@/services/llm/OpenAIProvider'
import AnthropicProvider from '@/services/llm/AnthropicProvider'

// Vérifie que le plafond de tokens de sortie est borné par fournisseur, pour
// éviter les réponses tronquées (valeur trop basse) comme les erreurs API
// (valeur au-delà du maximum du modèle).
describe('output token clamping', () => {
    it('OpenAI caps max_tokens at 16384 but lets lower values through', () => {
        const p = new OpenAIProvider({apiKey: 'k', model: 'gpt-4o'})
        expect(p._buildPayload('hi', {model: 'gpt-4o', maxTokens: 99999, temperature: 0.5}).max_tokens).toBe(16384)
        expect(p._buildPayload('hi', {model: 'gpt-4o', maxTokens: 4000, temperature: 0.5}).max_tokens).toBe(4000)
    })

    it('Anthropic caps max_tokens at 8192 but lets lower values through', () => {
        const p = new AnthropicProvider({apiKey: 'k', model: 'claude-3-5-sonnet-20241022'})
        expect(p._buildPayload('hi', {model: 'claude-3-5-sonnet-20241022', maxTokens: 16384, temperature: 0.5}).max_tokens).toBe(8192)
        expect(p._buildPayload('hi', {model: 'claude-3-5-sonnet-20241022', maxTokens: 2000, temperature: 0.5}).max_tokens).toBe(2000)
    })
})
