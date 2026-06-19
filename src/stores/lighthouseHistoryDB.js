/**
 * Schéma partagé de la base IndexedDB « lighthouse-history », utilisée à la fois
 * par scoreHistoryStore (scores) et crawlStore (sessions de crawl).
 *
 * Les deux stores DOIVENT employer le même nom, la même version et la même
 * fonction de mise à niveau, sinon l'un ouvre la base à une version inférieure
 * et IndexedDB lève une VersionError (« ça ne s'ouvre plus »).
 *
 * La mise à niveau est idempotente (create-if-missing) : l'ordre d'ouverture
 * des deux stores n'a plus d'importance.
 *
 * @module stores/lighthouseHistoryDB
 */

export const LH_DB_NAME = 'lighthouse-history'
export const LH_DB_VERSION = 5
export const SCORES_STORE = 'scores'
export const CRAWL_SESSIONS_STORE = 'crawl-sessions'
export const REPORTS_STORE = 'reports'

/**
 * Crée les object stores manquants. Sûr quel que soit l'ordre d'ouverture.
 * @param {IDBDatabase} db
 */
export function upgradeLighthouseHistory(db) {
    if (!db.objectStoreNames.contains(SCORES_STORE)) {
        const scores = db.createObjectStore(SCORES_STORE, {keyPath: 'id'})
        scores.createIndex('domain', 'domain', {unique: false})
        scores.createIndex('timestamp', 'timestamp', {unique: false})
        scores.createIndex('domain_timestamp', ['domain', 'timestamp'], {unique: false})
    }
    if (!db.objectStoreNames.contains(CRAWL_SESSIONS_STORE)) {
        const crawl = db.createObjectStore(CRAWL_SESSIONS_STORE, {keyPath: 'id'})
        crawl.createIndex('domain', 'domain', {unique: false})
        crawl.createIndex('timestamp', 'timestamp', {unique: false})
        crawl.createIndex('status', 'status', {unique: false})
    }
    if (!db.objectStoreNames.contains(REPORTS_STORE)) {
        const reports = db.createObjectStore(REPORTS_STORE, {keyPath: 'id'})
        reports.createIndex('scoreId', 'scoreId', {unique: true})
        reports.createIndex('timestamp', 'timestamp', {unique: false})
    }
}
