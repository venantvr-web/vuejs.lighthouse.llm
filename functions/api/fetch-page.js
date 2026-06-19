import {ACCEPT_HEADERS, json, preflight, resolveUserAgent} from './_shared.js'

/**
 * Relais de récupération de page (équivalent serverless de POST /api/fetch-page
 * du serveur Node). Contourne le CORS car appelé en même origine par le SPA.
 * Body: { url, userAgent? } → { html, contentType, url, xRobotsTag } | { error }
 */
export async function onRequestPost({request, env}) {
    let body
    try {
        body = await request.json()
    } catch {
        return json({error: 'Corps JSON invalide'}, 400)
    }

    const {url, userAgent} = body || {}
    if (!url) return json({error: 'URL requise'}, 400)
    try {
        new URL(url)
    } catch {
        return json({error: 'URL invalide'}, 400)
    }

    try {
        const response = await fetch(url, {
            headers: {...ACCEPT_HEADERS, 'User-Agent': resolveUserAgent(userAgent, env)},
            redirect: 'follow'
        })

        if (!response.ok) {
            return json({error: `Erreur HTTP ${response.status}`, status: response.status}, response.status)
        }

        const contentType = response.headers.get('content-type') || ''
        const xRobotsTag = response.headers.get('x-robots-tag') || ''

        // HTML, XML (sitemap), texte (robots.txt, llms.txt) ou type absent
        if (
            contentType.includes('text/html') ||
            contentType.includes('application/xhtml') ||
            contentType.includes('xml') ||
            contentType.includes('text/') ||
            contentType === ''
        ) {
            const text = await response.text()
            return json({html: text, contentType, url: response.url, xRobotsTag})
        }

        return json({error: 'Type de contenu non supporté', contentType}, 415)
    } catch (error) {
        return json({error: error.message}, 500)
    }
}

export function onRequestOptions() {
    return preflight()
}
