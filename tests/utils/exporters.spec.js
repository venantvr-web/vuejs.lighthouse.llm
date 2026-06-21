import {describe, expect, it} from 'vitest'
import {
    aggregateCitedSources,
    aggregateEmergingCompetitors,
    buildBriefingMarkdown,
    buildBrokenUrlsCsv,
    buildGeoCsv,
    buildGeoReportMarkdown,
    buildGeoRows,
    buildWatchlistRows,
    escapeCsv,
    toCsv,
    toMarkdownTable
} from '@/utils/exporters'

describe('utils/exporters', () => {
    describe('escapeCsv', () => {
        it('quotes values containing commas, quotes or newlines', () => {
            expect(escapeCsv('a,b')).toBe('"a,b"')
            expect(escapeCsv('say "hi"')).toBe('"say ""hi"""')
            expect(escapeCsv('plain')).toBe('plain')
        })
    })

    describe('toCsv / toMarkdownTable', () => {
        const headers = ['a', 'b']
        const rows = [{a: 1, b: 'x'}, {a: 2, b: 'y,z'}]

        it('builds CSV with header and escaped cells', () => {
            expect(toCsv(headers, rows)).toBe('a,b\n1,x\n2,"y,z"')
        })

        it('builds a Markdown table', () => {
            const md = toMarkdownTable(headers, rows)
            expect(md.split('\n')[0]).toBe('| a | b |')
            expect(md).toContain('| --- | --- |')
        })
    })

    describe('buildGeoRows', () => {
        const items = [{id: 'p1', prompt: 'Best tools?', brand: 'Acme'}]
        const statsById = {
            p1: {
                providers: ['openai', 'gemini'],
                byProvider: {
                    openai: {latest: {brandMentioned: true, position: 1, shareOfVoice: 60, sentiment: 'positive'}},
                    gemini: {latest: {brandMentioned: false, position: null, shareOfVoice: 0, sentiment: 'absent'}}
                },
                emergingCompetitors: [{name: 'Zappy', engines: 1}]
            }
        }

        it('produces one row per prompt × engine with emerging competitors', () => {
            const rows = buildGeoRows(items, statsById)
            expect(rows).toHaveLength(2)
            expect(rows[0]).toMatchObject({moteur: 'openai', cite: 'oui', position: 1, partDeVoix: 60, sentiment: 'positive', concurrentsEmergents: 'Zappy'})
            expect(rows[1]).toMatchObject({moteur: 'gemini', cite: 'non'})
        })

        it('emits a single empty row for a never-run prompt', () => {
            const rows = buildGeoRows(items, {})
            expect(rows).toHaveLength(1)
            expect(rows[0].moteur).toBe('')
        })

        it('buildGeoCsv includes the header', () => {
            expect(buildGeoCsv(items, statsById).split('\n')[0]).toContain('prompt,marque,moteur')
        })
    })

    describe('buildBrokenUrlsCsv', () => {
        it('includes only broken URLs with their status', () => {
            const pages = [
                {url: 'https://x.com/a', ok: true, status: 200},
                {url: 'https://x.com/b', ok: false, status: 404},
                {url: 'https://x.com/c', ok: false, status: 0}
            ]
            const csv = buildBrokenUrlsCsv(pages)
            const lines = csv.split('\n')
            expect(lines[0]).toBe('url,statut')
            expect(lines).toHaveLength(3) // header + 2 broken
            expect(csv).toContain('https://x.com/b,404')
            expect(csv).toContain('https://x.com/c,erreur')
        })
    })

    describe('buildBriefingMarkdown', () => {
        it('renders the overview, digest and sites table', () => {
            const md = buildBriefingMarkdown({
                date: new Date('2026-06-18T08:00:00Z'),
                overview: {sites: 2, avgPerf: 0.82, toHandle: 1, avgReadiness: 70},
                digest: [{level: 'critical', site: 'Accueil', message: 'Performance en baisse (-10 pts)'}],
                items: [{id: 'a', label: 'Accueil'}],
                watchStats: {a: {latest: {scores: {performance: 0.8}}, deltas: {performance: -0.1}}}
            })
            expect(md).toContain('# Briefing du matin')
            expect(md).toContain('Performance moyenne : 82')
            expect(md).toContain('🔴 **Accueil**')
            expect(md).toContain('| page | performance | delta |')
            expect(md).toContain('-10')
        })

        it('states when there is nothing to handle', () => {
            const md = buildBriefingMarkdown({digest: [], items: []})
            expect(md).toContain('Rien à signaler.')
        })
    })

    describe('buildWatchlistRows', () => {
        it('converts 0-1 scores to percentages', () => {
            const items = [{id: 'w1', label: 'Home', url: 'https://x.com', strategy: 'mobile', source: 'pagespeed'}]
            const statsById = {w1: {latest: {timestamp: 0, scores: {performance: 0.9, seo: 0.5}}}}
            const rows = buildWatchlistRows(items, statsById)
            expect(rows[0]).toMatchObject({libelle: 'Home', performance: 90, seo: 50})
            expect(rows[0].accessibilite).toBe('')
        })
    })

    describe('aggregateCitedSources', () => {
        it('sums engines and prompts per host across prompts', () => {
            const items = [{id: 'p1'}, {id: 'p2'}]
            const statsById = {
                p1: {citedSources: [{host: 'acme.com', engines: 2}, {host: 'wiki.org', engines: 1}]},
                p2: {citedSources: [{host: 'acme.com', engines: 1}]}
            }
            const agg = aggregateCitedSources(items, statsById)
            expect(agg[0]).toEqual({host: 'acme.com', engines: 3, prompts: 2})
            expect(agg.find(s => s.host === 'wiki.org')).toEqual({host: 'wiki.org', engines: 1, prompts: 1})
        })
    })

    describe('aggregateEmergingCompetitors', () => {
        it('counts the prompts each competitor surfaced in', () => {
            const items = [{id: 'p1'}, {id: 'p2'}]
            const statsById = {
                p1: {emergingCompetitors: [{name: 'Zappy'}]},
                p2: {emergingCompetitors: [{name: 'Zappy'}, {name: 'Nuxo'}]}
            }
            const agg = aggregateEmergingCompetitors(items, statsById)
            expect(agg[0]).toEqual({name: 'Zappy', prompts: 2})
        })
    })

    describe('buildGeoReportMarkdown', () => {
        const items = [{id: 'p1', prompt: 'Meilleur CRM ?', brand: 'Acme'}]
        const statsById = {
            p1: {
                providers: ['perplexity'],
                byProvider: {perplexity: {latest: {brandMentioned: true, position: 1, shareOfVoice: 60, sentiment: 'positive'}}},
                citedSources: [{host: 'acme.com', engines: 1}, {host: 'competitor.io', engines: 1}],
                emergingCompetitors: [{name: 'Nuxo'}]
            }
        }
        const score = {score: 75, citationRate: 100, avgShareOfVoice: 60, enginesCited: 1, engineRuns: 1, promptCount: 1, trend: 10}

        it('renders the executive summary with score and methodology', () => {
            const md = buildGeoReportMarkdown({brand: 'Acme', domain: 'https://acme.com/', score, items, statsById})
            expect(md).toContain('# Rapport de visibilité GEO — Acme')
            expect(md).toContain('**Score GEO : 75/100**')
            expect(md).toContain('en hausse de 10 pts')
            expect(md).toContain('Méthodologie')
        })

        it('highlights the tracked domain among cited sources', () => {
            const md = buildGeoReportMarkdown({brand: 'Acme', domain: 'https://acme.com/', score, items, statsById})
            expect(md).toMatch(/acme\.com.*votre site/)
            expect(md).toContain('competitor.io')
        })

        it('flags when the tracked domain is not cited', () => {
            const stats2 = {p1: {...statsById.p1, citedSources: [{host: 'competitor.io', engines: 1}]}}
            const md = buildGeoReportMarkdown({brand: 'Acme', domain: 'https://acme.com/', score, items, statsById: stats2})
            expect(md).toContain('n\'apparaît pas parmi les sources citées')
        })

        it('handles the no-data case gracefully', () => {
            const md = buildGeoReportMarkdown({brand: 'Acme', score: {score: null}, items: [], statsById: {}})
            expect(md).toContain('Aucune analyse exécutée')
            expect(md).toContain('Lancez des analyses')
        })
    })
})
