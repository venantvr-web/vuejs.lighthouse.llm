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
