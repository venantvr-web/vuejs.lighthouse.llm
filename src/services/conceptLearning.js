/**
 * Apprentissage de concepts d'une marque à partir d'un instantané de son site.
 *
 * Les fonctions sont pures et testées : `buildConceptExtractionPrompt` construit
 * la requête LLM, `parseConcepts` valide/normalise sa réponse JSON. Le secteur
 * étant déjà connu (identité du site), on apprend ici les **produits/services**,
 * les **cibles** (« à qui cela s'adresse ») et des **thèmes** clés, pour enrichir
 * et préremplir les prompts GEO.
 *
 * @module services/conceptLearning
 */

/**
 * Réduit une liste hétérogène à des chaînes propres, dédupliquées et bornées.
 * @param {*} arr
 * @param {{max?: number, maxLen?: number}} [opts]
 * @returns {string[]}
 */
function cleanList(arr, {max = 12, maxLen = 48} = {}) {
    if (!Array.isArray(arr)) return []
    const seen = new Set()
    const out = []
    for (const value of arr) {
        const s = String(value ?? '').trim()
        if (!s || s.length > maxLen) continue
        const key = s.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        out.push(s)
        if (out.length >= max) break
    }
    return out
}

/**
 * Aplatit les liens de navigation (header/footer) en libellés lisibles.
 * @param {Array} arr
 * @returns {string}
 */
function linkLabels(arr) {
    return (arr || [])
        .map(l => (l && (l.text || l.label || l.href)) || (typeof l === 'string' ? l : ''))
        .map(s => String(s).trim())
        .filter(Boolean)
        .slice(0, 40)
        .join(' · ')
}

/**
 * Construit le prompt d'extraction de concepts à partir du contexte de site
 * (sortie de `buildSiteContext`). Le secteur est fourni en indice pour cadrer
 * l'extraction (anti-homonyme), il n'est pas réappris.
 * @param {object} context - { title, description, headerLinks, footerLinks, sitemap }
 * @param {{brand?: string, sector?: string}} [meta]
 * @returns {string}
 */
export function buildConceptExtractionPrompt(context = {}, {brand = '', sector = ''} = {}) {
    const c = context || {}
    const sections = (c.sitemap?.sections || [])
        .map(s => `${s.section} (${s.count})`)
        .join(', ')
    const nav = [linkLabels(c.headerLinks), linkLabels(c.footerLinks)].filter(Boolean).join(' · ')

    return `Tu analyses le site d'une marque pour en extraire des concepts réutilisables. ` +
        `Marque : « ${brand || '?'} »${sector ? `, secteur : ${sector} (ne le confonds pas avec un homonyme d'un autre secteur)` : ''}.\n\n` +
        `Données du site :\n` +
        `- Titre : ${c.title || '—'}\n` +
        `- Description : ${c.description || '—'}\n` +
        `- Sections du sitemap : ${sections || '—'}\n` +
        `- Navigation : ${nav || '—'}\n\n` +
        `Renvoie UNIQUEMENT un objet JSON, sans autre texte, de la forme ` +
        `{"products": ["..."], "audiences": ["..."], "keywords": ["..."]} où :\n` +
        `- "products" : les produits ou services concrets proposés par « ${brand} » (noms courts, 2 à 4 mots).\n` +
        `- "audiences" : à qui s'adresse la marque (segments de clientèle, profils cibles).\n` +
        `- "keywords" : thèmes, besoins ou cas d'usage clés couverts par le site.\n` +
        `Au plus 8 éléments par liste, en français, sans doublon ni phrase. Si une liste est inconnue, renvoie [].`
}

/**
 * Parse la réponse JSON d'extraction de concepts, tolérant aux fences et au bruit.
 * @param {string} text - Sortie du modèle
 * @returns {{products: string[], audiences: string[], keywords: string[]}}
 */
export function parseConcepts(text) {
    const empty = {products: [], audiences: [], keywords: []}
    if (!text) return empty
    const cleaned = String(text).replace(/```(?:json)?/gi, '').trim()
    const match = cleaned.match(/\{[\s\S]*}/)
    if (!match) return empty
    try {
        const parsed = JSON.parse(match[0])
        return {
            products: cleanList(parsed.products),
            audiences: cleanList(parsed.audiences),
            keywords: cleanList(parsed.keywords)
        }
    } catch {
        return empty
    }
}
