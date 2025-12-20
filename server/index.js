/**
 * Local Lighthouse Server
 * Express API for running Lighthouse audits with local Chromium
 */

import express from 'express'
import cors from 'cors'
import { analyzeUrl, checkChrome } from './lighthouse.js'

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
  const { url, strategy = 'mobile', categories } = req.body

  // Validate request
  if (!url) {
    return res.status(400).json({ error: 'URL requise' })
  }

  // Validate strategy
  if (strategy && !['mobile', 'desktop'].includes(strategy)) {
    return res.status(400).json({ error: 'Strategy doit etre "mobile" ou "desktop"' })
  }

  try {
    const report = await analyzeUrl(url, { strategy, categories })
    res.json(report)
  } catch (error) {
    console.error('[Error]', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Get available categories
 * GET /categories
 */
app.get('/categories', (req, res) => {
  res.json({
    categories: [
      { id: 'performance', name: 'Performance' },
      { id: 'accessibility', name: 'Accessibilite' },
      { id: 'best-practices', name: 'Bonnes Pratiques' },
      { id: 'seo', name: 'SEO' },
      { id: 'pwa', name: 'PWA' }
    ]
  })
})

/**
 * Fetch page content (proxy to avoid CORS)
 * POST /api/fetch-page
 * Body: { url: string }
 */
app.post('/api/fetch-page', async (req, res) => {
  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL requise' })
  }

  // Validate URL
  try {
    new URL(url)
  } catch {
    return res.status(400).json({ error: 'URL invalide' })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LighthouseCrawler/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      },
      redirect: 'follow'
    })

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Erreur HTTP ${response.status}`,
        status: response.status
      })
    }

    const contentType = response.headers.get('content-type') || ''

    // Handle HTML content
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      const html = await response.text()
      return res.json({ html, contentType, url: response.url })
    }

    // Handle XML (sitemap)
    if (contentType.includes('xml')) {
      const xml = await response.text()
      return res.json({ html: xml, contentType, url: response.url })
    }

    // Other content types
    return res.status(415).json({ error: 'Type de contenu non supporte', contentType })

  } catch (error) {
    console.error('[Fetch Error]', error.message)
    res.status(500).json({ error: error.message })
  }
})

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err)
  res.status(500).json({ error: 'Erreur interne du serveur' })
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
