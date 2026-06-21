import {canonicalUrl, extractDomain, normalizeUrl, sameHost} from './url'

/**
 * Value object représentant un domaine.
 *
 * Le setter `value` normalise systématiquement l'entrée (URL ou hôte brut) en
 * un hôte canonique en minuscules (« www.example.com »). Les getters exposent
 * l'hôte (`host`/`value`) et l'URL racine canonique avec « / » final
 * (`origin`/`toString`). Source unique de normalisation des domaines : à
 * utiliser partout où un domaine est saisi, stocké, comparé ou affiché.
 *
 * @example
 * const d = new Domain('HTTPS://WWW.Example.com/blog')
 * d.value   // "www.example.com"
 * d.origin  // "https://www.example.com/"
 * String(d) // "https://www.example.com/"
 */
export class Domain {
    #host = ''

    constructor(value = '') {
        // Passe par le setter → normalisation
        this.value = value
    }

    /** Hôte normalisé en minuscules (ex. « www.example.com »). */
    get value() {
        return this.#host
    }

    /** Setter normalisant : accepte une URL complète ou un hôte brut. */
    set value(input) {
        this.#host = Domain.normalize(input)
    }

    /** Alias lisible de `value`. */
    get host() {
        return this.#host
    }

    /** URL racine canonique avec « / » final (ex. « https://www.example.com/ »), ou '' si vide. */
    get origin() {
        return this.#host ? canonicalUrl(this.#host) : ''
    }

    get isEmpty() {
        return !this.#host
    }

    /** Représentation textuelle = URL canonique (pratique pour l'affichage). */
    toString() {
        return this.origin
    }

    /** Égalité par hôte, en ignorant casse et préfixe « www. ». */
    equals(other) {
        return sameHost(this.#host, other instanceof Domain ? other.host : other)
    }

    /**
     * Normalise une entrée (URL ou hôte) en hôte canonique minuscule.
     * @param {string} input
     * @returns {string} hôte, ou '' si invalide/vide
     */
    static normalize(input) {
        if (input instanceof Domain) return input.host
        const normalized = normalizeUrl(input)
        return normalized ? extractDomain(normalized).toLowerCase() : ''
    }

    /** Fabrique. */
    static from(input) {
        return input instanceof Domain ? input : new Domain(input)
    }
}

export default Domain
