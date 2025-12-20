/**
 * PageSpeed Insights API Service
 * Uses Google's PageSpeed Insights API to run Lighthouse audits
 * Returns the same JSON format as Lighthouse CLI
 */

const PSI_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

/**
 * Default categories to analyze
 */
export const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa']

/**
 * Available strategies
 */
export const STRATEGIES = {
  MOBILE: 'mobile',
  DESKTOP: 'desktop'
}

/**
 * Analyze a URL using PageSpeed Insights API
 * @param {string} url - URL to analyze
 * @param {object} options - Analysis options
 * @param {string} options.strategy - 'mobile' or 'desktop' (default: 'mobile')
 * @param {string[]} options.categories - Categories to analyze (default: all)
 * @param {string} options.apiKey - Optional API key for higher quota
 * @param {AbortSignal} options.signal - Optional abort signal for cancellation
 * @returns {Promise<object>} Lighthouse report JSON
 */
export async function analyzeUrl(url, options = {}) {
  const {
    strategy = STRATEGIES.MOBILE,
    categories = CATEGORIES,
    apiKey = null,
    signal = null
  } = options

  // Validate URL
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required')
  }

  // Ensure URL has protocol
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  // Validate URL format
  try {
    new URL(normalizedUrl)
  } catch {
    throw new Error('Invalid URL format')
  }

  // Build query parameters
  const params = new URLSearchParams()
  params.append('url', normalizedUrl)
  params.append('strategy', strategy)

  // Add each category separately (API expects multiple category params)
  categories.forEach(cat => params.append('category', cat))

  // Add API key if provided
  if (apiKey) {
    params.append('key', apiKey)
  }

  const apiUrl = `${PSI_API}?${params.toString()}`

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      signal
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      throw new Error(errorMessage)
    }

    const data = await response.json()

    // Check for API errors
    if (data.error) {
      throw new Error(data.error.message || 'PageSpeed Insights API error')
    }

    // Extract Lighthouse result (same format as Lighthouse CLI JSON output)
    if (!data.lighthouseResult) {
      throw new Error('No Lighthouse result in API response')
    }

    return data.lighthouseResult
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Analysis cancelled')
    }
    throw error
  }
}

/**
 * Check if the API is available and working
 * @returns {Promise<boolean>}
 */
export async function checkApiHealth() {
  try {
    // Make a minimal request to check API availability
    const params = new URLSearchParams({
      url: 'https://example.com',
      category: 'performance',
      strategy: 'desktop'
    })

    const response = await fetch(`${PSI_API}?${params.toString()}`, {
      method: 'GET'
    })

    return response.ok
  } catch {
    return false
  }
}

/**
 * Get estimated analysis time based on categories
 * @param {string[]} categories - Categories to analyze
 * @returns {number} Estimated time in seconds
 */
export function getEstimatedTime(categories = CATEGORIES) {
  // Base time + additional time per category
  const baseTime = 15
  const perCategory = 5
  return baseTime + (categories.length * perCategory)
}

export default {
  analyzeUrl,
  checkApiHealth,
  getEstimatedTime,
  CATEGORIES,
  STRATEGIES
}
