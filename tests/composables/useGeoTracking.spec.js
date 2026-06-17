import {describe, expect, it} from 'vitest'
import {
    analyzeResponse,
    countOccurrences,
    detectChanges,
    escapeRegExp,
    extractEmerging,
    groupRunsByProvider,
    parseBrandList
} from '@/composables/useGeoTracking'

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

    describe('groupRunsByProvider', () => {
        // newest-first runs across two providers
        const runs = [
            {provider: 'openai', timestamp: 40, brandMentioned: true, shareOfVoice: 60, model: 'gpt'},
            {provider: 'gemini', timestamp: 30, brandMentioned: false, shareOfVoice: 0, model: 'gem'},
            {provider: 'openai', timestamp: 20, brandMentioned: true, shareOfVoice: 50, model: 'gpt'},
            {provider: 'gemini', timestamp: 10, brandMentioned: false, shareOfVoice: 0, model: 'gem'}
        ]

        it('groups runs and exposes latest/previous per provider', () => {
            const g = groupRunsByProvider(runs)
            expect(g.providers.sort()).toEqual(['gemini', 'openai'])
            expect(g.byProvider.openai.latest.shareOfVoice).toBe(60)
            expect(g.byProvider.openai.previous.shareOfVoice).toBe(50)
        })

        it('counts engines citing the brand and averages share of voice', () => {
            const g = groupRunsByProvider(runs)
            expect(g.engineCount).toBe(2)
            expect(g.enginesCited).toBe(1)        // only openai's latest mentions
            expect(g.avgShareOfVoice).toBe(30)    // (60 + 0) / 2
            expect(g.lastRunAt).toBe(40)
        })

        it('builds an oldest-first sparkline per provider', () => {
            const g = groupRunsByProvider(runs)
            expect(g.byProvider.openai.sparkline).toEqual([50, 60])
        })

        it('handles no runs', () => {
            const g = groupRunsByProvider([])
            expect(g.providers).toEqual([])
            expect(g.avgShareOfVoice).toBeNull()
            expect(g.lastRunAt).toBeNull()
        })

        it('aggregates emerging competitors across engines', () => {
            const g = groupRunsByProvider([
                {provider: 'openai', timestamp: 20, brandMentioned: true, shareOfVoice: 50, emergingCompetitors: ['Zappy', 'Nuxo']},
                {provider: 'gemini', timestamp: 10, brandMentioned: true, shareOfVoice: 40, emergingCompetitors: ['Zappy']}
            ])
            // Zappy cited by 2 engines -> ranked first
            expect(g.emergingCompetitors[0]).toEqual({name: 'Zappy', engines: 2})
            expect(g.emergingCompetitors.find(e => e.name === 'Nuxo').engines).toBe(1)
        })
    })

    describe('parseBrandList', () => {
        it('parses a plain JSON array', () => {
            expect(parseBrandList('["Acme", "Foo"]')).toEqual(['Acme', 'Foo'])
        })

        it('tolerates code fences and surrounding text', () => {
            expect(parseBrandList('Voici : ```json\n["Acme", "Bar"]\n``` voilà')).toEqual(['Acme', 'Bar'])
        })

        it('returns empty on invalid content', () => {
            expect(parseBrandList('pas de liste ici')).toEqual([])
            expect(parseBrandList('')).toEqual([])
        })
    })

    describe('extractEmerging', () => {
        it('removes the brand and known competitors (case-insensitive)', () => {
            const names = ['Acme', 'foo', 'Zappy', 'Nuxo', 'zappy']
            expect(extractEmerging(names, 'Acme', ['Foo'])).toEqual(['Zappy', 'Nuxo'])
        })

        it('ignores 1-character tokens', () => {
            expect(extractEmerging(['X', 'Ok'], 'Acme', [])).toEqual(['Ok'])
        })
    })
})
