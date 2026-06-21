<script setup>
/**
 * Dialogue de confirmation global, piloté par useConfirm(). Monté une seule
 * fois dans App.vue. Réutilise Modal (fond assombri, Échap, clic extérieur).
 */
import Modal from '@/components/common/Modal.vue'
import {useConfirm} from '@/composables/useConfirm'
import {useI18n} from '@/i18n'

const {t} = useI18n()
const {state, settle} = useConfirm()
</script>

<template>
  <Modal :open="state.open" :title="state.title || $t('common.confirmTitle')" @close="settle(false)">
    <p class="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{{ state.message }}</p>
    <template #footer>
      <button
          class="btn btn-secondary text-sm"
          type="button"
          @click="settle(false)"
      >
        {{ state.cancelLabel || $t('common.cancel') }}
      </button>
      <button
          :class="state.danger
            ? 'btn bg-red-600 hover:bg-red-700 text-white text-sm'
            : 'btn btn-primary text-sm'"
          type="button"
          @click="settle(true)"
      >
        {{ state.confirmLabel || $t('common.confirm') }}
      </button>
    </template>
  </Modal>
</template>
