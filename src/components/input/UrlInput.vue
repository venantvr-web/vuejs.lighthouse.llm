<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'https://example.com'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isValidUrl = computed(() => {
  if (!inputValue.value) return false
  try {
    let url = inputValue.value.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }
    new URL(url)
    return true
  } catch {
    return false
  }
})

const canSubmit = computed(() => {
  return isValidUrl.value && !props.disabled && !props.loading
})

function handleSubmit() {
  if (canSubmit.value) {
    emit('submit', inputValue.value)
  }
}

function handleKeydown(event) {
  if (event.key === 'Enter' && canSubmit.value) {
    handleSubmit()
  }
}
</script>

<template>
  <div class="url-input-container">
    <div class="input-wrapper" :class="{ 'has-error': error, 'is-valid': isValidUrl && !error }">
      <div class="input-icon">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      </div>

      <input
        v-model="inputValue"
        type="url"
        :placeholder="placeholder"
        :disabled="disabled || loading"
        class="url-input"
        @keydown="handleKeydown"
      />

      <button
        type="button"
        :disabled="!canSubmit"
        class="submit-button"
        @click="handleSubmit"
      >
        <template v-if="loading">
          <svg class="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="ml-2">Analyse...</span>
        </template>
        <template v-else>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          <span class="ml-2">Analyser</span>
        </template>
      </button>
    </div>

    <p v-if="error" class="error-message">{{ error }}</p>
    <p v-else-if="inputValue && !isValidUrl" class="hint-message">Entrez une URL valide (ex : https://example.com)</p>
  </div>
</template>

<style scoped>
.url-input-container {
  width: 100%;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg-elevated);
  border: 2px solid var(--border-primary);
  border-radius: 12px;
  padding: 4px;
  transition: all 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--border-focus) 15%, transparent);
}

.input-wrapper.has-error {
  border-color: var(--error);
}

.input-wrapper.has-error:focus-within {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--error) 15%, transparent);
}

.input-wrapper.is-valid {
  border-color: var(--success);
}

.input-wrapper.is-valid:focus-within {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--success) 15%, transparent);
}

.input-icon {
  padding: 0 12px;
  color: var(--text-muted);
}

.url-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 1rem;
  padding: 12px 8px;
  background: transparent;
  min-width: 0;
  color: var(--text-primary);
}

.url-input:disabled {
  background: var(--bg-tertiary);
  cursor: not-allowed;
}

.url-input::placeholder {
  color: var(--text-muted);
}

.submit-button {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.submit-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
}

.submit-button:disabled {
  background: var(--text-muted);
  cursor: not-allowed;
  transform: none;
}

.error-message {
  margin-top: 8px;
  color: var(--error);
  font-size: 0.875rem;
}

.hint-message {
  margin-top: 8px;
  color: var(--text-tertiary);
  font-size: 0.875rem;
}
</style>
