# Pinia Stores

Global state management stores for the Lighthouse Analyzer app.

## Available Stores

### lighthouseStore

Main store for managing Lighthouse report state and parsed data.

```javascript
import { useLighthouseStore } from '@/stores'

const lighthouseStore = useLighthouseStore()

// Load a report
await lighthouseStore.loadReport(file)

// Access data
console.log(lighthouseStore.url)
console.log(lighthouseStore.scores)
console.log(lighthouseStore.coreWebVitals)

// Get failed audits
const failed = lighthouseStore.getFailedAudits('performance')

// Clear report
lighthouseStore.clearReport()
```

#### State

- `currentReport` - Full Lighthouse report object
- `parsedData` - Extracted and processed data
- `loading` - Loading state
- `error` - Error message
- `fileName` - Original filename
- `loadedAt` - ISO timestamp when loaded

#### Getters

- `url` - Page URL from report
- `scores` - Category scores object
- `coreWebVitals` - Core Web Vitals with ratings
- `opportunities` - Optimization opportunities sorted by impact
- `diagnostics` - Diagnostic information
- `categories` - All categories with extracted data
- `lighthouseVersion` - Lighthouse version used
- `userAgent` - User agent string
- `fetchTime` - Report fetch time
- `isLoaded` - Whether a report is currently loaded

#### Actions

- `loadReport(file)` - Load and parse a report (File, object, or JSON string)
- `clearReport()` - Clear current report
- `getFailedAudits(categoryId)` - Get failed audits for a category
- `getAudit(auditId)` - Get specific audit details
- `getCategory(categoryId)` - Get specific category details
- `getSummary()` - Get report summary for export/history

### settingsStore

Store for managing application settings including LLM configuration.

```javascript
import { useSettingsStore } from '@/stores'

const settings = useSettingsStore()

// Configure LLM
settings.setLLMProvider('openai')
settings.setAPIKey('sk-...')
settings.setLLMModel('gpt-4o')

// Set theme
settings.setTheme('dark')

// Check configuration
if (settings.isConfigured) {
  // Ready to analyze
}

// Get LLM config
const config = settings.llmConfig
```

#### State

**LLM Configuration:**

- `llmProvider` - 'openai' | 'anthropic' | 'ollama'
- `llmModel` - Model identifier
- `apiKey` - API key for OpenAI/Anthropic
- `temperature` - Temperature (0-2)
- `maxTokens` - Max tokens for response

**Ollama Configuration:**

- `ollamaBaseUrl` - Ollama server URL (default: http://localhost:11434)
- `ollamaModel` - Ollama model name

**UI Preferences:**

- `theme` - 'light' | 'dark' | 'system'
- `showLineNumbers` - Show line numbers in code blocks
- `autoAnalyze` - Auto-analyze on report load
- `saveHistory` - Save analyses to history

#### Getters

- `currentProvider` - Current LLM provider
- `isConfigured` - Whether LLM is configured and ready
- `currentModel` - Current model (handles ollama vs other providers)
- `llmConfig` - Complete LLM configuration object
- `modelOptions` - Available models for current provider

#### Actions

- `setLLMProvider(provider)` - Set LLM provider
- `setLLMModel(model)` - Set model
- `setAPIKey(key)` - Set API key
- `setTemperature(temp)` - Set temperature (0-2)
- `setMaxTokens(tokens)` - Set max tokens
- `setOllamaBaseUrl(url)` - Set Ollama base URL
- `setOllamaModel(model)` - Set Ollama model
- `setTheme(theme)` - Set theme
- `toggleLineNumbers()` - Toggle line numbers
- `toggleAutoAnalyze()` - Toggle auto analyze
- `toggleSaveHistory()` - Toggle save history
- `updateLLMConfig(config)` - Update multiple settings at once
- `saveSettings()` - Save to localStorage
- `loadSettings()` - Load from localStorage (called automatically)
- `resetSettings()` - Reset to defaults
- `clearAPIKey()` - Clear API key (security)

#### Model Options

**OpenAI:**

- GPT-4o
- GPT-4o Mini
- GPT-4 Turbo
- GPT-3.5 Turbo

**Anthropic:**

- Claude 3.5 Sonnet
- Claude 3.5 Haiku
- Claude 3 Opus

**Ollama:**

- Llama 3.2
- Llama 3.1
- Mistral
- Mixtral
- Qwen 2.5

### historyStore

Store for managing analysis history with persistence.

```javascript
import { useHistoryStore } from '@/stores'

const history = useHistoryStore()

// Add analysis
const id = history.addAnalysis({
  url: 'https://example.com',
  scores: { performance: 0.9 },
  analysis: 'Analysis text...'
})

// Get sorted analyses
const recent = history.sortedByDate

// Get analyses by URL
const byUrl = history.getAnalysesByUrl('https://example.com')

// Get grouped data
const grouped = history.groupedByUrl

// Remove analysis
history.removeAnalysis(id)

// Clear history
history.clearHistory()
```

#### State

- `analyses` - Array of analysis entries
- `loading` - Loading state
- `error` - Error message

#### Getters

- `sortedByDate` - Analyses sorted by date (newest first)
- `groupedByUrl` - Analyses grouped by URL
- `recentUrls` - Most recent 10 unique URLs
- `count` - Total number of analyses
- `isEmpty` - Whether history is empty

#### Actions

- `addAnalysis(analysis)` - Add new analysis (returns ID)
- `removeAnalysis(id)` - Remove analysis by ID
- `getAnalysis(id)` - Get specific analysis
- `getAnalysesByUrl(url)` - Get analyses for a URL
- `getAnalysesByDateRange(startDate, endDate)` - Get analyses in date range
- `clearHistory()` - Clear all history
- `clearOldHistory(days)` - Clear history older than N days
- `updateAnalysis(id, updates)` - Update existing analysis
- `getStatistics()` - Get history statistics
- `saveHistory()` - Save to localStorage
- `loadHistory()` - Load from localStorage (called automatically)
- `exportHistory()` - Export as JSON string
- `importHistory(json)` - Import from JSON string

#### Analysis Entry Structure

```javascript
{
  id: 'unique-id',
  timestamp: '2025-12-19T10:30:00.000Z',
  url: 'https://example.com',
  fileName: 'report.json',
  scores: {
    performance: 0.9,
    accessibility: 0.95,
    // ...
  },
  coreWebVitals: {
    lcp: { value: 2500, displayValue: '2.5 s', rating: 'good' },
    // ...
  },
  opportunities: [...], // Top 5
  failedAudits: [...], // Top 5
  analysis: 'Analysis text...',
  llmProvider: 'openai',
  llmModel: 'gpt-4o',
  lighthouseVersion: '11.0.0'
}
```

#### Features

- **Automatic persistence** to localStorage
- **Size limits**: 100 entries max, truncated data for storage
- **Quota handling**: Auto-cleanup on localStorage quota exceeded
- **Statistics**: Get insights about your analysis history
- **Export/Import**: Backup and restore history
- **Date filtering**: Find analyses by date range

## Usage

### Setup Pinia

Pinia is initialized in `/src/stores/index.js`:

```javascript
import { createPinia } from 'pinia'

export const pinia = createPinia()
```

And registered in `/src/main.js`:

```javascript
import { createApp } from 'vue'
import { pinia } from './stores'
import App from './App.vue'

createApp(App)
  .use(pinia)
  .mount('#app')
```

### Using Stores in Components

```vue
<script setup>
import { useLighthouseStore, useSettingsStore } from '@/stores'
import { storeToRefs } from 'pinia'

// Access stores
const lighthouseStore = useLighthouseStore()
const settings = useSettingsStore()

// Get reactive refs
const { url, scores, loading } = storeToRefs(lighthouseStore)
const { theme, isConfigured } = storeToRefs(settings)

// Call actions
async function loadFile(file) {
  await lighthouseStore.loadReport(file)
}
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="url">
    <h1>{{ url }}</h1>
    <div>Performance: {{ Math.round(scores.performance * 100) }}%</div>
  </div>
</template>
```

### Store Composition

Stores can access other stores:

```javascript
import { useLighthouseStore } from './lighthouseStore'
import { useSettingsStore } from './settingsStore'

export const useAnalysisStore = defineStore('analysis', () => {
  const lighthouseStore = useLighthouseStore()
  const settings = useSettingsStore()

  async function analyze() {
    if (!settings.isConfigured) {
      throw new Error('LLM not configured')
    }

    const report = lighthouseStore.currentReport
    // Analyze report...
  }

  return { analyze }
})
```

### Persistence

Settings and history automatically persist to localStorage:

- `lighthouse-settings` - Settings store
- `lighthouse-history` - History store

To clear all stored data:

```javascript
const settings = useSettingsStore()
const history = useHistoryStore()

settings.resetSettings()
history.clearHistory()
```

## Best Practices

1. **Use storeToRefs** - Extract reactive refs with `storeToRefs()` to maintain reactivity
2. **Keep stores focused** - Each store manages a specific domain
3. **Computed getters** - Use computed for derived state
4. **Action errors** - Handle errors in actions, expose via error state
5. **Persistence** - Be mindful of localStorage size limits
6. **Store composition** - Stores can use other stores for complex workflows
7. **Reset state** - Provide clear/reset actions for clean state management

## TypeScript Support

To add TypeScript support, create type definitions:

```typescript
// types/lighthouse.ts
export interface LighthouseReport {
  lighthouseVersion: string
  finalDisplayedUrl: string
  categories: Record<string, Category>
  audits: Record<string, Audit>
}

export interface Category {
  id: string
  title: string
  score: number
  // ...
}
```

And use in stores:

```typescript
import type { LighthouseReport } from '@/types/lighthouse'

const currentReport = ref<LighthouseReport | null>(null)
```
