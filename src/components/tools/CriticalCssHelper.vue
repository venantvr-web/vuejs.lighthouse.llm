<script setup>
/**
 * Helper « CSS critique » : à partir d'URLs saisies, génère les commandes et le
 * script Node à lancer localement (outil `critical`). Aucune génération côté
 * navigateur — donc pas de backend ni de souci CORS : on fabrique le mode d'emploi.
 */
import {computed, ref} from 'vue'
import {useI18n} from '@/i18n'
import {usePersistentRef} from '@/composables/usePersistentRef'
import {useExport} from '@/composables/useExport'
import {useToast} from '@/composables/useToast'
import {buildCriticalCssPlan, parseUrls} from '@/utils/criticalCss'

const {t} = useI18n()
const {copyToClipboard} = useExport()
const toast = useToast()

const urlsText = usePersistentRef('criticalCss.urls', '')
const viewport = usePersistentRef('criticalCss.viewport', 'desktop')
const customWidth = usePersistentRef('criticalCss.width', 1300)
const customHeight = usePersistentRef('criticalCss.height', 900)
const inline = usePersistentRef('criticalCss.inline', false)
// User-Agent mémorisé ; cookie volontairement NON persisté (donnée sensible).
const userAgent = usePersistentRef('criticalCss.userAgent', '')
const cookie = ref('')

const dimensions = computed(() => {
  if (viewport.value === 'mobile') return {width: 360, height: 640}
  if (viewport.value === 'custom') return {width: Number(customWidth.value) || 1300, height: Number(customHeight.value) || 900}
  return {width: 1300, height: 900}
})

const urls = computed(() => parseUrls(urlsText.value))
const plan = computed(() => buildCriticalCssPlan(urls.value, {
  ...dimensions.value,
  inline: inline.value,
  userAgent: userAgent.value.trim(),
  cookie: cookie.value.trim()
}))

async function copy(text) {
  const ok = await copyToClipboard(text)
  toast[ok ? 'success' : 'error'](ok ? t('criticalCss.copied') : t('criticalCss.copyError'))
}
</script>

<template>
  <section class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
    <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ $t('criticalCss.title') }}</h3>
    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">{{ $t('criticalCss.intro') }}</p>

    <!-- URLs -->
    <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">{{ $t('criticalCss.urlsLabel') }}</label>
    <textarea
        v-model="urlsText"
        :placeholder="$t('criticalCss.urlsPlaceholder')"
        class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
        rows="4"
    />

    <!-- Options -->
    <div class="flex flex-wrap items-end gap-3 mt-3">
      <label class="text-xs text-gray-600 dark:text-gray-300">
        <span class="block mb-1">{{ $t('criticalCss.viewport') }}</span>
        <select v-model="viewport" class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
          <option value="desktop">{{ $t('criticalCss.desktop') }}</option>
          <option value="mobile">{{ $t('criticalCss.mobile') }}</option>
          <option value="custom">{{ $t('criticalCss.custom') }}</option>
        </select>
      </label>
      <template v-if="viewport === 'custom'">
        <label class="text-xs text-gray-600 dark:text-gray-300">
          <span class="block mb-1">{{ $t('criticalCss.width') }}</span>
          <input v-model.number="customWidth" class="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm" min="320" type="number"/>
        </label>
        <label class="text-xs text-gray-600 dark:text-gray-300">
          <span class="block mb-1">{{ $t('criticalCss.height') }}</span>
          <input v-model.number="customHeight" class="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm" min="240" type="number"/>
        </label>
      </template>
      <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 pb-2">
        <input v-model="inline" type="checkbox" class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"/>
        {{ $t('criticalCss.inline') }}
      </label>
    </div>

    <!-- Options avancées : site protégé (WAF / authentification) -->
    <details class="mt-3">
      <summary class="text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none">{{ $t('criticalCss.advanced') }}</summary>
      <div class="mt-2 space-y-2">
        <label class="block text-xs text-gray-600 dark:text-gray-300">
          <span class="block mb-1">{{ $t('criticalCss.userAgent') }}</span>
          <input
              v-model="userAgent"
              :placeholder="$t('criticalCss.userAgentPlaceholder')"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              type="text"
          />
        </label>
        <label class="block text-xs text-gray-600 dark:text-gray-300">
          <span class="block mb-1">{{ $t('criticalCss.cookie') }}</span>
          <input
              v-model="cookie"
              :placeholder="$t('criticalCss.cookiePlaceholder')"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              type="text"
          />
          <span class="block mt-1 text-[11px] text-amber-600 dark:text-amber-400">{{ $t('criticalCss.cookieNote') }}</span>
        </label>
      </div>
    </details>

    <p v-if="!urls.length" class="mt-4 text-xs text-gray-400">{{ $t('criticalCss.emptyHint') }}</p>

    <!-- Commandes générées -->
    <div v-else class="mt-4 space-y-4">
      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-medium text-gray-600 dark:text-gray-300">{{ $t('criticalCss.step1') }}</span>
          <button class="text-xs text-primary-600 dark:text-primary-400 hover:underline" @click="copy(plan.install)">{{ $t('criticalCss.copy') }}</button>
        </div>
        <pre class="px-3 py-2 rounded-lg bg-gray-900 text-gray-100 text-xs overflow-x-auto"><code>{{ plan.install }}</code></pre>
      </div>

      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-medium text-gray-600 dark:text-gray-300">{{ $t('criticalCss.step2', {name: plan.scriptName}) }}</span>
          <button class="text-xs text-primary-600 dark:text-primary-400 hover:underline" @click="copy(plan.script)">{{ $t('criticalCss.copy') }}</button>
        </div>
        <pre class="px-3 py-2 rounded-lg bg-gray-900 text-gray-100 text-xs overflow-x-auto max-h-72"><code>{{ plan.script }}</code></pre>
      </div>

      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-medium text-gray-600 dark:text-gray-300">{{ $t('criticalCss.step3') }}</span>
          <button class="text-xs text-primary-600 dark:text-primary-400 hover:underline" @click="copy(plan.run)">{{ $t('criticalCss.copy') }}</button>
        </div>
        <pre class="px-3 py-2 rounded-lg bg-gray-900 text-gray-100 text-xs overflow-x-auto"><code>{{ plan.run }}</code></pre>
      </div>

      <p class="text-[11px] text-gray-400">{{ $t('criticalCss.note') }}</p>
    </div>
  </section>
</template>
