/**
 * Génère des **commandes** (et un script Node) pour produire le CSS critique
 * de pages données, à exécuter localement avec l'outil `critical`
 * (Addy Osmani, basé sur Chromium/Penthouse). L'application ne génère rien
 * elle-même : pas de backend, pas de problème de CORS — elle fabrique juste
 * les commandes à lancer dans un terminal.
 *
 * @module utils/criticalCss
 */

/**
 * Découpe un texte libre en liste d'URLs (séparées par espaces/sauts de ligne),
 * dédupliquées et nettoyées.
 * @param {string} text
 * @returns {string[]}
 */
export function parseUrls(text) {
    return [...new Set(String(text || '').split(/\s+/).map(s => s.trim()).filter(Boolean))]
}

/**
 * Construit un nom de fichier lisible à partir d'une URL.
 * @param {string} url
 * @returns {string}
 */
export function slugifyUrl(url) {
    let base = url
    try {
        const u = new URL(url)
        base = u.hostname + u.pathname + (u.search || '')
    } catch {
        // pas une URL valide : on slugifie tel quel
    }
    const slug = base.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
    return slug || 'page'
}

/**
 * Construit le plan de génération : commande d'installation, script Node à
 * créer, et commande d'exécution.
 * @param {string[]} urls - URLs à traiter
 * @param {object} [opts] - { width, height, inline }
 * @returns {{install: string, scriptName: string, script: string, run: string, count: number}}
 */
export function buildCriticalCssPlan(urls = [], opts = {}) {
    const {width = 1300, height = 900, inline = false} = opts
    const scriptName = 'generate-critical.mjs'

    const pages = urls.map(url => {
        const slug = slugifyUrl(url)
        return {url, out: inline ? `${slug}.critical.html` : `${slug}.critical.css`}
    })

    const pagesLiteral = pages
        .map(p => `  {url: ${JSON.stringify(p.url)}, out: ${JSON.stringify(p.out)}},`)
        .join('\n')

    const script = `import {generate} from 'critical'

// Pages à traiter (générées par l'application).
const pages = [
${pagesLiteral}
]

for (const {url, out} of pages) {
  console.log('→', url)
  try {
    await generate({
      src: url,
      target: out,
      inline: ${inline},
      width: ${width},
      height: ${height},
      penthouse: {timeout: 60000}
    })
    console.log('  ✓', out)
  } catch (err) {
    console.error('  ✗', url, '—', err.message)
  }
}
console.log('Terminé.')
`

    return {
        install: 'npm install --save-dev critical',
        scriptName,
        script,
        run: `node ${scriptName}`,
        count: pages.length
    }
}
