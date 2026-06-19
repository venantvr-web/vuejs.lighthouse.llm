/**
 * LLM Multi-Provider System - Usage Examples
 *
 * These examples demonstrate real-world usage scenarios for the LLM system
 * in a Vue.js Lighthouse analyzer application.
 */

import LLMProviderFactory from './LLMProviderFactory.js';

/* ============================================================================
 * EXAMPLE 1: Basic Lighthouse Report Analysis
 * ========================================================================= */

export async function analyzeLighthouseReport(reportData) {
    const provider = LLMProviderFactory.create('gemini', {
        apiKey: import.meta.env.VITE_GEMINI_API_KEY,
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 2048
    });

    const prompt = `
Analyze this Lighthouse performance report and provide actionable insights:

Performance Score: ${reportData.performance}
First Contentful Paint: ${reportData.fcp}ms
Largest Contentful Paint: ${reportData.lcp}ms
Total Blocking Time: ${reportData.tbt}ms
Cumulative Layout Shift: ${reportData.cls}

Please provide:
1. Overall assessment
2. Top 3 priority issues
3. Specific recommendations for improvement
`;

    try {
        const analysis = await provider.send(prompt);
        return {
            success: true,
            analysis: analysis,
            provider: provider.getModelInfo()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/* ============================================================================
 * EXAMPLE 2: Streaming Analysis with Real-time Updates
 * ========================================================================= */

export async function* streamLighthouseAnalysis(reportData, onProgress) {
    const provider = LLMProviderFactory.create('gemini', {
        apiKey: import.meta.env.VITE_GEMINI_API_KEY,
        model: 'gemini-1.5-flash'
    });

    const prompt = `
Provide a detailed analysis of this Lighthouse audit:

${JSON.stringify(reportData, null, 2)}

Include performance bottlenecks, accessibility issues, and SEO recommendations.
`;

    let fullResponse = '';

    try {
        for await (const chunk of provider.stream(prompt)) {
            fullResponse += chunk;

            // Call progress callback if provided
            if (onProgress) {
                onProgress(chunk, fullResponse);
            }

            yield {
                chunk: chunk,
                fullResponse: fullResponse
            };
        }
    } catch (error) {
        yield {
            error: error.message
        };
    }
}

/* ============================================================================
 * EXAMPLE 3: Multi-Provider Comparison
 * ========================================================================= */

export async function compareProvidersAnalysis(prompt) {
    const providers = {
        gemini: LLMProviderFactory.create('gemini', {
            apiKey: import.meta.env.VITE_GEMINI_API_KEY,
            model: 'gemini-1.5-flash'
        }),
        openai: LLMProviderFactory.create('openai', {
            apiKey: import.meta.env.VITE_OPENAI_API_KEY,
            model: 'gpt-4-turbo'
        }),
        claude: LLMProviderFactory.create('anthropic', {
            apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
            model: 'claude-3-5-sonnet-20241022'
        })
    };

    const results = {};

    // Run all providers in parallel
    await Promise.all(
        Object.entries(providers).map(async ([name, provider]) => {
            const startTime = Date.now();

            try {
                const response = await provider.send(prompt);
                const endTime = Date.now();

                results[name] = {
                    success: true,
                    response: response,
                    responseTime: endTime - startTime,
                    info: provider.getModelInfo()
                };
            } catch (error) {
                results[name] = {
                    success: false,
                    error: error.message
                };
            }
        })
    );

    return results;
}

/* ============================================================================
 * EXAMPLE 4: Ollama Local Analysis
 * ========================================================================= */

export async function analyzeWithLocalModel(reportData) {
    const ollama = LLMProviderFactory.create('ollama', {
        baseURL: 'http://localhost:11434',
        model: 'llama2',
        temperature: 0.7
    });

    // Check if Ollama is running
    const isConnected = await ollama.checkConnection();
    if (!isConnected) {
        return {
            success: false,
            error: 'Ollama is not running. Please start it with: ollama serve'
        };
    }

    // Get available models
    const availableModels = await ollama.getAvailableModels();
    console.log('Available models:', availableModels);

    const prompt = `Analyze this web performance data: ${JSON.stringify(reportData)}`;

    try {
        const analysis = await ollama.send(prompt);
        return {
            success: true,
            analysis: analysis,
            models: availableModels
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/* ============================================================================
 * EXAMPLE 5: Request Cancellation
 * ========================================================================= */

export class CancellableAnalysis {
    constructor(providerType = 'gemini', config = {}) {
        this.provider = LLMProviderFactory.create(providerType, config);
        this.isRunning = false;
    }

    async analyze(prompt, onChunk) {
        this.isRunning = true;
        let fullResponse = '';

        try {
            for await (const chunk of this.provider.stream(prompt)) {
                if (!this.isRunning) {
                    break;
                }

                fullResponse += chunk;

                if (onChunk) {
                    onChunk(chunk, fullResponse);
                }
            }

            return {
                success: true,
                response: fullResponse,
                cancelled: !this.isRunning
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isRunning = false;
        }
    }

    cancel() {
        this.isRunning = false;
        this.provider.abort();
    }
}

/* ============================================================================
 * EXAMPLE 6: Batch Processing with Rate Limiting
 * ========================================================================= */

export class BatchLighthouseAnalyzer {
    constructor(providerConfig, options = {}) {
        this.provider = LLMProviderFactory.create(
            options.providerType || 'gemini',
            providerConfig
        );
        this.batchSize = options.batchSize || 3;
        this.delayMs = options.delayMs || 1000;
    }

    async analyzeMultipleReports(reports, onProgress) {
        const results = [];

        for (let i = 0; i < reports.length; i += this.batchSize) {
            const batch = reports.slice(i, i + this.batchSize);

            const batchResults = await Promise.all(
                batch.map(async (report) => {
                    try {
                        const prompt = `Analyze this Lighthouse report: ${JSON.stringify(report)}`;
                        const analysis = await this.provider.send(prompt);

                        return {
                            reportId: report.id,
                            success: true,
                            analysis: analysis
                        };
                    } catch (error) {
                        return {
                            reportId: report.id,
                            success: false,
                            error: error.message
                        };
                    }
                })
            );

            results.push(...batchResults);

            if (onProgress) {
                onProgress({
                    processed: results.length,
                    total: reports.length,
                    percentage: (results.length / reports.length) * 100
                });
            }

            // Delay between batches
            if (i + this.batchSize < reports.length) {
                await new Promise(resolve => setTimeout(resolve, this.delayMs));
            }
        }

        return results;
    }
}

/* ============================================================================
 * EXAMPLE 7: Provider Fallback System
 * ========================================================================= */

export class FallbackAnalyzer {
    constructor(configs) {
        this.providers = configs.map(config => ({
            provider: LLMProviderFactory.create(config.type, config.config),
            name: config.type
        }));
        this.currentIndex = 0;
    }

    async analyze(prompt, options = {}) {
        const maxRetries = options.maxRetries || this.providers.length;
        const errors = [];

        for (let i = 0; i < maxRetries; i++) {
            const {provider, name} = this.providers[this.currentIndex];

            try {
                console.log(`Attempting analysis with ${name}...`);
                const response = await provider.send(prompt);

                return {
                    success: true,
                    response: response,
                    provider: name,
                    attempts: i + 1
                };
            } catch (error) {
                console.error(`${name} failed:`, error.message);
                errors.push({provider: name, error: error.message});

                // Move to next provider
                this.currentIndex = (this.currentIndex + 1) % this.providers.length;
            }
        }

        return {
            success: false,
            errors: errors,
            message: 'All providers failed'
        };
    }
}

/* ============================================================================
 * EXAMPLE 8: Conversation Context Management
 * ========================================================================= */

export class ConversationalAnalyzer {
    constructor(providerType = 'openai', config = {}) {
        this.provider = LLMProviderFactory.create(providerType, config);
        this.conversationHistory = [];
        this.systemMessage = config.systemMessage ||
            'You are a web performance expert specializing in Lighthouse analysis.';
    }

    async ask(question) {
        // Add user message
        this.conversationHistory.push({
            role: 'user',
            content: question
        });

        try {
            const response = await this.provider.send(question, {
                systemMessage: this.systemMessage,
                messages: this.conversationHistory
            });

            // Add assistant response
            this.conversationHistory.push({
                role: 'assistant',
                content: response
            });

            return {
                success: true,
                response: response,
                historyLength: this.conversationHistory.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    clearHistory() {
        this.conversationHistory = [];
    }

    getHistory() {
        return [...this.conversationHistory];
    }
}

/* ============================================================================
 * EXAMPLE 9: Token Usage Tracking
 * ========================================================================= */

export class TokenTrackedAnalyzer {
    constructor(providerType, config) {
        this.provider = LLMProviderFactory.create(providerType, config);
        this.providerType = providerType;
        this.totalTokensUsed = 0;
        this.requestCount = 0;
    }

    async analyze(prompt) {
        this.requestCount++;

        try {
            // Count input tokens (if provider supports it)
            if (this.provider.countTokens) {
                const inputTokens = await this.provider.countTokens(prompt);
                console.log(`Input tokens: ${inputTokens}`);
            }

            const response = await this.provider.send(prompt);

            // Estimate output tokens (rough approximation)
            const outputTokens = Math.ceil(response.length / 4);
            this.totalTokensUsed += outputTokens;

            return {
                success: true,
                response: response,
                stats: this.getStats()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    getStats() {
        return {
            totalTokens: this.totalTokensUsed,
            requestCount: this.requestCount,
            avgTokensPerRequest: this.requestCount > 0
                ? Math.round(this.totalTokensUsed / this.requestCount)
                : 0
        };
    }

    reset() {
        this.totalTokensUsed = 0;
        this.requestCount = 0;
    }
}

/* ============================================================================
 * EXAMPLE 10: Vue Composable Example
 * ========================================================================= */

export function createLighthouseAnalyzerComposable() {
    return function useLighthouseAnalyzer(providerType = 'gemini') {
        const provider = ref(null);
        const isAnalyzing = ref(false);
        const analysis = ref('');
        const error = ref(null);
        const streamingChunks = ref([]);

        const initialize = (config) => {
            try {
                provider.value = LLMProviderFactory.create(providerType, config);
            } catch (err) {
                error.value = err.message;
            }
        };

        const analyze = async (reportData) => {
            if (!provider.value) return;

            isAnalyzing.value = true;
            error.value = null;
            analysis.value = '';

            const prompt = `
Analyze this Lighthouse report:
${JSON.stringify(reportData, null, 2)}

Provide specific, actionable recommendations.
`;

            try {
                analysis.value = await provider.value.send(prompt);
            } catch (err) {
                error.value = err.message;
            } finally {
                isAnalyzing.value = false;
            }
        };

        const analyzeStreaming = async (reportData) => {
            if (!provider.value) return;

            isAnalyzing.value = true;
            error.value = null;
            analysis.value = '';
            streamingChunks.value = [];

            const prompt = `Analyze: ${JSON.stringify(reportData)}`;

            try {
                for await (const chunk of provider.value.stream(prompt)) {
                    streamingChunks.value.push(chunk);
                    analysis.value += chunk;
                }
            } catch (err) {
                error.value = err.message;
            } finally {
                isAnalyzing.value = false;
            }
        };

        const cancel = () => {
            if (provider.value) {
                provider.value.abort();
                isAnalyzing.value = false;
            }
        };

        return {
            initialize,
            analyze,
            analyzeStreaming,
            cancel,
            isAnalyzing: readonly(isAnalyzing),
            analysis: readonly(analysis),
            error: readonly(error),
            streamingChunks: readonly(streamingChunks)
        };
    };
}

/* ============================================================================
 * EXAMPLE 11: Environment-based Configuration
 * ========================================================================= */

export function createProviderFromEnvironment() {
    try {
        return LLMProviderFactory.createFromEnv({
            LLM_PROVIDER: import.meta.env.VITE_LLM_PROVIDER || 'gemini',
            LLM_API_KEY: import.meta.env.VITE_GEMINI_API_KEY ||
                import.meta.env.VITE_OPENAI_API_KEY ||
                import.meta.env.VITE_ANTHROPIC_API_KEY,
            LLM_MODEL: import.meta.env.VITE_LLM_MODEL,
            LLM_TEMPERATURE: import.meta.env.VITE_LLM_TEMPERATURE || '0.7',
            LLM_MAX_TOKENS: import.meta.env.VITE_LLM_MAX_TOKENS || '2048'
        });
    } catch (error) {
        console.error('Failed to create provider from environment:', error);
        throw error;
    }
}

/* ============================================================================
 * USAGE EXAMPLES
 * ========================================================================= */

// Example 1: Simple analysis
// const result = await analyzeLighthouseReport(reportData);

// Example 2: Streaming
// for await (const update of streamLighthouseAnalysis(reportData, (chunk) => {
//   console.log('New chunk:', chunk);
// })) {
//   console.log('Progress:', update.fullResponse.length);
// }

// Example 3: Multi-provider comparison
// const comparison = await compareProvidersAnalysis('Explain Core Web Vitals');

// Example 4: Local model
// const localResult = await analyzeWithLocalModel(reportData);

// Example 5: Cancellable
// const analyzer = new CancellableAnalysis('gemini', { apiKey: '...' });
// const promise = analyzer.analyze('Long prompt...', (chunk) => console.log(chunk));
// setTimeout(() => analyzer.cancel(), 5000);

// Example 6: Batch processing
// const batchAnalyzer = new BatchLighthouseAnalyzer({ apiKey: '...' });
// const results = await batchAnalyzer.analyzeMultipleReports(reports, (progress) => {
//   console.log(`Progress: ${progress.percentage}%`);
// });

// Example 7: Fallback system
// const fallback = new FallbackAnalyzer([
//   { type: 'gemini', config: { apiKey: '...' } },
//   { type: 'openai', config: { apiKey: '...' } }
// ]);
// const result = await fallback.analyze('Analyze this...');

// Example 8: Conversation
// const chat = new ConversationalAnalyzer('openai', { apiKey: '...' });
// await chat.ask('What is LCP?');
// await chat.ask('How can I improve it?');
