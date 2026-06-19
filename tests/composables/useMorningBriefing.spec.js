import {describe, expect, it} from 'vitest'
import {buildDigest, summarizeDigest} from '@/composables/useMorningBriefing'

describe('useMorningBriefing - buildDigest', () => {
    it('flags a performance regression as critical', () => {
        const items = [{id: 'a', label: 'Accueil', budgets: {}}]
        const watchStats = {a: {latest: {scores: {performance: 0.7}}, deltas: {performance: -0.1}}}
        const digest = buildDigest({items, watchStats})
        expect(digest).toHaveLength(1)
        expect(digest[0]).toMatchObject({level: 'critical', site: 'Accueil'})
        expect(digest[0].message).toContain('Performance en baisse')
    })

    it('flags budget breaches as warnings', () => {
        const items = [{id: 'a', label: 'Accueil', budgets: {seo: 90}}]
        const watchStats = {a: {latest: {scores: {seo: 0.5}}, deltas: {}}}
        const digest = buildDigest({items, watchStats})
        expect(digest.some(d => d.level === 'warning' && d.message.includes('SEO'))).toBe(true)
    })

    it('flags broken URLs and readiness drops from resource snapshots', () => {
        const resourceByOrigin = {
            'https://x.com': {latest: {readiness: 40, brokenCount: 3}, previous: {readiness: 70, brokenCount: 0}}
        }
        const digest = buildDigest({resourceByOrigin})
        expect(digest.some(d => d.level === 'critical' && d.message.includes('3 URL cassées'))).toBe(true)
        expect(digest.some(d => d.level === 'warning' && d.message.includes('readiness en baisse'))).toBe(true)
    })

    it('flags a brand absent from every AI engine', () => {
        const geoItems = [{id: 'p1', brand: 'Acme', prompt: 'meilleurs outils ?'}]
        const geoStats = {p1: {providers: ['openai', 'gemini'], enginesCited: 0}}
        const digest = buildDigest({geoItems, geoStats})
        expect(digest.some(d => d.message.includes('Absente des moteurs IA'))).toBe(true)
    })

    it('does not flag a brand that is cited somewhere', () => {
        const geoItems = [{id: 'p1', brand: 'Acme', prompt: 'q'}]
        const geoStats = {p1: {providers: ['openai'], enginesCited: 1}}
        expect(buildDigest({geoItems, geoStats})).toEqual([])
    })

    it('flags a Search Console clicks drop', () => {
        const searchConsole = {
            'https://x.com': [{clicks: 60, timestamp: 20}, {clicks: 100, timestamp: 10}] // -40%
        }
        const digest = buildDigest({searchConsole})
        expect(digest.some(d => d.message.includes('Clics Search Console en baisse'))).toBe(true)
    })

    it('ignores a small Search Console variation', () => {
        const searchConsole = {
            'https://x.com': [{clicks: 95, timestamp: 20}, {clicks: 100, timestamp: 10}] // -5%
        }
        expect(buildDigest({searchConsole})).toEqual([])
    })

    it('orders critical alerts before warnings', () => {
        const items = [{id: 'a', label: 'A', budgets: {seo: 90}}]
        const watchStats = {a: {latest: {scores: {performance: 0.6, seo: 0.5}}, deltas: {performance: -0.2}}}
        const digest = buildDigest({items, watchStats})
        expect(digest[0].level).toBe('critical')
    })

    it('returns nothing when all is well', () => {
        const items = [{id: 'a', label: 'A', budgets: {performance: 50}}]
        const watchStats = {a: {latest: {scores: {performance: 0.95}}, deltas: {performance: 0.01}}}
        expect(buildDigest({items, watchStats})).toEqual([])
    })
})

describe('useMorningBriefing - summarizeDigest', () => {
    it('counts total, critical and warning', () => {
        const digest = [
            {level: 'critical', message: 'a'},
            {level: 'warning', message: 'b'},
            {level: 'warning', message: 'c'}
        ]
        expect(summarizeDigest(digest)).toEqual({total: 3, critical: 1, warning: 2})
    })

    it('handles an empty digest', () => {
        expect(summarizeDigest([])).toEqual({total: 0, critical: 0, warning: 0})
    })
})
