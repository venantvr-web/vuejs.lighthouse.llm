/**
 * Local Lighthouse Service
 * Client for the local Lighthouse server
 */

const LOCAL_API = 'http://localhost:3001'

/**
 * Analysis strategies
 */
export const STRATEGIES = {
    MOBILE: 'mobile',
    DESKTOP: 'desktop'
}

/**
 * Check if the local server is running and healthy
 * @returns {Promise<{available: boolean, chromium: boolean}>}
 */
export async function checkServerHealth() {
    try {
        const response = await fetch(`${LOCAL_API}/health`, {
            method: 'GET',
            headers: {'Accept': 'application/json'}
        })

        if (!response.ok) {
            return {available: false, chromium: false}
        }

        const data = await response.json()
        return {
            available: data.status === 'ok',
            chromium: data.chromium === true
        }
    } catch {
        return {available: false, chromium: false}
    }
}

/**
 * Analyze a URL using local Lighthouse
 * @param {string} url - URL to analyze
 * @param {Object} options - Analysis options
 * @param {string} options.strategy - 'mobile' or 'desktop'
 * @param {string[]} options.categories - Categories to audit
 * @param {AbortSignal} options.signal - Abort signal for cancellation
 * @returns {Promise<Object>} Lighthouse report
 */
export async function analyzeUrl(url, options = {}) {
    const {strategy = STRATEGIES.MOBILE, categories, signal} = options

    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl
    }

    const response = await fetch(`${LOCAL_API}/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            url: normalizedUrl,
            strategy,
            categories
        }),
        signal
    })

    if (!response.ok) {
        let errorMessage = 'Analyse echouee'
        try {
            const error = await response.json()
            errorMessage = error.error || errorMessage
        } catch {
            // Ignore JSON parse errors
        }
        throw new Error(errorMessage)
    }

    return response.json()
}

/**
 * Get available categories from the server
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function getCategories() {
    try {
        const response = await fetch(`${LOCAL_API}/categories`)
        const data = await response.json()
        return data.categories
    } catch {
        // Return default categories if server is not available
        return [
            {id: 'performance', name: 'Performance'},
            {id: 'accessibility', name: 'Accessibilite'},
            {id: 'best-practices', name: 'Bonnes Pratiques'},
            {id: 'seo', name: 'SEO'},
            {id: 'pwa', name: 'PWA'}
        ]
    }
}

/**
 * Estimate analysis time based on categories
 * Local Lighthouse is generally faster than PageSpeed Insights
 * @param {string[]} categories - Categories to audit
 * @returns {number} Estimated time in seconds
 */
export function getEstimatedTime(categories = []) {
    const baseTime = 10 // Base time in seconds
    const perCategory = 3 // Additional time per category

    const categoryCount = categories.length || 5
    return baseTime + (categoryCount * perCategory)
}
