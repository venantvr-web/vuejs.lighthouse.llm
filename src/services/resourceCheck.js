/**
 * SEO/GEO resource checks (robots.txt, sitemaps, llms.txt…).
 *
 * Browsers can't read these files cross-origin (CORS), so availability checks
 * go through the local server proxy (POST /api/fetch-page). The pure parsing
 * helpers below are unit-tested.
 */

const PROXY = 'http://localhost:3001/api/fetch-page'

/**
 * Derive the origin (scheme + host) from a user-supplied URL.
 * @param {string} url - URL or bare host
 * @returns {string} Origin, or '' if invalid
 */
export function originFromUrl(url) {
    let u = (url || '').trim()
    if (!u) return ''
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u
    try {
        return new URL(u).origin
    } catch {
        return ''
    }
}

/**
 * Standard SEO/GEO resources to probe for an origin.
 * @param {string} origin - Site origin
 * @returns {Array<{key: string, label: string, url: string}>}
 */
export function standardResources(origin) {
    const base = origin.replace(/\/$/, '')
    return [
        {key: 'robots', label: 'robots.txt', url: `${base}/robots.txt`},
        {key: 'sitemap', label: 'sitemap.xml', url: `${base}/sitemap.xml`},
        {key: 'sitemap_index', label: 'sitemap_index.xml', url: `${base}/sitemap_index.xml`},
        {key: 'llms', label: 'llms.txt', url: `${base}/llms.txt`},
        {key: 'llms_full', label: 'llms-full.txt', url: `${base}/llms-full.txt`}
    ]
}

/**
 * Extract the Sitemap directives declared in a robots.txt body.
 * @param {string} text - robots.txt content
 * @returns {string[]} Unique sitemap URLs
 */
export function parseSitemapsFromRobots(text) {
    if (!text) return []
    const out = []
    for (const line of String(text).split(/\r?\n/)) {
        const match = line.match(/^\s*sitemap\s*:\s*(\S+)/i)
        if (match) out.push(match[1].trim())
    }
    return [...new Set(out)]
}

/**
 * Inspect a sitemap XML body: kind and number of <loc> entries.
 * @param {string} xml - Sitemap XML
 * @returns {{type: 'index'|'urlset'|'unknown', count: number}}
 */
export function parseSitemapUrls(xml) {
    if (!xml) return {type: 'unknown', count: 0}
    const count = (xml.match(/<loc>/gi) || []).length
    const type = /<sitemapindex/i.test(xml) ? 'index' : (/<urlset/i.test(xml) ? 'urlset' : 'unknown')
    return {type, count}
}

/**
 * Fetch a resource through the local proxy.
 * @param {string} url - Resource URL
 * @returns {Promise<{available: boolean, status: number, content: string, contentType: string, error?: string}>}
 */
export async function fetchResource(url) {
    try {
        const response = await fetch(PROXY, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({url})
        })
        if (!response.ok) {
            return {available: false, status: response.status, content: '', contentType: ''}
        }
        const data = await response.json()
        return {available: true, status: 200, content: data.html || '', contentType: data.contentType || ''}
    } catch (error) {
        return {available: false, status: 0, content: '', contentType: '', error: error.message}
    }
}
