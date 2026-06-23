import {describe, expect, it} from 'vitest'
import {buildCriticalCssPlan, parseUrls, slugifyUrl} from '@/utils/criticalCss'

describe('criticalCss', () => {
    describe('parseUrls', () => {
        it('splits on whitespace/newlines, trims and dedupes', () => {
            expect(parseUrls('  https://a.tld/\nhttps://b.tld/  https://a.tld/ ')).toEqual([
                'https://a.tld/', 'https://b.tld/'
            ])
        })

        it('returns an empty array for blank input', () => {
            expect(parseUrls('   ')).toEqual([])
        })
    })

    describe('slugifyUrl', () => {
        it('derives a readable slug from host + path', () => {
            expect(slugifyUrl('https://www.example.tld/blog/mon-article/')).toBe('www-example-tld-blog-mon-article')
        })

        it('falls back to "page" for empty-ish input', () => {
            expect(slugifyUrl('')).toBe('page')
        })
    })

    describe('buildCriticalCssPlan', () => {
        it('emits install, script and run commands referencing each URL', () => {
            const plan = buildCriticalCssPlan(['https://a.tld/x'], {width: 1280, height: 800})
            expect(plan.install).toContain('critical')
            expect(plan.run).toBe('node generate-critical.mjs')
            expect(plan.count).toBe(1)
            expect(plan.script).toContain('https://a.tld/x')
            expect(plan.script).toContain('width: 1280')
            expect(plan.script).toContain('a-tld-x.critical.css')
        })

        it('targets an .html file when inline is requested', () => {
            const plan = buildCriticalCssPlan(['https://a.tld/'], {inline: true})
            expect(plan.script).toContain('inline: true')
            expect(plan.script).toContain('.critical.html')
        })

        it('injects User-Agent and Cookie into request and penthouse headers', () => {
            const plan = buildCriticalCssPlan(['https://a.tld/'], {userAgent: 'UA-X', cookie: 'sid=42'})
            expect(plan.script).toContain('request: {headers: {\'User-Agent\': "UA-X", \'Cookie\': "sid=42"}}')
            expect(plan.script).toContain('userAgent: "UA-X"')
            expect(plan.script).toContain('customPageHeaders: {\'User-Agent\': "UA-X", \'Cookie\': "sid=42"}')
        })

        it('omits header options when none are provided', () => {
            const plan = buildCriticalCssPlan(['https://a.tld/'])
            expect(plan.script).not.toContain('request:')
            expect(plan.script).not.toContain('customPageHeaders')
        })
    })
})
