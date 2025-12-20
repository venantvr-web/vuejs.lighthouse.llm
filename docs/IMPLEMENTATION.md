# Lighthouse Analyzer - Implementation Guide

This document provides an overview of the Vue.js composables and Pinia stores created for the Lighthouse Analyzer app.

## Project Structure

```
src/
├── composables/          # Reusable composition functions
│   ├── index.js         # Composables barrel export
│   ├── useLighthouseParser.js
│   ├── useDragDrop.js
│   ├── useTheme.js
│   ├── useExport.js
│   ├── useStreamingResponse.js
│   └── README.md        # Composables documentation
│
└── stores/              # Pinia state management
    ├── index.js         # Store setup and exports
    ├── lighthouseStore.js
    ├── settingsStore.js
    ├── historyStore.js
    └── README.md        # Stores documentation
```

## Composables

### 1. useLighthouseParser.js

**Purpose:** Parse and extract data from Lighthouse JSON reports.

**Key Features:**

- Validates Lighthouse report structure
- Extracts category data with scores and weights
- Calculates Core Web Vitals (LCP, CLS, TBT, FCP, INP) with ratings
- Retrieves optimization opportunities sorted by impact
- Gets diagnostic information
- Filters failed audits by category

**Usage:**

```javascript
import { useLighthouseParser } from '@/composables'

const parser = useLighthouseParser()
const report = parser.parseReport(jsonData)
const cwv = parser.getCoreWebVitals(report)
const opportunities = parser.getOpportunities(report)
```

### 2. useDragDrop.js

**Purpose:** Handle drag and drop file operations with validation.

**Key Features:**

- Drag state management (isDragging, isValidFile)
- File validation (JSON format, Lighthouse structure, size limits)
- Drag event handlers (enter, leave, drop)
- File input support
- Error handling with callbacks

**Usage:**

```javascript
import { useDragDrop } from '@/composables'

const { isDragging, onDrop } = useDragDrop()

function handleFile(json, error, file) {
  if (error) return console.error(error)
  // Process json data
}

// In template: @drop="(e) => onDrop(e, handleFile)"
```

### 3. useTheme.js

**Purpose:** Manage dark/light/system theme.

**Key Features:**

- Theme modes: light, dark, system
- Auto-detect system preference
- Listen to prefers-color-scheme changes
- Persist to localStorage
- Apply theme to document root
- Update color-scheme for native elements

**Usage:**

```javascript
import { useTheme } from '@/composables'

const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()

setTheme('dark')
console.log(resolvedTheme.value) // 'dark'
```

### 4. useExport.js

**Purpose:** Export and copy analysis data.

**Key Features:**

- Copy to clipboard (Clipboard API with fallback)
- Export to Markdown file with download
- Format data objects for export
- Generate comprehensive analysis reports
- Include metadata, scores, CWV, opportunities, failed audits

**Usage:**

```javascript
import { useExport } from '@/composables'

const { copyToClipboard, exportToMarkdown } = useExport()

await copyToClipboard('Some content')
exportToMarkdown(analysisData, 'report-filename')
```

### 5. useStreamingResponse.js

**Purpose:** Handle LLM streaming responses.

**Key Features:**

- Process SSE (Server-Sent Events) format
- Handle newline-delimited JSON
- Support multiple providers (OpenAI, Anthropic, Ollama)
- Accumulate content buffer
- Track completion state and token count
- Handle both streaming and non-streaming responses

**Usage:**

```javascript
import { useStreamingResponse } from '@/composables'

const { content, isComplete, processChunk } = useStreamingResponse()

// Process streaming data
while (!done) {
  const chunk = await reader.read()
  processChunk(decoder.decode(chunk.value))
}
```

## Pinia Stores

### 1. lighthouseStore.js

**Purpose:** Main store for Lighthouse report state.

**State:**

- `currentReport` - Full Lighthouse report object
- `parsedData` - Extracted and processed data
- `loading` - Loading state
- `error` - Error messages
- `fileName` - Original filename
- `loadedAt` - Load timestamp

**Key Getters:**

- `url` - Page URL from report
- `scores` - All category scores
- `coreWebVitals` - CWV metrics with ratings
- `opportunities` - Optimization opportunities
- `diagnostics` - Diagnostic information
- `isLoaded` - Report loaded status

**Key Actions:**

- `loadReport(file)` - Load and parse report
- `clearReport()` - Clear current report
- `getFailedAudits(categoryId)` - Get failed audits
- `getSummary()` - Get report summary

**Integration:**
Uses `useLighthouseParser` composable internally for all parsing operations.

### 2. settingsStore.js

**Purpose:** Manage application settings.

**State:**

- LLM configuration (provider, model, apiKey, temperature, maxTokens)
- Ollama configuration (baseUrl, model)
- Theme configuration
- UI preferences (lineNumbers, autoAnalyze, saveHistory)

**Key Getters:**

- `currentProvider` - Current LLM provider
- `isConfigured` - Whether LLM is ready to use
- `currentModel` - Active model name
- `llmConfig` - Complete LLM configuration
- `modelOptions` - Available models for provider

**Key Actions:**

- `setLLMProvider(provider)` - Set provider (openai/anthropic/ollama)
- `setAPIKey(key)` - Set API key
- `setTheme(theme)` - Set theme
- `updateLLMConfig(config)` - Update multiple settings
- `resetSettings()` - Reset to defaults

**Features:**

- Auto-persistence to localStorage
- Watchers for auto-save on changes
- Provider-specific model options
- Security: clearAPIKey() method

### 3. historyStore.js

**Purpose:** Manage analysis history.

**State:**

- `analyses` - Array of analysis entries
- `loading` - Loading state
- `error` - Error messages

**Key Getters:**

- `sortedByDate` - Analyses sorted newest first
- `groupedByUrl` - Analyses grouped by URL
- `recentUrls` - 10 most recent unique URLs
- `count` - Total analysis count
- `isEmpty` - Whether history is empty

**Key Actions:**

- `addAnalysis(analysis)` - Add new entry (returns ID)
- `removeAnalysis(id)` - Remove by ID
- `getAnalysesByUrl(url)` - Filter by URL
- `clearHistory()` - Clear all
- `clearOldHistory(days)` - Remove old entries
- `exportHistory()` / `importHistory(json)` - Backup/restore

**Features:**

- Limit to 100 entries max
- Auto-truncate data for storage efficiency
- localStorage quota handling
- Statistics and insights
- Date range filtering

## Key Design Patterns

### 1. Composition API Pattern

All composables follow Vue 3 Composition API best practices:

- Return reactive refs and computed values
- Expose methods for actions
- Keep state encapsulated
- Reusable across components

### 2. Store Pattern (Pinia)

Stores follow Pinia setup syntax:

- Use `defineStore` with setup function
- Separate state, getters, and actions
- Compose with other stores when needed
- Automatic persistence where appropriate

### 3. Error Handling

Consistent error handling across all modules:

- Error refs for reactive error state
- Try-catch blocks with detailed logging
- Return success/failure booleans
- User-friendly error messages

### 4. Persistence

Smart persistence strategy:

- Settings auto-save to localStorage
- History with size limits and cleanup
- Quota exceeded handling
- Export/import for backups

### 5. Provider Abstraction

LLM provider abstraction in streaming:

- Support multiple response formats
- Unified interface for all providers
- Automatic format detection
- Extensible for new providers

## Usage Examples

### Loading and Analyzing a Report

```vue
<script setup>
import { useLighthouseStore, useHistoryStore } from '@/stores'
import { useDragDrop } from '@/composables'

const lighthouseStore = useLighthouseStore()
const historyStore = useHistoryStore()
const { onDrop } = useDragDrop()

async function handleDrop(event) {
  await onDrop(event, async (json, error) => {
    if (error) return

    await lighthouseStore.loadReport(json)

    // Add to history
    historyStore.addAnalysis({
      url: lighthouseStore.url,
      scores: lighthouseStore.scores,
      coreWebVitals: lighthouseStore.coreWebVitals,
      opportunities: lighthouseStore.opportunities
    })
  })
}
</script>
```

### Configuring LLM

```vue
<script setup>
import { useSettingsStore } from '@/stores'

const settings = useSettingsStore()

function setupOpenAI() {
  settings.setLLMProvider('openai')
  settings.setLLMModel('gpt-4o')
  settings.setAPIKey('sk-...')
  settings.setTemperature(0.7)
}

function setupOllama() {
  settings.setLLMProvider('ollama')
  settings.setOllamaBaseUrl('http://localhost:11434')
  settings.setOllamaModel('llama3.2')
}
</script>
```

### Streaming Analysis

```vue
<script setup>
import { useStreamingResponse } from '@/composables'
import { useSettingsStore } from '@/stores'

const settings = useSettingsStore()
const { content, isComplete, processChunk, reset } = useStreamingResponse()

async function analyzeWithLLM(report) {
  reset()

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: settings.llmConfig,
      report
    })
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    processChunk(decoder.decode(value))
  }
}
</script>

<template>
  <div>
    <div v-html="content"></div>
    <div v-if="!isComplete">Analyzing...</div>
  </div>
</template>
```

### Exporting Results

```vue
<script setup>
import { useExport } from '@/composables'
import { useLighthouseStore } from '@/stores'

const { exportToMarkdown, copyToClipboard } = useExport()
const lighthouseStore = useLighthouseStore()

function exportReport() {
  const data = {
    url: lighthouseStore.url,
    scores: lighthouseStore.scores,
    coreWebVitals: lighthouseStore.coreWebVitals,
    opportunities: lighthouseStore.opportunities,
    analysis: 'Your analysis here...'
  }

  exportToMarkdown(data, 'lighthouse-report')
}

async function copyResults() {
  await copyToClipboard(JSON.stringify(lighthouseStore.parsedData, null, 2))
}
</script>
```

## Testing

### Composable Testing

```javascript
import { describe, it, expect } from 'vitest'
import { useLighthouseParser } from '@/composables/useLighthouseParser'

describe('useLighthouseParser', () => {
  it('parses valid Lighthouse report', () => {
    const parser = useLighthouseParser()
    const mockReport = {
      lighthouseVersion: '11.0.0',
      categories: {},
      audits: {},
      finalDisplayedUrl: 'https://example.com'
    }

    const result = parser.parseReport(mockReport)
    expect(result).toBeTruthy()
    expect(parser.error.value).toBeNull()
  })
})
```

### Store Testing

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLighthouseStore } from '@/stores/lighthouseStore'

describe('lighthouseStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads a report', async () => {
    const store = useLighthouseStore()
    const mockReport = { /* ... */ }

    await store.loadReport(mockReport)

    expect(store.isLoaded).toBe(true)
    expect(store.currentReport).toBeTruthy()
  })
})
```

## Next Steps

1. **Add TypeScript** - Create type definitions for Lighthouse reports
2. **Add Tests** - Unit tests for composables and stores
3. **Add Validation** - More comprehensive input validation
4. **Add Documentation** - JSDoc comments for better IDE support
5. **Optimize Performance** - Memoization for expensive computations
6. **Add Analytics** - Track usage patterns
7. **Add Offline Support** - Service worker for offline functionality

## Dependencies

- **Vue 3.5+** - Composition API, reactive system
- **Pinia 3.0+** - State management
- **@vueuse/core** - Optional utility functions (if needed)

All composables and stores are framework-agnostic where possible and use standard Web APIs.

## License

Part of the Lighthouse Analyzer project.
