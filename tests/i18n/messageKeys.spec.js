import {describe, expect, it} from 'vitest'
import {readFileSync} from 'fs'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'
import {glob} from 'glob'
import {messages} from '@/i18n'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function hasKey(key) {
    let cursor = messages
    for (const part of key.split('.')) {
        if (cursor == null || typeof cursor !== 'object') return false
        cursor = cursor[part]
    }
    return typeof cursor === 'string'
}

// Récupère les clés i18n littérales : $t('a.b'), t("a.b") — pas les clés dynamiques.
function extractKeys(source) {
    const keys = new Set()
    const re = /(?:\$t|\bt)\(\s*(['"])([\w.]+)\1/g
    let m
    while ((m = re.exec(source)) !== null) keys.add(m[2])
    return keys
}

describe('i18n message keys', () => {
    it('every $t/t key used in the code exists in the messages', async () => {
        const files = await glob('src/**/*.{vue,js}', {
            cwd: root,
            absolute: true,
            ignore: ['**/i18n/**', '**/*.spec.js', '**/*.test.js']
        })

        const missing = []
        for (const file of files) {
            const source = readFileSync(file, 'utf-8')
            for (const key of extractKeys(source)) {
                // On ne considère que les clés namespacées (a.b…), pas les helpers t(x) ad hoc
                if (!key.includes('.')) continue
                if (!hasKey(key)) missing.push(`${key}  (${file.replace(root + '/', '')})`)
            }
        }

        expect(missing, `Clés i18n manquantes :\n${missing.join('\n')}`).toEqual([])
    })

    it('exposes the common namespace', () => {
        expect(hasKey('common.cancel')).toBe(true)
        expect(hasKey('common.save')).toBe(true)
    })
})
