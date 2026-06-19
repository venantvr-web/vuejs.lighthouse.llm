<script setup>
import {ref} from 'vue'
import {useI18n} from '@/i18n'
import {useToast} from '@/composables/useToast'

const {t} = useI18n()
const {toasts, dismiss} = useToast()

// Toasts dont le bloc « détails » est déplié
const expanded = ref(new Set())

function toggle(id) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

async function copyDetails(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // ignore
  }
}

const STYLES = {
  success: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200',
  info: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200',
  warning: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200',
  error: 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
}
const DOTS = {success: 'bg-emerald-500', info: 'bg-blue-500', warning: 'bg-amber-500', error: 'bg-red-500'}
</script>

<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,380px)] pointer-events-none">
    <TransitionGroup name="toast">
      <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="STYLES[toast.type] || STYLES.info"
          class="pointer-events-auto rounded-xl border-l-4 shadow-lg bg-white dark:bg-gray-800 p-3 pr-9 relative"
          role="status"
      >
        <button
            :aria-label="$t('common.close')"
            class="absolute top-2 right-2 p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            @click="dismiss(toast.id)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
        </button>

        <div class="flex items-start gap-2">
          <span :class="DOTS[toast.type] || DOTS.info" class="w-2 h-2 rounded-full mt-1.5 shrink-0"></span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 dark:text-white break-words">{{ toast.message }}</p>

            <!-- Détails techniques (erreurs verbeuses) -->
            <div v-if="toast.details" class="mt-1">
              <button
                  class="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                  @click="toggle(toast.id)"
              >
                {{ expanded.has(toast.id) ? '▾' : '▸' }} {{ $t('common.details') }}
              </button>
              <div v-if="expanded.has(toast.id)" class="mt-1">
                <pre class="text-[11px] leading-snug bg-gray-100 dark:bg-gray-900 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{{ toast.details }}</pre>
                <button
                    class="mt-1 text-xs text-gray-500 dark:text-gray-400 hover:underline"
                    @click="copyDetails(toast.details)"
                >
                  {{ $t('common.copy') }}
                </button>
              </div>
            </div>

            <!-- Actions optionnelles -->
            <div v-if="toast.actions && toast.actions.length" class="mt-2 flex gap-2">
              <button
                  v-for="(action, i) in toast.actions"
                  :key="i"
                  class="text-xs font-medium px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                  @click="action.onClick(); dismiss(toast.id)"
              >
                {{ action.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.toast-move {
  transition: transform 0.25s ease;
}
</style>
