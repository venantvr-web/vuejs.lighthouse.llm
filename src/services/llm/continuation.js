/**
 * Aide à la reprise d'une réponse LLM tronquée par la limite de tokens.
 * @module services/llm/continuation
 */

// On ne renvoie que la fin du texte déjà produit pour borner la taille du
// prompt de continuation tout en gardant le contexte de la « couture ».
const MAX_TAIL = 8000

/**
 * Construit un prompt qui demande au modèle de poursuivre exactement là où il
 * s'est arrêté, sans rien répéter.
 * @param {string} originalPrompt - Le prompt initial (la demande)
 * @param {string} partial - La réponse déjà obtenue (potentiellement longue)
 * @returns {string}
 */
export function buildContinuationPrompt(originalPrompt, partial) {
    const text = partial || ''
    const tail = text.length > MAX_TAIL ? text.slice(-MAX_TAIL) : text
    return [
        originalPrompt,
        '',
        '---',
        'Ta réponse précédente a été coupée par la limite de tokens. Voici la fin de ce que tu as déjà écrit :',
        '"""',
        tail,
        '"""',
        "Reprends exactement là où tu t'es arrêté et termine la réponse. Ne répète pas ce qui précède, n'ajoute ni introduction ni résumé : poursuis directement le texte."
    ].join('\n')
}

export default buildContinuationPrompt
