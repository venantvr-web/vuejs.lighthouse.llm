import {describe, expect, it} from 'vitest'
import {
    analyzeResponse,
    countOccurrences,
    detectChanges,
    computeGeoScore,
    escapeRegExp,
    extractEmerging,
    extractSources,
    groupRunsByProvider,
    normalizeSentiment,
    parseBrandList,
    parseExtraction
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

        it('aggregates cited sources across engines', () => {
            const g = groupRunsByProvider([
                {provider: 'openai', timestamp: 20, brandMentioned: true, shareOfVoice: 50, sources: [{host: 'wikipedia.org', count: 3}, {host: 'acme.com', count: 1}]},
                {provider: 'gemini', timestamp: 10, brandMentioned: true, shareOfVoice: 40, sources: [{host: 'wikipedia.org', count: 1}]}
            ])
            // wikipedia.org cité par 2 moteurs -> en tête
            expect(g.citedSources[0]).toEqual({host: 'wikipedia.org', engines: 2})
            expect(g.citedSources.find(s => s.host === 'acme.com').engines).toBe(1)
        })
    })

    describe('extractSources', () => {
        it('returns an empty array for blank input', () => {
            expect(extractSources('')).toEqual([])
            expect(extractSources(null)).toEqual([])
        })

        it('extracts hosts and counts occurrences, www and case ignored', () => {
            const text = 'Voir https://www.Example.com/page et http://example.com/autre ainsi que https://acme.io.'
            const sources = extractSources(text)
            // example.com cité 2 fois (www + casse fusionnés) -> en tête
            expect(sources[0]).toEqual({host: 'example.com', count: 2})
            expect(sources.find(s => s.host === 'acme.io').count).toBe(1)
        })

        it('strips trailing punctuation from URLs', () => {
            const sources = extractSources('Source : https://example.com/page).')
            expect(sources).toEqual([{host: 'example.com', count: 1}])
        })
    })

    describe('computeGeoScore', () => {
        it('returns a null score and trend with no data', () => {
            const r = computeGeoScore([])
            expect(r.score).toBeNull()
            expect(r.trend).toBeNull()
            expect(r.promptCount).toBe(0)
        })

        it('blends citation rate (60%) and share of voice (40%)', () => {
            // Two engines, both cite the brand, SoV 50 and 50 -> rate 100, sov 50
            // score = 0.6*100 + 0.4*50 = 80
            const stats = [{
                byProvider: {
                    openai: {latest: {brandMentioned: true, shareOfVoice: 50}},
                    gemini: {latest: {brandMentioned: true, shareOfVoice: 50}}
                }
            }]
            const r = computeGeoScore(stats)
            expect(r.citationRate).toBe(100)
            expect(r.avgShareOfVoice).toBe(50)
            expect(r.score).toBe(80)
            expect(r.engineRuns).toBe(2)
            expect(r.enginesCited).toBe(2)
            expect(r.promptCount).toBe(1)
        })

        it('counts an un-cited engine in the rate but not the SoV average', () => {
            // one cited (sov 40), one not cited (sov null)
            // rate = 50, avgSov = 40 -> score = 0.6*50 + 0.4*40 = 46
            const stats = [{
                byProvider: {
                    openai: {latest: {brandMentioned: true, shareOfVoice: 40}},
                    gemini: {latest: {brandMentioned: false, shareOfVoice: null}}
                }
            }]
            const r = computeGeoScore(stats)
            expect(r.citationRate).toBe(50)
            expect(r.avgShareOfVoice).toBe(40)
            expect(r.score).toBe(46)
        })

        it('computes the trend from latest vs previous runs', () => {
            const stats = [{
                byProvider: {
                    openai: {
                        latest: {brandMentioned: true, shareOfVoice: 50},   // current score 80
                        previous: {brandMentioned: false, shareOfVoice: null} // previous score 0
                    }
                }
            }]
            const r = computeGeoScore(stats)
            expect(r.score).toBe(80)
            expect(r.trend).toBe(80)
        })

        it('leaves the trend null when no previous run exists', () => {
            const stats = [{byProvider: {openai: {latest: {brandMentioned: true, shareOfVoice: 50}}}}]
            expect(computeGeoScore(stats).trend).toBeNull()
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

    describe('normalizeSentiment', () => {
        it('maps FR and EN variants', () => {
            expect(normalizeSentiment('positif')).toBe('positive')
            expect(normalizeSentiment('Positive')).toBe('positive')
            expect(normalizeSentiment('négatif')).toBe('negative')
            expect(normalizeSentiment('neutre')).toBe('neutral')
            expect(normalizeSentiment('absent')).toBe('absent')
        })

        it('returns null for unknown values', () => {
            expect(normalizeSentiment('???')).toBeNull()
            expect(normalizeSentiment('')).toBeNull()
        })
    })

    describe('parseExtraction', () => {
        it('parses the combined object', () => {
            const out = parseExtraction('```json\n{"brands":["Acme","Foo"],"sentiment":"positive"}\n```')
            expect(out.brands).toEqual(['Acme', 'Foo'])
            expect(out.sentiment).toBe('positive')
        })

        it('falls back to a bare array (no sentiment)', () => {
            const out = parseExtraction('["Acme", "Bar"]')
            expect(out.brands).toEqual(['Acme', 'Bar'])
            expect(out.sentiment).toBeNull()
        })

        it('handles garbage', () => {
            expect(parseExtraction('rien')).toEqual({brands: [], sentiment: null})
        })
    })
})
