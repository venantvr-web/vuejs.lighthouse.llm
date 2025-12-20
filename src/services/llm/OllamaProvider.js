import BaseLLMProvider from './BaseLLMProvider.js';

/**
 * Ollama Local LLM Provider
 * API Documentation: https://github.com/ollama/ollama/blob/main/docs/api.md
 */
export default class OllamaProvider extends BaseLLMProvider {
    constructor(config = {}) {
        super(config);
        this.baseURL = config.baseURL || 'http://localhost:11434';
    }

    /**
     * @override
     */
    getDefaultModel() {
        return 'llama2';
    }

    /**
     * @override
     */
    requiresApiKey() {
        return false;
    }

    /**
     * @override
     */
    validateConfig() {
        // Skip API key validation for Ollama
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
     * Send a prompt and receive complete response
     * @override
     */
    async send(prompt, options = {}) {
        const mergedOptions = this._mergeOptions(options);
        const url = `${this.baseURL}/api/generate`;

        const payload = this._buildPayload(prompt, mergedOptions, false);

        try {
            const response = await this._fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            return data.response || '';
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
        const url = `${this.baseURL}/api/generate`;

        const payload = this._buildPayload(prompt, mergedOptions, true);

        try {
            const response = await this._fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            for await (const data of this._parseNDJSONStream(response)) {
                if (data.response) {
                    yield data.response;
                }

                // Check if generation is complete
                if (data.done) {
                    break;
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
    _buildPayload(prompt, options, stream = true) {
        const payload = {
            model: options.model,
            prompt: prompt,
            stream: stream,
            options: {
                temperature: options.temperature,
                num_predict: options.maxTokens
            }
        };

        // Add system message if provided
        if (options.systemMessage) {
            payload.system = options.systemMessage;
        }

        // Add additional options
        if (options.topP !== undefined) {
            payload.options.top_p = options.topP;
        }

        if (options.topK !== undefined) {
            payload.options.top_k = options.topK;
        }

        if (options.repeatPenalty !== undefined) {
            payload.options.repeat_penalty = options.repeatPenalty;
        }

        if (options.seed !== undefined) {
            payload.options.seed = options.seed;
        }

        if (options.context) {
            payload.context = options.context;
        }

        return payload;
    }

    /**
     * Check connection to Ollama server
     * @returns {Promise<boolean>}
     */
    async checkConnection() {
        const url = `${this.baseURL}/api/tags`;

        try {
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 5000);

            const response = await fetch(url, {
                method: 'GET',
                signal: abortController.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get available models from Ollama
     * @returns {Promise<Array>}
     */
    async getAvailableModels() {
        const url = `${this.baseURL}/api/tags`;

        try {
            const response = await this._fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            return (data.models || []).map(model => ({
                name: model.name,
                size: model.size,
                digest: model.digest,
                modified: model.modified_at,
                details: {
                    format: model.details?.format,
                    family: model.details?.family,
                    families: model.details?.families,
                    parameterSize: model.details?.parameter_size,
                    quantizationLevel: model.details?.quantization_level
                }
            }));
        } catch (error) {
            this._handleError(error, 'getAvailableModels');
        }
    }

    /**
     * Pull a model from Ollama library
     * @param {string} modelName - Name of model to pull
     * @returns {AsyncGenerator<Object>} - Progress updates
     */
    async* pullModel(modelName) {
        const url = `${this.baseURL}/api/pull`;

        try {
            const abortController = this._createAbortController();

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({name: modelName}),
                signal: abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to pull model`);
            }

            for await (const data of this._parseNDJSONStream(response)) {
                yield {
                    status: data.status,
                    digest: data.digest,
                    total: data.total,
                    completed: data.completed
                };

                if (data.status === 'success') {
                    break;
                }
            }
        } catch (error) {
            this._handleError(error, 'pullModel');
        }
    }

    /**
     * Delete a model from Ollama
     * @param {string} modelName - Name of model to delete
     * @returns {Promise<boolean>}
     */
    async deleteModel(modelName) {
        const url = `${this.baseURL}/api/delete`;

        try {
            const response = await this._fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({name: modelName})
            });

            return response.ok;
        } catch (error) {
            this._handleError(error, 'deleteModel');
            return false;
        }
    }

    /**
     * Show model information
     * @param {string} modelName - Name of model
     * @returns {Promise<Object>}
     */
    async showModelInfo(modelName) {
        const url = `${this.baseURL}/api/show`;

        try {
            const response = await this._fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({name: modelName})
            });

            return await response.json();
        } catch (error) {
            this._handleError(error, 'showModelInfo');
        }
    }

    /**
     * Copy a model
     * @param {string} source - Source model name
     * @param {string} destination - Destination model name
     * @returns {Promise<boolean>}
     */
    async copyModel(source, destination) {
        const url = `${this.baseURL}/api/copy`;

        try {
            const response = await this._fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source: source,
                    destination: destination
                })
            });

            return response.ok;
        } catch (error) {
            this._handleError(error, 'copyModel');
            return false;
        }
    }

    /**
     * Generate embeddings for text
     * @param {string} text - Text to generate embeddings for
     * @param {string} model - Model to use (default: current model)
     * @returns {Promise<Array<number>>}
     */
    async generateEmbeddings(text, model = null) {
        const url = `${this.baseURL}/api/embeddings`;

        try {
            const response = await this._fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model || this.config.model,
                    prompt: text
                })
            });

            const data = await response.json();
            return data.embedding || [];
        } catch (error) {
            this._handleError(error, 'generateEmbeddings');
        }
    }

    /**
     * Chat with context (conversation mode)
     * @param {Array} messages - Array of message objects with role and content
     * @param {Object} options - Additional options
     * @returns {Promise<string>}
     */
    async chat(messages, options = {}) {
        const mergedOptions = this._mergeOptions(options);
        const url = `${this.baseURL}/api/chat`;

        const payload = {
            model: mergedOptions.model,
            messages: messages,
            stream: false,
            options: {
                temperature: mergedOptions.temperature,
                num_predict: mergedOptions.maxTokens
            }
        };

        try {
            const response = await this._fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            return data.message?.content || '';
        } catch (error) {
            this._handleError(error, 'chat');
        }
    }

    /**
     * @override
     */
    getModelInfo() {
        return {
            ...super.getModelInfo(),
            provider: 'Ollama',
            endpoint: this.baseURL,
            local: true,
            supportsStreaming: true,
            supportsEmbeddings: true,
            supportsChat: true
        };
    }
}
