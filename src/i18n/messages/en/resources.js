/**
 * SEO/GEO Resources screen texts (robots.txt, sitemaps, llms.txt availability,
 * GEO-readiness score, AI indexability diagnosis, crawl).
 */
export default {
    resources: {
        // Header
        headerSubtitle: 'Availability of robots.txt, sitemaps, llms.txt…',
        headerTitle: 'SEO/GEO Resources',
        enableAlerts: 'Enable alerts',
        enableAlertsTitle: 'Be alerted when the score drops or new broken URLs appear',
        notifyTitle: 'Resources — {origin}',

        // Local server notice
        localServerPrefix: 'These checks go through the local server (port 3001) to bypass CORS. Run',
        localServerSuffix: 'if not already done.',

        // Input
        urlLabel: 'Domain to analyze:',
        urlPlaceholder: 'https://example.com',
        check: 'Check',
        checking: 'Checking…',

        // GEO-readiness score
        readinessScore: 'GEO-readiness score',
        jsonLdTypes: 'JSON-LD types detected (home)',
        jsonLdMissing: 'missing field(s) —',
        indexingDirectives: 'Indexing directives (home)',
        metaRobots: 'meta robots:',
        xRobotsTag: 'X-Robots-Tag:',
        metaGooglebot: 'meta googlebot:',
        canonical: 'canonical:',
        noindexWarning: '⚠️ noindex detected on the home page',

        // AI indexability diagnosis
        diagnosisTitle: 'AI indexability diagnosis',
        diagnoseWithAi: 'Diagnose with AI',
        rerunDiagnosis: 'Rerun diagnosis',
        diagnoseDisabledTitle: 'Configure an LLM provider in the settings',
        configurePrefix: 'Configure an LLM provider in the',
        configureLink: 'settings',
        configureSuffix: 'to enable the diagnosis.',
        inconsistencies: 'Inconsistencies detected',
        noInconsistencies: 'No obvious inconsistency detected. Run the AI diagnosis for a detailed qualitative analysis.',
        responseTruncated: 'Response cut off by the token limit.',
        continueButton: 'Continue',

        // Resources
        available: 'Available',
        absent: 'Absent',

        // Sitemaps
        sitemapsDetected: 'Sitemaps detected',
        tableUrl: 'URL',
        tableType: 'Type',
        tableEntries: 'Entries',
        typeIndex: 'Index',
        typeUrls: 'URLs',
        crawl: 'Crawl',
        crawling: 'Crawling…',

        // Crawl results
        crawlProgress: 'Checking {done} / {total} URL…',
        urlsChecked: 'URLs checked',
        ok: 'OK',
        broken: 'Broken (404…)',
        brokenUrls: 'Broken URLs',
        exportCsv: 'Export CSV',
        errorLabel: 'Error',
        noBrokenUrls: 'No broken URL detected 🎉'
    }
}
