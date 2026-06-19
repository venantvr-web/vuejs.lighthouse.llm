import {json} from './api/_shared.js'

/**
 * Santé du relais serverless. chromium:false car les audits Lighthouse (Chrome
 * headless) ne tournent pas en environnement serverless — ils restent réservés
 * au serveur local. Suffit à valider que le relais de récupération est dispo.
 */
export function onRequestGet() {
    return json({status: 'ok', chromium: false, runtime: 'cloudflare', timestamp: new Date().toISOString()})
}
