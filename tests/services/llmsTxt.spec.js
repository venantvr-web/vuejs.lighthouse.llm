import {describe, expect, it} from 'vitest'
import {
    buildLlmsTxtPrompt,
    buildSiteContext,
    detectContextChanges,
    extractMainText,
    groupSitemapUrls,
    parseHomepage,
    stripCodeFence
} from '@/services/llmsTxt'

const HTML = `
<!doctype html><html><head>
  <title>Concilio — Audit SEO</title>
  <meta name="description" content="Plateforme d'audit SEO et performance">
</head><body>
  <header>
    <a href="/">Accueil</a>
    <a href="/services">Services</a>
    <a href="/services">Services</a>
    <a href="https://twitter.com/x">Twitter</a>
    <a href="#top">Haut</a>
    <a href="mailto:a@b.com">Mail</a>
  </header>
  <footer>
    <a href="/mentions-legales">Mentions légales</a>
    <a href="/contact">Contact</a>
  </footer>
</body></html>`

const ORIGIN = 'https://www.concilio.com'

describe('parseHomepage', () => {
    it('extrait titre et description', () => {
        const r = parseHomepage(HTML, ORIGIN)
        expect(r.title).toBe('Concilio — Audit SEO')
        expect(r.description).toBe("Plateforme d'audit SEO et performance")
    })

    it('collecte les liens d\'en-tête même origine, dédupliqués, sans ancres/mailto/externe', () => {
        const r = parseHomepage(HTML, ORIGIN)
        const urls = r.headerLinks.map(l => l.url)
        expect(urls).toContain('https://www.concilio.com/')
        expect(urls).toContain('https://www.concilio.com/services')
        // dédoublonné
        expect(urls.filter(u => u.endsWith('/services')).length).toBe(1)
        // exclusions
        expect(urls.some(u => u.includes('twitter.com'))).toBe(false)
        expect(urls.some(u => u.startsWith('mailto:'))).toBe(false)
        expect(urls.some(u => u.includes('#'))).toBe(false)
    })

    it('collecte les liens de pied de page', () => {
        const r = parseHomepage(HTML, ORIGIN)
        expect(r.footerLinks.map(l => l.text)).toEqual(['Mentions légales', 'Contact'])
    })
})

describe('groupSitemapUrls', () => {
    it('regroupe par première section, trié par volume', () => {
        const urls = [
            `${ORIGIN}/`,
            `${ORIGIN}/blog/a`,
            `${ORIGIN}/blog/b`,
            `${ORIGIN}/blog/c`,
            `${ORIGIN}/services/x`
        ]
        const r = groupSitemapUrls(urls, 2)
        expect(r.total).toBe(5)
        expect(r.sections[0]).toMatchObject({section: 'blog', count: 3})
        expect(r.sections[0].samples.length).toBe(2) // borné par sampleSize
        const sections = r.sections.map(s => s.section)
        expect(sections).toContain('services')
        expect(sections).toContain('/') // racine
    })
})

describe('buildLlmsTxtPrompt', () => {
    const context = buildSiteContext({
        origin: ORIGIN,
        html: HTML,
        sitemapUrls: [`${ORIGIN}/`, `${ORIGIN}/services/x`]
    })

    it('mode llms.txt : index/résumé avec le contexte et les mots-clés', () => {
        const prompt = buildLlmsTxtPrompt(context, {keywords: 'audit seo, performance'})
        expect(prompt).toContain('llms.txt')
        expect(prompt).toContain(ORIGIN)
        expect(prompt).toContain('Concilio — Audit SEO')
        expect(prompt).toContain('audit seo, performance')
        expect(prompt).toContain('Index des ressources')
        expect(prompt).toContain('Données d\'entrée')
    })

    it('mode full : corpus complet, nettoyage du bruit et reprise', () => {
        const prompt = buildLlmsTxtPrompt(context, {full: true})
        expect(prompt).toContain('llms-full.txt')
        expect(prompt.toLowerCase()).toContain('nettoyage du bruit')
        expect(prompt).toContain('Source :')
        expect(prompt.toLowerCase()).toContain('continuer')
    })

    it('mode full : injecte le contenu brut des pages fournies', () => {
        const pages = [{url: `${ORIGIN}/services`, title: 'Services', text: 'Texte réel de la page services.'}]
        const prompt = buildLlmsTxtPrompt(context, {full: true, pages})
        expect(prompt).toContain('Contenu brut des pages')
        expect(prompt).toContain('Texte réel de la page services.')
        expect(prompt).toContain(`> Source : ${ORIGIN}/services`)
    })

    it('injecte les concepts appris et l\'instruction de prise en compte', () => {
        const concepts = {products: ['Bilan santé'], audiences: ['Entreprises'], keywords: ['prévention']}
        const prompt = buildLlmsTxtPrompt(context, {concepts})
        expect(prompt).toContain('Concepts de la marque')
        expect(prompt).toContain('Bilan santé')
        expect(prompt).toContain('Public cible : Entreprises')
        expect(prompt).toMatch(/intègre explicitement.*produits\/services/i)
    })

    it('n\'ajoute pas de section concepts quand aucun n\'est fourni', () => {
        const prompt = buildLlmsTxtPrompt(context, {concepts: {products: [], audiences: [], keywords: []}})
        expect(prompt).not.toContain('Concepts de la marque')
    })
})

describe('extractMainText', () => {
    it('retire le bruit (script, nav, footer) et garde le contenu', () => {
        const html = '<html><body><nav>Menu</nav><header>Logo</header>' +
            '<main><h1>Titre</h1><p>Contenu utile.</p></main>' +
            '<footer>Pied</footer><script>alert(1)</script></body></html>'
        const text = extractMainText(html)
        expect(text).toContain('Titre')
        expect(text).toContain('Contenu utile.')
        expect(text).not.toContain('Menu')
        expect(text).not.toContain('Pied')
        expect(text).not.toContain('alert(1)')
    })

    it('borne la longueur', () => {
        const html = '<body><main>' + 'a'.repeat(9000) + '</main></body>'
        expect(extractMainText(html, 100).length).toBe(100)
    })
})

describe('stripCodeFence', () => {
    it('retire un bloc de code englobant', () => {
        expect(stripCodeFence('```markdown\n# Titre\n> x\n```')).toBe('# Titre\n> x')
        expect(stripCodeFence('```\n# Titre\n```')).toBe('# Titre')
    })
    it('laisse le contenu intact sans fence', () => {
        expect(stripCodeFence('# Titre\n> x')).toBe('# Titre\n> x')
    })
})

describe('detectContextChanges', () => {
    it('repère sections ajoutées/supprimées et variation d\'URL', () => {
        const prev = buildSiteContext({origin: ORIGIN, html: HTML, sitemapUrls: [`${ORIGIN}/blog/a`]})
        const next = buildSiteContext({origin: ORIGIN, html: HTML, sitemapUrls: [`${ORIGIN}/shop/a`, `${ORIGIN}/shop/b`]})
        const changes = detectContextChanges(next, prev)
        expect(changes.some(c => c.includes('shop'))).toBe(true)
        expect(changes.some(c => c.includes('blog'))).toBe(true)
        expect(changes.some(c => c.includes('1 → 2'))).toBe(true)
    })

    it('retourne vide sans précédent', () => {
        expect(detectContextChanges({}, null)).toEqual([])
    })
})
