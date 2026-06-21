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

/**
 * Compare two hosts ignoring case and a leading « www. ».
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function sameReportHost(a, b) {
    const norm = (h) => String(h || '').trim().toLowerCase()
        .replace(/^https?:\/\//, '')  // tolère une URL complète (forme canonique)
        .replace(/\/.*$/, '')          // ne garde que l'hôte
        .replace(/^www\./, '')
    return !!norm(a) && norm(a) === norm(b)
}

/**
 * Aggregate the cited sources across every prompt's stats: one entry per host,
 * summing how many engines cited it and over how many prompts it appears.
 * @param {Array} items - Tracked prompts
 * @param {Object} statsById - Per-prompt stats
 * @returns {Array<{host: string, engines: number, prompts: number}>}
 */
export function aggregateCitedSources(items, statsById) {
    const map = new Map()
    for (const item of items) {
        for (const s of statsById[item.id]?.citedSources || []) {
            const key = s.host.toLowerCase()
            if (!map.has(key)) map.set(key, {host: s.host, engines: 0, prompts: 0})
            const entry = map.get(key)
            entry.engines += s.engines || 0
            entry.prompts += 1
        }
    }
    return [...map.values()].sort((a, b) => b.engines - a.engines || b.prompts - a.prompts)
}

/**
 * Aggregate emerging competitors across prompts: one entry per name with the
 * number of prompts it surfaced in.
 * @param {Array} items - Tracked prompts
 * @param {Object} statsById - Per-prompt stats
 * @returns {Array<{name: string, prompts: number}>}
 */
export function aggregateEmergingCompetitors(items, statsById) {
    const map = new Map()
    for (const item of items) {
        for (const c of statsById[item.id]?.emergingCompetitors || []) {
            const key = c.name.toLowerCase()
            if (!map.has(key)) map.set(key, {name: c.name, prompts: 0})
            map.get(key).prompts += 1
        }
    }
    return [...map.values()].sort((a, b) => b.prompts - a.prompts)
}

/**
 * Build actionable recommendations (French) from the aggregate GEO score.
 * @param {object} score - computeGeoScore() result
 * @param {boolean} ownCited - Whether the tracked domain is cited as a source
 * @returns {string[]} Recommendation lines
 */
function geoRecommendations(score, ownCited) {
    const recs = []
    if (!score || score.score === null || score.score === undefined) {
        recs.push('Lancez des analyses sur vos prompts pour obtenir un premier diagnostic de visibilité.')
        return recs
    }
    if (score.citationRate !== null && score.citationRate < 50) {
        recs.push('Taux de citation faible : renforcez votre présence (publication d\'un `llms.txt`, données structurées Schema.org, contenu de référence citable, autorité du domaine).')
    }
    if (score.avgShareOfVoice !== null && score.avgShareOfVoice < 40) {
        recs.push('Part de voix dominée par les concurrents : produisez du contenu différenciant sur les requêtes suivies et couvrez les angles qu\'ils occupent.')
    }
    if (!ownCited) {
        recs.push('Votre site n\'apparaît pas parmi les sources citées : visez des contenus que les moteurs IA citent (pages de référence, FAQ, données chiffrées, mentions externes).')
    }
    if (typeof score.trend === 'number' && score.trend < 0) {
        recs.push(`Tendance en baisse (${score.trend} pts) : surveillez les concurrents émergents et rafraîchissez les contenus concernés.`)
    }
    if (!recs.length) {
        recs.push('Bonne visibilité GEO : maintenez la fraîcheur des contenus et continuez le suivi régulier pour détecter toute régression.')
    }
    return recs
}

/**
 * Build a client-ready Markdown GEO report: executive summary with the brand
 * GEO score and methodology, per-prompt visibility table, aggregated cited
 * sources (highlighting the tracked domain), emerging competitors and
 * actionable recommendations. Pure and deterministic.
 * @param {object} args
 * @param {string} args.brand - Tracked brand
 * @param {string} [args.domain] - Tracked domain (canonical), highlighted in sources
 * @param {number|Date} [args.date] - Report date
 * @param {object} args.score - computeGeoScore() result
 * @param {Array} args.items - Tracked prompts
 * @param {Object} args.statsById - Per-prompt stats
 * @returns {string} Markdown report
 */
export function buildGeoReportMarkdown({brand = '', domain = '', date = Date.now(), score = {}, items = [], statsById = {}} = {}) {
    const day = new Date(date).toLocaleDateString('fr-FR', {day: '2-digit', month: 'long', year: 'numeric'})
    const fmtPct = (v) => (typeof v === 'number' ? `${v}%` : '—')
    const lines = []

    lines.push(`# Rapport de visibilité GEO — ${brand || '—'}`, '')
    const subtitleParts = []
    if (domain) subtitleParts.push(domain)
    subtitleParts.push(`généré le ${day}`)
    lines.push(`*${subtitleParts.join(' · ')}*`, '')

    // Synthèse
    lines.push('## Synthèse', '')
    if (score.score === null || score.score === undefined) {
        lines.push('Aucune analyse exécutée pour le moment.', '')
    } else {
        let trendTxt = ''
        if (typeof score.trend === 'number' && score.trend !== 0) {
            trendTxt = score.trend > 0 ? ` (en hausse de ${score.trend} pts)` : ` (en baisse de ${Math.abs(score.trend)} pts)`
        }
        lines.push(`**Score GEO : ${score.score}/100**${trendTxt}`, '')
        lines.push(`- Taux de citation : ${fmtPct(score.citationRate)}`)
        lines.push(`- Part de voix moyenne : ${fmtPct(score.avgShareOfVoice)}`)
        lines.push(`- Couverture : ${score.engineRuns ?? 0} réponse(s) de moteurs sur ${score.promptCount ?? items.length} prompt(s)`, '')
        lines.push('> Méthodologie : le score combine le taux de citation (part des réponses où la marque est citée, pondéré à 60 %) et la part de voix moyenne (poids de la marque face aux concurrents, pondérée à 40 %), sur le dernier run de chaque prompt et de chaque moteur.', '')
    }

    // Visibilité par prompt
    lines.push('## Visibilité par prompt', '')
    const rows = buildGeoRows(items, statsById)
    if (rows.length) {
        lines.push(toMarkdownTable(GEO_HEADERS, rows, GEO_LABELS), '')
    } else {
        lines.push('Aucun prompt suivi.', '')
    }

    // Sources citées
    const sources = aggregateCitedSources(items, statsById)
    const ownCited = sources.some(s => sameReportHost(s.host, domain))
    lines.push('## Sources citées par les moteurs', '')
    if (sources.length) {
        for (const s of sources.slice(0, 20)) {
            const own = sameReportHost(s.host, domain) ? ' ✅ (votre site)' : ''
            lines.push(`- ${s.host} — cité par ${s.engines} moteur(s) sur ${s.prompts} prompt(s)${own}`)
        }
        if (!ownCited && domain) {
            lines.push('', '_Votre site n\'apparaît pas parmi les sources citées._')
        }
        lines.push('')
    } else {
        lines.push('Aucune source citée détectée (les moteurs ancrés sur le web, comme Perplexity, alimentent cette section).', '')
    }

    // Concurrents émergents
    const emerging = aggregateEmergingCompetitors(items, statsById)
    if (emerging.length) {
        lines.push('## Concurrents émergents', '')
        for (const c of emerging.slice(0, 20)) {
            lines.push(`- ${c.name} — détecté sur ${c.prompts} prompt(s)`)
        }
        lines.push('')
    }

    // Recommandations
    lines.push('## Recommandations', '')
    for (const rec of geoRecommendations(score, ownCited)) {
        lines.push(`- ${rec}`)
    }
    lines.push('')

    return lines.join('\n')
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
