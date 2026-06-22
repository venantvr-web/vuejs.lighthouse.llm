/**
 * URL Discovery Service
 * Discovers URLs from a website using various methods
 */

import {getUserAgent, isDirectFetch, proxyUrl} from './requestConfig'

const MAX_PAGES = 20
const proxyEndpointDefault = () => proxyUrl('/api/fetch-page')

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
        proxyEndpoint = proxyEndpointDefault()
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
        proxyEndpoint = proxyEndpointDefault()
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
            // expandSitemap gère les sitemaps index (récursion dans les enfants),
            // contrairement à parseSitemapXml qui n'extrait que les <url>.
            urls = await expandSitemap(sitemapUrl, {maxPages, signal, proxyEndpoint})
            if (urls.length > 0) break
        } catch {
            // Try next sitemap URL
        }
    }

    if (urls.length === 0) {
        throw new Error('Aucun sitemap trouvé ou sitemap vide')
    }

    // Limit to maxPages
    return urls.slice(0, maxPages)
}

/**
 * Heuristique : l'URL désigne-t-elle un sitemap (à déplier) plutôt qu'une page ?
 * @param {string} url
 * @returns {boolean}
 */
export function isSitemapUrl(url) {
    try {
        const path = new URL(url).pathname.toLowerCase()
        return path.endsWith('.xml') || path.includes('sitemap')
    } catch {
        return false
    }
}

/**
 * Déplie une URL de sitemap en liste d'URL de pages. Gère un sitemap index en
 * récupérant ses sitemaps enfants (un niveau).
 * @param {string} sitemapUrl - URL du sitemap (ou sitemap index)
 * @param {object} options - { maxPages, signal, proxyEndpoint }
 * @returns {Promise<Array<string>>} URLs de pages
 */
export async function expandSitemap(sitemapUrl, options = {}) {
    const {maxPages = MAX_PAGES, signal = null, proxyEndpoint = proxyEndpointDefault()} = options
    let baseOrigin = null
    try {
        baseOrigin = new URL(sitemapUrl).origin
    } catch {
        return []
    }

    const xml = await fetchPage(sitemapUrl, proxyEndpoint, signal)
    if (!xml) return []

    // Sitemap index : récupérer les sitemaps enfants puis agréger leurs URL
    if (xml.includes('<sitemapindex')) {
        const children = [...xml.matchAll(/<sitemap[^>]*>[\s\S]*?<loc>([^<]+)<\/loc>/gi)].map(m => m[1].trim())
        const urls = []
        for (const child of children) {
            if (signal?.aborted || urls.length >= maxPages) break
            try {
                const childXml = await fetchPage(child, proxyEndpoint, signal)
                if (childXml) urls.push(...parseSitemapXml(childXml, baseOrigin))
            } catch {
                // sitemap enfant illisible : on continue
            }
        }
        return [...new Set(urls)].slice(0, maxPages)
    }

    return parseSitemapXml(xml, baseOrigin).slice(0, maxPages)
}

/**
 * Parse manual URL list
 * @param {string} text - Text containing URLs (one per line)
 * @param {object} options - Options
 * @returns {Array<string>} - Validated URLs
 */
export function parseManualUrls(text, options = {}) {
    const {maxPages = MAX_PAGES} = options

    const urls = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')) // Skip empty lines and comments
        .map(coerceManualScheme) // Tolerate scheme-less hosts (example.com/page)
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
    // Mode direct : requête navigateur sans relais (même origine / CORS autorisé)
    if (isDirectFetch()) {
        const r = await fetch(url, {redirect: 'follow', signal, cache: 'no-store', headers: {'Cache-Control': 'no-cache'}})
        if (!r.ok) throw new Error(`Failed to fetch: ${r.status}`)
        return r.text()
    }

    const response = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({url, userAgent: getUserAgent()}),
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
            if (href.startsWith('//')) {
                // Protocol-relative URL (e.g., //fonts.gstatic.com)
                url = 'https:' + href
            } else if (href.startsWith('/')) {
                // Relative path (e.g., /page)
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
/**
 * Coerce a manually-entered line into a fetchable URL: when no scheme is
 * present but the line looks like a host (contains a dot, or is localhost),
 * prepend https://. Tokens that aren't host-like are left untouched so they
 * get filtered out as invalid.
 * @param {string} line - Raw line
 * @returns {string}
 */
function coerceManualScheme(line) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(line)) return line // already has a scheme
    const host = line.split(/[/?#]/)[0]
    if (host === 'localhost' || /^localhost:\d+$/.test(host) || host.includes('.')) {
        return `https://${line}`
    }
    return line
}

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
    // Extract pathname without query string for extension check
    let pathname = url
    try {
        pathname = new URL(url).pathname
    } catch {
        // Use url as-is if parsing fails
    }

    const excludePatterns = [
        // Asset extensions (check on pathname to handle query strings)
        /\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|woff2|ttf|eot|pdf|zip|rar|mp3|mp4|webm|ogg|wav)$/i,
        // WordPress/CMS admin paths
        /\/(wp-admin|wp-includes|wp-content\/plugins|wp-content\/themes|admin|backend|api|cdn-cgi)\//i,
        // Feed/sitemap paths
        /\/(feed|rss|atom|sitemap)\/?$/i,
        // Action parameters
        /[?&](add-to-cart|action=|ajax|callback=)/i
    ]

    // Test pathname for extensions, full url for other patterns
    return excludePatterns[0].test(pathname) ||
           excludePatterns.slice(1).some(pattern => pattern.test(url))
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
