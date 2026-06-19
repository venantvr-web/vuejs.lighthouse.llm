/**
 * Utilitaires partagés des Pages Functions Cloudflare (relais HTTP serverless).
 * Les fichiers préfixés par « _ » ne sont pas routés par Pages.
 */

export const DEFAULT_USER_AGENT =
    'Mozilla/5.0 (compatible; LighthouseAIAnalyzer/1.0.0; +https://github.com/venantvr-web/vuejs.lighthouse.llm)'

export const ACCEPT_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
}

const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type'
}

/**
 * Résout le User-Agent : valeur cliente assainie (anti-injection d'en-tête,
 * longueur bornée) sinon le défaut (surchargé par la variable LIGHTHOUSE_USER_AGENT).
 */
export function resolveUserAgent(candidate, env) {
    const fallback = (env && env.LIGHTHOUSE_USER_AGENT) || DEFAULT_USER_AGENT
    if (typeof candidate !== 'string') return fallback
    const sanitized = Array.from(candidate)
        .filter((ch) => {
            const code = ch.charCodeAt(0)
            return code > 31 && code !== 127
        })
        .join('')
        .trim()
        .slice(0, 256)
    return sanitized || fallback
}

export function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {'content-type': 'application/json; charset=utf-8', ...CORS}
    })
}

export function preflight() {
    return new Response(null, {status: 204, headers: CORS})
}
