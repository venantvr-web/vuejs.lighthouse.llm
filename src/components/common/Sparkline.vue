<script setup>
import {computed} from 'vue'

/**
 * Lightweight inline SVG sparkline.
 * Renders a small trend line from an array of numeric values (0-100 scale).
 * No external charting dependency so it stays cheap to render per-card.
 */
const props = defineProps({
  values: {
    type: Array,
    default: () => []
  },
  width: {
    type: Number,
    default: 120
  },
  height: {
    type: Number,
    default: 32
  },
  color: {
    type: String,
    default: '#6366f1'
  },
  // When true, scale to the data's own min/max instead of a fixed 0-100 domain.
  autoScale: {
    type: Boolean,
    default: false
  }
})

const points = computed(() => {
  const vals = props.values.filter(v => typeof v === 'number' && !Number.isNaN(v))
  if (vals.length === 0) return ''

  const pad = 2
  const w = props.width - pad * 2
  const h = props.height - pad * 2

  // Default: fixed 0-100 domain keeps sparklines comparable across cards.
  // autoScale: fit the data's own range (for unbounded metrics like clicks).
  const min = props.autoScale ? Math.min(...vals) : 0
  const max = props.autoScale ? Math.max(...vals) : 100
  const range = max - min || 1

  if (vals.length === 1) {
    const y = pad + h - ((vals[0] - min) / range) * h
    return `${pad},${y} ${pad + w},${y}`
  }

  return vals
      .map((v, i) => {
        const x = pad + (i / (vals.length - 1)) * w
        const y = pad + h - ((v - min) / range) * h
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
})

const lastPoint = computed(() => {
  if (!points.value) return null
  const parts = points.value.split(' ')
  const [x, y] = parts[parts.length - 1].split(',')
  return {x: Number(x), y: Number(y)}
})

const hasData = computed(() => props.values.some(v => typeof v === 'number' && !Number.isNaN(v)))
</script>

<template>
  <svg
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      :width="width"
      class="overflow-visible"
      role="img"
  >
    <template v-if="hasData">
      <polyline
          :points="points"
          :stroke="color"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
      />
      <circle
          v-if="lastPoint"
          :cx="lastPoint.x"
          :cy="lastPoint.y"
          :fill="color"
          r="2.5"
      />
    </template>
    <line
        v-else
        :x1="2"
        :x2="width - 2"
        :y1="height / 2"
        :y2="height / 2"
        stroke="currentColor"
        stroke-dasharray="3 3"
        stroke-width="1"
        class="text-gray-300 dark:text-gray-600"
    />
  </svg>
</template>
