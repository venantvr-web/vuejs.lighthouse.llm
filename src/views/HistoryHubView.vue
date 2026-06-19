<script setup>
import {onMounted, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import HistoryView from '@/views/HistoryView.vue'
import CrawlHistoryView from '@/views/CrawlHistoryView.vue'
import AiHistoryView from '@/views/AiHistoryView.vue'
import {usePersistentRef} from '@/composables/usePersistentRef'

const route = useRoute()
const router = useRouter()

const TABS = [
  {value: 'audits', label: 'Audits'},
  {value: 'crawls', label: 'Crawls'},
  {value: 'ai', label: 'IA'}
]
const valid = TABS.map(t => t.value)

// Onglet actif : mémorisé, et surchargé par le paramètre d'URL ?tab=
const tab = usePersistentRef('history.tab', 'audits')

onMounted(() => {
  const q = route.query.tab
  if (typeof q === 'string' && valid.includes(q)) tab.value = q
})

watch(tab, (value) => {
  if (route.query.tab !== value) router.replace({query: {...route.query, tab: value}})
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader subtitle="Audits, crawls et sorties IA" title="Historique">
      <template #actions>
        <nav class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
              v-for="t in TABS"
              :key="t.value"
              :class="tab === t.value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'"
              class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              @click="tab = t.value"
          >
            {{ t.label }}
          </button>
        </nav>
      </template>
    </AppHeader>

    <main class="flex-1 w-full">
      <HistoryView v-if="tab === 'audits'" embedded/>
      <CrawlHistoryView v-else-if="tab === 'crawls'" embedded/>
      <AiHistoryView v-else-if="tab === 'ai'" embedded/>
    </main>
  </div>
</template>
