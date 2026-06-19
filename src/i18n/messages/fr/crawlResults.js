/**
 * Textes de l'écran « Résultats du crawl » (CrawlResultsView).
 */
export default {
    crawlResults: {
        headerTitle: 'Résultats du crawl',
        headerSubtitle: '{domain} - {count} pages analysées',
        exportJsonTooltip: 'Exporter en JSON',
        exportPdfTooltip: 'Exporter en PDF',
        history: 'Historique',
        newCrawl: 'Nouveau crawl',

        errorTitle: 'Erreur',
        sessionNotFound: 'Session introuvable',
        noSession: 'Aucune session trouvée',
        startCrawl: 'Lancer un crawl',

        // Infos de session
        mode: 'Mode',
        service: 'Service',
        strategy: 'Stratégie',

        // Scores
        aggregateTitle: 'Scores agrégés du domaine',
        minMax: 'Min: {min} / Max: {max}',
        templatesTitle: 'Scores par template',
        pageCountSingular: '({count} page)',
        pageCountPlural: '({count} pages)',

        // Détail par page
        detailTitle: 'Détail par page',
        detailFilter: '(filtre: {template})',
        seeAll: 'Voir tout',
        noUrlForFilter: 'Aucune URL trouvée pour ce filtre.',

        // En-têtes de tableau
        colUrl: 'URL',
        colTemplate: 'Template',
        colPerf: 'Perf',
        colA11y: 'A11y',
        colBp: 'BP',
        colSeo: 'SEO',
        colPwa: 'PWA',

        // PDF
        pdfTitle: 'Rapport de Crawl Lighthouse',
        pdfDomain: 'Domaine: {domain}',
        pdfBaseUrl: 'URL de base: {url}',
        pdfDate: 'Date: {date}',
        pdfPagesAnalyzed: 'Pages analysées: {analyzed}/{total}',
        pdfServiceStrategy: 'Service: {service} | Stratégie: {strategy}',
        pdfAggregateScores: 'Scores agrégés',
        pdfScoresByTemplate: 'Scores par template',
        pdfTemplateLine: '{name} ({count} pages)',
        pdfDetailByPage: 'Détail par page'
    }
}
