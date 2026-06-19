/**
 * i18n maison, sans dépendance, multi-locale (fr + en).
 *
 * Les textes vivent dans des fragments `./messages/<locale>/*.js`, auto-collectés
 * par glob (un fragment par écran → pas de fichier partagé, donc pas de conflit).
 * Chaque fragment exporte par défaut un objet namespacé, ex.
 * `export default { crawl: { title: 'Mode Crawl' } }`.
 *
 * La locale est réactive et persistée ; `$t`/`t` re-rendent les composants au
 * changement de langue. Repli sur le français si une clé manque dans la locale
 * courante, puis sur la clé elle-même (jamais de crash).
 *
 * @module i18n
 */

import {ref} from 'vue'

const LOCALE_KEY = 'lighthouse-locale'
export const SUPPORTED_LOCALES = ['fr', 'en']
export const DEFAULT_LOCALE = 'fr'

// eslint-disable-next-line no-undef
const frModules = import.meta.glob('./messages/fr/*.js', {eager: true})
// eslint-disable-next-line no-undef
const enModules = import.meta.glob('./messages/en/*.js', {eager: true})

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

function buildLocale(modules) {
    const out = {}
    for (const mod of Object.values(modules)) {
        if (mod && mod.default) deepMerge(out, mod.default)
    }
    return out
}

// Messages par locale : { fr: {...}, en: {...} }
export const messages = {
    fr: buildLocale(frModules),
    en: buildLocale(enModules)
}

function loadLocale() {
    try {
        const stored = localStorage.getItem(LOCALE_KEY)
        if (SUPPORTED_LOCALES.includes(stored)) return stored
    } catch {
        // localStorage indisponible
    }
    return DEFAULT_LOCALE
}

// Locale courante (réactive) — lue par t() pour re-rendre au changement.
export const locale = ref(loadLocale())

if (typeof document !== 'undefined') {
    document.documentElement.lang = locale.value
}

function resolve(dict, key) {
    let cursor = dict
    for (const part of key.split('.')) {
        cursor = cursor?.[part]
        if (cursor === undefined) return undefined
    }
    return cursor
}

/**
 * Traduit une clé pointée (ex. 'crawl.title'). Interpolation `{var}` via params.
 * Repli : locale courante → français → la clé telle quelle.
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function t(key, params) {
    if (!key) return ''
    let value = resolve(messages[locale.value] || messages[DEFAULT_LOCALE], key)
    if (value === undefined && locale.value !== DEFAULT_LOCALE) {
        value = resolve(messages[DEFAULT_LOCALE], key)
    }
    if (typeof value !== 'string') return key
    if (params) {
        return value.replace(/\{(\w+)\}/g, (_, name) => (params[name] ?? `{${name}}`))
    }
    return value
}

/** Change (et persiste) la locale courante. */
export function setLocale(next) {
    if (!SUPPORTED_LOCALES.includes(next)) return
    locale.value = next
    try {
        localStorage.setItem(LOCALE_KEY, next)
    } catch {
        // best-effort
    }
    if (typeof document !== 'undefined') {
        document.documentElement.lang = next
    }
}

/** Usage dans `<script setup>` : `const { t } = useI18n()`. */
export function useI18n() {
    return {t, locale, setLocale, messages, SUPPORTED_LOCALES}
}

/** Plugin Vue : expose `$t` dans tous les templates. */
export default {
    install(app) {
        app.config.globalProperties.$t = t
    }
}
