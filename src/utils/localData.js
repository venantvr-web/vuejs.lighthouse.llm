/**
 * Maintenance des données locales (IndexedDB).
 *
 * Permet de supprimer les bases pour récupérer d'un schéma corrompu (« la base
 * ne s'ouvre plus ») ou repartir de zéro.
 *
 * @module utils/localData
 */

// Bases IndexedDB connues de l'application.
export const APP_DATABASES = [
    'lighthouse-history',
    'geo-tracking',
    'search-console-history',
    'resource-history',
    'briefing-history',
    'ai-artifacts-history'
]

/**
 * Liste les bases à supprimer : les bases connues + celles éventuellement
 * découvertes via indexedDB.databases() (Chromium).
 * @returns {Promise<string[]>}
 */
export async function listDatabaseNames() {
    const names = new Set(APP_DATABASES)
    try {
        if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
            const dbs = await indexedDB.databases()
            dbs.forEach((d) => d?.name && names.add(d.name))
        }
    } catch {
        // indexedDB.databases() indisponible : on s'en tient à la liste connue
    }
    return [...names]
}

/**
 * Supprime une base. Résout même en cas de blocage (connexions ouvertes) : la
 * suppression s'achèvera à la fermeture des connexions (ex. au rechargement).
 * @param {string} name
 * @returns {Promise<{name: string, ok: boolean, blocked?: boolean, error?: string}>}
 */
export function deleteDatabase(name) {
    return new Promise((resolve) => {
        try {
            const request = indexedDB.deleteDatabase(name)
            request.onsuccess = () => resolve({name, ok: true})
            request.onerror = () => resolve({name, ok: false, error: request.error?.message || 'erreur'})
            request.onblocked = () => resolve({name, ok: true, blocked: true})
        } catch (e) {
            resolve({name, ok: false, error: e.message})
        }
    })
}

/**
 * Supprime toutes les bases de l'application.
 * @returns {Promise<Array>}
 */
export async function deleteAllDatabases() {
    const names = await listDatabaseNames()
    return Promise.all(names.map(deleteDatabase))
}
