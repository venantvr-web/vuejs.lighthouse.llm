import {describe, expect, it} from 'vitest'
import {compareSnapshots, liteContext} from '@/services/llmSnapshot'

function snap(sections, total, llmsPresent = false, llmsFullPresent = false, title = 'T') {
    return {
        context: liteContext({title, sitemap: {total, sections}}),
        llmsPresent,
        llmsFullPresent
    }
}

describe('liteContext', () => {
    it('réduit le contexte aux champs utiles à la veille', () => {
        const lite = liteContext({
            title: 'X',
            description: 'ignorée',
            headerLinks: [{}],
            sitemap: {total: 3, sections: [{section: 'blog', count: 3, samples: ['a']}]}
        })
        expect(lite).toEqual({title: 'X', sitemap: {total: 3, sections: [{section: 'blog', count: 3}]}})
    })
})

describe('compareSnapshots', () => {
    it('sans précédent : aucun changement', () => {
        expect(compareSnapshots(null, snap([{section: 'blog', count: 1}], 1))).toEqual([])
    })

    it('détecte sections et volume', () => {
        const prev = snap([{section: 'blog', count: 1}], 1)
        const next = snap([{section: 'shop', count: 2}], 2)
        const changes = compareSnapshots(prev, next)
        expect(changes.some(c => c.includes('shop'))).toBe(true)
        expect(changes.some(c => c.includes('blog'))).toBe(true)
        expect(changes.some(c => c.includes('1 → 2'))).toBe(true)
    })

    it('alerte quand un llms.txt disparaît ou est publié', () => {
        const sections = [{section: 'blog', count: 1}]
        const removed = compareSnapshots(snap(sections, 1, true, false), snap(sections, 1, false, false))
        expect(removed.some(c => c.toLowerCase().includes('llms.txt') && c.toLowerCase().includes('disparu'))).toBe(true)

        const published = compareSnapshots(snap(sections, 1, false, false), snap(sections, 1, true, false))
        expect(published.some(c => c.toLowerCase().includes('publié'))).toBe(true)
    })

    it('aucun changement si tout est identique', () => {
        const sections = [{section: 'blog', count: 1}]
        expect(compareSnapshots(snap(sections, 1, true, true), snap(sections, 1, true, true))).toEqual([])
    })
})
