import {describe, expect, it} from 'vitest'
import {
    buildIndexabilityPrompt,
    buildIndexabilitySignals,
    INDEXABILITY_SYSTEM,
    robotsBlocksAll
} from '@/services/indexabilityDiagnosis'

describe('robotsBlocksAll', () => {
    it('detects a global block on User-agent: *', () => {
        expect(robotsBlocksAll('User-agent: *\nDisallow: /')).toBe(true)
    })

    it('ignores a root disallow scoped to another agent', () => {
        expect(robotsBlocksAll('User-agent: BadBot\nDisallow: /\n\nUser-agent: *\nDisallow: /private')).toBe(false)
    })

    it('returns false for a permissive robots.txt', () => {
        expect(robotsBlocksAll('User-agent: *\nDisallow:\nSitemap: https://x.com/sitemap.xml')).toBe(false)
    })

    it('ignores comments and is case-insensitive on fields', () => {
        expect(robotsBlocksAll('# rule\nUSER-AGENT: *\nDISALLOW: /')).toBe(true)
    })

    it('handles empty input', () => {
        expect(robotsBlocksAll('')).toBe(false)
        expect(robotsBlocksAll()).toBe(false)
    })
})

describe('buildIndexabilitySignals', () => {
    const state = {
        origin: 'https://example.com',
        resources: [
            {key: 'robots', available: true, status: 200, content: 'User-agent: *\nDisallow:\nSitemap: https://example.com/sitemap.xml'},
            {key: 'llms', available: true, status: 200, content: ''},
            {key: 'llms_full', available: false, status: 404, content: ''}
        ],
        sitemaps: [
            {url: 'https://example.com/sitemap.xml', available: true, status: 200, type: 'urlset', count: 12},
            {url: 'https://example.com/missing.xml', available: false, status: 404, type: 'unknown', count: 0}
        ],
        jsonLd: {present: true, types: ['Organization'], issues: []},
        readiness: {score: 80, signals: []},
        brokenPages: [{url: 'https://example.com/gone', status: 404}]
    }

    it('summarizes resources, sitemaps and AI files', () => {
        const s = buildIndexabilitySignals(state)
        expect(s.origin).toBe('https://example.com')
        expect(s.robots.present).toBe(true)
        expect(s.robots.blocksAll).toBe(false)
        expect(s.robots.sitemapsDeclared).toContain('https://example.com/sitemap.xml')
        expect(s.totalSitemapUrls).toBe(12)
        expect(s.llms.present).toBe(true)
        expect(s.llmsFull.present).toBe(false)
        expect(s.jsonLd.present).toBe(true)
        expect(s.readiness.score).toBe(80)
        expect(s.brokenPages.count).toBe(1)
    })

    it('is robust to empty/missing input', () => {
        const s = buildIndexabilitySignals({})
        expect(s.robots.present).toBe(false)
        expect(s.totalSitemapUrls).toBe(0)
        expect(s.brokenPages.count).toBe(0)
        expect(s.readiness.score).toBeNull()
    })
})

describe('buildIndexabilityPrompt', () => {
    it('is deterministic and includes the key signals', () => {
        const signals = buildIndexabilitySignals({
            origin: 'https://acme.io',
            resources: [{key: 'robots', available: true, status: 200, content: 'User-agent: *\nDisallow: /'}],
            sitemaps: [],
            jsonLd: {present: false, types: [], issues: []},
            readiness: {score: 30, signals: []},
            brokenPages: []
        })
        const prompt = buildIndexabilityPrompt(signals)
        expect(prompt).toContain('https://acme.io')
        expect(prompt).toContain('robots.txt : présent')
        expect(prompt).toContain('OUI') // blocage global détecté
        expect(prompt).toContain('GEO-readiness interne : 30/100')
        expect(prompt).toContain('Verdict')
        // déterministe : pas d'horodatage, deux appels identiques
        expect(buildIndexabilityPrompt(signals)).toBe(prompt)
    })

    it('exposes a French expert system prompt', () => {
        expect(INDEXABILITY_SYSTEM).toMatch(/expert/i)
        expect(INDEXABILITY_SYSTEM).toMatch(/GEO/)
    })
})
