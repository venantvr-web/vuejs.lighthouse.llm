<script setup>
import {computed, ref} from 'vue'
import {useResourceCheck} from '@/composables/useResourceCheck'
import {useSitemapCrawl} from '@/composables/useSitemapCrawl'

const {checking, error, origin, resources, sitemaps, check} = useResourceCheck()
const {crawling, error: crawlError, progress, pages, crawl} = useSitemapCrawl()

const url = ref('')
const crawledSitemap = ref('')

const brokenPages = computed(() => pages.value.filter(p => !p.ok))

function handleCheck() {
  crawledSitemap.value = ''
  check(url.value)
}

function handleCrawl(sitemapUrl) {
  crawledSitemap.value = sitemapUrl
  crawl(sitemapUrl)
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="border-b border-gray-200 dark:border-gray-800">
      <div class="max-w-5xl mx-auto px-4 py-6">
        <div class="flex items-center gap-3">
          <router-link
              class="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Accueil"
              to="/"
          >
            <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </router-link>
          <div>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">Ressources SEO/GEO</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Disponibilité de robots.txt, sitemaps, llms.txt…
            </p>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
      <!-- Local server notice -->
      <div class="mb-6 p-3 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-800 dark:text-amber-200">
        Ces vérifications passent par le serveur local (port 3001) pour contourner le CORS.
        Lancez <code>npm run server</code> si ce n'est pas déjà fait.
      </div>

      <!-- Input -->
      <div class="flex flex-col md:flex-row gap-3 mb-6">
        <input
            v-model="url"
            class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="https://exemple.com"
            type="url"
            @keyup.enter="handleCheck"
        />
        <button
            :disabled="checking || !url"
            class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            @click="handleCheck"
        >
          {{ checking ? 'Vérification…' : 'Vérifier' }}
        </button>
      </div>

      <p v-if="error" class="text-sm text-red-500 mb-4">{{ error }}</p>

      <!-- Resources -->
      <div v-if="resources.length" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-6">
        <div class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{{ origin }}</div>
        <table class="w-full text-sm">
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
          <tr v-for="r in resources" :key="r.key">
            <td class="px-4 py-2 font-medium text-gray-900 dark:text-white">{{ r.label }}</td>
            <td class="px-4 py-2">
              <span
                  :class="r.available ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'"
                  class="px-2 py-0.5 rounded text-[10px] font-medium"
              >
                {{ r.available ? 'Disponible' : 'Absent' }}
              </span>
            </td>
            <td class="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-400">
              {{ r.status ? 'HTTP ' + r.status : (r.error || '—') }}
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- Sitemaps -->
      <div v-if="sitemaps.length" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div class="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
          Sitemaps détectés
        </div>
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
          <tr>
            <th class="text-left font-medium px-4 py-2">URL</th>
            <th class="text-left font-medium px-4 py-2">Type</th>
            <th class="text-right font-medium px-4 py-2">Entrées</th>
            <th class="px-4 py-2"></th>
          </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
          <tr v-for="s in sitemaps" :key="s.url">
            <td class="px-4 py-2 text-gray-900 dark:text-white truncate max-w-md" :title="s.url">{{ s.url }}</td>
            <td class="px-4 py-2 text-gray-600 dark:text-gray-300">
              {{ s.available ? (s.type === 'index' ? 'Index' : s.type === 'urlset' ? 'URLs' : '—') : 'Absent' }}
            </td>
            <td class="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{{ s.available ? s.count : '—' }}</td>
            <td class="px-4 py-2 text-right">
              <button
                  v-if="s.available"
                  :disabled="crawling"
                  class="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors disabled:opacity-50"
                  @click="handleCrawl(s.url)"
              >
                {{ crawling && crawledSitemap === s.url ? 'Crawl…' : 'Crawler' }}
              </button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- Crawl results -->
      <div v-if="crawledSitemap" class="mt-6">
        <p v-if="crawlError" class="text-sm text-red-500 mb-2">{{ crawlError }}</p>

        <div v-if="crawling" class="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Vérification {{ progress.done }} / {{ progress.total }} URL…
        </div>

        <template v-else-if="pages.length">
          <div class="grid grid-cols-3 gap-4 mb-4">
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">URL vérifiées</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ pages.length }}</p>
            </div>
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">OK</p>
              <p class="text-2xl font-bold text-emerald-500 mt-1">{{ pages.length - brokenPages.length }}</p>
            </div>
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cassées (404…)</p>
              <p :class="brokenPages.length > 0 ? 'text-red-500' : 'text-emerald-500'" class="text-2xl font-bold mt-1">{{ brokenPages.length }}</p>
            </div>
          </div>

          <div v-if="brokenPages.length" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div class="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              URL cassées
            </div>
            <table class="w-full text-sm">
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="p in brokenPages" :key="p.url">
                <td class="px-4 py-2 text-gray-900 dark:text-white truncate max-w-lg" :title="p.url">{{ p.url }}</td>
                <td class="px-4 py-2 text-right">
                  <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                    {{ p.status || 'Erreur' }}
                  </span>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-sm text-emerald-600 dark:text-emerald-400">Aucune URL cassée détectée 🎉</p>
        </template>
      </div>
    </main>
  </div>
</template>
