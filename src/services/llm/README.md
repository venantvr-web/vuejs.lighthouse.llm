# LLM Multi-Provider System

A comprehensive, production-ready multi-provider system for integrating various LLM APIs into your Vue.js Lighthouse analyzer app.

## Features

- **Multiple Providers**: Gemini (default), OpenAI, Anthropic Claude, and Ollama
- **Factory Pattern**: Easy provider instantiation and management
- **Streaming Support**: All providers support streaming responses via async generators
- **Request Cancellation**: AbortController integration for canceling ongoing requests
- **Error Handling**: Comprehensive error handling with meaningful messages
- **Extensible**: Easy to add custom providers
- **Type Safety**: JSDoc annotations throughout
- **Configuration Validation**: Automatic validation of provider configurations

## Quick Start

### Basic Usage

```javascript
import LLMProviderFactory from './services/llm/LLMProviderFactory.js';

// Create a Gemini provider (default)
const gemini = LLMProviderFactory.create('gemini', {
  apiKey: 'YOUR_GEMINI_API_KEY',
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  maxTokens: 2048
});

// Send a prompt
const response = await gemini.send('Analyze this Lighthouse report...');
console.log(response);
```

### Streaming Responses

```javascript
// Stream responses chunk by chunk
for await (const chunk of gemini.stream('Explain Vue.js performance optimization...')) {
  console.log(chunk); // Process each chunk as it arrives
  // Update UI in real-time
}
```

### Request Cancellation

```javascript
// Start streaming
const streamPromise = (async () => {
  for await (const chunk of provider.stream('Long analysis...')) {
    console.log(chunk);
  }
})();

// Cancel after 5 seconds
setTimeout(() => {
  provider.abort();
  console.log('Request cancelled');
}, 5000);
```

## Providers

### Gemini Provider (DEFAULT)

Google's Gemini AI models - fast and efficient.

```javascript
const gemini = LLMProviderFactory.create('gemini', {
  apiKey: 'YOUR_GEMINI_API_KEY',
  model: 'gemini-1.5-flash', // or 'gemini-1.5-pro'
  temperature: 0.7,
  maxTokens: 2048
});

// Get available models
const models = await gemini.getAvailableModels();

// Count tokens
const tokenCount = await gemini.countTokens('Your text here');
```

### OpenAI Provider

OpenAI's GPT models including GPT-4.

```javascript
const openai = LLMProviderFactory.create('openai', {
  apiKey: 'YOUR_OPENAI_API_KEY',
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 2048,
  organization: 'YOUR_ORG_ID' // Optional
});

// Use with system message
const response = await openai.send('Analyze this code', {
  systemMessage: 'You are a code review expert.',
  topP: 0.9
});

// Create embeddings
const embeddings = await openai.createEmbeddings('Text to embed');
```

### Anthropic Provider

Anthropic's Claude models with advanced reasoning.

```javascript
const claude = LLMProviderFactory.create('anthropic', {
  apiKey: 'YOUR_ANTHROPIC_API_KEY',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  maxTokens: 2048
});

// Use with system message
const response = await claude.send('Explain quantum computing', {
  systemMessage: 'You are a physics professor.',
  topK: 40
});

// Count tokens
const tokens = await claude.countTokens('Your text here');
```

### Ollama Provider

Run models locally without API keys.

```javascript
const ollama = LLMProviderFactory.create('ollama', {
  baseURL: 'http://localhost:11434',
  model: 'llama2',
  temperature: 0.7,
  maxTokens: 2048
});

// Check connection
const isConnected = await ollama.checkConnection();

// Get available local models
const models = await ollama.getAvailableModels();

// Pull a new model
for await (const progress of ollama.pullModel('llama2')) {
  console.log(`Progress: ${progress.status}`);
}

// Chat mode with context
const response = await ollama.chat([
  { role: 'user', content: 'Hello!' },
  { role: 'assistant', content: 'Hi! How can I help?' },
  { role: 'user', content: 'Tell me about Vue.js' }
]);

// Generate embeddings
const embeddings = await ollama.generateEmbeddings('Your text here');
```

## Factory Methods

### Create Provider

```javascript
// Create single provider
const provider = LLMProviderFactory.create('gemini', config);

// Create from environment variables
const provider = LLMProviderFactory.createFromEnv();
// Uses: LLM_PROVIDER, LLM_API_KEY, LLM_MODEL, etc.

// Create multiple providers
const providers = LLMProviderFactory.createMultiple({
  gemini: { apiKey: 'key1', model: 'gemini-1.5-flash' },
  openai: { apiKey: 'key2', model: 'gpt-4-turbo' }
});
```

### Register Custom Provider

```javascript
import BaseLLMProvider from './services/llm/BaseLLMProvider.js';

class MyCustomProvider extends BaseLLMProvider {
  getDefaultModel() {
    return 'my-model';
  }

  async send(prompt, options) {
    // Implementation
  }

  async *stream(prompt, options) {
    // Implementation
  }
}

// Register the provider
LLMProviderFactory.register('custom', MyCustomProvider);

// Use it
const provider = LLMProviderFactory.create('custom', config);
```

### Provider Information

```javascript
// Get available providers
const providers = LLMProviderFactory.getAvailableProviders();
// ['gemini', 'openai', 'anthropic', 'claude', 'ollama']

// Get providers info
const info = LLMProviderFactory.getProvidersInfo();
// [{ type: 'gemini', name: 'GeminiProvider', defaultModel: '...', ... }]

// Check if provider exists
const exists = LLMProviderFactory.hasProvider('gemini'); // true

// Validate configuration
const validation = LLMProviderFactory.validateConfig('openai', {
  apiKey: 'test',
  model: 'gpt-4'
});
// { valid: true, errors: [] }
```

## Vue.js Integration

### Composable

```javascript
// composables/useLLM.js
import { ref, readonly } from 'vue';
import LLMProviderFactory from '@/services/llm/LLMProviderFactory';

export function useLLM(providerType = 'gemini', config = {}) {
  const provider = ref(null);
  const isLoading = ref(false);
  const error = ref(null);
  const response = ref('');

  const initialize = () => {
    try {
      provider.value = LLMProviderFactory.create(providerType, config);
    } catch (err) {
      error.value = err.message;
    }
  };

  const send = async (prompt, options = {}) => {
    if (!provider.value) return;

    isLoading.value = true;
    error.value = null;
    response.value = '';

    try {
      response.value = await provider.value.send(prompt, options);
    } catch (err) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  };

  const stream = async (prompt, options = {}) => {
    if (!provider.value) return;

    isLoading.value = true;
    error.value = null;
    response.value = '';

    try {
      for await (const chunk of provider.value.stream(prompt, options)) {
        response.value += chunk;
      }
    } catch (err) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  };

  const abort = () => {
    if (provider.value) {
      provider.value.abort();
    }
  };

  initialize();

  return {
    send,
    stream,
    abort,
    isLoading: readonly(isLoading),
    error: readonly(error),
    response: readonly(response),
    provider: readonly(provider)
  };
}
```

### Component Usage

```vue
<template>
  <div>
    <textarea v-model="prompt" placeholder="Enter your prompt..."></textarea>
    <button @click="analyze" :disabled="isLoading">
      {{ isLoading ? 'Analyzing...' : 'Analyze' }}
    </button>
    <button @click="analyzeStream" :disabled="isLoading">
      Stream Response
    </button>
    <button @click="abort" v-if="isLoading">Cancel</button>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="response" class="response">{{ response }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useLLM } from '@/composables/useLLM';

const prompt = ref('');

const { send, stream, abort, isLoading, error, response } = useLLM('gemini', {
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  model: 'gemini-1.5-flash',
  temperature: 0.7
});

const analyze = async () => {
  await send(prompt.value);
};

const analyzeStream = async () => {
  await stream(prompt.value);
};
</script>
```

## Environment Variables

```env
# Provider type
VITE_LLM_PROVIDER=gemini

# Gemini
VITE_GEMINI_API_KEY=your_gemini_key

# OpenAI
VITE_OPENAI_API_KEY=your_openai_key
VITE_OPENAI_ORGANIZATION=your_org_id

# Anthropic
VITE_ANTHROPIC_API_KEY=your_anthropic_key

# Ollama
VITE_OLLAMA_BASE_URL=http://localhost:11434

# Common settings
VITE_LLM_MODEL=gemini-1.5-flash
VITE_LLM_TEMPERATURE=0.7
VITE_LLM_MAX_TOKENS=2048
```

## Advanced Usage

### Custom Options Per Request

```javascript
const response = await provider.send('Analyze this', {
  temperature: 0.9,
  maxTokens: 4096,
  topP: 0.95,
  systemMessage: 'You are an expert analyst.'
});
```

### Error Handling

```javascript
try {
  const response = await provider.send(prompt);
} catch (error) {
  if (error.message.includes('aborted')) {
    console.log('User cancelled request');
  } else if (error.message.includes('filtered')) {
    console.log('Content was filtered');
  } else {
    console.error('API error:', error);
  }
}
```

### Model Information

```javascript
const info = provider.getModelInfo();
console.log(info);
// {
//   provider: 'Gemini',
//   model: 'gemini-1.5-flash',
//   temperature: 0.7,
//   maxTokens: 2048,
//   streaming: false,
//   supportsStreaming: true,
//   ...
// }
```

## Architecture

### Class Hierarchy

```
BaseLLMProvider (Abstract)
├── GeminiProvider
├── OpenAIProvider
├── AnthropicProvider
└── OllamaProvider
```

### Key Methods

All providers implement:

- `send(prompt, options)` - Send prompt, get complete response
- `stream(prompt, options)` - Stream response chunks
- `abort()` - Cancel ongoing request
- `validateConfig()` - Validate configuration
- `getModelInfo()` - Get provider information

## Best Practices

1. **Always handle errors**: Wrap API calls in try-catch blocks
2. **Use streaming for long responses**: Better UX with real-time feedback
3. **Implement cancellation**: Allow users to abort long-running requests
4. **Validate configurations**: Check configs before creating providers
5. **Store API keys securely**: Use environment variables, never commit keys
6. **Set appropriate timeouts**: Prevent hanging requests
7. **Monitor token usage**: Track costs and limits

## Troubleshooting

### Common Issues

**API Key Error**

```javascript
// Error: API key is required for GeminiProvider
// Solution: Provide valid API key in config
const provider = LLMProviderFactory.create('gemini', {
  apiKey: 'your_valid_key'
});
```

**Ollama Connection Error**

```javascript
// Check if Ollama is running
const isConnected = await ollama.checkConnection();
if (!isConnected) {
  console.log('Start Ollama with: ollama serve');
}
```

**Streaming Not Working**

```javascript
// Make sure to await inside the loop
for await (const chunk of provider.stream(prompt)) {
  // Process chunk
}
```

## License

MIT

## Contributing

Feel free to extend this system with additional providers or features!
