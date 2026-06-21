import {beforeEach, describe, expect, it} from 'vitest'
import {nextTick} from 'vue'
import {createPinia, setActivePinia} from 'pinia'
import {useScopedPersistentRef} from '@/composables/useScopedPersistentRef'
import {useSiteStore} from '@/stores/siteStore'

describe('useScopedPersistentRef', () => {
    beforeEach(() => {
        localStorage.clear()
        setActivePinia(createPinia())
    })

    it('mémorise et restaure la valeur par couple marque/domaine', async () => {
        const site = useSiteStore()
        site.addBrand('Acme')
        site.addBrand('Globex')
        site.addDomain('acme.com')
        site.addDomain('globex.io')
        // contexte initial : Acme :: acme.com
        site.setActiveBrand('Acme')
        site.setActiveDomain('acme.com')

        const value = useScopedPersistentRef('test.field', '')
        value.value = 'pour Acme/acme'
        await nextTick()

        // Bascule de domaine → nouveau contexte, valeur vierge
        site.setActiveDomain('globex.io')
        await nextTick()
        expect(value.value).toBe('')

        value.value = 'pour Acme/globex'
        await nextTick()

        // Retour au premier contexte → la saisie est restaurée
        site.setActiveDomain('acme.com')
        await nextTick()
        expect(value.value).toBe('pour Acme/acme')

        // Et l'autre contexte aussi
        site.setActiveDomain('globex.io')
        await nextTick()
        expect(value.value).toBe('pour Acme/globex')
    })

    it('supporte une valeur par défaut dynamique (fonction)', () => {
        const site = useSiteStore()
        site.addDomain('example.com')
        const url = useScopedPersistentRef('test.url', () => site.origin)
        expect(url.value).toBe('https://example.com')
    })
})
