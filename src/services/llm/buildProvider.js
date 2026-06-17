import LLMProviderFactory from './LLMProviderFactory'

/**
 * Build a configured LLM provider from the settings store for a given provider.
 * Resolves the API key from the per-provider keys, falling back to the legacy
 * single key when the requested provider is the configured one.
 *
 * @param {object} settings - settings store instance
 * @param {string} providerId - 'openai' | 'anthropic' | 'gemini' | 'ollama'
 * @param {string} [model] - Model id (defaults to the configured model)
 * @returns {import('./BaseLLMProvider').default}
 */
export function buildLLMProvider(settings, providerId, model) {
    const cfg = {
        model: model || settings.currentModel,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens
    }
    if (providerId === 'ollama') {
        cfg.baseURL = settings.ollamaBaseUrl
    } else {
        cfg.apiKey = settings.providerKeys?.[providerId]
            || (providerId === settings.currentProvider ? settings.apiKey : '')
    }
    return LLMProviderFactory.create(providerId, cfg)
}

export default buildLLMProvider
