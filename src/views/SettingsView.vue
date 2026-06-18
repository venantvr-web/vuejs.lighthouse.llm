<script setup>
import {computed, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {useSettingsStore} from '@/stores/settingsStore'
import {buildLLMProvider} from '@/services/llm/buildProvider'

const router = useRouter()
const settings = useSettingsStore()

const provider = ref('gemini')
const apiKey = ref('')
const model = ref('')
const ollamaUrl = ref('http://localhost:11434')
const pageSpeedKey = ref('')
const saved = ref(false)

const providers = [
  {id: 'gemini', name: 'Google Gemini', keyPlaceholder: 'AIza...'},
  {id: 'openai', name: 'OpenAI', keyPlaceholder: 'sk-...'},
  {id: 'anthropic', name: 'Anthropic Claude', keyPlaceholder: 'sk-ant-...'},
  {id: 'ollama', name: 'Ollama (Local)', keyPlaceholder: ''}
]

const currentProvider = computed(() => providers.find(p => p.id === provider.value) || providers[0])

// Model choices: live list fetched from the provider if available, else the
// store's curated list. Each entry is { value, label }.
const dynamicModels = ref(null)
const loadingModels = ref(false)
const modelError = ref('')
const modelOptions = computed(() => dynamicModels.value || settings.modelOptions)

onMounted(() => {
  provider.value = settings.llmProvider
  apiKey.value = settings.providerKeys[settings.llmProvider] || settings.apiKey || ''
  model.value = settings.currentModel
  // Fall back to a valid model if the stored one is no longer offered
  if (!modelOptions.value.some(m => m.value === model.value)) {
    model.value = modelOptions.value[0]?.value || ''
  }
  ollamaUrl.value = settings.ollamaBaseUrl
  pageSpeedKey.value = settings.pageSpeedApiKey
})

watch(provider, (newProvider) => {
  // Reflect the provider in the store so model options update, then preload its key
  settings.setLLMProvider(newProvider)
  dynamicModels.value = null
  modelError.value = ''
  model.value = settings.currentModel
  apiKey.value = settings.providerKeys[newProvider] || (newProvider === settings.currentProvider ? settings.apiKey : '') || ''
})

// Fetch the live model list from the provider (Gemini supports ListModels)
const loadModels = async () => {
  modelError.value = ''
  if (provider.value !== 'ollama' && !apiKey.value) {
    modelError.value = 'Renseignez une clé API d\'abord.'
    return
  }
  loadingModels.value = true
  try {
    // Persist what the provider needs to be built (key or Ollama URL)
    if (provider.value === 'ollama') {
      settings.setOllamaBaseUrl(ollamaUrl.value)
    } else {
      settings.setAPIKey(apiKey.value)
      settings.setProviderKey(provider.value, apiKey.value)
    }
    const instance = buildLLMProvider(settings, provider.value, model.value)
    if (typeof instance.listModels !== 'function') {
      modelError.value = 'Liste dynamique non disponible pour ce fournisseur.'
      return
    }
    const list = await instance.listModels()
    if (!list.length) {
      modelError.value = 'Aucun modèle retourné.'
      return
    }
    dynamicModels.value = list
    if (!list.some(m => m.value === model.value)) {
      model.value = list[0].value
    }
  } catch (e) {
    modelError.value = `Échec du chargement : ${e.message}`
  } finally {
    loadingModels.value = false
  }
}

const saveSettings = () => {
  settings.setLLMProvider(provider.value)
  settings.setLLMModel(model.value)
  if (provider.value === 'ollama') {
    settings.setOllamaBaseUrl(ollamaUrl.value)
  } else {
    settings.setAPIKey(apiKey.value)
    settings.setProviderKey(provider.value, apiKey.value)
  }
  settings.setPageSpeedApiKey(pageSpeedKey.value)
  saved.value = true
  setTimeout(() => saved.value = false, 2000)
}

const testConnection = async () => {
  // TODO: Implement connection test
  alert('Test de connexion: fonctionnalite a venir')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-2xl mx-auto px-4 py-4">
        <div class="flex items-center gap-4">
          <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" @click="router.back()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </button>
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">Parametres</h1>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-2xl mx-auto px-4 py-8">
      <div class="card p-6 space-y-6">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuration LLM</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Configurez le fournisseur d'IA pour l'analyse de vos rapports Lighthouse.
          </p>
        </div>

        <!-- Provider selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fournisseur
          </label>
          <div class="grid grid-cols-2 gap-3">
            <button
                v-for="p in providers"
                :key="p.id"
                :class="{
                'border-primary-500 bg-primary-50 dark:bg-primary-900/20': provider === p.id,
                'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600': provider !== p.id
              }"
                class="p-4 rounded-xl border-2 text-left transition-all"
                @click="provider = p.id"
            >
              <div class="font-medium text-gray-900 dark:text-white">{{ p.name }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ p.id === 'ollama' ? 'Gratuit, local' : 'API Cloud' }}
              </div>
            </button>
          </div>
        </div>

        <!-- API Key (not for Ollama) -->
        <div v-if="provider !== 'ollama'">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cle API
          </label>
          <input
              v-model="apiKey"
              :placeholder="currentProvider.keyPlaceholder"
              class="input"
              type="password"
          />
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Votre clé API est stockée localement dans votre navigateur.
          </p>
        </div>

        <!-- Ollama URL -->
        <div v-if="provider === 'ollama'">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            URL Ollama
          </label>
          <input
              v-model="ollamaUrl"
              class="input"
              placeholder="http://localhost:11434"
              type="text"
          />
        </div>

        <!-- Model selection -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Modèle
            </label>
            <button
                :disabled="loadingModels"
                class="text-xs text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
                type="button"
                @click="loadModels"
            >
              {{ loadingModels ? 'Chargement…' : 'Charger les modèles disponibles' }}
            </button>
          </div>
          <select v-model="model" class="input">
            <option v-for="m in modelOptions" :key="m.value" :value="m.value">
              {{ m.label }}
            </option>
          </select>
          <p v-if="modelError" class="mt-2 text-xs text-red-500">{{ modelError }}</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button class="btn btn-primary" @click="saveSettings">
            <svg v-if="saved" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            {{ saved ? 'Enregistre!' : 'Enregistrer' }}
          </button>
          <button class="btn btn-secondary" @click="testConnection">
            Tester la connexion
          </button>
        </div>
      </div>

      <!-- PageSpeed Insights -->
      <div class="card p-6 mt-6 space-y-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Analyse PageSpeed</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            L'API PageSpeed Insights fonctionne sans clé, mais avec un quota très limité.
            Une clé est recommandée pour la Watchlist et les analyses répétées.
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Clé API PageSpeed (optionnelle)
          </label>
          <input
              v-model="pageSpeedKey"
              class="input"
              placeholder="AIza..."
              type="password"
          />
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Stockée localement.
            <a class="text-primary-600 dark:text-primary-400 hover:underline" href="https://developers.google.com/speed/docs/insights/v5/get-started" target="_blank">
              Obtenir une clé
            </a>
          </p>
        </div>
      </div>

      <!-- Info cards -->
      <div class="mt-8 grid gap-4">
        <div class="card p-4 flex items-start gap-3">
          <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </div>
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">Gemini (Recommandé)</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Contexte de 1M tokens, tier gratuit généreux, excellent en français.
              <a class="text-primary-600 dark:text-primary-400 hover:underline" href="https://makersuite.google.com/app/apikey" target="_blank">
                Obtenir une clé API
              </a>
            </p>
          </div>
        </div>

        <div class="card p-4 flex items-start gap-3">
          <div class="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </div>
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">Ollama (100% Local)</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Exécutez des modèles IA localement sans envoyer vos données.
              <a class="text-primary-600 dark:text-primary-400 hover:underline" href="https://ollama.ai" target="_blank">
                Installer Ollama
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
