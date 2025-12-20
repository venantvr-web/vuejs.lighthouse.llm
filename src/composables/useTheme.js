import { ref, computed, watch, onMounted } from 'vue'

/**
 * Composable for managing dark/light/system theme
 */
export function useTheme() {
  const STORAGE_KEY = 'lighthouse-theme'
  const theme = ref('system') // 'light' | 'dark' | 'system'
  const systemPreference = ref('light')

  /**
   * Get the resolved theme (actual theme to apply)
   */
  const resolvedTheme = computed(() => {
    if (theme.value === 'system') {
      return systemPreference.value
    }
    return theme.value
  })

  /**
   * Set the theme mode
   * @param {string} mode - 'light' | 'dark' | 'system'
   */
  function setTheme(mode) {
    if (!['light', 'dark', 'system'].includes(mode)) {
      console.error('Invalid theme mode:', mode)
      return
    }

    theme.value = mode
    localStorage.setItem(STORAGE_KEY, mode)
    applyTheme()
  }

  /**
   * Apply the resolved theme to the document
   */
  function applyTheme() {
    const root = document.documentElement
    const isDark = resolvedTheme.value === 'dark'

    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Update color-scheme for native browser elements
    root.style.colorScheme = isDark ? 'dark' : 'light'
  }

  /**
   * Update system preference based on media query
   */
  function updateSystemPreference() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    systemPreference.value = isDark ? 'dark' : 'light'
  }

  /**
   * Initialize theme from localStorage and system preference
   */
  function initTheme() {
    // Get stored theme or default to 'system'
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      theme.value = stored
    }

    // Get system preference
    updateSystemPreference()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateSystemPreference)
    } else if (mediaQuery.addListener) {
      // Legacy browsers
      mediaQuery.addListener(updateSystemPreference)
    }

    // Apply initial theme
    applyTheme()
  }

  /**
   * Toggle between light and dark (skip system)
   */
  function toggleTheme() {
    const current = resolvedTheme.value
    setTheme(current === 'dark' ? 'light' : 'dark')
  }

  // Watch for theme changes
  watch(resolvedTheme, () => {
    applyTheme()
  })

  // Initialize on mount
  onMounted(() => {
    initTheme()
  })

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    initTheme
  }
}
