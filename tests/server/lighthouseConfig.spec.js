import {describe, expect, it} from 'vitest'
import {readFileSync} from 'fs'
import {join} from 'path'

/**
 * Tests for Lighthouse server configuration
 * Verifies that Chrome flags and settings are correctly configured
 */
describe('Lighthouse Server Configuration', () => {
    let lighthouseCode

    // Read the server file to verify configuration
    try {
        lighthouseCode = readFileSync(
            join(process.cwd(), 'server/lighthouse.js'),
            'utf-8'
        )
    } catch {
        lighthouseCode = ''
    }

    describe('Chrome Flags', () => {
        it('should use new headless mode (--headless=new)', () => {
            expect(lighthouseCode).toContain("'--headless=new'")
        })

        it('should disable GPU for stability', () => {
            expect(lighthouseCode).toContain("'--disable-gpu'")
        })

        it('should run without sandbox for container compatibility', () => {
            expect(lighthouseCode).toContain("'--no-sandbox'")
        })

        it('should disable dev-shm for memory efficiency', () => {
            expect(lighthouseCode).toContain("'--disable-dev-shm-usage'")
        })

        it('should disable extensions to prevent interference', () => {
            expect(lighthouseCode).toContain("'--disable-extensions'")
        })

        it('should disable background networking', () => {
            expect(lighthouseCode).toContain("'--disable-background-networking'")
        })

        it('should disable default apps', () => {
            expect(lighthouseCode).toContain("'--disable-default-apps'")
        })

        it('should disable sync', () => {
            expect(lighthouseCode).toContain("'--disable-sync'")
        })

        it('should disable translate', () => {
            expect(lighthouseCode).toContain("'--disable-translate'")
        })

        it('should mute audio', () => {
            expect(lighthouseCode).toContain("'--mute-audio'")
        })

        it('should hide scrollbars', () => {
            expect(lighthouseCode).toContain("'--hide-scrollbars'")
        })
    })

    describe('Lighthouse Settings', () => {
        it('should have maxWaitForLoad timeout configured', () => {
            expect(lighthouseCode).toContain('maxWaitForLoad')
            // Verify it's set to 45000ms
            expect(lighthouseCode).toMatch(/maxWaitForLoad:\s*45000/)
        })

        it('should support mobile and desktop strategies', () => {
            expect(lighthouseCode).toContain("strategy === 'desktop'")
            expect(lighthouseCode).toContain("formFactor")
        })

        it('should configure screen emulation for desktop', () => {
            expect(lighthouseCode).toContain('screenEmulation')
            expect(lighthouseCode).toContain('width: 1350')
            expect(lighthouseCode).toContain('height: 940')
        })

        it('should configure throttling for desktop', () => {
            expect(lighthouseCode).toContain('throttling')
            expect(lighthouseCode).toContain('rttMs')
            expect(lighthouseCode).toContain('throughputKbps')
        })
    })

    describe('Error Handling', () => {
        it('should have try-catch around analysis', () => {
            expect(lighthouseCode).toContain('try {')
            expect(lighthouseCode).toContain('catch (error)')
        })

        it('should always kill Chrome in finally block', () => {
            expect(lighthouseCode).toContain('finally {')
            expect(lighthouseCode).toContain('await chrome.kill()')
        })

        it('should validate URL before analysis', () => {
            expect(lighthouseCode).toContain('new URL(url)')
            expect(lighthouseCode).toContain('URL invalide')
        })
    })
})
