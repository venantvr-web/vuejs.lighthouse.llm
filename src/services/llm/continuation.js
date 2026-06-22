/**
 * Aide à la reprise d'une réponse LLM tronquée par la limite de tokens.
 *
 * Stratégie : on reprend à la **dernière ligne complète** (la ligne coupée,
 * parfois en plein milieu d'une URL, est régénérée), on mémorise le point de
 * jointure (marqueur de reprise), puis on **consolide** le texte autour de ce
 * point une fois la génération terminée (retrait d'un bloc de code parasite,
 * déduplication d'un éventuel chevauchement). Cela évite les coutures cassées
 * qui corrompaient le Markdown.
 *
 * @module services/llm/continuation
 */

// On ne renvoie que la fin du texte déjà produit pour borner la taille du
// prompt de continuation tout en gardant le contexte de la « couture ».
const MAX_TAIL = 8000

/**
 * Construit un prompt qui demande au modèle de poursuivre exactement là où il
 * s'est arrêté, sans rien répéter ni encadrer dans un bloc de code.
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
        'IMPORTANT : ta réponse précédente a été coupée par la limite de tokens. Le début est déjà enregistré ; voici la FIN exacte de ce que tu as déjà produit :',
        '"""',
        tail,
        '"""',
        'Reprends exactement à la suite de ce texte et termine le document. Règles strictes :',
        '- ne répète pas ce qui précède (ni le titre, ni le début déjà écrit) ;',
        "- n'ajoute ni introduction, ni résumé, ni phrase d'accroche ;",
        '- n\'encadre pas ta réponse dans un bloc de code ``` ;',
        '- ce que tu écris sera collé tel quel à la suite : commence directement par la suite logique du contenu.'
    ].join('\n')
}

/**
 * Tronque un texte à la dernière ligne complète (jusqu'au dernier saut de ligne
 * inclus). La ligne finale incomplète — coupée par la limite de tokens — est
 * retirée pour offrir un point de reprise propre. Si le texte ne contient aucun
 * saut de ligne, il est renvoyé inchangé.
 * @param {string} text
 * @returns {string}
 */
export function trimToLastCompleteLine(text = '') {
    const s = text || ''
    const lastNl = s.lastIndexOf('\n')
    return lastNl >= 0 ? s.slice(0, lastNl + 1) : s
}

/**
 * Retire de `tail` le plus long chevauchement (≥ 10 caractères) qui est à la
 * fois un suffixe de `head` et un préfixe de `tail` — cas où le modèle a répété
 * la fin déjà écrite.
 * @param {string} head
 * @param {string} tail
 * @returns {string}
 */
function removeOverlap(head, tail) {
    const max = Math.min(head.length, tail.length, 500)
    for (let k = max; k >= 10; k--) {
        if (head.slice(-k) === tail.slice(0, k)) {
            return tail.slice(k)
        }
    }
    return tail
}

/**
 * Consolide le texte après une reprise : nettoie la « couture » au point de
 * jointure (`boundary` = longueur du texte avant reprise). Retire un bloc de
 * code ouvrant parasite en tête de reprise (le modèle encadre parfois sa
 * continuation), déduplique un chevauchement, et retire le bloc fermant
 * correspondant en fin si un ouvrant a été retiré. Les blocs de code légitimes
 * du reste du document sont préservés.
 * @param {string} full - Texte complet (head + reprise)
 * @param {number} boundary - Index de jointure (longueur du head)
 * @returns {string}
 */
export function consolidateContinuation(full = '', boundary = 0) {
    const text = full || ''
    const idx = Math.max(0, Math.min(boundary, text.length))
    const head = text.slice(0, idx)
    let tail = text.slice(idx)

    // 1) Retire un éventuel bloc de code ouvrant parasite en tête de reprise
    const fenceOpen = tail.match(/^\s*```[a-zA-Z0-9]*[ \t]*\n/)
    const strippedOpen = !!fenceOpen
    if (fenceOpen) tail = tail.slice(fenceOpen[0].length)

    // 2) Déduplique un chevauchement avec la fin du head
    tail = removeOverlap(head, tail)

    // 3) Si un ouvrant a été retiré, retire le bloc fermant parasite en fin
    if (strippedOpen) tail = tail.replace(/\n?```[ \t]*$/, '')

    return head + tail
}

export default buildContinuationPrompt
