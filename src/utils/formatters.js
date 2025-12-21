/**
 * Centralized formatting utilities for Lighthouse scores and dates
 * @module utils/formatters
 */

// ============================================
// Score Formatting
// ============================================

/**
 * Format a Lighthouse score (0-1 scale) to display value
 * @param {number|null|undefined} score - Score between 0 and 1
 * @returns {string} Formatted score (0-100) or '-' if invalid
 */
export function formatScore(score) {
  if (score === null || score === undefined) return '-'
  return Math.round(score * 100).toString()
}

/**
 * Format a Lighthouse score with percentage suffix
 * @param {number|null|undefined} score - Score between 0 and 1
 * @returns {string} Formatted score with '%' or '-' if invalid
 */
export function formatScorePercent(score) {
  if (score === null || score === undefined) return '-'
  return `${Math.round(score * 100)}%`
}

/**
 * Format a score with status label in French
 * @param {number|null|undefined} score - Score between 0 and 1
 * @returns {string} Score with status (e.g., "95% Bon")
 */
export function formatScoreWithStatus(score) {
  if (score === null || score === undefined) return '-'
  const value = Math.round(score * 100)
  if (value >= 90) return `${value}% Bon`
  if (value >= 50) return `${value}% Moyen`
  return `${value}% Faible`
}

// ============================================
// Score Colors (Tailwind classes)
// ============================================

/**
 * Get Tailwind text color class based on score
 * @param {number|null|undefined} score - Score between 0 and 1
 * @returns {string} Tailwind CSS class
 */
export function getScoreColorClass(score) {
  if (score === null || score === undefined) return 'text-gray-400 dark:text-gray-500'
  const value = score * 100
  if (value >= 90) return 'text-emerald-500'
  if (value >= 50) return 'text-amber-500'
  return 'text-red-500'
}

/**
 * Get Tailwind background color class based on score
 * @param {number|null|undefined} score - Score between 0 and 1
 * @returns {string} Tailwind CSS class
 */
export function getScoreBgClass(score) {
  if (score === null || score === undefined) return 'bg-gray-200 dark:bg-gray-700'
  const value = score * 100
  if (value >= 90) return 'bg-emerald-500'
  if (value >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

/**
 * Get hex color for score (for PDFs, charts, etc.)
 * @param {number|null|undefined} score - Score between 0 and 1
 * @returns {string} Hex color code
 */
export function getScoreHexColor(score) {
  if (score === null || score === undefined) return '#9ca3af' // gray-400
  if (score >= 0.9) return '#10b981' // emerald-500
  if (score >= 0.5) return '#f59e0b' // amber-500
  return '#ef4444' // red-500
}

/**
 * Get CSS class name for score (legacy support)
 * @param {number|null|undefined} score - Score between 0 and 1
 * @returns {string} CSS class name
 */
export function getScoreCssClass(score) {
  if (score === null || score === undefined) return ''
  if (score >= 0.9) return 'score-good'
  if (score >= 0.5) return 'score-average'
  return 'score-poor'
}

// ============================================
// Date Formatting
// ============================================

/**
 * Format timestamp to date string (French locale)
 * @param {number|string|Date|null|undefined} timestamp - Timestamp or Date
 * @param {Intl.DateTimeFormatOptions} options - Optional format options
 * @returns {string} Formatted date or '-' if invalid
 */
export function formatDate(timestamp, options = {}) {
  if (!timestamp) return '-'
  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }
  return new Date(timestamp).toLocaleDateString('fr-FR', { ...defaultOptions, ...options })
}

/**
 * Format timestamp to date and time string (French locale)
 * @param {number|string|Date|null|undefined} timestamp - Timestamp or Date
 * @param {Intl.DateTimeFormatOptions} options - Optional format options
 * @returns {string} Formatted date/time or '-' if invalid
 */
export function formatDateTime(timestamp, options = {}) {
  if (!timestamp) return '-'
  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  return new Date(timestamp).toLocaleString('fr-FR', { ...defaultOptions, ...options })
}

/**
 * Format timestamp to medium date with short time
 * @param {number|string|Date|null|undefined} timestamp - Timestamp or Date
 * @returns {string} Formatted date/time or '-' if invalid
 */
export function formatDateTimeMedium(timestamp) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

/**
 * Format timestamp to relative time (e.g., "Il y a 2h")
 * @param {number|string|Date|null|undefined} timestamp - Timestamp or Date
 * @returns {string} Relative time string or '-' if invalid
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '-'

  const now = Date.now()
  const date = new Date(timestamp).getTime()
  const diff = now - date

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'A l\'instant'
  if (minutes < 60) return `Il y a ${minutes}min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days < 7) return `Il y a ${days}j`
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`

  return formatDate(timestamp)
}

/**
 * Format timestamp to ISO date string (for file names)
 * @param {number|string|Date|null|undefined} timestamp - Timestamp or Date
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
export function formatDateISO(timestamp) {
  return new Date(timestamp || Date.now()).toISOString().split('T')[0]
}

/**
 * Format timestamp to full ISO string
 * @param {number|string|Date|null|undefined} timestamp - Timestamp or Date
 * @returns {string} Full ISO string
 */
export function formatDateTimeISO(timestamp) {
  return new Date(timestamp || Date.now()).toISOString()
}

// ============================================
// Metric Formatting
// ============================================

/**
 * Format milliseconds to human readable string
 * @param {number|null|undefined} ms - Milliseconds
 * @returns {string} Formatted time (e.g., "2.5s" or "150ms")
 */
export function formatMetric(ms) {
  if (ms === null || ms === undefined) return '-'
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  return `${Math.round(ms)}ms`
}

/**
 * Format bytes to human readable size
 * @param {number|null|undefined} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "1.5MB")
 */
export function formatSize(bytes) {
  if (bytes === null || bytes === undefined) return '-'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

/**
 * Format number with locale-specific separators
 * @param {number|null|undefined} value - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}
