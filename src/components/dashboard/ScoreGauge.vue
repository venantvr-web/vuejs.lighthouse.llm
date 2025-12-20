<script setup>
import {computed, onMounted, ref, watch} from 'vue'

const props = defineProps({
  score: {type: Number, required: true, default: 0}, // 0-100
  label: {type: String, default: ''},
  size: {type: String, default: 'md'}, // sm, md, lg
  animated: {type: Boolean, default: true}
})

const displayScore = ref(0)
const circumference = 2 * Math.PI * 45

const sizeClasses = computed(() => ({
  sm: 'w-20 h-20',
  md: 'w-32 h-32',
  lg: 'w-40 h-40'
}[props.size]))

const textSizeClasses = computed(() => ({
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-4xl'
}[props.size]))

const labelSizeClasses = computed(() => ({
  sm: 'text-xs',
  md: 'text-xs',
  lg: 'text-sm'
}[props.size]))

const strokeOffset = computed(() => {
  const progress = displayScore.value / 100
  return circumference * (1 - progress)
})

const scoreColor = computed(() => {
  if (displayScore.value >= 90) return '#0cce6b' // lighthouse green
  if (displayScore.value >= 50) return '#ffa400' // lighthouse orange
  return '#ff4e42' // lighthouse red
})

const scoreTextClass = computed(() => ({
  'text-lighthouse-green': displayScore.value >= 90,
  'text-lighthouse-orange': displayScore.value >= 50 && displayScore.value < 90,
  'text-lighthouse-red': displayScore.value < 50
}))

const scoreBgClass = computed(() => ({
  'bg-lighthouse-green/10': displayScore.value >= 90,
  'bg-lighthouse-orange/10': displayScore.value >= 50 && displayScore.value < 90,
  'bg-lighthouse-red/10': displayScore.value < 50
}))

const animateScore = () => {
  if (!props.animated) {
    displayScore.value = props.score
    return
  }

  const duration = 1000
  const start = displayScore.value
  const end = props.score
  const startTime = performance.now()

  const animate = (currentTime) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Easing function (ease-out-cubic)
    const eased = 1 - Math.pow(1 - progress, 3)

    displayScore.value = Math.round(start + (end - start) * eased)

    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }

  requestAnimationFrame(animate)
}

onMounted(() => {
  setTimeout(animateScore, 100)
})

watch(() => props.score, animateScore)
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <div :class="sizeClasses" class="relative">
      <svg class="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
        <!-- Background circle -->
        <circle
            class="text-gray-200 dark:text-gray-700"
            cx="50"
            cy="50"
            fill="none"
            r="45"
            stroke="currentColor"
            stroke-width="8"
        />
        <!-- Score arc -->
        <circle
            :stroke="scoreColor"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="strokeOffset"
            class="transition-all duration-1000 ease-out"
            cx="50"
            cy="50"
            fill="none"
            r="45"
            stroke-linecap="round"
            stroke-width="8"
        />
      </svg>

      <!-- Score number -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div
            :class="scoreBgClass"
            class="flex items-center justify-center rounded-full w-3/4 h-3/4"
        >
          <span
              :class="[textSizeClasses, scoreTextClass]"
              class="font-bold tabular-nums"
          >
            {{ displayScore }}
          </span>
        </div>
      </div>
    </div>

    <!-- Label -->
    <span
        v-if="label"
        :class="labelSizeClasses"
        class="font-medium text-gray-600 dark:text-gray-400 text-center"
    >
      {{ label }}
    </span>
  </div>
</template>
