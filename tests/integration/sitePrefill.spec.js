import {beforeEach, describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import {createPinia, setActivePinia} from 'pinia'
import {createMemoryHistory, createRouter} from 'vue-router'
import LighthouseView from '@/views/LighthouseView.vue'
import UrlInput from '@/components/input/UrlInput.vue'
import {useSiteStore} from '@/stores/siteStore'

const KEY = 'lighthouse-active-site'

function router() {
    const r = createRouter({history: createMemoryHistory(), routes: [{path: '/:p(.*)*', component: {template: '<div/>'}}]})
    r.push('/')
    return r
}

describe('shared active site — silent prefill', () => {
    beforeEach(() => {
        localStorage.clear()
        // Site actif déjà connu avant le montage des écrans
        localStorage.setItem(KEY, JSON.stringify({domains: ['example.com'], brands: [], activeDomain: 'example.com', activeBrand: '', lastUrl: ''}))
        setActivePinia(createPinia())
    })

    it('prefills the PageSpeed screen URL input from the active site', async () => {
        const r = router()
        await r.isReady()
        const w = mount(LighthouseView, {global: {plugins: [r]}})
        expect(w.findComponent(UrlInput).props('modelValue')).toBe('https://example.com')
    })

    it('captures the domain when a URL is submitted on one screen', async () => {
        const r = router()
        await r.isReady()
        const w = mount(LighthouseView, {global: {plugins: [r]}})
        // Soumission d'une URL d'un autre domaine → met à jour le site actif partagé
        await w.findComponent(UrlInput).vm.$emit('submit', 'https://newsite.io/page')
        const site = useSiteStore()
        expect(site.activeDomain).toBe('newsite.io')
        expect(JSON.parse(localStorage.getItem(KEY)).activeDomain).toBe('newsite.io')
    })
})
