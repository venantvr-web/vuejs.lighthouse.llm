import {describe, expect, it} from 'vitest'
import {extractDomain, normalizeUrl, sameHost} from '@/utils/url'

describe('utils/url', () => {
    describe('sameHost', () => {
        it('ignore la casse et le préfixe www', () => {
            expect(sameHost('www.Example.com', 'example.com')).toBe(true)
            expect(sameHost('example.com', 'example.com')).toBe(true)
        })
        it('distingue des hôtes différents', () => {
            expect(sameHost('a.com', 'b.com')).toBe(false)
        })
        it('faux pour une entrée vide', () => {
            expect(sameHost('', 'a.com')).toBe(false)
            expect(sameHost('a.com', '')).toBe(false)
        })
    })

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
