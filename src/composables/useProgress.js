import {reactive} from 'vue'

/**
 * Indicateur de progression global (barre fine en haut de page), sans
 * dépendance. On compte les opérations actives ; la barre est visible tant
 * qu'au moins une opération est en cours. Rendu par <ProgressBar/> (App).
 *
 * @module composables/useProgress
 */

const state = reactive({active: 0})

/** Démarre une opération (incrémente le compteur). */
export function startProgress() {
    state.active++
}

/** Termine une opération (décrémente, borné à 0). */
export function doneProgress() {
    if (state.active > 0) state.active--
}

/**
 * Enveloppe une promesse en affichant la barre pendant son exécution.
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<T>}
 */
export async function withProgress(promise) {
    startProgress()
    try {
        return await promise
    } finally {
        doneProgress()
    }
}

export function useProgress() {
    return {state, start: startProgress, done: doneProgress, withProgress}
}

export default useProgress
