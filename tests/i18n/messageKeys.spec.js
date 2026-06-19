import {describe, expect, it} from 'vitest'
import {readFileSync} from 'fs'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'
import {glob} from 'glob'
import {DEFAULT_LOCALE, messages, SUPPORTED_LOCALES} from '@/i18n'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function flatten(obj, prefix = '', out = []) {
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k
        if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
        else out.push(key)
    }
    return out
}

function hasKey(locale, key) {
    let cursor = messages[locale]
    for (const part of key.split('.')) {
        if (cursor == null || typeof cursor !== 'object') return false
        cursor = cursor[part]
    }
    return typeof cursor === 'string'
}

function extractKeys(source) {
    const keys = new Set()
    const re = /(?:\$t|\bt)\(\s*(['"])([\w.]+)\1/g
    let m
    while ((m = re.exec(source)) !== null) keys.add(m[2])
    return keys
}

describe('i18n message keys', () => {
    it('every $t/t key used in the code exists in the default locale', async () => {
        const files = await glob('src/**/*.{vue,js}', {
            cwd: root,
            absolute: true,
            ignore: ['**/i18n/**', '**/*.spec.js', '**/*.test.js']
        })

        const missing = []
        for (const file of files) {
            const source = readFileSync(file, 'utf-8')
            for (const key of extractKeys(source)) {
                if (!key.includes('.')) continue
                if (!hasKey(DEFAULT_LOCALE, key)) missing.push(`${key}  (${file.replace(root + '/', '')})`)
            }
        }

        expect(missing, `Clés i18n manquantes :\n${missing.join('\n')}`).toEqual([])
    })

    it('exposes the common namespace', () => {
        expect(hasKey('fr', 'common.cancel')).toBe(true)
        expect(hasKey('fr', 'common.save')).toBe(true)
    })

    it('all locales have the same keys as the default locale (parité)', () => {
        const refKeys = flatten(messages[DEFAULT_LOCALE]).sort()
        for (const loc of SUPPORTED_LOCALES) {
            if (loc === DEFAULT_LOCALE) continue
            const locKeys = new Set(flatten(messages[loc]))
            const missing = refKeys.filter(k => !locKeys.has(k))
            const extra = flatten(messages[loc]).filter(k => !refKeys.includes(k))
            expect(missing, `Clés manquantes en '${loc}':\n${missing.join('\n')}`).toEqual([])
            expect(extra, `Clés en trop en '${loc}':\n${extra.join('\n')}`).toEqual([])
        }
    })
})
