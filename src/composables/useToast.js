import {reactive} from 'vue'

/**
 * Système de toasts global (notifications in-app), sans dépendance ni store.
 * Utilisable partout via useToast() ; rendu par <ToastHost/> (monté dans App).
 *
 * Chaque toast : { id, type, message, details?, actions?, createdAt }.
 * Les erreurs sont « collantes » par défaut (durée 0 = pas d'auto-dismiss) et
 * peuvent embarquer un bloc `details` technique dépliable (erreurs verbeuses).
 *
 * @module composables/useToast
 */

const MAX_TOASTS = 6
const DEFAULT_DURATIONS = {success: 4000, info: 5000, warning: 7000, error: 0}

const state = reactive({toasts: []})
let seq = 0

/** Retire un toast par id. */
export function dismissToast(id) {
    const i = state.toasts.findIndex((t) => t.id === id)
    if (i !== -1) state.toasts.splice(i, 1)
}

/**
 * Construit une description technique verbeuse à partir d'une erreur/inconnu.
 * @param {*} err
 * @returns {string}
 */
export function describeError(err) {
    if (!err) return ''
    if (typeof err === 'string') return err
    const parts = []
    if (err.name && err.name !== 'Error') parts.push(err.name)
    if (err.message) parts.push(err.message)
    if (typeof err.status === 'number' && err.status) parts.push(`HTTP ${err.status}`)
    if (err.url) parts.push(err.url)
    if (err.cause && err.cause.message) parts.push(String(err.cause.message))
    return parts.join(' · ')
}

/**
 * Ajoute un toast.
 * @param {object} opts - { type, message, details, actions, duration }
 * @returns {number} id
 */
export function pushToast({type = 'info', message = '', details = '', actions = [], duration} = {}) {
    const id = ++seq
    const ms = duration ?? DEFAULT_DURATIONS[type] ?? 5000
    state.toasts.push({id, type, message, details, actions, createdAt: Date.now()})
    // Borne la pile : retire les plus anciens au-delà de MAX_TOASTS
    if (state.toasts.length > MAX_TOASTS) state.toasts.splice(0, state.toasts.length - MAX_TOASTS)
    if (ms > 0) setTimeout(() => dismissToast(id), ms)
    return id
}

/**
 * API de toasts.
 */
export function useToast() {
    return {
        toasts: state.toasts,
        dismiss: dismissToast,
        push: pushToast,
        success: (message, opts = {}) => pushToast({type: 'success', message, ...opts}),
        info: (message, opts = {}) => pushToast({type: 'info', message, ...opts}),
        warning: (message, opts = {}) => pushToast({type: 'warning', message, ...opts}),
        error: (message, opts = {}) => pushToast({type: 'error', message, ...opts}),
        /** Toast d'erreur avec détails techniques extraits de `err`. */
        fromError: (message, err, opts = {}) =>
            pushToast({type: 'error', message, details: describeError(err), ...opts})
    }
}

export default useToast
