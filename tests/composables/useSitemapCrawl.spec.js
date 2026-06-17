import {describe, expect, it} from 'vitest'
import {mapWithConcurrency} from '@/composables/useSitemapCrawl'

describe('mapWithConcurrency', () => {
    it('maps every item, preserving input order', async () => {
        const items = [1, 2, 3, 4, 5]
        const out = await mapWithConcurrency(items, 2, async (n) => n * 2)
        expect(out).toEqual([2, 4, 6, 8, 10])
    })

    it('never exceeds the concurrency limit', async () => {
        let active = 0
        let peak = 0
        const items = Array.from({length: 10}, (_, i) => i)
        await mapWithConcurrency(items, 3, async () => {
            active++
            peak = Math.max(peak, active)
            await new Promise(r => setTimeout(r, 5))
            active--
        })
        expect(peak).toBeLessThanOrEqual(3)
    })

    it('handles an empty list', async () => {
        expect(await mapWithConcurrency([], 4, async (x) => x)).toEqual([])
    })
})
