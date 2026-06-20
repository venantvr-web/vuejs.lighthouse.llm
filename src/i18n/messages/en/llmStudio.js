/**
 * LLM Studio: llms.txt / llms-full.txt generation and monitoring.
 */
export default {
    llmStudio: {
        headerTitle: 'LLM Studio',
        headerSubtitle: 'llms.txt, llms-full.txt and AI monitoring',

        urlPlaceholder: 'https://your-domain.com',
        analyze: 'Analyze domain',
        analyzing: 'Analyzing…',
        keywordsLabel: 'Keywords / business domain (optional, improves results)',
        keywordsPlaceholder: 'E.g.: SEO audit, web performance, agency, fashion e-commerce…',

        configurePrefix: 'AI generation requires an LLM provider. ',
        configureLink: 'Configure',
        configureSuffix: ' in settings.',

        contextTitle: 'Domain understood by the AI',
        ctxTitle: 'Title',
        ctxDescription: 'Description',
        ctxHeaderLinks: 'Header links',
        ctxFooterLinks: 'Footer links',
        ctxSitemap: 'Sitemap sections ({count} URLs)',

        liveStatus: 'Published files:',
        present: 'present',
        absent: 'absent',
        viewLive: 'View',

        generateLlms: 'Generate llms.txt',
        generateLlmsFull: 'Generate llms-full.txt',
        continue: 'Continue generation',

        veilleTitle: 'History',
        veilleHint: 'History of generated files. Re-run regularly to track how your domain evolves and keep your files up to date.',

        watchTitle: 'Automatic monitoring',
        watchHint: 'Watched domains are re-checked when you open the app once the interval has elapsed. On any change (domain structure, llms.txt removed or published) you get an alert.',
        watchInterval: 'Interval',
        watchThis: 'Watch this domain',
        unwatch: 'Stop watching',
        checkNow: 'Check now',
        checking: 'Checking…',
        enableAlerts: 'Enable notifications',
        lastChecked: 'Checked',
        watchAlert: 'LLM monitoring',

        errorInvalidUrl: 'Invalid URL.',
        errorFetchHome: 'Could not fetch the homepage (relay required or site unreachable).',
        errorAnalyze: 'Domain analysis failed.',
        errorNoProvider: 'Configure an LLM provider in settings.',
        errorGenerate: 'Generation failed'
    }
}
