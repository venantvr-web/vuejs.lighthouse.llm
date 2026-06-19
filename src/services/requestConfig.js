/**
 * Réglages des requêtes sortantes côté client, paramétrables et persistés.
 * Lu par les services qui passent par le proxy (resourceCheck, urlDiscovery)
 * et écrit par l'écran Paramètres. Volontairement sans dépendance Pinia pour
 * rester fiable même si aucun store n'est instancié au moment de l'appel.
 * @module services/requestConfig
 */

const STORAGE_KEY = 'lighthouse-user-agent'
const PROXY_KEY = 'lighthouse-proxy-base'
const MODE_KEY = 'lighthouse-fetch-mode'

// Modes de récupération des ressources distantes.
export const FETCH_MODES = {
    // Passe par le relais HTTP (proxy/Pages Functions) — contourne le CORS.
    PROXY: 'proxy',
    // Requête directe depuis le navigateur — pas de relais. Convient quand la
    // cible est la même origine (ton site de prod) ou autorise le CORS.
    DIRECT: 'direct'
}

// User-Agent par défaut (aligné avec server/config.js).
export const DEFAULT_USER_AGENT =
    'Mozilla/5.0 (compatible; LighthouseAIAnalyzer/1.0.0; +https://github.com/venantvr-web/vuejs.lighthouse.llm)'

/**
 * Base du relais HTTP par défaut. En production, on vise la même origine
 * (Pages Functions Cloudflare → /api/...), donc base vide. En développement,
 * le serveur Node local sur le port 3001. Surchargeable via VITE_PROXY_BASE.
 */
function defaultProxyBase() {
    const env = import.meta.env?.VITE_PROXY_BASE
    if (typeof env === 'string' && env) return env
    return import.meta.env?.DEV ? 'http://localhost:3001' : ''
}

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

// --- Base du relais HTTP (proxy) ---

function loadProxyBase() {
    try {
        return localStorage.getItem(PROXY_KEY) || ''
    } catch {
        return ''
    }
}

let proxyBase = loadProxyBase()

/** Base effective du relais (réglage utilisateur ou défaut). */
export function getProxyBase() {
    return proxyBase || defaultProxyBase()
}

/** Valeur brute configurée ('' si non personnalisée). */
export function getRawProxyBase() {
    return proxyBase
}

/** Défaut affichable (pour le placeholder). */
export function getDefaultProxyBase() {
    return defaultProxyBase()
}

/** Définit (et persiste) la base du relais. Vide = défaut. */
export function setProxyBase(base) {
    proxyBase = (base || '').trim().replace(/\/$/, '')
    try {
        if (proxyBase) localStorage.setItem(PROXY_KEY, proxyBase)
        else localStorage.removeItem(PROXY_KEY)
    } catch {
        // best-effort
    }
}

/** Construit une URL de relais à partir d'un chemin (ex. '/api/fetch-page'). */
export function proxyUrl(path) {
    return `${getProxyBase()}${path}`
}

// --- Mode de récupération (relais vs direct) ---

let fetchMode = (() => {
    try {
        return localStorage.getItem(MODE_KEY) || FETCH_MODES.PROXY
    } catch {
        return FETCH_MODES.PROXY
    }
})()

export function getFetchMode() {
    return fetchMode
}

export function isDirectFetch() {
    return fetchMode === FETCH_MODES.DIRECT
}

export function setFetchMode(mode) {
    fetchMode = mode === FETCH_MODES.DIRECT ? FETCH_MODES.DIRECT : FETCH_MODES.PROXY
    try {
        localStorage.setItem(MODE_KEY, fetchMode)
    } catch {
        // best-effort
    }
}
