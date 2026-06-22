/**
 * SEO/GEO resource checks (robots.txt, sitemaps, llms.txt…).
 *
 * Browsers can't read these files cross-origin (CORS), so availability checks
 * go through the local server proxy (POST /api/fetch-page). The pure parsing
 * helpers below are unit-tested.
 */

import {getUserAgent, isDirectFetch, proxyUrl} from './requestConfig'

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
 * Decode the handful of XML entities that appear in sitemap <loc> values.
 * @param {string} value - Raw value
 * @returns {string}
 */
function unescapeXml(value) {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;|&apos;/g, "'")
}

/**
 * Detect notable changes between two resource snapshots (for alerting).
 * @param {object} latest - Latest snapshot ({ readiness, brokenCount })
 * @param {object} previous - Previous snapshot (may be null)
 * @returns {string[]} Human-readable change messages
 */
export function detectResourceChanges(latest, previous) {
    const changes = []
    if (!previous) return changes
    if (typeof latest.readiness === 'number' && typeof previous.readiness === 'number'
        && latest.readiness < previous.readiness) {
        changes.push(`Score GEO-readiness en baisse : ${previous.readiness} → ${latest.readiness}`)
    }
    if (typeof latest.brokenCount === 'number' && typeof previous.brokenCount === 'number'
        && latest.brokenCount > previous.brokenCount) {
        changes.push(`Nouvelles URL cassées : ${previous.brokenCount} → ${latest.brokenCount}`)
    }
    return changes
}

/**
 * Extract the list of URLs from a sitemap's <loc> tags.
 * For a urlset these are pages; for an index they are child sitemaps.
 * @param {string} xml - Sitemap XML
 * @returns {string[]} URLs
 */
export function extractSitemapLocs(xml) {
    if (!xml) return []
    const out = []
    const regex = /<loc>\s*([^<]+?)\s*<\/loc>/gi
    let match
    while ((match = regex.exec(xml)) !== null) {
        out.push(unescapeXml(match[1].trim()))
    }
    return out
}

/**
 * Extract and parse JSON-LD blocks from an HTML document.
 * Invalid blocks are skipped.
 * @param {string} html - HTML content
 * @returns {Array<object>} Parsed JSON-LD objects
 */
export function extractJsonLd(html) {
    if (!html) return []
    const blocks = []
    const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    let match
    while ((match = regex.exec(html)) !== null) {
        try {
            blocks.push(JSON.parse(match[1].trim()))
        } catch {
            // ignore malformed JSON-LD
        }
    }
    return blocks
}

/**
 * Read the `content` attribute of a `<meta name="…">` tag (order-independent).
 * @param {string} html - HTML source
 * @param {string} name - meta name (e.g. 'robots', 'googlebot')
 * @returns {string} content value, or '' if absent
 */
export function extractMetaContent(html = '', name = '') {
    if (!html || !name) return ''
    const tag = html.match(new RegExp(`<meta\\b[^>]*\\bname=["']${name}["'][^>]*>`, 'i'))
    if (!tag) return ''
    const content = tag[0].match(/\bcontent=["']([^"']*)["']/i)
    return content ? content[1].trim() : ''
}

/**
 * Read the href of `<link rel="canonical">`.
 * @param {string} html - HTML source
 * @returns {string} canonical URL, or '' if absent
 */
export function extractCanonical(html = '') {
    if (!html) return ''
    const tag = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/i)
    if (!tag) return ''
    const href = tag[0].match(/\bhref=["']([^"']+)["']/i)
    return href ? href[1].trim() : ''
}

/**
 * Extract the indexing-relevant directives from a page's HTML.
 * @param {string} html - HTML source
 * @returns {{robots: string, googlebot: string, canonical: string}}
 */
export function extractIndexingMeta(html = '') {
    return {
        robots: extractMetaContent(html, 'robots'),
        googlebot: extractMetaContent(html, 'googlebot'),
        canonical: extractCanonical(html)
    }
}

/**
 * Flatten JSON-LD blocks into the type-bearing nodes (handles arrays and
 * @graph nesting).
 * @param {Array<object>} blocks - Parsed JSON-LD objects
 * @returns {Array<object>} Nodes carrying an @type
 */
export function jsonLdNodes(blocks = []) {
    const nodes = []
    const visit = (node) => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) {
            node.forEach(visit)
            return
        }
        if (node['@graph']) visit(node['@graph'])
        if (node['@type']) nodes.push(node)
    }
    blocks.forEach(visit)
    return nodes
}

/**
 * Collect the distinct @type values from JSON-LD blocks.
 * @param {Array<object>} blocks - Parsed JSON-LD objects
 * @returns {string[]} Distinct schema.org types
 */
export function jsonLdTypes(blocks = []) {
    const types = new Set()
    for (const node of jsonLdNodes(blocks)) {
        const t = node['@type']
        if (typeof t === 'string') types.add(t)
        else if (Array.isArray(t)) t.forEach(x => typeof x === 'string' && types.add(x))
    }
    return [...types]
}

/**
 * Recommended properties per common schema.org type (for validation hints).
 */
const RECOMMENDED_FIELDS = {
    Organization: ['name', 'url', 'logo'],
    WebSite: ['name', 'url'],
    WebPage: ['name'],
    Article: ['headline', 'author', 'datePublished', 'image'],
    NewsArticle: ['headline', 'author', 'datePublished', 'image'],
    BlogPosting: ['headline', 'author', 'datePublished', 'image'],
    Product: ['name', 'image', 'offers'],
    BreadcrumbList: ['itemListElement'],
    LocalBusiness: ['name', 'address', 'telephone'],
    FAQPage: ['mainEntity']
}

/**
 * Validate JSON-LD nodes against recommended fields for their @type.
 * @param {Array<object>} blocks - Parsed JSON-LD objects
 * @returns {Array<{type: string, missing: string[]}>} Issues (missing fields)
 */
export function validateJsonLd(blocks = []) {
    const issues = []
    for (const node of jsonLdNodes(blocks)) {
        const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']]
        for (const type of types) {
            const required = RECOMMENDED_FIELDS[type]
            if (!required) continue
            const missing = required.filter(f => node[f] === undefined || node[f] === null || node[f] === '')
            if (missing.length) issues.push({type, missing})
        }
    }
    return issues
}

/**
 * Compute a GEO-readiness score (0-100) from resource checks.
 * Weights favour the signals that matter for generative engines.
 * @param {Array} resources - Standard resource results (with key + available)
 * @param {Array} sitemaps - Inspected sitemaps (with available + count)
 * @param {{jsonLd?: boolean}} options - Extra signals (structured data presence)
 * @returns {{score: number, signals: Array<{label: string, ok: boolean, weight: number}>}}
 */
export function computeGeoReadiness(resources = [], sitemaps = [], options = {}) {
    const byKey = Object.fromEntries(resources.map(r => [r.key, r]))
    const hasSitemap = sitemaps.some(s => s.available && s.count > 0)
        || !!(byKey.sitemap?.available || byKey.sitemap_index?.available)

    const signals = [
        {label: 'robots.txt présent', ok: !!byKey.robots?.available, weight: 15},
        {label: 'Sitemap disponible avec des URL', ok: hasSitemap, weight: 25},
        {label: 'Données structurées JSON-LD', ok: !!options.jsonLd, weight: 20},
        {label: 'llms.txt présent', ok: !!byKey.llms?.available, weight: 25},
        {label: 'llms-full.txt présent', ok: !!byKey.llms_full?.available, weight: 15}
    ]
    const score = signals.reduce((sum, s) => sum + (s.ok ? s.weight : 0), 0)
    return {score, signals}
}

/**
 * Check the HTTP status of a URL via the local proxy (for 404 detection).
 * @param {string} url - URL to check
 * @returns {Promise<{url: string, ok: boolean, status: number}>}
 */
export async function checkUrlStatus(url) {
    // Mode direct : requête navigateur sans relais (même origine / CORS autorisé)
    if (isDirectFetch()) {
        try {
            const r = await fetch(url, {method: 'GET', redirect: 'follow'})
            return {url, ok: r.ok, status: r.status}
        } catch {
            return {url, ok: false, status: 0}
        }
    }
    try {
        const response = await fetch(proxyUrl('/api/check-url'), {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({url, userAgent: getUserAgent()})
        })
        if (!response.ok) return {url, ok: false, status: response.status}
        const data = await response.json()
        return {url, ok: !!data.ok, status: data.status ?? 0}
    } catch {
        return {url, ok: false, status: 0}
    }
}

/**
 * Fetch a resource through the local proxy.
 * @param {string} url - Resource URL
 * @returns {Promise<{available: boolean, status: number, content: string, contentType: string, error?: string}>}
 */
export async function fetchResource(url) {
    // Mode direct : requête navigateur sans relais (même origine / CORS autorisé)
    if (isDirectFetch()) {
        try {
            // no-store : la détection doit toujours refléter l'état courant du site
            // (sitemap/robots souvent mis en cache par le navigateur ou un CDN).
            const r = await fetch(url, {redirect: 'follow', cache: 'no-store', headers: {'Cache-Control': 'no-cache'}})
            if (!r.ok) return {available: false, status: r.status, content: '', contentType: ''}
            return {
                available: true,
                status: 200,
                content: await r.text(),
                contentType: r.headers.get('content-type') || '',
                xRobotsTag: r.headers.get('x-robots-tag') || ''
            }
        } catch (error) {
            return {available: false, status: 0, content: '', contentType: '', error: error.message}
        }
    }
    try {
        const response = await fetch(proxyUrl('/api/fetch-page'), {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({url, userAgent: getUserAgent()})
        })
        if (!response.ok) {
            return {available: false, status: response.status, content: '', contentType: ''}
        }
        const data = await response.json()
        return {available: true, status: 200, content: data.html || '', contentType: data.contentType || '', xRobotsTag: data.xRobotsTag || ''}
    } catch (error) {
        return {available: false, status: 0, content: '', contentType: '', error: error.message}
    }
}
