<script setup>
/**
 * Bandeau d'introduction affiché en haut de chaque page : 2 ou 3 phrases
 * qui décrivent ce que fait la page. Discret, pleine largeur sous le header.
 */
defineProps({
  text: {type: String, default: ''},
  width: {type: String, default: '6xl'}
})

const widths = {
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl'
}
</script>

<template>
  <div class="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/20">
    <div :class="widths[width] || 'max-w-6xl'" class="mx-auto w-full px-4 py-3">
      <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        <slot>{{ text }}</slot>
      </p>
    </div>
  </div>
</template>
