<script setup>
import {computed} from 'vue'

/* globals __COMMIT_DATE__, __COMMIT_SHA__ */
// Injectés au build par Vite (define). typeof évite tout crash hors build (tests).
const rawDate = typeof __COMMIT_DATE__ !== 'undefined' ? __COMMIT_DATE__ : ''
const sha = typeof __COMMIT_SHA__ !== 'undefined' ? __COMMIT_SHA__ : ''

const parsed = computed(() => {
  if (!rawDate) return null
  const d = new Date(rawDate)
  return isNaN(d.getTime()) ? null : d
})

// Libellé : « jj/mm/aaaa HH:mm · <sha> »
const label = computed(() => {
  if (!parsed.value) return ''
  const date = parsed.value.toLocaleDateString(undefined, {year: 'numeric', month: '2-digit', day: '2-digit'})
  const time = parsed.value.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'})
  return sha ? `${date} ${time} · ${sha}` : `${date} ${time}`
})

const tooltip = computed(() => (parsed.value ? parsed.value.toLocaleString() : ''))
</script>

<template>
  <div
      v-if="label"
      :title="tooltip"
      class="fixed bottom-2 left-2 z-30 text-[11px] leading-none px-2 py-1 rounded-md
             bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60
             text-gray-500 dark:text-gray-400 opacity-70 hover:opacity-100 transition-opacity select-none"
  >
    {{ label }}
  </div>
</template>
