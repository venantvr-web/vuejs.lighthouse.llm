import {describe, expect, it} from 'vitest'
import {buildContinuationPrompt, consolidateContinuation, trimToLastCompleteLine} from '@/services/llm/continuation'
import GeminiProvider from '@/services/llm/GeminiProvider'

describe('buildContinuationPrompt', () => {
    it('includes the original prompt and asks to continue without repeating or fencing', () => {
        const out = buildContinuationPrompt('Analyse ce site.', 'Voici le début de la réponse…')
        expect(out).toContain('Analyse ce site.')
        expect(out).toContain('Voici le début de la réponse…')
        expect(out).toMatch(/Reprends exactement/)
        expect(out).toMatch(/ne répète pas/)
        expect(out).toMatch(/bloc de code/) // interdit d'encadrer dans ```
    })

    it('keeps only the tail of a very long partial response', () => {
        const longPartial = 'x'.repeat(20000) + 'FIN_DU_TEXTE'
        const out = buildContinuationPrompt('Demande', longPartial)
        expect(out).toContain('FIN_DU_TEXTE') // la fin est conservée
        expect(out.length).toBeLessThan(longPartial.length) // le début est tronqué
    })

    it('tolerates an empty partial', () => {
        expect(() => buildContinuationPrompt('Demande', '')).not.toThrow()
    })
})

describe('trimToLastCompleteLine', () => {
    it('retire la ligne finale incomplète (coupée en plein milieu)', () => {
        const text = '# Titre\n\n- A : https://x.com/a\n- B : https://www.concilio.'
        expect(trimToLastCompleteLine(text)).toBe('# Titre\n\n- A : https://x.com/a\n')
    })

    it('laisse le texte intact s\'il finit déjà par un saut de ligne', () => {
        const text = 'ligne 1\nligne 2\n'
        expect(trimToLastCompleteLine(text)).toBe(text)
    })

    it('renvoie le texte tel quel sans saut de ligne', () => {
        expect(trimToLastCompleteLine('une seule ligne')).toBe('une seule ligne')
    })
})

describe('consolidateContinuation', () => {
    it('retire un bloc de code ouvrant/fermant parasite ajouté à la reprise', () => {
        const head = '# Doc\n\n- A\n'
        const tail = '```markdown\n- B\n- C\n```'
        const out = consolidateContinuation(head + tail, head.length)
        expect(out).toBe('# Doc\n\n- A\n- B\n- C')
        expect(out).not.toContain('```')
    })

    it('déduplique un chevauchement (le modèle répète la fin déjà écrite)', () => {
        const head = '## Section\n\nUne phrase déjà écrite ici.\n'
        const tail = 'Une phrase déjà écrite ici.\nLa suite du contenu.'
        const out = consolidateContinuation(head + tail, head.length)
        expect(out).toBe('## Section\n\nUne phrase déjà écrite ici.\nLa suite du contenu.')
    })

    it('préserve un bloc de code légitime situé hors de la couture', () => {
        const head = '# Doc\n\n```js\nconst a = 1\n```\n\n- A\n'
        const tail = '- B\n- C'
        const out = consolidateContinuation(head + tail, head.length)
        expect(out).toBe(head + tail) // inchangé, le fence du head reste
        expect(out).toContain('```js')
    })

    it('ne touche pas une reprise déjà propre', () => {
        const head = '# Doc\n\n- A\n'
        const tail = '- B\n- C'
        expect(consolidateContinuation(head + tail, head.length)).toBe(head + tail)
    })
})

describe('provider truncation flag', () => {
    it('Gemini marks the response as truncated on MAX_TOKENS', () => {
        const p = new GeminiProvider({apiKey: 'k', model: 'gemini-2.5-flash'})
        p.lastResponseTruncated = false
        p._extractContent({candidates: [{finishReason: 'MAX_TOKENS', content: {parts: [{text: 'partiel'}]}}]})
        expect(p.lastResponseTruncated).toBe(true)
    })

    it('Gemini does not mark a normal completion as truncated', () => {
        const p = new GeminiProvider({apiKey: 'k', model: 'gemini-2.5-flash'})
        p.lastResponseTruncated = false
        p._extractContent({candidates: [{finishReason: 'STOP', content: {parts: [{text: 'complet'}]}}]})
        expect(p.lastResponseTruncated).toBe(false)
    })
})
