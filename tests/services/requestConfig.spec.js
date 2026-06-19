import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const KEY = 'lighthouse-user-agent'

// Réimporte le module à neuf pour réinitialiser son état mémoire
async function freshModule() {
    vi.resetModules()
    return import('@/services/requestConfig')
}

describe('requestConfig (parameterizable User-Agent, client)', () => {
    beforeEach(() => localStorage.clear())
    afterEach(() => localStorage.clear())

    it('returns the default User-Agent when nothing is configured', async () => {
        const m = await freshModule()
        expect(m.getRawUserAgent()).toBe('')
        expect(m.getUserAgent()).toBe(m.DEFAULT_USER_AGENT)
    })

    it('persists a custom User-Agent and reads it back', async () => {
        const m = await freshModule()
        m.setUserAgent('MyBot/3.0')
        expect(m.getRawUserAgent()).toBe('MyBot/3.0')
        expect(m.getUserAgent()).toBe('MyBot/3.0')
        expect(localStorage.getItem(KEY)).toBe('MyBot/3.0')
    })

    it('hydrates from localStorage on load', async () => {
        localStorage.setItem(KEY, 'Hydrated/1.0')
        const m = await freshModule()
        expect(m.getUserAgent()).toBe('Hydrated/1.0')
    })

    it('reset (empty value) clears storage and falls back to default', async () => {
        const m = await freshModule()
        m.setUserAgent('Temp/1.0')
        m.setUserAgent('')
        expect(m.getRawUserAgent()).toBe('')
        expect(m.getUserAgent()).toBe(m.DEFAULT_USER_AGENT)
        expect(localStorage.getItem(KEY)).toBeNull()
    })

    it('trims surrounding whitespace', async () => {
        const m = await freshModule()
        m.setUserAgent('  Spaced/1.0  ')
        expect(m.getRawUserAgent()).toBe('Spaced/1.0')
    })

    it('exposes a well-formed default User-Agent', async () => {
        const m = await freshModule()
        expect(m.DEFAULT_USER_AGENT).toMatch(/^Mozilla\/5\.0 \(compatible; .+\/\d+\.\d+\.\d+; \+https?:\/\/.+\)$/)
    })
})

const PROXY_KEY = 'lighthouse-proxy-base'

describe('requestConfig (configurable proxy base)', () => {
    beforeEach(() => localStorage.clear())
    afterEach(() => localStorage.clear())

    it('proxyUrl concatenates the active base with the path', async () => {
        const m = await freshModule()
        expect(m.proxyUrl('/api/fetch-page')).toBe(`${m.getProxyBase()}/api/fetch-page`)
    })

    it('uses a configured base and persists it', async () => {
        const m = await freshModule()
        m.setProxyBase('https://proxy.example')
        expect(m.getRawProxyBase()).toBe('https://proxy.example')
        expect(m.getProxyBase()).toBe('https://proxy.example')
        expect(m.proxyUrl('/api/check-url')).toBe('https://proxy.example/api/check-url')
        expect(localStorage.getItem(PROXY_KEY)).toBe('https://proxy.example')
    })

    it('strips a trailing slash from the base', async () => {
        const m = await freshModule()
        m.setProxyBase('https://proxy.example/')
        expect(m.getProxyBase()).toBe('https://proxy.example')
    })

    it('reset (empty) clears storage and falls back to the default', async () => {
        const m = await freshModule()
        m.setProxyBase('https://proxy.example')
        m.setProxyBase('')
        expect(m.getRawProxyBase()).toBe('')
        expect(m.getProxyBase()).toBe(m.getDefaultProxyBase())
        expect(localStorage.getItem(PROXY_KEY)).toBeNull()
    })

    it('hydrates the base from localStorage on load', async () => {
        localStorage.setItem(PROXY_KEY, 'https://hydrated.example')
        const m = await freshModule()
        expect(m.getProxyBase()).toBe('https://hydrated.example')
    })
})

describe('requestConfig (fetch mode: proxy vs direct)', () => {
    beforeEach(() => localStorage.clear())
    afterEach(() => localStorage.clear())

    it('defaults to proxy mode', async () => {
        const m = await freshModule()
        expect(m.getFetchMode()).toBe(m.FETCH_MODES.PROXY)
        expect(m.isDirectFetch()).toBe(false)
    })

    it('switches to direct mode and persists', async () => {
        const m = await freshModule()
        m.setFetchMode(m.FETCH_MODES.DIRECT)
        expect(m.isDirectFetch()).toBe(true)
        expect(localStorage.getItem('lighthouse-fetch-mode')).toBe('direct')
    })

    it('hydrates the mode from localStorage', async () => {
        localStorage.setItem('lighthouse-fetch-mode', 'direct')
        const m = await freshModule()
        expect(m.isDirectFetch()).toBe(true)
    })

    it('ignores invalid modes (falls back to proxy)', async () => {
        const m = await freshModule()
        m.setFetchMode('nonsense')
        expect(m.getFetchMode()).toBe(m.FETCH_MODES.PROXY)
    })
})
