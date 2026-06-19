# Composables

Vue 3 Composition API composables for the Lighthouse Analyzer app.

## Available Composables

### useLighthouseParser

Parse and extract data from Lighthouse JSON reports.

```javascript
import { useLighthouseParser } from '@/composables'

const {
  error,
  parseReport,
  extractCategoryData,
  getCoreWebVitals,
  getOpportunities,
  getDiagnostics,
  getFailedAudits
} = useLighthouseParser()

// Parse a report
const report = parseReport(jsonData)

// Get Core Web Vitals
const cwv = getCoreWebVitals(report)
console.log(cwv.lcp, cwv.cls, cwv.tbt)

// Get opportunities sorted by impact
const opportunities = getOpportunities(report)

// Get failed audits for a category
const failed = getFailedAudits(report, 'performance')
```

#### Methods

- `parseReport(json)` - Validate and parse Lighthouse JSON
- `extractCategoryData(category)` - Extract category scores, audits, and weights
- `getCoreWebVitals(report)` - Get LCP, CLS, TBT, FCP, INP with ratings
- `getOpportunities(report)` - Get opportunities sorted by potential savings
- `getDiagnostics(report)` - Get diagnostic information
- `getFailedAudits(report, categoryId)` - Get audits with score < 0.9

### useDragDrop

Handle drag and drop file operations with validation.

```javascript
import { useDragDrop } from '@/composables'

const {
  isDragging,
  isValidFile,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  validateFile,
  reset
} = useDragDrop()

// In template
<div
  @dragenter="onDragEnter"
  @dragover="onDragOver"
  @dragleave="onDragLeave"
  @drop="(e) => onDrop(e, handleFile)"
>
  Drop Lighthouse report here
</div>

// Handle dropped file
function handleFile(json, error, file) {
  if (error) {
    console.error(error)
    return
  }
  // Process json data
}
```

#### Properties

- `isDragging` - Ref indicating if user is dragging over drop zone
- `isValidFile` - Ref indicating if dragged file appears valid

#### Methods

- `onDragEnter(event)` - Handle drag enter
- `onDragOver(event)` - Handle drag over (required for drop)
- `onDragLeave(event)` - Handle drag leave
- `onDrop(event, callback)` - Handle drop with validation
- `onFileSelect(event, callback)` - Handle file input change
- `validateFile(file)` - Validate if file is a Lighthouse report
- `reset()` - Reset drag state

### useTheme

Manage application theme (light/dark/system).

```javascript
import { useTheme } from '@/composables'

const {
  theme,
  resolvedTheme,
  setTheme,
  toggleTheme,
  initTheme
} = useTheme()

// Set theme
setTheme('dark') // 'light' | 'dark' | 'system'

// Toggle between light and dark
toggleTheme()

// Get current resolved theme
console.log(resolvedTheme.value) // 'light' or 'dark'
```

#### Properties

- `theme` - Ref with current theme setting ('light' | 'dark' | 'system')
- `resolvedTheme` - Computed actual theme to apply (resolves 'system' to 'light' or 'dark')

#### Methods

- `setTheme(mode)` - Set theme and persist to localStorage
- `toggleTheme()` - Toggle between light and dark
- `initTheme()` - Initialize theme (called automatically on mount)

#### Features

- Persists to localStorage
- Listens to system preference changes
- Automatically applies theme to document root
- Updates color-scheme for native browser elements

### useExport

Export and copy analysis data.

```javascript
import { useExport } from '@/composables'

const {
  error,
  success,
  copyToClipboard,
  exportToMarkdown,
  formatForExport,
  downloadFile
} = useExport()

// Copy to clipboard
await copyToClipboard('Some content')

// Export analysis to markdown file
exportToMarkdown(analysisData, 'my-report')

// Format data for export
const formatted = formatForExport(data)
```

#### Properties

- `error` - Ref with error message if operation failed
- `success` - Ref indicating if last operation succeeded

#### Methods

- `copyToClipboard(content)` - Copy text to clipboard using Clipboard API
- `exportToMarkdown(analysis, filename?)` - Export analysis as .md file download
- `formatForExport(data)` - Format data object as readable string
- `downloadFile(content, filename, mimeType?)` - Download content as file
- `reset()` - Reset error and success state

### useStreamingResponse

Handle LLM streaming responses from various providers.

```javascript
import { useStreamingResponse } from '@/composables'

const {
  content,
  isComplete,
  tokens,
  processChunk,
  processText,
  setContent,
  appendContent,
  complete,
  reset
} = useStreamingResponse()

// Process streaming chunks
async function handleStream(response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    processChunk(chunk)
  }

  complete()
}
```

#### Properties

- `content` - Ref with accumulated response text
- `isComplete` - Ref indicating if streaming is complete
- `tokens` - Ref with approximate token count

#### Methods

- `processChunk(chunk)` - Process SSE or newline-delimited JSON chunk
- `processText(text)` - Process raw text (non-streaming)
- `setContent(text)` - Set full content (non-streaming response)
- `appendContent(text)` - Append text to existing content
- `complete()` - Mark streaming as complete
- `reset()` - Reset all state
- `getState()` - Get current state snapshot

#### Supported Formats

- OpenAI (chat completion, completion)
- Anthropic (Claude)
- Ollama
- Generic SSE format
- Newline-delimited JSON

## Usage Tips

### Import from index

```javascript
// Import multiple composables
import {
  useLighthouseParser,
  useDragDrop,
  useTheme
} from '@/composables'
```

### Composable Lifecycle

Composables are called within `setup()` or `<script setup>`:

```vue
<script setup>
import { useLighthouseParser } from '@/composables'

const parser = useLighthouseParser()
const report = parser.parseReport(data)
</script>
```

### Reactive State

All refs returned from composables are reactive:

```vue
<script setup>
import { useDragDrop } from '@/composables'

const { isDragging, isValidFile } = useDragDrop()
</script>

<template>
  <div :class="{ 'bg-blue-100': isDragging }">
    {{ isValidFile ? 'Valid file' : 'Invalid file' }}
  </div>
</template>
```

### Error Handling

Most composables provide error refs:

```javascript
const { error, parseReport } = useLighthouseParser()

const report = parseReport(data)
if (error.value) {
  console.error('Parse failed:', error.value)
}
```

## Best Practices

1. **Reusability** - Composables can be used in multiple components
2. **Reactivity** - Use refs and computed for reactive state
3. **Side Effects** - Clean up side effects (event listeners, timeouts)
4. **Error Handling** - Always handle errors gracefully
5. **TypeScript** - Consider adding TypeScript for better type safety
6. **Testing** - Unit test composables independently of components
