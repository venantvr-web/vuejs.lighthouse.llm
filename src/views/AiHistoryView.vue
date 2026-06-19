<script setup>
import {computed, onMounted, ref} from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import MarkdownViewer from '@/components/analysis/MarkdownViewer.vue'
import {AI_ARTIFACT_TYPES, useAiHistoryStore} from '@/stores/aiHistoryStore'
import {usePersistentRef} from '@/composables/usePersistentRef'
import {formatDateTimeMedium, formatRelativeTime} from '@/utils/formatters'
import {downloadText} from '@/utils/download'

const aiHistory = useAiHistoryStore()

const items = ref([])
const loading = ref(true)
const expandedId = ref(null)
const activeFilter = usePersistentRef('aihistory.filter', 'all')

const TYPE_META = {
  [AI_ARTIFACT_TYPES.ANALYSIS]: {label: 'Analyse', badge: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'},
  [AI_ARTIFACT_TYPES.INDEXABILITY]: {label: 'Indexabilité', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'},
  [AI_ARTIFACT_TYPES.STRUCTURED_DATA]: {label: 'JSON-LD', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}
}

const FILTERS = [
  {value: 'all', label: 'Tout'},
  {value: AI_ARTIFACT_TYPES.ANALYSIS, label: 'Analyses'},
  {value: AI_ARTIFACT_TYPES.INDEXABILITY, label: 'Indexabilité'},
  {value: AI_ARTIFACT_TYPES.STRUCTURED_DATA, label: 'JSON-LD'}
]

const filtered = computed(() =>
    activeFilter.value === 'all' ? items.value : items.value.filter(i => i.type === activeFilter.value)
)

function typeMeta(type) {
  return TYPE_META[type] || {label: type, badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}
}

async function load() {
  loading.value = true
  items.value = await aiHistory.getAll()
  loading.value = false
}

function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function download(item) {
  const ext = item.format === 'jsonld' ? 'json' : 'md'
  const mime = item.format === 'jsonld' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8'
  const safe = (item.title || item.type).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
  downloadText(`${safe || 'artefact-ia'}.${ext}`, item.content, mime)
}

async function copy(item) {
  try {
    await navigator.clipboard.writeText(item.content)
  } catch {
    // ignore
  }
}

async function remove(item) {
  if (!confirm('Supprimer cet artefact de l\'historique ?')) return
  await aiHistory.remove(item.id)
  await load()
}

async function clearAll() {
  if (!confirm('Vider tout l\'historique IA ?')) return
  await aiHistory.clearAll()
  await load()
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader subtitle="Analyses, diagnostics et JSON-LD générés par l'IA" title="Historique IA">
      <template #actions>
        <button
            v-if="items.length"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
            @click="clearAll"
        >
          Tout effacer
        </button>
      </template>
    </AppHeader>

    <main class="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
      <!-- Filtres -->
      <div class="flex flex-wrap gap-2 mb-6">
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

      <p v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
      <p v-else-if="!filtered.length" class="text-sm text-gray-500 dark:text-gray-400">
        Aucun artefact IA enregistré. Lancez une analyse, un diagnostic d'indexabilité ou une génération de JSON-LD.
      </p>

      <ul v-else class="space-y-3">
        <li
            v-for="item in filtered"
            :key="item.id"
            class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
        >
          <div class="p-4 flex items-start justify-between gap-3">
            <button class="flex-1 min-w-0 text-left" @click="toggle(item.id)">
              <div class="flex items-center gap-2 mb-1">
                <span :class="typeMeta(item.type).badge" class="px-2 py-0.5 rounded text-[10px] font-medium">
                  {{ typeMeta(item.type).label }}
                </span>
                <span class="text-xs text-gray-400 dark:text-gray-500" :title="formatDateTimeMedium(item.timestamp)">
                  {{ formatRelativeTime(item.timestamp) }}
                </span>
              </div>
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ item.title || item.url || 'Artefact' }}</p>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {{ item.provider }}<span v-if="item.model"> · {{ item.model }}</span>
              </p>
            </button>
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                  class="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors"
                  @click="copy(item)"
              >
                Copier
              </button>
              <button
                  class="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors"
                  @click="download(item)"
              >
                Télécharger
              </button>
              <button
                  class="px-2 py-1 rounded-lg border border-red-200 dark:border-red-500/40 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium transition-colors"
                  @click="remove(item)"
              >
                Supprimer
              </button>
            </div>
          </div>

          <div v-if="expandedId === item.id" class="border-t border-gray-100 dark:border-gray-700 p-4">
            <pre
                v-if="item.format === 'jsonld'"
                class="text-[11px] leading-snug bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-auto max-h-96 overflow-y-auto text-gray-800 dark:text-gray-200"
            >{{ item.content }}</pre>
            <MarkdownViewer v-else :content="item.content"/>
          </div>
        </li>
      </ul>
    </main>
  </div>
</template>
