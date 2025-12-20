/**
 * URL Discovery Service
 * Discovers URLs from a website using various methods
 */

const MAX_PAGES = 20
const DEFAULT_PROXY_ENDPOINT = 'http://localhost:3001/api/fetch-page'

/**
 * Discovery modes
 */
export const DISCOVERY_MODES = {
  AUTO: 'auto',
  SITEMAP: 'sitemap',
  MANUAL: 'manual'
}

/**
 * Discover URLs by crawling links from base URL
 * Requires backend proxy to avoid CORS issues
 * @param {string} baseUrl - Starting URL
 * @param {object} options - Options
 * @returns {Promise<Array<string>>} - Discovered URLs
 */
export async function discoverByLinks(baseUrl, options = {}) {
  const {
    maxPages = MAX_PAGES,
    signal = null,
    onProgress = null,
    proxyEndpoint = DEFAULT_PROXY_ENDPOINT
  } = options

  const baseOrigin = new URL(baseUrl).origin
  const visited = new Set()
  const queue = [normalizeUrl(baseUrl)]
  const discovered = []

  while (queue.length > 0 && discovered.length < maxPages) {
    if (signal?.aborted) {
      throw new Error('Discovery cancelled')
    }

    const url = queue.shift()

    // Skip if already visited
    if (visited.has(url)) continue
    visited.add(url)

    try {
      // Fetch page via proxy to avoid CORS
      const html = await fetchPage(url, proxyEndpoint, signal)

      if (html) {
        // Extract internal links
        const links = extractInternalLinks(html, baseOrigin)

        // Add to discovered
        discovered.push(url)

        // Add new links to queue
        for (const link of links) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link)
          }
        }

        // Progress callback
        if (onProgress) {
          onProgress({
            discovered: discovered.length,
            queued: queue.length,
            current: url
          })
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch ${url}:`, err.message)
      // Continue with other URLs
    }
  }

  return discovered
}

/**
 * Discover URLs from sitemap.xml
 * @param {string} baseUrl - Base URL of the site
 * @param {object} options - Options
 * @returns {Promise<Array<string>>} - URLs from sitemap
 */
export async function discoverBySitemap(baseUrl, options = {}) {
  const {
    maxPages = MAX_PAGES,
    signal = null,
    proxyEndpoint = DEFAULT_PROXY_ENDPOINT
  } = options

  const baseOrigin = new URL(baseUrl).origin
  const sitemapUrls = [
    `${baseOrigin}/sitemap.xml`,
    `${baseOrigin}/sitemap_index.xml`,
    `${baseOrigin}/sitemap/sitemap.xml`
  ]

  let urls = []

  for (const sitemapUrl of sitemapUrls) {
    if (signal?.aborted) {
      throw new Error('Discovery cancelled')
    }

    try {
      const xml = await fetchPage(sitemapUrl, proxyEndpoint, signal)
      if (xml) {
        urls = parseSitemapXml(xml, baseOrigin)
        if (urls.length > 0) break
      }
    } catch {
      // Try next sitemap URL
    }
  }

  if (urls.length === 0) {
    throw new Error('Aucun sitemap trouve ou sitemap vide')
  }

  // Limit to maxPages
  return urls.slice(0, maxPages)
}

/**
 * Parse manual URL list
 * @param {string} text - Text containing URLs (one per line)
 * @param {object} options - Options
 * @returns {Array<string>} - Validated URLs
 */
export function parseManualUrls(text, options = {}) {
  const { maxPages = MAX_PAGES } = options

  const urls = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#')) // Skip empty lines and comments
    .map(normalizeUrl)
    .filter(url => isValidUrl(url))

  // Remove duplicates
  const uniqueUrls = [...new Set(urls)]

  return uniqueUrls.slice(0, maxPages)
}

/**
 * Fetch page content via proxy
 * @param {string} url - URL to fetch
 * @param {string} proxyEndpoint - Proxy endpoint path
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<string>} - Page HTML
 */
async function fetchPage(url, proxyEndpoint, signal) {
  const response = await fetch(proxyEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`)
  }

  const data = await response.json()
  return data.html || data.content
}

/**
 * Extract internal links from HTML
 * @param {string} html - HTML content
 * @param {string} baseOrigin - Base origin for filtering
 * @returns {Array<string>} - Internal URLs
 */
function extractInternalLinks(html, baseOrigin) {
  const links = new Set()

  // Simple regex to find href values
  const hrefRegex = /href=["']([^"']+)["']/gi
  let match

  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1]

    try {
      let url

      // Handle relative URLs
      if (href.startsWith('/')) {
        url = baseOrigin + href
      } else if (href.startsWith('http')) {
        url = href
      } else if (!href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
        url = baseOrigin + '/' + href
      } else {
        continue
      }

      // Parse and validate
      const parsed = new URL(url)

      // Only include same-origin links
      if (parsed.origin === baseOrigin) {
        // Normalize and filter
        const normalized = normalizeUrl(url)

        // Exclude common non-page paths
        if (!shouldExcludeUrl(normalized)) {
          links.add(normalized)
        }
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return Array.from(links)
}

/**
 * Parse sitemap XML content
 * @param {string} xml - XML content
 * @param {string} baseOrigin - Base origin for filtering
 * @returns {Array<string>} - URLs from sitemap
 */
function parseSitemapXml(xml, baseOrigin) {
  const urls = []

  // Check if it's a sitemap index
  if (xml.includes('<sitemapindex')) {
    // Extract sitemap URLs from index
    const locRegex = /<sitemap[^>]*>[\s\S]*?<loc>([^<]+)<\/loc>/gi
    let match
    while ((match = locRegex.exec(xml)) !== null) {
      // Note: Would need to recursively fetch these sitemaps
      // For now, just return what we can parse
    }
  }

  // Extract URLs from urlset
  const locRegex = /<url[^>]*>[\s\S]*?<loc>([^<]+)<\/loc>/gi
  let match

  while ((match = locRegex.exec(xml)) !== null) {
    const url = match[1].trim()
    try {
      const parsed = new URL(url)
      if (parsed.origin === baseOrigin || !baseOrigin) {
        urls.push(normalizeUrl(url))
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return urls
}

/**
 * Normalize URL (remove fragments, normalize slashes, etc.)
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL
 */
function normalizeUrl(url) {
  try {
    const parsed = new URL(url)

    // Remove fragment
    parsed.hash = ''

    // Remove common tracking parameters
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']
    paramsToRemove.forEach(param => parsed.searchParams.delete(param))

    // Normalize path (remove trailing slash except for root)
    let path = parsed.pathname
    if (path !== '/' && path.endsWith('/')) {
      parsed.pathname = path.slice(0, -1)
    }

    return parsed.toString()
  } catch {
    return url
  }
}

/**
 * Check if URL should be excluded (assets, admin, etc.)
 * @param {string} url - URL to check
 * @returns {boolean} - True if should exclude
 */
function shouldExcludeUrl(url) {
  const excludePatterns = [
    /\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|woff2|ttf|eot|pdf|zip|rar)$/i,
    /\/(wp-admin|wp-includes|admin|backend|api|cdn-cgi)\//i,
    /\/(feed|rss|atom|sitemap)\/?$/i,
    /[?&](add-to-cart|action=|ajax)/i
  ]

  return excludePatterns.some(pattern => pattern.test(url))
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Discover URLs using specified mode
 * @param {string} baseUrl - Base URL
 * @param {string} mode - Discovery mode
 * @param {object} options - Options
 * @returns {Promise<Array<string>>} - Discovered URLs
 */
export async function discoverUrls(baseUrl, mode, options = {}) {
  switch (mode) {
    case DISCOVERY_MODES.AUTO:
      return discoverByLinks(baseUrl, options)

    case DISCOVERY_MODES.SITEMAP:
      return discoverBySitemap(baseUrl, options)

    case DISCOVERY_MODES.MANUAL:
      return parseManualUrls(options.urlList || '', options)

    default:
      throw new Error(`Unknown discovery mode: ${mode}`)
  }
}

export default {
  discoverUrls,
  discoverByLinks,
  discoverBySitemap,
  parseManualUrls,
  DISCOVERY_MODES,
  MAX_PAGES
}
