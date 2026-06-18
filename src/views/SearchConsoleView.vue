<script setup>
import {computed, ref} from 'vue'
import {useSettingsStore} from '@/stores/settingsStore'
import {snapshotSeries, summarizeRows, useSearchConsole} from '@/composables/useSearchConsole'
import {useSearchConsoleHistoryStore} from '@/stores/searchConsoleHistoryStore'
import {useSiteStore} from '@/stores/siteStore'
import {extractDomain} from '@/utils/url'
import {usePersistentRef} from '@/composables/usePersistentRef'
import {formatNumber} from '@/utils/formatters'
import Sparkline from '@/components/common/Sparkline.vue'
import AppHeader from '@/components/common/AppHeader.vue'

const settings = useSettingsStore()
const history = useSearchConsoleHistoryStore()
const site = useSiteStore()
const {connected, loading, error, sites, connect, disconnect, query} = useSearchConsole()

// Nom d'hôte d'une propriété Search Console ("https://ex.com/" ou "sc-domain:ex.com")
function siteHost(s) {
  if (!s) return ''
  return s.startsWith('sc-domain:') ? s.slice('sc-domain:'.length) : extractDomain(s)
}

const selectedSite = ref('')
const days = usePersistentRef('searchconsole.days', 28)
const dimension = usePersistentRef('searchconsole.dimension', 'query')
const rows = ref([])
const clicksTrend = ref([])

const summary = computed(() => summarizeRows(rows.value))

function onClientIdInput(event) {
  settings.setSearchConsoleClientId(event.target.value)
}

async function handleConnect() {
  await connect(settings.searchConsoleClientId)
  if (sites.value.length && !selectedSite.value) {
    // Présélectionne la propriété qui correspond au site actif, sinon la première
    const match = site.domain ? sites.value.find(s => siteHost(s) === site.domain) : null
    selectedSite.value = match || sites.value[0]
  }
}

async function handleQuery() {
  if (!selectedSite.value) return
  // Mémorise le domaine de la propriété interrogée pour les autres écrans
  const host = siteHost(selectedSite.value)
  if (host) site.setFromUrl(`https://${host}`)
  rows.value = await query(selectedSite.value, {days: days.value, dimensions: [dimension.value], rowLimit: 50})
  if (rows.value.length) {
    const s = summarizeRows(rows.value)
    await history.addSnapshot({
      site: selectedSite.value,
      days: days.value,
      dimension: dimension.value,
      clicks: s.clicks,
      impressions: s.impressions,
      ctr: s.ctr,
      position: s.position
    })
    await loadTrend()
  }
}

async function loadTrend() {
  const snapshots = await history.getSnapshots(selectedSite.value)
  clicksTrend.value = snapshotSeries(snapshots, 'clicks')
}

function formatPercent(ctr) {
  return `${(ctr * 100).toFixed(1)}%`
}

function formatPosition(p) {
  return p ? p.toFixed(1) : '—'
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <AppHeader subtitle="Données de recherche réelles (requêtes, clics, impressions, position)" title="Search Console"/>

    <main class="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
      <!-- Connection -->
      <div v-if="!connected" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
        <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">Connexion à Google Search Console</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Renseignez un <strong>Client ID OAuth 2.0</strong> (type « Application Web ») dont l'origine autorisée
          est celle de ce site. L'API Search Console doit être activée. Le jeton d'accès reste en mémoire,
          rien n'est stocké côté serveur.
        </p>
        <div class="flex flex-col md:flex-row gap-3">
          <input
              :value="settings.searchConsoleClientId"
              class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="xxxxxxxx.apps.googleusercontent.com"
              type="text"
              @input="onClientIdInput"
          />
          <button
              :disabled="loading || !settings.searchConsoleClientId"
              class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              @click="handleConnect"
          >
            {{ loading ? 'Connexion…' : 'Se connecter' }}
          </button>
        </div>
        <p v-if="error" class="mt-2 text-sm text-red-500">{{ error }}</p>
      </div>

      <!-- Connected controls -->
      <template v-else>
        <div class="flex flex-wrap items-end gap-3 mb-6">
          <label class="text-xs text-gray-600 dark:text-gray-300">
            <span class="block mb-1">Site</span>
            <select v-model="selectedSite" class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
              <option v-for="site in sites" :key="site" :value="site">{{ site }}</option>
            </select>
          </label>
          <label class="text-xs text-gray-600 dark:text-gray-300">
            <span class="block mb-1">Période</span>
            <select v-model.number="days" class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
              <option :value="7">7 jours</option>
              <option :value="28">28 jours</option>
              <option :value="90">90 jours</option>
            </select>
          </label>
          <label class="text-xs text-gray-600 dark:text-gray-300">
            <span class="block mb-1">Dimension</span>
            <select v-model="dimension" class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
              <option value="query">Requêtes</option>
              <option value="page">Pages</option>
            </select>
          </label>
          <button
              :disabled="loading || !selectedSite"
              class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              @click="handleQuery"
          >
            {{ loading ? 'Chargement…' : 'Analyser' }}
          </button>
          <button class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm" @click="disconnect">
            Déconnexion
          </button>
        </div>

        <p v-if="error" class="text-sm text-red-500 mb-4">{{ error }}</p>

        <!-- Summary -->
        <div v-if="rows.length" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Clics</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ formatNumber(summary.clicks) }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Impressions</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ formatNumber(summary.impressions) }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">CTR moyen</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ formatPercent(summary.ctr) }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Position moy.</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ formatPosition(summary.position) }}</p>
          </div>
        </div>

        <!-- Clicks trend across saved snapshots -->
        <div v-if="clicksTrend.length > 1" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tendance des clics (analyses enregistrées)</p>
          <Sparkline :auto-scale="true" :values="clicksTrend" :width="320" color="#6366f1"/>
        </div>

        <!-- Rows table -->
        <div v-if="rows.length" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
            <tr>
              <th class="text-left font-medium px-4 py-2">{{ dimension === 'page' ? 'Page' : 'Requête' }}</th>
              <th class="text-right font-medium px-4 py-2">Clics</th>
              <th class="text-right font-medium px-4 py-2">Impr.</th>
              <th class="text-right font-medium px-4 py-2">CTR</th>
              <th class="text-right font-medium px-4 py-2">Position</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-for="row in rows" :key="row.key">
              <td class="px-4 py-2 text-gray-900 dark:text-white truncate max-w-xs" :title="row.key">{{ row.key }}</td>
              <td class="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{{ formatNumber(row.clicks) }}</td>
              <td class="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{{ formatNumber(row.impressions) }}</td>
              <td class="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{{ formatPercent(row.ctr) }}</td>
              <td class="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{{ formatPosition(row.position) }}</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="!loading" class="text-center py-16 text-sm text-gray-500 dark:text-gray-400">
          Choisissez un site et cliquez sur « Analyser ».
        </div>
      </template>
    </main>
  </div>
</template>
