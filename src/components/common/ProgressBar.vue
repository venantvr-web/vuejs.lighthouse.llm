<script setup>
import {ref, watch} from 'vue'
import {useProgress} from '@/composables/useProgress'

const {state} = useProgress()

const visible = ref(false)
const width = ref(0)
let trickle = null

function stopTrickle() {
  if (trickle) {
    clearInterval(trickle)
    trickle = null
  }
}

function startTrickle() {
  visible.value = true
  width.value = 8
  stopTrickle()
  // Avance par paliers décroissants, plafonné à 90% tant que c'est en cours
  trickle = setInterval(() => {
    if (width.value < 90) width.value += Math.max(0.5, (90 - width.value) * 0.12)
  }, 400)
}

function finish() {
  stopTrickle()
  width.value = 100
  setTimeout(() => {
    visible.value = false
    width.value = 0
  }, 300)
}

watch(() => state.active, (active, prev) => {
  if (active > 0 && (!prev || prev === 0)) startTrickle()
  else if (active === 0 && prev > 0) finish()
})
</script>

<template>
  <Transition name="progress-fade">
    <div v-if="visible" class="fixed top-0 left-0 right-0 z-[110] h-0.5 pointer-events-none">
      <div
          :style="{ width: width + '%' }"
          class="h-full bg-primary-500 shadow-[0_0_8px] shadow-primary-500/50 transition-[width] duration-300 ease-out"
      ></div>
    </div>
  </Transition>
</template>

<style scoped>
.progress-fade-leave-active {
  transition: opacity 0.3s ease;
}

.progress-fade-leave-to {
  opacity: 0;
}
</style>
