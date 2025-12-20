<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const props = defineProps({
  category: {
    type: String,
    required: true
  },
  scores: {
    type: Array,
    required: true
  },
  color: {
    type: String,
    default: '#3b82f6'
  },
  label: {
    type: String,
    default: ''
  }
})

const categoryLabels = {
  performance: 'Performance',
  accessibility: 'Accessibilite',
  'best-practices': 'Bonnes Pratiques',
  seo: 'SEO',
  pwa: 'PWA'
}

const chartData = computed(() => {
  // Sort by timestamp ascending for chronological display
  const sorted = [...props.scores].sort((a, b) => a.timestamp - b.timestamp)

  return {
    labels: sorted.map(s =>
      new Date(s.timestamp).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit'
      })
    ),
    datasets: [
      {
        label: props.label || categoryLabels[props.category] || props.category,
        data: sorted.map(s => {
          const score = s.scores?.[props.category]
          return score !== null && score !== undefined ? Math.round(score * 100) : null
        }),
        borderColor: props.color,
        backgroundColor: props.color + '20',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: props.color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }
    ]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleFont: { size: 13 },
      bodyFont: { size: 12 },
      callbacks: {
        label: (context) => `Score: ${context.parsed.y}%`
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        maxRotation: 45,
        minRotation: 0,
        font: { size: 10 }
      }
    },
    y: {
      min: 0,
      max: 100,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      },
      ticks: {
        stepSize: 25,
        callback: (value) => value + '%',
        font: { size: 10 }
      }
    }
  },
  interaction: {
    intersect: false,
    mode: 'index'
  }
}))

const latestScore = computed(() => {
  if (props.scores.length === 0) return null
  const sorted = [...props.scores].sort((a, b) => b.timestamp - a.timestamp)
  const score = sorted[0]?.scores?.[props.category]
  return score !== null && score !== undefined ? Math.round(score * 100) : null
})

const trend = computed(() => {
  if (props.scores.length < 2) return null

  const sorted = [...props.scores].sort((a, b) => b.timestamp - a.timestamp)
  const latest = sorted[0]?.scores?.[props.category]
  const previous = sorted[1]?.scores?.[props.category]

  if (latest === null || latest === undefined || previous === null || previous === undefined) {
    return null
  }

  const diff = Math.round((latest - previous) * 100)
  return diff
})

function getTrendClass() {
  if (trend.value === null) return ''
  if (trend.value > 0) return 'trend-up'
  if (trend.value < 0) return 'trend-down'
  return 'trend-neutral'
}

function getScoreClass() {
  if (latestScore.value === null) return ''
  if (latestScore.value >= 90) return 'score-good'
  if (latestScore.value >= 50) return 'score-average'
  return 'score-poor'
}
</script>

<template>
  <div class="score-chart">
    <div class="chart-header">
      <h4 class="chart-title">{{ categoryLabels[category] || category }}</h4>
      <div class="chart-stats">
        <span class="latest-score" :class="getScoreClass()">
          {{ latestScore !== null ? latestScore + '%' : '-' }}
        </span>
        <span v-if="trend !== null" class="trend" :class="getTrendClass()">
          <svg v-if="trend > 0" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 14l5-5 5 5z"/>
          </svg>
          <svg v-else-if="trend < 0" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
          <span v-else>-</span>
          {{ Math.abs(trend) }}
        </span>
      </div>
    </div>

    <div class="chart-container">
      <Line
        v-if="scores.length > 0"
        :data="chartData"
        :options="chartOptions"
      />
      <div v-else class="no-data">
        Aucune donnee
      </div>
    </div>
  </div>
</template>

<style scoped>
.score-chart {
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.chart-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.chart-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.latest-score {
  font-size: 1.25rem;
  font-weight: 700;
}

.latest-score.score-good {
  color: var(--color-score-good);
}

.latest-score.score-average {
  color: var(--color-score-average);
}

.latest-score.score-poor {
  color: var(--color-score-poor);
}

.trend {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.trend-up {
  color: var(--color-score-good);
  background-color: var(--color-success-light);
}

.trend-down {
  color: var(--color-score-poor);
  background-color: var(--color-danger-light);
}

.trend-neutral {
  color: var(--color-text-muted);
}

.chart-container {
  flex: 1;
  min-height: 150px;
  position: relative;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}
</style>
