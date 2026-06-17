/**
 * Pure export builders (CSV / Markdown) for GEO and Watchlist data.
 * @module utils/exporters
 */

/**
 * Escape a value for a CSV cell (RFC 4180): wrap in quotes and double inner quotes.
 * @param {*} value - Cell value
 * @returns {string}
 */
export function escapeCsv(value) {
    const str = value === null || value === undefined ? '' : String(value)
    return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

/**
 * Build a CSV string from headers and rows (array of objects).
 * @param {string[]} headers - Column keys
 * @param {Array<object>} rows - Row objects
 * @returns {string} CSV text
 */
export function toCsv(headers, rows) {
    const head = headers.map(escapeCsv).join(',')
    const body = rows.map(row => headers.map(h => escapeCsv(row[h])).join(',')).join('\n')
    return body ? `${head}\n${body}` : head
}

/**
 * Build a Markdown table from headers and rows.
 * @param {string[]} headers - Column keys
 * @param {Array<object>} rows - Row objects
 * @returns {string} Markdown table
 */
export function toMarkdownTable(headers, rows) {
    const esc = (v) => String(v === null || v === undefined ? '' : v).replace(/\|/g, '\\|')
    const head = `| ${headers.join(' | ')} |`
    const sep = `| ${headers.map(() => '---').join(' | ')} |`
    const body = rows.map(row => `| ${headers.map(h => esc(row[h])).join(' | ')} |`).join('\n')
    return [head, sep, body].filter(Boolean).join('\n')
}

const GEO_HEADERS = ['prompt', 'marque', 'moteur', 'cite', 'position', 'partDeVoix', 'sentiment', 'concurrentsEmergents']

/**
 * Flatten GEO tracking data into one row per prompt × engine.
 * @param {Array} items - Tracked prompts
 * @param {Object} statsById - Per-prompt stats from useGeoTracking
 * @returns {Array<object>} Flat rows
 */
export function buildGeoRows(items, statsById) {
    const rows = []
    for (const item of items) {
        const stats = statsById[item.id]
        const emerging = (stats?.emergingCompetitors || []).map(e => e.name).join(', ')
        if (!stats?.providers?.length) {
            rows.push({prompt: item.prompt, marque: item.brand, moteur: '', cite: '', position: '', partDeVoix: '', sentiment: '', concurrentsEmergents: emerging})
            continue
        }
        for (const provider of stats.providers) {
            const latest = stats.byProvider[provider].latest
            rows.push({
                prompt: item.prompt,
                marque: item.brand,
                moteur: provider,
                cite: latest.brandMentioned ? 'oui' : 'non',
                position: latest.position ?? '',
                partDeVoix: latest.shareOfVoice ?? '',
                sentiment: latest.sentiment ?? '',
                concurrentsEmergents: emerging
            })
        }
    }
    return rows
}

export function buildGeoCsv(items, statsById) {
    return toCsv(GEO_HEADERS, buildGeoRows(items, statsById))
}

export function buildGeoMarkdown(items, statsById) {
    return toMarkdownTable(GEO_HEADERS, buildGeoRows(items, statsById))
}

const WATCHLIST_HEADERS = ['libelle', 'url', 'strategie', 'source', 'performance', 'accessibilite', 'bonnesPratiques', 'seo', 'verifieLe']

/**
 * Flatten Watchlist data into one row per monitored URL (latest scores).
 * @param {Array} items - Watchlist items
 * @param {Object} statsById - Per-item stats from useWatchlist
 * @returns {Array<object>} Flat rows
 */
export function buildWatchlistRows(items, statsById) {
    const pct = (v) => (typeof v === 'number' ? Math.round(v * 100) : '')
    return items.map(item => {
        const scores = statsById[item.id]?.latest?.scores || {}
        const ts = statsById[item.id]?.latest?.timestamp
        return {
            libelle: item.label,
            url: item.url,
            strategie: item.strategy,
            source: item.source,
            performance: pct(scores.performance),
            accessibilite: pct(scores.accessibility),
            bonnesPratiques: pct(scores['best-practices']),
            seo: pct(scores.seo),
            verifieLe: ts ? new Date(ts).toISOString() : ''
        }
    })
}

export function buildWatchlistCsv(items, statsById) {
    return toCsv(WATCHLIST_HEADERS, buildWatchlistRows(items, statsById))
}

/**
 * Build a CSV of broken (non-2xx) URLs from a sitemap crawl.
 * @param {Array} pages - Crawl results ({ url, ok, status })
 * @returns {string} CSV text
 */
export function buildBrokenUrlsCsv(pages = []) {
    const rows = pages
        .filter(p => !p.ok)
        .map(p => ({url: p.url, statut: p.status || 'erreur'}))
    return toCsv(['url', 'statut'], rows)
}
