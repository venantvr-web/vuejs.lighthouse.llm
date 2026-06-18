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

function hostOf(url) {
    try {
        return new URL(url).hostname.toLowerCase()
    } catch {
        return ''
    }
}

/**
 * Détecte des incohérences vérifiables entre les micro-données (contrôles
 * déterministes qui servent de base à l'analyse qualitative du LLM).
 * @param {object} signals - Sortie de buildIndexabilitySignals
 * @returns {Array<{level: 'critique'|'attention'|'info', message: string}>}
 */
export function detectInconsistencies(signals) {
    const s = signals
    const out = []
    const add = (level, message) => out.push({level, message})

    // noindex sur la page d'accueil
    if (s.meta.noindex) {
        add('critique', "La page d'accueil est en noindex : elle sera exclue de l'index des moteurs.")
    }

    // meta robots autorise l'index mais X-Robots-Tag impose noindex
    const metaSaysIndex = /\bindex\b/i.test(s.meta.robots) && !/noindex/i.test(s.meta.robots)
    if (s.meta.xRobotsTag && /noindex/i.test(s.meta.xRobotsTag) && metaSaysIndex) {
        add('attention', "Contradiction : la balise meta robots autorise l'indexation mais l'en-tête X-Robots-Tag impose noindex.")
    }

    // canonical : URL relative ou domaine différent
    if (s.meta.canonical) {
        if (!/^https?:\/\//i.test(s.meta.canonical)) {
            add('attention', `Le lien canonical n'est pas une URL absolue : « ${s.meta.canonical} ».`)
        } else if (s.origin) {
            const ch = hostOf(s.meta.canonical)
            const oh = hostOf(s.origin)
            if (ch && oh && ch !== oh) {
                add('attention', `Le canonical pointe vers un autre domaine (${ch}) que le site analysé (${oh}).`)
            }
        }
        if (s.meta.noindex) {
            add('info', "Signal mixte : un canonical est défini alors que la page est en noindex (le canonical sera ignoré).")
        }
    }

    // robots.txt bloque tout mais un sitemap est publié
    const hasSitemap = s.totalSitemapUrls > 0 || s.sitemaps.some((x) => x.available)
    if (s.robots.blocksAll && hasSitemap) {
        add('critique', "robots.txt bloque tout (Disallow: /) alors qu'un sitemap est publié : signaux contradictoires.")
    }

    // sitemap déclaré dans robots.txt mais inaccessible
    s.robots.sitemapsDeclared.forEach((decl) => {
        const m = s.sitemaps.find((x) => x.url === decl)
        if (m && !m.available) add('attention', `Sitemap déclaré dans robots.txt mais inaccessible : ${decl}`)
    })

    // sitemaps présents mais non déclarés dans robots.txt
    if (s.robots.present && s.sitemaps.some((x) => x.available) && s.robots.sitemapsDeclared.length === 0) {
        add('info', "Des sitemaps existent mais ne sont pas déclarés dans robots.txt (ligne « Sitemap: »).")
    }

    // données structurées incomplètes
    s.jsonLd.issues.forEach((i) => {
        add('info', `Donnée structurée ${i.type} incomplète : champ(s) manquant(s) — ${(i.missing || []).join(', ')}.`)
    })

    return out
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

    const inconsistencies = detectInconsistencies(s)
    if (inconsistencies.length) {
        lines.push('')
        lines.push('## Incohérences détectées automatiquement')
        inconsistencies.forEach((i) => lines.push(`- [${i.level}] ${i.message}`))
    }

    lines.push('')
    lines.push('## Ce que je veux')
    lines.push("Fais une **analyse qualitative** de ces micro-données : pour chaque élément, dis s'il est correct, à améliorer ou incohérent, et explique pourquoi. Croise les signaux entre eux pour repérer les contradictions (ex. noindex vs canonical, robots.txt vs sitemap, meta robots vs X-Robots-Tag, canonical vers un autre domaine).")
    lines.push('Structure ta réponse ainsi :')
    lines.push('1. **Contrôle élément par élément** : un tableau Markdown — colonnes | Élément | État (✅ OK / ⚠️ À corriger / ❌ Incohérent) | Commentaire |.')
    lines.push("2. **Incohérences** : explicite les contradictions entre signaux (confirme ou nuance les détections automatiques ci-dessus, et ajoute celles que tu repères).")
    lines.push('3. **Verdict** : niveau global (Bon / À améliorer / Critique) en une phrase, pour la recherche classique (Google/Bing) ET pour les moteurs de réponse IA (GEO).')
    lines.push('4. **Recommandations priorisées** : actions concrètes et vérifiables (impact / effort).')
    lines.push("Ne te base que sur les éléments fournis, n'invente pas de données, et signale les angles morts non mesurés ici (directives au-delà de la page d'accueil, balises hreflang, statut d'indexation réel en Search Console).")

    return lines.join('\n')
}
