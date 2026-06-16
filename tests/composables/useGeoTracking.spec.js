import {describe, expect, it} from 'vitest'
import {analyzeResponse, countOccurrences, detectChanges, escapeRegExp} from '@/composables/useGeoTracking'

describe('useGeoTracking - pure logic', () => {
    describe('escapeRegExp', () => {
        it('escapes regex metacharacters', () => {
            expect(escapeRegExp('a.b+c')).toBe('a\\.b\\+c')
        })
    })

    describe('countOccurrences', () => {
        it('counts case-insensitive matches', () => {
            expect(countOccurrences('Acme is great, acme rocks', 'acme')).toBe(2)
        })

        it('handles multi-word and special-char terms', () => {
            expect(countOccurrences('Use Ahrefs.com and ahrefs', 'Ahrefs.com')).toBe(1)
        })

        it('returns 0 for blank inputs', () => {
            expect(countOccurrences('', 'acme')).toBe(0)
            expect(countOccurrences('text', '')).toBe(0)
        })
    })

    describe('analyzeResponse', () => {
        it('detects brand mention and counts', () => {
            const r = analyzeResponse('Acme is a good tool. Acme wins.', 'Acme', [])
            expect(r.brandMentioned).toBe(true)
            expect(r.brandMentions).toBe(2)
            expect(r.shareOfVoice).toBe(100)
            expect(r.position).toBe(1)
        })

        it('reports brand absent', () => {
            const r = analyzeResponse('Only competitors here: Foo and Bar', 'Acme', ['Foo', 'Bar'])
            expect(r.brandMentioned).toBe(false)
            expect(r.shareOfVoice).toBe(0)
            expect(r.position).toBeNull()
        })

        it('computes share of voice against competitors', () => {
            // brand x1, competitors x3 -> 1/4 = 25%
            const r = analyzeResponse('Acme, Foo, Foo, Bar', 'Acme', ['Foo', 'Bar'])
            expect(r.shareOfVoice).toBe(25)
            expect(r.competitorsFound).toEqual([
                {name: 'Foo', count: 2},
                {name: 'Bar', count: 1}
            ])
        })

        it('ranks brand position by first appearance', () => {
            const r = analyzeResponse('First Foo, then Acme, then Bar', 'Acme', ['Foo', 'Bar'])
            expect(r.position).toBe(2)
        })

        it('returns null share of voice when nothing is mentioned', () => {
            const r = analyzeResponse('Nothing relevant here', 'Acme', ['Foo'])
            expect(r.shareOfVoice).toBeNull()
        })
    })

    describe('detectChanges', () => {
        const item = {brand: 'Acme'}

        it('flags the brand disappearing', () => {
            const changes = detectChanges(item, {brandMentioned: false, shareOfVoice: 0}, {brandMentioned: true, shareOfVoice: 50})
            expect(changes.some(c => c.includes("n'est plus cité"))).toBe(true)
        })

        it('flags the brand appearing', () => {
            const changes = detectChanges(item, {brandMentioned: true, shareOfVoice: 40}, {brandMentioned: false, shareOfVoice: 0})
            expect(changes.some(c => c.includes('désormais cité'))).toBe(true)
        })

        it('flags a large share-of-voice drop', () => {
            const changes = detectChanges(item, {brandMentioned: true, shareOfVoice: 30}, {brandMentioned: true, shareOfVoice: 60})
            expect(changes.some(c => c.includes('baisse'))).toBe(true)
        })

        it('returns no changes without a previous run', () => {
            expect(detectChanges(item, {brandMentioned: true, shareOfVoice: 50}, null)).toEqual([])
        })

        it('returns no changes for a stable result', () => {
            expect(detectChanges(item, {brandMentioned: true, shareOfVoice: 55}, {brandMentioned: true, shareOfVoice: 60})).toEqual([])
        })
    })
})
