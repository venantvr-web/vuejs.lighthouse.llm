<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'error',
    validator: (value) => ['error', 'warning', 'info', 'success'].includes(value)
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  dismissible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['dismiss'])

const typeConfig = computed(() => {
  const configs = {
    error: {
      bgClass: 'bg-red-50 dark:bg-red-900/20',
      borderClass: 'border-red-200 dark:border-red-800',
      iconClass: 'text-red-500',
      titleClass: 'text-red-800 dark:text-red-200',
      textClass: 'text-red-700 dark:text-red-300',
      icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    warning: {
      bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderClass: 'border-yellow-200 dark:border-yellow-800',
      iconClass: 'text-yellow-500',
      titleClass: 'text-yellow-800 dark:text-yellow-200',
      textClass: 'text-yellow-700 dark:text-yellow-300',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    },
    info: {
      bgClass: 'bg-blue-50 dark:bg-blue-900/20',
      borderClass: 'border-blue-200 dark:border-blue-800',
      iconClass: 'text-blue-500',
      titleClass: 'text-blue-800 dark:text-blue-200',
      textClass: 'text-blue-700 dark:text-blue-300',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    success: {
      bgClass: 'bg-green-50 dark:bg-green-900/20',
      borderClass: 'border-green-200 dark:border-green-800',
      iconClass: 'text-green-500',
      titleClass: 'text-green-800 dark:text-green-200',
      textClass: 'text-green-700 dark:text-green-300',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  }
  return configs[props.type]
})

function handleDismiss() {
  emit('dismiss')
}
</script>

<template>
  <div
    class="alert-container"
    :class="[typeConfig.bgClass, typeConfig.borderClass]"
    role="alert"
  >
    <div class="alert-content">
      <!-- Icon -->
      <div class="alert-icon" :class="typeConfig.iconClass">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            :d="typeConfig.icon"
          />
        </svg>
      </div>

      <!-- Content -->
      <div class="alert-body">
        <h3 v-if="title" class="alert-title" :class="typeConfig.titleClass">
          {{ title }}
        </h3>
        <p v-if="message" class="alert-message" :class="typeConfig.textClass">
          {{ message }}
        </p>
        <slot />
      </div>

      <!-- Dismiss button -->
      <button
        v-if="dismissible"
        type="button"
        class="dismiss-button"
        :class="typeConfig.iconClass"
        @click="handleDismiss"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.alert-container {
  border: 1px solid;
  border-radius: 8px;
  padding: 16px;
}

.alert-content {
  display: flex;
  gap: 12px;
}

.alert-icon {
  flex-shrink: 0;
}

.alert-body {
  flex: 1;
  min-width: 0;
}

.alert-title {
  font-weight: 600;
  font-size: 0.875rem;
  margin: 0 0 4px 0;
}

.alert-message {
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.5;
}

.dismiss-button {
  flex-shrink: 0;
  padding: 4px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.dismiss-button:hover {
  opacity: 1;
}
</style>
