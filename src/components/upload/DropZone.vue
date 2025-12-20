<script setup>
import {computed, ref} from 'vue'

const emit = defineEmits(['file-selected', 'report-loaded'])

const isDragging = ref(false)
const dragCounter = ref(0)
const error = ref(null)
const fileName = ref(null)

const dropZoneClasses = computed(() => ({
  'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.02]': isDragging.value,
  'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500': !isDragging.value && !error.value,
  'border-red-500 bg-red-50 dark:bg-red-900/20': error.value
}))

const onDragEnter = (e) => {
  e.preventDefault()
  dragCounter.value++
  isDragging.value = true
}

const onDragLeave = (e) => {
  e.preventDefault()
  dragCounter.value--
  if (dragCounter.value === 0) {
    isDragging.value = false
  }
}

const onDragOver = (e) => {
  e.preventDefault()
}

const onDrop = async (e) => {
  e.preventDefault()
  isDragging.value = false
  dragCounter.value = 0

  const files = e.dataTransfer?.files
  if (files?.length > 0) {
    await processFile(files[0])
  }
}

const onFileSelect = async (e) => {
  const file = e.target.files?.[0]
  if (file) {
    await processFile(file)
  }
}

const processFile = async (file) => {
  error.value = null

  if (!file.name.endsWith('.json')) {
    error.value = 'Veuillez sélectionner un fichier JSON'
    return
  }

  try {
    const text = await file.text()
    const json = JSON.parse(text)

    // Validate it's a Lighthouse report
    if (!json.lighthouseVersion || !json.categories) {
      error.value = 'Ce fichier ne semble pas etre un rapport Lighthouse valide'
      return
    }

    fileName.value = file.name
    emit('file-selected', file)
    emit('report-loaded', json)
  } catch (e) {
    error.value = 'Erreur lors de la lecture du fichier JSON: ' + e.message
  }
}

const clearFile = () => {
  fileName.value = null
  error.value = null
}
</script>

<template>
  <div
      :class="dropZoneClasses"
      class="relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer"
      @click="$refs.fileInput.click()"
      @dragenter="onDragEnter"
      @dragleave="onDragLeave"
      @dragover="onDragOver"
      @drop="onDrop"
  >
    <input
        ref="fileInput"
        accept=".json"
        class="hidden"
        type="file"
        @change="onFileSelect"
    />

    <!-- Drag overlay -->
    <Transition name="fade">
      <div
          v-if="isDragging"
          class="absolute inset-0 bg-primary-500/10 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10"
      >
        <div class="text-center">
          <svg class="w-16 h-16 mx-auto text-primary-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
          <p class="mt-4 text-lg font-medium text-primary-600 dark:text-primary-400">
            Deposez votre fichier JSON Lighthouse
          </p>
        </div>
      </div>
    </Transition>

    <!-- Content -->
    <div v-if="!fileName" class="p-12 text-center">
      <!-- Lighthouse icon -->
      <svg class="w-20 h-20 mx-auto text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>

      <h3 class="mt-6 text-xl font-semibold text-gray-700 dark:text-gray-200">
        Importez un rapport Lighthouse
      </h3>
      <p class="mt-2 text-gray-500 dark:text-gray-400">
        Glissez-déposez un fichier JSON ou cliquez pour sélectionner
      </p>

      <div class="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
        <span>Export depuis Chrome DevTools > Lighthouse > Save as JSON</span>
      </div>
    </div>

    <!-- File loaded -->
    <div v-else class="p-8 text-center">
      <div class="inline-flex items-center gap-3 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full">
        <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
        <span class="font-medium text-green-700 dark:text-green-300">{{ fileName }}</span>
        <button
            class="p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded-full transition-colors"
            @click.stop="clearFile"
        >
          <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Error message -->
    <Transition name="slide-up">
      <div v-if="error" class="absolute bottom-4 left-4 right-4">
        <div class="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
          {{ error }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
