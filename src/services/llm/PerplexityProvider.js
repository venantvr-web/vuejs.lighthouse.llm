import OpenAIProvider from './OpenAIProvider.js';

/**
 * Perplexity API Provider.
 *
 * Perplexity exposes an OpenAI-compatible Chat Completions endpoint, so it
 * reuses OpenAIProvider's request/streaming plumbing. Its differentiator for
 * GEO is that answers are grounded in live web search: the response carries a
 * `citations` (and newer `search_results`) array listing the source URLs the
 * model actually used. We append those URLs to the returned text so the
 * deterministic `extractSources()` analysis and `MarkdownViewer` surface them
 * like any other cited source — no change to the GEO pipeline.
 *
 * API: https://docs.perplexity.ai/api-reference/chat-completions
 */
export default class PerplexityProvider extends OpenAIProvider {
    constructor(config = {}) {
        super(config);
        this.baseURL = config.baseURL || 'https://api.perplexity.ai';
        // Perplexity ignores the OpenAI-Organization header.
        this.organization = null;
    }

    /**
     * @override
     */
    getDefaultModel() {
        return 'sonar';
    }

    /**
     * Perplexity has no public model-listing endpoint; expose a curated list.
     * @returns {Promise<Array<{value: string, label: string}>>}
     */
    async listModels() {
        return [
            {value: 'sonar', label: 'Sonar'},
            {value: 'sonar-pro', label: 'Sonar Pro'},
            {value: 'sonar-reasoning', label: 'Sonar Reasoning'},
            {value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro'}
        ];
    }

    /**
     * Collect the source URLs from a Perplexity response, supporting both the
     * legacy `citations` (string[]) and the newer `search_results`
     * ({title, url}[]) shapes. De-duplicated, order preserved.
     * @param {object} data - Raw API response
     * @returns {Array<{url: string, title: string|null}>}
     * @private
     */
    _extractCitations(data) {
        const out = [];
        const seen = new Set();
        const push = (url, title) => {
            const u = String(url || '').trim();
            if (!u || seen.has(u)) return;
            seen.add(u);
            out.push({url: u, title: title ? String(title).trim() : null});
        };
        if (Array.isArray(data?.search_results)) {
            for (const r of data.search_results) push(r?.url, r?.title);
        }
        if (Array.isArray(data?.citations)) {
            for (const c of data.citations) push(c, null);
        }
        return out;
    }

    /**
     * Extract the answer text and append a "Sources" section listing the cited
     * URLs, so downstream source extraction and rendering see them.
     * @override
     */
    _extractContent(data) {
        const content = super._extractContent(data);
        const citations = this._extractCitations(data);
        if (!citations.length) return content;

        const list = citations
            .map((c, i) => `${i + 1}. ${c.title ? `[${c.title}](${c.url})` : c.url}`)
            .join('\n');
        const sourcesBlock = `\n\n**Sources**\n\n${list}`;
        return content ? `${content}${sourcesBlock}` : sourcesBlock.trimStart();
    }

    /**
     * @override
     */
    getModelInfo() {
        return {
            ...super.getModelInfo(),
            provider: 'Perplexity',
            endpoint: this.baseURL,
            supportsVision: false,
            supportsStreaming: true,
            supportsFunctions: false
        };
    }
}
