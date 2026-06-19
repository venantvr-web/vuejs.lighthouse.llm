<script setup>
import {ref, watch} from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Rechercher...'
  },
  debounce: {
    type: Number,
    default: 300
  },
  clearable: {
    type: Boolean,
    default: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'clear'])

const localValue = ref(props.modelValue)
let debounceTimer = null

watch(() => props.modelValue, (newVal) => {
  localValue.value = newVal
})

function onInput(event) {
  localValue.value = event.target.value

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    emit('update:modelValue', localValue.value)
  }, props.debounce)
}

function clear() {
  localValue.value = ''
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <div class="relative">
    <!-- Search icon -->
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <svg
          class="h-5 w-5 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
      >
        <path
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
        />
      </svg>
    </div>

    <!-- Input -->
    <input
        :value="localValue"
        :placeholder="placeholder"
        :disabled="disabled"
        type="text"
        class="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        @input="onInput"
    />

    <!-- Clear button -->
    <button
        v-if="clearable && localValue"
        type="button"
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        @click="clear"
    >
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            d="M6 18L18 6M6 6l12 12"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
        />
      </svg>
    </button>
  </div>
</template>
