<script setup>
import {computed, onMounted, ref} from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import MarkdownViewer from '@/components/analysis/MarkdownViewer.vue'
import Modal from '@/components/common/Modal.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import {AI_ARTIFACT_TYPES, useAiHistoryStore} from '@/stores/aiHistoryStore'
import {useSiteStore} from '@/stores/siteStore'
import {usePersistentRef} from '@/composables/usePersistentRef'
import {formatDateTimeMedium, formatRelativeTime} from '@/utils/formatters'
import {downloadText} from '@/utils/download'
import {canonicalUrl, extractDomain, sameHost} from '@/utils/url'
import {useI18n} from '@/i18n'
import {useToast} from '@/composables/useToast'

const {t} = useI18n()
const toast = useToast()
const site = useSiteStore()

defineProps({embedded: {type: Boolean, default: false}})

const aiHistory = useAiHistoryStore()

const items = ref([])
const loading = ref(true)
const selected = ref(null)
const activeFilter = usePersistentRef('aihistory.filter', 'all')
const search = usePersistentRef('aihistory.search', '')

const TYPE_META = {
  [AI_ARTIFACT_TYPES.ANALYSIS]: {label: t('aiHistory.typeAnalysis'), badge: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'},
  [AI_ARTIFACT_TYPES.INDEXABILITY]: {label: t('aiHistory.typeIndexability'), badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'},
  [AI_ARTIFACT_TYPES.STRUCTURED_DATA]: {label: t('aiHistory.typeStructuredData'), badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'},
  [AI_ARTIFACT_TYPES.LLMS_TXT]: {label: t('aiHistory.typeLlmsTxt'), badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'},
  [AI_ARTIFACT_TYPES.LLMS_FULL]: {label: t('aiHistory.typeLlmsFull'), badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'}
}

const FILTERS = [
  {value: 'all', label: t('aiHistory.filterAll')},
  {value: AI_ARTIFACT_TYPES.ANALYSIS, label: t('aiHistory.filterAnalyses')},
  {value: AI_ARTIFACT_TYPES.INDEXABILITY, label: t('aiHistory.filterIndexability')},
  {value: AI_ARTIFACT_TYPES.STRUCTURED_DATA, label: t('aiHistory.filterStructuredData')}
]

const filtered = computed(() => {
  let list = activeFilter.value === 'all' ? items.value : items.value.filter(i => i.type === activeFilter.value)
  // Portée : artefacts du domaine actif (ceux sans URL restent visibles partout)
  if (site.activeDomain) {
    list = list.filter(i => !i.url || sameHost(extractDomain(i.url), site.activeDomain))
  }
  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter(i => `${i.title} ${i.url} ${i.provider} ${i.model} ${i.content}`.toLowerCase().includes(q))
  }
  return list
})

function typeMeta(type) {
  return TYPE_META[type] || {label: type, badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}
}

async function load() {
  loading.value = true
  items.value = await aiHistory.getAll()
  loading.value = false
}

function open(item) {
  selected.value = item
}

function download(item) {
  const ext = item.format === 'jsonld' ? 'json' : 'md'
  const mime = item.format === 'jsonld' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8'
  const safe = (item.title || item.type).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
  downloadText(`${safe || 'artefact-ia'}.${ext}`, item.content, mime)
  toast.success(t('toast.exported'))
}

async function copy(item) {
  try {
    await navigator.clipboard.writeText(item.content)
    toast.success(t('toast.copied'))
  } catch {
    // ignore
  }
}

async function remove(item) {
  if (!confirm(t('aiHistory.confirmRemove'))) return
  await aiHistory.remove(item.id)
  await load()
}

async function clearAll() {
  if (!confirm(t('aiHistory.confirmClearAll'))) return
  await aiHistory.clearAll()
  await load()
}

onMounted(load)
</script>

<template>
  <div :class="embedded ? '' : 'min-h-screen flex flex-col'">
    <AppHeader v-if="!embedded" :subtitle="$t('aiHistory.headerSubtitle')" :title="$t('aiHistory.headerTitle')"/>

    <main :class="embedded ? 'max-w-5xl w-full mx-auto px-4 py-6' : 'flex-1 max-w-5xl w-full mx-auto px-4 py-8'">
      <!-- Filtres -->
      <div class="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div class="flex flex-wrap gap-2">
          <button
              v-for="f in FILTERS"
              :key="f.value"
              :class="activeFilter === f.value
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              @click="activeFilter = f.value"
          >
            {{ f.label }}
          </button>
        </div>
        <button
            v-if="items.length"
            class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            @click="clearAll"
        >
          {{ $t('common.clearAll') }}
        </button>
      </div>

      <div v-if="items.length" class="mb-4">
        <SearchInput v-model="search" :placeholder="$t('aiHistory.searchPlaceholder')"/>
      </div>

      <p v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">{{ $t('common.loading') }}</p>
      <div v-else-if="!filtered.length" class="text-sm text-gray-500 dark:text-gray-400">
        <p>{{ $t('aiHistory.empty') }}</p>
        <p class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <router-link class="font-medium text-primary-600 dark:text-primary-400 hover:underline" to="/resources">
            {{ $t('help.goToResources') }} →
          </router-link>
          <router-link class="font-medium text-primary-600 dark:text-primary-400 hover:underline" to="/crawl">
            {{ $t('help.goToCrawl') }} →
          </router-link>
        </p>
      </div>

      <ul v-else class="space-y-3">
        <li
            v-for="item in filtered"
            :key="item.id"
            class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
        >
          <div class="p-4 flex items-start justify-between gap-3">
            <button class="flex-1 min-w-0 text-left" @click="open(item)">
              <div class="flex items-center gap-2 mb-1">
                <span :class="typeMeta(item.type).badge" class="px-2 py-0.5 rounded text-[10px] font-medium">
                  {{ typeMeta(item.type).label }}
                </span>
                <span class="text-xs text-gray-400 dark:text-gray-500" :title="formatDateTimeMedium(item.timestamp)">
                  {{ formatRelativeTime(item.timestamp) }}
                </span>
              </div>
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ item.title || canonicalUrl(item.url) || $t('aiHistory.artifact') }}</p>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {{ item.provider }}<span v-if="item.model"> · {{ item.model }}</span>
              </p>
            </button>
            <div class="flex items-center gap-0.5 shrink-0">
              <button
                  class="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  :title="$t('common.copy')"
                  :aria-label="$t('common.copy')"
                  @click="copy(item)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </button>
              <button
                  class="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  :title="$t('common.download')"
                  :aria-label="$t('common.download')"
                  @click="download(item)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </button>
              <button
                  class="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  :title="$t('common.delete')"
                  :aria-label="$t('common.delete')"
                  @click="remove(item)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </div>
        </li>
      </ul>

      <!-- Contenu de l'artefact en plein écran (pop-up Markdown) -->
      <Modal :open="!!selected" :title="selected?.title || canonicalUrl(selected?.url) || $t('aiHistory.artifact')" @close="selected = null">
        <pre
            v-if="selected?.format === 'jsonld'"
            class="text-[11px] leading-snug bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-auto text-gray-800 dark:text-gray-200"
        >{{ selected.content }}</pre>
        <MarkdownViewer v-else :content="selected?.content || ''"/>
      </Modal>
    </main>
  </div>
</template>
