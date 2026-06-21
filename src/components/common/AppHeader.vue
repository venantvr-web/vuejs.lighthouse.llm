<script setup>
import {computed, ref, watch} from 'vue'
import {useRoute} from 'vue-router'
import {useI18n} from '@/i18n'
import {useSiteStore, entityKey} from '@/stores/siteStore'
import {canonicalUrl} from '@/utils/url'

const {t, locale, setLocale, SUPPORTED_LOCALES} = useI18n()
const site = useSiteStore()

// Entité active (marque + domaine + secteur indissociables) : un seul sélecteur
// commute le tuple complet.
const activeEntityModel = computed({
  get: () => site.activeKey,
  set: (key) => site.setActiveEntity(key)
})
const keyOf = entityKey

// Infobulle de la marque enrichie du secteur d'activité (contexte de l'analyse IA)
const brandTitle = computed(() => site.activeSector
    ? `${t('nav.activeBrand')} · ${site.activeSector}`
    : t('nav.activeBrand'))

// Secteur d'activité de l'entité active, éditable depuis le menu mobile
const activeSectorModel = computed({
  get: () => site.activeSector,
  set: (v) => {
    site.activeSector = v
  }
})

// Changer de langue recharge la page : la nouvelle locale (persistée) s'applique
// partout, y compris aux libellés évalués une seule fois au montage.
function switchLocale(next) {
  if (next === locale.value) return
  setLocale(next)
  window.location.reload()
}

defineProps({
  title: {type: String, default: ''},
  subtitle: {type: String, default: ''}
})

const route = useRoute()
const menuOpen = ref(false)
// Referme le menu mobile à chaque changement de page
watch(() => route.path, () => {
  menuOpen.value = false
})

// Single source of truth for the main section navigation
const NAV = [
  {to: '/briefing', label: t('nav.briefing'), paths: ['M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36l-.7-.7M6.34 6.34l-.7-.7m12.72 0l-.7.7M6.34 17.66l-.7.7M16 12a4 4 0 11-8 0 4 4 0 018 0z']},
  {to: '/watchlist', label: t('nav.watchlist'), paths: ['M15 12a3 3 0 11-6 0 3 3 0 016 0z', 'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z']},
  {to: '/geo', label: t('nav.geo'), paths: ['M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z']},
  {to: '/search-console', label: t('nav.searchConsole'), paths: ['M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z']},
  {to: '/resources', label: t('nav.resources'), paths: ['M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z']},
  {to: '/llm-studio', label: t('nav.llmStudio'), paths: ['M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z']},
  {to: '/history', label: t('nav.history'), paths: ['M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z']},
  {to: '/settings', label: t('nav.settings'), paths: ['M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z']}
]

function isActive(to) {
  return route.path === to || route.path.startsWith(to + '/')
}

const activeClass = 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
const inactiveClass = 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
</script>

<template>
  <header class="border-b border-gray-200 dark:border-gray-800">
    <div class="max-w-6xl mx-auto px-4 py-3">
      <div class="flex items-center justify-between gap-3">
        <!-- Brand + page title -->
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <router-link :title="$t('nav.home')" class="flex items-center gap-2 shrink-0" to="/">
            <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
          </router-link>
          <div v-if="title" class="min-w-0">
            <h1 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{{ title }}</h1>
            <p v-if="subtitle" class="hidden sm:block text-xs text-gray-500 dark:text-gray-400 truncate">{{ subtitle }}</p>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <!-- Marque active -->
          <div
              v-if="site.activeBrand"
              :title="brandTitle"
              class="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
          >
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            <select v-if="site.entities.length > 1" v-model="activeEntityModel" class="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer max-w-[12rem] truncate">
              <option v-for="e in site.entities" :key="keyOf(e)" :value="keyOf(e)">{{ e.brand }} · {{ e.domain }}</option>
            </select>
            <span v-else class="text-xs font-semibold">{{ site.activeBrand }}</span>
          </div>

          <!-- Domaine actif (suit l'entité active) -->
          <div
              v-if="site.activeDomain"
              :title="$t('nav.activeDomain')"
              class="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          >
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            <span class="text-xs font-medium max-w-[10rem] truncate">{{ canonicalUrl(site.activeDomain) }}</span>
          </div>

          <!-- Section navigation (desktop) -->
          <nav class="hidden md:flex items-center gap-0.5">
            <router-link
                v-for="item in NAV"
                :key="item.to"
                :aria-label="item.label"
                :class="isActive(item.to) ? activeClass : inactiveClass"
                :title="item.label"
                :to="item.to"
                class="p-2 rounded-lg transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-for="(d, i) in item.paths" :key="i" :d="d" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </router-link>
          </nav>

          <!-- Language selector -->
          <div class="flex items-center gap-0.5 shrink-0 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
            <button
                v-for="l in SUPPORTED_LOCALES"
                :key="l"
                :aria-label="`Langue : ${l}`"
                :class="locale === l ? activeClass : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'"
                class="px-1.5 py-0.5 rounded-md text-[11px] font-semibold uppercase transition-colors"
                type="button"
                @click="switchLocale(l)"
            >
              {{ l }}
            </button>
          </div>

          <!-- Page-specific actions (desktop) -->
          <div v-if="$slots.actions" class="hidden md:flex items-center gap-2">
            <slot name="actions"/>
          </div>

          <!-- Burger (mobile) -->
          <button
              aria-label="Menu"
              class="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              type="button"
              @click="menuOpen = !menuOpen"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!menuOpen" d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              <path v-else d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-if="menuOpen" class="md:hidden mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
        <label v-if="site.entities.length" class="block mb-2">
          <span class="block mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('nav.activeSite') }} :</span>
          <select
              v-if="site.entities.length > 1"
              v-model="activeEntityModel"
              class="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          >
            <option v-for="e in site.entities" :key="keyOf(e)" :value="keyOf(e)">{{ e.brand }} · {{ canonicalUrl(e.domain) }}</option>
          </select>
          <span v-else class="block text-sm font-semibold text-primary-600 dark:text-primary-400">
            {{ site.activeBrand }} · {{ canonicalUrl(site.activeDomain) }}
          </span>
        </label>
        <label v-if="site.activeBrand" class="block mb-3">
          <span class="block mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('nav.activeSector') }} :</span>
          <input
              v-model="activeSectorModel"
              class="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              :placeholder="$t('nav.activeSectorPlaceholder')"
              type="text"
          />
        </label>
        <nav class="grid grid-cols-2 gap-1">
          <router-link
              v-for="item in NAV"
              :key="item.to"
              :class="isActive(item.to) ? activeClass : inactiveClass"
              :to="item.to"
              class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium"
          >
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-for="(d, i) in item.paths" :key="i" :d="d" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            {{ item.label }}
          </router-link>
        </nav>
        <div v-if="$slots.actions" class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex flex-wrap gap-2">
          <slot name="actions"/>
        </div>
      </div>
    </div>
  </header>
</template>
