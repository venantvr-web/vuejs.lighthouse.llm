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
        expect(site.activeDomain).toBe('')
        expect(site.origin).toBe('')
        expect(site.brandGuess).toBe('')
        expect(site.needsOnboarding).toBe(true)
        expect(site.domains).toEqual([])
        expect(site.brands).toEqual([])
    })

    it('captures the domain from a full URL', () => {
        const site = useSiteStore()
        site.setFromUrl('https://www.Example.com/blog/article?x=1')
        expect(site.activeDomain).toBe('www.example.com')
        expect(site.domains).toContain('www.example.com')
        expect(site.origin).toBe('https://www.example.com')
        expect(site.lastUrl).toBe('https://www.example.com/blog/article?x=1')
        expect(site.hasSite).toBe(true)
    })

    it('accepts a bare domain without scheme', () => {
        const site = useSiteStore()
        site.setFromUrl('example.org')
        expect(site.activeDomain).toBe('example.org')
        expect(site.origin).toBe('https://example.org')
    })

    it('manages multiple brands and domains with active selection', () => {
        const site = useSiteStore()
        site.addBrand('Acme')
        site.addBrand('Globex')
        site.addDomain('https://acme.com')
        site.addDomain('globex.io')
        expect(site.brands).toEqual(['Acme', 'Globex'])
        expect(site.domains).toEqual(['acme.com', 'globex.io'])
        expect(site.activeBrand).toBe('Acme')
        expect(site.activeDomain).toBe('acme.com')
        site.setActiveBrand('Globex')
        expect(site.activeBrand).toBe('Globex')
        site.removeBrand('Globex')
        expect(site.brands).toEqual(['Acme'])
        expect(site.activeBrand).toBe('Acme')
        expect(site.needsOnboarding).toBe(false)
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
        expect(JSON.parse(localStorage.getItem(KEY)).activeDomain).toBe('shop.example.com')

        // fresh pinia → store should hydrate from localStorage
        setActivePinia(createPinia())
        const reloaded = useSiteStore()
        expect(reloaded.activeDomain).toBe('shop.example.com')
        expect(reloaded.origin).toBe('https://shop.example.com')
    })

    it('clears the active site', () => {
        const site = useSiteStore()
        site.setFromUrl('https://example.com')
        site.clear()
        expect(site.hasSite).toBe(false)
        expect(JSON.parse(localStorage.getItem(KEY)).activeDomain).toBe('')
    })
})
