import {reactive} from 'vue'

/**
 * Dialogue de confirmation partagé (charte unique, en remplacement de
 * `window.confirm()` et des modales maison). Un seul `<ConfirmDialog/>` est
 * monté dans App.vue ; n'importe quel composant appelle `confirm(opts)` et
 * reçoit une promesse résolue à `true` (confirmé) ou `false` (annulé).
 *
 * @example
 *   const {confirm} = useConfirm()
 *   if (await confirm({message: 'Supprimer cet élément ?'})) remove()
 */
const state = reactive({
    open: false,
    title: '',
    message: '',
    confirmLabel: '',
    cancelLabel: '',
    danger: true,
    resolver: null
})

export function useConfirm() {
    /**
     * Ouvre le dialogue et attend la décision de l'utilisateur.
     * @param {{title?: string, message?: string, confirmLabel?: string, cancelLabel?: string, danger?: boolean}} [opts]
     * @returns {Promise<boolean>}
     */
    function confirm(opts = {}) {
        state.title = opts.title || ''
        state.message = opts.message || ''
        state.confirmLabel = opts.confirmLabel || ''
        state.cancelLabel = opts.cancelLabel || ''
        state.danger = opts.danger !== false
        state.open = true
        return new Promise((resolve) => {
            state.resolver = resolve
        })
    }

    /**
     * Ferme le dialogue et résout la promesse en cours.
     * @param {boolean} value
     */
    function settle(value) {
        state.open = false
        const resolve = state.resolver
        state.resolver = null
        if (resolve) resolve(value)
    }

    return {state, confirm, settle}
}

export default useConfirm
