<script setup>
import {computed, ref} from 'vue'
import {formatRelativeTime, getScoreColorClass} from '@/utils/formatters'
import {canonicalUrl, sameHost} from '@/utils/url'
import Sparkline from '@/components/common/Sparkline.vue'
import Modal from '@/components/common/Modal.vue'
import DeleteButton from '@/components/common/DeleteButton.vue'
import MarkdownViewer from '@/components/analysis/MarkdownViewer.vue'
import {useSiteStore} from '@/stores/siteStore'
import {useI18n} from '@/i18n'

const {t} = useI18n()
const site = useSiteStore()

// Une source citée correspond-elle au domaine suivi ? (casse + www. ignorés)
function isOwnSource(host) {
  return !!site.activeDomain && sameHost(host, site.activeDomain)
}

// Le domaine suivi figure-t-il parmi les sources citées par au moins un moteur ?
const ownCited = computed(() =>
    (props.stats?.citedSources || []).some(s => isOwnSource(s.host))
)

const props = defineProps({
  item: {type: Object, required: true},
  stats: {type: Object, default: null},
  running: {type: Boolean, default: false},
  error: {type: String, default: null}
})

const emit = defineEmits(['run', 'remove'])

const PROVIDER_LABELS = {openai: 'OpenAI', anthropic: 'Claude', gemini: 'Gemini', ollama: 'Ollama'}

// Clés ('positive'/'neutral'/'negative') = valeurs de données pour le lookup → inchangées.
// Seul le libellé d'affichage est traduit via i18n (clé labelKey).
const SENTIMENT = {
  positive: {labelKey: 'geo.sentimentPositive', class: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'},
  neutral: {labelKey: 'geo.sentimentNeutral', class: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'},
  negative: {labelKey: 'geo.sentimentNegative', class: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}
}

const responsesModal = ref(false)
</script>

<template>
  <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col">
    <!-- Header -->
    <div class="flex items-start justify-between gap-2 mb-3">
      <div class="min-w-0">
        <h3 :title="item.prompt" class="font-semibold text-gray-900 dark:text-white line-clamp-2">
          {{ item.prompt }}
        </h3>
        <div class="flex flex-wrap items-center gap-1.5 mt-2">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
            {{ item.brand }}
          </span>
          <span
              v-if="item.competitors.length"
              class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            {{ item.competitors.length > 1 ? $t('geo.competitorsCountPlural', { count: item.competitors.length }) : $t('geo.competitorsCount', { count: item.competitors.length }) }}
          </span>
        </div>
      </div>
      <DeleteButton :label="$t('geo.removeTitle')" @click="emit('remove')"/>
    </div>

    <template v-if="stats?.providers?.length">
      <!-- Aggregate across engines -->
      <div class="flex items-center gap-4 mb-3">
        <div>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('geo.enginesCiting') }}</p>
          <p
              :class="stats.enginesCited > 0 ? 'text-emerald-500' : 'text-red-500'"
              class="text-lg font-bold leading-tight"
          >{{ stats.enginesCited }}/{{ stats.engineCount }}</p>
        </div>
        <div>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('geo.avgShareOfVoiceShort') }}</p>
          <p
              :class="getScoreColorClass((stats.avgShareOfVoice ?? 0) / 100)"
              class="text-lg font-bold leading-tight"
          >{{ stats.avgShareOfVoice !== null ? stats.avgShareOfVoice + '%' : '—' }}</p>
        </div>
      </div>

      <!-- Per-provider comparison -->
      <div class="space-y-1.5 mb-3">
        <div
            v-for="provider in stats.providers"
            :key="provider"
            class="flex items-center gap-2 text-xs"
        >
          <span class="w-16 shrink-0 font-medium text-gray-700 dark:text-gray-300">{{ PROVIDER_LABELS[provider] || provider }}</span>
          <span
              :class="stats.byProvider[provider].latest.brandMentioned ? 'text-emerald-500' : 'text-red-500'"
              class="w-10 shrink-0 font-semibold"
          >
            {{ stats.byProvider[provider].latest.brandMentioned ? $t('geo.mentioned') : $t('geo.notMentioned') }}
          </span>
          <span class="w-10 shrink-0 text-gray-500 dark:text-gray-400">
            <template v-if="stats.byProvider[provider].latest.position">#{{ stats.byProvider[provider].latest.position }}</template>
          </span>
          <span
              :class="getScoreColorClass((stats.byProvider[provider].latest.shareOfVoice ?? 0) / 100)"
              class="w-10 shrink-0 font-semibold"
          >
            {{ stats.byProvider[provider].latest.shareOfVoice !== null ? stats.byProvider[provider].latest.shareOfVoice + '%' : '—' }}
          </span>
          <span
              v-if="SENTIMENT[stats.byProvider[provider].latest.sentiment]"
              :class="SENTIMENT[stats.byProvider[provider].latest.sentiment].class"
              class="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
          >
            {{ $t(SENTIMENT[stats.byProvider[provider].latest.sentiment].labelKey) }}
          </span>
          <Sparkline
              v-if="stats.byProvider[provider].sparkline.length > 1"
              :values="stats.byProvider[provider].sparkline"
              :width="90"
              class="ml-auto"
              color="#6366f1"
          />
        </div>
      </div>

      <!-- Emerging competitors -->
      <div v-if="stats.emergingCompetitors?.length" class="mb-3">
        <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{{ $t('geo.emergingCompetitors') }}</p>
        <div class="flex flex-wrap gap-1">
          <span
              v-for="c in stats.emergingCompetitors"
              :key="c.name"
              class="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
              :title="$t('geo.citedBy', { count: c.engines })"
          >
            {{ c.name }}<span v-if="c.engines > 1" class="opacity-60"> · {{ c.engines }}</span>
          </span>
        </div>
      </div>

      <!-- Sources citées : domaines que les moteurs IA citent en réponse -->
      <div v-if="stats.citedSources?.length" class="mb-3">
        <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
          {{ $t('geo.citedSources') }}
          <span
              :class="ownCited ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'"
              class="ml-1 normal-case font-medium"
          >· {{ ownCited ? $t('geo.ownSourceCited') : $t('geo.ownSourceNotCited') }}</span>
        </p>
        <div class="flex flex-wrap gap-1">
          <span
              v-for="s in stats.citedSources"
              :key="s.host"
              :class="isOwnSource(s.host)
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium'
                : 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'"
              :title="$t('geo.citedBy', { count: s.engines })"
              class="px-1.5 py-0.5 rounded text-[10px]"
          >
            <span v-if="isOwnSource(s.host)" aria-hidden="true">✓ </span>{{ canonicalUrl(s.host) }}<span v-if="s.engines > 1" class="opacity-60"> · {{ s.engines }}</span>
          </span>
        </div>
      </div>

      <!-- Réponses : affichées en Markdown dans une fenêtre modale -->
      <button class="text-[11px] text-primary-500 hover:underline self-start" @click="responsesModal = true">
        {{ $t('geo.showResponses') }}
      </button>
    </template>

    <!-- Never run -->
    <div v-else class="flex-1 flex items-center justify-center py-4 mb-2">
      <p class="text-sm text-gray-400 dark:text-gray-500">{{ $t('geo.neverRun') }}</p>
    </div>

    <!-- Error -->
    <p v-if="error" class="text-xs text-red-500 mb-2 mt-2">{{ error }}</p>

    <!-- Footer -->
    <div class="mt-auto flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50">
      <span class="text-xs text-gray-400 dark:text-gray-500">
        <template v-if="stats?.lastRunAt">{{ $t('geo.executedAt', { time: formatRelativeTime(stats.lastRunAt) }) }}</template>
        <template v-else>—</template>
      </span>
      <button
          :disabled="running"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors disabled:opacity-50"
          @click="emit('run')"
      >
        <svg
            :class="{ 'animate-spin': running }"
            class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
        {{ running ? $t('common.analyzing') : $t('geo.run') }}
      </button>
    </div>

    <!-- Réponses des moteurs, rendues en Markdown -->
    <Modal :open="responsesModal" @close="responsesModal = false">
      <template #title>
        <span class="line-clamp-1">{{ item.prompt }}</span>
      </template>
      <div v-if="stats?.providers?.length" class="space-y-6">
        <section v-for="provider in stats.providers" :key="provider">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ PROVIDER_LABELS[provider] || provider }}</span>
            <span class="text-[11px] text-gray-400 dark:text-gray-500">{{ stats.byProvider[provider].latest.model }}</span>
            <span
                :class="stats.byProvider[provider].latest.brandMentioned ? 'text-emerald-500' : 'text-red-500'"
                class="ml-auto text-xs font-semibold"
            >
              {{ stats.byProvider[provider].latest.brandMentioned ? $t('geo.mentioned') : $t('geo.notMentioned') }}
            </span>
          </div>
          <MarkdownViewer
              v-if="stats.byProvider[provider].latest.response"
              :content="stats.byProvider[provider].latest.response"
          />
          <p v-else class="text-xs text-gray-400 dark:text-gray-500 italic">—</p>
        </section>
      </div>
    </Modal>
  </div>
</template>
