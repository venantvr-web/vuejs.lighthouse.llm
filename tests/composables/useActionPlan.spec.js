import {describe, expect, it} from 'vitest'
import {buildActionPlan, estimateEffort, estimateImpact} from '@/composables/useActionPlan'

describe('useActionPlan - prioritization', () => {
    describe('estimateImpact', () => {
        it('rises as the score worsens', () => {
            const low = estimateImpact({score: 0.9, savings: {ms: 0}})
            const high = estimateImpact({score: 0.1, savings: {ms: 0}})
            expect(high).toBeGreaterThan(low)
        })

        it('adds a bonus for time savings', () => {
            const noSavings = estimateImpact({score: 0.5, savings: {ms: 0}})
            const withSavings = estimateImpact({score: 0.5, savings: {ms: 2000}})
            expect(withSavings).toBeGreaterThan(noSavings)
        })

        it('treats a null score as medium severity', () => {
            expect(estimateImpact({score: null, savings: {}})).toBe(35)
        })

        it('clamps to 0-100', () => {
            const v = estimateImpact({score: 0, savings: {ms: 100000}})
            expect(v).toBeLessThanOrEqual(100)
            expect(v).toBeGreaterThanOrEqual(0)
        })
    })

    describe('estimateEffort', () => {
        it('uses the heuristic map', () => {
            expect(estimateEffort({id: 'uses-text-compression'})).toBe(1)
            expect(estimateEffort({id: 'bootup-time'})).toBe(3)
        })

        it('falls back to medium effort for unknown audits', () => {
            expect(estimateEffort({id: 'some-unknown-audit'})).toBe(2)
        })
    })

    describe('buildActionPlan', () => {
        const opportunities = [
            {id: 'uses-text-compression', title: 'Compression', score: 0.2, savings: {ms: 1500}}, // high impact, low effort
            {id: 'bootup-time', title: 'JS execution', score: 0.2, savings: {ms: 1500}},          // high impact, high effort
            {id: 'document-title', title: 'Already good', score: 1, savings: {ms: 0}}             // passing -> excluded
        ]

        it('excludes passing audits (score === 1)', () => {
            const plan = buildActionPlan(opportunities)
            expect(plan.find(t => t.id === 'document-title')).toBeUndefined()
        })

        it('ranks low-effort high-impact items first', () => {
            const plan = buildActionPlan(opportunities)
            expect(plan[0].id).toBe('uses-text-compression')
        })

        it('labels impact and effort and computes a priority', () => {
            const plan = buildActionPlan(opportunities)
            const ticket = plan[0]
            expect(ticket.impactLabel).toBeTruthy()
            expect(ticket.effortLabel).toBe('faible')
            expect(ticket.priority).toBeGreaterThan(0)
        })

        it('respects the limit option', () => {
            const many = Array.from({length: 20}, (_, i) => ({id: `a${i}`, title: `A${i}`, score: 0.5, savings: {ms: 100}}))
            expect(buildActionPlan(many, {limit: 5})).toHaveLength(5)
        })
    })
})
