import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {normalizeUrl} from '@/utils/url'
import {Domain} from '@/utils/Domain'

const STORAGE_KEY = 'lighthouse-active-site'

/**
 * Clé stable d'une entité : couple marque/domaine (sert aussi de scopeKey
 * pour la persistance des saisies par contexte).
 * @param {{brand: string, domain: string}} e
 * @returns {string}
 */
export function entityKey(e) {
    return `${e?.brand || '_'}::${e?.domain || '_'}`
}

/**
 * Identité du compte : une liste d'« entités » (sites). Une entité est un tuple
 * indissociable **marque + domaine + secteur d'activité** — par exemple
 * « Concilio + www.concilio.com + conciergerie médicale ». Une seule entité est
 * active à la fois ; sa marque et son domaine s'affichent dans l'en-tête et
 * préremplissent l'application.
 *
 * Stockage (localStorage) : { entities: [{brand, domain, sector}], activeKey, lastUrl }.
 */
export const useSiteStore = defineStore('site', () => {
    const entities = ref([])     // [{ brand, domain (hôte normalisé), sector }]
    const activeKey = ref('')    // clé de l'entité active (`marque::domaine`)
    const lastUrl = ref('')      // dernière URL complète saisie (préremplissage)

    // Chargement initial + migrations (ancien multi-listes, très ancien mono-domaine)
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
            const data = JSON.parse(raw)
            if (Array.isArray(data.entities)) {
                // Format courant : entités déjà constituées
                entities.value = data.entities
                    .filter(e => e && (e.brand || e.domain))
                    .map(e => ({brand: e.brand || '', domain: e.domain || '', sector: e.sector || ''}))
                activeKey.value = data.activeKey || (entities.value[0] ? entityKey(entities.value[0]) : '')
                lastUrl.value = data.lastUrl || ''
            } else if (Array.isArray(data.domains)) {
                // Ancien format : listes marques/domaines indépendantes + secteurs par marque
                const brands = Array.isArray(data.brands) ? data.brands : []
                const domains = data.domains
                const sectors = (data.sectors && typeof data.sectors === 'object') ? data.sectors : {}
                const count = Math.max(brands.length, domains.length)
                const migrated = []
                for (let i = 0; i < count; i++) {
                    const brand = brands[i] || ''
                    const domain = domains[i] || ''
                    if (!brand && !domain) continue
                    migrated.push({brand, domain, sector: sectors[brand] || ''})
                }
                entities.value = migrated
                const ab = data.activeBrand || brands[0] || ''
                const ad = data.activeDomain || domains[0] || ''
                activeKey.value = migrated.length ? entityKey({brand: ab, domain: ad}) : ''
                // Si le couple actif n'existe pas tel quel, retombe sur la première entité
                if (!migrated.some(e => entityKey(e) === activeKey.value) && migrated[0]) {
                    activeKey.value = entityKey(migrated[0])
                }
                lastUrl.value = data.lastUrl || ''
            } else if (data.domain) {
                // Très ancien format mono-domaine
                entities.value = [{brand: '', domain: data.domain, sector: ''}]
                activeKey.value = entityKey(entities.value[0])
                lastUrl.value = data.lastUrl || ''
            }
        }
    } catch {
        // localStorage indisponible ou JSON invalide : on démarre vide
    }

    // --- Entité active ---
    const activeEntity = computed(() =>
        entities.value.find(e => entityKey(e) === activeKey.value) || entities.value[0] || null
    )
    const activeBrand = computed(() => activeEntity.value?.brand || '')
    const activeDomain = computed(() => activeEntity.value?.domain || '')
    const activeSector = computed({
        get: () => activeEntity.value?.sector || '',
        set: (v) => {
            if (activeEntity.value) setEntitySector(entityKey(activeEntity.value), v)
        }
    })

    // Listes dérivées (lecture seule) pour les sélecteurs/affichages
    const brands = computed(() => entities.value.map(e => e.brand))
    const domains = computed(() => entities.value.map(e => e.domain))

    // URL racine canonique du domaine actif (ex. https://example.com/)
    const origin = computed(() => new Domain(activeDomain.value).origin)
    const hasSite = computed(() => !!activeDomain.value)
    // Le scope (saisies/collections par contexte) reste le couple marque/domaine
    const scopeKey = computed(() => activeEntity.value ? entityKey(activeEntity.value) : '_::_')
    const needsOnboarding = computed(() => entities.value.length === 0)

    // Suggestion de marque dérivée du domaine actif, ex. "example.co.uk" -> "example"
    const brandGuess = computed(() => {
        if (!activeDomain.value) return ''
        const host = activeDomain.value.replace(/^www\./, '')
        return host.split('.')[0] || ''
    })

    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                entities: entities.value,
                activeKey: activeKey.value,
                lastUrl: lastUrl.value
            }))
        } catch {
            // best-effort
        }
    }

    // --- Entités (marque + domaine + secteur) ---
    /**
     * Ajoute une entité (ou met à jour le secteur si le couple existe déjà) et
     * la rend active si aucune ne l'est encore. Marque et domaine sont requis.
     * @param {{brand: string, domain: string, sector?: string}} input
     * @returns {object|null} L'entité, ou null si marque ou domaine manquant/invalide
     */
    function addEntity({brand, domain, sector} = {}) {
        const cleanBrand = (brand || '').trim()
        const host = Domain.normalize(domain)
        const cleanSector = (sector || '').trim()
        if (!cleanBrand || !host) return null

        const key = entityKey({brand: cleanBrand, domain: host})
        let entity = entities.value.find(e => entityKey(e) === key)
        if (entity) {
            if (cleanSector) entity.sector = cleanSector
        } else {
            entity = {brand: cleanBrand, domain: host, sector: cleanSector}
            entities.value = [...entities.value, entity]
        }
        if (!activeKey.value) activeKey.value = key
        persist()
        return entity
    }

    /**
     * Supprime une entité par sa clé. Si c'était l'entité active, bascule sur
     * la première restante.
     * @param {string} key
     */
    function removeEntity(key) {
        entities.value = entities.value.filter(e => entityKey(e) !== key)
        if (activeKey.value === key) {
            activeKey.value = entities.value[0] ? entityKey(entities.value[0]) : ''
        }
        persist()
    }

    /**
     * Rend une entité active par sa clé.
     * @param {string} key
     */
    function setActiveEntity(key) {
        if (entities.value.some(e => entityKey(e) === key)) {
            activeKey.value = key
            persist()
        }
    }

    /**
     * Définit (ou efface) le secteur d'activité d'une entité.
     * @param {string} key
     * @param {string} sector
     */
    function setEntitySector(key, sector) {
        const entity = entities.value.find(e => entityKey(e) === key)
        if (!entity) return
        entity.sector = (sector || '').trim()
        persist()
    }

    /**
     * Secteur d'activité de la première entité portant cette marque (vide sinon).
     * @param {string} brand
     * @returns {string}
     */
    function sectorFor(brand) {
        const b = (brand || '').trim()
        return entities.value.find(e => e.brand === b)?.sector || ''
    }

    /**
     * Mémorise une URL/domaine saisi dans un écran : retient l'URL complète pour
     * le préremplissage et, si elle correspond à une entité connue, l'active.
     * N'invente jamais d'entité « orpheline » (la marque/secteur seraient inconnus).
     * @param {string} input - URL ou domaine brut
     */
    function setFromUrl(input) {
        const normalized = normalizeUrl(input)
        if (!normalized) return
        lastUrl.value = normalized
        const host = Domain.normalize(input)
        if (host) {
            const match = entities.value.find(e => e.domain === host)
            if (match) activeKey.value = entityKey(match)
        }
        persist()
    }

    function clear() {
        entities.value = []
        activeKey.value = ''
        lastUrl.value = ''
        persist()
    }

    return {
        entities, activeKey, lastUrl,
        activeEntity, activeBrand, activeDomain, activeSector, brands, domains,
        origin, hasSite, needsOnboarding, brandGuess, scopeKey,
        addEntity, removeEntity, setActiveEntity, setEntitySector, sectorFor,
        setFromUrl, clear
    }
})
