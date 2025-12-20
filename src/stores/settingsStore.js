import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

/**
 * Store for managing application settings
 */
export const useSettingsStore = defineStore('settings', () => {
  const STORAGE_KEY = 'lighthouse-settings'

  // State - LLM Configuration
  const llmProvider = ref('openai') // 'openai' | 'anthropic' | 'ollama'
  const llmModel = ref('gpt-4o')
  const apiKey = ref('')
  const temperature = ref(0.7)
  const maxTokens = ref(2000)

  // State - Ollama Configuration
  const ollamaBaseUrl = ref('http://localhost:11434')
  const ollamaModel = ref('llama3.2')

  // State - Theme Configuration
  const theme = ref('system') // 'light' | 'dark' | 'system'

  // State - UI Preferences
  const showLineNumbers = ref(true)
  const autoAnalyze = ref(false)
  const saveHistory = ref(true)

  // Getters
  const currentProvider = computed(() => llmProvider.value)

  const isConfigured = computed(() => {
    if (llmProvider.value === 'ollama') {
      return !!ollamaBaseUrl.value && !!ollamaModel.value
    }
    return !!apiKey.value
  })

  const currentModel = computed(() => {
    if (llmProvider.value === 'ollama') {
      return ollamaModel.value
    }
    return llmModel.value
  })

  const llmConfig = computed(() => ({
    provider: llmProvider.value,
    model: currentModel.value,
    apiKey: apiKey.value,
    temperature: temperature.value,
    maxTokens: maxTokens.value,
    ollamaBaseUrl: ollamaBaseUrl.value
  }))

  const modelOptions = computed(() => {
    switch (llmProvider.value) {
      case 'openai':
        return [
          { value: 'gpt-4o', label: 'GPT-4o' },
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
        ]
      case 'anthropic':
        return [
          { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
          { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
          { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }
        ]
      case 'ollama':
        return [
          { value: 'llama3.2', label: 'Llama 3.2' },
          { value: 'llama3.1', label: 'Llama 3.1' },
          { value: 'mistral', label: 'Mistral' },
          { value: 'mixtral', label: 'Mixtral' },
          { value: 'qwen2.5', label: 'Qwen 2.5' }
        ]
      default:
        return []
    }
  })

  // Actions
  /**
   * Set LLM provider
   * @param {string} provider - 'openai' | 'anthropic' | 'ollama'
   */
  function setLLMProvider(provider) {
    if (!['openai', 'anthropic', 'ollama'].includes(provider)) {
      console.error('Invalid LLM provider:', provider)
      return
    }

    llmProvider.value = provider

    // Set default model for provider
    switch (provider) {
      case 'openai':
        if (!llmModel.value || !modelOptions.value.some(m => m.value === llmModel.value)) {
          llmModel.value = 'gpt-4o'
        }
        break
      case 'anthropic':
        if (!llmModel.value || !modelOptions.value.some(m => m.value === llmModel.value)) {
          llmModel.value = 'claude-3-5-sonnet-20241022'
        }
        break
      case 'ollama':
        if (!ollamaModel.value) {
          ollamaModel.value = 'llama3.2'
        }
        break
    }

    saveSettings()
  }

  /**
   * Set LLM model
   * @param {string} model - Model identifier
   */
  function setLLMModel(model) {
    if (llmProvider.value === 'ollama') {
      ollamaModel.value = model
    } else {
      llmModel.value = model
    }
    saveSettings()
  }

  /**
   * Set API key
   * @param {string} key - API key
   */
  function setAPIKey(key) {
    apiKey.value = key
    saveSettings()
  }

  /**
   * Set temperature
   * @param {number} temp - Temperature value (0-2)
   */
  function setTemperature(temp) {
    if (temp < 0 || temp > 2) {
      console.error('Temperature must be between 0 and 2')
      return
    }
    temperature.value = temp
    saveSettings()
  }

  /**
   * Set max tokens
   * @param {number} tokens - Max tokens value
   */
  function setMaxTokens(tokens) {
    if (tokens < 1) {
      console.error('Max tokens must be positive')
      return
    }
    maxTokens.value = tokens
    saveSettings()
  }

  /**
   * Set Ollama base URL
   * @param {string} url - Base URL
   */
  function setOllamaBaseUrl(url) {
    ollamaBaseUrl.value = url
    saveSettings()
  }

  /**
   * Set Ollama model
   * @param {string} model - Model name
   */
  function setOllamaModel(model) {
    ollamaModel.value = model
    saveSettings()
  }

  /**
   * Set theme
   * @param {string} newTheme - 'light' | 'dark' | 'system'
   */
  function setTheme(newTheme) {
    if (!['light', 'dark', 'system'].includes(newTheme)) {
      console.error('Invalid theme:', newTheme)
      return
    }
    theme.value = newTheme
    saveSettings()
  }

  /**
   * Toggle line numbers
   */
  function toggleLineNumbers() {
    showLineNumbers.value = !showLineNumbers.value
    saveSettings()
  }

  /**
   * Toggle auto analyze
   */
  function toggleAutoAnalyze() {
    autoAnalyze.value = !autoAnalyze.value
    saveSettings()
  }

  /**
   * Toggle save history
   */
  function toggleSaveHistory() {
    saveHistory.value = !saveHistory.value
    saveSettings()
  }

  /**
   * Update all LLM settings at once
   * @param {object} config - Configuration object
   */
  function updateLLMConfig(config) {
    if (config.provider) llmProvider.value = config.provider
    if (config.model) llmModel.value = config.model
    if (config.apiKey !== undefined) apiKey.value = config.apiKey
    if (config.temperature !== undefined) temperature.value = config.temperature
    if (config.maxTokens !== undefined) maxTokens.value = config.maxTokens
    if (config.ollamaBaseUrl) ollamaBaseUrl.value = config.ollamaBaseUrl
    if (config.ollamaModel) ollamaModel.value = config.ollamaModel
    saveSettings()
  }

  /**
   * Save settings to localStorage
   */
  function saveSettings() {
    try {
      const settings = {
        llmProvider: llmProvider.value,
        llmModel: llmModel.value,
        apiKey: apiKey.value,
        temperature: temperature.value,
        maxTokens: maxTokens.value,
        ollamaBaseUrl: ollamaBaseUrl.value,
        ollamaModel: ollamaModel.value,
        theme: theme.value,
        showLineNumbers: showLineNumbers.value,
        autoAnalyze: autoAnalyze.value,
        saveHistory: saveHistory.value
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  /**
   * Load settings from localStorage
   */
  function loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return

      const settings = JSON.parse(stored)

      if (settings.llmProvider) llmProvider.value = settings.llmProvider
      if (settings.llmModel) llmModel.value = settings.llmModel
      if (settings.apiKey !== undefined) apiKey.value = settings.apiKey
      if (settings.temperature !== undefined) temperature.value = settings.temperature
      if (settings.maxTokens !== undefined) maxTokens.value = settings.maxTokens
      if (settings.ollamaBaseUrl) ollamaBaseUrl.value = settings.ollamaBaseUrl
      if (settings.ollamaModel) ollamaModel.value = settings.ollamaModel
      if (settings.theme) theme.value = settings.theme
      if (settings.showLineNumbers !== undefined) showLineNumbers.value = settings.showLineNumbers
      if (settings.autoAnalyze !== undefined) autoAnalyze.value = settings.autoAnalyze
      if (settings.saveHistory !== undefined) saveHistory.value = settings.saveHistory
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  /**
   * Reset all settings to defaults
   */
  function resetSettings() {
    llmProvider.value = 'openai'
    llmModel.value = 'gpt-4o'
    apiKey.value = ''
    temperature.value = 0.7
    maxTokens.value = 2000
    ollamaBaseUrl.value = 'http://localhost:11434'
    ollamaModel.value = 'llama3.2'
    theme.value = 'system'
    showLineNumbers.value = true
    autoAnalyze.value = false
    saveHistory.value = true

    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * Clear API key (for security)
   */
  function clearAPIKey() {
    apiKey.value = ''
    saveSettings()
  }

  // Auto-save on changes
  watch(
    [llmProvider, llmModel, apiKey, temperature, maxTokens,
     ollamaBaseUrl, ollamaModel, theme, showLineNumbers,
     autoAnalyze, saveHistory],
    () => {
      saveSettings()
    }
  )

  // Initialize
  loadSettings()

  return {
    // State
    llmProvider,
    llmModel,
    apiKey,
    temperature,
    maxTokens,
    ollamaBaseUrl,
    ollamaModel,
    theme,
    showLineNumbers,
    autoAnalyze,
    saveHistory,

    // Getters
    currentProvider,
    isConfigured,
    currentModel,
    llmConfig,
    modelOptions,

    // Actions
    setLLMProvider,
    setLLMModel,
    setAPIKey,
    setTemperature,
    setMaxTokens,
    setOllamaBaseUrl,
    setOllamaModel,
    setTheme,
    toggleLineNumbers,
    toggleAutoAnalyze,
    toggleSaveHistory,
    updateLLMConfig,
    saveSettings,
    loadSettings,
    resetSettings,
    clearAPIKey
  }
})
