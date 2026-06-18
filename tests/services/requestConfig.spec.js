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
