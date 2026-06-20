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

        bestPracticesTitle: 'llms.txt best practices',
        bestPractices: [
            'One Markdown file at the root: /llms.txt (and /llms-full.txt for the full version).',
            'Start with an H1 title (site name), then a "> " quote summarizing in one sentence what the site does and for whom.',
            'Organize into a few thematic "##" sections, with link lists "[Title](URL): short description".',
            'Pick the essential pages — do not copy the whole sitemap.',
            'Short sentences, no jargon; a one-line description per link.',
            'Put secondary items (legal, etc.) under an "## Optional" section that agents may skip.',
            'Absolute URLs and content kept up to date.',
            'llms-full.txt: expanded version, with full descriptions to give AIs all the context.'
        ],

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
        searchPlaceholder: 'Search (domain, content…)',
        noResults: 'No results.',

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
