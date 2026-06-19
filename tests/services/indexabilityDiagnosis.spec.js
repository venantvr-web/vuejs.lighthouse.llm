import {describe, expect, it} from 'vitest'
import {
    buildIndexabilityPrompt,
    buildIndexabilitySignals,
    detectInconsistencies,
    INDEXABILITY_SYSTEM,
    robotsBlocksAll
} from '@/services/indexabilityDiagnosis'

const signalsFrom = (state) => buildIndexabilitySignals(state)
const messages = (state) => detectInconsistencies(signalsFrom(state)).map((i) => i.message).join(' | ')

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
        expect(s.meta).toEqual({robots: '', googlebot: '', xRobotsTag: '', canonical: '', noindex: false})
    })

    it('captures indexing directives and flags noindex', () => {
        const s = buildIndexabilitySignals({
            pageMeta: {robots: 'index, follow', googlebot: '', canonical: 'https://example.com/', xRobotsTag: 'noindex'}
        })
        expect(s.meta.robots).toBe('index, follow')
        expect(s.meta.canonical).toBe('https://example.com/')
        expect(s.meta.xRobotsTag).toBe('noindex')
        expect(s.meta.noindex).toBe(true) // détecté via X-Robots-Tag
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
        expect(prompt).toContain('meta robots :')
        expect(prompt).toContain('X-Robots-Tag :')
        expect(prompt).toContain('lien canonical :')
        expect(prompt).toContain('Verdict')
        // déterministe : pas d'horodatage, deux appels identiques
        expect(buildIndexabilityPrompt(signals)).toBe(prompt)
    })

    it('exposes a French expert system prompt', () => {
        expect(INDEXABILITY_SYSTEM).toMatch(/expert/i)
        expect(INDEXABILITY_SYSTEM).toMatch(/GEO/)
    })

    it('asks for a per-element qualitative checklist and cross-checks', () => {
        const prompt = buildIndexabilityPrompt(buildIndexabilitySignals({origin: 'https://x.io'}))
        expect(prompt).toMatch(/analyse qualitative/i)
        expect(prompt).toContain('Contrôle élément par élément')
        expect(prompt).toContain('Incohérent')
    })
})

describe('detectInconsistencies', () => {
    it('flags a homepage in noindex as critical', () => {
        const issues = detectInconsistencies(signalsFrom({pageMeta: {robots: 'noindex'}}))
        expect(issues.some((i) => i.level === 'critique' && /noindex/i.test(i.message))).toBe(true)
    })

    it('flags meta-index vs X-Robots-Tag noindex contradiction', () => {
        expect(messages({pageMeta: {robots: 'index, follow', xRobotsTag: 'noindex'}})).toMatch(/X-Robots-Tag/)
    })

    it('flags a canonical on another domain', () => {
        expect(messages({origin: 'https://example.com', pageMeta: {canonical: 'https://autre.com/'}}))
            .toMatch(/autre domaine/)
    })

    it('flags a relative canonical', () => {
        expect(messages({origin: 'https://example.com', pageMeta: {canonical: '/page'}})).toMatch(/absolue/)
    })

    it('flags robots.txt blocking everything while a sitemap is published', () => {
        const state = {
            resources: [{key: 'robots', available: true, content: 'User-agent: *\nDisallow: /'}],
            sitemaps: [{url: 'https://x.com/sitemap.xml', available: true, count: 5, type: 'urlset'}]
        }
        expect(messages(state)).toMatch(/bloque tout/)
    })

    it('flags a sitemap declared in robots but unreachable', () => {
        const state = {
            resources: [{key: 'robots', available: true, content: 'Sitemap: https://x.com/sitemap.xml'}],
            sitemaps: [{url: 'https://x.com/sitemap.xml', available: false, status: 404}]
        }
        expect(messages(state)).toMatch(/inaccessible/)
    })

    it('returns nothing coherent when everything lines up', () => {
        const state = {
            origin: 'https://example.com',
            resources: [{key: 'robots', available: true, content: 'User-agent: *\nDisallow:\nSitemap: https://example.com/sitemap.xml'}],
            sitemaps: [{url: 'https://example.com/sitemap.xml', available: true, count: 10, type: 'urlset'}],
            jsonLd: {present: true, types: ['Organization'], issues: []},
            pageMeta: {robots: 'index, follow', canonical: 'https://example.com/'}
        }
        expect(detectInconsistencies(signalsFrom(state))).toEqual([])
    })
})
