<script setup>
defineProps({
  selected: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  }
})

defineEmits(['toggle'])

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7'
}
</script>

<template>
  <button
      type="button"
      :class="[
        'rounded-full border-2 transition-all flex items-center justify-center',
        sizeClasses[size],
        selected
          ? 'bg-emerald-500 border-emerald-500'
          : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-500',
        disabled && !selected && 'opacity-40 cursor-not-allowed hover:border-gray-300 dark:hover:border-gray-600'
      ]"
      :disabled="disabled && !selected"
      @click="$emit('toggle')"
  >
    <svg
        v-if="selected"
        class="w-3/4 h-3/4 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
      <path
          d="M5 13l4 4L19 7"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="3"
      />
    </svg>
    <span v-else-if="!disabled" class="sr-only">Selectionner</span>
  </button>
</template>
