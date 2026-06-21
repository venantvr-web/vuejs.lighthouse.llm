import {describe, expect, it} from 'vitest'
import {Domain} from '@/utils/Domain'

describe('Domain (value object)', () => {
    it('normalise une URL complète en hôte minuscule', () => {
        const d = new Domain('HTTPS://WWW.Example.com/blog/article?x=1')
        expect(d.value).toBe('www.example.com')
        expect(d.host).toBe('www.example.com')
    })

    it('accepte un hôte brut sans schéma', () => {
        expect(new Domain('Example.org').value).toBe('example.org')
    })

    it('expose une origine canonique avec / final', () => {
        expect(new Domain('example.com').origin).toBe('https://example.com/')
        expect(String(new Domain('https://www.example.com'))).toBe('https://www.example.com/')
    })

    it('le setter renormalise', () => {
        const d = new Domain('a.com')
        d.value = 'https://B.com/x'
        expect(d.value).toBe('b.com')
        expect(d.origin).toBe('https://b.com/')
    })

    it('vide reste vide', () => {
        const d = new Domain('')
        expect(d.isEmpty).toBe(true)
        expect(d.value).toBe('')
        expect(d.origin).toBe('')
    })

    it('égalité par hôte (ignore casse et www)', () => {
        expect(new Domain('www.example.com').equals('example.com')).toBe(true)
        expect(new Domain('example.com').equals(new Domain('https://EXAMPLE.com/'))).toBe(true)
        expect(new Domain('a.com').equals('b.com')).toBe(false)
    })

    it('from() est idempotent sur une instance', () => {
        const d = new Domain('example.com')
        expect(Domain.from(d)).toBe(d)
        expect(Domain.from('example.com').value).toBe('example.com')
    })
})
