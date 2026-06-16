import {describe, expect, it} from 'vitest'
import {extractDomain, normalizeUrl} from '@/utils/url'

describe('utils/url', () => {
    describe('normalizeUrl', () => {
        it('adds https protocol when missing', () => {
            expect(normalizeUrl('example.com')).toBe('https://example.com')
        })

        it('strips trailing slash and lowercases host', () => {
            expect(normalizeUrl('https://Example.com/Path/')).toBe('https://example.com/Path')
        })

        it('preserves query string', () => {
            expect(normalizeUrl('https://example.com/p?a=1')).toBe('https://example.com/p?a=1')
        })

        it('returns empty string for blank input', () => {
            expect(normalizeUrl('   ')).toBe('')
        })

        it('treats trailing-slash variants as equal', () => {
            expect(normalizeUrl('https://example.com/page')).toBe(normalizeUrl('https://example.com/page/'))
        })
    })

    describe('extractDomain', () => {
        it('returns the hostname', () => {
            expect(extractDomain('https://www.example.com/path?q=1')).toBe('www.example.com')
        })

        it('returns the input when it is not a valid URL', () => {
            expect(extractDomain('not a url')).toBe('not a url')
        })
    })
})
