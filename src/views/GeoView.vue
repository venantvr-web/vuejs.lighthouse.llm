<script setup>
import {computed, onMounted, ref} from 'vue'
import {useGeoStore} from '@/stores/geoStore'
import {useGeoHistoryStore} from '@/stores/geoHistoryStore'
import {useSiteStore} from '@/stores/siteStore'
import {usePersistentRef} from '@/composables/usePersistentRef'
import {useSettingsStore} from '@/stores/settingsStore'
import {useGeoTracking} from '@/composables/useGeoTracking'
import {useNotifications} from '@/composables/useNotifications'
import GeoCard from '@/components/geo/GeoCard.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import {buildGeoCsv, buildGeoMarkdown} from '@/utils/exporters'
import {downloadText} from '@/utils/download'
import {formatDateISO} from '@/utils/formatters'

const geoStore = useGeoStore()
const geoHistory = useGeoHistoryStore()
const settings = useSettingsStore()
const site = useSiteStore()
const {statsById, runningById, errorById, loadStats, loadItemStats, runPrompt} = useGeoTracking()
const {permission: notificationPermission, requestPermission, notify, isSupported: notificationsSupported} = useNotifications()

// Add form state
const newPrompt = ref('')
// Suggestion de marque dérivée du domaine du site actif (modifiable)
const newBrand = ref(site.brandGuess)
const newCompetitors = ref('')
const addError = ref('')

const runningAll = ref(false)
const showKeyEditor = ref(false)
const selectedProviderIds = ref([])
const advancedAnalysis = usePersistentRef('geo.advancedAnalysis', true)

const items = computed(() => geoStore.sortedItems)
const readyProviders = computed(() => settings.geoProviders.filter(p => p.ready))
const keyProviders = computed(() => settings.geoProviders.filter(p => p.id !== 'ollama'))

// Providers actually queried = ready AND selected
const activeProviders = computed(() => readyProviders.value.filter(p => selectedProviderIds.value.includes(p.id)))

const summary = computed(() => {
  const stats = Object.values(statsById.value)
  const withRuns = stats.filter(s => s.providers?.length)

  const sovValues = withRuns.map(s => s.avgShareOfVoice).filter(v => typeof v === 'number')
  const avgSov = sovValues.length ? Math.round(sovValues.reduce((a, b) => a + b, 0) / sovValues.length) : null
  const absent = withRuns.filter(s => s.enginesCited === 0).length

  return {
    total: geoStore.count,
    avgSov,
    absent,
    neverRun: stats.filter(s => !s.providers?.length).length
  }
})

function toggleProvider(id) {
  selectedProviderIds.value = selectedProviderIds.value.includes(id)
      ? selectedProviderIds.value.filter(p => p !== id)
      : [...selectedProviderIds.value, id]
}

function onKeyInput(provider, event) {
  settings.setProviderKey(provider, event.target.value.trim())
}

onMounted(async () => {
  await geoHistory.initialize()
  await loadStats(items.value)
  // Select every ready provider by default
  selectedProviderIds.value = readyProviders.value.map(p => p.id)
})

async function handleAdd() {
  addError.value = ''
  if (!newPrompt.value.trim() || !newBrand.value.trim()) {
    addError.value = 'Le prompt et la marque sont requis.'
    return
  }
  const item = geoStore.addItem({prompt: newPrompt.value, brand: newBrand.value, competitors: newCompetitors.value})
  if (!item) {
    addError.value = 'Entrée invalide.'
    return
  }
  newPrompt.value = ''
  newBrand.value = site.brandGuess
  newCompetitors.value = ''
  await loadItemStats(item)
}

function handleRemove(item) {
  if (confirm('Retirer ce prompt suivi ?')) {
    geoStore.removeItem(item.id)
    geoHistory.deleteRunsForPrompt(item.id)
  }
}

async function handleRun(item) {
  const result = await runPrompt(item, activeProviders.value, {advancedAnalysis: advancedAnalysis.value})
  if (result.success && result.changes.length && notificationPermission.value === 'granted') {
    notify(`GEO — ${item.brand}`, {body: result.changes.join('\n'), tag: `geo-${item.id}`})
  }
}

function exportCsv() {
  downloadText(`geo-${formatDateISO()}.csv`, buildGeoCsv(items.value, statsById.value), 'text/csv;charset=utf-8')
}

function exportMarkdown() {
  downloadText(`geo-${formatDateISO()}.md`, buildGeoMarkdown(items.value, statsById.value), 'text/markdown;charset=utf-8')
}

async function handleRunAll() {
  runningAll.value = true
  try {
    for (const item of items.value) {
      await handleRun(item)
    }
  } finally {
    runningAll.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <AppHeader subtitle="Visibilité de votre marque dans les réponses des moteurs IA" title="GEO Tracking">
      <template #actions>
        <button
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            @click="showKeyEditor = !showKeyEditor"
        >
          Clés API
        </button>
        <button
            v-if="notificationsSupported && notificationPermission !== 'granted'"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            @click="requestPermission"
        >
          Activer les alertes
        </button>
        <button
            v-if="!geoStore.isEmpty"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            title="Exporter le comparatif en CSV"
            @click="exportCsv"
        >
          CSV
        </button>
        <button
            v-if="!geoStore.isEmpty"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            title="Exporter le comparatif en Markdown"
            @click="exportMarkdown"
        >
          MD
        </button>
        <button
            v-if="!geoStore.isEmpty"
            :disabled="runningAll || !activeProviders.length"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            @click="handleRunAll"
        >
          <svg
              :class="{ 'animate-spin': runningAll }"
              class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
          {{ runningAll ? 'Analyse en cours…' : 'Tout exécuter' }}
        </button>
      </template>
    </AppHeader>

    <main class="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
      <!-- Key editor -->
      <div v-if="showKeyEditor" class="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">Clés API par moteur</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Stockées localement dans votre navigateur. Renseignez les moteurs que vous voulez interroger.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label v-for="p in keyProviders" :key="p.id" class="text-xs text-gray-600 dark:text-gray-300">
            <span class="block mb-1 font-medium">{{ p.label }} <span class="text-gray-400">({{ p.model }})</span></span>
            <input
                :value="settings.providerKeys[p.id]"
                class="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="clé API…"
                type="password"
                @input="onKeyInput(p.id, $event)"
            />
          </label>
        </div>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">Ollama se configure dans les Paramètres.</p>
      </div>

      <!-- No provider ready -->
      <div
          v-if="!readyProviders.length"
          class="mb-6 p-4 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-800 dark:text-amber-200"
      >
        Aucun moteur configuré. Cliquez sur <strong>Clés API</strong> pour renseigner au moins une clé (OpenAI, Claude ou Gemini).
      </div>

      <!-- Provider selection -->
      <div v-else class="flex flex-wrap items-center gap-2 mb-6">
        <span class="text-xs text-gray-500 dark:text-gray-400">Moteurs :</span>
        <button
            v-for="p in readyProviders"
            :key="p.id"
            :class="selectedProviderIds.includes(p.id)
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'"
            class="px-3 py-1 rounded-full border text-xs font-medium transition-colors"
            @click="toggleProvider(p.id)"
        >
          {{ p.label }}
        </button>
        <label class="ml-auto flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer" title="Un appel LLM supplémentaire par moteur : concurrents cités + sentiment de la mention">
          <input v-model="advancedAnalysis" class="rounded" type="checkbox"/>
          Analyse avancée (concurrents + sentiment)
        </label>
      </div>

      <!-- Add form -->
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
        <div class="flex flex-col gap-3">
          <input
              v-model="newPrompt"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Prompt à suivre (ex. : Quels sont les meilleurs outils d'audit SEO ?)"
              type="text"
              @keyup.enter="handleAdd"
          />
          <div class="flex flex-col md:flex-row gap-3">
            <input
                v-model="newBrand"
                class="md:w-56 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Votre marque"
                type="text"
                @keyup.enter="handleAdd"
            />
            <input
                v-model="newCompetitors"
                class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Concurrents (séparés par des virgules)"
                type="text"
                @keyup.enter="handleAdd"
            />
            <button
                class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
                @click="handleAdd"
            >
              Ajouter
            </button>
          </div>
        </div>
        <p v-if="addError" class="mt-2 text-sm text-red-500">{{ addError }}</p>
      </div>

      <!-- Summary -->
      <div v-if="!geoStore.isEmpty" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Prompts suivis</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ summary.total }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Part de voix moy.</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {{ summary.avgSov !== null ? summary.avgSov + '%' : '—' }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Marque absente partout</p>
          <p :class="summary.absent > 0 ? 'text-red-500' : 'text-emerald-500'" class="text-2xl font-bold mt-1">
            {{ summary.absent }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Jamais exécuté</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ summary.neverRun }}</p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="geoStore.isEmpty" class="text-center py-20">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aucun prompt suivi</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Ajoutez des prompts représentatifs des recherches de vos clients, indiquez votre
          marque et vos concurrents, puis comparez votre visibilité selon les moteurs IA.
        </p>
      </div>

      <!-- Cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <GeoCard
            v-for="item in items"
            :key="item.id"
            :error="errorById[item.id]"
            :item="item"
            :running="!!runningById[item.id]"
            :stats="statsById[item.id] || null"
            @remove="handleRemove(item)"
            @run="handleRun(item)"
        />
      </div>
    </main>
  </div>
</template>
