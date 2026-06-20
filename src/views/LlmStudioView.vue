<script setup>
import {onMounted, ref} from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import PageIntro from '@/components/common/PageIntro.vue'
import StreamingOutput from '@/components/analysis/StreamingOutput.vue'
import Modal from '@/components/common/Modal.vue'
import {useLlmStudio} from '@/composables/useLlmStudio'
import {useLlmWatch} from '@/composables/useLlmWatch'
import {useNotifications} from '@/composables/useNotifications'
import {usePersistentRef} from '@/composables/usePersistentRef'
import {useSiteStore} from '@/stores/siteStore'
import {useSettingsStore} from '@/stores/settingsStore'
import {AI_ARTIFACT_TYPES, useAiHistoryStore} from '@/stores/aiHistoryStore'
import {downloadText} from '@/utils/download'
import {formatDateTimeMedium, formatRelativeTime} from '@/utils/formatters'
import {useToast} from '@/composables/useToast'
import {useI18n} from '@/i18n'

const {t} = useI18n()
const toast = useToast()
const site = useSiteStore()
const settings = useSettingsStore()
const aiHistory = useAiHistoryStore()

const {
  analyzing, analyzeError, context, liveLlms, liveLlmsFull, analyze,
  generating, output, outputKind, genError, tokenCount, truncated,
  generate, continueGeneration, cancel
} = useLlmStudio()

const {items: watchItems, checking: watchChecking, isWatched, watchDomain, unwatch, checkAll, checkDue} = useLlmWatch()
const {permission: notifPermission, requestPermission, isSupported: notifSupported} = useNotifications()

const url = usePersistentRef('llmStudio.url', site.origin)
const keywords = usePersistentRef('llmStudio.keywords', '')
const interval = usePersistentRef('llmStudio.interval', 24)

function toggleWatch() {
  if (!context.value) return
  const origin = context.value.origin
  if (isWatched(origin)) unwatch(origin)
  else watchDomain(origin, {context: context.value, llmsPresent: liveLlms.value?.present, llmsFullPresent: liveLlmsFull.value?.present})
}

// Veille : historique des fichiers générés + contenu en ligne consulté
const history = ref([])
const liveModal = ref(null)   // { title, content }

const LLMS_TYPES = [AI_ARTIFACT_TYPES.LLMS_TXT, AI_ARTIFACT_TYPES.LLMS_FULL]

async function loadHistory() {
  const all = await aiHistory.getAll()
  history.value = all.filter(i => LLMS_TYPES.includes(i.type))
}

async function handleAnalyze() {
  await analyze(url.value)
}

async function handleGenerate(full) {
  await generate({full, keywords: keywords.value})
  await loadHistory()
}

function exportOutput() {
  const name = outputKind.value === 'full' ? 'llms-full.txt' : 'llms.txt'
  downloadText(name, output.value, 'text/plain;charset=utf-8')
  toast.success(t('toast.exported'))
}

function openLive(kind) {
  const file = kind === 'full' ? liveLlmsFull.value : liveLlms.value
  liveModal.value = {title: kind === 'full' ? 'llms-full.txt' : 'llms.txt', content: file?.content || ''}
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(t('toast.copied'))
  } catch {
    // ignore
  }
}

function typeLabel(type) {
  return type === AI_ARTIFACT_TYPES.LLMS_FULL ? 'llms-full.txt' : 'llms.txt'
}

onMounted(async () => {
  await loadHistory()
  // Veille automatique : revérifie les domaines dont l'intervalle est écoulé
  await checkDue(Number(interval.value) * 3600 * 1000)
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader :subtitle="$t('llmStudio.headerSubtitle')" :title="$t('llmStudio.headerTitle')"/>

    <PageIntro :text="$t('intro.llmStudio')" width="5xl"/>

    <main class="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
      <!-- Saisie -->
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
        <div class="flex flex-col gap-3">
          <div class="flex flex-col sm:flex-row gap-3">
            <input
                v-model="url"
                class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                :placeholder="$t('llmStudio.urlPlaceholder')"
                type="text"
                @keyup.enter="handleAnalyze"
            />
            <button
                :disabled="analyzing || !url"
                class="shrink-0 whitespace-nowrap px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                @click="handleAnalyze"
            >
              {{ analyzing ? $t('llmStudio.analyzing') : $t('llmStudio.analyze') }}
            </button>
          </div>
          <label class="block">
            <span class="block mb-1 text-xs text-gray-500 dark:text-gray-400">{{ $t('llmStudio.keywordsLabel') }}</span>
            <textarea
                v-model="keywords"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                :placeholder="$t('llmStudio.keywordsPlaceholder')"
                rows="2"
            />
          </label>
        </div>
        <p v-if="analyzeError" class="mt-2 text-sm text-red-500">{{ analyzeError }}</p>
        <p v-if="!settings.isConfigured" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {{ $t('llmStudio.configurePrefix') }}
          <router-link class="text-primary-600 dark:text-primary-400 hover:underline" to="/settings">{{ $t('llmStudio.configureLink') }}</router-link>
          {{ $t('llmStudio.configureSuffix') }}
        </p>
      </div>

      <!-- Contexte du domaine -->
      <div v-if="context" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">{{ $t('llmStudio.contextTitle') }}</h2>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt class="text-xs text-gray-500 dark:text-gray-400">{{ $t('llmStudio.ctxTitle') }}</dt>
            <dd class="text-gray-900 dark:text-white">{{ context.title || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500 dark:text-gray-400">{{ $t('llmStudio.ctxDescription') }}</dt>
            <dd class="text-gray-900 dark:text-white">{{ context.description || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500 dark:text-gray-400">{{ $t('llmStudio.ctxHeaderLinks') }}</dt>
            <dd class="text-gray-900 dark:text-white">{{ context.headerLinks.length }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500 dark:text-gray-400">{{ $t('llmStudio.ctxFooterLinks') }}</dt>
            <dd class="text-gray-900 dark:text-white">{{ context.footerLinks.length }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs text-gray-500 dark:text-gray-400">{{ $t('llmStudio.ctxSitemap', { count: context.sitemap.total }) }}</dt>
            <dd class="mt-1 flex flex-wrap gap-1.5">
              <span
                  v-for="s in context.sitemap.sections"
                  :key="s.section"
                  class="px-2 py-0.5 rounded text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              >{{ s.section }} · {{ s.count }}</span>
              <span v-if="!context.sitemap.sections.length" class="text-gray-400 dark:text-gray-500">—</span>
            </dd>
          </div>
        </dl>

        <!-- Veille : fichiers en ligne -->
        <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3 text-xs">
          <span class="text-gray-500 dark:text-gray-400">{{ $t('llmStudio.liveStatus') }}</span>
          <span :class="liveLlms?.present ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
            llms.txt : {{ liveLlms?.present ? $t('llmStudio.present') : $t('llmStudio.absent') }}
          </span>
          <button v-if="liveLlms?.present" class="text-primary-600 dark:text-primary-400 hover:underline" @click="openLive('llms')">
            {{ $t('llmStudio.viewLive') }}
          </button>
          <span :class="liveLlmsFull?.present ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
            llms-full.txt : {{ liveLlmsFull?.present ? $t('llmStudio.present') : $t('llmStudio.absent') }}
          </span>
          <button v-if="liveLlmsFull?.present" class="text-primary-600 dark:text-primary-400 hover:underline" @click="openLive('full')">
            {{ $t('llmStudio.viewLive') }}
          </button>
        </div>

        <!-- Actions de génération -->
        <div class="mt-4 flex flex-wrap gap-2">
          <button
              :disabled="generating || !settings.isConfigured"
              class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              @click="handleGenerate(false)"
          >
            {{ $t('llmStudio.generateLlms') }}
          </button>
          <button
              :disabled="generating || !settings.isConfigured"
              class="px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-500/40 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-sm font-medium transition-colors disabled:opacity-50"
              @click="handleGenerate(true)"
          >
            {{ $t('llmStudio.generateLlmsFull') }}
          </button>
        </div>
      </div>

      <!-- Sortie générée -->
      <div v-if="output || generating" class="mb-6">
        <p v-if="genError" class="text-sm text-red-500 mb-2">{{ genError }}</p>
        <StreamingOutput
            :content="output"
            :is-streaming="generating"
            :token-count="tokenCount"
            @cancel="cancel"
            @export="exportOutput"
            @copy="toast.success(t('toast.copied'))"
        />
        <div v-if="truncated && !generating" class="mt-2">
          <button
              class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors"
              @click="continueGeneration"
          >
            {{ $t('llmStudio.continue') }}
          </button>
        </div>
      </div>

      <!-- Veille automatique -->
      <div v-if="context || watchItems.length" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">{{ $t('llmStudio.watchTitle') }}</h2>
          <div class="flex flex-wrap items-center gap-2">
            <label class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              {{ $t('llmStudio.watchInterval') }}
              <select
                  v-model.number="interval"
                  class="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs"
              >
                <option :value="6">6 h</option>
                <option :value="24">24 h</option>
                <option :value="168">7 j</option>
              </select>
            </label>
            <button
                v-if="watchItems.length"
                :disabled="watchChecking"
                class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors disabled:opacity-50"
                @click="checkAll"
            >
              {{ watchChecking ? $t('llmStudio.checking') : $t('llmStudio.checkNow') }}
            </button>
          </div>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">{{ $t('llmStudio.watchHint') }}</p>

        <div class="flex flex-wrap items-center gap-3 mb-3">
          <button
              v-if="context"
              class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
              @click="toggleWatch"
          >
            {{ isWatched(context.origin) ? $t('llmStudio.unwatch') + ' →' : $t('llmStudio.watchThis') + ' →' }}
          </button>
          <button
              v-if="notifSupported && notifPermission !== 'granted'"
              class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
              @click="requestPermission"
          >
            {{ $t('llmStudio.enableAlerts') }} →
          </button>
        </div>

        <ul v-if="watchItems.length" class="divide-y divide-gray-100 dark:divide-gray-700">
          <li v-for="item in watchItems" :key="item.origin" class="py-2">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm text-gray-900 dark:text-white truncate">{{ item.origin }}</p>
                <p class="text-[11px] text-gray-500 dark:text-gray-400">
                  {{ $t('llmStudio.lastChecked') }}
                  <span :title="formatDateTimeMedium(item.lastCheckedAt)">{{ formatRelativeTime(item.lastCheckedAt) }}</span>
                  · llms.txt {{ item.snapshot.llmsPresent ? '✓' : '—' }}
                  · llms-full.txt {{ item.snapshot.llmsFullPresent ? '✓' : '—' }}
                </p>
              </div>
              <button class="shrink-0 text-xs text-red-500 hover:underline" @click="unwatch(item.origin)">
                {{ $t('common.delete') }}
              </button>
            </div>
            <ul v-if="item.lastChanges?.length" class="mt-1 ml-1 list-disc list-inside text-[11px] text-amber-600 dark:text-amber-400">
              <li v-for="(c, i) in item.lastChanges" :key="i">{{ c }}</li>
            </ul>
          </li>
        </ul>
      </div>

      <!-- Veille : historique des générations -->
      <div v-if="history.length" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-1">{{ $t('llmStudio.veilleTitle') }}</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">{{ $t('llmStudio.veilleHint') }}</p>
        <ul class="divide-y divide-gray-100 dark:divide-gray-700">
          <li v-for="item in history" :key="item.id" class="py-2 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-gray-900 dark:text-white truncate">{{ item.url }}</p>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 mr-1.5">{{ typeLabel(item.type) }}</span>
                <span :title="formatDateTimeMedium(item.timestamp)">{{ formatRelativeTime(item.timestamp) }}</span>
                <span v-if="item.model"> · {{ item.model }}</span>
              </p>
            </div>
            <button
                class="shrink-0 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                @click="liveModal = {title: typeLabel(item.type) + ' — ' + item.url, content: item.content}"
            >
              {{ $t('common.expand') }}
            </button>
          </li>
        </ul>
      </div>
    </main>

    <!-- Contenu d'un fichier (en ligne ou historisé) -->
    <Modal :open="!!liveModal" :title="liveModal?.title || ''" @close="liveModal = null">
      <div class="mb-2 flex justify-end">
        <button
            class="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors"
            @click="copyText(liveModal?.content || '')"
        >
          {{ $t('common.copy') }}
        </button>
      </div>
      <pre class="text-xs leading-snug bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap text-gray-800 dark:text-gray-200">{{ liveModal?.content }}</pre>
    </Modal>
  </div>
</template>
