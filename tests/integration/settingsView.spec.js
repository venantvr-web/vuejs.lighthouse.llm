import {beforeEach, describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import {createPinia, setActivePinia} from 'pinia'
import {createMemoryHistory, createRouter} from 'vue-router'
import SettingsView from '@/views/SettingsView.vue'

const KEY = 'lighthouse-active-site'

function router() {
    const r = createRouter({history: createMemoryHistory(), routes: [{path: '/:p(.*)*', component: {template: '<div/>'}}]})
    r.push('/settings')
    return r
}

describe('SettingsView — smoke mount', () => {
    beforeEach(() => {
        localStorage.clear()
        setActivePinia(createPinia())
    })

    it('renders the identity editor when an entity exists (no template errors)', async () => {
        // Régression : le template référençait canonicalUrl() non importé → écran vide
        // dès qu'un site existait. On monte avec une entité pour couvrir ce chemin.
        localStorage.setItem(KEY, JSON.stringify({
            entities: [{brand: 'Concilio', domain: 'www.concilio.com', sector: 'conciergerie médicale'}],
            activeKey: 'Concilio::www.concilio.com',
            lastUrl: ''
        }))
        const r = router()
        await r.isReady()
        const w = mount(SettingsView, {global: {plugins: [r]}})
        await r.isReady()
        const text = w.text()
        expect(text).toContain('Concilio')
        expect(text).toContain('https://www.concilio.com/')   // canonicalUrl rendu
    })

    it('renders for a brand-new user (no site yet)', async () => {
        const r = router()
        await r.isReady()
        const w = mount(SettingsView, {global: {plugins: [r]}})
        expect(w.text().length).toBeGreaterThan(50)
    })
})
