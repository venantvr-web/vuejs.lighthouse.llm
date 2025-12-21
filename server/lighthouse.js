/**
 * Lighthouse wrapper with Chrome Launcher
 * Runs Lighthouse audits locally using Chromium
 */

import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

const DEFAULT_CATEGORIES = [
    'performance',
    'accessibility',
    'best-practices',
    'seo',
    'pwa'
]

/**
 * Analyze a URL using Lighthouse
 * @param {string} url - URL to analyze
 * @param {Object} options - Analysis options
 * @param {string} options.strategy - 'mobile' or 'desktop'
 * @param {string[]} options.categories - Categories to audit
 * @returns {Promise<Object>} Lighthouse Result (LHR)
 */
export async function analyzeUrl(url, options = {}) {
    const {strategy = 'mobile', categories = DEFAULT_CATEGORIES} = options

    // Validate URL
    try {
        new URL(url)
    } catch {
        throw new Error(`URL invalide: ${url}`)
    }

    // Launch Chrome
    const chrome = await chromeLauncher.launch({
        chromeFlags: [
            '--headless=new',
            '--disable-gpu',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--mute-audio',
            '--hide-scrollbars'
        ]
    })

    const flags = {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: categories
    }

    // Desktop vs Mobile configuration
    const config = {
        extends: 'lighthouse:default',
        settings: {
            maxWaitForLoad: 60000,
            maxWaitForFcp: 30000,
            networkQuietThresholdMs: 1000,
            formFactor: strategy === 'desktop' ? 'desktop' : 'mobile',
            screenEmulation: strategy === 'desktop'
                ? {
                    mobile: false,
                    width: 1350,
                    height: 940,
                    deviceScaleFactor: 1,
                    disabled: false
                }
                : undefined,
            throttling: strategy === 'desktop'
                ? {
                    rttMs: 40,
                    throughputKbps: 10240,
                    cpuSlowdownMultiplier: 1,
                    requestLatencyMs: 0,
                    downloadThroughputKbps: 0,
                    uploadThroughputKbps: 0
                }
                : undefined,
            emulatedUserAgent: strategy === 'desktop'
                ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                : undefined
        }
    }

    try {
        console.log(`[Lighthouse] Analyzing ${url} (${strategy})...`)
        const startTime = Date.now()

        const result = await lighthouse(url, flags, config)

        const duration = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(`[Lighthouse] Analysis complete in ${duration}s`)

        return result.lhr
    } catch (error) {
        console.error('[Lighthouse] Analysis failed:', error.message)
        throw new Error(`Analyse echouee: ${error.message}`)
    } finally {
        await chrome.kill()
    }
}

/**
 * Check if Chrome/Chromium is available
 * @returns {Promise<boolean>}
 */
export async function checkChrome() {
    try {
        const installations = await chromeLauncher.Launcher.getInstallations()
        return installations.length > 0
    } catch {
        return false
    }
}
