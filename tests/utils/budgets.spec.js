import {describe, expect, it} from 'vitest'
import {breachedCategories} from '@/utils/budgets'

describe('utils/budgets - breachedCategories', () => {
    it('returns categories below their budget', () => {
        const budgets = {performance: 90, seo: 80, accessibility: null, 'best-practices': null}
        const scores = {performance: 0.85, seo: 0.95, accessibility: 0.2}
        expect(breachedCategories(budgets, scores)).toEqual(['performance'])
    })

    it('ignores categories without a budget or score', () => {
        expect(breachedCategories({performance: 90}, {})).toEqual([])
        expect(breachedCategories({}, {performance: 0.1})).toEqual([])
    })

    it('treats a score equal to the budget as not breached', () => {
        expect(breachedCategories({performance: 90}, {performance: 0.9})).toEqual([])
    })

    it('handles missing inputs', () => {
        expect(breachedCategories(null, null)).toEqual([])
    })
})
