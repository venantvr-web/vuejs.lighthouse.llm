<script setup>
import BuildStamp from '@/components/common/BuildStamp.vue'
</script>

<template>
  <footer
      class="fixed bottom-0 inset-x-0 z-30 py-1.5 px-4 text-center
             border-t border-gray-200/60 dark:border-gray-800/60
             bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
  >
    <span class="text-[11px] text-gray-400 dark:text-gray-500">Lighthouse AI Analyzer</span>
    <span class="text-[11px] text-gray-300 dark:text-gray-600 mx-1.5">·</span>
    <BuildStamp inline/>
  </footer>
</template>
