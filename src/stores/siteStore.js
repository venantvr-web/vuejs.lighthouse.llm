import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {normalizeUrl} from '@/utils/url'
import {Domain} from '@/utils/Domain'

const STORAGE_KEY = 'lighthouse-active-site'

/**
 * Identité du compte : plusieurs marques et plusieurs domaines, avec une marque
 * et un domaine actifs. Saisis une fois (onboarding ou Paramètres) puis réutilisés
 * partout pour le préremplissage. La marque active est affichée dans l'en-tête.
 *
 * Stockage (localStorage) : { domains: string[], brands: string[],
 *   sectors: { [marque]: secteur }, activeDomain, activeBrand, lastUrl }.
 */
export const useSiteStore = defineStore('site', () => {
    const domains = ref([])      // hôtes normalisés, ex. "example.com"
    const brands = ref([])       // noms de marque libres
    const sectors = ref({})      // secteur d'activité par marque, ex. { Concilio: "conciergerie médicale" }
    const activeDomain = ref('')
    const activeBrand = ref('')
    const lastUrl = ref('')      // dernière URL complète saisie

    // Chargement initial + migration depuis l'ancien format { domain, lastUrl }
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
            const data = JSON.parse(raw)
            if (Array.isArray(data.domains)) {
                domains.value = data.domains
                brands.value = Array.isArray(data.brands) ? data.brands : []
                sectors.value = (data.sectors && typeof data.sectors === 'object') ? data.sectors : {}
                activeDomain.value = data.activeDomain || data.domains[0] || ''
                activeBrand.value = data.activeBrand || data.brands?.[0] || ''
                lastUrl.value = data.lastUrl || ''
            } else if (data.domain) {
                // Ancien format mono-domaine
                domains.value = [data.domain]
                activeDomain.value = data.domain
                lastUrl.value = data.lastUrl || ''
            }
        }
    } catch {
        // localStorage indisponible ou JSON invalide : on démarre vide
    }

    // URL racine canonique du domaine actif, terminée par « / » (ex. https://example.com/)
    const origin = computed(() => new Domain(activeDomain.value).origin)
    const hasSite = computed(() => !!activeDomain.value)
    // Identifiant du contexte courant (couple marque/domaine) pour scoper les
    // saisies ET les collections (prompts GEO, watchlist…).
    const scopeKey = computed(() => `${activeBrand.value || '_'}::${activeDomain.value || '_'}`)
    // L'onboarding est requis tant qu'on n'a ni domaine ni marque
    const needsOnboarding = computed(() => domains.value.length === 0 && brands.value.length === 0)

    // Suggestion de marque dérivée du domaine actif, ex. "example.co.uk" -> "example"
    const brandGuess = computed(() => {
        if (!activeDomain.value) return ''
        const host = activeDomain.value.replace(/^www\./, '')
        return host.split('.')[0] || ''
    })

    // Secteur d'activité de la marque active (lève l'ambiguïté du nom dans les
    // analyses IA, ex. « Concilio » = conciergerie médicale, pas gestion de patrimoine).
    const activeSector = computed({
        get: () => sectors.value[activeBrand.value] || '',
        set: (v) => setBrandSector(activeBrand.value, v)
    })

    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                domains: domains.value,
                brands: brands.value,
                sectors: sectors.value,
                activeDomain: activeDomain.value,
                activeBrand: activeBrand.value,
                lastUrl: lastUrl.value
            }))
        } catch {
            // best-effort
        }
    }

    // --- Domaines ---
    function addDomain(input) {
        const host = Domain.normalize(input)
        if (!host) return ''
        if (!domains.value.includes(host)) domains.value = [...domains.value, host]
        if (!activeDomain.value) activeDomain.value = host
        persist()
        return host
    }

    function removeDomain(host) {
        domains.value = domains.value.filter(d => d !== host)
        if (activeDomain.value === host) activeDomain.value = domains.value[0] || ''
        persist()
    }

    function setActiveDomain(host) {
        if (domains.value.includes(host)) {
            activeDomain.value = host
            persist()
        }
    }

    // --- Marques ---
    function addBrand(name, sector) {
        const clean = (name || '').trim()
        if (!clean) return ''
        if (!brands.value.includes(clean)) brands.value = [...brands.value, clean]
        if (!activeBrand.value) activeBrand.value = clean
        const cleanSector = (sector || '').trim()
        if (cleanSector) sectors.value = {...sectors.value, [clean]: cleanSector}
        persist()
        return clean
    }

    function removeBrand(name) {
        brands.value = brands.value.filter(b => b !== name)
        if (name in sectors.value) {
            const next = {...sectors.value}
            delete next[name]
            sectors.value = next
        }
        if (activeBrand.value === name) activeBrand.value = brands.value[0] || ''
        persist()
    }

    /**
     * Définit (ou efface) le secteur d'activité d'une marque.
     * @param {string} brand - Nom de la marque
     * @param {string} sector - Secteur d'activité (chaîne libre)
     */
    function setBrandSector(brand, sector) {
        const b = (brand || '').trim()
        if (!b) return
        const clean = (sector || '').trim()
        const next = {...sectors.value}
        if (clean) next[b] = clean
        else delete next[b]
        sectors.value = next
        persist()
    }

    /**
     * Secteur d'activité d'une marque donnée (vide si non renseigné).
     * @param {string} brand - Nom de la marque
     * @returns {string}
     */
    function sectorFor(brand) {
        return sectors.value[(brand || '').trim()] || ''
    }

    function setActiveBrand(name) {
        if (brands.value.includes(name)) {
            activeBrand.value = name
            persist()
        }
    }

    /**
     * Mémorise le site actif à partir d'une URL/domaine saisi dans un écran :
     * ajoute le domaine (s'il est nouveau) et le rend actif.
     * @param {string} input - URL ou domaine brut
     */
    function setFromUrl(input) {
        const normalized = normalizeUrl(input)
        if (!normalized) return
        const host = Domain.normalize(input)
        if (!host) return
        if (!domains.value.includes(host)) domains.value = [...domains.value, host]
        activeDomain.value = host
        lastUrl.value = normalized
        persist()
    }

    function clear() {
        domains.value = []
        brands.value = []
        sectors.value = {}
        activeDomain.value = ''
        activeBrand.value = ''
        lastUrl.value = ''
        persist()
    }

    return {
        domains, brands, sectors, activeDomain, activeBrand, activeSector, lastUrl,
        origin, hasSite, needsOnboarding, brandGuess, scopeKey,
        addDomain, removeDomain, setActiveDomain,
        addBrand, removeBrand, setActiveBrand, setBrandSector, sectorFor,
        setFromUrl, clear
    }
})
