/**
 * Diagnostic d'indexabilité assisté par IA.
 *
 * À partir des signaux déjà collectés par l'écran Ressources (robots.txt,
 * sitemaps, llms.txt, JSON-LD, GEO-readiness, URL cassées), on construit un
 * brief structuré et un prompt destiné au LLM. Les fonctions sont pures afin
 * d'être testées directement.
 *
 * @module services/indexabilityDiagnosis
 */

import {parseSitemapsFromRobots} from './resourceCheck'

/**
 * Détecte un blocage global dans robots.txt : un groupe `User-agent: *`
 * contenant `Disallow: /` (racine exacte).
 * @param {string} content - Contenu brut de robots.txt
 * @returns {boolean}
 */
export function robotsBlocksAll(content = '') {
    if (!content) return false
    let inStarGroup = false
    let sawDirective = false
    let agents = []
    let blocked = false

    for (const raw of content.split(/\r?\n/)) {
        const line = raw.replace(/#.*$/, '').trim()
        if (!line) continue
        const idx = line.indexOf(':')
        if (idx === -1) continue
        const field = line.slice(0, idx).trim().toLowerCase()
        const value = line.slice(idx + 1).trim()

        if (field === 'user-agent') {
            // Nouvelle salve d'agents après des directives = nouveau groupe
            if (sawDirective) {
                agents = []
                sawDirective = false
            }
            agents.push(value)
            inStarGroup = agents.includes('*')
        } else {
            sawDirective = true
            if (inStarGroup && field === 'disallow' && value === '/') blocked = true
        }
    }
    return blocked
}

/**
 * Normalise l'état des vérifications en un objet de signaux d'indexabilité.
 * @param {object} state - { origin, resources, sitemaps, jsonLd, readiness, brokenPages }
 * @returns {object} Signaux normalisés
 */
export function buildIndexabilitySignals(state = {}) {
    const {
        origin = '',
        resources = [],
        sitemaps = [],
        jsonLd = {},
        readiness = {},
        brokenPages = [],
        pageMeta = {}
    } = state

    const byKey = Object.fromEntries(resources.map((r) => [r.key, r]))
    const robots = byKey.robots || {}
    const robotsContent = robots.content || ''
    const availableSitemaps = sitemaps.filter((s) => s.available)
    const totalSitemapUrls = availableSitemaps.reduce((sum, s) => sum + (s.count || 0), 0)

    const metaRobots = pageMeta.robots || ''
    const metaGooglebot = pageMeta.googlebot || ''
    const xRobotsTag = pageMeta.xRobotsTag || ''
    const noindex = /noindex/i.test(`${metaRobots} ${metaGooglebot} ${xRobotsTag}`)

    return {
        origin,
        robots: {
            present: !!robots.available,
            status: robots.status || 0,
            blocksAll: robotsBlocksAll(robotsContent),
            sitemapsDeclared: robots.available ? parseSitemapsFromRobots(robotsContent) : [],
            snippet: robotsContent.slice(0, 1500)
        },
        sitemaps: sitemaps.map((s) => ({
            url: s.url,
            available: !!s.available,
            status: s.status || 0,
            type: s.type || 'unknown',
            count: s.count || 0
        })),
        totalSitemapUrls,
        llms: {present: !!byKey.llms?.available},
        llmsFull: {present: !!byKey.llms_full?.available},
        jsonLd: {
            present: !!jsonLd.present,
            types: jsonLd.types || [],
            issues: jsonLd.issues || []
        },
        readiness: {score: readiness.score ?? null, signals: readiness.signals || []},
        meta: {
            robots: metaRobots,
            googlebot: metaGooglebot,
            xRobotsTag,
            canonical: pageMeta.canonical || '',
            noindex
        },
        brokenPages: {
            count: brokenPages.length,
            sample: brokenPages.slice(0, 20).map((p) => ({url: p.url, status: p.status || 0}))
        }
    }
}

export const INDEXABILITY_SYSTEM =
    'Tu es un expert SEO technique et GEO (indexabilité par les moteurs de recherche et par les moteurs de réponse IA). ' +
    'Tu réponds en français, en Markdown clair et actionnable.'

/**
 * Construit le prompt utilisateur (déterministe) à partir des signaux.
 * @param {object} signals - Sortie de buildIndexabilitySignals
 * @returns {string}
 */
export function buildIndexabilityPrompt(signals) {
    const s = signals
    const lines = []

    lines.push(`Diagnostique l'indexabilité du site : ${s.origin || '(inconnu)'}.`)
    lines.push('')
    lines.push('## Données collectées')
    lines.push(`- robots.txt : ${s.robots.present ? `présent (HTTP ${s.robots.status})` : 'absent'}`)
    if (s.robots.present) {
        lines.push(`- Blocage global (Disallow: / pour User-agent: *) : ${s.robots.blocksAll ? 'OUI ⚠️' : 'non'}`)
        lines.push(`- Sitemaps déclarés dans robots.txt : ${s.robots.sitemapsDeclared.length ? s.robots.sitemapsDeclared.join(', ') : 'aucun'}`)
    }
    lines.push(`- Sitemaps disponibles : ${s.sitemaps.filter((x) => x.available).length} (total ${s.totalSitemapUrls} URL référencées)`)
    s.sitemaps.forEach((x) => lines.push(`  - ${x.url} — ${x.available ? `${x.type}, ${x.count} entrées` : 'absent'}`))
    lines.push(`- llms.txt : ${s.llms.present ? 'présent' : 'absent'} ; llms-full.txt : ${s.llmsFull.present ? 'présent' : 'absent'}`)
    lines.push(`- Données structurées JSON-LD (accueil) : ${s.jsonLd.present ? `présentes (${s.jsonLd.types.join(', ') || 'types non identifiés'})` : 'absentes'}`)
    s.jsonLd.issues.forEach((i) => lines.push(`  - Problème JSON-LD : ${i.type} — champs manquants : ${(i.missing || []).join(', ')}`))
    lines.push('- Directives d\'indexation de la page d\'accueil :')
    lines.push(`  - meta robots : ${s.meta.robots || '(absente)'}`)
    lines.push(`  - meta googlebot : ${s.meta.googlebot || '(absente)'}`)
    lines.push(`  - en-tête X-Robots-Tag : ${s.meta.xRobotsTag || '(absent)'}`)
    lines.push(`  - lien canonical : ${s.meta.canonical || '(absent)'}`)
    lines.push(`  - noindex détecté : ${s.meta.noindex ? 'OUI ⚠️' : 'non'}`)
    if (s.readiness.score != null) lines.push(`- Score GEO-readiness interne : ${s.readiness.score}/100`)
    lines.push(`- URL cassées détectées (crawl sitemap) : ${s.brokenPages.count}`)
    s.brokenPages.sample.forEach((p) => lines.push(`  - ${p.url} (${p.status || 'erreur'})`))

    if (s.robots.present && s.robots.snippet) {
        lines.push('')
        lines.push('### robots.txt (extrait)')
        lines.push('```')
        lines.push(s.robots.snippet)
        lines.push('```')
    }

    lines.push('')
    lines.push('## Ce que je veux')
    lines.push("Établis un diagnostic d'indexabilité en deux volets : (1) moteurs de recherche classiques (Google/Bing), (2) moteurs de réponse IA (GEO).")
    lines.push('Structure ta réponse ainsi :')
    lines.push('1. **Verdict** : une phrase de synthèse + un niveau global (Bon / À améliorer / Critique).')
    lines.push('2. **Points bloquants** : liste priorisée (impact, effort), du plus grave au moins grave.')
    lines.push('3. **Recommandations** : actions concrètes et vérifiables pour chaque problème.')
    lines.push('4. **Points positifs** : ce qui est déjà correct.')
    lines.push("Ne te base que sur les éléments fournis, n'invente pas de données, et signale les angles morts non mesurés ici (par ex. directives au-delà de la page d'accueil, balises hreflang, statut d'indexation réel en Search Console).")

    return lines.join('\n')
}
