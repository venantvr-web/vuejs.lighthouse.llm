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
        runAll: 'Run all',
        runningAll: 'Analyzing…',
        // Key editor
        keysTitle: 'API keys per engine',
        keysHelp: 'Stored locally in your browser. Fill in the engines you want to query.',
        keyPlaceholder: 'API key…',
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
        brandLabel: 'Your brand',
        brandPlaceholder: 'Your brand',
        competitorsLabel: 'Competitors to compare (optional):',
        competitorsPlaceholder: 'Competitors (comma-separated)',
        brandCompetitorsHelp: 'Enter the brand whose presence in AI answers you want to measure, and optionally competitors to compare their visibility.',
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
        // Empty state
        emptyTitle: 'No prompt tracked',
        emptyText: 'Add prompts representative of your customers\' searches, enter your brand and your competitors, then compare your visibility across AI engines.',
        // Messages (JS)
        errorPromptBrandRequired: 'The prompt and the brand are required.',
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
