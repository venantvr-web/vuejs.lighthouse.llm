import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useIndexedDB } from '@/composables/useIndexedDB'

const DB_NAME = 'lighthouse-history'
const DB_VERSION = 1
const STORE_NAME = 'scores'

/**
 * Extract domain from URL
 * @param {string} url - Full URL
 * @returns {string} Domain name
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return url
  }
}

/**
 * Store for managing Lighthouse score history with IndexedDB
 */
export const useScoreHistoryStore = defineStore('scoreHistory', () => {
  const indexedDB = useIndexedDB(DB_NAME, DB_VERSION)

  // State
  const domains = ref([])
  const currentDomain = ref(null)
  const currentScores = ref([])
  const loading = ref(false)
  const error = ref(null)
  const initialized = ref(false)

  // Getters
  const sortedDomains = computed(() => {
    return [...domains.value].sort((a, b) => b.lastAnalysis - a.lastAnalysis)
  })

  const domainCount = computed(() => domains.value.length)

  const totalAnalyses = computed(() => {
    return domains.value.reduce((sum, d) => sum + d.count, 0)
  })

  const isEmpty = computed(() => domains.value.length === 0)

  const currentDomainScores = computed(() => {
    return [...currentScores.value].sort((a, b) => b.timestamp - a.timestamp)
  })

  const latestScoreForCurrentDomain = computed(() => {
    if (currentScores.value.length === 0) return null
    return currentDomainScores.value[0]
  })

  // Actions

  /**
   * Initialize the database
   */
  async function initialize() {
    if (initialized.value) return

    loading.value = true
    error.value = null

    try {
      await indexedDB.open((db) => {
        // Create object store on first open
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('domain', 'domain', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('domain_timestamp', ['domain', 'timestamp'], { unique: false })
        }
      })

      // Load domains list
      await loadDomains()
      initialized.value = true
    } catch (err) {
      error.value = err.message
      console.error('Failed to initialize score history:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Load list of domains with their analysis counts
   */
  async function loadDomains() {
    try {
      const allScores = await indexedDB.getAll(STORE_NAME)

      // Group by domain
      const domainMap = new Map()

      for (const score of allScores) {
        if (!domainMap.has(score.domain)) {
          domainMap.set(score.domain, {
            domain: score.domain,
            count: 0,
            lastAnalysis: 0,
            latestScores: null
          })
        }

        const domainData = domainMap.get(score.domain)
        domainData.count++

        if (score.timestamp > domainData.lastAnalysis) {
          domainData.lastAnalysis = score.timestamp
          domainData.latestScores = score.scores
        }
      }

      domains.value = Array.from(domainMap.values())
    } catch (err) {
      console.error('Failed to load domains:', err)
      throw err
    }
  }

  /**
   * Add a new score entry
   * @param {string} url - Full URL analyzed
   * @param {object} scoreData - Score data
   * @param {object} metadata - Additional metadata
   * @returns {Promise<string>} - ID of the new entry
   */
  async function addScore(url, scoreData, metadata = {}) {
    if (!initialized.value) {
      await initialize()
    }

    const domain = extractDomain(url)
    const id = crypto.randomUUID()
    const timestamp = Date.now()

    const entry = {
      id,
      domain,
      url,
      timestamp,
      source: metadata.source || 'unknown',
      strategy: metadata.strategy || 'mobile',
      scores: scoreData.scores || {},
      coreWebVitals: scoreData.coreWebVitals || {},
      lighthouseVersion: metadata.lighthouseVersion || null
    }

    try {
      await indexedDB.add(STORE_NAME, entry)

      // Update domains list
      await loadDomains()

      // If viewing this domain, refresh scores
      if (currentDomain.value === domain) {
        await loadScoresForDomain(domain)
      }

      return id
    } catch (err) {
      error.value = err.message
      console.error('Failed to add score:', err)
      throw err
    }
  }

  /**
   * Load scores for a specific domain
   * @param {string} domain - Domain name
   */
  async function loadScoresForDomain(domain) {
    if (!initialized.value) {
      await initialize()
    }

    loading.value = true
    currentDomain.value = domain

    try {
      currentScores.value = await indexedDB.getAllByIndex(STORE_NAME, 'domain', domain)
    } catch (err) {
      error.value = err.message
      console.error('Failed to load scores for domain:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete all scores for a domain
   * @param {string} domain - Domain name
   * @returns {Promise<number>} - Number of deleted entries
   */
  async function deleteDomain(domain) {
    if (!initialized.value) {
      await initialize()
    }

    try {
      const count = await indexedDB.removeByIndex(STORE_NAME, 'domain', domain)

      // Clear current if viewing this domain
      if (currentDomain.value === domain) {
        currentDomain.value = null
        currentScores.value = []
      }

      // Reload domains
      await loadDomains()

      return count
    } catch (err) {
      error.value = err.message
      console.error('Failed to delete domain:', err)
      throw err
    }
  }

  /**
   * Delete a single score entry
   * @param {string} id - Entry ID
   */
  async function deleteScore(id) {
    if (!initialized.value) {
      await initialize()
    }

    try {
      await indexedDB.remove(STORE_NAME, id)

      // Reload current domain scores
      if (currentDomain.value) {
        await loadScoresForDomain(currentDomain.value)
      }

      // Reload domains
      await loadDomains()
    } catch (err) {
      error.value = err.message
      console.error('Failed to delete score:', err)
      throw err
    }
  }

  /**
   * Clear all history
   */
  async function clearAll() {
    if (!initialized.value) {
      await initialize()
    }

    try {
      await indexedDB.clear(STORE_NAME)
      domains.value = []
      currentDomain.value = null
      currentScores.value = []
    } catch (err) {
      error.value = err.message
      console.error('Failed to clear history:', err)
      throw err
    }
  }

  /**
   * Export all data or data for a specific domain as JSON
   * @param {string} domain - Optional domain filter
   * @returns {string} JSON string
   */
  async function exportToJSON(domain = null) {
    if (!initialized.value) {
      await initialize()
    }

    try {
      let data
      if (domain) {
        data = await indexedDB.getAllByIndex(STORE_NAME, 'domain', domain)
      } else {
        data = await indexedDB.getAll(STORE_NAME)
      }

      return JSON.stringify({
        exportDate: new Date().toISOString(),
        domain: domain || 'all',
        count: data.length,
        scores: data
      }, null, 2)
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Import data from JSON
   * @param {string} jsonString - JSON data
   * @returns {Promise<number>} - Number of imported entries
   */
  async function importFromJSON(jsonString) {
    if (!initialized.value) {
      await initialize()
    }

    try {
      const data = JSON.parse(jsonString)
      const scores = data.scores || []

      let imported = 0
      for (const score of scores) {
        // Generate new ID to avoid conflicts
        score.id = crypto.randomUUID()
        await indexedDB.add(STORE_NAME, score)
        imported++
      }

      // Reload domains
      await loadDomains()

      return imported
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Get statistics for a domain
   * @param {string} domain - Domain name
   * @returns {object} Statistics
   */
  function getStatistics(domain) {
    const scores = domain ? currentScores.value : []

    if (scores.length === 0) {
      return null
    }

    const categories = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa']
    const stats = {}

    for (const category of categories) {
      const values = scores
        .map(s => s.scores?.[category])
        .filter(v => v !== undefined && v !== null)

      if (values.length > 0) {
        stats[category] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          latest: values[0],
          trend: values.length > 1 ? values[0] - values[values.length - 1] : 0
        }
      }
    }

    return stats
  }

  /**
   * Get chart data for a category
   * @param {string} category - Category name
   * @returns {object} Chart data
   */
  function getChartData(category) {
    const sorted = currentDomainScores.value

    return {
      labels: sorted.map(s => new Date(s.timestamp).toLocaleDateString('fr-FR')),
      datasets: [{
        label: category,
        data: sorted.map(s => (s.scores?.[category] || 0) * 100),
        fill: false,
        tension: 0.3
      }]
    }
  }

  return {
    // State
    domains,
    currentDomain,
    currentScores,
    loading,
    error,
    initialized,

    // Getters
    sortedDomains,
    domainCount,
    totalAnalyses,
    isEmpty,
    currentDomainScores,
    latestScoreForCurrentDomain,

    // Actions
    initialize,
    loadDomains,
    addScore,
    loadScoresForDomain,
    deleteDomain,
    deleteScore,
    clearAll,
    exportToJSON,
    importFromJSON,
    getStatistics,
    getChartData
  }
})
