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
 * @param {Object<string,string>} [labels] - Optional display label per key (accented French)
 * @returns {string} CSV text
 */
export function toCsv(headers, rows, labels = {}) {
    const head = headers.map(h => escapeCsv(labels[h] ?? h)).join(',')
    const body = rows.map(row => headers.map(h => escapeCsv(row[h])).join(',')).join('\n')
    return body ? `${head}\n${body}` : head
}

/**
 * Build a Markdown table from headers and rows.
 * @param {string[]} headers - Column keys
 * @param {Array<object>} rows - Row objects
 * @param {Object<string,string>} [labels] - Optional display label per key (accented French)
 * @returns {string} Markdown table
 */
export function toMarkdownTable(headers, rows, labels = {}) {
    const esc = (v) => String(v === null || v === undefined ? '' : v).replace(/\|/g, '\\|')
    const head = `| ${headers.map(h => labels[h] ?? h).join(' | ')} |`
    const sep = `| ${headers.map(() => '---').join(' | ')} |`
    const body = rows.map(row => `| ${headers.map(h => esc(row[h])).join(' | ')} |`).join('\n')
    return [head, sep, body].filter(Boolean).join('\n')
}

// Libellés d'en-tête accentués (clés internes inchangées pour la stabilité)
const GEO_HEADERS = ['prompt', 'marque', 'moteur', 'cite', 'position', 'partDeVoix', 'sentiment', 'concurrentsEmergents']
const GEO_LABELS = {
    cite: 'cité',
    partDeVoix: 'part de voix',
    concurrentsEmergents: 'concurrents émergents'
}

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
    return toCsv(GEO_HEADERS, buildGeoRows(items, statsById), GEO_LABELS)
}

export function buildGeoMarkdown(items, statsById) {
    return toMarkdownTable(GEO_HEADERS, buildGeoRows(items, statsById), GEO_LABELS)
}

const WATCHLIST_HEADERS = ['libelle', 'url', 'strategie', 'source', 'performance', 'accessibilite', 'bonnesPratiques', 'seo', 'verifieLe']
const WATCHLIST_LABELS = {
    libelle: 'libellé',
    strategie: 'stratégie',
    accessibilite: 'accessibilité',
    bonnesPratiques: 'bonnes pratiques',
    verifieLe: 'vérifié le'
}

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
    return toCsv(WATCHLIST_HEADERS, buildWatchlistRows(items, statsById), WATCHLIST_LABELS)
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

/**
 * Build a shareable Markdown morning-briefing report.
 * @param {object} data
 * @param {Date|number} data.date - Report date
 * @param {object} data.overview - { sites, avgPerf (0-1|null), toHandle, avgReadiness }
 * @param {Array} data.digest - Alerts ({ level, site, message })
 * @param {Array} data.items - Watchlist items
 * @param {object} data.watchStats - Per-item stats (statsById)
 * @returns {string} Markdown report
 */
export function buildBriefingMarkdown({date = Date.now(), overview = {}, digest = [], items = [], watchStats = {}} = {}) {
    const day = new Date(date).toLocaleDateString('fr-FR', {weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'})
    const pct = (v) => (typeof v === 'number' ? `${Math.round(v * 100)}` : '—')

    const lines = [`# Briefing du matin — ${day}`, '']

    lines.push('## Vue d\'ensemble', '')
    lines.push(`- Sites suivis : ${overview.sites ?? items.length}`)
    lines.push(`- Performance moyenne : ${pct(overview.avgPerf)}`)
    lines.push(`- À traiter : ${overview.toHandle ?? digest.length}`)
    lines.push(`- GEO-readiness moyen : ${overview.avgReadiness ?? '—'}`, '')

    lines.push('## À traiter aujourd\'hui', '')
    if (!digest.length) {
        lines.push('Rien à signaler.', '')
    } else {
        for (const a of digest) {
            const tag = a.level === 'critical' ? '🔴' : '🟠'
            lines.push(`- ${tag} **${a.site}** — ${a.message}`)
        }
        lines.push('')
    }

    if (items.length) {
        lines.push('## Sites', '')
        const rows = items.map(item => {
            const stats = watchStats[item.id]
            const delta = stats?.deltas?.performance
            return {
                page: item.label,
                performance: pct(stats?.latest?.scores?.performance),
                delta: typeof delta === 'number' ? `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}` : '—'
            }
        })
        lines.push(toMarkdownTable(['page', 'performance', 'delta'], rows))
    }

    return lines.join('\n')
}
