/**
 * Prompts module main export
 * Provides J2 (Jinja2-style) template engine, registry, and all prompt templates
 */

// Template Engine (J2 only - legacy PromptTemplateEngine removed)
export {J2TemplateEngine} from './J2TemplateEngine.js'
export {PromptRegistry} from './PromptRegistry.js'

// Jinja2-style templates
export {
    performancePrompts,
    seoPrompts,
    accessibilityPrompts,
    bestPracticesPrompts,
    pwaPrompts,
    categoryMeta
} from './templates/index.j2.js'

// Template registry
export {templateRegistry} from './templates/j2/registry.js'

/**
 * Create a J2 template engine with custom filters
 * @param {Object} customFilters - Optional custom filter functions
 * @returns {J2TemplateEngine}
 */
export function createTemplateEngine(customFilters = {}) {
    const {J2TemplateEngine} = require('./J2TemplateEngine.js')
    const engine = new J2TemplateEngine()

    // Register custom filters
    Object.entries(customFilters).forEach(([name, fn]) => {
        engine.registerFilter(name, fn)
    })

    return engine
}

export default {
    J2TemplateEngine,
    PromptRegistry,
    createTemplateEngine
}
