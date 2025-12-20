# Quick Start Guide - LLM Multi-Provider System

Get up and running in 5 minutes!

## Step 1: Set Up Environment (1 minute)

```bash
# Copy the example environment file
cp src/services/llm/.env.example .env

# Edit .env and add your API key (pick one)
# For Gemini (RECOMMENDED - FREE):
VITE_LLM_PROVIDER=gemini
VITE_GEMINI_API_KEY=your_key_here

# Get free Gemini key: https://makersuite.google.com/app/apikey
```

## Step 2: Basic Usage (1 minute)

```javascript
// In your Vue component or JS file
import LLMProviderFactory from '@/services/llm/LLMProviderFactory';

// Create provider
const provider = LLMProviderFactory.create('gemini', {
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  model: 'gemini-1.5-flash'
});

// Analyze Lighthouse data
const analysis = await provider.send(`
  Analyze this Lighthouse report:
  Performance: 85/100
  FCP: 1.2s
  LCP: 2.1s

  What should I improve first?
`);

console.log(analysis);
```

## Step 3: Vue Component (2 minutes)

```vue
<template>
  <div>
    <textarea v-model="reportData" rows="10" cols="50"></textarea>
    <button @click="analyze" :disabled="loading">
      {{ loading ? 'Analyzing...' : 'Analyze' }}
    </button>
    <div v-if="result">{{ result }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import LLMProviderFactory from '@/services/llm/LLMProviderFactory';

const reportData = ref('');
const result = ref('');
const loading = ref(false);

const provider = LLMProviderFactory.create('gemini', {
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  model: 'gemini-1.5-flash'
});

async function analyze() {
  loading.value = true;
  try {
    result.value = await provider.send(`Analyze: ${reportData.value}`);
  } catch (error) {
    result.value = 'Error: ' + error.message;
  } finally {
    loading.value = false;
  }
}
</script>
```

## Step 4: Streaming (1 minute)

```javascript
// Real-time streaming responses
for await (const chunk of provider.stream('Explain Core Web Vitals')) {
  console.log(chunk); // Shows text as it's generated
  // Update UI here
}
```

## That's It!

You're now using AI to analyze Lighthouse reports!

### What's Next?

- **Switch Providers**: Change `gemini` to `openai`, `anthropic`, or `ollama`
- **Streaming UI**: See `examples.js` for streaming component
- **Advanced**: Check `INTEGRATION.md` for Pinia store integration
- **Local Models**: Install Ollama for free, offline analysis

### Common Issues

**"API key is required"**
→ Add your key to `.env` file

**"CORS error"**
→ API calls work in production, or use a backend proxy

**"Module not found"**
→ Check import path: `@/services/llm/LLMProviderFactory`

### Get API Keys (All Have Free Tiers!)

- **Gemini**: https://makersuite.google.com/app/apikey (FREE, FAST)
- **OpenAI**: https://platform.openai.com/api-keys ($5 free credit)
- **Anthropic**: https://console.anthropic.com/ ($5 free credit)
- **Ollama**: https://ollama.ai/ (FREE, runs locally)

### Provider Comparison

| Provider | Speed | Cost | Quality | Free Tier |
|----------|-------|------|---------|-----------|
| Gemini   | ⚡⚡⚡ | $ | ⭐⭐⭐⭐ | ✅ Unlimited* |
| OpenAI   | ⚡⚡ | $$$ | ⭐⭐⭐⭐⭐ | ✅ $5 credit |
| Claude   | ⚡⚡ | $$ | ⭐⭐⭐⭐⭐ | ✅ $5 credit |
| Ollama   | ⚡ | FREE | ⭐⭐⭐ | ✅ Unlimited |

*Rate limits apply

### Example Use Cases

1. **Performance Analysis**
   ```javascript
   const analysis = await provider.send(`
     My site scores 45 on Lighthouse Performance.
     LCP is 4.5s, TBT is 800ms.
     What's the quickest win?
   `);
   ```

2. **Code Review**
   ```javascript
   const review = await provider.send(`
     Review this Vue component for performance issues:
     ${componentCode}
   `);
   ```

3. **SEO Recommendations**
   ```javascript
   const seo = await provider.send(`
     My Lighthouse SEO score is 78.
     Missing meta descriptions on 5 pages.
     How do I fix this in Vue.js?
   `);
   ```

### Need Help?

- Read `README.md` for full documentation
- Check `examples.js` for 11 real-world examples
- See `INTEGRATION.md` for complete integration guide
- Run `node src/services/llm/test.js` to verify setup

**Pro Tip**: Start with Gemini (it's free and fast), then upgrade to GPT-4 or Claude for complex analysis.
