/**
 * Intro sentences shown at the top of each page (PageIntro component).
 */
export default {
    intro: {
        home: 'This tool audits the performance and SEO of your pages with Lighthouse, then uses an LLM to explain the results and suggest an action plan. All your data stays in your browser. Choose below how to start an analysis.',
        lighthouse: 'Run an online Lighthouse audit on a public URL. The report measures the page\'s performance, accessibility, best practices and SEO. Results are stored locally for later analysis.',
        upload: 'Import a Lighthouse report in JSON format generated elsewhere. It will be loaded into the app to be viewed and analyzed by the LLM. No data is sent to any server.',
        local: 'Run Lighthouse through a local Chromium server, useful for internal or non-public sites. Enter the URL and follow the audit\'s progress. The local server is optional and configured separately.',
        dashboard: 'Overview of the last loaded report: scores by category and quick access to detailed analyses. Use the shortcuts to compare, track or dig into an audit. The data comes from the report currently in memory.',
        analysis: 'Detailed analysis of a report category, enriched by the LLM. You\'ll find the diagnosis, improvement opportunities and a prioritized action plan. Select a category to display its details.',
        comparison: 'Compare two Lighthouse reports to measure score changes over time. Differences by category and metric are highlighted. Choose the reports to compare below.',
        settings: 'Configure your LLM providers and their API keys, along with the app preferences. Your keys stay stored in your browser and never pass through a third-party server. Remember to save after changes.',
        history: 'Find the history of your Lighthouse audits, crawls and AI analyses. You can reopen, compare or export past results. Use the tabs to switch between history types.',
        briefing: 'The morning briefing summarizes the important changes detected on your tracked sites. It highlights regressions, improvements and points to watch. Add URLs to the Watchlist to feed this summary.',
        watchlist: 'The Watchlist tracks important URLs daily and alerts you to regressions. Each entry shows how its Lighthouse scores evolve. Add the pages you want to monitor.',
        geo: 'GEO (Generative Engine Optimization) measures whether your brand is cited by AI answer engines (ChatGPT, Gemini, Claude…). Define prompts representative of your customers and track your visibility over time. Configure the providers\' API keys first.',
        searchConsole: 'Connect Google Search Console to cross-reference your search data with the audits. You see impressions, clicks and positions of tracked pages. Access is read-only from your browser.',
        resources: 'Diagnose a domain\'s indexability: robots.txt, sitemap, tags and other technical SEO signals. The LLM summarizes inconsistencies and suggests fixes. Enter a URL to run the diagnosis.',
        llmStudio: 'Generate better llms.txt and llms-full.txt files to make your site readable by AIs. The analysis understands your business domain from the header, footer and sitemap, then the AI writes the files. Also track how these aspects evolve over time.',
        crawl: 'Crawl a site to collect its pages, then run Lighthouse audits in batch. You get an aggregated view of scores across the whole domain. Enter the start URL and crawl options.',
        crawlResults: 'Crawl results: Lighthouse scores page by page, domain aggregates and grouping by page type. Spot the weakest page templates to fix first. You can generate structured data or compare with other crawls.'
    }
}
