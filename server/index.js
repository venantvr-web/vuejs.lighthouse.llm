/**
 * Local Lighthouse Server
 * Express API for running Lighthouse audits with local Chromium
 */

import express from 'express'
import cors from 'cors'
import {analyzeUrl, checkChrome} from './lighthouse.js'
import {FETCH_HEADERS, resolveUserAgent} from './config.js'

const app = express()
const PORT = process.env.LIGHTHOUSE_PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
    next()
})

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', async (req, res) => {
    const chromeAvailable = await checkChrome()
    res.json({
        status: 'ok',
        chromium: chromeAvailable,
        timestamp: new Date().toISOString()
    })
})

/**
 * Analyze URL endpoint
 * POST /analyze
 * Body: { url: string, strategy?: 'mobile' | 'desktop', categories?: string[] }
 */
app.post('/analyze', async (req, res) => {
    const {url, strategy = 'mobile', categories} = req.body

    // Validate request
    if (!url) {
        return res.status(400).json({error: 'URL requise'})
    }

    // Validate strategy
    if (strategy && !['mobile', 'desktop'].includes(strategy)) {
        return res.status(400).json({error: 'Strategy doit être "mobile" ou "desktop"'})
    }

    try {
        const report = await analyzeUrl(url, {strategy, categories})
        res.json(report)
    } catch (error) {
        console.error('[Error]', error.message)
        res.status(500).json({error: error.message})
    }
})

/**
 * Get available categories
 * GET /categories
 */
app.get('/categories', (req, res) => {
    res.json({
        categories: [
            {id: 'performance', name: 'Performance'},
            {id: 'accessibility', name: 'Accessibilité'},
            {id: 'best-practices', name: 'Bonnes Pratiques'},
            {id: 'seo', name: 'SEO'},
            {id: 'pwa', name: 'PWA'}
        ]
    })
})

/**
 * Fetch page content (proxy to avoid CORS)
 * POST /api/fetch-page
 * Body: { url: string }
 */
app.post('/api/fetch-page', async (req, res) => {
    const {url, userAgent} = req.body

    if (!url) {
        return res.status(400).json({error: 'URL requise'})
    }

    // Validate URL
    try {
        new URL(url)
    } catch {
        return res.status(400).json({error: 'URL invalide'})
    }

    try {
        // Détection toujours fraîche : on demande à l'amont de revalider et on
        // marque la réponse du proxy comme non mise en cache.
        res.set('Cache-Control', 'no-store')
        const response = await fetch(url, {
            headers: {...FETCH_HEADERS, 'User-Agent': resolveUserAgent(userAgent), 'Cache-Control': 'no-cache', 'Pragma': 'no-cache'},
            redirect: 'follow',
            cache: 'no-store'
        })

        if (!response.ok) {
            return res.status(response.status).json({
                error: `Erreur HTTP ${response.status}`,
                status: response.status
            })
        }

        const contentType = response.headers.get('content-type') || ''
        // X-Robots-Tag est un signal d'indexabilité porté par l'en-tête HTTP
        const xRobotsTag = response.headers.get('x-robots-tag') || ''

        // Handle HTML content
        if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
            const html = await response.text()
            return res.json({html, contentType, url: response.url, xRobotsTag})
        }

        // Handle XML (sitemap)
        if (contentType.includes('xml')) {
            const xml = await response.text()
            return res.json({html: xml, contentType, url: response.url, xRobotsTag})
        }

        // Handle plain text and untyped responses (robots.txt, llms.txt, sitemaps
        // served as text/plain). Other resources rely on these text bodies.
        if (contentType.includes('text/') || contentType === '') {
            const text = await response.text()
            return res.json({html: text, contentType, url: response.url, xRobotsTag})
        }

        // Other content types
        return res.status(415).json({error: 'Type de contenu non supporté', contentType})

    } catch (error) {
        console.error('[Fetch Error]', error.message)
        res.status(500).json({error: error.message})
    }
})

/**
 * Lightweight URL status check (for sitemap crawling / 404 detection).
 * POST /api/check-url
 * Body: { url: string }
 * Always responds 200 with { ok, status, url } so the client can read the
 * upstream status for any content type (unlike /api/fetch-page).
 */
app.post('/api/check-url', async (req, res) => {
    const {url, userAgent} = req.body

    if (!url) {
        return res.status(400).json({error: 'URL requise'})
    }
    try {
        new URL(url)
    } catch {
        return res.status(400).json({error: 'URL invalide'})
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            headers: {'User-Agent': resolveUserAgent(userAgent)}
        })
        return res.json({ok: response.ok, status: response.status, url: response.url})
    } catch (error) {
        return res.json({ok: false, status: 0, error: error.message})
    }
})

// Error handler
app.use((err, req, res, next) => {
    console.error('[Error]', err)
    res.status(500).json({error: 'Erreur interne du serveur'})
})

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║     Lighthouse Local Server                       ║
╠═══════════════════════════════════════════════════╣
║  URL:      http://localhost:${PORT}                  ║
║  Health:   http://localhost:${PORT}/health           ║
║  Analyze:  POST http://localhost:${PORT}/analyze     ║
╚═══════════════════════════════════════════════════╝
  `)
})
