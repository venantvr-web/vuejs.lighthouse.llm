/**
 * Génération de données structurées (JSON-LD) assistée par IA pour les pages
 * crawlées dont les micro-données sont manquantes ou incomplètes.
 *
 * Les fonctions de détection, de contexte et de parsing sont pures (testées) ;
 * l'appel LLM est orchestré par le composable useStructuredData.
 *
 * @module services/structuredDataGen
 */

import {extractJsonLd, jsonLdTypes, validateJsonLd} from './resourceCheck'

function decodeEntities(s = '') {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
}

function stripTags(s = '') {
    return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Extrait un contexte minimal de la page pour nourrir le prompt (titre, méta
 * description, langue, premiers titres H1/H2).
 * @param {string} html
 * @returns {{title: string, description: string, lang: string, headings: string[]}}
 */
export function extractPageContext(html = '') {
    const ctx = {title: '', description: '', lang: '', headings: []}
    if (!html) return ctx

    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (title) ctx.title = decodeEntities(stripTags(title[1]))

    const desc = html.match(/<meta\b[^>]*\bname=["']description["'][^>]*>/i)
    if (desc) {
        const content = desc[0].match(/\bcontent=["']([^"']*)["']/i)
        if (content) ctx.description = decodeEntities(content[1].trim())
    }

    const lang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)
    if (lang) ctx.lang = lang[1].trim()

    const headings = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)]
        .map((m) => decodeEntities(stripTags(m[1])))
        .filter(Boolean)
    ctx.headings = [...new Set(headings)].slice(0, 8)

    return ctx
}

/**
 * Analyse les données structurées d'une page et indique si une génération est
 * souhaitable (aucune donnée, ou données incomplètes).
 * @param {string} html
 * @returns {{present: boolean, types: string[], issues: Array, needsGeneration: boolean}}
 */
export function analyzeStructuredData(html = '') {
    const blocks = extractJsonLd(html)
    const types = jsonLdTypes(blocks)
    const issues = validateJsonLd(blocks)
    const present = types.length > 0
    return {present, types, issues, needsGeneration: !present || issues.length > 0}
}

export const STRUCTURED_DATA_SYSTEM =
    'Tu es un expert des données structurées Schema.org / JSON-LD pour le SEO et les moteurs de réponse IA. ' +
    'Tu produis uniquement du JSON-LD valide et conforme à Schema.org, sans aucun commentaire.'

/**
 * Construit le prompt de génération du JSON-LD pour une page.
 * @param {{url: string, context: object, types?: string[], issues?: Array}} input
 * @returns {string}
 */
export function buildStructuredDataPrompt({url, context = {}, types = [], issues = []}) {
    const lines = []
    lines.push(`Génère le balisage JSON-LD Schema.org le plus pertinent pour cette page : ${url}`)
    lines.push('')
    lines.push('## Contexte de la page')
    if (context.title) lines.push(`- Titre : ${context.title}`)
    if (context.description) lines.push(`- Description : ${context.description}`)
    if (context.lang) lines.push(`- Langue : ${context.lang}`)
    if (context.headings?.length) {
        lines.push('- Titres (H1/H2) :')
        context.headings.forEach((h) => lines.push(`  - ${h}`))
    }
    lines.push('')
    lines.push('## État actuel des données structurées')
    lines.push(types.length ? `- Types déjà présents : ${types.join(', ')}` : '- Aucune donnée structurée détectée.')
    issues.forEach((i) => lines.push(`- ${i.type} incomplet : champ(s) manquant(s) — ${(i.missing || []).join(', ')}`))
    lines.push('')
    lines.push('## Consignes')
    lines.push("- Choisis le ou les @type adaptés (ex. WebPage, Organization, BreadcrumbList, Article, Product, FAQPage…) d'après le contexte.")
    lines.push('- Regroupe les nœuds dans un objet unique avec "@context": "https://schema.org" et un tableau "@graph".')
    lines.push('- Remplis les champs à partir du contexte fourni ; n\'invente pas de données factuelles (prix, notes, dates) absentes.')
    lines.push('- Complète/corrige les types existants signalés comme incomplets.')
    lines.push('- Réponds UNIQUEMENT par le JSON-LD, sans texte autour ni bloc de code Markdown.')
    return lines.join('\n')
}

/**
 * Parse la réponse du LLM en JSON-LD : tolère les blocs de code Markdown et le
 * texte parasite, valide la présence d'un @context/@type/@graph.
 * @param {string} text
 * @returns {{json: object|null, pretty: string, error: string|null}}
 */
export function parseStructuredData(text = '') {
    let raw = (text || '').trim()
    // Retire un éventuel bloc de code Markdown ```json … ```
    const fence = raw.match(/```(?:json|ld\+json)?\s*([\s\S]*?)```/i)
    if (fence) raw = fence[1].trim()

    // À défaut, isole du premier { ou [ jusqu'au dernier } ou ]
    if (!/^[[{]/.test(raw)) {
        const start = raw.search(/[[{]/)
        const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'))
        if (start !== -1 && end > start) raw = raw.slice(start, end + 1)
    }

    let json
    try {
        json = JSON.parse(raw)
    } catch {
        return {json: null, pretty: '', error: 'Réponse non analysable en JSON.'}
    }

    const hasSchema = (node) => {
        if (!node || typeof node !== 'object') return false
        if (Array.isArray(node)) return node.some(hasSchema)
        return !!(node['@context'] || node['@type'] || node['@graph'])
    }
    if (!hasSchema(json)) {
        return {json: null, pretty: '', error: 'JSON sans @context/@type/@graph.'}
    }

    return {json, pretty: JSON.stringify(json, null, 2), error: null}
}

/**
 * Enveloppe le JSON-LD dans une balise script prête à coller.
 * @param {string} pretty - JSON-LD indenté
 * @returns {string}
 */
export function toScriptTag(pretty) {
    return `<script type="application/ld+json">\n${pretty}\n<\/script>`
}
