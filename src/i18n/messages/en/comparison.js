/**
 * "Comparison" screen texts (ComparisonView).
 */
export default {
    comparison: {
        // Page titles by mode
        titleSession: 'Compare crawl sessions',
        titleHistory: 'Compare analyses',
        titleFile: 'Compare reports',

        // Categories
        categoryPerformance: 'Performance',
        categoryAccessibility: 'Accessibility',
        categorySeo: 'SEO',
        categoryBestPractices: 'Best Practices',

        // File mode
        reportABefore: 'Report A (Before)',
        reportBAfter: 'Report B (After)',
        scoreEvolution: 'Scores evolution',
        summary: 'Summary',
        summaryAllImproved: 'Excellent progress! All scores improved or stayed stable.',
        summaryAllDeclined: 'Warning, regressions were detected across several categories.',
        summaryMixed: 'Mixed results: some categories improved, others regressed.',
        points: 'points',
        stable: 'stable',

        // Session / history mode
        noComparisonTitle: 'No comparison selected',
        selectTwoSessions: 'Select two sessions to compare them.',
        selectTwoAnalyses: 'Select two analyses to compare them.',
        backToList: 'Back to the list',

        reference: 'Reference',
        comparisonLabel: 'Comparison',
        before: 'Before: {score}',
        templateComparison: 'Comparison by template',

        improvementOne: 'Improvement',
        improvementMany: 'Improvements',
        stableOne: 'Stable',
        stableMany: 'Stable',
        regressionOne: 'Regression',
        regressionMany: 'Regressions',

        unknownUrl: 'Unknown URL',

        // Template comparison table (TemplateComparisonTable)
        templateHeader: 'Template',
        evolution: 'Evolution',
        statusNew: 'New',
        statusRemoved: 'Removed',
        pages: 'pages',
        noTemplates: 'No template to compare',

        // Session card (SessionComparisonCard)
        unknownDomain: 'Unknown domain',
        pagesLabel: 'Pages:',
        averageLabel: 'Average:'
    }
}
