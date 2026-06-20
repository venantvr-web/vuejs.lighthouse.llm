<script setup>
/**
 * Fenêtre modale réutilisable (teleport vers <body>) : fond assombri,
 * fermeture au clic sur l'arrière-plan, à la croix ou via Échap.
 * Le contenu défile si nécessaire ; la mise en page interne est préservée.
 */
import {onBeforeUnmount, watch} from 'vue'

const props = defineProps({
  open: {type: Boolean, default: false},
  title: {type: String, default: ''}
})

const emit = defineEmits(['close'])

function close() {
  emit('close')
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

watch(() => props.open, (isOpen) => {
  if (typeof document === 'undefined') return
  if (isOpen) {
    document.addEventListener('keydown', onKeydown)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  }
})

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
          v-if="open"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          @click.self="close"
      >
        <div class="w-full max-w-3xl max-h-[85vh] flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="flex items-start justify-between gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              <slot name="title">{{ title }}</slot>
            </h3>
            <button
                class="p-1 -m-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
                :aria-label="$t('common.close')"
                @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-5 py-4">
            <slot/>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
