/**
 * Example usage of Prompt Template Engine and Registry
 * Demonstrates how to use the prompts system with Lighthouse data
 */

import {PromptRegistry, PromptTemplateEngine} from './index.js'
import {accessibilityPrompts, bestPracticesPrompts, comparisonPrompts, performancePrompts, pwaPrompts, seoPrompts} from './templates/index.js'

// Example Lighthouse data structure
const exampleLighthouseData = {
    finalUrl: 'https://example.com',
    categories: {
        performance: {score: 0.78},
        accessibility: {score: 0.92},
        'best-practices': {score: 0.85},
        seo: {score: 0.88},
        pwa: {score: 0.45}
    },
    audits: {
        'largest-contentful-paint': {numericValue: 4200},
        'cumulative-layout-shift': {numericValue: 0.15},
        'total-blocking-time': {numericValue: 350},
        'interaction-to-next-paint': {numericValue: 180},
        'first-contentful-paint': {numericValue: 2100},
        'speed-index': {numericValue: 3800},
        'interactive': {numericValue: 4500}
    }
}

// Example 1: Basic Template Compilation
function example1_BasicCompilation() {
    console.log('\n=== Example 1: Basic Template Compilation ===\n')

    const engine = new PromptTemplateEngine()

    const template = `
# Analyse Performance - {{url}}

Score: {{formatScore:score}}

## Core Web Vitals
- LCP: {{formatMetric:lcp}}
- CLS: {{cls}}
- TBT: {{formatMetric:tbt}}
`

    const result = engine.compile(template, {
        url: 'example.com',
        score: 0.78,
        lcp: 4200,
        cls: 0.15,
        tbt: 350
    })

    console.log(result)
}

// Example 2: Using Registry with Performance Prompts
function example2_RegistryUsage() {
    console.log('\n=== Example 2: Using Registry ===\n')

    const registry = new PromptRegistry()
    const engine = new PromptTemplateEngine()

    // Register all performance prompts
    Object.entries(performancePrompts).forEach(([key, config]) => {
        registry.register(`performance.${key}`, config)
    })

    // Get a specific prompt
    const promptConfig = registry.get('performance.quickAnalysis')
    console.log('Prompt name:', promptConfig.name)
    console.log('Description:', promptConfig.description)
    console.log('Required variables:', promptConfig.variables)

    // Compile the prompt with real data
    const compiled = engine.compile(promptConfig.template, {
        url: exampleLighthouseData.finalUrl,
        score: exampleLighthouseData.categories.performance.score,
        lcp: exampleLighthouseData.audits['largest-contentful-paint'].numericValue,
        cls: exampleLighthouseData.audits['cumulative-layout-shift'].numericValue,
        tbt: exampleLighthouseData.audits['total-blocking-time'].numericValue,
        inp: exampleLighthouseData.audits['interaction-to-next-paint'].numericValue,
        fcp: exampleLighthouseData.audits['first-contentful-paint'].numericValue,
        si: exampleLighthouseData.audits['speed-index'].numericValue,
        tti: exampleLighthouseData.audits['interactive'].numericValue
    })

    console.log('\nCompiled prompt (first 500 chars):')
    console.log(compiled.substring(0, 500) + '...')
}

// Example 3: Custom Helpers
function example3_CustomHelpers() {
    console.log('\n=== Example 3: Custom Helpers ===\n')

    const engine = new PromptTemplateEngine()

    // Register custom helper
    engine.registerHelper('highlight', (value) => {
        if (value >= 0.9) return `🟢 ${value}`
        if (value >= 0.5) return `🟡 ${value}`
        return `🔴 ${value}`
    })

    const template = `
Scores:
- Performance: {{highlight:performance}}
- Accessibility: {{highlight:accessibility}}
- SEO: {{highlight:seo}}
`

    const result = engine.compile(template, {
        performance: 0.78,
        accessibility: 0.92,
        seo: 0.45
    })

    console.log(result)
}

// Example 4: Conditionals and Loops
function example4_ConditionalsAndLoops() {
    console.log('\n=== Example 4: Conditionals and Loops ===\n')

    const engine = new PromptTemplateEngine()

    const template = `
# Analyse

{{#if hasIssues}}
## Problèmes détectés:
{{#each issues}}
- [{{this.severity}}] {{this.title}}
{{/each}}
{{/if}}

{{#if recommendations}}
## Recommandations:
{{listItems:recommendations}}
{{/if}}
`

    const result = engine.compile(template, {
        hasIssues: true,
        issues: [
            {severity: 'HIGH', title: 'Images non optimisées'},
            {severity: 'MEDIUM', title: 'Cache manquant'},
            {severity: 'LOW', title: 'Console warnings'}
        ],
        recommendations: [
            'Implémenter lazy-loading',
            'Ajouter cache headers',
            'Minifier JavaScript'
        ]
    })

    console.log(result)
}

// Example 5: Search and Filter
function example5_SearchAndFilter() {
    console.log('\n=== Example 5: Search and Filter ===\n')

    const registry = new PromptRegistry()

    // Register prompts from multiple categories
    Object.entries(performancePrompts).forEach(([key, config]) => {
        registry.register(`performance.${key}`, config)
    })
    Object.entries(seoPrompts).forEach(([key, config]) => {
        registry.register(`seo.${key}`, config)
    })
    Object.entries(accessibilityPrompts).forEach(([key, config]) => {
        registry.register(`accessibility.${key}`, config)
    })

    // Search by keyword
    console.log('Search "quick":')
    const quickPrompts = registry.search('quick')
    quickPrompts.forEach(p => {
        console.log(`  - ${p.id}: ${p.name} (${p.category})`)
    })

    // Get by category
    console.log('\nSEO prompts:')
    const seoPromptsList = registry.getByCategory('seo')
    seoPromptsList.forEach(p => {
        console.log(`  - ${p.id}: ${p.name}`)
    })

    // Get by strategy
    console.log('\nDeep analysis prompts:')
    const deepPrompts = registry.getByStrategy('deep')
    deepPrompts.forEach(p => {
        console.log(`  - ${p.id}: ${p.name} (${p.category})`)
    })

    // Get stats
    console.log('\nRegistry stats:')
    console.log(registry.getStats())
}

// Example 6: Complete Workflow with Lighthouse Data
function example6_CompleteWorkflow() {
    console.log('\n=== Example 6: Complete Workflow ===\n')

    const registry = new PromptRegistry()
    const engine = new PromptTemplateEngine()

    // Register all prompts
    const allPrompts = {
        performance: performancePrompts,
        seo: seoPrompts,
        accessibility: accessibilityPrompts,
        bestPractices: bestPracticesPrompts,
        pwa: pwaPrompts,
        comparison: comparisonPrompts
    }

    Object.entries(allPrompts).forEach(([category, prompts]) => {
        Object.entries(prompts).forEach(([key, config]) => {
            registry.register(`${category}.${key}`, config)
        })
    })

    console.log('Total prompts registered:', registry.getAll().length)
    console.log('Categories:', registry.getCategories())

    // Simulate analyzing different aspects
    const aspects = ['performance', 'seo', 'accessibility']

    aspects.forEach(aspect => {
        const promptId = `${aspect}.quickAnalysis`
        const prompt = registry.get(promptId)

        if (prompt) {
            console.log(`\n[${aspect.toUpperCase()}] ${prompt.name}`)
            console.log(`Strategy: ${prompt.strategy}`)
            console.log(`Variables needed: ${prompt.variables.join(', ')}`)
        }
    })
}

// Example 7: Comparison Prompts
function example7_ComparisonPrompts() {
    console.log('\n=== Example 7: Comparison Prompts ===\n')

    const engine = new PromptTemplateEngine()
    const registry = new PromptRegistry()

    Object.entries(comparisonPrompts).forEach(([key, config]) => {
        registry.register(`comparison.${key}`, config)
    })

    const evolutionPrompt = registry.get('comparison.evolutionAnalysis')

    const beforeData = {
        performance: 0.65,
        accessibility: 0.88,
        seo: 0.82
    }

    const afterData = {
        performance: 0.78,
        accessibility: 0.92,
        seo: 0.85
    }

    const compiled = engine.compile(evolutionPrompt.template, {
        url: 'example.com',
        beforeDate: '2024-01-01',
        afterDate: '2024-02-01',
        beforeScores: beforeData,
        afterScores: afterData,
        performanceImproved: true,
        performanceDiff: 13,
        accessibilityImproved: true,
        accessibilityDiff: 4,
        seoImproved: true,
        seoDiff: 3,
        improvements: [
            {title: 'LCP amélioré de 50%', severity: 'high'},
            {title: 'Images optimisées', severity: 'medium'}
        ],
        noRegressions: true
    })

    console.log('Evolution analysis (first 800 chars):')
    console.log(compiled.substring(0, 800) + '...')
}

// Run all examples
function runAllExamples() {
    console.log('='.repeat(60))
    console.log('Prompt Template Engine & Registry - Examples')
    console.log('='.repeat(60))

    example1_BasicCompilation()
    example2_RegistryUsage()
    example3_CustomHelpers()
    example4_ConditionalsAndLoops()
    example5_SearchAndFilter()
    example6_CompleteWorkflow()
    example7_ComparisonPrompts()

    console.log('\n' + '='.repeat(60))
    console.log('All examples completed!')
    console.log('='.repeat(60) + '\n')
}

// Export for use
export {
    example1_BasicCompilation,
    example2_RegistryUsage,
    example3_CustomHelpers,
    example4_ConditionalsAndLoops,
    example5_SearchAndFilter,
    example6_CompleteWorkflow,
    example7_ComparisonPrompts,
    runAllExamples
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllExamples()
}
