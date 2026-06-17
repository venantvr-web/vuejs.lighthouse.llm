/**
 * Performance budget helpers for the watchlist.
 * @module utils/budgets
 */

/** Categories that can carry a performance budget. */
export const BUDGET_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']

/**
 * Return the categories whose latest score (0-1) is below the configured
 * budget (0-100).
 * @param {object} budgets - Per-category budgets (0-100 or null)
 * @param {object} scores - Per-category scores (0-1)
 * @returns {string[]} Breached category ids
 */
export function breachedCategories(budgets, scores) {
    if (!budgets || !scores) return []
    return BUDGET_CATEGORIES.filter(id => {
        const budget = budgets[id]
        const score = scores[id]
        return typeof budget === 'number' && typeof score === 'number' && Math.round(score * 100) < budget
    })
}
