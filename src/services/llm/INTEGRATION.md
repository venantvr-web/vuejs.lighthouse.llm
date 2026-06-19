# Integration Guide: LLM Multi-Provider System

Complete step-by-step guide for integrating the LLM system into your Vue.js Lighthouse analyzer.

## Table of Contents

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Basic Integration](#basic-integration)
4. [Vue 3 Composable](#vue-3-composable)
5. [Component Examples](#component-examples)
6. [Store Integration (Pinia)](#store-integration-pinia)
7. [API Routes (Express)](#api-routes-express)
8. [Error Handling](#error-handling)
9. [Testing](#testing)

## Installation

### 1. Copy Files

All files are already in `/src/services/llm/`:

- `BaseLLMProvider.js`
- `GeminiProvider.js`
- `OpenAIProvider.js`
- `AnthropicProvider.js`
- `OllamaProvider.js`
- `LLMProviderFactory.js`
- `index.js`

### 2. Environment Setup

Copy `.env.example` to your project root as `.env`:

```bash
cp src/services/llm/.env.example .env
```

Edit `.env` and add your API keys:

```env
VITE_LLM_PROVIDER=gemini
VITE_GEMINI_API_KEY=your_actual_key_here
```

### 3. Verify Setup

Run the test file:

```bash
node src/services/llm/test.js
```

## Configuration

### Simple Configuration

```javascript
import LLMProviderFactory from '@/services/llm/LLMProviderFactory';

// Use default (Gemini)
const provider = LLMProviderFactory.create('gemini', {
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  model: 'gemini-1.5-flash'
});
```

### From Environment

```javascript
const provider = LLMProviderFactory.createFromEnv();
```

### Multiple Providers

```javascript
const providers = LLMProviderFactory.createMultiple({
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY,
    model: 'gemini-1.5-flash'
  },
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    model: 'gpt-4-turbo'
  }
});
```

## Basic Integration

### 1. Create LLM Service

Create `/src/services/lighthouseAnalyzer.js`:

```javascript
import LLMProviderFactory from './llm/LLMProviderFactory';

class LighthouseAnalyzerService {
  constructor() {
    this.provider = null;
    this.initialize();
  }

  initialize() {
    const providerType = import.meta.env.VITE_LLM_PROVIDER || 'gemini';
    const config = {
      apiKey: this._getApiKey(providerType),
      model: this._getModel(providerType),
      temperature: 0.7,
      maxTokens: 2048
    };

    this.provider = LLMProviderFactory.create(providerType, config);
  }

  _getApiKey(type) {
    const keys = {
      gemini: import.meta.env.VITE_GEMINI_API_KEY,
      openai: import.meta.env.VITE_OPENAI_API_KEY,
      anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY
    };
    return keys[type] || '';
  }

  _getModel(type) {
    const models = {
      gemini: import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash',
      openai: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4-turbo',
      anthropic: import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
    };
    return models[type];
  }

  async analyzeLighthouseReport(reportData) {
    const prompt = this._buildAnalysisPrompt(reportData);
    return await this.provider.send(prompt);
  }

  async *streamAnalysis(reportData) {
    const prompt = this._buildAnalysisPrompt(reportData);
    for await (const chunk of this.provider.stream(prompt)) {
      yield chunk;
    }
  }

  _buildAnalysisPrompt(reportData) {
    return `
Analyze this Lighthouse performance report and provide actionable insights:

Performance Score: ${reportData.categories.performance.score * 100}
First Contentful Paint: ${reportData.audits['first-contentful-paint'].displayValue}
Largest Contentful Paint: ${reportData.audits['largest-contentful-paint'].displayValue}
Total Blocking Time: ${reportData.audits['total-blocking-time'].displayValue}
Cumulative Layout Shift: ${reportData.audits['cumulative-layout-shift'].displayValue}
Speed Index: ${reportData.audits['speed-index'].displayValue}

Key Opportunities:
${this._extractOpportunities(reportData)}

Please provide:
1. Overall performance assessment (2-3 sentences)
2. Top 3 critical issues with specific impact
3. Prioritized recommendations with implementation steps
4. Expected performance improvements for each recommendation

Format your response in clear sections with bullet points.
`;
  }

  _extractOpportunities(reportData) {
    const opportunities = reportData.audits;
    const topIssues = Object.entries(opportunities)
      .filter(([_, audit]) => audit.details && audit.details.overallSavingsMs > 100)
      .sort((a, b) => b[1].details.overallSavingsMs - a[1].details.overallSavingsMs)
      .slice(0, 5)
      .map(([key, audit]) => `- ${audit.title}: ${audit.displayValue}`)
      .join('\n');

    return topIssues || 'No major opportunities detected';
  }

  abort() {
    if (this.provider) {
      this.provider.abort();
    }
  }

  getProviderInfo() {
    return this.provider ? this.provider.getModelInfo() : null;
  }
}

export default new LighthouseAnalyzerService();
```

### 2. Use in Components

```vue
<script setup>
import { ref } from 'vue';
import lighthouseAnalyzer from '@/services/lighthouseAnalyzer';

const reportData = ref(null);
const analysis = ref('');
const isAnalyzing = ref(false);

async function analyze() {
  isAnalyzing.value = true;
  try {
    analysis.value = await lighthouseAnalyzer.analyzeLighthouseReport(reportData.value);
  } catch (error) {
    console.error('Analysis failed:', error);
  } finally {
    isAnalyzing.value = false;
  }
}
</script>
```

## Vue 3 Composable

Create `/src/composables/useLLM.js`:

```javascript
import { ref, readonly } from 'vue';
import LLMProviderFactory from '@/services/llm/LLMProviderFactory';

export function useLLM(providerType, config) {
  const provider = ref(null);
  const isLoading = ref(false);
  const error = ref(null);
  const response = ref('');
  const streamingText = ref('');

  // Initialize provider
  const initialize = () => {
    try {
      provider.value = LLMProviderFactory.create(providerType, config);
      error.value = null;
    } catch (err) {
      error.value = err.message;
      console.error('Failed to initialize provider:', err);
    }
  };

  // Send complete request
  const send = async (prompt, options = {}) => {
    if (!provider.value) {
      error.value = 'Provider not initialized';
      return null;
    }

    isLoading.value = true;
    error.value = null;
    response.value = '';

    try {
      response.value = await provider.value.send(prompt, options);
      return response.value;
    } catch (err) {
      error.value = err.message;
      console.error('Send failed:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  // Stream response
  const stream = async (prompt, options = {}) => {
    if (!provider.value) {
      error.value = 'Provider not initialized';
      return;
    }

    isLoading.value = true;
    error.value = null;
    streamingText.value = '';

    try {
      for await (const chunk of provider.value.stream(prompt, options)) {
        streamingText.value += chunk;
      }
      response.value = streamingText.value;
    } catch (err) {
      error.value = err.message;
      console.error('Stream failed:', err);
    } finally {
      isLoading.value = false;
    }
  };

  // Abort ongoing request
  const abort = () => {
    if (provider.value) {
      provider.value.abort();
      isLoading.value = false;
    }
  };

  // Get provider info
  const getInfo = () => {
    return provider.value ? provider.value.getModelInfo() : null;
  };

  // Initialize on creation
  initialize();

  return {
    send,
    stream,
    abort,
    getInfo,
    isLoading: readonly(isLoading),
    error: readonly(error),
    response: readonly(response),
    streamingText: readonly(streamingText)
  };
}
```

## Component Examples

### 1. Simple Analysis Component

```vue
<template>
  <div class="lighthouse-analyzer">
    <h2>Lighthouse Report Analyzer</h2>

    <button
      @click="analyze"
      :disabled="isLoading || !reportData"
      class="analyze-btn"
    >
      {{ isLoading ? 'Analyzing...' : 'Analyze Report' }}
    </button>

    <button
      v-if="isLoading"
      @click="abort"
      class="cancel-btn"
    >
      Cancel
    </button>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-if="response" class="analysis">
      <h3>Analysis Results</h3>
      <div v-html="formatMarkdown(response)"></div>
    </div>

    <div v-if="providerInfo" class="provider-info">
      Provider: {{ providerInfo.provider }} ({{ providerInfo.model }})
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useLLM } from '@/composables/useLLM';
import { marked } from 'marked'; // npm install marked

const props = defineProps({
  reportData: {
    type: Object,
    required: true
  }
});

const { send, abort, isLoading, error, response, getInfo } = useLLM(
  import.meta.env.VITE_LLM_PROVIDER || 'gemini',
  {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY,
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 2048
  }
);

const providerInfo = computed(() => getInfo());

const formatMarkdown = (text) => {
  return marked(text);
};

const buildPrompt = () => {
  return `Analyze this Lighthouse report:\n${JSON.stringify(props.reportData, null, 2)}`;
};

const analyze = async () => {
  await send(buildPrompt());
};
</script>

<style scoped>
.lighthouse-analyzer {
  padding: 20px;
}

.analyze-btn,
.cancel-btn {
  padding: 10px 20px;
  margin: 10px 5px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.analyze-btn {
  background: #42b983;
  color: white;
}

.analyze-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.cancel-btn {
  background: #dc3545;
  color: white;
}

.error {
  padding: 10px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  margin: 10px 0;
  color: #c33;
}

.analysis {
  margin-top: 20px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.provider-info {
  margin-top: 10px;
  font-size: 0.9em;
  color: #666;
}
</style>
```

### 2. Streaming Analysis Component

```vue
<template>
  <div class="streaming-analyzer">
    <button @click="startAnalysis" :disabled="isLoading">
      {{ isLoading ? 'Analyzing...' : 'Start Streaming Analysis' }}
    </button>

    <button v-if="isLoading" @click="stopAnalysis">
      Stop
    </button>

    <div v-if="streamingText" class="streaming-output">
      <div class="typing-indicator" v-if="isLoading">▋</div>
      <div v-html="formatMarkdown(streamingText)"></div>
    </div>
  </div>
</template>

<script setup>
import { useLLM } from '@/composables/useLLM';
import { marked } from 'marked';

const props = defineProps(['reportData']);

const { stream, abort, isLoading, streamingText } = useLLM('gemini', {
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  model: 'gemini-1.5-flash'
});

const formatMarkdown = (text) => marked(text);

const startAnalysis = async () => {
  const prompt = `Analyze: ${JSON.stringify(props.reportData)}`;
  await stream(prompt);
};

const stopAnalysis = () => {
  abort();
};
</script>

<style scoped>
.streaming-output {
  margin-top: 20px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  min-height: 200px;
}

.typing-indicator {
  display: inline;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>
```

## Store Integration (Pinia)

Create `/src/stores/llm.js`:

```javascript
import { defineStore } from 'pinia';
import LLMProviderFactory from '@/services/llm/LLMProviderFactory';

export const useLLMStore = defineStore('llm', {
  state: () => ({
    provider: null,
    providerType: 'gemini',
    isLoading: false,
    error: null,
    currentAnalysis: '',
    analysisHistory: []
  }),

  actions: {
    initialize(providerType, config) {
      try {
        this.providerType = providerType;
        this.provider = LLMProviderFactory.create(providerType, config);
        this.error = null;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async analyze(prompt, options = {}) {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      this.isLoading = true;
      this.error = null;
      this.currentAnalysis = '';

      try {
        this.currentAnalysis = await this.provider.send(prompt, options);

        // Add to history
        this.analysisHistory.push({
          timestamp: new Date(),
          prompt: prompt.substring(0, 100),
          response: this.currentAnalysis,
          provider: this.providerType
        });

        return this.currentAnalysis;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async *streamAnalysis(prompt, options = {}) {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      this.isLoading = true;
      this.error = null;
      this.currentAnalysis = '';

      try {
        for await (const chunk of this.provider.stream(prompt, options)) {
          this.currentAnalysis += chunk;
          yield chunk;
        }

        // Add to history
        this.analysisHistory.push({
          timestamp: new Date(),
          prompt: prompt.substring(0, 100),
          response: this.currentAnalysis,
          provider: this.providerType,
          streamed: true
        });
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    abort() {
      if (this.provider) {
        this.provider.abort();
        this.isLoading = false;
      }
    },

    clearHistory() {
      this.analysisHistory = [];
    },

    getProviderInfo() {
      return this.provider ? this.provider.getModelInfo() : null;
    }
  },

  getters: {
    hasProvider: (state) => !!state.provider,
    historyCount: (state) => state.analysisHistory.length
  }
});
```

## Testing

Create `/src/services/llm/__tests__/providers.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import LLMProviderFactory from '../LLMProviderFactory';
import GeminiProvider from '../GeminiProvider';

describe('LLMProviderFactory', () => {
  it('should list available providers', () => {
    const providers = LLMProviderFactory.getAvailableProviders();
    expect(providers).toContain('gemini');
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
    expect(providers).toContain('ollama');
  });

  it('should create provider instance', () => {
    const provider = LLMProviderFactory.create('gemini', {
      apiKey: 'test-key',
      model: 'gemini-1.5-flash'
    });
    expect(provider).toBeInstanceOf(GeminiProvider);
  });

  it('should validate configuration', () => {
    const result = LLMProviderFactory.validateConfig('gemini', {
      apiKey: 'test',
      model: 'gemini-1.5-flash'
    });
    expect(result.valid).toBe(true);
  });
});
```

## Deployment Checklist

- [ ] Add API keys to production environment variables
- [ ] Set up rate limiting for API calls
- [ ] Implement token usage tracking
- [ ] Add error logging and monitoring
- [ ] Configure CORS if using backend proxy
- [ ] Test with real Lighthouse data
- [ ] Set up fallback providers
- [ ] Document API costs and limits
- [ ] Add user feedback collection
- [ ] Monitor API response times

## Next Steps

1. Integrate into your existing Lighthouse analyzer
2. Add UI components for provider selection
3. Implement cost tracking and limits
4. Add caching for common analyses
5. Create custom prompts for specific use cases

For more examples, see `examples.js` in this directory.
