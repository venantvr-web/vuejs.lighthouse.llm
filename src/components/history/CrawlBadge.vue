<script setup>
defineProps({
  sessionId: {
    type: String,
    required: true
  },
  templateName: {
    type: String,
    default: null
  },
  size: {
    type: String,
    default: 'sm',
    validator: (v) => ['xs', 'sm', 'md'].includes(v)
  }
})

defineEmits(['click'])

const sizeClasses = {
  xs: 'px-1.5 py-0.5 text-[10px] gap-1',
  sm: 'px-2 py-0.5 text-xs gap-1.5',
  md: 'px-2.5 py-1 text-sm gap-2'
}

const iconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4'
}
</script>

<template>
  <button
      type="button"
      :class="[
        'inline-flex items-center rounded font-medium transition-colors',
        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
        'hover:bg-emerald-200 dark:hover:bg-emerald-900/50',
        sizeClasses[size]
      ]"
      :title="`Voir la session de crawl${templateName ? ` - Template: ${templateName}` : ''}`"
      @click.stop="$emit('click', sessionId)"
  >
    <svg
        :class="iconSizes[size]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
      <path
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
      />
    </svg>
    <span>Crawl</span>
    <span v-if="templateName" class="opacity-75">{{ templateName }}</span>
  </button>
</template>
