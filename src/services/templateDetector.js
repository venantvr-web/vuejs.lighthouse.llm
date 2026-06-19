/**
 * Template Detector Service
 * Detects page template types based on URL patterns
 */

/**
 * Default URL patterns for common page templates
 */
export const DEFAULT_PATTERNS = [
    {pattern: /^\/$/, template: 'homepage', label: 'Page d\'accueil'},
    {pattern: /^\/products?\/[^/]+\/?$/, template: 'product', label: 'Fiche produit'},
    {pattern: /^\/products?\/?$/, template: 'product-listing', label: 'Liste produits'},
    {pattern: /^\/categor(y|ies)\/[^/]+\/?$/, template: 'category', label: 'Categorie'},
    {pattern: /^\/categor(y|ies)\/?$/, template: 'category-listing', label: 'Liste categories'},
    {pattern: /^\/blog\/[^/]+\/?$/, template: 'blog-post', label: 'Article blog'},
    {pattern: /^\/blog\/?$/, template: 'blog-listing', label: 'Liste articles'},
    {pattern: /^\/articles?\/[^/]+\/?$/, template: 'article', label: 'Article'},
    {pattern: /^\/news\/[^/]+\/?$/, template: 'news', label: 'Actualite'},
    {pattern: /^\/about\/?/, template: 'about', label: 'A propos'},
    {pattern: /^\/contact\/?/, template: 'contact', label: 'Contact'},
    {pattern: /^\/faq\/?/, template: 'faq', label: 'FAQ'},
    {pattern: /^\/search\/?/, template: 'search', label: 'Recherche'},
    {pattern: /^\/cart\/?/, template: 'cart', label: 'Panier'},
    {pattern: /^\/checkout\/?/, template: 'checkout', label: 'Commande'},
    {pattern: /^\/account\/?/, template: 'account', label: 'Compte'},
    {pattern: /^\/login\/?/, template: 'login', label: 'Connexion'},
    {pattern: /^\/register\/?/, template: 'register', label: 'Inscription'},
    {pattern: /^\/privacy\/?/, template: 'legal', label: 'Mentions legales'},
    {pattern: /^\/terms\/?/, template: 'legal', label: 'Mentions legales'},
    {pattern: /^\/legal\/?/, template: 'legal', label: 'Mentions legales'}
]

/**
 * Template colors for visualization
 */
export const TEMPLATE_COLORS = {
    homepage: '#3b82f6',
    product: '#10b981',
    'product-listing': '#059669',
    category: '#8b5cf6',
    'category-listing': '#7c3aed',
    'blog-post': '#f59e0b',
    'blog-listing': '#d97706',
    article: '#f59e0b',
    news: '#ef4444',
    about: '#6366f1',
    contact: '#14b8a6',
    faq: '#06b6d4',
    search: '#ec4899',
    cart: '#84cc16',
    checkout: '#22c55e',
    account: '#a855f7',
    login: '#64748b',
    register: '#64748b',
    legal: '#94a3b8',
    other: '#6b7280'
}

/**
 * Detect template type from URL
 * @param {string} url - Full URL or path
 * @param {Array} customPatterns - Optional custom patterns to check first
 * @returns {object} - { template, label, confidence }
 */
export function detectTemplate(url, customPatterns = []) {
    let path
    try {
        path = new URL(url).pathname
    } catch {
        // If not a valid URL, assume it's already a path
        path = url.startsWith('/') ? url : '/' + url
    }

    // Normalize path: remove trailing slash (except for root)
    if (path !== '/' && path.endsWith('/')) {
        path = path.slice(0, -1)
    }

    // Check custom patterns first
    for (const {pattern, template, label} of customPatterns) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
        if (regex.test(path)) {
            return {template, label: label || template, confidence: 'custom'}
        }
    }

    // Check default patterns
    for (const {pattern, template, label} of DEFAULT_PATTERNS) {
        if (pattern.test(path)) {
            return {template, label, confidence: 'high'}
        }
    }

    // Fallback: try to infer from path structure
    const inferredTemplate = inferTemplateFromPath(path)
    if (inferredTemplate) {
        return {...inferredTemplate, confidence: 'low'}
    }

    return {template: 'other', label: 'Autre', confidence: 'none'}
}

/**
 * Infer template from path structure when no pattern matches
 * @param {string} path - URL path
 * @returns {object|null} - { template, label } or null
 */
function inferTemplateFromPath(path) {
    const segments = path.split('/').filter(Boolean)

    if (segments.length === 0) {
        return {template: 'homepage', label: 'Page d\'accueil'}
    }

    if (segments.length === 1) {
        // Single segment: likely a category or section page
        return {template: 'section', label: 'Section'}
    }

    if (segments.length >= 2) {
        // Multiple segments: likely a detail page
        const firstSegment = segments[0].toLowerCase()

        // Common patterns
        if (['product', 'produit', 'item', 'p'].includes(firstSegment)) {
            return {template: 'product', label: 'Fiche produit'}
        }
        if (['category', 'categorie', 'cat', 'c'].includes(firstSegment)) {
            return {template: 'category', label: 'Categorie'}
        }
        if (['blog', 'article', 'post', 'news', 'actualite'].includes(firstSegment)) {
            return {template: 'blog-post', label: 'Article'}
        }
        if (['page', 'pages'].includes(firstSegment)) {
            return {template: 'page', label: 'Page statique'}
        }
    }

    return null
}

/**
 * Detect templates for multiple URLs
 * @param {Array<string>} urls - List of URLs
 * @param {Array} customPatterns - Optional custom patterns
 * @returns {Array<object>} - URLs with detected templates
 */
export function detectTemplates(urls, customPatterns = []) {
    return urls.map(url => ({
        url,
        path: getPathFromUrl(url),
        ...detectTemplate(url, customPatterns)
    }))
}

/**
 * Group URLs by detected template
 * @param {Array<object>} urlsWithTemplates - URLs with template info
 * @returns {Map<string, Array>} - Map of template -> urls
 */
export function groupByTemplate(urlsWithTemplates) {
    const groups = new Map()

    for (const item of urlsWithTemplates) {
        const template = item.template || 'other'
        if (!groups.has(template)) {
            groups.set(template, [])
        }
        groups.get(template).push(item)
    }

    return groups
}

/**
 * Generate template statistics from grouped URLs
 * @param {Map<string, Array>} groups - Grouped URLs
 * @returns {Array<object>} - Template statistics
 */
export function getTemplateStats(groups) {
    const stats = []

    for (const [template, urls] of groups) {
        const label = urls[0]?.label || template
        stats.push({
            template,
            label,
            count: urls.length,
            urls: urls.map(u => u.url),
            color: TEMPLATE_COLORS[template] || TEMPLATE_COLORS.other
        })
    }

    // Sort by count descending
    return stats.sort((a, b) => b.count - a.count)
}

/**
 * Extract path from URL
 * @param {string} url - Full URL
 * @returns {string} - Path
 */
function getPathFromUrl(url) {
    try {
        return new URL(url).pathname
    } catch {
        return url.startsWith('/') ? url : '/' + url
    }
}

/**
 * Create a custom pattern
 * @param {string} patternStr - Pattern string (will be converted to regex)
 * @param {string} template - Template name
 * @param {string} label - Display label
 * @returns {object} - Pattern object
 */
export function createPattern(patternStr, template, label) {
    // Convert glob-like pattern to regex
    let regexStr = patternStr
        .replace(/\*/g, '[^/]+')  // * matches anything except /
        .replace(/\*\*/g, '.*')   // ** matches anything
        .replace(/\//g, '\\/')    // Escape slashes

    // Ensure it matches the full path
    if (!regexStr.startsWith('^')) regexStr = '^' + regexStr
    if (!regexStr.endsWith('$')) regexStr += '$'

    return {
        pattern: new RegExp(regexStr),
        template,
        label: label || template
    }
}

export default {
    detectTemplate,
    detectTemplates,
    groupByTemplate,
    getTemplateStats,
    createPattern,
    DEFAULT_PATTERNS,
    TEMPLATE_COLORS
}
