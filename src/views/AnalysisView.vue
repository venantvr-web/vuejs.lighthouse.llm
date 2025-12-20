<script setup>
import {computed, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import CategoryTabs from '@/components/analysis/CategoryTabs.vue'
import StreamingOutput from '@/components/analysis/StreamingOutput.vue'
import ScoreGauge from '@/components/dashboard/ScoreGauge.vue'
import {usePromptEngine} from '@/composables/usePromptEngine.js'

const router = useRouter()
const route = useRoute()
const promptEngine = usePromptEngine()

const report = ref(null)
const activeCategory = ref('performance')
const analysisResult = ref('')
const isStreaming = ref(false)
const tokenCount = ref(0)
const apiKey = ref('')
const selectedProvider = ref('gemini')
const error = ref(null)
const selectedTemplate = ref('quickAnalysis')
const availableTemplates = ref([])
const selectedAudit = ref(null)
const showPromptPreview = ref(false)
const promptPreview = ref('')

// Load settings from localStorage
onMounted(async () => {
  const stored = localStorage.getItem('current-report')
  if (stored) {
    try {
      report.value = JSON.parse(stored)
    } catch (e) {
      router.push('/')
      return
    }
  } else {
    router.push('/')
    return
  }

  // Load settings
  const settings = localStorage.getItem('llm-settings')
  if (settings) {
    const parsed = JSON.parse(settings)
    apiKey.value = parsed.apiKey || ''
    selectedProvider.value = parsed.provider || 'gemini'
  }

  // Set category from route
  if (route.params.category) {
    activeCategory.value = route.params.category
  }

  // Load available templates for current category
  await loadTemplatesForCategory(activeCategory.value)
})

// Load templates when category changes
async function loadTemplatesForCategory(category) {
  try {
    availableTemplates.value = await promptEngine.getAvailableTemplates(category)
    selectedTemplate.value = 'quickAnalysis'
  } catch (e) {
    console.error('Failed to load templates:', e)
  }
}

// Update route when category changes
watch(activeCategory, async (newCat) => {
  router.replace(`/analysis/${newCat}`)
  analysisResult.value = ''
  selectedAudit.value = null
  await loadTemplatesForCategory(newCat)
})

// Update prompt preview when template changes
watch(selectedTemplate, async () => {
  await updatePromptPreview()
})

// Select an audit to show details
function selectAudit(audit) {
  selectedAudit.value = selectedAudit.value?.id === audit.id ? null : audit
}

// Update prompt preview
async function updatePromptPreview() {
  try {
    promptPreview.value = await buildPrompt()
  } catch (e) {
    promptPreview.value = ''
  }
}

// Toggle prompt preview
function togglePromptPreview() {
  showPromptPreview.value = !showPromptPreview.value
  if (showPromptPreview.value) {
    updatePromptPreview()
  }
}

const categories = computed(() => {
  if (!report.value?.categories) return []

  const cats = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa']
  const labels = {
    'performance': 'Performance',
    'accessibility': 'Accessibilité',
    'best-practices': 'Bonnes Pratiques',
    'seo': 'SEO',
    'pwa': 'PWA'
  }

  return cats
      .filter(id => report.value.categories[id])
      .map(id => ({
        id,
        label: labels[id],
        score: report.value.categories[id]?.score || 0
      }))
})

const currentScore = computed(() => {
  const cat = categories.value.find(c => c.id === activeCategory.value)
  return cat ? Math.round(cat.score * 100) : 0
})

const failedAudits = computed(() => {
  if (!report.value?.audits || !report.value?.categories?.[activeCategory.value]) return []

  const categoryAudits = report.value.categories[activeCategory.value].auditRefs || []

  return categoryAudits
      .filter(ref => ref.weight > 0)
      .map(ref => {
        const audit = report.value.audits[ref.id]
        if (!audit) return null
        return {
          ...audit,
          id: ref.id,
          weight: ref.weight,
          group: ref.group
        }
      })
      .filter(audit => audit && audit.score !== null && audit.score < 0.9)
      .sort((a, b) => (a.score || 0) - (b.score || 0))
})

const buildPrompt = async () => {
  try {
    // Use the J2 template engine to generate the prompt
    const prompt = await promptEngine.generatePrompt(
        report.value,
        activeCategory.value,
        selectedTemplate.value
    )

    if (!prompt) {
      throw new Error(promptEngine.error.value || 'Failed to generate prompt')
    }

    return prompt
  } catch (e) {
    console.error('Error building prompt:', e)
    // Fallback to simple prompt if template fails
    const categoryMeta = promptEngine.getCategoryMeta(activeCategory.value)
    const auditsText = failedAudits.value
        .map(a => `- ${a.title}: ${a.description?.split('[')[0] || ''}`)
        .join('\n')

    return `Tu es un ${categoryMeta?.role || 'expert technique'}.

## Contexte
- URL analysée : ${report.value.finalUrl || report.value.requestedUrl}
- Score: ${currentScore.value}/100
- ${failedAudits.value.length} problèmes détectés

## Audits échoués
${auditsText}

## Ta mission
1. Analyse chaque problème et explique son impact
2. Propose des solutions concrètes avec des exemples de code Vue 3
3. Priorise les actions par impact/effort

Réponds en français avec une structure Markdown claire.`
  }
}

const analyzeWithGemini = async (prompt) => {
  const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${apiKey.value}`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contents: [{parts: [{text: prompt}]}],
          generationConfig: {temperature: 0.7, maxOutputTokens: 8192}
        })
      }
  )

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const {done, value} = await reader.read()
    if (done) break

    buffer += decoder.decode(value, {stream: true})

    // Parse JSON chunks
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.trim()) {
        try {
          // Handle array format from Gemini streaming
          const cleaned = line.replace(/^\[|\]$/g, '').replace(/^,/, '')
          if (cleaned.trim()) {
            const json = JSON.parse(cleaned)
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              analysisResult.value += text
              tokenCount.value += text.split(/\s+/).length
            }
          }
        } catch (e) {
          // Ignore parse errors for partial chunks
        }
      }
    }
  }
}

const analyzeWithOpenAI = async (prompt) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.value}`
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {role: 'system', content: 'Tu es un expert technique. Réponds en Markdown.'},
        {role: 'user', content: prompt}
      ],
      stream: true,
      temperature: 0.7
    })
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const {done, value} = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

    for (const line of lines) {
      const data = line.replace('data: ', '')
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content
        if (content) {
          analysisResult.value += content
          tokenCount.value += 1
        }
      } catch (e) {
      }
    }
  }
}

const startAnalysis = async () => {
  if (!apiKey.value) {
    error.value = 'Veuillez configurer votre clé API dans les paramètres'
    return
  }

  error.value = null
  isStreaming.value = true
  analysisResult.value = ''
  tokenCount.value = 0

  const prompt = await buildPrompt()

  try {
    if (selectedProvider.value === 'gemini') {
      await analyzeWithGemini(prompt)
    } else if (selectedProvider.value === 'openai') {
      await analyzeWithOpenAI(prompt)
    }
  } catch (e) {
    error.value = `Erreur: ${e.message}`
  } finally {
    isStreaming.value = false
  }
}

const cancelAnalysis = () => {
  isStreaming.value = false
}

const exportAnalysis = () => {
  const blob = new Blob([analysisResult.value], {type: 'text/markdown'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lighthouse-analysis-${activeCategory.value}-${Date.now()}.md`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-6xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <router-link class="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" to="/dashboard">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <span>Dashboard</span>
            </router-link>
          </div>

          <router-link class="btn btn-ghost" to="/settings">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-linecap="round" stroke-linejoin="round"
                    stroke-width="2"/>
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </router-link>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-6xl mx-auto px-4 py-8">
      <!-- Category tabs -->
      <CategoryTabs
          v-if="categories.length"
          v-model="activeCategory"
          :categories="categories"
      />

      <div class="mt-8 grid lg:grid-cols-3 gap-8">
        <!-- Left: Score + Actions -->
        <div class="lg:col-span-1 space-y-6">
          <!-- Score card -->
          <div class="card p-6 text-center">
            <ScoreGauge :score="currentScore" size="lg"/>
            <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              {{ categories.find(c => c.id === activeCategory)?.label || '' }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ failedAudits.length }} problèmes détectés
            </p>
          </div>

          <!-- Template selector -->
          <div v-if="availableTemplates.length > 1" class="card p-4">
            <h4 class="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              Type d'analyse
            </h4>
            <div class="space-y-2">
              <label
                  v-for="template in availableTemplates"
                  :key="template.id"
                  :class="selectedTemplate === template.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                  : 'bg-gray-50 dark:bg-gray-800 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'"
                  class="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
              >
                <input
                    v-model="selectedTemplate"
                    :value="template.id"
                    class="mt-1"
                    type="radio"
                />
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white text-sm">
                    {{ template.name }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {{ template.description }}
                  </p>
                  <span
                      :class="{
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400': template.strategy === 'quick',
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400': template.strategy === 'deep',
                      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400': template.strategy === 'specific'
                    }"
                      class="inline-block mt-1 px-2 py-0.5 text-xs rounded-full"
                  >
                    {{ template.strategy === 'quick' ? 'Rapide' : template.strategy === 'deep' ? 'Approfondi' : 'Specifique' }}
                  </span>
                </div>
              </label>
            </div>
          </div>

          <!-- Generate button -->
          <button
              :disabled="isStreaming"
              class="w-full btn btn-primary py-3 text-lg"
              @click="startAnalysis"
          >
            <svg v-if="!isStreaming" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            <svg v-else class="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
            </svg>
            {{ isStreaming ? 'Analyse en cours...' : 'Générer le plan d\'action' }}
          </button>

          <!-- Error message -->
          <div v-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {{ error }}
          </div>

          <!-- Failed audits list - clickable -->
          <div class="card p-4">
            <h4 class="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg class="w-4 h-4 text-lighthouse-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              Problèmes détectés
            </h4>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Cliquez pour voir les détails</p>
            <ul class="space-y-1 max-h-64 overflow-y-auto">
              <li
                  v-for="audit in failedAudits"
                  :key="audit.id"
                  :class="selectedAudit?.id === audit.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'"
                  class="flex items-start gap-2 text-sm p-2 rounded-lg cursor-pointer transition-colors"
                  @click="selectAudit(audit)"
              >
                <span
                    :class="{
                    'bg-lighthouse-red': audit.score < 0.5,
                    'bg-lighthouse-orange': audit.score >= 0.5
                  }"
                    class="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                />
                <span class="flex-1 text-gray-700 dark:text-gray-300">{{ audit.title }}</span>
                <span class="text-xs text-gray-400">{{ Math.round((audit.score || 0) * 100) }}%</span>
              </li>
            </ul>
          </div>

          <!-- Prompt preview toggle -->
          <button
              class="w-full btn btn-secondary text-sm flex items-center justify-center gap-2"
              @click="togglePromptPreview"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            {{ showPromptPreview ? 'Masquer le prompt' : 'Voir le prompt' }}
          </button>
        </div>

        <!-- Right: Analysis output or Audit details -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Selected Audit Details Panel -->
          <Transition name="slide-down">
            <div v-if="selectedAudit" class="card p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <span
                      :class="{
                      'bg-lighthouse-red': selectedAudit.score < 0.5,
                      'bg-lighthouse-orange': selectedAudit.score >= 0.5 && selectedAudit.score < 0.9,
                      'bg-lighthouse-green': selectedAudit.score >= 0.9
                    }"
                      class="w-3 h-3 rounded-full"
                  />
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ selectedAudit.title }}
                  </h3>
                </div>
                <button
                    class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    @click="selectedAudit = null"
                >
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                </button>
              </div>

              <!-- Score badge -->
              <div class="flex items-center gap-4 mb-4">
                <span
                    :class="{
                    'bg-lighthouse-red/10 text-lighthouse-red': selectedAudit.score < 0.5,
                    'bg-lighthouse-orange/10 text-lighthouse-orange': selectedAudit.score >= 0.5 && selectedAudit.score < 0.9,
                    'bg-lighthouse-green/10 text-lighthouse-green': selectedAudit.score >= 0.9
                  }"
                    class="px-3 py-1 rounded-full text-sm font-medium"
                >
                  Score: {{ Math.round((selectedAudit.score || 0) * 100) }}%
                </span>
                <span v-if="selectedAudit.displayValue" class="text-sm text-gray-500 dark:text-gray-400">
                  {{ selectedAudit.displayValue }}
                </span>
              </div>

              <!-- Description -->
              <div class="prose prose-sm dark:prose-invert max-w-none mb-4">
                <p class="text-gray-600 dark:text-gray-300" v-html="selectedAudit.description?.split('[Learn more]')[0] || 'Aucune description disponible.'"></p>
              </div>

              <!-- Details items if available -->
              <div v-if="selectedAudit.details?.items?.length" class="mt-4">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Éléments concernés ({{ selectedAudit.details.items.length }})
                </h4>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <ul class="space-y-2 text-sm">
                    <li v-for="(item, idx) in selectedAudit.details.items.slice(0, 10)" :key="idx" class="flex items-start gap-2">
                      <span class="text-gray-400">{{ idx + 1 }}.</span>
                      <div class="flex-1 min-w-0">
                        <span v-if="item.url" class="text-primary-600 dark:text-primary-400 break-all">{{ item.url }}</span>
                        <span v-else-if="item.node?.snippet" class="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded break-all">{{ item.node.snippet }}</span>
                        <span v-else-if="item.label" class="text-gray-700 dark:text-gray-300">{{ item.label }}</span>
                        <span v-else class="text-gray-500">{{ JSON.stringify(item).slice(0, 100) }}...</span>
                        <span v-if="item.wastedMs" class="ml-2 text-lighthouse-orange text-xs">-{{ Math.round(item.wastedMs) }}ms</span>
                        <span v-if="item.wastedBytes" class="ml-2 text-lighthouse-orange text-xs">-{{ Math.round(item.wastedBytes / 1024) }}KB</span>
                      </div>
                    </li>
                  </ul>
                  <p v-if="selectedAudit.details.items.length > 10" class="text-xs text-gray-400 mt-2">
                    Et {{ selectedAudit.details.items.length - 10 }} autres éléments...
                  </p>
                </div>
              </div>

              <!-- Savings if available -->
              <div v-if="selectedAudit.details?.overallSavingsMs || selectedAudit.details?.overallSavingsBytes" class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 class="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Gains potentiels</h4>
                <div class="flex gap-4 text-sm">
                  <span v-if="selectedAudit.details.overallSavingsMs" class="text-green-600 dark:text-green-400">
                    ⏱️ {{ Math.round(selectedAudit.details.overallSavingsMs) }} ms
                  </span>
                  <span v-if="selectedAudit.details.overallSavingsBytes" class="text-green-600 dark:text-green-400">
                    📦 {{ Math.round(selectedAudit.details.overallSavingsBytes / 1024) }} KB
                  </span>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Prompt Preview Panel -->
          <Transition name="slide-down">
            <div v-if="showPromptPreview" class="card p-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                  Apercu du prompt ({{ selectedTemplate }})
                </h4>
                <button
                    class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    @click="showPromptPreview = false"
                >
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                </button>
              </div>
              <pre class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-xs overflow-auto max-h-64 whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300">{{ promptPreview || 'Chargement...' }}</pre>
            </div>
          </Transition>

          <!-- Analysis Output -->
          <StreamingOutput
              :content="analysisResult"
              :is-streaming="isStreaming"
              :token-count="tokenCount"
              @cancel="cancelAnalysis"
              @export="exportAnalysis"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
