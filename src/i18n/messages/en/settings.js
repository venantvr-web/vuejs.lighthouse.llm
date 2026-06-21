/**
 * Settings screen texts (LLM providers, PageSpeed, outbound requests,
 * local data, User-Agent).
 */
export default {
    settings: {
        // Header
        headerSubtitle: 'LLM providers, API keys and preferences',
        headerTitle: 'Settings',

        // Identity (brands and domains)
        identityTitle: 'Brands and domains',
        identityIntro: 'Manage your brands and domains. The active brand shows in the header and is used for GEO tracking; the active domain pre-fills the screens.',
        brandsLabel: 'Brands:',
        brandPlaceholder: 'Add a brand…',
        sectorLabel: 'Line of business for "{brand}":',
        sectorPlaceholder: 'E.g.: medical concierge',
        sectorHint: 'Specifies the brand\'s field to remove any name ambiguity in AI analyses (stored per brand).',
        domainsLabel: 'Domains:',
        domainPlaceholder: 'https://example.com',
        addBtn: 'Add',
        identityHint: 'Click a chip to make it active, ✕ to remove it.',

        // LLM configuration
        llmTitle: 'LLM configuration',
        llmIntro: 'Configure the AI provider for analyzing your Lighthouse reports.',
        providerLabel: 'Provider:',
        providerLocal: 'Free, local',
        providerCloud: 'Cloud API',
        apiKeyLabel: 'API key:',
        apiKeyHint: 'Your API key is stored locally in your browser.',
        ollamaUrlLabel: 'Ollama URL:',
        modelLabel: 'Model:',
        loadModels: 'Load available models',
        maxTokensLabel: 'Max. response length (tokens):',
        maxTokensHint: 'Increase this value if AI analyses are cut off. Automatically capped per model (OpenAI 16384, Anthropic 8192, Gemini 32768).',
        savedConfirm: 'Saved!',
        testConnection: 'Test connection',

        // Model loading messages
        errKeyFirst: 'Enter an API key first.',
        errDynamicUnavailable: 'Dynamic list not available for this provider.',
        errNoModel: 'No model returned.',
        errLoadFailed: 'Loading failed: {message}',

        // Connection test
        testTodo: 'Connection test: feature coming soon',

        // Local data reset
        confirmResetDb: 'Reset all local data (history, crawls, AI artifacts…)? This action is irreversible and the page will be reloaded.',

        // PageSpeed
        pageSpeedTitle: 'PageSpeed analysis',
        pageSpeedIntro: 'The PageSpeed Insights API works without a key, but with a very limited quota. A key is recommended for the Watchlist and repeated analyses.',
        pageSpeedKeyLabel: 'PageSpeed API key (optional):',
        pageSpeedStored: 'Stored locally.',
        pageSpeedGetKey: 'Get a key',

        // Outbound requests
        outboundTitle: 'Outbound requests',
        outboundIntro: 'User-Agent used by the local server to fetch robots.txt, sitemaps, llms.txt and check URLs (Resources and Crawl). Leave empty for the default value.',
        userAgentLabel: 'User-Agent (optional):',
        userAgentHintPrefix: 'Default:',
        userAgentHintSuffix: 'A transparent and identifiable User-Agent is recommended; only use a browser User-Agent if a site blocks the bot.',
        proxyBaseLabel: 'HTTP relay base (optional):',
        proxyBasePlaceholder: '(same origin)',
        proxyBaseHintPrefix: 'Relay used to bypass CORS (fetching robots.txt, sitemaps, pages…). In production, leave empty: the built-in Cloudflare Pages relay (',
        proxyBaseHintMiddle: ') is used. Locally,',
        proxyBaseHintSuffix: '(Node server), or specify a CORS relay of your choice.',
        directModeLabel: 'Direct mode (no relay)',
        directModeHint: 'Fetches resources directly from the browser, without a relay. Enable this if the app and the analyzed site share the same origin (your production site) or if the target allows CORS. No server or Pages Function needed.',

        // Local data
        localDataTitle: 'Local data',
        localDataIntro: 'History, crawl sessions and AI artifacts are stored in your browser (IndexedDB). If an opening error occurs after an update, reset the databases.',
        resetDbButton: 'Reset local data',
        resettingDb: 'Resetting…',
        localDataNote: 'Deletes all of the application\'s IndexedDB databases then reloads the page. Settings (API keys, preferences) are not affected.',

        // Information cards
        geminiTitle: 'Gemini (Recommended)',
        geminiDesc: '1M token context, generous free tier, excellent in French.',
        geminiLink: 'Get an API key',
        ollamaCardTitle: 'Ollama (100% Local)',
        ollamaCardDesc: 'Run AI models locally without sending your data.',
        ollamaLink: 'Install Ollama',
        perplexityCardTitle: 'Perplexity (GEO)',
        perplexityCardDesc: 'Web-grounded answer engine: its answers cite real sources, ideal for GEO tracking.',
        perplexityLink: 'Get an API key'
    }
}
