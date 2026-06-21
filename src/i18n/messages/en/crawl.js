/**
 * Texts for the "Crawl Mode" screen (CrawlView).
 */
export default {
    crawl: {
        // Header
        headerTitle: 'Crawl Mode',
        headerSubtitle: 'Multi-page analysis by template',
        guide: 'Guide',
        guideTooltip: 'User guide',
        history: 'History',
        historyTooltip: 'Crawl history',

        // HTTP relay indicator
        relayDirect: 'Direct mode (no relay) — browser requests',
        relayOkIntegrated: 'HTTP relay OK (built-in)',
        relayOkWith: 'HTTP relay OK ({base})',
        relayDown: 'HTTP relay unavailable — Auto/Sitemap modes disabled (Settings → Outbound requests, or direct mode)',
        relayChecking: 'Checking relay…',

        // Progress statuses
        statusDiscovering: 'Discovering URLs... ({count})',
        statusAnalyzing: 'Analyzing... ({done}/{total})',
        statusCompleted: 'Analysis complete!',
        statusPartial: 'Partial analysis complete',
        statusCancelled: 'Analysis cancelled',
        statusFailed: 'Analysis failed',

        // Steps
        stepDiscovery: 'Discovery',
        stepAnalysis: 'Analysis',
        discoveredUrls: 'Discovered URLs ({count})',

        // Form
        formTitle: 'Multi-page site crawler',
        formSubtitle: 'Analyze multiple pages and get aggregated scores by template',
        errorTitle: 'Crawl error',
        lastCrawl: 'Last crawl:',
        viewResults: 'View detailed results',
        viewInHistory: 'View in history',

        baseUrlLabel: 'Base URL',
        discoveryModeLabel: 'URL discovery mode',
        modeAuto: 'Auto',
        modeAutoDesc: 'Follows internal links',
        modeSitemap: 'Sitemap',
        modeSitemapDesc: 'Parses sitemap.xml',
        modeManual: 'Manual',
        modeManualDesc: 'List of URLs',

        manualUrlsLabel: 'List of URLs (one per line)',
        manualUrlsHint: 'Maximum {count} URLs. A sitemap URL (.xml) is expanded into pages (local server required). Lines starting with # are ignored.',

        serviceLabel: 'Analysis service',
        pageSpeedName: 'PageSpeed Insights',
        pageSpeedDesc: 'Google API, no local server required',
        noKeyWarning: 'Without a PageSpeed API key, requests use Google\'s shared anonymous quota, which is often exhausted: analysis fails (error 429). Add your free key.',
        noKeyWarningLink: 'Configure PageSpeed key',
        localName: 'Local Lighthouse',
        localDesc: 'Local server, faster',
        serverUnavailable: 'Server unavailable',
        serverOnline: 'Online',

        strategyLabel: 'Strategy',

        maxPagesLabel: 'Maximum number of pages',
        onePage: '1 page',
        twentyPages: '20 pages',

        submit: 'Start crawl',

        aboutTitle: 'About Crawl Mode',
        aboutText: 'The crawl analyzes multiple pages of your site and automatically detects template types (homepage, product page, listing...). Scores are aggregated by template and by domain.',

        execTimeTitle: 'Execution time',
        execTimeText: 'Analyzing {count} pages can take around {min}-{max} minutes due to API rate limits.',

        // Errors
        errorRelayRequired: 'The HTTP relay is required for automatic URL discovery (requests to third-party sites are blocked by browser CORS). In production (Cloudflare Pages) it is built in; locally, run "npm run server" or set a relay in Settings → Outbound requests. Otherwise, use Manual mode.',
        errorGeneric: 'An error occurred during the crawl',

        // Guide modal
        guideModalTitle: 'Crawl Mode Guide',
        guideModalSubtitle: 'Understanding the available options',
        guideDiscoveryTitle: 'URL discovery modes',
        guideServerRequired: 'Server required',
        guideNoServer: 'No server',
        guideAutoDesc: 'Automatically crawls the site\'s internal links. Requires the local proxy server to bypass browser CORS restrictions.',
        guideSitemapDesc: 'Parses the site\'s sitemap.xml file. Also requires the proxy server to access the sitemap.',
        guideManualDesc: 'Enter the list of URLs to analyze yourself. No server required, URLs are processed locally.',

        guideServicesTitle: 'Analysis services',
        guidePageSpeedDesc: 'Uses the Google PageSpeed API. Free, no installation, but with limited quotas (around 25 requests/day without an API key).',
        guideLocalDesc: 'Analysis via local Chromium. Faster, unlimited, private. Requires the server with Chromium installed.',

        guideCompatTitle: 'Compatibility table',
        guideColDiscovery: 'Discovery',
        guideColService: 'Service',
        guideColServer: 'Server',
        guideAutoSitemap: 'Auto / Sitemap',
        guideNotRequired: 'Not required',
        guideRequired: 'Required',

        guideServerTitle: 'Start the server',
        guideFirstInstall: 'First install:',
        guideStart: 'Startup:',

        guideUnderstood: 'Got it!'
    }
}
