import GeminiProvider from './GeminiProvider.js';
import OpenAIProvider from './OpenAIProvider.js';
import AnthropicProvider from './AnthropicProvider.js';
import OllamaProvider from './OllamaProvider.js';

/**
 * Factory for creating LLM provider instances
 * Implements the Factory pattern for provider instantiation
 */
export default class LLMProviderFactory {
    /**
     * Map of provider types to their classes
     * @private
     */
    static providers = new Map([
        ['gemini', GeminiProvider],
        ['openai', OpenAIProvider],
        ['anthropic', AnthropicProvider],
        ['claude', AnthropicProvider], // Alias for Anthropic
        ['ollama', OllamaProvider]
    ]);

    /**
     * Default provider type
     * @private
     */
    static defaultProvider = 'gemini';

    /**
     * Create a provider instance
     * @param {string} type - Provider type (gemini, openai, anthropic, ollama)
     * @param {Object} config - Provider configuration
     * @returns {BaseLLMProvider} - Provider instance
     * @throws {Error} If provider type is not registered
     */
    static create(type, config = {}) {
        // Normalize type to lowercase
        const normalizedType = (type || this.defaultProvider).toLowerCase().trim();

        // Get provider class
        const ProviderClass = this.providers.get(normalizedType);

        if (!ProviderClass) {
            throw new Error(
                `Unknown provider type: "${type}". Available providers: ${this.getAvailableProviders().join(', ')}`
            );
        }

        try {
            return new ProviderClass(config);
        } catch (error) {
            throw new Error(`Failed to create ${type} provider: ${error.message}`);
        }
    }

    /**
     * Register a custom provider
     * @param {string} type - Provider type identifier
     * @param {Class} providerClass - Provider class (must extend BaseLLMProvider)
     * @throws {Error} If provider class is invalid
     */
    static register(type, providerClass) {
        if (!type || typeof type !== 'string') {
            throw new Error('Provider type must be a non-empty string');
        }

        if (typeof providerClass !== 'function') {
            throw new Error('Provider class must be a constructor function');
        }

        // Check if class extends BaseLLMProvider
        const testInstance = Object.create(providerClass.prototype);
        if (!testInstance.send || !testInstance.stream) {
            throw new Error('Provider class must extend BaseLLMProvider and implement send() and stream() methods');
        }

        const normalizedType = type.toLowerCase().trim();
        this.providers.set(normalizedType, providerClass);
    }

    /**
     * Unregister a provider
     * @param {string} type - Provider type to remove
     * @returns {boolean} - True if provider was removed
     */
    static unregister(type) {
        const normalizedType = type.toLowerCase().trim();
        return this.providers.delete(normalizedType);
    }

    /**
     * Get list of available provider types
     * @returns {Array<string>} - Array of provider type names
     */
    static getAvailableProviders() {
        return Array.from(this.providers.keys());
    }

    /**
     * Check if a provider type is registered
     * @param {string} type - Provider type to check
     * @returns {boolean}
     */
    static hasProvider(type) {
        const normalizedType = type.toLowerCase().trim();
        return this.providers.has(normalizedType);
    }

    /**
     * Get provider class without instantiating
     * @param {string} type - Provider type
     * @returns {Class|null} - Provider class or null if not found
     */
    static getProviderClass(type) {
        const normalizedType = type.toLowerCase().trim();
        return this.providers.get(normalizedType) || null;
    }

    /**
     * Get information about all registered providers
     * @returns {Array<Object>}
     */
    static getProvidersInfo() {
        const info = [];

        for (const [type, ProviderClass] of this.providers.entries()) {
            try {
                // Create a temporary instance to get default model
                const tempInstance = new ProviderClass({apiKey: 'temp'});
                info.push({
                    type: type,
                    name: ProviderClass.name,
                    defaultModel: tempInstance.getDefaultModel(),
                    requiresApiKey: tempInstance.requiresApiKey(),
                    description: this._getProviderDescription(type)
                });
            } catch (error) {
                // If we can't instantiate, provide basic info
                info.push({
                    type: type,
                    name: ProviderClass.name,
                    description: this._getProviderDescription(type)
                });
            }
        }

        return info;
    }

    /**
     * Get human-readable description for provider
     * @private
     * @param {string} type - Provider type
     * @returns {string}
     */
    static _getProviderDescription(type) {
        const descriptions = {
            'gemini': 'Google Gemini API - Fast and efficient AI models',
            'openai': 'OpenAI API - GPT models including GPT-4',
            'anthropic': 'Anthropic Claude API - Advanced reasoning capabilities',
            'claude': 'Anthropic Claude API - Advanced reasoning capabilities',
            'ollama': 'Ollama - Run models locally without API keys'
        };

        return descriptions[type] || 'Custom LLM provider';
    }

    /**
     * Create provider from environment variables
     * @param {Object} env - Environment variables object (defaults to process.env)
     * @returns {BaseLLMProvider}
     */
    static createFromEnv(env = process.env) {
        // Determine provider type from env
        const providerType = env.LLM_PROVIDER || env.VITE_LLM_PROVIDER || this.defaultProvider;

        // Build config from env
        const config = {
            apiKey: env.LLM_API_KEY || env.VITE_LLM_API_KEY,
            model: env.LLM_MODEL || env.VITE_LLM_MODEL,
            temperature: parseFloat(env.LLM_TEMPERATURE || env.VITE_LLM_TEMPERATURE || '0.7'),
            maxTokens: parseInt(env.LLM_MAX_TOKENS || env.VITE_LLM_MAX_TOKENS || '2048', 10)
        };

        // Add provider-specific config
        if (providerType === 'ollama') {
            config.baseURL = env.OLLAMA_BASE_URL || env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434';
        } else if (providerType === 'openai') {
            config.organization = env.OPENAI_ORGANIZATION || env.VITE_OPENAI_ORGANIZATION;
        }

        return this.create(providerType, config);
    }

    /**
     * Create multiple providers at once
     * @param {Object} configs - Object with provider types as keys and configs as values
     * @returns {Object} - Object with provider types as keys and instances as values
     */
    static createMultiple(configs) {
        const instances = {};

        for (const [type, config] of Object.entries(configs)) {
            try {
                instances[type] = this.create(type, config);
            } catch (error) {
                console.error(`Failed to create ${type} provider:`, error);
            }
        }

        return instances;
    }

    /**
     * Validate provider configuration
     * @param {string} type - Provider type
     * @param {Object} config - Configuration to validate
     * @returns {Object} - Validation result with { valid: boolean, errors: Array<string> }
     */
    static validateConfig(type, config) {
        const result = {
            valid: true,
            errors: []
        };

        try {
            const instance = this.create(type, config);
            instance.validateConfig();
        } catch (error) {
            result.valid = false;
            result.errors.push(error.message);
        }

        return result;
    }

    /**
     * Set default provider type
     * @param {string} type - Provider type to set as default
     * @throws {Error} If provider type is not registered
     */
    static setDefaultProvider(type) {
        const normalizedType = type.toLowerCase().trim();

        if (!this.providers.has(normalizedType)) {
            throw new Error(
                `Cannot set unknown provider "${type}" as default. Available: ${this.getAvailableProviders().join(', ')}`
            );
        }

        this.defaultProvider = normalizedType;
    }

    /**
     * Get current default provider type
     * @returns {string}
     */
    static getDefaultProvider() {
        return this.defaultProvider;
    }

    /**
     * Clone a provider instance with new config
     * @param {BaseLLMProvider} provider - Provider instance to clone
     * @param {Object} newConfig - New configuration (merged with existing)
     * @returns {BaseLLMProvider}
     */
    static clone(provider, newConfig = {}) {
        const providerName = provider.constructor.name;
        const type = Array.from(this.providers.entries())
            .find(([_, ProviderClass]) => ProviderClass.name === providerName)?.[0];

        if (!type) {
            throw new Error(`Cannot clone unknown provider: ${providerName}`);
        }

        const mergedConfig = {
            ...provider.config,
            ...newConfig
        };

        return this.create(type, mergedConfig);
    }
}
