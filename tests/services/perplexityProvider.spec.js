import {afterEach, describe, expect, it, vi} from 'vitest'
import PerplexityProvider from '@/services/llm/PerplexityProvider'
import {extractSources} from '@/composables/useGeoTracking'

describe('PerplexityProvider', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('targets the Perplexity endpoint and defaults to the sonar model', () => {
        const provider = new PerplexityProvider({apiKey: 'pplx-x'})
        expect(provider.baseURL).toBe('https://api.perplexity.ai')
        expect(provider.getDefaultModel()).toBe('sonar')
    })

    it('appends search_results URLs as a Sources section', () => {
        const provider = new PerplexityProvider({apiKey: 'pplx-x'})
        const data = {
            choices: [{message: {content: 'Réponse.'}, finish_reason: 'stop'}],
            search_results: [
                {title: 'Acme', url: 'https://acme.com/page'},
                {title: 'Wikipedia', url: 'https://fr.wikipedia.org/wiki/X'}
            ]
        }
        const out = provider._extractContent(data)
        expect(out).toContain('Réponse.')
        expect(out).toContain('**Sources**')
        expect(out).toContain('[Acme](https://acme.com/page)')
        // The cited URLs must be discoverable by the deterministic source analysis
        const hosts = extractSources(out).map(s => s.host)
        expect(hosts).toContain('acme.com')
        expect(hosts).toContain('fr.wikipedia.org')
    })

    it('supports the legacy citations array and de-duplicates URLs', () => {
        const provider = new PerplexityProvider({apiKey: 'pplx-x'})
        const data = {
            choices: [{message: {content: 'Texte.'}, finish_reason: 'stop'}],
            search_results: [{title: 'A', url: 'https://a.com/'}],
            citations: ['https://a.com/', 'https://b.com/']
        }
        const out = provider._extractContent(data)
        expect(out).toContain('https://b.com/')
        // a.com appears once despite being in both arrays
        expect(out.match(/a\.com/g)?.length).toBe(1)
    })

    it('returns the plain answer when there are no citations', () => {
        const provider = new PerplexityProvider({apiKey: 'pplx-x'})
        const data = {choices: [{message: {content: 'Sans source.'}, finish_reason: 'stop'}]}
        expect(provider._extractContent(data)).toBe('Sans source.')
    })

    it('send() merges citations into the returned text', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true,
            json: async () => ({
                choices: [{message: {content: 'Hello'}, finish_reason: 'stop'}],
                citations: ['https://example.com/doc']
            })
        })))
        const provider = new PerplexityProvider({apiKey: 'pplx-x', model: 'sonar'})
        const answer = await provider.send('q')
        expect(answer).toContain('Hello')
        expect(answer).toContain('https://example.com/doc')
    })
})
