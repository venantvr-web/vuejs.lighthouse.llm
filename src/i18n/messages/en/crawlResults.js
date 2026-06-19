/**
 * Texts for the "Crawl Results" screen (CrawlResultsView).
 */
export default {
    crawlResults: {
        headerTitle: 'Crawl results',
        headerSubtitle: '{domain} - {count} pages analyzed',
        exportJsonTooltip: 'Export to JSON',
        exportPdfTooltip: 'Export to PDF',
        history: 'History',
        newCrawl: 'New crawl',

        errorTitle: 'Error',
        sessionNotFound: 'Session not found',
        noSession: 'No session found',
        startCrawl: 'Start a crawl',

        // Session info
        mode: 'Mode',
        service: 'Service',
        strategy: 'Strategy',

        // Scores
        aggregateTitle: 'Aggregated domain scores',
        minMax: 'Min: {min} / Max: {max}',
        templatesTitle: 'Scores by template',
        pageCountSingular: '({count} page)',
        pageCountPlural: '({count} pages)',

        // Per-page detail
        detailTitle: 'Per-page detail',
        detailFilter: '(filter: {template})',
        seeAll: 'See all',
        noUrlForFilter: 'No URL found for this filter.',

        // Table headers
        colUrl: 'URL',
        colTemplate: 'Template',
        colPerf: 'Perf',
        colA11y: 'A11y',
        colBp: 'BP',
        colSeo: 'SEO',
        colPwa: 'PWA',

        // PDF
        pdfTitle: 'Lighthouse Crawl Report',
        pdfDomain: 'Domain: {domain}',
        pdfBaseUrl: 'Base URL: {url}',
        pdfDate: 'Date: {date}',
        pdfPagesAnalyzed: 'Pages analyzed: {analyzed}/{total}',
        pdfServiceStrategy: 'Service: {service} | Strategy: {strategy}',
        pdfAggregateScores: 'Aggregated scores',
        pdfScoresByTemplate: 'Scores by template',
        pdfTemplateLine: '{name} ({count} pages)',
        pdfDetailByPage: 'Per-page detail'
    }
}
