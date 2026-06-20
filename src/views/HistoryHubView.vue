<script setup>
import {onMounted, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import PageIntro from '@/components/common/PageIntro.vue'
import HistoryView from '@/views/HistoryView.vue'
import CrawlHistoryView from '@/views/CrawlHistoryView.vue'
import AiHistoryView from '@/views/AiHistoryView.vue'
import {usePersistentRef} from '@/composables/usePersistentRef'
import {useI18n} from '@/i18n'

const {t} = useI18n()

const route = useRoute()
const router = useRouter()

const TABS = [
  {value: 'audits', label: t('historyHub.tabAudits')},
  {value: 'crawls', label: t('historyHub.tabCrawls')},
  {value: 'ai', label: t('historyHub.tabAi')}
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
    <AppHeader :subtitle="$t('historyHub.headerSubtitle')" :title="$t('historyHub.headerTitle')">
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

    <PageIntro :text="$t('intro.history')" width="6xl"/>

    <main class="flex-1 w-full">
      <HistoryView v-if="tab === 'audits'" embedded/>
      <CrawlHistoryView v-else-if="tab === 'crawls'" embedded/>
      <AiHistoryView v-else-if="tab === 'ai'" embedded/>
    </main>
  </div>
</template>
