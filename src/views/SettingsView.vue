<script setup>
import {onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'

const router = useRouter()

const provider = ref('gemini')
const apiKey = ref('')
const model = ref('')
const ollamaUrl = ref('http://localhost:11434')
const saved = ref(false)

const providers = [
  {id: 'gemini', name: 'Google Gemini', models: ['gemini-1.5-flash', 'gemini-1.5-pro'], keyPlaceholder: 'AIza...'},
  {id: 'openai', name: 'OpenAI', models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'], keyPlaceholder: 'sk-...'},
  {id: 'anthropic', name: 'Anthropic Claude', models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229'], keyPlaceholder: 'sk-ant-...'},
  {id: 'ollama', name: 'Ollama (Local)', models: ['llama3', 'mistral', 'codellama'], keyPlaceholder: ''}
]

const currentProvider = ref(providers[0])

onMounted(() => {
  const settings = localStorage.getItem('llm-settings')
  if (settings) {
    const parsed = JSON.parse(settings)
    provider.value = parsed.provider || 'gemini'
    apiKey.value = parsed.apiKey || ''
    model.value = parsed.model || ''
    ollamaUrl.value = parsed.ollamaUrl || 'http://localhost:11434'
  }
  currentProvider.value = providers.find(p => p.id === provider.value) || providers[0]
  if (!model.value) {
    model.value = currentProvider.value.models[0]
  }
})

watch(provider, (newProvider) => {
  currentProvider.value = providers.find(p => p.id === newProvider) || providers[0]
  model.value = currentProvider.value.models[0]
})

const saveSettings = () => {
  localStorage.setItem('llm-settings', JSON.stringify({
    provider: provider.value,
    apiKey: apiKey.value,
    model: model.value,
    ollamaUrl: ollamaUrl.value
  }))
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
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Modele
          </label>
          <select v-model="model" class="input">
            <option v-for="m in currentProvider.models" :key="m" :value="m">
              {{ m }}
            </option>
          </select>
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
