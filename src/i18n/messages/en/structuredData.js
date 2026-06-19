/**
 * Texts for the "Structured data (JSON-LD)" panel (StructuredDataPanel).
 */
export default {
    structuredData: {
        title: 'Structured data (JSON-LD)',
        autoGeneration: 'Auto-generation',
        reanalyze: 'Re-analyze',
        analyze: 'Analyze',
        generateProgress: 'Generating {done}/{total}…',
        generateAllMissing: 'Generate all missing',
        intro: 'Detects missing or incomplete JSON-LD on each page, then generates the markup with AI.',
        autoHint: 'Generation of missing items starts automatically when the results open.',
        missingPages: '{count} page(s) with missing or incomplete structured data.',
        allValid: 'All analyzed pages have valid structured data 🎉',
        configurePrefixed: 'Configure an LLM provider in the',
        settingsLink: 'settings',
        configureSuffix: 'to generate JSON-LD.',

        // Per-page statuses
        statusMissing: 'Missing',
        statusIncomplete: 'Incomplete',
        statusOk: 'OK',
        historized: 'Historized',
        historizedTooltip: 'JSON-LD already generated, restored from AI history',

        generating: 'Generating…',
        regenerate: 'Regenerate',
        generateJsonLd: 'Generate JSON-LD',

        types: 'Types: {types}',
        copyTag: 'Copy tag',
        download: 'Download'
    }
}
