import {beforeEach, describe, expect, it} from 'vitest'
import {nextTick} from 'vue'
import {createPinia, setActivePinia} from 'pinia'
import {useScopedPersistentRef} from '@/composables/useScopedPersistentRef'
import {entityKey, useSiteStore} from '@/stores/siteStore'

describe('useScopedPersistentRef', () => {
    beforeEach(() => {
        localStorage.clear()
        setActivePinia(createPinia())
    })

    it('mémorise et restaure la valeur par entité (couple marque/domaine)', async () => {
        const site = useSiteStore()
        const acme = site.addEntity({brand: 'Acme', domain: 'acme.com'})
        const globex = site.addEntity({brand: 'Acme', domain: 'globex.io'})
        // contexte initial : Acme :: acme.com
        site.setActiveEntity(entityKey(acme))

        const value = useScopedPersistentRef('test.field', '')
        value.value = 'pour Acme/acme'
        await nextTick()

        // Bascule d'entité → nouveau contexte, valeur vierge
        site.setActiveEntity(entityKey(globex))
        await nextTick()
        expect(value.value).toBe('')

        value.value = 'pour Acme/globex'
        await nextTick()

        // Retour au premier contexte → la saisie est restaurée
        site.setActiveEntity(entityKey(acme))
        await nextTick()
        expect(value.value).toBe('pour Acme/acme')

        // Et l'autre contexte aussi
        site.setActiveEntity(entityKey(globex))
        await nextTick()
        expect(value.value).toBe('pour Acme/globex')
    })

    it('supporte une valeur par défaut dynamique (fonction)', () => {
        const site = useSiteStore()
        site.addEntity({brand: 'Example', domain: 'example.com'})
        const url = useScopedPersistentRef('test.url', () => site.origin)
        expect(url.value).toBe('https://example.com/')
    })
})
