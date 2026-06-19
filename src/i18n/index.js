/**
 * i18n maison, sans dépendance.
 *
 * Tous les textes visibles vivent dans des fragments `./messages/*.js`,
 * auto-collectés par glob (un fragment par écran → pas de fichier partagé à
 * éditer, donc pas de conflit). Chaque fragment exporte par défaut un objet
 * namespacé, ex. `export default { crawl: { title: 'Mode Crawl' } }`.
 *
 * Avantage accents : tout le français est centralisé et relisable en un endroit.
 * Locale unique (fr) pour l'instant, extensible à d'autres langues plus tard.
 *
 * @module i18n
 */

// eslint-disable-next-line no-undef
const modules = import.meta.glob('./messages/*.js', {eager: true})

function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        const value = source[key]
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            target[key] = deepMerge(target[key] || {}, value)
        } else {
            target[key] = value
        }
    }
    return target
}

// Messages fusionnés (locale fr)
export const messages = {}
for (const mod of Object.values(modules)) {
    if (mod && mod.default) deepMerge(messages, mod.default)
}

/**
 * Traduit une clé pointée (ex. 'crawl.title'). Interpolation `{var}` via params.
 * Retourne la clé telle quelle si absente (évite tout crash en cas d'oubli).
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function t(key, params) {
    if (!key) return ''
    let cursor = messages
    for (const part of key.split('.')) {
        cursor = cursor?.[part]
        if (cursor === undefined) return key
    }
    if (typeof cursor !== 'string') return key
    if (params) {
        return cursor.replace(/\{(\w+)\}/g, (_, name) => (params[name] ?? `{${name}}`))
    }
    return cursor
}

/** Usage dans `<script setup>` : `const { t } = useI18n()`. */
export function useI18n() {
    return {t, messages}
}

/** Plugin Vue : expose `$t` dans tous les templates. */
export default {
    install(app) {
        app.config.globalProperties.$t = t
    }
}
