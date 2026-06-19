<script setup>
import {computed, onMounted, ref, watch} from 'vue'
import {useSettingsStore} from '@/stores/settingsStore'
import {buildLLMProvider} from '@/services/llm/buildProvider'
import {
  DEFAULT_USER_AGENT,
  FETCH_MODES,
  getDefaultProxyBase,
  getFetchMode,
  getRawProxyBase,
  getRawUserAgent,
  setFetchMode,
  setProxyBase,
  setUserAgent
} from '@/services/requestConfig'
import {deleteAllDatabases} from '@/utils/localData'
import AppHeader from '@/components/common/AppHeader.vue'
import {useI18n} from '@/i18n'
import {useToast} from '@/composables/useToast'

const {t} = useI18n()
const toast = useToast()
const settings = useSettingsStore()
const DEFAULT_UA = DEFAULT_USER_AGENT
const defaultProxyBase = getDefaultProxyBase()

const provider = ref('gemini')
const apiKey = ref('')
const model = ref('')
const ollamaUrl = ref('http://localhost:11434')
const pageSpeedKey = ref('')
const userAgent = ref('')
const proxyBase = ref('')
const directFetch = ref(false)
const resettingDb = ref(false)
const maxTokens = ref(16384)
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
  userAgent.value = getRawUserAgent()
  proxyBase.value = getRawProxyBase()
  directFetch.value = getFetchMode() === FETCH_MODES.DIRECT
  maxTokens.value = settings.maxTokens
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
    modelError.value = t('settings.errKeyFirst')
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
      modelError.value = t('settings.errDynamicUnavailable')
      return
    }
    const list = await instance.listModels()
    if (!list.length) {
      modelError.value = t('settings.errNoModel')
      return
    }
    dynamicModels.value = list
    if (!list.some(m => m.value === model.value)) {
      model.value = list[0].value
    }
  } catch (e) {
    modelError.value = t('settings.errLoadFailed', {message: e.message})
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
  setUserAgent(userAgent.value)
  setProxyBase(proxyBase.value)
  setFetchMode(directFetch.value ? FETCH_MODES.DIRECT : FETCH_MODES.PROXY)
  if (maxTokens.value) settings.setMaxTokens(maxTokens.value)
  saved.value = true
  toast.success(t('toast.saved'))
  setTimeout(() => saved.value = false, 2000)
}

const resetUserAgent = () => {
  userAgent.value = ''
  setUserAgent('')
}

const resetProxyBase = () => {
  proxyBase.value = ''
  setProxyBase('')
}

const resetDatabases = async () => {
  if (!confirm(t('settings.confirmResetDb'))) return
  resettingDb.value = true
  try {
    await deleteAllDatabases()
  } finally {
    // Recharge pour fermer les connexions et recréer les bases proprement
    window.location.reload()
  }
}

const testConnection = async () => {
  // TODO: Implement connection test
  alert(t('settings.testTodo'))
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <AppHeader :subtitle="$t('settings.headerSubtitle')" :title="$t('settings.headerTitle')"/>

    <!-- Main -->
    <main class="max-w-2xl mx-auto px-4 py-8">
      <div class="card p-6 space-y-6">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ $t('settings.llmTitle') }}</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {{ $t('settings.llmIntro') }}
          </p>
        </div>

        <!-- Provider selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ $t('settings.providerLabel') }}
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
                {{ p.id === 'ollama' ? $t('settings.providerLocal') : $t('settings.providerCloud') }}
              </div>
            </button>
          </div>
        </div>

        <!-- API Key (not for Ollama) -->
        <div v-if="provider !== 'ollama'">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ $t('settings.apiKeyLabel') }}
          </label>
          <input
              v-model="apiKey"
              :placeholder="currentProvider.keyPlaceholder"
              class="input"
              type="password"
          />
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {{ $t('settings.apiKeyHint') }}
          </p>
        </div>

        <!-- Ollama URL -->
        <div v-if="provider === 'ollama'">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ $t('settings.ollamaUrlLabel') }}
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
              {{ $t('settings.modelLabel') }}
            </label>
            <button
                :disabled="loadingModels"
                class="text-xs text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
                type="button"
                @click="loadModels"
            >
              {{ loadingModels ? $t('common.loading') : $t('settings.loadModels') }}
            </button>
          </div>
          <select v-model="model" class="input">
            <option v-for="m in modelOptions" :key="m.value" :value="m.value">
              {{ m.label }}
            </option>
          </select>
          <p v-if="modelError" class="mt-2 text-xs text-red-500">{{ modelError }}</p>
        </div>

        <!-- Max response length -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ $t('settings.maxTokensLabel') }}
          </label>
          <input
              v-model.number="maxTokens"
              class="input"
              max="32768"
              min="256"
              step="256"
              type="number"
          />
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {{ $t('settings.maxTokensHint') }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button class="btn btn-primary" @click="saveSettings">
            <svg v-if="saved" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            {{ saved ? $t('settings.savedConfirm') : $t('common.save') }}
          </button>
          <button class="btn btn-secondary" @click="testConnection">
            {{ $t('settings.testConnection') }}
          </button>
        </div>
      </div>

      <!-- PageSpeed Insights -->
      <div class="card p-6 mt-6 space-y-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">{{ $t('settings.pageSpeedTitle') }}</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('settings.pageSpeedIntro') }}
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ $t('settings.pageSpeedKeyLabel') }}
          </label>
          <input
              v-model="pageSpeedKey"
              class="input"
              placeholder="AIza..."
              type="password"
          />
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {{ $t('settings.pageSpeedStored') }}
            <a class="text-primary-600 dark:text-primary-400 hover:underline" href="https://developers.google.com/speed/docs/insights/v5/get-started" target="_blank">
              {{ $t('settings.pageSpeedGetKey') }}
            </a>
          </p>
        </div>
      </div>

      <!-- Requêtes sortantes (proxy) -->
      <div class="card p-6 mt-6 space-y-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">{{ $t('settings.outboundTitle') }}</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('settings.outboundIntro') }}
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ $t('settings.userAgentLabel') }}
          </label>
          <div class="flex items-center gap-2">
            <input
                v-model="userAgent"
                :placeholder="DEFAULT_UA"
                class="input flex-1"
                type="text"
            />
            <button
                :disabled="!userAgent"
                class="btn btn-secondary text-sm whitespace-nowrap disabled:opacity-50"
                type="button"
                @click="resetUserAgent"
            >
              {{ $t('common.reset') }}
            </button>
          </div>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {{ $t('settings.userAgentHintPrefix') }} <code class="text-[11px]">{{ DEFAULT_UA }}</code>.
            {{ $t('settings.userAgentHintSuffix') }}
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ $t('settings.proxyBaseLabel') }}
          </label>
          <div class="flex items-center gap-2">
            <input
                v-model="proxyBase"
                :placeholder="defaultProxyBase || $t('settings.proxyBasePlaceholder')"
                class="input flex-1"
                type="text"
            />
            <button
                :disabled="!proxyBase"
                class="btn btn-secondary text-sm whitespace-nowrap disabled:opacity-50"
                type="button"
                @click="resetProxyBase"
            >
              {{ $t('common.reset') }}
            </button>
          </div>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {{ $t('settings.proxyBaseHintPrefix') }}<code class="text-[11px]">/api</code>{{ $t('settings.proxyBaseHintMiddle') }}
            <code class="text-[11px]">http://localhost:3001</code> {{ $t('settings.proxyBaseHintSuffix') }}
          </p>
        </div>

        <div>
          <label class="flex items-start gap-2 cursor-pointer">
            <input v-model="directFetch" class="rounded mt-0.5" type="checkbox"/>
            <span>
              <span class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ $t('settings.directModeLabel') }}</span>
              <span class="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{ $t('settings.directModeHint') }}
              </span>
            </span>
          </label>
        </div>
      </div>

      <!-- Données locales / maintenance -->
      <div class="card p-6 mt-6 space-y-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">{{ $t('settings.localDataTitle') }}</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('settings.localDataIntro') }}
          </p>
        </div>
        <button
            :disabled="resettingDb"
            class="btn btn-danger disabled:opacity-50"
            type="button"
            @click="resetDatabases"
        >
          {{ resettingDb ? $t('settings.resettingDb') : $t('settings.resetDbButton') }}
        </button>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ $t('settings.localDataNote') }}
        </p>
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
            <h3 class="font-medium text-gray-900 dark:text-white">{{ $t('settings.geminiTitle') }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ $t('settings.geminiDesc') }}
              <a class="text-primary-600 dark:text-primary-400 hover:underline" href="https://makersuite.google.com/app/apikey" target="_blank">
                {{ $t('settings.geminiLink') }}
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
            <h3 class="font-medium text-gray-900 dark:text-white">{{ $t('settings.ollamaCardTitle') }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ $t('settings.ollamaCardDesc') }}
              <a class="text-primary-600 dark:text-primary-400 hover:underline" href="https://ollama.ai" target="_blank">
                {{ $t('settings.ollamaLink') }}
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
