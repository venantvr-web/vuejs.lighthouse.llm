# Quick Reference Guide

Fast reference for Vue.js composables and Pinia stores in the Lighthouse Analyzer app.

## Composables Cheat Sheet

### useLighthouseParser
```javascript
const { parseReport, getCoreWebVitals, getOpportunities, getFailedAudits } = useLighthouseParser()

const report = parseReport(json)                    // Parse & validate
const cwv = getCoreWebVitals(report)                // Get LCP, CLS, TBT, FCP, INP
const opps = getOpportunities(report)               // Sorted by impact
const failed = getFailedAudits(report, 'performance') // Score < 0.9
```

### useDragDrop
```javascript
const { isDragging, isValidFile, onDrop } = useDragDrop()

// Template:
<div @drop="(e) => onDrop(e, handleFile)">Drop here</div>

// Handler:
function handleFile(json, error, file) { }
```

### useTheme
```javascript
const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()

setTheme('dark')           // 'light' | 'dark' | 'system'
toggleTheme()              // Switch light/dark
// resolvedTheme.value     // Actual theme applied
```

### useExport
```javascript
const { copyToClipboard, exportToMarkdown } = useExport()

await copyToClipboard(text)              // Copy with fallback
exportToMarkdown(analysis, 'filename')   // Download .md file
```

### useStreamingResponse
```javascript
const { content, isComplete, processChunk, reset } = useStreamingResponse()

processChunk(chunk)   // Process SSE/JSON chunk
// content.value      // Accumulated text
// isComplete.value   // Done streaming?
```

## Store Cheat Sheet

### lighthouseStore
```javascript
const lighthouse = useLighthouseStore()

// Load
await lighthouse.loadReport(file)

// Access
lighthouse.url                           // Page URL
lighthouse.scores                        // { performance: 0.9, ... }
lighthouse.coreWebVitals                 // { lcp: {...}, cls: {...} }
lighthouse.opportunities                 // Sorted array
lighthouse.isLoaded                      // Boolean

// Methods
lighthouse.getFailedAudits('accessibility')
lighthouse.clearReport()
```

### settingsStore
```javascript
const settings = useSettingsStore()

// Configure LLM
settings.setLLMProvider('openai')        // 'openai' | 'anthropic' | 'ollama'
settings.setAPIKey('sk-...')
settings.setLLMModel('gpt-4o')
settings.setTemperature(0.7)

// Theme
settings.setTheme('dark')

// Check
settings.isConfigured                    // Boolean
settings.llmConfig                       // Complete config object
```

### historyStore
```javascript
const history = useHistoryStore()

// Add
const id = history.addAnalysis({
  url: 'https://example.com',
  scores: { performance: 0.9 },
  analysis: 'Text...'
})

// Access
history.sortedByDate                     // Latest first
history.groupedByUrl                     // { 'url': [...] }
history.recentUrls                       // Last 10 unique

// Methods
history.getAnalysesByUrl('https://example.com')
history.removeAnalysis(id)
history.clearHistory()
```

## Common Patterns

### Load and Analyze Report
```javascript
import { useLighthouseStore, useHistoryStore } from '@/stores'
import { useDragDrop } from '@/composables'

const lighthouse = useLighthouseStore()
const history = useHistoryStore()
const { onDrop } = useDragDrop()

async function handleFile(json, error) {
  if (error) return console.error(error)

  await lighthouse.loadReport(json)

  history.addAnalysis({
    url: lighthouse.url,
    scores: lighthouse.scores,
    coreWebVitals: lighthouse.coreWebVitals
  })
}
```

### Stream LLM Analysis
```javascript
import { useStreamingResponse } from '@/composables'
import { useSettingsStore } from '@/stores'

const { content, processChunk } = useStreamingResponse()
const settings = useSettingsStore()

async function analyze(report) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ config: settings.llmConfig, report })
  })

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    processChunk(decoder.decode(value))
  }
}
```

### Export Results
```javascript
import { useExport } from '@/composables'

const { exportToMarkdown } = useExport()

function exportReport() {
  exportToMarkdown({
    url: lighthouse.url,
    scores: lighthouse.scores,
    coreWebVitals: lighthouse.coreWebVitals,
    opportunities: lighthouse.opportunities,
    analysis: 'Your analysis here'
  }, 'my-report')
}
```

## Component Integration

### Template Example
```vue
<script setup>
import { useLighthouseStore, useSettingsStore } from '@/stores'
import { useDragDrop, useTheme } from '@/composables'
import { storeToRefs } from 'pinia'

const lighthouse = useLighthouseStore()
const settings = useSettingsStore()
const { isDragging, onDrop } = useDragDrop()
const { theme, toggleTheme } = useTheme()

const { url, scores, loading } = storeToRefs(lighthouse)

async function handleDrop(event) {
  await onDrop(event, async (json, error) => {
    if (!error) await lighthouse.loadReport(json)
  })
}
</script>

<template>
  <div>
    <button @click="toggleTheme">Theme: {{ theme }}</button>

    <div
      @drop="handleDrop"
      :class="{ 'border-blue-500': isDragging }"
    >
      Drop Lighthouse report
    </div>

    <div v-if="loading">Loading...</div>

    <div v-else-if="url">
      <h1>{{ url }}</h1>
      <div v-for="(score, name) in scores" :key="name">
        {{ name }}: {{ Math.round(score * 100) }}%
      </div>
    </div>
  </div>
</template>
```

## File Paths

```
/home/rvv/WebstormProjects/vuejs.lighthouse.llm/src/
├── composables/
│   ├── index.js
│   ├── useLighthouseParser.js
│   ├── useDragDrop.js
│   ├── useTheme.js
│   ├── useExport.js
│   └── useStreamingResponse.js
└── stores/
    ├── index.js
    ├── lighthouseStore.js
    ├── settingsStore.js
    └── historyStore.js
```

## Import Paths

```javascript
// Composables
import { useLighthouseParser } from '@/composables'
import { useLighthouseParser } from '@/composables/useLighthouseParser'

// Stores
import { useLighthouseStore } from '@/stores'
import { useLighthouseStore } from '@/stores/lighthouseStore'
```

## LocalStorage Keys

- `lighthouse-settings` - Application settings
- `lighthouse-history` - Analysis history
- `lighthouse-theme` - Theme preference

## Default Values

**Settings:**
- Provider: `openai`
- Model: `gpt-4o`
- Temperature: `0.7`
- Max Tokens: `2000`
- Theme: `system`
- Ollama URL: `http://localhost:11434`
- Ollama Model: `llama3.2`

**History:**
- Max Entries: `100`
- Auto-truncate: Top 5 opportunities & audits only

## Core Web Vitals Ratings

```javascript
{
  value: 2500,           // Raw value
  displayValue: '2.5 s', // Formatted
  score: 0.9,            // 0-1
  rating: 'good'         // 'good' | 'needs-improvement' | 'poor'
}
```

Thresholds:
- **Good**: score >= 0.9
- **Needs Improvement**: 0.5 <= score < 0.9
- **Poor**: score < 0.5

## Provider Support

**useStreamingResponse** supports:
- OpenAI (Chat & Completion)
- Anthropic (Claude)
- Ollama
- Generic SSE
- Newline-delimited JSON

## Tips

1. **Use storeToRefs** for reactive destructuring
2. **Reset state** when switching contexts
3. **Handle errors** - all composables/stores expose error refs
4. **Clear sensitive data** - use `settings.clearAPIKey()`
5. **Export history** regularly as backup
6. **Monitor localStorage** quota with try-catch

## Debug Commands

```javascript
// Console debugging
const lighthouse = useLighthouseStore()
console.log('Report:', lighthouse.currentReport)
console.log('Parsed:', lighthouse.parsedData)
console.log('URL:', lighthouse.url)

const settings = useSettingsStore()
console.log('Config:', settings.llmConfig)
console.log('Configured:', settings.isConfigured)

const history = useHistoryStore()
console.log('Count:', history.count)
console.log('Recent:', history.recentUrls)
console.log('Stats:', history.getStatistics())
```

## Documentation

- [Composables README](/src/composables/README.md)
- [Stores README](/src/stores/README.md)
- [Implementation Guide](/IMPLEMENTATION.md)
- [Full Summary](/COMPOSABLES_AND_STORES.md)
