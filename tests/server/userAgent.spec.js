import {describe, expect, it} from 'vitest'
import {readFileSync} from 'fs'
import {join} from 'path'
import {APP_NAME, APP_VERSION, FETCH_HEADERS, resolveUserAgent, USER_AGENT} from '../../server/config.js'

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
        expect(code).toContain('resolveUserAgent')
    })

    describe('resolveUserAgent (per-request, parameterizable)', () => {
        it('uses a valid client-supplied User-Agent', () => {
            expect(resolveUserAgent('MyBot/2.0 (+https://me.example)')).toBe('MyBot/2.0 (+https://me.example)')
        })

        it('falls back to the default for empty or non-string input', () => {
            expect(resolveUserAgent('')).toBe(USER_AGENT)
            expect(resolveUserAgent('   ')).toBe(USER_AGENT)
            expect(resolveUserAgent(undefined)).toBe(USER_AGENT)
            expect(resolveUserAgent(null)).toBe(USER_AGENT)
            expect(resolveUserAgent(42)).toBe(USER_AGENT)
        })

        it('strips control characters to prevent header injection', () => {
            const injected = 'Evil/1.0\r\nX-Injected: 1'
            const out = resolveUserAgent(injected)
            expect(out).not.toMatch(/[\r\n]/)
            expect(out).toBe('Evil/1.0X-Injected: 1')
        })

        it('caps the length at 256 characters', () => {
            expect(resolveUserAgent('a'.repeat(500))).toHaveLength(256)
        })
    })
})
