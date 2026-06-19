<script setup>
import ScoreChart from './ScoreChart.vue'

defineProps({
  scores: {
    type: Array,
    required: true
  }
})

const categories = [
  {key: 'performance', color: '#ef4444'},
  {key: 'accessibility', color: '#8b5cf6'},
  {key: 'best-practices', color: '#3b82f6'},
  {key: 'seo', color: '#10b981'},
  {key: 'pwa', color: '#f59e0b'}
]
</script>

<template>
  <div class="score-chart-grid">
    <ScoreChart
        v-for="cat in categories"
        :key="cat.key"
        :category="cat.key"
        :color="cat.color"
        :scores="scores"
    />
  </div>
</template>

<style scoped>
.score-chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

@media (min-width: 1200px) {
  .score-chart-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 768px) and (max-width: 1199px) {
  .score-chart-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
