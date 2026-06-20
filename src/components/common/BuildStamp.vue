<script setup>
import {computed} from 'vue'

/* globals __COMMIT_DATE__, __COMMIT_SHA__ */
// Injectés au build par Vite (define). typeof évite tout crash hors build (tests).
const rawDate = typeof __COMMIT_DATE__ !== 'undefined' ? __COMMIT_DATE__ : ''
const sha = typeof __COMMIT_SHA__ !== 'undefined' ? __COMMIT_SHA__ : ''

const date = computed(() => {
  if (!rawDate) return ''
  const d = new Date(rawDate)
  return isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString(undefined, {year: 'numeric', month: '2-digit', day: '2-digit'})
})

const tooltip = computed(() => {
  if (!rawDate) return ''
  const d = new Date(rawDate)
  const full = isNaN(d.getTime()) ? rawDate : d.toLocaleString()
  return sha ? `${full} · ${sha}` : full
})
</script>

<template>
  <div
      v-if="date"
      :title="tooltip"
      class="fixed bottom-1.5 left-2 z-30 text-[10px] leading-none text-gray-400 dark:text-gray-600 opacity-40 hover:opacity-80 transition-opacity select-none"
  >
    {{ date }}
  </div>
</template>
