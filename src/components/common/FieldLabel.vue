<script setup>
/**
 * Libellé de champ standard : un `<label>` avec un intitulé au-dessus du contrôle.
 * Garantit la convention d'interface (libellé visible, terminé par « : »).
 * Le contrôle (input / select / textarea) est passé en slot par défaut.
 *
 * Usage : <FieldLabel :label="$t('…')" class="flex-1"><input … /></FieldLabel>
 * Les classes passées (flex-1, md:w-56…) s'appliquent au <label> racine.
 */
defineProps({
  label: {type: String, default: ''}
})
</script>

<template>
  <label class="block">
    <span class="block mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
      <slot name="label">{{ label }}</slot>
    </span>
    <slot/>
  </label>
</template>
