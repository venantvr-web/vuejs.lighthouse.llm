/**
 * Configuration partagée du serveur proxy.
 * @module server/config
 */

// Identité de l'outil exposée aux sites distants.
// NB : tenu aligné manuellement avec la version de server/package.json.
export const APP_NAME = 'LighthouseAIAnalyzer'
export const APP_VERSION = '1.0.0'
export const APP_URL = 'https://github.com/venantvr-web/vuejs.lighthouse.llm'

/**
 * User-Agent identifiant l'outil, au format « bon citoyen » utilisé par les
 * robots légitimes (Googlebot, bingbot…) : Mozilla/5.0 (compatible; Nom/Version; +url).
 * Transparent et identifiable — adapté à la lecture de robots.txt, sitemaps,
 * llms.txt. Surchargeable via la variable d'environnement LIGHTHOUSE_USER_AGENT.
 */
export const USER_AGENT =
    process.env.LIGHTHOUSE_USER_AGENT ||
    `Mozilla/5.0 (compatible; ${APP_NAME}/${APP_VERSION}; +${APP_URL})`

/**
 * En-têtes par défaut pour les requêtes sortantes vers les sites distants.
 */
export const FETCH_HEADERS = {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
}

/**
 * Résout le User-Agent à utiliser pour une requête : valeur fournie par le
 * client si elle est exploitable, sinon le défaut. La valeur est assainie pour
 * éviter toute injection d'en-tête (retours chariot / caractères de contrôle)
 * et bornée en longueur.
 * @param {unknown} candidate - User-Agent proposé par le client
 * @returns {string}
 */
export function resolveUserAgent(candidate) {
    if (typeof candidate !== 'string') return USER_AGENT
    // Retire les caractères de contrôle (codes < 32 et 127, dont CR/LF),
    // puis borne la longueur pour éviter toute injection d'en-tête.
    const sanitized = Array.from(candidate)
        .filter((ch) => {
            const code = ch.charCodeAt(0)
            return code > 31 && code !== 127
        })
        .join('')
        .trim()
        .slice(0, 256)
    return sanitized || USER_AGENT
}
