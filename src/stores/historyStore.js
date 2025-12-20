import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Store for managing analysis history
 */
export const useHistoryStore = defineStore('history', () => {
  const STORAGE_KEY = 'lighthouse-history'
  const MAX_ENTRIES = 100

  // State
  const analyses = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const sortedByDate = computed(() => {
    return [...analyses.value].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp)
    })
  })

  const groupedByUrl = computed(() => {
    const grouped = {}

    analyses.value.forEach(analysis => {
      const url = analysis.url || 'Unknown URL'
      if (!grouped[url]) {
        grouped[url] = []
      }
      grouped[url].push(analysis)
    })

    // Sort analyses within each group by date
    Object.keys(grouped).forEach(url => {
      grouped[url].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp)
      })
    })

    return grouped
  })

  const recentUrls = computed(() => {
    const urlMap = new Map()

    // Use sortedByDate to get most recent analyses first
    sortedByDate.value.forEach(analysis => {
      const url = analysis.url || 'Unknown URL'
      if (!urlMap.has(url)) {
        urlMap.set(url, analysis)
      }
    })

    return Array.from(urlMap.values()).slice(0, 10)
  })

  const count = computed(() => analyses.value.length)

  const isEmpty = computed(() => analyses.value.length === 0)

  // Actions
  /**
   * Add a new analysis to history
   * @param {object} analysis - Analysis data
   * @returns {string} Analysis ID
   */
  function addAnalysis(analysis) {
    try {
      // Generate unique ID
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      const entry = {
        id,
        timestamp: new Date().toISOString(),
        url: analysis.url || null,
        fileName: analysis.fileName || null,
        scores: analysis.scores || null,
        coreWebVitals: analysis.coreWebVitals || null,
        opportunities: analysis.opportunities || [],
        failedAudits: analysis.failedAudits || [],
        analysis: analysis.analysis || '',
        llmProvider: analysis.llmProvider || null,
        llmModel: analysis.llmModel || null,
        lighthouseVersion: analysis.lighthouseVersion || null
      }

      // Add to beginning of array
      analyses.value.unshift(entry)

      // Limit to MAX_ENTRIES
      if (analyses.value.length > MAX_ENTRIES) {
        analyses.value = analyses.value.slice(0, MAX_ENTRIES)
      }

      // Save to localStorage
      saveHistory()

      return id
    } catch (err) {
      error.value = err.message || 'Failed to add analysis'
      console.error('Failed to add analysis:', err)
      return null
    }
  }

  /**
   * Remove an analysis by ID
   * @param {string} id - Analysis ID
   * @returns {boolean} True if successful
   */
  function removeAnalysis(id) {
    try {
      const index = analyses.value.findIndex(a => a.id === id)
      if (index === -1) {
        throw new Error('Analysis not found')
      }

      analyses.value.splice(index, 1)
      saveHistory()

      return true
    } catch (err) {
      error.value = err.message || 'Failed to remove analysis'
      console.error('Failed to remove analysis:', err)
      return false
    }
  }

  /**
   * Get analysis by ID
   * @param {string} id - Analysis ID
   * @returns {object|null} Analysis or null
   */
  function getAnalysis(id) {
    return analyses.value.find(a => a.id === id) || null
  }

  /**
   * Get analyses for a specific URL
   * @param {string} url - URL to filter by
   * @returns {array} Array of analyses
   */
  function getAnalysesByUrl(url) {
    return analyses.value
      .filter(a => a.url === url)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  /**
   * Get analyses within a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {array} Array of analyses
   */
  function getAnalysesByDateRange(startDate, endDate) {
    return analyses.value.filter(a => {
      const timestamp = new Date(a.timestamp)
      return timestamp >= startDate && timestamp <= endDate
    })
  }

  /**
   * Clear all history
   */
  function clearHistory() {
    analyses.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * Clear history older than specified days
   * @param {number} days - Number of days to keep
   */
  function clearOldHistory(days = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const before = analyses.value.length
    analyses.value = analyses.value.filter(a => {
      return new Date(a.timestamp) >= cutoffDate
    })

    const removed = before - analyses.value.length
    if (removed > 0) {
      saveHistory()
    }

    return removed
  }

  /**
   * Update an existing analysis
   * @param {string} id - Analysis ID
   * @param {object} updates - Updates to apply
   * @returns {boolean} True if successful
   */
  function updateAnalysis(id, updates) {
    try {
      const index = analyses.value.findIndex(a => a.id === id)
      if (index === -1) {
        throw new Error('Analysis not found')
      }

      analyses.value[index] = {
        ...analyses.value[index],
        ...updates,
        // Don't allow changing these fields
        id: analyses.value[index].id,
        timestamp: analyses.value[index].timestamp
      }

      saveHistory()
      return true
    } catch (err) {
      error.value = err.message || 'Failed to update analysis'
      console.error('Failed to update analysis:', err)
      return false
    }
  }

  /**
   * Get statistics about the history
   * @returns {object} Statistics
   */
  function getStatistics() {
    if (analyses.value.length === 0) {
      return {
        totalAnalyses: 0,
        uniqueUrls: 0,
        dateRange: null,
        averageScores: null
      }
    }

    const uniqueUrls = new Set(analyses.value.map(a => a.url).filter(Boolean))
    const timestamps = analyses.value.map(a => new Date(a.timestamp))
    const oldestDate = new Date(Math.min(...timestamps))
    const newestDate = new Date(Math.max(...timestamps))

    // Calculate average scores
    const scoresByCategory = {}
    let scoreCount = 0

    analyses.value.forEach(analysis => {
      if (analysis.scores) {
        Object.entries(analysis.scores).forEach(([category, score]) => {
          if (!scoresByCategory[category]) {
            scoresByCategory[category] = { total: 0, count: 0 }
          }
          scoresByCategory[category].total += score
          scoresByCategory[category].count += 1
        })
        scoreCount++
      }
    })

    const averageScores = {}
    Object.entries(scoresByCategory).forEach(([category, data]) => {
      averageScores[category] = data.total / data.count
    })

    return {
      totalAnalyses: analyses.value.length,
      uniqueUrls: uniqueUrls.size,
      dateRange: {
        oldest: oldestDate.toISOString(),
        newest: newestDate.toISOString()
      },
      averageScores: scoreCount > 0 ? averageScores : null
    }
  }

  /**
   * Save history to localStorage
   */
  function saveHistory() {
    try {
      // Only save essential data to reduce localStorage size
      const dataToSave = analyses.value.map(a => ({
        id: a.id,
        timestamp: a.timestamp,
        url: a.url,
        fileName: a.fileName,
        scores: a.scores,
        coreWebVitals: a.coreWebVitals,
        // Store only top 5 opportunities and failed audits
        opportunities: a.opportunities?.slice(0, 5) || [],
        failedAudits: a.failedAudits?.slice(0, 5) || [],
        // Store truncated analysis (first 500 chars)
        analysis: a.analysis ? a.analysis.substring(0, 500) : '',
        llmProvider: a.llmProvider,
        llmModel: a.llmModel,
        lighthouseVersion: a.lighthouseVersion
      }))

      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    } catch (err) {
      // Handle quota exceeded error
      if (err.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, removing oldest entries')
        // Remove oldest entries and try again
        analyses.value = analyses.value.slice(0, Math.floor(MAX_ENTRIES / 2))
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses.value))
        } catch (retryErr) {
          console.error('Failed to save history even after cleanup:', retryErr)
        }
      } else {
        console.error('Failed to save history:', err)
      }
    }
  }

  /**
   * Load history from localStorage
   */
  function loadHistory() {
    loading.value = true
    error.value = null

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        loading.value = false
        return
      }

      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        analyses.value = parsed
      }

      loading.value = false
    } catch (err) {
      error.value = err.message || 'Failed to load history'
      console.error('Failed to load history:', err)
      loading.value = false
    }
  }

  /**
   * Export history as JSON
   * @returns {string} JSON string
   */
  function exportHistory() {
    return JSON.stringify(analyses.value, null, 2)
  }

  /**
   * Import history from JSON
   * @param {string} json - JSON string
   * @returns {boolean} True if successful
   */
  function importHistory(json) {
    try {
      const parsed = JSON.parse(json)
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid history format')
      }

      // Validate entries
      const valid = parsed.every(entry => {
        return entry.id && entry.timestamp
      })

      if (!valid) {
        throw new Error('Invalid history entries')
      }

      // Merge with existing history (avoid duplicates)
      const existingIds = new Set(analyses.value.map(a => a.id))
      const newEntries = parsed.filter(entry => !existingIds.has(entry.id))

      analyses.value = [...analyses.value, ...newEntries]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, MAX_ENTRIES)

      saveHistory()
      return true
    } catch (err) {
      error.value = err.message || 'Failed to import history'
      console.error('Failed to import history:', err)
      return false
    }
  }

  // Initialize
  loadHistory()

  return {
    // State
    analyses,
    loading,
    error,

    // Getters
    sortedByDate,
    groupedByUrl,
    recentUrls,
    count,
    isEmpty,

    // Actions
    addAnalysis,
    removeAnalysis,
    getAnalysis,
    getAnalysesByUrl,
    getAnalysesByDateRange,
    clearHistory,
    clearOldHistory,
    updateAnalysis,
    getStatistics,
    saveHistory,
    loadHistory,
    exportHistory,
    importHistory
  }
})
