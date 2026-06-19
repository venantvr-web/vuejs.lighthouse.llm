import {describe, expect, it} from 'vitest'
import {toSeries} from '@/utils/series'

describe('utils/series - toSeries', () => {
    it('reverses newest-first records into an oldest-first series', () => {
        const records = [{v: 3}, {v: 2}, {v: 1}] // newest first
        expect(toSeries(records, r => r.v)).toEqual([1, 2, 3])
    })

    it('drops null and non-numeric values', () => {
        const records = [{v: 3}, {v: null}, {v: 1}]
        expect(toSeries(records, r => (typeof r.v === 'number' ? r.v : null))).toEqual([1, 3])
    })

    it('keeps only the most recent `limit` points', () => {
        const records = Array.from({length: 20}, (_, i) => ({v: i})) // newest first 0..19
        const series = toSeries(records, r => r.v, {limit: 5})
        // reversed -> 19..0, last 5 -> [4,3,2,1,0]
        expect(series).toEqual([4, 3, 2, 1, 0])
    })

    it('handles an empty list', () => {
        expect(toSeries([], r => r.v)).toEqual([])
    })
})
