import {describe, expect, it} from 'vitest'
import {
    computeGeoReadiness,
    detectResourceChanges,
    extractCanonical,
    extractIndexingMeta,
    extractJsonLd,
    extractMetaContent,
    extractSitemapLocs,
    jsonLdTypes,
    originFromUrl,
    parseSitemapsFromRobots,
    parseSitemapUrls,
    standardResources,
    validateJsonLd
} from '@/services/resourceCheck'

describe('services/resourceCheck - pure helpers', () => {
    describe('originFromUrl', () => {
        it('adds https and returns the origin', () => {
            expect(originFromUrl('example.com/path')).toBe('https://example.com')
        })

        it('returns empty for invalid input', () => {
            expect(originFromUrl('   ')).toBe('')
        })
    })

    describe('standardResources', () => {
        it('builds the standard resource URLs for an origin', () => {
            const list = standardResources('https://example.com')
            const byKey = Object.fromEntries(list.map(r => [r.key, r.url]))
            expect(byKey.robots).toBe('https://example.com/robots.txt')
            expect(byKey.llms).toBe('https://example.com/llms.txt')
            expect(byKey.llms_full).toBe('https://example.com/llms-full.txt')
        })
    })

    describe('parseSitemapsFromRobots', () => {
        it('extracts Sitemap directives (case-insensitive) and dedupes', () => {
            const robots = [
                'User-agent: *',
                'Disallow: /private',
                'Sitemap: https://example.com/sitemap.xml',
                'sitemap:   https://example.com/news.xml',
                'Sitemap: https://example.com/sitemap.xml'
            ].join('\n')
            expect(parseSitemapsFromRobots(robots)).toEqual([
                'https://example.com/sitemap.xml',
                'https://example.com/news.xml'
            ])
        })

        it('returns empty when none declared', () => {
            expect(parseSitemapsFromRobots('User-agent: *')).toEqual([])
        })
    })

    describe('parseSitemapUrls', () => {
        it('counts <loc> entries in a urlset', () => {
            const xml = '<urlset><url><loc>a</loc></url><url><loc>b</loc></url></urlset>'
            expect(parseSitemapUrls(xml)).toEqual({type: 'urlset', count: 2})
        })

        it('detects a sitemap index', () => {
            const xml = '<sitemapindex><sitemap><loc>a</loc></sitemap></sitemapindex>'
            expect(parseSitemapUrls(xml)).toEqual({type: 'index', count: 1})
        })

        it('handles empty input', () => {
            expect(parseSitemapUrls('')).toEqual({type: 'unknown', count: 0})
        })
    })

    describe('extractSitemapLocs', () => {
        it('extracts and trims <loc> URLs', () => {
            const xml = '<urlset><url><loc> https://x.com/a </loc></url><url><loc>https://x.com/b</loc></url></urlset>'
            expect(extractSitemapLocs(xml)).toEqual(['https://x.com/a', 'https://x.com/b'])
        })

        it('decodes XML entities (notably &amp;)', () => {
            const xml = '<urlset><url><loc>https://x.com/?a=1&amp;b=2</loc></url></urlset>'
            expect(extractSitemapLocs(xml)).toEqual(['https://x.com/?a=1&b=2'])
        })

        it('returns empty for no locs', () => {
            expect(extractSitemapLocs('<urlset></urlset>')).toEqual([])
            expect(extractSitemapLocs('')).toEqual([])
        })
    })

    describe('computeGeoReadiness', () => {
        it('scores 0 when nothing is available', () => {
            const resources = [
                {key: 'robots', available: false},
                {key: 'llms', available: false},
                {key: 'llms_full', available: false}
            ]
            expect(computeGeoReadiness(resources, []).score).toBe(0)
        })

        it('scores 100 when every signal is present (incl. JSON-LD)', () => {
            const resources = [
                {key: 'robots', available: true},
                {key: 'llms', available: true},
                {key: 'llms_full', available: true}
            ]
            const sitemaps = [{available: true, count: 42}]
            const {score, signals} = computeGeoReadiness(resources, sitemaps, {jsonLd: true})
            expect(score).toBe(100)
            expect(signals.every(s => s.ok)).toBe(true)
        })

        it('counts a sitemap available via the standard resource fallback', () => {
            const resources = [
                {key: 'robots', available: false},
                {key: 'sitemap', available: true},
                {key: 'llms', available: false},
                {key: 'llms_full', available: false}
            ]
            // sitemap signal (25) only
            expect(computeGeoReadiness(resources, []).score).toBe(25)
        })

        it('weights JSON-LD at 20', () => {
            expect(computeGeoReadiness([], [], {jsonLd: true}).score).toBe(20)
            expect(computeGeoReadiness([], [], {jsonLd: false}).score).toBe(0)
        })

        it('weights llms.txt at 25', () => {
            const resources = [
                {key: 'robots', available: false},
                {key: 'llms', available: true},
                {key: 'llms_full', available: false}
            ]
            expect(computeGeoReadiness(resources, []).score).toBe(25)
        })
    })

    describe('extractJsonLd', () => {
        it('extracts and parses JSON-LD scripts', () => {
            const html = `<html><head>
                <script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>
                <script type="application/ld+json">[{"@type":"WebSite"}]</script>
            </head></html>`
            const blocks = extractJsonLd(html)
            expect(blocks).toHaveLength(2)
            expect(blocks[0].name).toBe('Acme')
        })

        it('skips malformed JSON-LD', () => {
            const html = '<script type="application/ld+json">{ not json }</script>'
            expect(extractJsonLd(html)).toEqual([])
        })

        it('returns empty when none present', () => {
            expect(extractJsonLd('<html></html>')).toEqual([])
        })
    })

    describe('jsonLdTypes', () => {
        it('collects distinct @type values across arrays and @graph', () => {
            const blocks = [
                {'@type': 'Organization'},
                {'@graph': [{'@type': 'WebSite'}, {'@type': ['Article', 'NewsArticle']}]}
            ]
            expect(jsonLdTypes(blocks).sort()).toEqual(['Article', 'NewsArticle', 'Organization', 'WebSite'])
        })

        it('handles no types', () => {
            expect(jsonLdTypes([{name: 'x'}])).toEqual([])
        })
    })

    describe('validateJsonLd', () => {
        it('flags missing recommended fields for a known type', () => {
            const issues = validateJsonLd([{'@type': 'Organization', name: 'Acme'}])
            expect(issues).toEqual([{type: 'Organization', missing: ['url', 'logo']}])
        })

        it('reports nothing when all recommended fields are present', () => {
            const issues = validateJsonLd([{'@type': 'WebSite', name: 'X', url: 'https://x.com'}])
            expect(issues).toEqual([])
        })

        it('ignores unknown types', () => {
            expect(validateJsonLd([{'@type': 'Thingamajig'}])).toEqual([])
        })
    })

    describe('detectResourceChanges', () => {
        it('flags a readiness drop', () => {
            const changes = detectResourceChanges({readiness: 60, brokenCount: 0}, {readiness: 80, brokenCount: 0})
            expect(changes.some(c => c.includes('baisse'))).toBe(true)
        })

        it('flags new broken URLs', () => {
            const changes = detectResourceChanges({readiness: 80, brokenCount: 5}, {readiness: 80, brokenCount: 2})
            expect(changes.some(c => c.includes('cassées'))).toBe(true)
        })

        it('returns nothing without a previous snapshot or when stable', () => {
            expect(detectResourceChanges({readiness: 80, brokenCount: 0}, null)).toEqual([])
            expect(detectResourceChanges({readiness: 80, brokenCount: 0}, {readiness: 80, brokenCount: 0})).toEqual([])
        })
    })

    describe('indexing meta extraction', () => {
        it('reads meta robots regardless of attribute order', () => {
            expect(extractMetaContent('<meta name="robots" content="noindex, nofollow">', 'robots')).toBe('noindex, nofollow')
            expect(extractMetaContent('<meta content="index" name="robots">', 'robots')).toBe('index')
        })

        it('is case-insensitive and supports single quotes', () => {
            expect(extractMetaContent("<META NAME='googlebot' CONTENT='noindex'>", 'googlebot')).toBe('noindex')
        })

        it('returns empty string when the meta is absent', () => {
            expect(extractMetaContent('<meta name="description" content="x">', 'robots')).toBe('')
            expect(extractMetaContent('', 'robots')).toBe('')
        })

        it('extracts the canonical href', () => {
            expect(extractCanonical('<link rel="canonical" href="https://example.com/page"/>')).toBe('https://example.com/page')
            expect(extractCanonical('<link href="https://example.com/" rel="canonical">')).toBe('https://example.com/')
            expect(extractCanonical('<link rel="stylesheet" href="/a.css">')).toBe('')
        })

        it('combines directives via extractIndexingMeta', () => {
            const html = '<head><meta name="robots" content="noindex"><link rel="canonical" href="https://x.com/"></head>'
            expect(extractIndexingMeta(html)).toEqual({robots: 'noindex', googlebot: '', canonical: 'https://x.com/'})
        })
    })
})
