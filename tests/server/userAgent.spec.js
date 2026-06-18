import {describe, expect, it} from 'vitest'
import {readFileSync} from 'fs'
import {join} from 'path'
import {APP_NAME, APP_VERSION, FETCH_HEADERS, USER_AGENT} from '../../server/config.js'

describe('Server outbound User-Agent', () => {
    it('is a well-formed, identifiable "good bot" User-Agent', () => {
        // Mozilla/5.0 (compatible; Name/Version; +url) — comme Googlebot/bingbot
        expect(USER_AGENT).toMatch(
            /^Mozilla\/5\.0 \(compatible; [\w.-]+\/\d+\.\d+\.\d+; \+https?:\/\/.+\)$/
        )
    })

    it('identifies the tool by name and version', () => {
        expect(USER_AGENT).toContain(APP_NAME)
        expect(USER_AGENT).toContain(APP_VERSION)
    })

    it('exposes default fetch headers carrying the same User-Agent', () => {
        expect(FETCH_HEADERS['User-Agent']).toBe(USER_AGENT)
        expect(FETCH_HEADERS.Accept).toBeTruthy()
        expect(FETCH_HEADERS['Accept-Language']).toBeTruthy()
    })

    it('can be overridden via the LIGHTHOUSE_USER_AGENT env var', async () => {
        const prev = process.env.LIGHTHOUSE_USER_AGENT
        process.env.LIGHTHOUSE_USER_AGENT = 'CustomAgent/9.9'
        // ré-import à neuf pour relire process.env au chargement du module
        const mod = await import('../../server/config.js?override')
        expect(mod.USER_AGENT).toBe('CustomAgent/9.9')
        if (prev === undefined) delete process.env.LIGHTHOUSE_USER_AGENT
        else process.env.LIGHTHOUSE_USER_AGENT = prev
    })

    it('no longer hardcodes the old generic UA in server/index.js', () => {
        const code = readFileSync(join(process.cwd(), 'server/index.js'), 'utf-8')
        expect(code).not.toContain('LighthouseCrawler')
        // both endpoints route through the centralized config
        expect(code).toContain('FETCH_HEADERS')
        expect(code).toContain('USER_AGENT')
    })
})
