import {ref, watch} from 'vue'
import {useSiteStore} from '@/stores/siteStore'

const PREFIX = 'lh:scoped:'

/**
 * Identifiant du contexte courant = couple « marque active :: domaine actif ».
 * @param {object} site
 * @returns {string}
 */
function scopeId(site) {
    return `${site.activeBrand || '_'}::${site.activeDomain || '_'}`
}

function resolveDefault(def) {
    return typeof def === 'function' ? def() : def
}

/**
 * Ref persistée **par couple marque/domaine** : la valeur est stockée sous une
 * clé namespacée par le contexte actif. Quand l'utilisateur change de marque ou
 * de domaine, la valeur du nouveau contexte est restaurée automatiquement (ou la
 * valeur par défaut si rien n'a encore été saisi pour ce contexte).
 *
 * @param {string} key - clé logique (ex. 'lighthouse.url')
 * @param {*|Function} defaultValue - valeur par défaut, ou fonction renvoyant la
 *   valeur par défaut (utile pour dépendre du domaine actif, ex. `() => site.origin`)
 * @param {{deep?: boolean}} [options]
 * @returns {import('vue').Ref}
 */
export function useScopedPersistentRef(key, defaultValue, options = {}) {
    const site = useSiteStore()
    const {deep = typeof defaultValue !== 'function' && defaultValue !== null && typeof defaultValue === 'object'} = options

    const storageKey = () => `${PREFIX}${scopeId(site)}:${key}`

    function load() {
        try {
            const raw = localStorage.getItem(storageKey())
            if (raw !== null) return JSON.parse(raw)
        } catch {
            // valeur illisible : on retombe sur le défaut
        }
        return resolveDefault(defaultValue)
    }

    const state = ref(load())

    // Écrit dans la clé du contexte courant à chaque changement de valeur
    watch(state, (value) => {
        try {
            if (value === null || value === undefined) {
                localStorage.removeItem(storageKey())
            } else {
                localStorage.setItem(storageKey(), JSON.stringify(value))
            }
        } catch {
            // best-effort (quota, mode privé…)
        }
    }, {deep})

    // Au changement de marque/domaine : restaure la valeur du nouveau contexte
    watch(() => scopeId(site), () => {
        state.value = load()
    })

    return state
}

export default useScopedPersistentRef
