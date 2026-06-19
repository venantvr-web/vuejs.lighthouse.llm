/**
 * "AI Analysis" screen texts (AnalysisView).
 */
export default {
    analysis: {
        headerTitle: 'AI analysis',

        // Categories
        categoryPerformance: 'Performance',
        categoryAccessibility: 'Accessibility',
        categoryBestPractices: 'Best Practices',
        categorySeo: 'SEO',
        categoryPwa: 'PWA',

        issuesDetected: '{count} issues detected',

        analysisType: 'Analysis type',
        strategyQuick: 'Quick',
        strategyDeep: 'Deep',
        strategySpecific: 'Specific',

        analyzing: 'Analyzing...',
        generateActionPlan: 'Generate the action plan',

        notConfigured: 'Please configure an LLM provider in the settings',
        streamError: 'Error: {message}',

        issuesPanelTitle: 'Detected issues',
        clickForDetails: 'Click to view the details',

        hidePrompt: 'Hide the prompt',
        showPrompt: 'Show the prompt',

        noDescription: 'No description available.',
        affectedElements: 'Affected elements ({count})',
        moreElements: 'And {count} more elements...',
        potentialGains: 'Potential gains',
        promptPreview: 'Prompt preview ({template})',

        responseTruncated: 'Response cut off by the token limit.',
        continue: 'Continue',

        // Streaming output (StreamingOutput)
        streamingGenerating: 'Generating…',
        stop: 'Stop',
        copied: 'Copied!',
        tokens: 'tokens',
        emptyState: 'Select a category and run the analysis to get expert advice.'
    }
}
