import {ref} from 'vue'
import {toSeries} from '@/utils/series'
import {getServiceAccountToken} from '@/services/googleServiceAccount'

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const SITES_URL = 'https://www.googleapis.com/webmasters/v3/sites'
const API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3/sites'
const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'

// Taille de lot maximale acceptée par l'API searchAnalytics.query.
const MAX_PAGE = 25000

// Dimensions couvertes par un « rapport complet ».
export const REPORT_DIMENSIONS = ['query', 'page', 'country', 'device', 'date']

// ── Pure helpers (unit-tested) ───────────────────────────────────────────────

/**
 * Build a Search Console date range (YYYY-MM-DD), accounting for the ~2-day
 * data lag, ending `2` days before the reference date.
 * @param {number} days - Window size in days
 * @param {Date} ref - Reference "today" (defaults to now)
 * @returns {{startDate: string, endDate: string}}
 */
export function dateRangeISO(days, ref = new Date()) {
    const iso = (d) => d.toISOString().slice(0, 10)
    const end = new Date(ref)
    end.setDate(end.getDate() - 2)
    const start = new Date(end)
    start.setDate(start.getDate() - (days - 1))
    return {startDate: iso(start), endDate: iso(end)}
}

/**
 * Build the *previous* comparable window of `days`, ending the day before the
 * current window's start (for period-over-period comparison).
 * @param {number} days - Window size in days
 * @param {Date} ref - Reference "today" (defaults to now)
 * @returns {{startDate: string, endDate: string}}
 */
export function previousDateRangeISO(days, ref = new Date()) {
    const iso = (d) => d.toISOString().slice(0, 10)
    const end = new Date(ref)
    end.setDate(end.getDate() - 2 - days) // = current window start − 1 day
    const start = new Date(end)
    start.setDate(start.getDate() - (days - 1))
    return {startDate: iso(start), endDate: iso(end)}
}

/**
 * Relative variation between two values, as a ratio (e.g. 0.25 = +25%).
 * Returns null when there is no baseline to compare against.
 * @param {number} current
 * @param {number} previous
 * @returns {number|null}
 */
export function deltaRatio(current, previous) {
    if (!previous) return null
    return (current - previous) / previous
}

/**
 * Construit un groupe de filtres Search Console sur la dimension `page`,
 * pour restreindre une requête à une URL donnée (analyse de saisonnalité, etc.).
 * @param {string} url - URL ou fragment d'URL
 * @param {string} operator - 'contains' (défaut), 'equals', 'includingRegex'…
 * @returns {Array|null} dimensionFilterGroups, ou null si pas d'URL
 */
export function buildPageFilter(url, operator = 'contains') {
    if (!url) return null
    return [{filters: [{dimension: 'page', operator, expression: url}]}]
}

/**
 * Normalize a Search Console analytics row to a flat shape.
 * @param {object} row - API row ({ keys, clicks, impressions, ctr, position })
 * @returns {{key: string, clicks: number, impressions: number, ctr: number, position: number}}
 */
export function normalizeRow(row) {
    return {
        key: row.keys?.[0] ?? '',
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0
    }
}

/**
 * Aggregate rows into totals; CTR and position are impression-weighted.
 * @param {Array} rows - API rows
 * @returns {{clicks: number, impressions: number, ctr: number, position: number}}
 */
export function summarizeRows(rows = []) {
    let clicks = 0
    let impressions = 0
    let positionWeighted = 0
    for (const row of rows) {
        const r = normalizeRow(row)
        clicks += r.clicks
        impressions += r.impressions
        positionWeighted += r.position * r.impressions
    }
    return {
        clicks,
        impressions,
        ctr: impressions ? clicks / impressions : 0,
        position: impressions ? positionWeighted / impressions : 0
    }
}

/**
 * Build an oldest-first metric series from snapshots (newest-first), for a
 * trend sparkline. Caps to the most recent `limit` points.
 * @param {Array} snapshots - Snapshots (newest first)
 * @param {string} metric - Metric key (e.g. 'clicks')
 * @param {number} limit - Max points
 * @returns {number[]}
 */
export function snapshotSeries(snapshots = [], metric = 'clicks', limit = 12) {
    return toSeries(snapshots, s => (typeof s[metric] === 'number' ? Math.round(s[metric]) : null), {limit})
}

/**
 * Échappe une valeur pour un champ CSV (RFC 4180).
 * @param {*} value
 * @returns {string}
 */
function csvEscape(value) {
    const s = String(value ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Sérialise des lignes normalisées en CSV (clé + 4 métriques).
 * @param {Array} rows - Lignes ({ key, clicks, impressions, ctr, position })
 * @param {string} keyHeader - Intitulé de la 1re colonne (ex. 'query', 'page')
 * @returns {string}
 */
export function rowsToCsv(rows = [], keyHeader = 'key') {
    const header = [keyHeader, 'clicks', 'impressions', 'ctr', 'position'].join(',')
    const lines = rows.map(r => [r.key, r.clicks, r.impressions, r.ctr, r.position].map(csvEscape).join(','))
    return [header, ...lines].join('\n')
}

/**
 * Sérialise un rapport multi-dimensions en CSV, avec une colonne `dimension`.
 * @param {Object} report - { [dimension]: rows }
 * @returns {string}
 */
export function reportToCsv(report = {}) {
    const header = ['dimension', 'key', 'clicks', 'impressions', 'ctr', 'position'].join(',')
    const lines = []
    for (const [dimension, rows] of Object.entries(report)) {
        for (const r of (rows || [])) {
            lines.push([dimension, r.key, r.clicks, r.impressions, r.ctr, r.position].map(csvEscape).join(','))
        }
    }
    return [header, ...lines].join('\n')
}

// ── Browser OAuth + API (not unit-testable; needs a real browser + Google) ────

/**
 * Composable for Google Search Console (browser OAuth via Google Identity
 * Services, BYO OAuth client id). The access token is kept in memory only.
 */
export function useSearchConsole() {
    const connected = ref(false)
    const loading = ref(false)
    const error = ref(null)
    const sites = ref([])

    let accessToken = null
    let tokenClient = null

    function loadGis() {
        return new Promise((resolve, reject) => {
            if (window.google?.accounts?.oauth2) return resolve()
            const existing = document.querySelector(`script[src="${GIS_SRC}"]`)
            if (existing) {
                existing.addEventListener('load', () => resolve())
                existing.addEventListener('error', () => reject(new Error('Échec du chargement de Google Identity Services')))
                return
            }
            const script = document.createElement('script')
            script.src = GIS_SRC
            script.async = true
            script.defer = true
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Échec du chargement de Google Identity Services'))
            document.head.appendChild(script)
        })
    }

    /**
     * Run the OAuth token flow and fetch the list of verified sites.
     * @param {string} clientId - Google OAuth 2.0 Web client id
     */
    async function connect(clientId) {
        if (!clientId) {
            error.value = 'Client ID Google manquant (voir la configuration).'
            return
        }
        loading.value = true
        error.value = null
        try {
            await loadGis()
            await new Promise((resolve, reject) => {
                tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: SCOPE,
                    callback: (resp) => {
                        if (resp.error) {
                            reject(new Error(resp.error))
                        } else {
                            accessToken = resp.access_token
                            connected.value = true
                            resolve()
                        }
                    }
                })
                tokenClient.requestAccessToken()
            })
            await fetchSites()
        } catch (err) {
            error.value = err.message || 'Échec de la connexion'
        } finally {
            loading.value = false
        }
    }

    /**
     * Se connecte via une clé de **compte de service** (sans popup) : signe un
     * JWT, l'échange contre un jeton, puis récupère les propriétés vérifiées.
     * @param {string|object} serviceAccountKey - Clé JSON du compte de service
     */
    async function connectWithKey(serviceAccountKey) {
        if (!serviceAccountKey) {
            error.value = 'Clé de compte de service manquante.'
            return
        }
        loading.value = true
        error.value = null
        try {
            accessToken = await getServiceAccountToken(serviceAccountKey, SCOPE)
            connected.value = true
            await fetchSites()
        } catch (err) {
            connected.value = false
            error.value = err.message || 'Échec de la connexion par compte de service'
        } finally {
            loading.value = false
        }
    }

    function disconnect() {
        accessToken = null
        connected.value = false
        sites.value = []
    }

    async function authedFetch(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {...(options.headers || {}), Authorization: `Bearer ${accessToken}`}
        })
        if (!response.ok) {
            const body = await response.json().catch(() => ({}))
            throw new Error(body.error?.message || `Erreur HTTP ${response.status}`)
        }
        return response.json()
    }

    async function fetchSites() {
        const data = await authedFetch(SITES_URL)
        sites.value = (data.siteEntry || [])
            .filter(s => s.permissionLevel !== 'siteUnverifiedUser')
            .map(s => s.siteUrl)
    }

    /**
     * Exécute une requête Search Analytics. Avec `all`, pagine par lots de
     * 25 000 lignes (limite de l'API) pour rapatrier l'intégralité des résultats.
     * Ne touche pas à `loading`/`error` (géré par les fonctions publiques).
     * @param {string} siteUrl - URL de la propriété vérifiée
     * @param {{days:number,dimensions:string[],rowLimit:number,all:boolean}} opts
     * @returns {Promise<Array>} lignes normalisées
     */
    async function runQuery(siteUrl, {days = 28, dimensions = ['query'], rowLimit = 25, all = false, type = '', range = null, filters = null} = {}) {
        const {startDate, endDate} = range || dateRangeISO(days)
        const pageSize = all ? MAX_PAGE : rowLimit
        const out = []
        let startRow = 0
        for (; ;) {
            const body = {startDate, endDate, rowLimit: pageSize, startRow}
            if (dimensions && dimensions.length) body.dimensions = dimensions
            if (type) body.type = type
            if (filters) body.dimensionFilterGroups = filters
            const data = await authedFetch(`${API_BASE}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            })
            const batch = (data.rows || []).map(normalizeRow)
            out.push(...batch)
            if (!all || batch.length < pageSize) break
            startRow += pageSize
        }
        return out
    }

    /**
     * Query Search Analytics for a site (single dimension).
     * @param {string} siteUrl - Verified site URL
     * @param {object} opts - { days, dimensions, rowLimit, all }
     * @returns {Promise<Array>} Normalized rows
     */
    async function query(siteUrl, opts = {}) {
        loading.value = true
        error.value = null
        try {
            return await runQuery(siteUrl, opts)
        } catch (err) {
            error.value = err.message || 'Échec de la requête'
            return []
        } finally {
            loading.value = false
        }
    }

    /**
     * Rapport consolidé : récupère *toutes* les lignes pour *chaque* dimension.
     * @param {string} siteUrl - URL de la propriété vérifiée
     * @param {object} opts - { days, dimensions }
     * @returns {Promise<Object>} { [dimension]: lignes }
     */
    async function fetchReport(siteUrl, opts = {}) {
        const {days = 28, dimensions = REPORT_DIMENSIONS, type = '', filters = null} = opts
        loading.value = true
        error.value = null
        const report = {}
        try {
            for (const dimension of dimensions) {
                report[dimension] = await runQuery(siteUrl, {days, dimensions: [dimension], all: true, type, filters})
            }
            return report
        } catch (err) {
            error.value = err.message || 'Échec du rapport'
            return report
        } finally {
            loading.value = false
        }
    }

    /**
     * Totaux de période (une requête sans dimension → un seul agrégat exact).
     * Plus fiable que la somme des lignes (les requêtes anonymisées ne sont pas
     * toutes attribuées). Utilisé pour la comparaison de périodes.
     * @param {string} siteUrl
     * @param {object} opts - { days, range, type }
     * @returns {Promise<{clicks:number,impressions:number,ctr:number,position:number}>}
     */
    async function fetchTotals(siteUrl, opts = {}) {
        const rows = await runQuery(siteUrl, {...opts, dimensions: [], rowLimit: 1})
        return summarizeRows(rows)
    }

    /**
     * Inspecte une URL (API URL Inspection) : statut d'indexation, dernière
     * exploration, canoniques, ergonomie mobile, résultats enrichis.
     * @param {string} siteUrl - Propriété vérifiée (préfixe ou sc-domain:)
     * @param {string} inspectionUrl - URL exacte à inspecter
     * @returns {Promise<object|null>} inspectionResult, ou null
     */
    async function inspectUrl(siteUrl, inspectionUrl) {
        loading.value = true
        error.value = null
        try {
            const data = await authedFetch(INSPECT_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({siteUrl, inspectionUrl})
            })
            return data.inspectionResult || null
        } catch (err) {
            error.value = err.message || 'Échec de l\'inspection d\'URL'
            return null
        } finally {
            loading.value = false
        }
    }

    return {connected, loading, error, sites, connect, connectWithKey, disconnect, fetchSites, query, fetchReport, fetchTotals, inspectUrl}
}

export default useSearchConsole
