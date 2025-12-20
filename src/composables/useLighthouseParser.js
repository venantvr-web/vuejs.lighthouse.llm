import { ref } from 'vue'

/**
 * Composable for parsing Lighthouse JSON reports
 */
export function useLighthouseParser() {
  const error = ref(null)

  /**
   * Validate and parse a Lighthouse report JSON
   * @param {string|object} json - Lighthouse report JSON string or object
   * @returns {object|null} Parsed report or null if invalid
   */
  function parseReport(json) {
    error.value = null

    try {
      const report = typeof json === 'string' ? JSON.parse(json) : json

      // Validate basic Lighthouse structure
      if (!report.lighthouseVersion) {
        throw new Error('Invalid Lighthouse report: missing lighthouseVersion')
      }

      if (!report.categories || !report.audits) {
        throw new Error('Invalid Lighthouse report: missing categories or audits')
      }

      if (!report.finalDisplayedUrl && !report.finalUrl && !report.requestedUrl) {
        throw new Error('Invalid Lighthouse report: missing URL information')
      }

      return report
    } catch (err) {
      error.value = err.message
      console.error('Failed to parse Lighthouse report:', err)
      return null
    }
  }

  /**
   * Extract category data including scores, audits, and weights
   * @param {object} category - Category object from Lighthouse report
   * @returns {object} Extracted category data
   */
  function extractCategoryData(category) {
    if (!category) {
      return null
    }

    return {
      id: category.id,
      title: category.title,
      description: category.description,
      score: category.score,
      manualDescription: category.manualDescription,
      auditRefs: category.auditRefs?.map(ref => ({
        id: ref.id,
        weight: ref.weight,
        group: ref.group,
        acronym: ref.acronym
      })) || []
    }
  }

  /**
   * Get Core Web Vitals with ratings
   * @param {object} report - Lighthouse report object
   * @returns {object} Core Web Vitals data with ratings
   */
  function getCoreWebVitals(report) {
    if (!report || !report.audits) {
      return null
    }

    const audits = report.audits

    const getMetricData = (auditId) => {
      const audit = audits[auditId]
      if (!audit) return null

      const value = audit.numericValue
      const displayValue = audit.displayValue
      const score = audit.score

      return {
        value,
        displayValue,
        score,
        rating: getRating(score)
      }
    }

    const getRating = (score) => {
      if (score === null || score === undefined) return 'unknown'
      if (score >= 0.9) return 'good'
      if (score >= 0.5) return 'needs-improvement'
      return 'poor'
    }

    return {
      lcp: getMetricData('largest-contentful-paint'),
      cls: getMetricData('cumulative-layout-shift'),
      tbt: getMetricData('total-blocking-time'),
      fcp: getMetricData('first-contentful-paint'),
      inp: getMetricData('interaction-to-next-paint') || getMetricData('max-potential-fid'),
      si: getMetricData('speed-index'),
      tti: getMetricData('interactive')
    }
  }

  /**
   * Get opportunities sorted by impact (savings)
   * @param {object} report - Lighthouse report object
   * @returns {array} Array of opportunities sorted by potential savings
   */
  function getOpportunities(report) {
    if (!report || !report.audits) {
      return []
    }

    const opportunities = []

    Object.entries(report.audits).forEach(([id, audit]) => {
      // Opportunities have details.type === 'opportunity' or have overallSavingsMs
      if (
        audit.details?.type === 'opportunity' ||
        audit.details?.overallSavingsMs !== undefined ||
        audit.scoreDisplayMode === 'numeric' && audit.score !== null && audit.score < 1
      ) {
        opportunities.push({
          id,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          displayValue: audit.displayValue,
          numericValue: audit.numericValue,
          numericUnit: audit.numericUnit,
          savings: {
            ms: audit.details?.overallSavingsMs || 0,
            bytes: audit.details?.overallSavingsBytes || 0
          },
          details: audit.details,
          warnings: audit.warnings
        })
      }
    })

    // Sort by time savings (ms), then by byte savings
    return opportunities.sort((a, b) => {
      if (b.savings.ms !== a.savings.ms) {
        return b.savings.ms - a.savings.ms
      }
      return b.savings.bytes - a.savings.bytes
    })
  }

  /**
   * Get diagnostic information
   * @param {object} report - Lighthouse report object
   * @returns {array} Array of diagnostic audits
   */
  function getDiagnostics(report) {
    if (!report || !report.audits) {
      return []
    }

    const diagnostics = []

    Object.entries(report.audits).forEach(([id, audit]) => {
      // Diagnostics have details but are not opportunities
      if (
        audit.details &&
        audit.details.type !== 'opportunity' &&
        audit.scoreDisplayMode !== 'notApplicable' &&
        (audit.score === null || audit.score < 1)
      ) {
        diagnostics.push({
          id,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          scoreDisplayMode: audit.scoreDisplayMode,
          displayValue: audit.displayValue,
          details: audit.details,
          warnings: audit.warnings
        })
      }
    })

    return diagnostics
  }

  /**
   * Get failed audits for a specific category
   * @param {object} report - Lighthouse report object
   * @param {string} categoryId - Category ID (e.g., 'performance', 'accessibility')
   * @returns {array} Array of failed audits (score < 0.9)
   */
  function getFailedAudits(report, categoryId) {
    if (!report || !report.categories || !report.audits) {
      return []
    }

    const category = report.categories[categoryId]
    if (!category || !category.auditRefs) {
      return []
    }

    const failedAudits = []

    category.auditRefs.forEach(auditRef => {
      const audit = report.audits[auditRef.id]
      if (audit && audit.score !== null && audit.score < 0.9) {
        failedAudits.push({
          id: auditRef.id,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          scoreDisplayMode: audit.scoreDisplayMode,
          displayValue: audit.displayValue,
          weight: auditRef.weight,
          group: auditRef.group,
          details: audit.details,
          explanation: audit.explanation,
          warnings: audit.warnings
        })
      }
    })

    // Sort by score (lowest first), then by weight (highest first)
    return failedAudits.sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score
      }
      return (b.weight || 0) - (a.weight || 0)
    })
  }

  return {
    error: error,
    parseReport,
    extractCategoryData,
    getCoreWebVitals,
    getOpportunities,
    getDiagnostics,
    getFailedAudits
  }
}
