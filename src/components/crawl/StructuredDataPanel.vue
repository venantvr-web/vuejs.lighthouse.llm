<script setup>
import {computed, onMounted, watch} from 'vue'
import {useStructuredData} from '@/composables/useStructuredData'
import {useSettingsStore} from '@/stores/settingsStore'
import {usePersistentRef} from '@/composables/usePersistentRef'
import {toScriptTag} from '@/services/structuredDataGen'
import {downloadText} from '@/utils/download'

const props = defineProps({
  urls: {type: Array, default: () => []}
})

const settings = useSettingsStore()
const {byUrl, analyzing, batch, analyzeAll, generate, generateAllMissing, hydrateFromHistory} = useStructuredData()

// Génération automatique du JSON-LD manquant à l'ouverture des résultats
const auto = usePersistentRef('structuredData.auto', true)

const urlList = computed(() => props.urls.map(u => (typeof u === 'string' ? u : u.url)).filter(Boolean))
const analyzed = computed(() => urlList.value.some(u => byUrl[u]?.status))
const hasRows = computed(() => urlList.value.some(u => byUrl[u]?.status || byUrl[u]?.generated || byUrl[u]?.error))
const missingCount = computed(() => urlList.value.filter(u => byUrl[u]?.status?.needsGeneration && !byUrl[u]?.generated).length)

function runAnalysis() {
  analyzeAll(urlList.value)
}

function runBatch() {
  generateAllMissing(urlList.value)
}

let autoRan = false

async function maybeAuto() {
  if (autoRan || !auto.value || !urlList.value.length || !settings.isConfigured) return
  autoRan = true
  await hydrateFromHistory(urlList.value)
  await generateAllMissing(urlList.value)
}

onMounted(async () => {
  if (urlList.value.length) await hydrateFromHistory(urlList.value)
  maybeAuto()
})

// La liste d'URL peut arriver après le montage (session chargée en asynchrone)
watch(urlList, async (list, prev) => {
  if (list.length && !prev.length) {
    await hydrateFromHistory(list)
    maybeAuto()
  }
})

function statusLabel(url) {
  const s = byUrl[url]?.status
  if (!s) return ''
  if (!s.present) return 'Manquant'
  if (s.issues.length) return 'Incomplet'
  return 'OK'
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // ignore
  }
}

function slug(url) {
  try {
    return new URL(url).pathname.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'accueil'
  } catch {
    return 'page'
  }
}

function download(url) {
  downloadText(`jsonld-${slug(url)}.html`, toScriptTag(byUrl[url].generated), 'text/html;charset=utf-8')
}
</script>

<template>
  <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Données structurées (JSON-LD)</h3>
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 mr-1">
          <input v-model="auto" class="rounded" type="checkbox"/>
          Génération auto
        </label>
        <button
            :disabled="analyzing || batch.running || !urlList.length"
            class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors disabled:opacity-50"
            @click="runAnalysis"
        >
          {{ analyzing ? 'Analyse…' : (analyzed ? 'Réanalyser' : 'Analyser') }}
        </button>
        <button
            :disabled="batch.running || analyzing || !urlList.length || !settings.isConfigured"
            class="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            @click="runBatch"
        >
          {{ batch.running ? `Génération ${batch.done}/${batch.total}…` : 'Générer tout le manquant' }}
        </button>
      </div>
    </div>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
      Détecte le JSON-LD manquant ou incomplet sur chaque page, puis génère le balisage avec l'IA.
      <span v-if="auto">La génération du manquant se lance automatiquement à l'ouverture des résultats.</span>
    </p>

    <p v-if="analyzed && missingCount" class="text-sm text-amber-600 dark:text-amber-400 mb-3">
      {{ missingCount }} page(s) avec données structurées manquantes ou incomplètes.
    </p>
    <p v-else-if="analyzed" class="text-sm text-emerald-600 dark:text-emerald-400 mb-3">
      Toutes les pages analysées disposent de données structurées valides 🎉
    </p>
    <p v-if="hasRows && !settings.isConfigured" class="text-xs text-gray-500 dark:text-gray-400 mb-3">
      Configurez un fournisseur LLM dans les
      <router-link class="text-primary-600 dark:text-primary-400 hover:underline" to="/settings">paramètres</router-link>
      pour générer le JSON-LD.
    </p>

    <ul v-if="hasRows" class="divide-y divide-gray-100 dark:divide-gray-700">
      <li v-for="url in urlList" :key="url" class="py-3">
        <div class="flex items-center justify-between gap-3">
          <a :href="url" :title="url" class="text-sm text-gray-900 dark:text-white truncate hover:text-emerald-500" target="_blank">
            {{ slug(url) === 'accueil' ? '/' : slug(url) }}
          </a>
          <div class="flex items-center gap-2 shrink-0">
            <span
                v-if="byUrl[url]?.status"
                :class="{
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300': statusLabel(url) === 'OK',
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300': statusLabel(url) === 'Manquant',
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300': statusLabel(url) === 'Incomplet'
                }"
                class="px-2 py-0.5 rounded text-[10px] font-medium"
            >{{ statusLabel(url) }}</span>
            <span
                v-if="byUrl[url]?.fromHistory"
                class="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                title="JSON-LD déjà généré, restauré depuis l'historique IA"
            >Historisé</span>
            <span v-if="byUrl[url]?.error" class="text-[11px] text-red-500">{{ byUrl[url].error }}</span>
            <button
                v-if="byUrl[url]?.status?.needsGeneration"
                :disabled="byUrl[url]?.generating || !settings.isConfigured"
                class="px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                @click="generate(url)"
            >
              {{ byUrl[url]?.generating ? 'Génération…' : (byUrl[url]?.generated ? 'Régénérer' : 'Générer le JSON-LD') }}
            </button>
          </div>
        </div>

        <p v-if="byUrl[url]?.status?.types?.length" class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          Types : {{ byUrl[url].status.types.join(', ') }}
        </p>
        <p v-if="byUrl[url]?.genError" class="mt-1 text-[11px] text-red-500">{{ byUrl[url].genError }}</p>

        <div v-if="byUrl[url]?.generated" class="mt-2">
          <pre class="text-[11px] leading-snug bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-auto max-h-72 overflow-y-auto text-gray-800 dark:text-gray-200">{{ byUrl[url].generated }}</pre>
          <div class="mt-1.5 flex gap-2">
            <button
                class="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors"
                @click="copy(toScriptTag(byUrl[url].generated))"
            >
              Copier la balise
            </button>
            <button
                class="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors"
                @click="download(url)"
            >
              Télécharger
            </button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
