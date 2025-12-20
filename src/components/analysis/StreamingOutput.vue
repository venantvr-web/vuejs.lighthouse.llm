<script setup>
import { ref, watch, nextTick } from 'vue'
import MarkdownViewer from './MarkdownViewer.vue'

const props = defineProps({
  content: { type: String, default: '' },
  isStreaming: { type: Boolean, default: false },
  tokenCount: { type: Number, default: 0 }
})

const emit = defineEmits(['cancel', 'copy', 'export'])
const outputContainer = ref(null)
const copied = ref(false)

// Auto-scroll during streaming
watch(() => props.content, async () => {
  if (props.isStreaming && outputContainer.value) {
    await nextTick()
    outputContainer.value.scrollTop = outputContainer.value.scrollHeight
  }
})

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.content)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
    emit('copy')
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}
</script>

<template>
  <div class="relative card p-6">
    <!-- Header with actions -->
    <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-3">
        <!-- Streaming indicator -->
        <span
          v-if="isStreaming"
          class="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400"
        >
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
          </span>
          Generation en cours...
        </span>

        <!-- Token count -->
        <span v-else-if="content" class="text-sm text-gray-500 dark:text-gray-400">
          <svg class="inline w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          {{ tokenCount }} tokens
        </span>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-2">
        <!-- Cancel button -->
        <button
          v-if="isStreaming"
          @click="emit('cancel')"
          class="btn btn-ghost text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Arreter
        </button>

        <!-- Copy button -->
        <button
          v-if="content && !isStreaming"
          @click="copyToClipboard"
          class="btn btn-ghost text-sm"
          :class="copied ? 'text-green-600 dark:text-green-400' : ''"
        >
          <svg v-if="!copied" class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <svg v-else class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          {{ copied ? 'Copie!' : 'Copier' }}
        </button>

        <!-- Export button -->
        <button
          v-if="content && !isStreaming"
          @click="emit('export')"
          class="btn btn-ghost text-sm"
        >
          <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter
        </button>
      </div>
    </div>

    <!-- Content area -->
    <div
      ref="outputContainer"
      class="overflow-auto max-h-[600px] scroll-smooth"
    >
      <MarkdownViewer
        v-if="content"
        :content="content"
        :streaming="isStreaming"
      />

      <!-- Empty state -->
      <div
        v-else-if="!isStreaming"
        class="text-center py-12 text-gray-500 dark:text-gray-400"
      >
        <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <p class="italic">
          Sélectionnez une catégorie et lancez l'analyse pour obtenir des conseils d'expert.
        </p>
      </div>
    </div>

    <!-- Progress bar during streaming -->
    <Transition name="slide-up">
      <div
        v-if="isStreaming"
        class="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-2xl overflow-hidden"
      >
        <div class="h-full bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500 animate-shimmer"
             style="background-size: 200% 100%;" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.animate-shimmer {
  animation: shimmer 1.5s ease-in-out infinite;
}
</style>
