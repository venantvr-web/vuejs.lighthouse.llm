/**
 * Prompts module main export
 * Provides template engines (Handlebars-style and Jinja2-style), registry, and all prompt templates
 */

// Template Engines
export { PromptTemplateEngine } from './PromptTemplateEngine.js'
export { J2TemplateEngine } from './J2TemplateEngine.js'
export { PromptRegistry } from './PromptRegistry.js'

// Legacy Handlebars-style templates
export {
  performancePrompts,
  seoPrompts,
  accessibilityPrompts,
  bestPracticesPrompts,
  pwaPrompts,
  comparisonPrompts,
  allTemplates
} from './templates/index.js'

// Jinja2-style templates (recommended)
export {
  performancePrompts as performancePromptsJ2,
  seoPrompts as seoPromptsJ2,
  accessibilityPrompts as accessibilityPromptsJ2,
  bestPracticesPrompts as bestPracticesPromptsJ2,
  pwaPrompts as pwaPromptsJ2,
  categoryMeta
} from './templates/index.j2.js'

/**
 * Initialize and populate a registry with all prompts
 * @returns {PromptRegistry} Populated registry
 */
export function createPopulatedRegistry() {
  const registry = new PromptRegistry()

  // Import all templates
  import('./templates/performance.js').then(({ performancePrompts }) => {
    Object.entries(performancePrompts).forEach(([key, config]) => {
      registry.register(`performance.${key}`, config)
    })
  })

  import('./templates/seo.js').then(({ seoPrompts }) => {
    Object.entries(seoPrompts).forEach(([key, config]) => {
      registry.register(`seo.${key}`, config)
    })
  })

  import('./templates/accessibility.js').then(({ accessibilityPrompts }) => {
    Object.entries(accessibilityPrompts).forEach(([key, config]) => {
      registry.register(`accessibility.${key}`, config)
    })
  })

  import('./templates/bestPractices.js').then(({ bestPracticesPrompts }) => {
    Object.entries(bestPracticesPrompts).forEach(([key, config]) => {
      registry.register(`bestPractices.${key}`, config)
    })
  })

  import('./templates/pwa.js').then(({ pwaPrompts }) => {
    Object.entries(pwaPrompts).forEach(([key, config]) => {
      registry.register(`pwa.${key}`, config)
    })
  })

  import('./templates/comparison.js').then(({ comparisonPrompts }) => {
    Object.entries(comparisonPrompts).forEach(([key, config]) => {
      registry.register(`comparison.${key}`, config)
    })
  })

  return registry
}

/**
 * Create a template engine with custom helpers
 * @param {Object} customHelpers - Optional custom helper functions
 * @returns {PromptTemplateEngine}
 */
export function createTemplateEngine(customHelpers = {}) {
  const engine = new PromptTemplateEngine()

  // Register custom helpers
  Object.entries(customHelpers).forEach(([name, fn]) => {
    engine.registerHelper(name, fn)
  })

  return engine
}

export default {
  PromptTemplateEngine,
  PromptRegistry,
  createPopulatedRegistry,
  createTemplateEngine
}
