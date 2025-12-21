import {describe, expect, it} from 'vitest'
import {parseManualUrls, DISCOVERY_MODES} from '@/services/urlDiscovery'

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
})
