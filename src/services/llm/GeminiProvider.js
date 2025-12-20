import BaseLLMProvider from './BaseLLMProvider.js';

/**
 * Google Gemini API Provider (DEFAULT)
 * API Documentation: https://ai.google.dev/api/rest
 */
export default class GeminiProvider extends BaseLLMProvider {
    constructor(config = {}) {
        super(config);
        this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
    }

    /**
     * @override
     */
    getDefaultModel() {
        return 'gemini-1.5-flash';
    }

    /**
     * Send a prompt and receive complete response
     * @override
     */
    async send(prompt, options = {}) {
        const mergedOptions = this._mergeOptions(options);
        const url = `${this.baseURL}/models/${mergedOptions.model}:generateContent?key=${this.config.apiKey}`;

        const payload = this._buildPayload(prompt, mergedOptions);

        try {
            const response = await this._fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            return this._extractContent(data);
        } catch (error) {
            this._handleError(error, 'send');
        }
    }

    /**
     * Stream a prompt response
     * @override
     */
    async* stream(prompt, options = {}) {
        this.isStreaming = true;
        const mergedOptions = this._mergeOptions(options);
        const url = `${this.baseURL}/models/${mergedOptions.model}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`;

        const payload = this._buildPayload(prompt, mergedOptions);

        try {
            const response = await this._fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            for await (const line of this._parseSSEStream(response)) {
                try {
                    const data = JSON.parse(line);
                    const content = this._extractContent(data);
                    if (content) {
                        yield content;
                    }
                } catch (error) {
                    console.warn('Failed to parse Gemini streaming response:', error);
                }
            }
        } catch (error) {
            this._handleError(error, 'stream');
        } finally {
            this.isStreaming = false;
        }
    }

    /**
     * Build request payload
     * @private
     */
    _buildPayload(prompt, options) {
        const payload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: options.temperature,
                maxOutputTokens: options.maxTokens,
                topP: options.topP || 0.95,
                topK: options.topK || 40
            }
        };

        // Add safety settings if provided
        if (options.safetySettings) {
            payload.safetySettings = options.safetySettings;
        }

        return payload;
    }

    /**
     * Extract text content from API response
     * @private
     */
    _extractContent(data) {
        try {
            if (!data.candidates || data.candidates.length === 0) {
                // Check for blocked content
                if (data.promptFeedback?.blockReason) {
                    throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
                }
                return '';
            }

            const candidate = data.candidates[0];

            // Check finish reason
            if (candidate.finishReason === 'SAFETY') {
                throw new Error('Content filtered due to safety settings');
            }

            if (!candidate.content?.parts || candidate.content.parts.length === 0) {
                return '';
            }

            // Extract text from all parts
            return candidate.content.parts
                .filter(part => part.text)
                .map(part => part.text)
                .join('');
        } catch (error) {
            if (error.message.includes('blocked') || error.message.includes('filtered')) {
                throw error;
            }
            throw new Error(`Failed to extract content: ${error.message}`);
        }
    }

    /**
     * Get available models
     * @returns {Promise<Array>}
     */
    async getAvailableModels() {
        const url = `${this.baseURL}/models?key=${this.config.apiKey}`;

        try {
            const response = await this._fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            return data.models
                .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
                .map(model => ({
                    name: model.name.replace('models/', ''),
                    displayName: model.displayName,
                    description: model.description,
                    inputTokenLimit: model.inputTokenLimit,
                    outputTokenLimit: model.outputTokenLimit
                }));
        } catch (error) {
            this._handleError(error, 'getAvailableModels');
        }
    }

    /**
     * Count tokens in text
     * @param {string} text - Text to count tokens
     * @returns {Promise<number>}
     */
    async countTokens(text) {
        const url = `${this.baseURL}/models/${this.config.model}:countTokens?key=${this.config.apiKey}`;

        try {
            const response = await this._fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: text
                        }]
                    }]
                })
            });

            const data = await response.json();
            return data.totalTokens || 0;
        } catch (error) {
            this._handleError(error, 'countTokens');
        }
    }

    /**
     * @override
     */
    getModelInfo() {
        return {
            ...super.getModelInfo(),
            provider: 'Gemini',
            endpoint: this.baseURL,
            supportsVision: this.config.model.includes('pro') || this.config.model.includes('flash'),
            supportsStreaming: true
        };
    }
}
