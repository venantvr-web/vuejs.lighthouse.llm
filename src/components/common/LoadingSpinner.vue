<script setup>
defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value)
  },
  text: {
    type: String,
    default: ''
  },
  progress: {
    type: Number,
    default: null
  }
})

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
}
</script>

<template>
  <div class="loading-spinner-container">
    <div class="spinner-wrapper">
      <!-- Main spinner -->
      <svg
          :class="['spinner', sizeClasses[size]]"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
      >
        <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
        />
        <path
            class="opacity-75"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            fill="currentColor"
        />
      </svg>

      <!-- Progress indicator -->
      <div v-if="progress !== null" class="progress-ring">
        <svg :class="['progress-svg', sizeClasses[size]]" viewBox="0 0 36 36">
          <path
              class="progress-bg"
              d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke-width="3"
          />
          <path
              :stroke-dasharray="`${progress}, 100`"
              class="progress-fill"
              d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke-linecap="round"
              stroke-width="3"
          />
        </svg>
        <span class="progress-text">{{ Math.round(progress) }}%</span>
      </div>
    </div>

    <!-- Text label -->
    <p v-if="text" class="loading-text">{{ text }}</p>

    <!-- Slot for custom content -->
    <slot/>
  </div>
</template>

<style scoped>
.loading-spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.spinner-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  animation: spin 1s linear infinite;
  color: var(--info);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.progress-ring {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-svg {
  transform: rotate(-90deg);
}

.progress-bg {
  stroke: var(--border-primary);
}

.progress-fill {
  stroke: var(--info);
  transition: stroke-dasharray 0.3s ease;
}

.progress-text {
  position: absolute;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--info);
}

.loading-text {
  color: var(--text-tertiary);
  font-size: 0.875rem;
  text-align: center;
  margin: 0;
}
</style>
