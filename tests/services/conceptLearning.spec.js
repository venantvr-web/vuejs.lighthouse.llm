import {describe, expect, it} from 'vitest'
import {buildConceptExtractionPrompt, parseConcepts} from '@/services/conceptLearning'

describe('services/conceptLearning', () => {
    describe('buildConceptExtractionPrompt', () => {
        const context = {
            title: 'Concilio — Conciergerie médicale',
            description: 'Accompagnement santé personnalisé',
            headerLinks: [{text: 'Nos services'}, {text: 'Pour les entreprises'}],
            footerLinks: [{text: 'Contact'}],
            sitemap: {sections: [{section: 'services', count: 12}, {section: 'blog', count: 30}]}
        }

        it('includes the brand and the known sector (anti-homonym)', () => {
            const p = buildConceptExtractionPrompt(context, {brand: 'Concilio', sector: 'conciergerie médicale'})
            expect(p).toContain('« Concilio »')
            expect(p).toContain('conciergerie médicale')
            expect(p).toMatch(/homonyme/)
        })

        it('embeds site signals (title, sitemap sections, navigation)', () => {
            const p = buildConceptExtractionPrompt(context, {brand: 'Concilio'})
            expect(p).toContain('Concilio — Conciergerie médicale')
            expect(p).toContain('services (12)')
            expect(p).toContain('Nos services')
        })

        it('asks for a strict products/audiences/keywords JSON object', () => {
            const p = buildConceptExtractionPrompt(context, {brand: 'X'})
            expect(p).toContain('"products"')
            expect(p).toContain('"audiences"')
            expect(p).toContain('"keywords"')
        })

        it('does not crash on an empty context', () => {
            expect(() => buildConceptExtractionPrompt()).not.toThrow()
        })
    })

    describe('parseConcepts', () => {
        it('parses a well-formed JSON object', () => {
            const out = parseConcepts('{"products":["Bilan santé","Second avis"],"audiences":["Particuliers","Entreprises"],"keywords":["prévention"]}')
            expect(out.products).toEqual(['Bilan santé', 'Second avis'])
            expect(out.audiences).toEqual(['Particuliers', 'Entreprises'])
            expect(out.keywords).toEqual(['prévention'])
        })

        it('tolerates code fences and surrounding prose', () => {
            const out = parseConcepts('Voici :\n```json\n{"products":["A"],"audiences":[],"keywords":[]}\n```\nmerci')
            expect(out.products).toEqual(['A'])
        })

        it('deduplicates (case-insensitive) and drops blanks / overly long entries', () => {
            const long = 'x'.repeat(60)
            const out = parseConcepts(`{"products":["Bilan","bilan"," ","${long}"],"audiences":[],"keywords":[]}`)
            expect(out.products).toEqual(['Bilan'])
        })

        it('returns empty lists for missing keys or garbage', () => {
            expect(parseConcepts('{}').products).toEqual([])
            expect(parseConcepts('pas de json')).toEqual({products: [], audiences: [], keywords: []})
            expect(parseConcepts('')).toEqual({products: [], audiences: [], keywords: []})
        })

        it('ignores non-array fields', () => {
            const out = parseConcepts('{"products":"oops","audiences":null,"keywords":["ok"]}')
            expect(out.products).toEqual([])
            expect(out.audiences).toEqual([])
            expect(out.keywords).toEqual(['ok'])
        })
    })
})
