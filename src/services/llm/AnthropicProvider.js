import BaseLLMProvider from './BaseLLMProvider.js';

/**
 * Anthropic Claude API Provider
 * API Documentation: https://docs.anthropic.com/claude/reference
 */
export default class AnthropicProvider extends BaseLLMProvider {
    constructor(config = {}) {
        super(config);
        this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
        this.apiVersion = config.apiVersion || '2023-06-01';
    }

    /**
     * @override
     */
    getDefaultModel() {
        return 'claude-3-5-sonnet-20241022';
    }

    /**
     * Send a prompt and receive complete response
     * @override
     */
    async send(prompt, options = {}) {
        const mergedOptions = this._mergeOptions(options);
        const url = `${this.baseURL}/messages`;

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
        const url = `${this.baseURL}/messages`;

        const payload = this._buildPayload(prompt, mergedOptions, true);

        try {
            const response = await this._fetch(url, {
                method: 'POST',
                headers: this._buildHeaders(),
                body: JSON.stringify(payload)
            });

            for await (const line of this._parseSSEStream(response)) {
                try {
                    const data = JSON.parse(line);
                    const content = this._extractStreamContent(data);
                    if (content) {
                        yield content;
                    }
                } catch (error) {
                    console.warn('Failed to parse Anthropic streaming response:', error);
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
        return {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': this.apiVersion
        };
    }

    /**
     * Build request payload
     * @private
     */
    _buildPayload(prompt, options, stream = false) {
        const payload = {
            model: options.model,
            messages: this._formatMessages(prompt, options),
            max_tokens: options.maxTokens,
            temperature: options.temperature,
            stream: stream
        };

        // Add system message if provided
        if (options.systemMessage) {
            payload.system = options.systemMessage;
        }

        // Add optional parameters
        if (options.topP !== undefined) {
            payload.top_p = options.topP;
        }

        if (options.topK !== undefined) {
            payload.top_k = options.topK;
        }

        if (options.stopSequences) {
            payload.stop_sequences = options.stopSequences;
        }

        if (options.metadata) {
            payload.metadata = options.metadata;
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
        return [{
            role: 'user',
            content: prompt
        }];
    }

    /**
     * Extract text content from API response
     * @private
     */
    _extractContent(data) {
        try {
            if (!data.content || data.content.length === 0) {
                return '';
            }

            // Check stop reason
            if (data.stop_reason === 'end_turn') {
                // Normal completion
            } else if (data.stop_reason === 'max_tokens') {
                console.warn('Response truncated due to max_tokens limit');
            } else if (data.stop_reason === 'stop_sequence') {
                // Stopped at stop sequence
            }

            // Extract text from content blocks
            return data.content
                .filter(block => block.type === 'text')
                .map(block => block.text)
                .join('');
        } catch (error) {
            throw new Error(`Failed to extract content: ${error.message}`);
        }
    }

    /**
     * Extract text content from streaming response
     * @private
     */
    _extractStreamContent(data) {
        try {
            // Handle different event types
            switch (data.type) {
                case 'message_start':
                    // Message starting
                    return '';

                case 'content_block_start':
                    // Content block starting
                    return '';

                case 'content_block_delta':
                    // Content delta with actual text
                    if (data.delta?.type === 'text_delta') {
                        return data.delta.text || '';
                    }
                    return '';

                case 'content_block_stop':
                    // Content block ending
                    return '';

                case 'message_delta':
                    // Message metadata updates
                    if (data.delta?.stop_reason === 'max_tokens') {
                        console.warn('Response truncated due to max_tokens limit');
                    }
                    return '';

                case 'message_stop':
                    // Message complete
                    return '';

                case 'ping':
                    // Keepalive ping
                    return '';

                case 'error':
                    throw new Error(`Stream error: ${data.error?.message || 'Unknown error'}`);

                default:
                    console.warn('Unknown stream event type:', data.type);
                    return '';
            }
        } catch (error) {
            if (error.message.includes('Stream error')) {
                throw error;
            }
            console.warn('Failed to extract stream content:', error);
            return '';
        }
    }

    /**
     * Count tokens in messages
     * @param {Array} messages - Messages to count tokens
     * @returns {Promise<Object>}
     */
    async countTokens(messages) {
        const url = `${this.baseURL}/messages/count_tokens`;

        try {
            const response = await this._fetch(url, {
                method: 'POST',
                headers: this._buildHeaders(),
                body: JSON.stringify({
                    model: this.config.model,
                    messages: Array.isArray(messages) ? messages : [{
                        role: 'user',
                        content: messages
                    }]
                })
            });

            const data = await response.json();
            return {
                inputTokens: data.input_tokens || 0
            };
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
            provider: 'Anthropic',
            endpoint: this.baseURL,
            apiVersion: this.apiVersion,
            supportsVision: this.config.model.includes('claude-3'),
            supportsStreaming: true,
            contextWindow: this._getContextWindow()
        };
    }

    /**
     * Get context window size for model
     * @private
     */
    _getContextWindow() {
        if (this.config.model.includes('claude-3-5-sonnet')) {
            return 200000;
        } else if (this.config.model.includes('claude-3-opus')) {
            return 200000;
        } else if (this.config.model.includes('claude-3-sonnet')) {
            return 200000;
        } else if (this.config.model.includes('claude-3-haiku')) {
            return 200000;
        } else if (this.config.model.includes('claude-2.1')) {
            return 200000;
        } else if (this.config.model.includes('claude-2')) {
            return 100000;
        }
        return 100000; // Default
    }
}
