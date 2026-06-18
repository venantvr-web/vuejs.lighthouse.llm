<script setup>
import {computed, onMounted} from 'vue'
import {useMorningBriefing} from '@/composables/useMorningBriefing'
import {originFromUrl} from '@/services/resourceCheck'
import {buildBriefingMarkdown} from '@/utils/exporters'
import {downloadText} from '@/utils/download'
import {formatDateISO, formatRelativeTime, formatScore, getScoreColorClass} from '@/utils/formatters'

const {
  items, geoItems, watchStats, resourceByOrigin, digest, running, progress, lastRunAt,
  includeGeo, geoAvailable, load, runChecks
} = useMorningBriefing()

onMounted(load)

function exportReport() {
  const md = buildBriefingMarkdown({
    date: Date.now(),
    overview: overview.value,
    digest: digest.value,
    items: items.value,
    watchStats: watchStats.value
  })
  downloadText(`briefing-${formatDateISO()}.md`, md, 'text/markdown;charset=utf-8')
}

const isEmpty = computed(() => items.value.length === 0 && geoItems.value.length === 0)

function readinessFor(item) {
  return resourceByOrigin.value[originFromUrl(item.url)]?.latest?.readiness ?? null
}

function perfDelta(item) {
  const d = watchStats.value[item.id]?.deltas?.performance
  return typeof d === 'number' ? Math.round(d * 100) : null
}

const overview = computed(() => {
  const stats = items.value.map(i => watchStats.value[i.id]).filter(s => s?.latest)
  const perf = stats.map(s => s.latest.scores?.performance).filter(v => typeof v === 'number')
  const avgPerf = perf.length ? perf.reduce((a, b) => a + b, 0) / perf.length : null

  const readinessVals = Object.values(resourceByOrigin.value).map(s => s.latest?.readiness).filter(v => typeof v === 'number')
  const avgReadiness = readinessVals.length ? Math.round(readinessVals.reduce((a, b) => a + b, 0) / readinessVals.length) : null

  return {
    sites: items.value.length,
    avgPerf,
    toHandle: digest.value.length,
    avgReadiness
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="border-b border-gray-200 dark:border-gray-800">
      <div class="max-w-6xl mx-auto px-4 py-6">
        <div class="flex items-center justify-between gap-3">
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
              <h1 class="text-xl font-bold text-gray-900 dark:text-white">Briefing du matin</h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                <template v-if="lastRunAt">Derniers contrôles {{ formatRelativeTime(lastRunAt) }}</template>
                <template v-else>Tout ce qui a bougé, en un coup d'œil</template>
              </p>
            </div>
          </div>
          <div v-if="!isEmpty" class="flex items-center gap-3">
            <label
                v-if="geoAvailable"
                class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer"
                title="Relance aussi le GEO (appels LLM facturés)"
            >
              <input v-model="includeGeo" class="rounded" type="checkbox"/>
              Inclure GEO
            </label>
            <button
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
                title="Exporter le rapport (Markdown)"
                @click="exportReport"
            >
              Rapport
            </button>
            <button
                :disabled="running"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                @click="runChecks"
            >
              <svg
                  :class="{ 'animate-spin': running }"
                  class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              {{ running ? `Contrôles… ${progress.done}/${progress.total}` : 'Lancer les contrôles du matin' }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
      <!-- Empty state -->
      <div v-if="isEmpty" class="text-center py-20">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Rien à suivre pour l'instant</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Ajoutez des URLs à la
          <router-link class="text-primary-500 hover:underline" to="/watchlist">Watchlist</router-link>
          et des prompts au
          <router-link class="text-primary-500 hover:underline" to="/geo">GEO Tracking</router-link>
          pour composer votre briefing quotidien.
        </p>
      </div>

      <template v-else>
        <!-- Overview tiles -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sites suivis</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ overview.sites }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Perf. moyenne</p>
            <p :class="getScoreColorClass(overview.avgPerf)" class="text-2xl font-bold mt-1">{{ formatScore(overview.avgPerf) }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">À traiter</p>
            <p :class="overview.toHandle > 0 ? 'text-red-500' : 'text-emerald-500'" class="text-2xl font-bold mt-1">{{ overview.toHandle }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">GEO-readiness moy.</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ overview.avgReadiness !== null ? overview.avgReadiness : '—' }}</p>
          </div>
        </div>

        <!-- To handle today -->
        <section class="mb-8">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">À traiter aujourd'hui</h2>
          <div v-if="!digest.length" class="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4">
            Rien à signaler 🎉
          </div>
          <ul v-else class="space-y-2">
            <li
                v-for="(alert, i) in digest"
                :key="i"
                class="flex items-center gap-3 bg-white dark:bg-gray-800 border rounded-xl px-4 py-3"
                :class="alert.level === 'critical' ? 'border-red-300 dark:border-red-500/40' : 'border-amber-300 dark:border-amber-500/40'"
            >
              <span
                  :class="alert.level === 'critical' ? 'bg-red-500' : 'bg-amber-500'"
                  class="w-2 h-2 rounded-full shrink-0"
              />
              <span class="text-sm text-gray-700 dark:text-gray-200">{{ alert.message }}</span>
              <span class="ml-auto text-xs text-gray-400 dark:text-gray-500 truncate max-w-[40%]">{{ alert.site }}</span>
            </li>
          </ul>
        </section>

        <!-- Per-site overview -->
        <section v-if="items.length">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sites</h2>
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th class="text-left font-medium px-4 py-2">Page</th>
                <th class="text-right font-medium px-4 py-2">Perf.</th>
                <th class="text-right font-medium px-4 py-2">Δ</th>
                <th class="text-right font-medium px-4 py-2">Readiness</th>
                <th class="text-right font-medium px-4 py-2">Vérifié</th>
              </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="item in items" :key="item.id">
                <td class="px-4 py-2 text-gray-900 dark:text-white truncate max-w-xs" :title="item.url">{{ item.label }}</td>
                <td :class="getScoreColorClass(watchStats[item.id]?.latest?.scores?.performance)" class="px-4 py-2 text-right font-semibold">
                  {{ formatScore(watchStats[item.id]?.latest?.scores?.performance) }}
                </td>
                <td class="px-4 py-2 text-right">
                  <span
                      v-if="perfDelta(item) !== null && perfDelta(item) !== 0"
                      :class="perfDelta(item) > 0 ? 'text-emerald-500' : 'text-red-500'"
                  >{{ perfDelta(item) > 0 ? '+' : '' }}{{ perfDelta(item) }}</span>
                  <span v-else class="text-gray-400">—</span>
                </td>
                <td class="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{{ readinessFor(item) ?? '—' }}</td>
                <td class="px-4 py-2 text-right text-xs text-gray-400 dark:text-gray-500">
                  {{ watchStats[item.id]?.lastCheckedAt ? formatRelativeTime(watchStats[item.id].lastCheckedAt) : '—' }}
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
