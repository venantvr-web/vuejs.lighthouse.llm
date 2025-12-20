<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'

// Register languages
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)

const props = defineProps({
  content: { type: String, default: '' },
  streaming: { type: Boolean, default: false }
})

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true,
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (e) {
        console.error('Highlight error:', e)
      }
    }
    return code
  }
})

const renderedContent = computed(() => {
  if (!props.content) return ''
  try {
    return marked(props.content)
  } catch (e) {
    console.error('Markdown parse error:', e)
    return props.content
  }
})
</script>

<template>
  <div class="markdown-viewer">
    <div
      class="prose prose-gray dark:prose-invert max-w-none
             prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100
             prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
             prose-p:text-gray-700 dark:prose-p:text-gray-300
             prose-a:text-primary-600 dark:prose-a:text-primary-400
             prose-code:text-primary-600 dark:prose-code:text-primary-400
             prose-code:bg-gray-100 dark:prose-code:bg-gray-800
             prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
             prose-code:before:content-none prose-code:after:content-none
             prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950
             prose-pre:text-gray-100
             prose-li:text-gray-700 dark:prose-li:text-gray-300
             prose-strong:text-gray-900 dark:prose-strong:text-gray-100"
      v-html="renderedContent"
    />

    <!-- Streaming cursor -->
    <span
      v-if="streaming"
      class="inline-block w-2 h-5 bg-primary-500 ml-1 animate-pulse rounded-sm"
    />
  </div>
</template>

<style>
/* Highlight.js theme - One Dark inspired */
.markdown-viewer pre code.hljs {
  display: block;
  padding: 1rem;
  overflow-x: auto;
}

.hljs {
  color: #abb2bf;
  background: #1e1e2e;
}

.hljs-comment,
.hljs-quote {
  color: #5c6370;
  font-style: italic;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-addition {
  color: #c678dd;
}

.hljs-number,
.hljs-string,
.hljs-meta .hljs-meta-string,
.hljs-literal,
.hljs-doctag,
.hljs-regexp {
  color: #98c379;
}

.hljs-title,
.hljs-section,
.hljs-name,
.hljs-selector-id,
.hljs-selector-class {
  color: #e5c07b;
}

.hljs-attribute,
.hljs-attr,
.hljs-variable,
.hljs-template-variable,
.hljs-class .hljs-title,
.hljs-type {
  color: #e06c75;
}

.hljs-symbol,
.hljs-bullet,
.hljs-subst,
.hljs-meta,
.hljs-meta .hljs-keyword,
.hljs-link {
  color: #56b6c2;
}

.hljs-built_in,
.hljs-deletion {
  color: #e06c75;
}

.hljs-formula {
  background: #1e1e2e;
}

.hljs-emphasis {
  font-style: italic;
}

.hljs-strong {
  font-weight: bold;
}

/* Code block styling */
.markdown-viewer pre {
  position: relative;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

.markdown-viewer pre code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Inline code */
.markdown-viewer :not(pre) > code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.875em;
}

/* Lists */
.markdown-viewer ul {
  list-style-type: disc;
}

.markdown-viewer ol {
  list-style-type: decimal;
}

/* Tables */
.markdown-viewer table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.markdown-viewer th,
.markdown-viewer td {
  border: 1px solid #374151;
  padding: 0.5rem 1rem;
  text-align: left;
}

.markdown-viewer th {
  background: #1f2937;
  font-weight: 600;
}

/* Blockquotes */
.markdown-viewer blockquote {
  border-left: 4px solid #3b82f6;
  padding-left: 1rem;
  margin: 1rem 0;
  color: #6b7280;
  font-style: italic;
}
</style>
