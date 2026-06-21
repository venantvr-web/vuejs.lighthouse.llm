import {beforeEach, describe, expect, it} from 'vitest'
import {createPinia, setActivePinia} from 'pinia'
import {entityKey, useSiteStore} from '@/stores/siteStore'

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
        expect(site.entities).toEqual([])
    })

    it('adds an entity (brand + domain + sector) as one tuple', () => {
        const site = useSiteStore()
        const e = site.addEntity({brand: 'Concilio', domain: 'https://www.Concilio.com/', sector: 'conciergerie médicale'})
        expect(e).toBeTruthy()
        expect(site.activeBrand).toBe('Concilio')
        expect(site.activeDomain).toBe('www.concilio.com')      // normalized host
        expect(site.activeSector).toBe('conciergerie médicale')
        expect(site.origin).toBe('https://www.concilio.com/')
        expect(site.hasSite).toBe(true)
        expect(site.needsOnboarding).toBe(false)
    })

    it('requires both a brand and a domain to form an entity', () => {
        const site = useSiteStore()
        expect(site.addEntity({brand: 'Concilio', domain: ''})).toBeNull()
        expect(site.addEntity({brand: '', domain: 'concilio.com'})).toBeNull()
        expect(site.entities).toEqual([])
    })

    it('switches the whole tuple when activating another entity', () => {
        const site = useSiteStore()
        site.addEntity({brand: 'Concilio', domain: 'concilio.com', sector: 'conciergerie médicale'})
        const acme = site.addEntity({brand: 'Acme', domain: 'acme.io', sector: 'logiciel B2B'})
        expect(site.activeBrand).toBe('Concilio')   // first stays active

        site.setActiveEntity(entityKey(acme))
        expect(site.activeBrand).toBe('Acme')
        expect(site.activeDomain).toBe('acme.io')
        expect(site.activeSector).toBe('logiciel B2B')
        expect(site.scopeKey).toBe('Acme::acme.io')
    })

    it('edits the active entity sector via activeSector setter', () => {
        const site = useSiteStore()
        const e = site.addEntity({brand: 'Concilio', domain: 'concilio.com'})
        site.activeSector = 'conciergerie médicale'
        expect(site.sectorFor('Concilio')).toBe('conciergerie médicale')
        expect(entityKey(e)).toBe('Concilio::concilio.com')
    })

    it('setFromUrl activates a matching entity and remembers the url', () => {
        const site = useSiteStore()
        site.addEntity({brand: 'Concilio', domain: 'concilio.com'})
        site.addEntity({brand: 'Acme', domain: 'acme.io'})
        site.setFromUrl('https://acme.io/pricing?x=1')
        expect(site.activeBrand).toBe('Acme')
        expect(site.lastUrl).toBe('https://acme.io/pricing?x=1')
    })

    it('setFromUrl never invents an orphan entity for an unknown domain', () => {
        const site = useSiteStore()
        site.addEntity({brand: 'Concilio', domain: 'concilio.com'})
        site.setFromUrl('https://unknown-site.com/')
        expect(site.entities).toHaveLength(1)
        expect(site.activeBrand).toBe('Concilio')        // unchanged
        expect(site.lastUrl).toBe('https://unknown-site.com')  // normalisée (sans / final)
    })

    it('removes an entity and falls back to the first remaining', () => {
        const site = useSiteStore()
        const c = site.addEntity({brand: 'Concilio', domain: 'concilio.com'})
        site.addEntity({brand: 'Acme', domain: 'acme.io'})
        site.removeEntity(entityKey(c))
        expect(site.entities).toHaveLength(1)
        expect(site.activeBrand).toBe('Acme')
    })

    it('derives a brand guess from the active domain (strips www and TLD)', () => {
        const site = useSiteStore()
        site.addEntity({brand: 'X', domain: 'https://www.acme.co.uk'})
        expect(site.brandGuess).toBe('acme')
    })

    it('persists entities and reloads them', () => {
        const site = useSiteStore()
        site.addEntity({brand: 'Concilio', domain: 'concilio.com', sector: 'conciergerie médicale'})
        const stored = JSON.parse(localStorage.getItem(KEY))
        expect(stored.entities[0]).toMatchObject({brand: 'Concilio', domain: 'concilio.com', sector: 'conciergerie médicale'})

        setActivePinia(createPinia())
        const reloaded = useSiteStore()
        expect(reloaded.activeBrand).toBe('Concilio')
        expect(reloaded.activeSector).toBe('conciergerie médicale')
        expect(reloaded.origin).toBe('https://concilio.com/')
    })

    it('migrates the legacy brands/domains/sectors format into entities', () => {
        localStorage.setItem(KEY, JSON.stringify({
            domains: ['concilio.com'],
            brands: ['Concilio'],
            sectors: {Concilio: 'conciergerie médicale'},
            activeBrand: 'Concilio',
            activeDomain: 'concilio.com'
        }))
        const site = useSiteStore()
        expect(site.entities).toHaveLength(1)
        expect(site.activeBrand).toBe('Concilio')
        expect(site.activeDomain).toBe('concilio.com')
        expect(site.activeSector).toBe('conciergerie médicale')
    })

    it('clears the active site', () => {
        const site = useSiteStore()
        site.addEntity({brand: 'X', domain: 'example.com'})
        site.clear()
        expect(site.hasSite).toBe(false)
        expect(site.entities).toEqual([])
    })
})
