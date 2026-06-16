import {beforeEach, describe, expect, it} from 'vitest'
import {createPinia, setActivePinia} from 'pinia'
import {parseTerms, useGeoStore} from '@/stores/geoStore'

describe('geoStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        localStorage.clear()
    })

    describe('parseTerms', () => {
        it('splits on commas and newlines, trims and dedupes', () => {
            expect(parseTerms('Foo, Bar\nFoo ,  Baz')).toEqual(['Foo', 'Bar', 'Baz'])
        })

        it('accepts an array', () => {
            expect(parseTerms(['A', ' B ', 'a'])).toEqual(['A', 'B'])
        })

        it('returns empty for blank input', () => {
            expect(parseTerms('  ')).toEqual([])
        })
    })

    describe('addItem', () => {
        it('creates a tracked prompt with parsed competitors', () => {
            const store = useGeoStore()
            const item = store.addItem({prompt: 'Best SEO tools?', brand: 'Acme', competitors: 'Foo, Bar'})
            expect(item).toBeTruthy()
            expect(item.prompt).toBe('Best SEO tools?')
            expect(item.brand).toBe('Acme')
            expect(item.competitors).toEqual(['Foo', 'Bar'])
            expect(store.count).toBe(1)
        })

        it('requires both prompt and brand', () => {
            const store = useGeoStore()
            expect(store.addItem({prompt: 'x', brand: ''})).toBeNull()
            expect(store.addItem({prompt: '', brand: 'Acme'})).toBeNull()
            expect(store.count).toBe(0)
        })
    })

    describe('updateItem', () => {
        it('updates fields and re-parses competitors', () => {
            const store = useGeoStore()
            const item = store.addItem({prompt: 'p', brand: 'Acme', competitors: 'Foo'})
            store.updateItem(item.id, {competitors: 'Bar, Baz'})
            expect(store.items[0].competitors).toEqual(['Bar', 'Baz'])
        })
    })

    describe('removeItem / clearAll', () => {
        it('removes and clears', () => {
            const store = useGeoStore()
            const a = store.addItem({prompt: 'p1', brand: 'A'})
            store.addItem({prompt: 'p2', brand: 'B'})
            store.removeItem(a.id)
            expect(store.count).toBe(1)
            store.clearAll()
            expect(store.isEmpty).toBe(true)
        })
    })

    describe('persistence', () => {
        it('saves and reloads from localStorage', () => {
            const store = useGeoStore()
            store.addItem({prompt: 'persist', brand: 'Acme'})
            setActivePinia(createPinia())
            const reloaded = useGeoStore()
            expect(reloaded.count).toBe(1)
            expect(reloaded.items[0].prompt).toBe('persist')
        })
    })
})
