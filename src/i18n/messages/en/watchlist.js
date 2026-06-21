/**
 * Watchlist screen texts (daily page health tracking).
 */
export default {
    watchlist: {
        // Header
        title: 'Watchlist',
        subtitle: 'Daily health tracking of your pages',
        enableAlertsTitle: 'Receive a browser alert on regression or budget breach',
        enableAlerts: 'Enable alerts',
        alertsActiveTitle: 'Browser alerts are enabled',
        alertsActive: 'Alerts active',
        exportCsvTitle: 'Export to CSV',
        refreshAll: 'Re-audit all',
        refreshingAll: 'Analyzing…',
        // Add form
        fieldUrl: 'URL to monitor:',
        fieldLabel: 'Label (optional):',
        fieldStrategy: 'Device:',
        fieldSource: 'Analysis engine:',
        addFormHelp: 'Add a page to track daily: choose the device (mobile/desktop) and the analysis engine.',
        urlPlaceholder: 'https://example.com/page',
        labelPlaceholder: 'Name (optional)',
        sourcePagespeed: 'PageSpeed',
        sourceLocal: 'Local Chromium',
        add: 'Add',
        // Summary
        pagesTracked: 'Pages tracked',
        avgPerf: 'Avg. perf.',
        regressions: 'Regressions',
        budgetBreaches: 'Budgets exceeded',
        neverAudited: 'Never audited',
        // Empty state
        emptyTitle: 'No page tracked',
        emptyText: 'Add the URLs you want to monitor daily. Each re-audit is compared to the previous one to detect regressions.',
        // Categories
        categoryPerformance: 'Performance',
        categoryAccessibility: 'Accessibility',
        categoryBestPractices: 'Best practices',
        categorySeo: 'SEO',
        // Messages (JS)
        errorUrlRequired: 'Please enter a URL.',
        errorUrlExists: 'This URL is already tracked.',
        errorUrlInvalid: 'Invalid URL.',
        confirmRemove: 'Remove “{label}” from the watchlist?',
        notifyRegression: '{category}: {from} → {to} ({delta})',
        notifyBreach: '{category} below budget ({score} < {budget})',
        // WatchlistCard
        catPerfShort: 'Perf.',
        catA11yShort: 'A11y',
        catPracticesShort: 'Practices',
        catSeoShort: 'SEO',
        sourceLocalShort: 'Chromium',
        budgetsTitle: 'Performance budgets',
        removeTitle: 'Remove',
        budgetsLabel: 'Budgets (minimum score):',
        budgetNotMet: 'Budget {value} not met',
        perfTrend: 'Performance trend',
        audited: 'Checked {time}',
        reaudit: 'Re-audit'
    }
}
