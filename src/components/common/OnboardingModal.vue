<script setup>
/**
 * Onboarding initial : si aucune marque ni domaine n'est connu, on demande
 * une marque et un domaine pour préremplir l'application. La marque saisie
 * devient la marque active (affichée dans l'en-tête).
 */
import {ref} from 'vue'
import Modal from '@/components/common/Modal.vue'
import {useSiteStore} from '@/stores/siteStore'

const site = useSiteStore()

const brand = ref('')
const sector = ref('')
const domain = ref('')
const error = ref('')

function submit() {
  error.value = ''
  const entity = site.addEntity({brand: brand.value, domain: domain.value, sector: sector.value})
  if (!entity) {
    error.value = 'invalid'
    return
  }
}
</script>

<template>
  <Modal :open="site.needsOnboarding" :title="$t('onboarding.title')">
    <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">{{ $t('onboarding.intro') }}</p>
    <div class="flex flex-col gap-3">
      <label class="block">
        <span class="block mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('onboarding.brandLabel') }}</span>
        <input
            v-model="brand"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            :placeholder="$t('onboarding.brandPlaceholder')"
            type="text"
            @keyup.enter="submit"
        />
      </label>
      <label class="block">
        <span class="block mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('onboarding.sectorLabel') }}</span>
        <input
            v-model="sector"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            :placeholder="$t('onboarding.sectorPlaceholder')"
            type="text"
            @keyup.enter="submit"
        />
      </label>
      <label class="block">
        <span class="block mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{{ $t('onboarding.domainLabel') }}</span>
        <input
            v-model="domain"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            :placeholder="$t('onboarding.domainPlaceholder')"
            type="text"
            @keyup.enter="submit"
        />
      </label>
      <p v-if="error" class="text-sm text-red-500">{{ $t('onboarding.error') }}</p>
      <div class="flex justify-end">
        <button
            :disabled="!brand.trim() || !domain.trim()"
            class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            @click="submit"
        >
          {{ $t('onboarding.submit') }}
        </button>
      </div>
      <p class="text-xs text-gray-400 dark:text-gray-500">{{ $t('onboarding.hint') }}</p>
    </div>
  </Modal>
</template>
