/**
 * Authentification par **compte de service** Google (sans popup OAuth).
 *
 * À partir d'une clé JSON de compte de service, on signe un JWT (RS256, via
 * Web Crypto) et on l'échange contre un jeton d'accès au point de jeton Google.
 * Le jeton sert ensuite d'en-tête Bearer pour l'API Search Console.
 *
 * ⚠️ La clé privée vit dans le navigateur (local-first, BYO-key). Le compte de
 * service doit être ajouté comme **utilisateur** de la propriété dans Search
 * Console, sinon l'accès est vide.
 *
 * @module services/googleServiceAccount
 */

const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token'
const JWT_BEARER = 'urn:ietf:params:oauth:grant-type:jwt-bearer'

/**
 * Encode des octets en base64url (sans padding).
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function base64UrlFromBytes(bytes) {
    let bin = ''
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Encode une chaîne UTF-8 en base64url.
 * @param {string} str
 * @returns {string}
 */
export function base64UrlFromString(str) {
    return base64UrlFromBytes(new TextEncoder().encode(str))
}

/**
 * Convertit une clé privée PEM (PKCS#8) en ArrayBuffer DER.
 * @param {string} pem
 * @returns {ArrayBuffer}
 */
export function pemToArrayBuffer(pem) {
    const b64 = String(pem || '')
        .replace(/-----BEGIN [^-]+-----/g, '')
        .replace(/-----END [^-]+-----/g, '')
        .replace(/\s+/g, '')
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes.buffer
}

/**
 * Valide et normalise une clé JSON de compte de service.
 * @param {string|object} input - Contenu JSON (chaîne ou objet)
 * @returns {{client_email: string, private_key: string, token_uri: string}}
 * @throws {Error} si la clé est invalide/incomplète
 */
export function parseServiceAccountKey(input) {
    let key
    try {
        key = typeof input === 'string' ? JSON.parse(input) : input
    } catch {
        throw new Error('Clé JSON invalide (JSON illisible).')
    }
    if (!key || typeof key !== 'object') throw new Error('Clé JSON invalide.')
    if (key.type && key.type !== 'service_account') {
        throw new Error('Ce fichier n\'est pas une clé de compte de service.')
    }
    if (!key.client_email || !key.private_key) {
        throw new Error('Clé incomplète : « client_email » et « private_key » sont requis.')
    }
    return {
        client_email: key.client_email,
        private_key: key.private_key,
        token_uri: key.token_uri || DEFAULT_TOKEN_URI
    }
}

/**
 * Construit les revendications (claims) du JWT d'assertion.
 * @param {{client_email: string, token_uri: string}} key
 * @param {string} scope
 * @param {number} now - Timestamp en secondes
 * @returns {object}
 */
export function buildJwtClaims(key, scope, now = Math.floor(Date.now() / 1000)) {
    return {
        iss: key.client_email,
        scope,
        aud: key.token_uri || DEFAULT_TOKEN_URI,
        iat: now,
        exp: now + 3600
    }
}

/**
 * Signe le JWT (RS256) et l'échange contre un jeton d'accès Google.
 * @param {string|object} keyInput - Clé JSON de compte de service
 * @param {string} scope - Scope OAuth (ex. webmasters.readonly)
 * @returns {Promise<string>} access_token
 */
export async function getServiceAccountToken(keyInput, scope) {
    const key = parseServiceAccountKey(keyInput)

    const header = {alg: 'RS256', typ: 'JWT'}
    const claims = buildJwtClaims(key, scope)
    const signingInput = `${base64UrlFromString(JSON.stringify(header))}.${base64UrlFromString(JSON.stringify(claims))}`

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        pemToArrayBuffer(key.private_key),
        {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'},
        false,
        ['sign']
    )
    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder().encode(signingInput)
    )
    const jwt = `${signingInput}.${base64UrlFromBytes(new Uint8Array(signature))}`

    const response = await fetch(key.token_uri, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({grant_type: JWT_BEARER, assertion: jwt})
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.access_token) {
        throw new Error(data.error_description || data.error || `Échec de l'obtention du jeton (HTTP ${response.status}).`)
    }
    return data.access_token
}
