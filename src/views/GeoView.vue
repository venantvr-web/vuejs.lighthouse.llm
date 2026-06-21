<script setup>
import {computed, onMounted, ref, watch} from 'vue'
import {useGeoStore} from '@/stores/geoStore'
import {useGeoHistoryStore} from '@/stores/geoHistoryStore'
import {useSiteStore} from '@/stores/siteStore'
import {usePersistentRef} from '@/composables/usePersistentRef'
import {useScopedPersistentRef} from '@/composables/useScopedPersistentRef'
import {useSettingsStore} from '@/stores/settingsStore'
import {computeGeoScore, useGeoTracking} from '@/composables/useGeoTracking'
import {useBrandConcepts} from '@/composables/useBrandConcepts'
import {useNotifications} from '@/composables/useNotifications'
import GeoCard from '@/components/geo/GeoCard.vue'
import ScoreGauge from '@/components/dashboard/ScoreGauge.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import PageIntro from '@/components/common/PageIntro.vue'
import FieldLabel from '@/components/common/FieldLabel.vue'
import HelpTip from '@/components/common/HelpTip.vue'
import Modal from '@/components/common/Modal.vue'
import MarkdownViewer from '@/components/analysis/MarkdownViewer.vue'
import {buildGeoCsv, buildGeoMarkdown, buildGeoReportMarkdown} from '@/utils/exporters'
import {downloadText} from '@/utils/download'
import {printMarkdown} from '@/utils/print'
import {canonicalUrl} from '@/utils/url'
import {formatDateISO, formatRelativeTime} from '@/utils/formatters'
import {useI18n} from '@/i18n'
import {useToast} from '@/composables/useToast'
import {useConfirm} from '@/composables/useConfirm'

const {t, messages, locale} = useI18n()
const toast = useToast()
const {confirm} = useConfirm()

const geoStore = useGeoStore()
const geoHistory = useGeoHistoryStore()
const settings = useSettingsStore()
const site = useSiteStore()
const {statsById, runningById, errorById, loadStats, loadItemStats, runPrompt} = useGeoTracking()
const {concepts, learnedAt, learning, hasConcepts, learn, error: conceptError} = useBrandConcepts()
const {permission: notificationPermission, requestPermission, notify, isSupported: notificationsSupported} = useNotifications()

// Add form state (mémorisé : un brouillon non soumis survit aux rechargements).
// La marque vient de l'identité active (en-tête / Paramètres), plus de champ ici.
const newPrompt = useScopedPersistentRef('geo.draftPrompt', '')
const newCompetitors = useScopedPersistentRef('geo.draftCompetitors', '')
const addError = ref('')

const runningAll = ref(false)
const showKeyEditor = ref(false)
const selectedProviderIds = ref([])
const advancedAnalysis = usePersistentRef('geo.advancedAnalysis', true)

// Présets de prompts (lus directement dans les messages : t() ne renvoie pas de tableaux)
const promptPresets = computed(() => messages[locale.value]?.geo?.presets || messages.fr.geo.presets || [])

// Jetons à renseigner : un préset comme « … de [secteur] en 2026 ? » expose un champ « secteur ».
const promptTemplate = ref('')
const tokenValues = ref({})

const promptTokens = computed(() => {
  const tokens = []
  const re = /\[([^\]]+)\]/g
  let m
  while ((m = re.exec(promptTemplate.value)) !== null) {
    if (!tokens.includes(m[1])) tokens.push(m[1])
  }
  return tokens
})

// Jetons connus d'avance (valeur unique) : secteur et marque sont préremplis
// automatiquement puisqu'ils font partie de l'identité du site.
function autoFillValue(token) {
  const t = token.toLowerCase()
  if (/secteur|sector|march|market|industr/.test(t) && site.activeSector) return site.activeSector
  if (/marque|brand/.test(t) && site.activeBrand) return site.activeBrand
  return null
}

function applyPreset(preset) {
  promptTemplate.value = preset
  // Préremplissage auto des jetons connus (secteur, marque) ; les autres
  // (produits, cible…) restent proposés en badges.
  const values = {}
  const tokens = (preset.match(/\[([^\]]+)\]/g) || []).map(s => s.slice(1, -1))
  for (const token of tokens) {
    const v = autoFillValue(token)
    if (v) values[token] = v
  }
  tokenValues.value = values
  newPrompt.value = preset
  assemblePrompt()
}

// Badges proposés pour un jeton : valeurs apprises (produits, cibles, thèmes),
// secteur/marque connus, ou concurrents saisis. Clic → préremplit le jeton.
function badgesForToken(token) {
  const t = token.toLowerCase()
  const c = concepts.value || {}
  if (/produit|product|service|offre|offer/.test(t)) return c.products || []
  if (/cible|audience|client|persona|\bqui\b|who/.test(t)) return c.audiences || []
  if (/besoin|need|usage|probl|th[eè]me|theme|sujet|topic/.test(t)) return c.keywords || []
  if (/secteur|sector|march|market|industr|domaine/.test(t)) return site.activeSector ? [site.activeSector] : []
  if (/marque|brand/.test(t)) return site.activeBrand ? [site.activeBrand] : []
  if (/concurrent|competitor|rival/.test(t)) {
    return (newCompetitors.value || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean)
  }
  return []
}

function setToken(token, value) {
  tokenValues.value = {...tokenValues.value, [token]: value}
  assemblePrompt()
}

async function handleLearn() {
  const ok = await learn()
  if (ok) {
    toast.success(t('geo.conceptsLearned'))
    return
  }
  const map = {
    'no-llm': t('geo.conceptsErrLLM'),
    'no-site': t('geo.conceptsErrSite'),
    'unreachable': t('geo.conceptsErrFetch')
  }
  toast.error(map[conceptError.value] || t('geo.conceptsErrFailed'))
}

// Reconstruit le prompt en remplaçant chaque jeton renseigné par sa valeur.
function assemblePrompt() {
  let out = promptTemplate.value
  for (const token of promptTokens.value) {
    const value = (tokenValues.value[token] || '').trim()
    if (value) out = out.split(`[${token}]`).join(value)
  }
  newPrompt.value = out
}

// Édition manuelle du prompt : on quitte le mode jetons pour ne rien écraser.
function onPromptInput() {
  if (promptTemplate.value) {
    promptTemplate.value = ''
    tokenValues.value = {}
  }
}

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

// Score GEO global de la marque active (0-100) + tendance vs runs précédents.
const geoScore = computed(() => computeGeoScore(Object.values(statsById.value)))

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

// Au changement de marque/domaine, la liste affichée change : on charge les stats du nouveau contexte
watch(() => site.scopeKey, () => loadStats(items.value))

async function handleAdd() {
  addError.value = ''
  if (!newPrompt.value.trim()) {
    addError.value = t('geo.errorPromptRequired')
    return
  }
  if (!site.activeBrand) {
    addError.value = t('geo.errorBrandRequired')
    return
  }
  const item = geoStore.addItem({prompt: newPrompt.value, brand: site.activeBrand, competitors: newCompetitors.value})
  if (!item) {
    addError.value = t('geo.errorInvalidEntry')
    return
  }
  newPrompt.value = ''
  newCompetitors.value = ''
  await loadItemStats(item)
}

async function handleRemove(item) {
  if (await confirm({message: t('geo.confirmRemove'), confirmLabel: t('common.delete')})) {
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
  toast.success(t('toast.exported'))
}

function exportMarkdown() {
  downloadText(`geo-${formatDateISO()}.md`, buildGeoMarkdown(items.value, statsById.value), 'text/markdown;charset=utf-8')
  toast.success(t('toast.exported'))
}

// Rapport GEO prêt à livrer (synthèse + score + sources + recommandations).
const reportModal = ref(false)
const reportMarkdown = computed(() => buildGeoReportMarkdown({
  brand: site.activeBrand,
  sector: site.activeSector,
  domain: site.activeDomain ? canonicalUrl(site.activeDomain) : '',
  score: geoScore.value,
  items: items.value,
  statsById: statsById.value,
  concepts: concepts.value
}))

function reportFilename(ext) {
  const slug = (site.activeBrand || 'marque').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `rapport-geo-${slug || 'marque'}-${formatDateISO()}.${ext}`
}

function downloadReport() {
  downloadText(reportFilename('md'), reportMarkdown.value, 'text/markdown;charset=utf-8')
  toast.success(t('toast.exported'))
}

function printReport() {
  const ok = printMarkdown(t('geo.reportTitle'), reportMarkdown.value)
  if (!ok) toast.error(t('geo.reportPopupBlocked'))
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
    <AppHeader :subtitle="$t('geo.subtitle')" :title="$t('geo.title')">
      <template #actions>
        <button
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            @click="showKeyEditor = !showKeyEditor"
        >
          {{ $t('geo.apiKeys') }}
        </button>
        <button
            v-if="notificationsSupported && notificationPermission !== 'granted'"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            @click="requestPermission"
        >
          {{ $t('geo.enableAlerts') }}
        </button>
        <button
            v-if="!geoStore.isEmpty"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            :title="$t('geo.exportCsvTitle')"
            @click="exportCsv"
        >
          CSV
        </button>
        <button
            v-if="!geoStore.isEmpty"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            :title="$t('geo.exportMarkdownTitle')"
            @click="exportMarkdown"
        >
          MD
        </button>
        <button
            v-if="!geoStore.isEmpty"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            :title="$t('geo.reportTitle')"
            @click="reportModal = true"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
          {{ $t('geo.report') }}
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
          {{ runningAll ? $t('geo.runningAll') : $t('geo.runAll') }}
        </button>
      </template>
    </AppHeader>

    <PageIntro :text="$t('intro.geo')" width="6xl"/>

    <main class="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
      <!-- Key editor -->
      <div v-if="showKeyEditor" class="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">{{ $t('geo.keysTitle') }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {{ $t('geo.keysHelp') }}
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label v-for="p in keyProviders" :key="p.id" class="text-xs text-gray-600 dark:text-gray-300">
            <span class="block mb-1 font-medium">{{ p.label }} <span class="text-gray-400">({{ p.model }})</span></span>
            <input
                :value="settings.providerKeys[p.id]"
                class="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                :placeholder="$t('geo.keyPlaceholder')"
                type="password"
                @input="onKeyInput(p.id, $event)"
            />
          </label>
        </div>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">{{ $t('geo.ollamaHint') }}</p>
      </div>

      <!-- No provider ready -->
      <div
          v-if="!readyProviders.length"
          class="mb-6 p-4 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-800 dark:text-amber-200"
      >
        {{ $t('geo.noProviderBefore') }}<strong>{{ $t('geo.apiKeys') }}</strong>{{ $t('geo.noProviderAfter') }}
      </div>

      <!-- Provider selection : tous les moteurs sont visibles ; ceux sans clé
           sont grisés et ouvrent l'éditeur de clés au clic (ils ne disparaissent pas). -->
      <div class="flex flex-wrap items-center gap-2 mb-6">
        <span class="text-xs text-gray-500 dark:text-gray-400">{{ $t('geo.engines') }}</span>
        <button
            v-for="p in settings.geoProviders"
            :key="p.id"
            :class="!p.ready
              ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 border-dashed border-gray-300 dark:border-gray-600'
              : selectedProviderIds.includes(p.id)
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'"
            :title="p.ready ? p.model : $t('geo.keyRequired')"
            class="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium transition-colors"
            @click="p.ready ? toggleProvider(p.id) : (showKeyEditor = true)"
        >
          {{ p.label }}
          <svg v-if="!p.ready" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
        </button>
        <label class="ml-auto flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer" :title="$t('geo.advancedTitle')">
          <input v-model="advancedAnalysis" class="rounded" type="checkbox"/>
          {{ $t('geo.advancedAnalysis') }}
        </label>
      </div>

      <!-- Add form -->
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
        <div class="flex flex-col gap-3">
          <FieldLabel :label="$t('geo.promptLabel')">
            <input
                v-model="newPrompt"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                :placeholder="$t('geo.promptPlaceholder')"
                type="text"
                @input="onPromptInput"
                @keyup.enter="handleAdd"
            />
          </FieldLabel>
          <!-- Champs des jetons du préset (ex. [secteur], [produit]…) :
               secteur/marque préremplis, badges proposés pour les autres -->
          <div
              v-if="promptTemplate && promptTokens.length"
              class="flex flex-col gap-3 rounded-lg border border-primary-200 dark:border-primary-500/30 bg-primary-50/60 dark:bg-primary-900/10 p-3"
          >
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ $t('geo.fillTokens') }}</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-for="token in promptTokens" :key="token" class="flex flex-col gap-1">
                <input
                    v-model="tokenValues[token]"
                    :placeholder="token"
                    class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    type="text"
                    @input="assemblePrompt"
                    @keyup.enter="handleAdd"
                />
                <div v-if="badgesForToken(token).length" class="flex flex-wrap gap-1">
                  <button
                      v-for="b in badgesForToken(token)"
                      :key="b"
                      class="px-1.5 py-0.5 rounded text-[10px] bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                      type="button"
                      :title="$t('geo.badgeFill')"
                      @click="setToken(token, b)"
                  >
                    {{ b }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Concepts du site : appris par l'IA pour enrichir les prompts -->
          <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-medium text-gray-700 dark:text-gray-300 inline-flex items-center gap-1.5">
                {{ $t('geo.conceptsTitle') }}
                <HelpTip :text="$t('geo.conceptsHelp')"/>
              </span>
              <button
                  :disabled="learning"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors disabled:opacity-50"
                  type="button"
                  @click="handleLearn"
              >
                <svg :class="{ 'animate-spin': learning }" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
                {{ learning ? $t('geo.conceptsLearning') : (hasConcepts ? $t('geo.conceptsRelearn') : $t('geo.conceptsLearn')) }}
              </button>
            </div>
            <div v-if="hasConcepts" class="mt-2 space-y-1.5">
              <div v-if="concepts.products.length" class="flex flex-wrap items-center gap-1">
                <span class="text-[11px] text-gray-500 dark:text-gray-400 mr-1">{{ $t('geo.conceptsProducts') }}</span>
                <span v-for="p in concepts.products" :key="p" class="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">{{ p }}</span>
              </div>
              <div v-if="concepts.audiences.length" class="flex flex-wrap items-center gap-1">
                <span class="text-[11px] text-gray-500 dark:text-gray-400 mr-1">{{ $t('geo.conceptsAudiences') }}</span>
                <span v-for="a in concepts.audiences" :key="a" class="px-1.5 py-0.5 rounded text-[10px] bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300">{{ a }}</span>
              </div>
              <div v-if="concepts.keywords.length" class="flex flex-wrap items-center gap-1">
                <span class="text-[11px] text-gray-500 dark:text-gray-400 mr-1">{{ $t('geo.conceptsKeywords') }}</span>
                <span v-for="k in concepts.keywords" :key="k" class="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{{ k }}</span>
              </div>
              <p v-if="learnedAt" class="text-[10px] text-gray-400 dark:text-gray-500">{{ $t('geo.conceptsLearnedAt', { time: formatRelativeTime(learnedAt) }) }}</p>
            </div>
            <p v-else class="mt-2 text-xs text-gray-400 dark:text-gray-500">{{ $t('geo.conceptsEmpty') }}</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <span class="text-xs text-gray-400 dark:text-gray-500">{{ $t('geo.presetsLabel') }}</span>
            <button
                v-for="(preset, i) in promptPresets"
                :key="i"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-xs text-center text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-500/40 transition-colors"
                type="button"
                @click="applyPreset(preset)"
            >
              {{ preset }}
            </button>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ $t('geo.brandActivePrefix') }}
            <strong class="text-gray-700 dark:text-gray-200">{{ site.activeBrand || '—' }}</strong>
            <router-link class="ml-1 text-primary-600 dark:text-primary-400 hover:underline" to="/settings">{{ $t('geo.brandManage') }}</router-link>
          </p>
          <div class="flex flex-col md:flex-row md:items-end gap-3">
            <FieldLabel :label="$t('geo.competitorsLabel')" class="flex-1">
              <input
                  v-model="newCompetitors"
                  class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  :placeholder="$t('geo.competitorsPlaceholder')"
                  type="text"
                  @keyup.enter="handleAdd"
              />
            </FieldLabel>
            <button class="btn btn-primary text-sm shrink-0" @click="handleAdd">
              {{ $t('geo.add') }}
            </button>
          </div>
        </div>
        <p v-if="addError" class="mt-2 text-sm text-red-500">{{ addError }}</p>
      </div>

      <!-- Score GEO de la marque (cockpit) -->
      <div
          v-if="!geoStore.isEmpty && geoScore.score !== null"
          class="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-center gap-5"
      >
        <ScoreGauge :label="site.activeBrand || $t('geo.scoreLabel')" :score="geoScore.score" size="md"/>
        <div class="min-w-0 flex-1">
          <h3 class="font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2">
            {{ $t('geo.scoreTitle') }}
            <HelpTip :text="$t('geo.scoreMethodology')"/>
          </h3>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm">
            <span class="text-gray-600 dark:text-gray-300">
              {{ $t('geo.scoreCitationRate') }}
              <strong class="text-gray-900 dark:text-white">{{ geoScore.citationRate !== null ? geoScore.citationRate + '%' : '—' }}</strong>
            </span>
            <span class="text-gray-600 dark:text-gray-300">
              {{ $t('geo.avgShareOfVoice') }} :
              <strong class="text-gray-900 dark:text-white">{{ geoScore.avgShareOfVoice !== null ? geoScore.avgShareOfVoice + '%' : '—' }}</strong>
            </span>
            <span
                v-if="geoScore.trend !== null && geoScore.trend !== 0"
                :class="geoScore.trend > 0 ? 'text-emerald-500' : 'text-red-500'"
                class="font-medium"
            >
              {{ geoScore.trend > 0 ? '▲' : '▼' }} {{ Math.abs(geoScore.trend) }} {{ $t('geo.scoreTrendUnit') }}
            </span>
            <span v-else-if="geoScore.trend === 0" class="text-gray-400 dark:text-gray-500">{{ $t('geo.scoreTrendStable') }}</span>
          </div>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {{ $t('geo.scoreBasis', { prompts: geoScore.promptCount, runs: geoScore.engineRuns }) }}
          </p>
        </div>
      </div>

      <!-- Summary -->
      <div v-if="!geoStore.isEmpty" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('geo.promptsTracked') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ summary.total }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('geo.avgShareOfVoice') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {{ summary.avgSov !== null ? summary.avgSov + '%' : '—' }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('geo.brandAbsent') }}</p>
          <p :class="summary.absent > 0 ? 'text-red-500' : 'text-emerald-500'" class="text-2xl font-bold mt-1">
            {{ summary.absent }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('geo.neverRun') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ summary.neverRun }}</p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="geoStore.isEmpty" class="text-center py-20">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 inline-flex items-center gap-2">
          {{ $t('geo.emptyTitle') }}
          <HelpTip :text="$t('help.geoWhat')"/>
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
          {{ $t('geo.emptyText') }}
        </p>
        <button
            v-if="!readyProviders.length"
            class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
            @click="showKeyEditor = true"
        >
          {{ $t('help.geoConfigureKeys') }} →
        </button>
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

    <!-- Aperçu du rapport GEO (livrable client), rendu en Markdown -->
    <Modal :open="reportModal" :title="$t('geo.reportTitle')" @close="reportModal = false">
      <MarkdownViewer :content="reportMarkdown"/>
      <template #footer>
        <button
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            @click="downloadReport"
        >
          {{ $t('geo.reportDownload') }}
        </button>
        <button
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
            @click="printReport"
        >
          {{ $t('geo.reportPrint') }}
        </button>
      </template>
    </Modal>
  </div>
</template>
