import {describe, expect, it} from 'vitest'
import {analyzeAudit, computeDeltas, extractScores} from '@/composables/useWatchlist'

describe('useWatchlist - pure logic', () => {
    describe('extractScores', () => {
        it('maps category scores from a report', () => {
            const report = {
                categories: {
                    performance: {score: 0.9},
                    seo: {score: 0.8}
                }
            }
            expect(extractScores(report)).toEqual({performance: 0.9, seo: 0.8})
        })

        it('returns an empty object for a report without categories', () => {
            expect(extractScores({})).toEqual({})
            expect(extractScores(null)).toEqual({})
        })
    })

    describe('computeDeltas', () => {
        it('computes per-category deltas', () => {
            const latest = {scores: {performance: 0.8, seo: 0.95}}
            const previous = {scores: {performance: 0.9, seo: 0.9}}
            const deltas = computeDeltas(latest, previous)
            expect(deltas.performance).toBeCloseTo(-0.1)
            expect(deltas.seo).toBeCloseTo(0.05)
        })

        it('skips categories missing on either side', () => {
            const latest = {scores: {performance: 0.8}}
            const previous = {scores: {seo: 0.9}}
            expect(computeDeltas(latest, previous)).toEqual({})
        })

        it('returns empty when an entry is missing', () => {
            expect(computeDeltas(null, {scores: {}})).toEqual({})
        })
    })

    describe('analyzeAudit', () => {
        const item = {budgets: {performance: 90, accessibility: null, 'best-practices': null, seo: null}}

        it('detects a regression beyond the threshold', () => {
            const latest = {scores: {performance: 0.80}}
            const previous = {scores: {performance: 0.90}}
            const {regressions} = analyzeAudit(item, latest, previous)
            expect(regressions).toHaveLength(1)
            expect(regressions[0]).toMatchObject({category: 'performance', from: 90, to: 80, delta: -10})
        })

        it('ignores a drop smaller than the threshold', () => {
            const latest = {scores: {performance: 0.89}}
            const previous = {scores: {performance: 0.90}}
            const {regressions} = analyzeAudit(item, latest, previous)
            expect(regressions).toHaveLength(0)
        })

        it('does not flag an improvement as a regression', () => {
            const latest = {scores: {performance: 0.95}}
            const previous = {scores: {performance: 0.80}}
            const {regressions} = analyzeAudit(item, latest, previous)
            expect(regressions).toHaveLength(0)
        })

        it('detects a budget breach', () => {
            const latest = {scores: {performance: 0.85}}
            const {breaches} = analyzeAudit(item, latest, null)
            expect(breaches).toHaveLength(1)
            expect(breaches[0]).toMatchObject({category: 'performance', score: 85, budget: 90})
        })

        it('does not breach when the score meets the budget', () => {
            const latest = {scores: {performance: 0.90}}
            const {breaches} = analyzeAudit(item, latest, null)
            expect(breaches).toHaveLength(0)
        })

        it('ignores categories without a configured budget', () => {
            const latest = {scores: {seo: 0.10}}
            const {breaches} = analyzeAudit(item, latest, null)
            expect(breaches).toHaveLength(0)
        })
    })
})
