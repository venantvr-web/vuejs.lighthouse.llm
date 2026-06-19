import {afterEach, describe, expect, it, vi} from 'vitest'
import {discoverBySitemap, DISCOVERY_MODES, expandSitemap, isSitemapUrl, parseManualUrls} from '@/services/urlDiscovery'

/**
 * Tests for URL Discovery service
 * Verifies URL parsing and normalization for crawl mode
 */
describe('urlDiscovery', () => {
    describe('parseManualUrls', () => {
        it('should parse valid URLs from text', () => {
            const text = `https://example.com
https://example.com/page1
https://example.com/page2`

            const result = parseManualUrls(text)

            expect(result).toHaveLength(3)
            // Note: normalizeUrl adds trailing slash to root URL
            expect(result).toContain('https://example.com/')
            expect(result).toContain('https://example.com/page1')
            expect(result).toContain('https://example.com/page2')
        })

        it('should accept scheme-less URLs (manual crawl) by prefixing https', () => {
            // Régression : le crawl manuel sortait aussitôt car les URL sans
            // schéma étaient rejetées. normalizeUrl doit préfixer https://.
            const text = `example.com/page-1
www.test.fr
https://example.com/p2`

            const result = parseManualUrls(text)

            expect(result).toContain('https://example.com/page-1')
            expect(result).toContain('https://www.test.fr/')
            expect(result).toContain('https://example.com/p2')
            expect(result).toHaveLength(3)
        })

        it('should ignore empty lines', () => {
            const text = `https://example.com

https://example.com/page1

`
            const result = parseManualUrls(text)

            expect(result).toHaveLength(2)
        })

        it('should ignore comment lines starting with #', () => {
            const text = `# This is a comment
https://example.com
# Another comment
https://example.com/page1`

            const result = parseManualUrls(text)

            expect(result).toHaveLength(2)
            expect(result).not.toContain('# This is a comment')
        })

        it('should remove duplicate URLs', () => {
            const text = `https://example.com
https://example.com
https://example.com/page1
https://example.com/page1`

            const result = parseManualUrls(text)

            expect(result).toHaveLength(2)
        })

        it('should respect maxPages limit', () => {
            const text = `https://example.com/page1
https://example.com/page2
https://example.com/page3
https://example.com/page4
https://example.com/page5`

            const result = parseManualUrls(text, {maxPages: 3})

            expect(result).toHaveLength(3)
        })

        it('should filter out invalid URLs', () => {
            const text = `https://example.com
not-a-valid-url
https://example.com/page1
ftp://example.com
javascript:void(0)`

            const result = parseManualUrls(text)

            expect(result).toHaveLength(2)
            expect(result).toContain('https://example.com/')
            expect(result).toContain('https://example.com/page1')
        })

        it('should trim whitespace from URLs', () => {
            const text = `  https://example.com
    https://example.com/page1   `

            const result = parseManualUrls(text)

            expect(result).toHaveLength(2)
            expect(result[0]).not.toMatch(/^\s/)
            expect(result[0]).not.toMatch(/\s$/)
        })

        it('should normalize URLs by removing fragments', () => {
            const text = `https://example.com#section1
https://example.com/page#section2`

            const result = parseManualUrls(text)

            expect(result).toContain('https://example.com/')
            expect(result).toContain('https://example.com/page')
            expect(result).not.toContain('https://example.com#section1')
        })

        it('should remove tracking parameters (utm_*)', () => {
            const text = `https://example.com?utm_source=test&utm_medium=email
https://example.com/page?id=1&utm_campaign=summer`

            const result = parseManualUrls(text)

            expect(result[0]).not.toContain('utm_source')
            expect(result[1]).toContain('id=1')
            expect(result[1]).not.toContain('utm_campaign')
        })

        it('should return empty array for empty input', () => {
            const result = parseManualUrls('')
            expect(result).toEqual([])
        })

        it('should return empty array for only comments', () => {
            const text = `# Comment 1
# Comment 2`

            const result = parseManualUrls(text)
            expect(result).toEqual([])
        })
    })

    describe('DISCOVERY_MODES', () => {
        it('should have all expected modes', () => {
            expect(DISCOVERY_MODES.AUTO).toBe('auto')
            expect(DISCOVERY_MODES.SITEMAP).toBe('sitemap')
            expect(DISCOVERY_MODES.MANUAL).toBe('manual')
        })
    })

    describe('isSitemapUrl', () => {
        it('detects .xml and sitemap-like URLs', () => {
            expect(isSitemapUrl('https://x.com/sitemap.xml')).toBe(true)
            expect(isSitemapUrl('https://x.com/sitemap_index.xml')).toBe(true)
            expect(isSitemapUrl('https://x.com/sitemap/')).toBe(true)
        })
        it('treats regular pages as non-sitemaps', () => {
            expect(isSitemapUrl('https://x.com/blog/article')).toBe(false)
            expect(isSitemapUrl('not a url')).toBe(false)
        })
    })

    describe('expandSitemap', () => {
        afterEach(() => vi.unstubAllGlobals())

        function mockProxy(xmlByUrl) {
            vi.stubGlobal('fetch', vi.fn(async (_endpoint, opts) => {
                const {url} = JSON.parse(opts.body)
                return {ok: true, json: async () => ({html: xmlByUrl[url] || ''})}
            }))
        }

        it('expands a urlset sitemap into page URLs', async () => {
            mockProxy({
                'https://x.com/sitemap.xml':
                    '<urlset><url><loc>https://x.com/a</loc></url><url><loc>https://x.com/b</loc></url></urlset>'
            })
            const urls = await expandSitemap('https://x.com/sitemap.xml')
            expect(urls).toContain('https://x.com/a')
            expect(urls).toContain('https://x.com/b')
        })

        it('recurses one level into a sitemap index', async () => {
            mockProxy({
                'https://x.com/sitemap_index.xml':
                    '<sitemapindex><sitemap><loc>https://x.com/sm1.xml</loc></sitemap></sitemapindex>',
                'https://x.com/sm1.xml':
                    '<urlset><url><loc>https://x.com/child</loc></url></urlset>'
            })
            const urls = await expandSitemap('https://x.com/sitemap_index.xml')
            expect(urls).toContain('https://x.com/child')
        })

        it('respects maxPages', async () => {
            mockProxy({
                'https://x.com/sitemap.xml':
                    '<urlset><url><loc>https://x.com/a</loc></url><url><loc>https://x.com/b</loc></url><url><loc>https://x.com/c</loc></url></urlset>'
            })
            const urls = await expandSitemap('https://x.com/sitemap.xml', {maxPages: 2})
            expect(urls).toHaveLength(2)
        })
    })

    describe('discoverBySitemap (resolves sitemap index)', () => {
        afterEach(() => vi.unstubAllGlobals())

        it('expands a sitemap index found at a standard path into page URLs', async () => {
            // Régression : un <sitemapindex> renvoyait 0 URL (branche index non gérée)
            const xmlByUrl = {
                'https://concilio.com/sitemap.xml':
                    '<sitemapindex><sitemap><loc>https://concilio.com/page-sitemap.xml</loc></sitemap></sitemapindex>',
                'https://concilio.com/page-sitemap.xml':
                    '<urlset><url><loc>https://concilio.com/a</loc></url><url><loc>https://concilio.com/b</loc></url></urlset>'
            }
            vi.stubGlobal('fetch', vi.fn(async (_endpoint, opts) => {
                const {url} = JSON.parse(opts.body)
                return {ok: true, json: async () => ({html: xmlByUrl[url] || ''})}
            }))

            const urls = await discoverBySitemap('https://concilio.com')
            expect(urls).toContain('https://concilio.com/a')
            expect(urls).toContain('https://concilio.com/b')
        })
    })
})
