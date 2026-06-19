<script setup>
import {computed, onMounted, ref} from 'vue'
import {useResourceCheck} from '@/composables/useResourceCheck'
import {useSitemapCrawl} from '@/composables/useSitemapCrawl'
import {computeGeoReadiness, detectResourceChanges} from '@/services/resourceCheck'
import {useResourceHistoryStore} from '@/stores/resourceHistoryStore'
import {useSiteStore} from '@/stores/siteStore'
import {useSettingsStore} from '@/stores/settingsStore'
import {useIndexabilityDiagnosis} from '@/composables/useIndexabilityDiagnosis'
import {buildIndexabilitySignals, detectInconsistencies} from '@/services/indexabilityDiagnosis'
import {useNotifications} from '@/composables/useNotifications'
import {snapshotSeries} from '@/composables/useSearchConsole'
import {buildBrokenUrlsCsv} from '@/utils/exporters'
import {downloadText} from '@/utils/download'
import {formatDateISO, getScoreColorClass} from '@/utils/formatters'
import Sparkline from '@/components/common/Sparkline.vue'
import StreamingOutput from '@/components/analysis/StreamingOutput.vue'
import AppHeader from '@/components/common/AppHeader.vue'

const {checking, error, origin, resources, sitemaps, jsonLd, pageMeta, check} = useResourceCheck()
const {crawling, error: crawlError, progress, pages, crawl} = useSitemapCrawl()
const history = useResourceHistoryStore()
const {permission: notificationPermission, requestPermission, notify, isSupported: notificationsSupported} = useNotifications()
const site = useSiteStore()
const settings = useSettingsStore()
const {
  diagnosing,
  diagnosis,
  error: diagError,
  tokenCount: diagTokens,
  truncated: diagTruncated,
  run: runDiagnosis,
  continueDiagnosis,
  cancel: cancelDiagnosis
} = useIndexabilityDiagnosis()

// Préremplissage silencieux à partir du site actif
const url = ref(site.origin)
const crawledSitemap = ref('')
const readinessTrend = ref([])

const brokenPages = computed(() => pages.value.filter(p => !p.ok))
const readiness = computed(() => computeGeoReadiness(resources.value, sitemaps.value, {jsonLd: jsonLd.value.present}))
const isNoindex = computed(() => /noindex/i.test([pageMeta.value.robots, pageMeta.value.googlebot, pageMeta.value.xRobotsTag].join(' ')))
const diagnosisState = computed(() => ({
  origin: origin.value,
  resources: resources.value,
  sitemaps: sitemaps.value,
  jsonLd: jsonLd.value,
  readiness: readiness.value,
  brokenPages: brokenPages.value,
  pageMeta: pageMeta.value
}))
const inconsistencies = computed(() => detectInconsistencies(buildIndexabilitySignals(diagnosisState.value)))
const inconsistencyClass = {
  critique: 'text-red-600 dark:text-red-400',
  attention: 'text-amber-600 dark:text-amber-400',
  info: 'text-gray-500 dark:text-gray-400'
}

onMounted(() => history.initialize())

async function saveSnapshotAndAlert(snapshot) {
  const previous = (await history.getSnapshots(snapshot.origin))[0] || null
  await history.addSnapshot(snapshot)
  const changes = detectResourceChanges(snapshot, previous)
  if (changes.length && notificationPermission.value === 'granted') {
    notify(`Ressources — ${snapshot.origin}`, {body: changes.join('\n'), tag: `resources-${snapshot.origin}`})
  }
  readinessTrend.value = snapshotSeries(await history.getSnapshots(snapshot.origin), 'readiness')
}

async function handleCheck() {
  // Mémorise le domaine pour les autres écrans
  site.setFromUrl(url.value)
  crawledSitemap.value = ''
  readinessTrend.value = []
  await check(url.value)
  if (!origin.value) return
  await saveSnapshotAndAlert({origin: origin.value, readiness: readiness.value.score, brokenCount: null})
}

async function handleCrawl(sitemapUrl) {
  crawledSitemap.value = sitemapUrl
  await crawl(sitemapUrl)
  if (origin.value) {
    await saveSnapshotAndAlert({origin: origin.value, readiness: readiness.value.score, brokenCount: brokenPages.value.length})
  }
}

function exportBrokenCsv() {
  downloadText(`urls-cassees-${formatDateISO()}.csv`, buildBrokenUrlsCsv(pages.value), 'text/csv;charset=utf-8')
}

function handleDiagnose() {
  runDiagnosis(diagnosisState.value)
}

function exportDiagnosis() {
  downloadText(`indexabilite-${formatDateISO()}.md`, diagnosis.value, 'text/markdown;charset=utf-8')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <AppHeader subtitle="Disponibilité de robots.txt, sitemaps, llms.txt…" title="Ressources SEO/GEO">
      <template #actions>
        <button
            v-if="notificationsSupported && notificationPermission !== 'granted'"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            title="Être alerté en cas de baisse du score ou de nouvelles URL cassées"
            @click="requestPermission"
        >
          Activer les alertes
        </button>
      </template>
    </AppHeader>

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

      <!-- GEO-readiness score -->
      <div v-if="resources.length" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
        <div class="flex items-center gap-4">
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Score GEO-readiness</p>
            <p :class="getScoreColorClass(readiness.score / 100)" class="text-4xl font-bold leading-tight">{{ readiness.score }}</p>
            <Sparkline v-if="readinessTrend.length > 1" :values="readinessTrend" :width="120" class="mt-1" color="#6366f1"/>
          </div>
          <ul class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            <li v-for="s in readiness.signals" :key="s.label" class="flex items-center gap-2 text-sm">
              <span :class="s.ok ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'">{{ s.ok ? '✓' : '○' }}</span>
              <span :class="s.ok ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'">{{ s.label }}</span>
            </li>
          </ul>
        </div>
        <!-- Detected JSON-LD types -->
        <div v-if="jsonLd.types.length" class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Types JSON-LD détectés (accueil)</p>
          <div class="flex flex-wrap gap-1">
            <span
                v-for="t in jsonLd.types"
                :key="t"
                class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
            >{{ t }}</span>
          </div>
          <!-- Validation issues -->
          <ul v-if="jsonLd.issues.length" class="mt-2 space-y-0.5">
            <li v-for="(issue, i) in jsonLd.issues" :key="i" class="text-[11px] text-amber-600 dark:text-amber-400">
              {{ issue.type }} : champ(s) manquant(s) — {{ issue.missing.join(', ') }}
            </li>
          </ul>
        </div>
        <!-- Indexing directives (homepage) -->
        <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Directives d'indexation (accueil)</p>
          <ul class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 text-[11px]">
            <li><span class="text-gray-400 dark:text-gray-500">meta robots :</span> <span class="text-gray-700 dark:text-gray-300">{{ pageMeta.robots || '—' }}</span></li>
            <li><span class="text-gray-400 dark:text-gray-500">X-Robots-Tag :</span> <span class="text-gray-700 dark:text-gray-300">{{ pageMeta.xRobotsTag || '—' }}</span></li>
            <li><span class="text-gray-400 dark:text-gray-500">meta googlebot :</span> <span class="text-gray-700 dark:text-gray-300">{{ pageMeta.googlebot || '—' }}</span></li>
            <li class="truncate" :title="pageMeta.canonical"><span class="text-gray-400 dark:text-gray-500">canonical :</span> <span class="text-gray-700 dark:text-gray-300">{{ pageMeta.canonical || '—' }}</span></li>
          </ul>
          <p v-if="isNoindex" class="mt-1.5 text-[11px] font-medium text-red-600 dark:text-red-400">⚠️ noindex détecté sur la page d'accueil</p>
        </div>
      </div>

      <!-- Diagnostic IA d'indexabilité -->
      <div v-if="resources.length" class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Diagnostic IA d'indexabilité</h2>
          <button
              v-if="!diagnosing"
              :disabled="!settings.isConfigured"
              :title="settings.isConfigured ? '' : 'Configurez un fournisseur LLM dans les paramètres'"
              class="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              @click="handleDiagnose"
          >
            {{ diagnosis ? 'Relancer le diagnostic' : 'Diagnostiquer avec l\'IA' }}
          </button>
        </div>
        <p v-if="!settings.isConfigured" class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Configurez un fournisseur LLM dans les
          <router-link class="text-primary-600 dark:text-primary-400 hover:underline" to="/settings">paramètres</router-link>
          pour activer le diagnostic.
        </p>

        <!-- Incohérences détectées automatiquement -->
        <div
            v-if="inconsistencies.length"
            class="mb-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
        >
          <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Incohérences détectées</p>
          <ul class="space-y-1">
            <li v-for="(item, i) in inconsistencies" :key="i" class="flex items-start gap-2 text-[13px]">
              <span :class="inconsistencyClass[item.level]" class="font-medium uppercase text-[10px] mt-0.5 shrink-0">{{ item.level }}</span>
              <span class="text-gray-700 dark:text-gray-300">{{ item.message }}</span>
            </li>
          </ul>
        </div>
        <p v-else-if="resources.length" class="mb-3 text-[13px] text-emerald-600 dark:text-emerald-400">
          Aucune incohérence évidente détectée. Lancez le diagnostic IA pour l'analyse qualitative détaillée.
        </p>
        <p v-if="diagError" class="text-sm text-red-500 mb-2">{{ diagError }}</p>
        <StreamingOutput
            v-if="diagnosis || diagnosing"
            :content="diagnosis"
            :is-streaming="diagnosing"
            :token-count="diagTokens"
            @cancel="cancelDiagnosis"
            @export="exportDiagnosis"
        />
        <div v-if="diagTruncated && !diagnosing" class="mt-2 flex items-center gap-3">
          <p class="text-xs text-amber-600 dark:text-amber-400">Réponse coupée par la limite de tokens.</p>
          <button
              class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors"
              @click="continueDiagnosis"
          >
            Continuer
          </button>
        </div>
      </div>

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
            <div class="px-4 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400">URL cassées</span>
              <button
                  class="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors"
                  @click="exportBrokenCsv"
              >
                Export CSV
              </button>
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
