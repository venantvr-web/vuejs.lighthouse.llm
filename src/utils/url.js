/**
 * URL helpers shared across stores and composables.
 * @module utils/url
 */

/**
 * Extract the hostname from a URL.
 * @param {string} url - Full URL
 * @returns {string} Hostname, or the input unchanged if it can't be parsed
 */
export function extractDomain(url) {
    try {
        return new URL(url).hostname
    } catch {
        return url
    }
}

/**
 * Compare deux hôtes/domaines en ignorant la casse et le préfixe « www. ».
 * Sert à scoper les historiques sur le domaine actif sans faux négatifs
 * (ex. « www.example.com » == « example.com »).
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function sameHost(a, b) {
    const norm = (h) => String(h || '').trim().toLowerCase().replace(/^www\./, '')
    const ha = norm(a)
    const hb = norm(b)
    return !!ha && ha === hb
}

/**
 * Normalize a URL for comparison: ensure an https scheme, lowercase the host,
 * drop a trailing slash, and keep the query string.
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL, or '' for blank input
 */
export function normalizeUrl(url) {
    let normalized = (url || '').trim()
    if (!normalized) return ''
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = 'https://' + normalized
    }
    try {
        const u = new URL(normalized)
        u.hostname = u.hostname.toLowerCase()
        return u.origin + u.pathname.replace(/\/$/, '') + u.search
    } catch {
        return normalized.replace(/\/$/, '')
    }
}
