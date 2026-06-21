import {describe, expect, it} from 'vitest'
import {canonicalUrl, extractDomain, normalizeUrl, sameHost} from '@/utils/url'

describe('utils/url', () => {
    describe('canonicalUrl', () => {
        it('ajoute un / final à la racine et aux chemins', () => {
            expect(canonicalUrl('https://example.com')).toBe('https://example.com/')
            expect(canonicalUrl('https://example.com/services')).toBe('https://example.com/services/')
        })
        it('préserve un / déjà présent, ajoute le schéma si absent', () => {
            expect(canonicalUrl('https://example.com/')).toBe('https://example.com/')
            expect(canonicalUrl('example.com')).toBe('https://example.com/')
        })
        it('préserve la query après le slash de chemin', () => {
            expect(canonicalUrl('https://example.com/p?q=1')).toBe('https://example.com/p/?q=1')
        })
        it('vide pour une entrée vide', () => {
            expect(canonicalUrl('')).toBe('')
        })
    })

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
