/**
 * Réglages des requêtes sortantes côté client, paramétrables et persistés.
 * Lu par les services qui passent par le proxy (resourceCheck, urlDiscovery)
 * et écrit par l'écran Paramètres. Volontairement sans dépendance Pinia pour
 * rester fiable même si aucun store n'est instancié au moment de l'appel.
 * @module services/requestConfig
 */

const STORAGE_KEY = 'lighthouse-user-agent'

// User-Agent par défaut (aligné avec server/config.js).
export const DEFAULT_USER_AGENT =
    'Mozilla/5.0 (compatible; LighthouseAIAnalyzer/1.0.0; +https://github.com/venantvr-web/vuejs.lighthouse.llm)'

function load() {
    try {
        return localStorage.getItem(STORAGE_KEY) || ''
    } catch {
        return ''
    }
}

// Valeur brute saisie par l'utilisateur ('' = utiliser le défaut)
let current = load()

/**
 * User-Agent effectif à envoyer (réglage utilisateur ou défaut).
 * @returns {string}
 */
export function getUserAgent() {
    return current || DEFAULT_USER_AGENT
}

/**
 * Valeur brute configurée ('' si l'utilisateur n'a rien personnalisé).
 * @returns {string}
 */
export function getRawUserAgent() {
    return current
}

/**
 * Définit (et persiste) le User-Agent. Une chaîne vide rétablit le défaut.
 * @param {string} ua
 */
export function setUserAgent(ua) {
    current = (ua || '').trim()
    try {
        if (current) localStorage.setItem(STORAGE_KEY, current)
        else localStorage.removeItem(STORAGE_KEY)
    } catch {
        // best-effort
    }
}
