import {beforeEach, describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import {createPinia, setActivePinia} from 'pinia'
import {createMemoryHistory, createRouter} from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'

const SECTIONS = ['/briefing', '/watchlist', '/geo', '/search-console', '/resources', '/llm-studio', '/history', '/settings']

beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
})

function makeRouter(path = '/') {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{path: '/:pathMatch(.*)*', component: {template: '<div/>'}}]
    })
    router.push(path)
    return router
}

describe('AppHeader', () => {
    it('renders a link to every section', async () => {
        const router = makeRouter('/')
        await router.isReady()
        const w = mount(AppHeader, {global: {plugins: [router]}})
        for (const to of SECTIONS) {
            expect(w.find(`a[href="${to}"]`).exists()).toBe(true)
        }
    })

    it('renders the title and subtitle', async () => {
        const router = makeRouter('/')
        await router.isReady()
        const w = mount(AppHeader, {props: {title: 'GEO Tracking', subtitle: 'Sous-titre'}, global: {plugins: [router]}})
        expect(w.text()).toContain('GEO Tracking')
        expect(w.text()).toContain('Sous-titre')
    })

    it('highlights the active section', async () => {
        const router = makeRouter('/geo')
        await router.isReady()
        const w = mount(AppHeader, {global: {plugins: [router]}})
        const geoLink = w.find('a[href="/geo"]')
        expect(geoLink.classes().join(' ')).toContain('bg-primary-50')
        // a non-active link should not carry the active background
        const wlLink = w.find('a[href="/watchlist"]')
        expect(wlLink.classes().join(' ')).not.toContain('bg-primary-50')
    })

    it('treats nested routes as active (startsWith)', async () => {
        const router = makeRouter('/history/anything')
        await router.isReady()
        const w = mount(AppHeader, {global: {plugins: [router]}})
        expect(w.find('a[href="/history"]').classes().join(' ')).toContain('bg-primary-50')
    })

    it('renders the actions slot', async () => {
        const router = makeRouter('/')
        await router.isReady()
        const w = mount(AppHeader, {
            global: {plugins: [router]},
            slots: {actions: '<button class="my-action">Go</button>'}
        })
        expect(w.find('button.my-action').exists()).toBe(true)
    })
})
