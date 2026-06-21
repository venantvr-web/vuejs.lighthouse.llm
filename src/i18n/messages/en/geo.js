/**
 * GEO Tracking screen texts (brand visibility in AI engines).
 */
export default {
    geo: {
        // Header
        title: 'GEO Tracking',
        subtitle: 'Your brand visibility in AI engine responses',
        apiKeys: 'API keys',
        enableAlerts: 'Enable alerts',
        exportCsvTitle: 'Export the comparison to CSV',
        exportMarkdownTitle: 'Export the comparison to Markdown',
        report: 'Report',
        reportTitle: 'GEO visibility report',
        reportDownload: 'Download (.md)',
        reportPrint: 'Print / PDF',
        reportPopupBlocked: 'Could not open the print window (pop-up blocked).',
        runAll: 'Run all',
        runningAll: 'Analyzing…',
        // Key editor
        keysTitle: 'API keys per engine',
        keysHelp: 'Stored locally in your browser. Fill in the engines you want to query.',
        keyPlaceholder: 'API key…',
        keyRequired: 'Key required — click to enter it',
        ollamaHint: 'Ollama is configured in the Settings.',
        // No engine ready (two fragments, the "API keys" button is inserted between them)
        noProviderBefore: 'No engine configured. Click ',
        noProviderAfter: ' to enter at least one key (OpenAI, Claude or Gemini).',
        // Engine selection
        engines: 'Engines:',
        advancedTitle: 'One additional LLM call per engine: cited competitors + sentiment of the mention',
        advancedAnalysis: 'Advanced analysis (competitors + sentiment)',
        // Add form
        promptLabel: 'Prompt to track:',
        promptPlaceholder: 'Prompt to track (e.g.: What are the best SEO audit tools?)',
        competitorsLabel: 'Competitors to compare (optional):',
        competitorsPlaceholder: 'Competitors (comma-separated)',
        add: 'Add',
        // Prompt presets (replace the brackets with your context)
        presetsLabel: 'Presets:',
        fillTokens: 'Fill in the preset fields:',
        presets: [
            'What are the best [industry] solutions in 2026?',
            'What tool do you recommend for [need]?',
            'What are the best alternatives to [competitor]?',
            'Compare the main players in the [industry] market.',
            'Which company should I choose for [product/service]?',
            'Who are the leaders in [industry]?',
            'Which [service] providers do you recommend in [city/region]?',
            'What are the pros and cons of [brand]?'
        ],
        // Summary
        promptsTracked: 'Prompts tracked',
        avgShareOfVoice: 'Avg. share of voice',
        brandAbsent: 'Brand absent everywhere',
        neverRun: 'Never run',
        scoreTitle: 'Brand GEO score',
        scoreLabel: 'GEO score',
        scoreMethodology: 'Overall visibility score in AI answers, from 0 to 100. It blends the citation rate (share of answers where the brand is cited, weighted 60%) and the average share of voice (the brand\'s weight against competitors, weighted 40%), over the latest run of each prompt and each engine.',
        scoreCitationRate: 'Citation rate:',
        scoreTrendUnit: 'pts',
        scoreTrendStable: 'Stable',
        scoreBasis: 'Computed over {prompts} prompt(s) and {runs} engine answer(s).',
        // Empty state
        emptyTitle: 'No prompt tracked',
        emptyText: 'Add prompts representative of your customers\' searches, enter your brand and your competitors, then compare your visibility across AI engines.',
        // Messages (JS)
        errorPromptRequired: 'The prompt is required.',
        errorBrandRequired: 'Configure a brand first (onboarding or Settings).',
        brandActivePrefix: 'Tracked brand:',
        brandManage: 'Manage',
        errorInvalidEntry: 'Invalid entry.',
        confirmRemove: 'Remove this tracked prompt?',
        // Prompt card (GeoCard)
        competitorsCount: '{count} competitor',
        competitorsCountPlural: '{count} competitors',
        removeTitle: 'Remove',
        enginesCiting: 'Engines citing',
        avgShareOfVoiceShort: 'Avg. share of voice',
        mentioned: 'Yes',
        notMentioned: 'No',
        emergingCompetitors: 'Emerging competitors',
        citedBy: 'Cited by {count} engine(s)',
        citedSources: 'Cited sources:',
        ownSourceCited: 'your site is cited',
        ownSourceNotCited: 'your site is not cited',
        showResponses: 'Show responses',
        hideResponses: 'Hide responses',
        executedAt: 'Run {time}',
        run: 'Run',
        // Sentiment
        sentimentPositive: 'Positive',
        sentimentNeutral: 'Neutral',
        sentimentNegative: 'Negative'
    }
}
