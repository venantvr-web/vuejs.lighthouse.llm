import {describe, expect, it} from 'vitest'
import {
    analyzeStructuredData,
    buildStructuredDataPrompt,
    extractPageContext,
    parseStructuredData,
    STRUCTURED_DATA_SYSTEM,
    toScriptTag
} from '@/services/structuredDataGen'

describe('extractPageContext', () => {
    it('extracts title, description, lang and headings', () => {
        const html = `<html lang="fr"><head>
            <title>Concilio — Santé</title>
            <meta name="description" content="Accès aux meilleurs médecins"></head>
            <body><h1>Bienvenue</h1><h2>Nos services</h2></body></html>`
        const ctx = extractPageContext(html)
        expect(ctx.title).toBe('Concilio — Santé')
        expect(ctx.description).toBe('Accès aux meilleurs médecins')
        expect(ctx.lang).toBe('fr')
        expect(ctx.headings).toEqual(['Bienvenue', 'Nos services'])
    })

    it('returns empty context for empty html', () => {
        expect(extractPageContext('')).toEqual({title: '', description: '', lang: '', headings: []})
    })
})

describe('analyzeStructuredData', () => {
    it('flags a page without JSON-LD as needing generation', () => {
        const res = analyzeStructuredData('<html><body>No structured data</body></html>')
        expect(res.present).toBe(false)
        expect(res.needsGeneration).toBe(true)
    })

    it('does not request generation for valid structured data', () => {
        const html = `<script type="application/ld+json">
            {"@context":"https://schema.org","@type":"WebSite","name":"Concilio","url":"https://concilio.com"}
        </script>`
        const res = analyzeStructuredData(html)
        expect(res.present).toBe(true)
        expect(res.types).toContain('WebSite')
        expect(res.needsGeneration).toBe(false)
    })
})

describe('buildStructuredDataPrompt', () => {
    it('includes the URL, context and asks for JSON-LD only', () => {
        const prompt = buildStructuredDataPrompt({
            url: 'https://x.com/blog',
            context: {title: 'Blog', headings: ['Article 1']},
            types: [],
            issues: []
        })
        expect(prompt).toContain('https://x.com/blog')
        expect(prompt).toContain('Blog')
        expect(prompt).toMatch(/@graph/)
        expect(prompt).toMatch(/UNIQUEMENT/)
        expect(STRUCTURED_DATA_SYSTEM).toMatch(/JSON-LD/)
    })
})

describe('parseStructuredData', () => {
    it('parses a raw JSON-LD object', () => {
        const {json, error} = parseStructuredData('{"@context":"https://schema.org","@type":"WebPage"}')
        expect(error).toBeNull()
        expect(json['@type']).toBe('WebPage')
    })

    it('parses JSON-LD wrapped in a markdown code fence', () => {
        const text = '```json\n{"@context":"https://schema.org","@graph":[]}\n```'
        const {json, error} = parseStructuredData(text)
        expect(error).toBeNull()
        expect(json['@graph']).toEqual([])
    })

    it('strips surrounding prose before/after the JSON', () => {
        const text = 'Voici le balisage :\n{"@type":"Article"}\nVoilà !'
        const {json, error} = parseStructuredData(text)
        expect(error).toBeNull()
        expect(json['@type']).toBe('Article')
    })

    it('rejects non-JSON or non-schema responses', () => {
        expect(parseStructuredData('pas de json ici').json).toBeNull()
        expect(parseStructuredData('{"foo":"bar"}').error).toMatch(/@context/)
    })
})

describe('toScriptTag', () => {
    it('wraps JSON-LD in a script tag', () => {
        const tag = toScriptTag('{"@type":"WebPage"}')
        expect(tag).toContain('<script type="application/ld+json">')
        expect(tag).toContain('{"@type":"WebPage"}')
    })
})
