<script setup>
import {onBeforeUnmount, ref} from 'vue'

defineProps({
  // Texte d'aide (peut aussi être fourni via le slot par défaut)
  text: {type: String, default: ''}
})

const open = ref(false)
let closer = null

function close() {
  open.value = false
  if (closer) {
    document.removeEventListener('click', closer)
    closer = null
  }
}

function toggle(e) {
  e.stopPropagation()
  if (open.value) {
    close()
    return
  }
  open.value = true
  // Fermeture au clic en dehors (mobile-friendly : pas besoin de survol)
  closer = () => close()
  setTimeout(() => document.addEventListener('click', closer), 0)
}

onBeforeUnmount(close)
</script>

<template>
  <span class="relative inline-flex align-middle">
    <button
        :aria-label="text"
        class="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-primary-600 hover:border-primary-400 transition-colors"
        type="button"
        @click="toggle"
    >?</button>
    <Transition name="help-fade">
      <span
          v-if="open"
          class="absolute left-1/2 -translate-x-1/2 top-6 z-50 w-56 max-w-[70vw] p-2.5 rounded-lg shadow-lg text-left
                 bg-gray-900 text-gray-100 dark:bg-gray-700 text-xs font-normal leading-snug normal-case"
          @click.stop
      >
        <slot>{{ text }}</slot>
      </span>
    </Transition>
  </span>
</template>

<style scoped>
.help-fade-enter-active,
.help-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.help-fade-enter-from,
.help-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -4px);
}
</style>
