import {beforeEach, describe, expect, it} from 'vitest'
import {createPinia, setActivePinia} from 'pinia'
import {useSiteStore} from '@/stores/siteStore'

const KEY = 'lighthouse-active-site'

describe('siteStore', () => {
    beforeEach(() => {
        localStorage.clear()
        setActivePinia(createPinia())
    })

    it('starts empty', () => {
        const site = useSiteStore()
        expect(site.hasSite).toBe(false)
        expect(site.domain).toBe('')
        expect(site.origin).toBe('')
        expect(site.brandGuess).toBe('')
    })

    it('captures the domain from a full URL', () => {
        const site = useSiteStore()
        site.setFromUrl('https://www.Example.com/blog/article?x=1')
        expect(site.domain).toBe('www.example.com')
        expect(site.origin).toBe('https://www.example.com')
        expect(site.lastUrl).toBe('https://www.example.com/blog/article?x=1')
        expect(site.hasSite).toBe(true)
    })

    it('accepts a bare domain without scheme', () => {
        const site = useSiteStore()
        site.setFromUrl('example.org')
        expect(site.domain).toBe('example.org')
        expect(site.origin).toBe('https://example.org')
    })

    it('ignores blank input', () => {
        const site = useSiteStore()
        site.setFromUrl('   ')
        expect(site.hasSite).toBe(false)
    })

    it('derives a brand guess (strips www and TLD)', () => {
        const site = useSiteStore()
        site.setFromUrl('https://www.acme.co.uk')
        expect(site.brandGuess).toBe('acme')
    })

    it('persists to localStorage and reloads in a new store', () => {
        const site = useSiteStore()
        site.setFromUrl('https://shop.example.com/x')
        expect(JSON.parse(localStorage.getItem(KEY)).domain).toBe('shop.example.com')

        // fresh pinia → store should hydrate from localStorage
        setActivePinia(createPinia())
        const reloaded = useSiteStore()
        expect(reloaded.domain).toBe('shop.example.com')
        expect(reloaded.origin).toBe('https://shop.example.com')
    })

    it('clears the active site', () => {
        const site = useSiteStore()
        site.setFromUrl('https://example.com')
        site.clear()
        expect(site.hasSite).toBe(false)
        expect(JSON.parse(localStorage.getItem(KEY)).domain).toBe('')
    })
})
