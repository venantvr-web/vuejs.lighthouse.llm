<script setup>
import {computed} from 'vue'

const props = defineProps({
  diff: {
    type: Number,
    default: null
  },
  showValue: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  }
})

const status = computed(() => {
  if (props.diff === null) return 'unknown'
  if (props.diff > 0.01) return 'improved'
  if (props.diff < -0.01) return 'declined'
  return 'unchanged'
})

const diffPercent = computed(() => {
  if (props.diff === null) return null
  return Math.round(props.diff * 100)
})

const formattedDiff = computed(() => {
  if (diffPercent.value === null) return '-'
  if (diffPercent.value > 0) return `+${diffPercent.value}`
  return `${diffPercent.value}`
})

const sizeClasses = {
  sm: 'text-xs gap-0.5',
  md: 'text-sm gap-1',
  lg: 'text-base gap-1.5'
}

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
}
</script>

<template>
  <span
      :class="[
        'inline-flex items-center font-medium',
        sizeClasses[size],
        status === 'improved' && 'text-emerald-600 dark:text-emerald-400',
        status === 'declined' && 'text-red-600 dark:text-red-400',
        status === 'unchanged' && 'text-gray-500 dark:text-gray-400',
        status === 'unknown' && 'text-gray-400 dark:text-gray-500'
      ]"
  >
    <!-- Arrow icon -->
    <svg
        v-if="status === 'improved'"
        :class="iconSizes[size]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
      <path d="M5 10l7-7m0 0l7 7m-7-7v18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
    </svg>
    <svg
        v-else-if="status === 'declined'"
        :class="iconSizes[size]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
      <path d="M19 14l-7 7m0 0l-7-7m7 7V3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
    </svg>
    <svg
        v-else-if="status === 'unchanged'"
        :class="iconSizes[size]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
      <path d="M5 12h14" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
    </svg>
    <span v-else>-</span>

    <!-- Value -->
    <span v-if="showValue && status !== 'unknown'">{{ formattedDiff }}</span>
  </span>
</template>
