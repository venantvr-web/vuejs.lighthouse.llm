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
 * Extrait le texte lisible d'une page (sans le bruit d'interface) pour alimenter
 * le corpus llms-full.txt. Retire scripts, styles, nav, en-tête, pied de page,
 * etc. et privilégie le contenu de <main> s'il existe.
 * @param {string} html
 * @param {number} maxChars - longueur maximale conservée par page
 * @returns {string}
 */
export function extractMainText(html = '', maxChars = 4000) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html')
    doc.querySelectorAll('script, style, noscript, nav, header, footer, aside, form, svg, template')
        .forEach((el) => el.remove())
    const root = doc.querySelector('main') || doc.body || doc.documentElement
    const text = (root?.textContent || '').replace(/\s+/g, ' ').trim()
    return text.slice(0, maxChars)
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

// Rôle système pour llms.txt (index/résumé)
export const LLMS_TXT_SYSTEM =
    'Tu es un ingénieur spécialisé en documentation technique et en optimisation de données ' +
    'pour l\'intelligence artificielle (LLM/RAG). Tu maîtrises le format llms.txt ' +
    '(https://llmstxt.org). Tu réponds dans la langue dominante du site, en Markdown propre, ' +
    'et tu renvoies UNIQUEMENT le contenu du fichier (sans phrase avant ni après, ' +
    'sans bloc de code englobant).'

// Rôle système pour llms-full.txt (corpus complet structuré)
export const LLMS_FULL_SYSTEM =
    'Tu es un extracteur et formateur de données expert, spécialisé dans la préparation de ' +
    'corpus de textes massifs pour le contexte des LLM. Tu réponds dans la langue dominante ' +
    'du site, en Markdown pur, et tu renvoies UNIQUEMENT le contenu du fichier ' +
    '(sans phrase avant ni après, sans bloc de code englobant).'

/**
 * Ajoute la section « Données d'entrée » (contexte du domaine) au prompt.
 * @param {string[]} lines
 * @param {object} c - contexte
 * @param {string} keywords
 */
function pushInputData(lines, c, keywords) {
    lines.push('## Données d\'entrée')
    lines.push('Voici la description et l\'arborescence du site pour baser ton travail :')
    lines.push('')
    lines.push(`- Site : ${c.origin || '(inconnu)'}`)
    lines.push(`- Titre de la page d'accueil : ${c.title || '(inconnu)'}`)
    lines.push(`- Description : ${c.description || '(absente)'}`)

    if (c.headerLinks?.length) {
        lines.push('')
        lines.push('### Navigation principale (en-tête)')
        c.headerLinks.forEach((l) => lines.push(`- [${l.text}](${l.url})`))
    }
    if (c.footerLinks?.length) {
        lines.push('')
        lines.push('### Liens de pied de page (secondaires / légaux)')
        c.footerLinks.forEach((l) => lines.push(`- [${l.text}](${l.url})`))
    }
    if (c.sitemap?.sections?.length) {
        lines.push('')
        lines.push(`### Arborescence du sitemap (${c.sitemap.total} URL au total)`)
        c.sitemap.sections.forEach((s) => {
            lines.push(`- Section « ${s.section} » : ${s.count} page(s)`)
            s.samples.forEach((u) => lines.push(`  - ${u}`))
        })
    }
    if (keywords && keywords.trim()) {
        lines.push('')
        lines.push('### Mots-clés et domaine métier fournis par l\'utilisateur')
        lines.push(keywords.trim())
    }
}

/**
 * Ajoute le contenu brut des pages (corpus) au prompt llms-full.txt.
 * @param {string[]} lines
 * @param {Array<{url: string, title: string, text: string}>} pages
 */
function pushPagesContent(lines, pages) {
    lines.push('')
    lines.push('## Contenu brut des pages (à fusionner et nettoyer)')
    lines.push('Texte extrait des pages importantes du site (issues de la navigation d\'en-tête) :')
    pages.forEach((p) => {
        lines.push('')
        lines.push(`### ${p.title || p.url}`)
        lines.push(`> Source : ${p.url}`)
        lines.push('')
        lines.push(p.text)
    })
}

/**
 * Ajoute les concepts appris (produits, cible, thèmes) au brief. Renvoie true
 * si au moins un concept a été injecté.
 * @param {string[]} lines
 * @param {object} concepts - { products, audiences, keywords }
 * @returns {boolean}
 */
function pushConcepts(lines, concepts = {}) {
    const products = Array.isArray(concepts.products) ? concepts.products : []
    const audiences = Array.isArray(concepts.audiences) ? concepts.audiences : []
    const keywords = Array.isArray(concepts.keywords) ? concepts.keywords : []
    if (!products.length && !audiences.length && !keywords.length) return false
    lines.push('')
    lines.push('### Concepts de la marque (appris du site, à intégrer en priorité)')
    if (products.length) lines.push(`- Produits / services : ${products.join(', ')}`)
    if (audiences.length) lines.push(`- Public cible : ${audiences.join(', ')}`)
    if (keywords.length) lines.push(`- Thèmes clés : ${keywords.join(', ')}`)
    return true
}

/**
 * Construit le prompt de génération du fichier llms.txt (index/résumé) ou
 * llms-full.txt (corpus complet structuré). Inspiré des bonnes pratiques de
 * rédaction de prompts pour ce format.
 * @param {object} context - sortie de buildSiteContext
 * @param {{keywords?: string, full?: boolean, pages?: Array}} options
 * @returns {string}
 */
export function buildLlmsTxtPrompt(context, {keywords = '', full = false, pages = [], concepts = {}} = {}) {
    const c = context || {}
    const lines = []

    if (full) {
        lines.push(`**Tâche :** À partir du contenu et de l'arborescence du site ${c.origin || '(inconnu)'}, fusionne, nettoie et structure tout le contenu pertinent pour créer le fichier **llms-full.txt** définitif (corpus complet, lisible en une seule fois par un LLM).`)
        lines.push('')
        lines.push('**Règles et format exigés :**')
        lines.push('1. **Markdown pur** : tout le texte est formaté en Markdown standard.')
        lines.push('2. **Nettoyage du bruit** : supprime tous les éléments d\'interface (menus de navigation, en-têtes de site, pieds de page, bannières « cookies », formulaires de newsletter, blocs « Lire aussi »). Ne garde QUE le contenu utile et informatif.')
        lines.push('3. **Structure hiérarchique** : `#` (H1) pour le titre du site/projet, `##` (H2) pour chaque page ou grande section, `###` (H3) pour les sous-sections.')
        lines.push('4. **Préservation du code et des données** : conserve intacts code source, requêtes API et tableaux, via des blocs de code Markdown avec coloration syntaxique (```python …```) ou des tableaux Markdown.')
        lines.push('5. **Clarté contextuelle** : avant chaque section `##` correspondant à une page, ajoute `> Source : <URL de la page>` lorsque l\'URL est connue.')
        lines.push('6. **Fluidité** : enchaîne logiquement les sections, sans répéter les mêmes introductions.')
        lines.push('')
        lines.push('Couvre chaque section identifiée dans l\'arborescence ci-dessous ; n\'invente jamais d\'URL ni de contenu factuel absent des données fournies.')
    } else {
        lines.push(`**Tâche :** À partir des informations et de l'arborescence du site ${c.origin || '(inconnu)'}, génère le meilleur fichier **llms.txt** possible (point d'entrée clair, concis et standardisé pour les autres LLM), en respectant les standards émergents de ce format.`)
        lines.push('')
        lines.push('**Règles et format exigés :**')
        lines.push('1. **Format strict** : Markdown propre.')
        lines.push('2. **Titre (H1)** : le nom du projet ou du site.')
        lines.push('3. **Description** : un résumé clair et concis (1 à 3 paragraphes maximum) — ce qu\'est ce site/projet, à quoi il sert, et quel est son public cible.')
        lines.push('4. **Notes pour l\'IA** (recommandé) : une courte section « Notes » donnant du contexte à un LLM sur la meilleure façon d\'utiliser ces informations.')
        lines.push('5. **Index des ressources (H2)** : une liste à puces des pages les plus importantes, chaque puce au format `- [Titre de la page](URL) : brève description d\'une phrase`.')
        lines.push('6. **Exclusions** : n\'inclus pas les pages inutiles pour une IA (mentions légales, politique de confidentialité, page de contact générique, etc.).')
    }

    lines.push('')
    pushInputData(lines, c, keywords)
    const hasConcepts = pushConcepts(lines, concepts)

    // Pour llms-full.txt : le contenu réel des pages du header constitue le corpus
    if (full && pages.length) pushPagesContent(lines, pages)

    lines.push('')
    if (hasConcepts) {
        lines.push(full
            ? 'Important : assure-toi que les **produits/services** et le **public cible** listés dans « Concepts de la marque » apparaissent explicitement et sont bien couverts dans le corpus.'
            : 'Important : intègre explicitement les **produits/services** et le **public cible** listés dans « Concepts de la marque » dans la description et les notes.')
        lines.push('')
    }
    lines.push('Génère maintenant le contenu complet du fichier. Renvoie UNIQUEMENT le Markdown du fichier, sans phrase avant ni après, sans bloc de code englobant.')
    if (full) {
        lines.push('Si le document est trop long pour une seule réponse, commence par le début et arrête-toi proprement (je te demanderai de « continuer »).')
    }

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
