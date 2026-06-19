import {ref, watch} from 'vue'

const PREFIX = 'lh:input:'

/**
 * Ref dont la valeur est mémorisée dans le localStorage : restaurée au montage
 * et réécrite à chaque changement. Sert à conserver les saisies de l'utilisateur
 * (sélections, options de formulaire) d'une session à l'autre.
 *
 * @param {string} key - Clé logique (préfixée et namespacée en interne)
 * @param {*} defaultValue - Valeur par défaut si rien n'est stocké
 * @param {{deep?: boolean}} [options] - deep:true pour les objets/tableaux
 * @returns {import('vue').Ref}
 */
export function usePersistentRef(key, defaultValue, options = {}) {
    const {deep = defaultValue !== null && typeof defaultValue === 'object'} = options
    const storageKey = PREFIX + key

    let initial = defaultValue
    try {
        const raw = localStorage.getItem(storageKey)
        if (raw !== null) initial = JSON.parse(raw)
    } catch {
        // Valeur stockée illisible : on garde le défaut
    }

    const state = ref(initial)

    watch(state, (value) => {
        try {
            if (value === null || value === undefined) {
                localStorage.removeItem(storageKey)
            } else {
                localStorage.setItem(storageKey, JSON.stringify(value))
            }
        } catch {
            // best-effort (quota, mode privé…)
        }
    }, {deep})

    return state
}

export default usePersistentRef
