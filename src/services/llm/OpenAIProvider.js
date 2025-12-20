import BaseLLMProvider from './BaseLLMProvider.js';

/**
 * OpenAI API Provider
 * API Documentation: https://platform.openai.com/docs/api-reference
 */
export default class OpenAIProvider extends BaseLLMProvider {
    constructor(config = {}) {
        super(config);
        this.baseURL = config.baseURL || 'https://api.openai.com/v1';
        this.organization = config.organization || null;
    }

    /**
     * @override
     */
    getDefaultModel() {
        return 'gpt-4-turbo';
    }

    /**
     * Send a prompt and receive complete response
     * @override
     */
    async send(prompt, options = {}) {
        const mergedOptions = this._mergeOptions(options);
        const url = `${this.baseURL}/chat/completions`;

        const payload = this._buildPayload(prompt, mergedOptions, false);

        try {
            const response = await this._fetch(url, {
                method: 'POST',
                headers: this._buildHeaders(),
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
        const url = `${this.baseURL}/chat/completions`;

        const payload = this._buildPayload(prompt, mergedOptions, true);

        try {
            const response = await this._fetch(url, {
                method: 'POST',
                headers: this._buildHeaders(),
                body: JSON.stringify(payload)
            });

            for await (const line of this._parseSSEStream(response)) {
                if (line === '[DONE]') {
                    break;
                }

                try {
                    const data = JSON.parse(line);
                    const content = this._extractStreamContent(data);
                    if (content) {
                        yield content;
                    }
                } catch (error) {
                    console.warn('Failed to parse OpenAI streaming response:', error);
                }
            }
        } catch (error) {
            this._handleError(error, 'stream');
        } finally {
            this.isStreaming = false;
        }
    }

    /**
     * Build request headers
     * @private
     */
    _buildHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
        };

        if (this.organization) {
            headers['OpenAI-Organization'] = this.organization;
        }

        return headers;
    }

    /**
     * Build request payload
     * @private
     */
    _buildPayload(prompt, options, stream = false) {
        const payload = {
            model: options.model,
            messages: this._formatMessages(prompt, options),
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            stream: stream
        };

        // Add optional parameters
        if (options.topP !== undefined) {
            payload.top_p = options.topP;
        }

        if (options.frequencyPenalty !== undefined) {
            payload.frequency_penalty = options.frequencyPenalty;
        }

        if (options.presencePenalty !== undefined) {
            payload.presence_penalty = options.presencePenalty;
        }

        if (options.stop) {
            payload.stop = options.stop;
        }

        if (options.user) {
            payload.user = options.user;
        }

        return payload;
    }

    /**
     * Format prompt into messages array
     * @private
     */
    _formatMessages(prompt, options) {
        // If messages array is provided directly, use it
        if (options.messages) {
            return options.messages;
        }

        // Otherwise, create a simple user message
        const messages = [];

        // Add system message if provided
        if (options.systemMessage) {
            messages.push({
                role: 'system',
                content: options.systemMessage
            });
        }

        // Add user prompt
        messages.push({
            role: 'user',
            content: prompt
        });

        return messages;
    }

    /**
     * Extract text content from API response
     * @private
     */
    _extractContent(data) {
        try {
            if (!data.choices || data.choices.length === 0) {
                return '';
            }

            const choice = data.choices[0];

            // Check finish reason
            if (choice.finish_reason === 'content_filter') {
                throw new Error('Content filtered by OpenAI safety system');
            }

            return choice.message?.content || '';
        } catch (error) {
            if (error.message.includes('filtered')) {
                throw error;
            }
            throw new Error(`Failed to extract content: ${error.message}`);
        }
    }

    /**
     * Extract text content from streaming response
     * @private
     */
    _extractStreamContent(data) {
        try {
            if (!data.choices || data.choices.length === 0) {
                return '';
            }

            const choice = data.choices[0];

            // Check if stream is complete
            if (choice.finish_reason) {
                if (choice.finish_reason === 'content_filter') {
                    throw new Error('Content filtered by OpenAI safety system');
                }
                return '';
            }

            return choice.delta?.content || '';
        } catch (error) {
            if (error.message.includes('filtered')) {
                throw error;
            }
            console.warn('Failed to extract stream content:', error);
            return '';
        }
    }

    /**
     * Get available models
     * @returns {Promise<Array>}
     */
    async getAvailableModels() {
        const url = `${this.baseURL}/models`;

        try {
            const response = await this._fetch(url, {
                method: 'GET',
                headers: this._buildHeaders()
            });

            const data = await response.json();
            return data.data
                .filter(model => model.id.includes('gpt'))
                .map(model => ({
                    id: model.id,
                    created: model.created,
                    ownedBy: model.owned_by
                }))
                .sort((a, b) => b.created - a.created);
        } catch (error) {
            this._handleError(error, 'getAvailableModels');
        }
    }

    /**
     * Create embeddings for text
     * @param {string|Array<string>} input - Text or array of texts
     * @param {string} model - Embedding model (default: text-embedding-3-small)
     * @returns {Promise<Array>}
     */
    async createEmbeddings(input, model = 'text-embedding-3-small') {
        const url = `${this.baseURL}/embeddings`;

        try {
            const response = await this._fetch(url, {
                method: 'POST',
                headers: this._buildHeaders(),
                body: JSON.stringify({
                    model: model,
                    input: input
                })
            });

            const data = await response.json();
            return data.data.map(item => ({
                embedding: item.embedding,
                index: item.index
            }));
        } catch (error) {
            this._handleError(error, 'createEmbeddings');
        }
    }

    /**
     * @override
     */
    getModelInfo() {
        return {
            ...super.getModelInfo(),
            provider: 'OpenAI',
            endpoint: this.baseURL,
            organization: this.organization,
            supportsVision: this.config.model.includes('vision') || this.config.model.includes('gpt-4'),
            supportsStreaming: true,
            supportsFunctions: true
        };
    }
}
