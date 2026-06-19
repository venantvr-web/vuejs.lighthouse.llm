import {describe, expect, it} from 'vitest'
import {buildContinuationPrompt} from '@/services/llm/continuation'
import GeminiProvider from '@/services/llm/GeminiProvider'

describe('buildContinuationPrompt', () => {
    it('includes the original prompt and asks to continue without repeating', () => {
        const out = buildContinuationPrompt('Analyse ce site.', 'Voici le début de la réponse…')
        expect(out).toContain('Analyse ce site.')
        expect(out).toContain('Voici le début de la réponse…')
        expect(out).toMatch(/Reprends exactement/)
        expect(out).toMatch(/[Nn]e répète pas/)
    })

    it('keeps only the tail of a very long partial response', () => {
        const longPartial = 'x'.repeat(20000) + 'FIN_DU_TEXTE'
        const out = buildContinuationPrompt('Demande', longPartial)
        expect(out).toContain('FIN_DU_TEXTE') // la fin est conservée
        expect(out.length).toBeLessThan(longPartial.length) // le début est tronqué
    })

    it('tolerates an empty partial', () => {
        expect(() => buildContinuationPrompt('Demande', '')).not.toThrow()
    })
})

describe('provider truncation flag', () => {
    it('Gemini marks the response as truncated on MAX_TOKENS', () => {
        const p = new GeminiProvider({apiKey: 'k', model: 'gemini-2.5-flash'})
        p.lastResponseTruncated = false
        p._extractContent({candidates: [{finishReason: 'MAX_TOKENS', content: {parts: [{text: 'partiel'}]}}]})
        expect(p.lastResponseTruncated).toBe(true)
    })

    it('Gemini does not mark a normal completion as truncated', () => {
        const p = new GeminiProvider({apiKey: 'k', model: 'gemini-2.5-flash'})
        p.lastResponseTruncated = false
        p._extractContent({candidates: [{finishReason: 'STOP', content: {parts: [{text: 'complet'}]}}]})
        expect(p.lastResponseTruncated).toBe(false)
    })
})
