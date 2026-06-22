import {describe, expect, it} from 'vitest'
import {dateRangeISO, deltaRatio, normalizeRow, previousDateRangeISO, reportToCsv, rowsToCsv, snapshotSeries, summarizeRows} from '@/composables/useSearchConsole'

describe('useSearchConsole - pure helpers', () => {
    describe('dateRangeISO', () => {
        it('ends 2 days before the reference date (data lag)', () => {
            const {endDate} = dateRangeISO(28, new Date('2026-01-31T00:00:00Z'))
            expect(endDate).toBe('2026-01-29')
        })

        it('spans the requested number of days inclusively', () => {
            const {startDate, endDate} = dateRangeISO(7, new Date('2026-01-31T00:00:00Z'))
            expect(endDate).toBe('2026-01-29')
            expect(startDate).toBe('2026-01-23') // 7-day window: 23 → 29
        })
    })

    describe('previousDateRangeISO', () => {
        it('is the contiguous window immediately before the current one', () => {
            const ref = new Date('2026-01-31T00:00:00Z')
            const cur = dateRangeISO(7, ref)       // 2026-01-23 → 2026-01-29
            const prev = previousDateRangeISO(7, ref)
            expect(prev.endDate).toBe('2026-01-22') // day before current start
            expect(prev.startDate).toBe('2026-01-16') // 7-day window
        })
    })

    describe('deltaRatio', () => {
        it('computes a relative variation', () => {
            expect(deltaRatio(150, 100)).toBeCloseTo(0.5)
            expect(deltaRatio(80, 100)).toBeCloseTo(-0.2)
        })

        it('returns null when there is no baseline', () => {
            expect(deltaRatio(10, 0)).toBeNull()
        })
    })

    describe('normalizeRow', () => {
        it('flattens the first key and fills defaults', () => {
            expect(normalizeRow({keys: ['vue seo'], clicks: 5, impressions: 100, ctr: 0.05, position: 3.2}))
                .toEqual({key: 'vue seo', clicks: 5, impressions: 100, ctr: 0.05, position: 3.2})
        })

        it('handles missing fields', () => {
            expect(normalizeRow({})).toEqual({key: '', clicks: 0, impressions: 0, ctr: 0, position: 0})
        })
    })

    describe('summarizeRows', () => {
        it('sums clicks/impressions and weights ctr & position by impressions', () => {
            const rows = [
                {keys: ['a'], clicks: 10, impressions: 100, ctr: 0.1, position: 2},
                {keys: ['b'], clicks: 5, impressions: 100, ctr: 0.05, position: 4}
            ]
            const s = summarizeRows(rows)
            expect(s.clicks).toBe(15)
            expect(s.impressions).toBe(200)
            expect(s.ctr).toBeCloseTo(0.075)   // 15 / 200
            expect(s.position).toBeCloseTo(3)  // (2*100 + 4*100) / 200
        })

        it('returns zeros for no rows', () => {
            expect(summarizeRows([])).toEqual({clicks: 0, impressions: 0, ctr: 0, position: 0})
        })
    })

    describe('snapshotSeries', () => {
        it('returns an oldest-first series of a metric', () => {
            // snapshots are newest-first
            const snapshots = [
                {timestamp: 30, clicks: 30},
                {timestamp: 20, clicks: 20},
                {timestamp: 10, clicks: 10}
            ]
            expect(snapshotSeries(snapshots, 'clicks')).toEqual([10, 20, 30])
        })

        it('caps to the most recent points and ignores non-numerics', () => {
            const snapshots = Array.from({length: 15}, (_, i) => ({clicks: i}))
            expect(snapshotSeries(snapshots, 'clicks', 12)).toHaveLength(12)
        })
    })

    describe('rowsToCsv', () => {
        it('emits a header plus one line per row', () => {
            const csv = rowsToCsv([
                {key: 'vue seo', clicks: 5, impressions: 100, ctr: 0.05, position: 3.2}
            ], 'query')
            expect(csv).toBe('query,clicks,impressions,ctr,position\nvue seo,5,100,0.05,3.2')
        })

        it('escapes values containing commas, quotes or newlines', () => {
            const csv = rowsToCsv([{key: 'a,"b"', clicks: 1, impressions: 2, ctr: 0, position: 0}], 'page')
            expect(csv.split('\n')[1]).toBe('"a,""b""",1,2,0,0')
        })

        it('returns just the header for no rows', () => {
            expect(rowsToCsv([], 'query')).toBe('query,clicks,impressions,ctr,position')
        })
    })

    describe('reportToCsv', () => {
        it('prefixes every row with its dimension', () => {
            const csv = reportToCsv({
                query: [{key: 'a', clicks: 1, impressions: 10, ctr: 0.1, position: 2}],
                device: [{key: 'MOBILE', clicks: 3, impressions: 30, ctr: 0.1, position: 5}]
            })
            expect(csv).toBe(
                'dimension,key,clicks,impressions,ctr,position\n' +
                'query,a,1,10,0.1,2\n' +
                'device,MOBILE,3,30,0.1,5'
            )
        })

        it('handles an empty report', () => {
            expect(reportToCsv({})).toBe('dimension,key,clicks,impressions,ctr,position')
        })
    })
})
