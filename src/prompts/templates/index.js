/**
 * Template exports
 * Centralized export for all prompt templates
 */

export { performancePrompts } from './performance.js'
export { seoPrompts } from './seo.js'
export { accessibilityPrompts } from './accessibility.js'
export { bestPracticesPrompts } from './bestPractices.js'
export { pwaPrompts } from './pwa.js'
export { comparisonPrompts } from './comparison.js'

/**
 * All templates grouped by category
 */
export const allTemplates = {
  performance: () => import('./performance.js').then(m => m.performancePrompts),
  seo: () => import('./seo.js').then(m => m.seoPrompts),
  accessibility: () => import('./accessibility.js').then(m => m.accessibilityPrompts),
  bestPractices: () => import('./bestPractices.js').then(m => m.bestPracticesPrompts),
  pwa: () => import('./pwa.js').then(m => m.pwaPrompts),
  comparison: () => import('./comparison.js').then(m => m.comparisonPrompts)
}
