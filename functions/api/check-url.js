import {json, preflight, resolveUserAgent} from './_shared.js'

/**
 * Vérification légère de statut HTTP (équivalent serverless de POST
 * /api/check-url). Renvoie toujours 200 en encapsulant le statut amont.
 * Body: { url, userAgent? } → { ok, status, url }
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
            method: 'GET',
            redirect: 'follow',
            headers: {'User-Agent': resolveUserAgent(userAgent, env)}
        })
        return json({ok: response.ok, status: response.status, url: response.url})
    } catch (error) {
        return json({ok: false, status: 0, error: error.message})
    }
}

export function onRequestOptions() {
    return preflight()
}
