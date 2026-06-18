import {ref} from 'vue'
import {toSeries} from '@/utils/series'

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const SITES_URL = 'https://www.googleapis.com/webmasters/v3/sites'
const API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3/sites'

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
     * Query Search Analytics for a site.
     * @param {string} siteUrl - Verified site URL
     * @param {object} opts - { days, dimensions, rowLimit }
     * @returns {Promise<Array>} Normalized rows
     */
    async function query(siteUrl, opts = {}) {
        const {days = 28, dimensions = ['query'], rowLimit = 25} = opts
        loading.value = true
        error.value = null
        try {
            const {startDate, endDate} = dateRangeISO(days)
            const data = await authedFetch(`${API_BASE}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({startDate, endDate, dimensions, rowLimit})
            })
            return (data.rows || []).map(normalizeRow)
        } catch (err) {
            error.value = err.message || 'Échec de la requête'
            return []
        } finally {
            loading.value = false
        }
    }

    return {connected, loading, error, sites, connect, disconnect, fetchSites, query}
}

export default useSearchConsole
