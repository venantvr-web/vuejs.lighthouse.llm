/**
 * Search Console screen texts.
 */
export default {
    searchConsole: {
        headerSubtitle: 'Real search data (queries, clicks, impressions, position)',
        headerTitle: 'Search Console',
        connectTitle: 'Connect to Google Search Console',
        connectIntro: 'Enter an OAuth 2.0 Client ID (type "Web application") whose authorized origin matches this site. The Search Console API must be enabled. The access token stays in memory; nothing is stored server-side.',
        connecting: 'Connecting…',
        connect: 'Connect',
        methodOAuth: 'OAuth (popup)',
        methodServiceAccount: 'Service account (JSON key)',
        serviceAccountIntro: 'Paste a Google service-account JSON key. No popup: the connection is automatic.',
        serviceStep1: 'Google Cloud → Credentials → Create credentials → Service account, then create a JSON key.',
        serviceStep2: 'Enable the Search Console API for the project.',
        serviceStep3: 'In Search Console, add the service-account email (…iam.gserviceaccount.com) as a user of the property.',
        serviceAccountWarning: 'The key contains a private key and stays stored in this browser. Use it only on a trusted machine.',
        site: 'Site:',
        period: 'Period:',
        days7: '7 days',
        days28: '28 days',
        days90: '90 days',
        dimension: 'Dimension:',
        queries: 'Queries',
        pages: 'Pages',
        analyze: 'Analyze',
        disconnect: 'Disconnect',
        clicks: 'Clicks',
        impressions: 'Impressions',
        avgCtr: 'Avg. CTR',
        avgPosition: 'Avg. position',
        clicksTrend: 'Clicks trend (saved analyses)',
        page: 'Page',
        query: 'Query',
        impr: 'Impr.',
        ctr: 'CTR',
        position: 'Position',
        emptyHint: 'Choose a site and click "Analyze".'
    }
}
