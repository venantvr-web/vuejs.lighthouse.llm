import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {extractDomain, normalizeUrl} from '@/utils/url'

const STORAGE_KEY = 'lighthouse-active-site'

/**
 * Site actif partagé : le domaine n'est saisi qu'une fois puis réutilisé
 * partout. Toute saisie d'URL dans un écran met à jour le site actif, et les
 * autres écrans s'en servent pour se préremplir (préremplissage silencieux).
 */
export const useSiteStore = defineStore('site', () => {
    // Nom d'hôte normalisé, ex. "example.com"
    const domain = ref('')
    // Dernière URL complète normalisée saisie par l'utilisateur
    const lastUrl = ref('')

    // Chargement initial depuis localStorage
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
            const data = JSON.parse(raw)
            domain.value = data.domain || ''
            lastUrl.value = data.lastUrl || ''
        }
    } catch {
        // localStorage indisponible ou JSON invalide : on démarre vide
    }

    // Origine homepage du domaine actif, ex. "https://example.com"
    const origin = computed(() => (domain.value ? `https://${domain.value}` : ''))

    const hasSite = computed(() => !!domain.value)

    // Suggestion de marque dérivée du domaine, ex. "example.co.uk" -> "example"
    const brandGuess = computed(() => {
        if (!domain.value) return ''
        const host = domain.value.replace(/^www\./, '')
        return host.split('.')[0] || ''
    })

    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({domain: domain.value, lastUrl: lastUrl.value}))
        } catch {
            // best-effort
        }
    }

    /**
     * Mémorise le site actif à partir de n'importe quelle URL/domaine saisi.
     * @param {string} input - URL ou domaine brut
     */
    function setFromUrl(input) {
        const normalized = normalizeUrl(input)
        if (!normalized) return
        const host = extractDomain(normalized)
        if (!host) return
        domain.value = host
        lastUrl.value = normalized
        persist()
    }

    function clear() {
        domain.value = ''
        lastUrl.value = ''
        persist()
    }

    return {domain, lastUrl, origin, hasSite, brandGuess, setFromUrl, clear}
})
