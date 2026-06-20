/**
 * Studio LLM : génération de llms.txt / llms-full.txt assistée par IA.
 *
 * On comprend le domaine métier à partir de la page d'accueil (titre, description,
 * liens d'en-tête et de pied de page) et du sitemap (structure des sections), puis
 * on construit un brief déterministe pour le LLM. Les fonctions sont pures (ou ne
 * dépendent que de DOMParser) afin d'être testées directement.
 *
 * Référence du format : https://llmstxt.org
 *
 * @module services/llmsTxt
 */

/**
 * Normalise un libellé de lien (espaces compactés, longueur bornée).
 * @param {string} text
 * @returns {string}
 */
function cleanText(text = '') {
    return text.replace(/\s+/g, ' ').trim().slice(0, 120)
}

/**
 * Indique si un href est un lien de page exploitable (même origine, http(s)).
 * @param {string} href
 * @param {string} origin
 * @returns {string|null} URL absolue normalisée, ou null à écarter
 */
function normalizeHref(href, origin) {
    if (!href) return null
    const raw = href.trim()
    if (!raw || raw.startsWith('#') || /^(mailto:|tel:|javascript:|data:)/i.test(raw)) return null
    try {
        const url = new URL(raw, origin || undefined)
        if (!/^https?:$/.test(url.protocol)) return null
        if (origin) {
            try {
                if (new URL(origin).host !== url.host) return null
            } catch {
                // origine invalide : on garde le lien tel quel
            }
        }
        url.hash = ''
        return url.toString()
    } catch {
        return null
    }
}

/**
 * Collecte les liens d'une zone du document (dédupliqués par URL).
 * @param {Document} doc
 * @param {string} selector - sélecteur CSS des zones (ex. 'header a, nav a')
 * @param {string} origin
 * @param {number} limit
 * @returns {Array<{text: string, url: string}>}
 */
function collectLinks(doc, selector, origin, limit = 40) {
    const out = []
    const seen = new Set()
    for (const a of doc.querySelectorAll(selector)) {
        const url = normalizeHref(a.getAttribute('href'), origin)
        if (!url || seen.has(url)) continue
        const text = cleanText(a.textContent || a.getAttribute('aria-label') || a.getAttribute('title') || '')
        if (!text) continue
        seen.add(url)
        out.push({text, url})
        if (out.length >= limit) break
    }
    return out
}

/**
 * Analyse la page d'accueil : titre, description, liens d'en-tête et de pied.
 * @param {string} html - HTML de la page d'accueil
 * @param {string} origin - Origine du site (pour résoudre les liens relatifs)
 * @returns {{title: string, description: string, headerLinks: Array, footerLinks: Array}}
 */
export function parseHomepage(html = '', origin = '') {
    const doc = new DOMParser().parseFromString(html || '', 'text/html')

    const title = cleanText(doc.querySelector('title')?.textContent || '')
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content')
    const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')
    // Description complète (pas de troncature agressive : les meta description
    // dépassent rarement quelques centaines de caractères).
    const description = (metaDesc || ogDesc || '').replace(/\s+/g, ' ').trim().slice(0, 600)

    // En-tête : on privilégie <header>/<nav> ; à défaut, on prend la barre de navigation.
    let headerLinks = collectLinks(doc, 'header a, nav a', origin)
    if (!headerLinks.length) headerLinks = collectLinks(doc, 'a[role="menuitem"]', origin)
    const footerLinks = collectLinks(doc, 'footer a', origin)

    return {title, description, headerLinks, footerLinks}
}

/**
 * Premier segment de chemin d'une URL (la « section »).
 * @param {string} url
 * @returns {string}
 */
function firstSegment(url) {
    try {
        const path = new URL(url).pathname.replace(/^\/+|\/+$/g, '')
        if (!path) return '/'
        return path.split('/')[0].toLowerCase()
    } catch {
        return ''
    }
}

/**
 * Regroupe les URL du sitemap par section (premier segment de chemin).
 * @param {string[]} urls - URL issues du sitemap
 * @param {number} sampleSize - nombre d'URL d'exemple par section
 * @returns {{total: number, sections: Array<{section: string, count: number, samples: string[]}>}}
 */
export function groupSitemapUrls(urls = [], sampleSize = 6) {
    const groups = new Map()
    for (const url of urls) {
        const key = firstSegment(url)
        if (key === '') continue
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(url)
    }
    const sections = [...groups.entries()]
        .map(([section, list]) => ({
            section,
            count: list.length,
            samples: list.slice(0, sampleSize)
        }))
        .sort((a, b) => b.count - a.count)
    return {total: urls.length, sections}
}

/**
 * Construit le contexte de domaine à fournir au LLM.
 * @param {object} input - { origin, html, sitemapUrls }
 * @returns {object} contexte structuré
 */
export function buildSiteContext({origin = '', html = '', sitemapUrls = []} = {}) {
    const home = parseHomepage(html, origin)
    const sitemap = groupSitemapUrls(sitemapUrls)
    return {
        origin,
        title: home.title,
        description: home.description,
        headerLinks: home.headerLinks,
        footerLinks: home.footerLinks,
        sitemap
    }
}

export const LLMS_TXT_SYSTEM =
    'Tu es un expert en GEO (optimisation pour les moteurs de réponse IA) et tu maîtrises ' +
    'le format llms.txt (https://llmstxt.org). Tu rédiges des fichiers llms.txt clairs, ' +
    'structurés et fidèles au contenu réel du site. Tu réponds dans la langue du site. ' +
    'Tu renvoies UNIQUEMENT le contenu Markdown du fichier, sans bloc de code englobant ' +
    'ni commentaire avant ou après.'

/**
 * Construit le prompt de génération du fichier llms.txt (ou llms-full.txt).
 * @param {object} context - sortie de buildSiteContext
 * @param {{keywords?: string, full?: boolean}} options
 * @returns {string}
 */
export function buildLlmsTxtPrompt(context, {keywords = '', full = false} = {}) {
    const c = context || {}
    const lines = []

    lines.push(
        full
            ? 'Rédige un fichier **llms-full.txt** pour le site ci-dessous.'
            : 'Rédige un fichier **llms.txt** pour le site ci-dessous.'
    )
    lines.push('')
    lines.push('## Contexte du domaine')
    lines.push(`- Site : ${c.origin || '(inconnu)'}`)
    lines.push(`- Titre de la page d'accueil : ${c.title || '(inconnu)'}`)
    lines.push(`- Description : ${c.description || '(absente)'}`)

    if (c.headerLinks?.length) {
        lines.push('')
        lines.push('### Navigation principale (en-tête)')
        c.headerLinks.forEach((l) => lines.push(`- ${l.text} → ${l.url}`))
    }
    if (c.footerLinks?.length) {
        lines.push('')
        lines.push('### Liens de pied de page (secondaires / légaux)')
        c.footerLinks.forEach((l) => lines.push(`- ${l.text} → ${l.url}`))
    }
    if (c.sitemap?.sections?.length) {
        lines.push('')
        lines.push(`### Structure du sitemap (${c.sitemap.total} URL au total)`)
        c.sitemap.sections.forEach((s) => {
            lines.push(`- Section « ${s.section} » : ${s.count} page(s)`)
            s.samples.forEach((u) => lines.push(`  - ${u}`))
        })
    }
    if (keywords && keywords.trim()) {
        lines.push('')
        lines.push(`### Mots-clés et domaine métier fournis par l'utilisateur`)
        lines.push(keywords.trim())
    }

    lines.push('')
    lines.push('## Format Markdown STRICT (obligatoire)')
    lines.push('Le fichier doit être du **Markdown valide et structuré**, pas du texte au fil de l\'eau. Respecte exactement ce squelette :')
    lines.push('')
    lines.push('```')
    lines.push('# Nom du site')
    lines.push('> Résumé en une phrase : ce que fait le site et pour qui.')
    lines.push('')
    lines.push('## Nom de la section')
    lines.push('- [Titre du lien](https://url-absolue) : description en une ligne.')
    lines.push('- [Autre lien](https://url-absolue) : description en une ligne.')
    lines.push('')
    lines.push('## Optional')
    lines.push('- [Mentions légales](https://url-absolue)')
    lines.push('```')
    lines.push('')
    lines.push('Règles :')
    lines.push('- Chaque section commence par un titre `## ...` ; son contenu est une **liste à puces de liens Markdown** `- [Texte](URL) : description`. N\'écris jamais une section sous forme de paragraphe en prose.')
    lines.push('- URLs absolues, langue dominante du site, aucune URL inventée (uniquement celles du contexte).')
    if (full) {
        lines.push('- Comme il s\'agit de **llms-full.txt**, sois **exhaustif mais structuré** : couvre chaque section et enrichis les descriptions. Évite les listes interminables : regroupe et résume plutôt que d\'aligner toutes les URL.')
    } else {
        lines.push('- Reste **condensé** : 3 à 6 sections maximum, uniquement les liens essentiels (pas tout le sitemap), descriptions courtes. Privilégie la clarté à l\'exhaustivité, évite les énumérations longues.')
    }
    lines.push('')
    lines.push('Renvoie UNIQUEMENT le contenu Markdown du fichier, sans bloc de code englobant (pas de ```), sans phrase avant ni après.')

    return lines.join('\n')
}

/**
 * Retire un éventuel bloc de code englobant (```markdown … ```) ajouté par le LLM.
 * @param {string} text
 * @returns {string}
 */
export function stripCodeFence(text = '') {
    const trimmed = (text || '').trim()
    const match = trimmed.match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n```$/)
    return match ? match[1].trim() : text
}

/**
 * Détecte les changements de structure entre deux contextes (pour la veille).
 * @param {object} latest - contexte récent (buildSiteContext)
 * @param {object} previous - contexte précédent (peut être null)
 * @returns {string[]} messages lisibles
 */
export function detectContextChanges(latest, previous) {
    const changes = []
    if (!previous || !latest) return changes

    const prevSections = new Set((previous.sitemap?.sections || []).map((s) => s.section))
    const nextSections = new Set((latest.sitemap?.sections || []).map((s) => s.section))

    for (const s of nextSections) {
        if (!prevSections.has(s)) changes.push(`Nouvelle section détectée : « ${s} »`)
    }
    for (const s of prevSections) {
        if (!nextSections.has(s)) changes.push(`Section disparue : « ${s} »`)
    }

    const prevTotal = previous.sitemap?.total ?? 0
    const nextTotal = latest.sitemap?.total ?? 0
    if (nextTotal !== prevTotal) {
        changes.push(`Nombre d'URL du sitemap : ${prevTotal} → ${nextTotal}`)
    }
    if ((latest.title || '') !== (previous.title || '')) {
        changes.push('Le titre de la page d\'accueil a changé.')
    }
    return changes
}
