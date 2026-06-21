/**
 * Instantané d'un domaine pour le Studio LLM et la veille automatique.
 *
 * `fetchSiteSnapshot` fait le réseau (page d'accueil + sitemap + fichiers
 * llms publiés) ; les fonctions de comparaison sont pures et testées.
 *
 * @module services/llmSnapshot
 */

import {fetchResource, originFromUrl} from './resourceCheck'
import {discoverBySitemap} from './urlDiscovery'
import {canonicalUrl} from '@/utils/url'
import {buildSiteContext, detectContextChanges} from './llmsTxt'

/**
 * Récupère un instantané complet d'un domaine.
 * @param {string} url
 * @returns {Promise<{origin: string, context: object, liveLlms: {present: boolean, content: string}, liveLlmsFull: {present: boolean, content: string}}>}
 */
export async function fetchSiteSnapshot(url) {
    const origin = originFromUrl(url)
    if (!origin) throw new Error('URL invalide.')
    const base = origin.replace(/\/$/, '')

    const [home, sitemapUrls, llms, llmsFull] = await Promise.all([
        fetchResource(origin),
        discoverBySitemap(origin, {maxPages: 2000}).catch(() => []),
        fetchResource(`${base}/llms.txt`),
        fetchResource(`${base}/llms-full.txt`)
    ])

    if (!home.available) throw new Error('home-unreachable')

    return {
        origin,
        // Origine canonique (/ final) pour l'affichage et les artefacts générés
        context: buildSiteContext({origin: canonicalUrl(origin), html: home.content, sitemapUrls}),
        liveLlms: {present: llms.available, content: llms.available ? llms.content : ''},
        liveLlmsFull: {present: llmsFull.available, content: llmsFull.available ? llmsFull.content : ''}
    }
}

/**
 * Réduit un contexte complet à la forme légère stockée pour la veille.
 * @param {object} context - sortie de buildSiteContext
 * @returns {{title: string, sitemap: {total: number, sections: Array<{section: string, count: number}>}}}
 */
export function liteContext(context = {}) {
    return {
        title: context.title || '',
        sitemap: {
            total: context.sitemap?.total ?? 0,
            sections: (context.sitemap?.sections || []).map((s) => ({section: s.section, count: s.count}))
        }
    }
}

/**
 * Compare deux instantanés légers et renvoie les changements notables.
 * @param {object} prev - { context, llmsPresent, llmsFullPresent } (peut être null)
 * @param {object} next - { context, llmsPresent, llmsFullPresent }
 * @returns {string[]} messages lisibles
 */
export function compareSnapshots(prev, next) {
    const changes = detectContextChanges(next?.context, prev?.context)
    if (prev) {
        if (prev.llmsPresent && !next.llmsPresent) changes.push('Le fichier llms.txt publié a disparu.')
        if (!prev.llmsPresent && next.llmsPresent) changes.push('Un fichier llms.txt a été publié.')
        if (prev.llmsFullPresent && !next.llmsFullPresent) changes.push('Le fichier llms-full.txt publié a disparu.')
        if (!prev.llmsFullPresent && next.llmsFullPresent) changes.push('Un fichier llms-full.txt a été publié.')
    }
    return changes
}
