/**
 * Abstract base class for LLM providers
 * All provider implementations must extend this class
 */
export default class BaseLLMProvider {
    /**
     * @param {Object} config - Provider configuration
     * @param {string} config.apiKey - API key for authentication
     * @param {string} config.model - Model identifier
     * @param {number} config.temperature - Sampling temperature (0-1)
     * @param {number} config.maxTokens - Maximum tokens in response
     */
    constructor(config = {}) {
        if (new.target === BaseLLMProvider) {
            throw new Error('BaseLLMProvider is abstract and cannot be instantiated directly');
        }

        this.config = {
            apiKey: config.apiKey || '',
            model: config.model || this.getDefaultModel(),
            temperature: config.temperature ?? 0.7,
            maxTokens: config.maxTokens || 2048,
            ...config
        };

        this.abortController = null;
        this.isStreaming = false;

        this.validateConfig();
    }

    /**
     * Get the default model for this provider
     * @abstract
     * @returns {string}
     */
    getDefaultModel() {
        throw new Error('getDefaultModel() must be implemented by subclass');
    }

    /**
     * Send a prompt and receive complete response
     * @abstract
     * @param {string} prompt - The prompt to send
     * @param {Object} options - Additional options
     * @returns {Promise<string>} - The complete response
     */
    async send(prompt, options = {}) {
        throw new Error('send() must be implemented by subclass');
    }

    /**
     * Stream a prompt response
     * @abstract
     * @param {string} prompt - The prompt to send
     * @param {Object} options - Additional options
     * @returns {AsyncGenerator<string>} - Async generator yielding response chunks
     */
    async* stream(prompt, options = {}) {
        throw new Error('stream() must be implemented by subclass');
    }

    /**
     * Abort ongoing request
     */
    abort() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
            this.isStreaming = false;
        }
    }

    /**
     * Validate provider configuration
     * @throws {Error} If configuration is invalid
     */
    validateConfig() {
        if (!this.config.apiKey && this.requiresApiKey()) {
            throw new Error(`API key is required for ${this.constructor.name}`);
        }

        if (!this.config.model) {
            throw new Error('Model identifier is required');
        }

        if (typeof this.config.temperature !== 'number' ||
            this.config.temperature < 0 ||
            this.config.temperature > 2) {
            throw new Error('Temperature must be a number between 0 and 2');
        }

        if (typeof this.config.maxTokens !== 'number' || this.config.maxTokens < 1) {
            throw new Error('maxTokens must be a positive number');
        }
    }

    /**
     * Check if this provider requires an API key
     * @returns {boolean}
     */
    requiresApiKey() {
        return true;
    }

    /**
     * Get provider and model information
     * @returns {Object}
     */
    getModelInfo() {
        return {
            provider: this.constructor.name.replace('Provider', ''),
            model: this.config.model,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
            streaming: this.isStreaming
        };
    }

    /**
     * Create a new AbortController for request cancellation
     * @protected
     * @returns {AbortController}
     */
    _createAbortController() {
        this.abort(); // Abort any existing request
        this.abortController = new AbortController();
        return this.abortController;
    }

    /**
     * Merge default options with user options
     * @protected
     * @param {Object} options - User options
     * @returns {Object} - Merged options
     */
    _mergeOptions(options = {}) {
        return {
            temperature: options.temperature ?? this.config.temperature,
            maxTokens: options.maxTokens ?? this.config.maxTokens,
            model: options.model ?? this.config.model,
            ...options
        };
    }

    /**
     * Handle API errors
     * @protected
     * @param {Error} error - The error to handle
     * @param {string} context - Context where error occurred
     * @throws {Error}
     */
    _handleError(error, context = 'request') {
        if (error.name === 'AbortError') {
            throw new Error(`Request aborted during ${context}`);
        }

        if (error.response) {
            const status = error.response.status;
            const statusText = error.response.statusText;
            throw new Error(
                `API ${context} failed: ${status} ${statusText} - ${error.message}`
            );
        }

        throw new Error(`${context} failed: ${error.message}`);
    }

    /**
     * Make HTTP request with timeout and abort support
     * @protected
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>}
     */
    async _fetch(url, options = {}) {
        const abortController = this._createAbortController();

        try {
            const response = await fetch(url, {
                ...options,
                signal: abortController.signal
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            return response;
        } catch (error) {
            this._handleError(error, 'fetch');
        }
    }

    /**
     * Parse streaming SSE response
     * @protected
     * @param {Response} response - Fetch response
     * @returns {AsyncGenerator<string>}
     */
    async* _parseSSEStream(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const {done, value} = await reader.read();

                if (done) {
                    break;
                }

                buffer += decoder.decode(value, {stream: true});
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data && data !== '[DONE]') {
                            yield data;
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Parse NDJSON stream
     * @protected
     * @param {Response} response - Fetch response
     * @returns {AsyncGenerator<Object>}
     */
    async* _parseNDJSONStream(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const {done, value} = await reader.read();

                if (done) {
                    break;
                }

                buffer += decoder.decode(value, {stream: true});
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed) {
                        try {
                            yield JSON.parse(trimmed);
                        } catch (error) {
                            console.warn('Failed to parse JSON line:', trimmed);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}
