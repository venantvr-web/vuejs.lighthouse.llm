<script setup>
import {ref, computed} from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({start: null, end: null})
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)

// Presets
const presets = [
  {label: 'Aujourd\'hui', days: 0},
  {label: '7 derniers jours', days: 7},
  {label: '30 derniers jours', days: 30},
  {label: '90 derniers jours', days: 90}
]

const startDate = computed({
  get: () => props.modelValue.start ? formatDateForInput(props.modelValue.start) : '',
  set: (val) => {
    emit('update:modelValue', {
      ...props.modelValue,
      start: val ? new Date(val) : null
    })
  }
})

const endDate = computed({
  get: () => props.modelValue.end ? formatDateForInput(props.modelValue.end) : '',
  set: (val) => {
    emit('update:modelValue', {
      ...props.modelValue,
      end: val ? new Date(val + 'T23:59:59') : null
    })
  }
})

function formatDateForInput(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

function applyPreset(days) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)

  emit('update:modelValue', {start, end})
  isOpen.value = false
}

function clear() {
  emit('update:modelValue', {start: null, end: null})
  isOpen.value = false
}

const hasRange = computed(() => props.modelValue.start || props.modelValue.end)

const displayText = computed(() => {
  if (!hasRange.value) return 'Toutes les dates'

  const options = {day: '2-digit', month: 'short'}
  const start = props.modelValue.start
      ? new Date(props.modelValue.start).toLocaleDateString('fr-FR', options)
      : '...'
  const end = props.modelValue.end
      ? new Date(props.modelValue.end).toLocaleDateString('fr-FR', options)
      : '...'

  return `${start} - ${end}`
})
</script>

<template>
  <div class="relative">
    <!-- Trigger button -->
    <button
        type="button"
        :class="[
          'flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors',
          hasRange
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-emerald-400'
        ]"
        @click="isOpen = !isOpen"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
        />
      </svg>
      <span class="text-sm">{{ displayText }}</span>
      <svg
          :class="['w-4 h-4 transition-transform', isOpen && 'rotate-180']"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
      >
        <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
      </svg>
    </button>

    <!-- Dropdown -->
    <Transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
    >
      <div
          v-if="isOpen"
          class="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 p-4"
      >
        <!-- Presets -->
        <div class="mb-4">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Raccourcis</p>
          <div class="flex flex-wrap gap-2">
            <button
                v-for="preset in presets"
                :key="preset.days"
                type="button"
                class="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                @click="applyPreset(preset.days)"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <!-- Custom range -->
        <div class="space-y-3">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Plage personnalisee</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400">Du</label>
              <input
                  v-model="startDate"
                  type="date"
                  class="w-full mt-1 px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400">Au</label>
              <input
                  v-model="endDate"
                  type="date"
                  class="w-full mt-1 px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
              v-if="hasRange"
              type="button"
              class="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
              @click="clear"
          >
            Effacer
          </button>
          <button
              type="button"
              class="ml-auto text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              @click="isOpen = false"
          >
            Fermer
          </button>
        </div>
      </div>
    </Transition>

    <!-- Backdrop -->
    <div
        v-if="isOpen"
        class="fixed inset-0 z-40"
        @click="isOpen = false"
    />
  </div>
</template>
