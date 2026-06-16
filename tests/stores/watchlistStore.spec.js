import {beforeEach, describe, expect, it} from 'vitest'
import {createPinia, setActivePinia} from 'pinia'
import {useWatchlistStore} from '@/stores/watchlistStore'

describe('watchlistStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        localStorage.clear()
    })

    describe('addItem', () => {
        it('adds a normalized item with defaults', () => {
            const store = useWatchlistStore()
            const item = store.addItem('example.com')

            expect(item).toBeTruthy()
            expect(item.url).toBe('https://example.com')
            expect(item.domain).toBe('example.com')
            expect(item.label).toBe('example.com')
            expect(item.strategy).toBe('mobile')
            expect(item.source).toBe('pagespeed')
            expect(store.count).toBe(1)
        })

        it('honors provided options', () => {
            const store = useWatchlistStore()
            const item = store.addItem('https://site.fr/blog', {
                label: 'Blog',
                strategy: 'desktop',
                source: 'local'
            })

            expect(item.label).toBe('Blog')
            expect(item.strategy).toBe('desktop')
            expect(item.source).toBe('local')
        })

        it('rejects duplicate URLs (normalized)', () => {
            const store = useWatchlistStore()
            store.addItem('https://example.com')
            const dup = store.addItem('https://example.com/')

            expect(dup).toBeNull()
            expect(store.count).toBe(1)
        })

        it('rejects blank input', () => {
            const store = useWatchlistStore()
            expect(store.addItem('   ')).toBeNull()
            expect(store.count).toBe(0)
        })
    })

    describe('hasUrl', () => {
        it('detects existing URLs regardless of trailing slash', () => {
            const store = useWatchlistStore()
            store.addItem('https://example.com/page')

            expect(store.hasUrl('https://example.com/page/')).toBe(true)
            expect(store.hasUrl('https://example.com/other')).toBe(false)
        })
    })

    describe('updateItem', () => {
        it('updates fields and falls back to domain for empty label', () => {
            const store = useWatchlistStore()
            const item = store.addItem('https://example.com', {label: 'Initial'})

            store.updateItem(item.id, {label: '   ', strategy: 'desktop'})
            const updated = store.items.find(i => i.id === item.id)

            expect(updated.label).toBe('example.com')
            expect(updated.strategy).toBe('desktop')
        })
    })

    describe('setBudget', () => {
        it('initializes items with empty budgets', () => {
            const store = useWatchlistStore()
            const item = store.addItem('https://example.com')
            expect(item.budgets).toEqual({
                performance: null,
                accessibility: null,
                'best-practices': null,
                seo: null
            })
        })

        it('sets and clamps a budget value', () => {
            const store = useWatchlistStore()
            const item = store.addItem('https://example.com')

            store.setBudget(item.id, 'performance', 90)
            expect(item.budgets.performance).toBe(90)

            store.setBudget(item.id, 'performance', 150)
            expect(item.budgets.performance).toBe(100)

            store.setBudget(item.id, 'performance', -10)
            expect(item.budgets.performance).toBe(0)
        })

        it('clears a budget with null or empty value', () => {
            const store = useWatchlistStore()
            const item = store.addItem('https://example.com')

            store.setBudget(item.id, 'seo', 80)
            expect(item.budgets.seo).toBe(80)

            store.setBudget(item.id, 'seo', '')
            expect(item.budgets.seo).toBeNull()
        })

        it('rounds fractional values', () => {
            const store = useWatchlistStore()
            const item = store.addItem('https://example.com')
            store.setBudget(item.id, 'accessibility', 87.6)
            expect(item.budgets.accessibility).toBe(88)
        })
    })

    describe('backward compatibility', () => {
        it('adds a budgets shape to legacy items on load', () => {
            localStorage.setItem('lighthouse-watchlist', JSON.stringify([
                {id: 'x', url: 'https://legacy.com', label: 'Legacy', strategy: 'mobile', source: 'pagespeed', createdAt: 1}
            ]))

            const store = useWatchlistStore()
            expect(store.items[0].budgets).toEqual({
                performance: null,
                accessibility: null,
                'best-practices': null,
                seo: null
            })
        })
    })

    describe('removeItem and clearAll', () => {
        it('removes a single item', () => {
            const store = useWatchlistStore()
            const item = store.addItem('https://a.com')
            store.addItem('https://b.com')

            store.removeItem(item.id)
            expect(store.count).toBe(1)
            expect(store.hasUrl('https://a.com')).toBe(false)
        })

        it('clears all items', () => {
            const store = useWatchlistStore()
            store.addItem('https://a.com')
            store.addItem('https://b.com')

            store.clearAll()
            expect(store.isEmpty).toBe(true)
        })
    })

    describe('persistence', () => {
        it('saves to localStorage and reloads', () => {
            const store = useWatchlistStore()
            store.addItem('https://persist.com', {label: 'Persist'})

            // New pinia instance simulating a reload
            setActivePinia(createPinia())
            const reloaded = useWatchlistStore()

            expect(reloaded.count).toBe(1)
            expect(reloaded.items[0].label).toBe('Persist')
        })
    })

    describe('sortedItems', () => {
        it('orders items newest first', () => {
            const store = useWatchlistStore()
            const first = store.addItem('https://old.com')
            first.createdAt = 1000
            const second = store.addItem('https://new.com')
            second.createdAt = 2000

            expect(store.sortedItems[0].url).toBe('https://new.com')
        })
    })
})
