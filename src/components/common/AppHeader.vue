<script setup>
import {useRoute} from 'vue-router'
import {useI18n} from '@/i18n'

const {t} = useI18n()

defineProps({
  title: {type: String, default: ''},
  subtitle: {type: String, default: ''}
})

const route = useRoute()

// Single source of truth for the main section navigation
const NAV = [
  {to: '/briefing', label: t('nav.briefing'), paths: ['M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36l-.7-.7M6.34 6.34l-.7-.7m12.72 0l-.7.7M6.34 17.66l-.7.7M16 12a4 4 0 11-8 0 4 4 0 018 0z']},
  {to: '/watchlist', label: t('nav.watchlist'), paths: ['M15 12a3 3 0 11-6 0 3 3 0 016 0z', 'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z']},
  {to: '/geo', label: t('nav.geo'), paths: ['M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z']},
  {to: '/search-console', label: t('nav.searchConsole'), paths: ['M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z']},
  {to: '/resources', label: t('nav.resources'), paths: ['M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z']},
  {to: '/history', label: t('nav.history'), paths: ['M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z']},
  {to: '/settings', label: t('nav.settings'), paths: ['M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z']}
]

function isActive(to) {
  return route.path === to || route.path.startsWith(to + '/')
}
</script>

<template>
  <header class="border-b border-gray-200 dark:border-gray-800">
    <div class="max-w-6xl mx-auto px-4 py-3">
      <div class="flex items-center justify-between gap-4">
        <!-- Brand + page title -->
        <div class="flex items-center gap-3 min-w-0">
          <router-link class="flex items-center gap-2 shrink-0" :title="$t('nav.home')" to="/">
            <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
          </router-link>
          <div v-if="title" class="min-w-0">
            <h1 class="text-lg font-bold text-gray-900 dark:text-white truncate">{{ title }}</h1>
            <p v-if="subtitle" class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ subtitle }}</p>
          </div>
        </div>

        <!-- Section navigation -->
        <nav class="flex items-center gap-0.5">
          <router-link
              v-for="item in NAV"
              :key="item.to"
              :aria-label="item.label"
              :class="isActive(item.to)
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
              :title="item.label"
              :to="item.to"
              class="p-2 rounded-lg transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-for="(d, i) in item.paths" :key="i" :d="d" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </router-link>
        </nav>

        <!-- Page-specific actions -->
        <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
          <slot name="actions"/>
        </div>
      </div>
    </div>
  </header>
</template>
