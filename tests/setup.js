/**
 * Vitest global setup
 */
import {vi} from 'vitest'

// Mock import.meta.glob for template loading
vi.mock('import.meta', () => ({
    glob: vi.fn()
}))

// Global test utilities
global.createMockLighthouseReport = (overrides = {}) => ({
    lighthouseVersion: '12.0.0',
    fetchTime: '2024-01-15T10:30:00.000Z',
    requestedUrl: 'https://example.com',
    finalUrl: 'https://example.com/',
    finalDisplayedUrl: 'https://example.com/',
    categories: {
        performance: {score: 0.85},
        seo: {score: 0.92},
        accessibility: {score: 0.78},
        'best-practices': {score: 0.95},
        pwa: {score: 0.45}
    },
    audits: {
        'largest-contentful-paint': {
            id: 'largest-contentful-paint',
            title: 'Largest Contentful Paint',
            numericValue: 2500,
            displayValue: '2.5 s',
            score: 0.75
        },
        'cumulative-layout-shift': {
            id: 'cumulative-layout-shift',
            title: 'Cumulative Layout Shift',
            numericValue: 0.05,
            displayValue: '0.05',
            score: 0.95
        },
        'total-blocking-time': {
            id: 'total-blocking-time',
            title: 'Total Blocking Time',
            numericValue: 150,
            displayValue: '150 ms',
            score: 0.9
        },
        'first-contentful-paint': {
            id: 'first-contentful-paint',
            title: 'First Contentful Paint',
            numericValue: 1200,
            displayValue: '1.2 s',
            score: 0.85
        },
        'speed-index': {
            id: 'speed-index',
            title: 'Speed Index',
            numericValue: 3000,
            displayValue: '3.0 s',
            score: 0.7
        },
        'interactive': {
            id: 'interactive',
            title: 'Time to Interactive',
            numericValue: 3500,
            displayValue: '3.5 s',
            score: 0.65
        },
        'total-byte-weight': {
            id: 'total-byte-weight',
            title: 'Total Byte Weight',
            numericValue: 1500000,
            displayValue: '1.5 MB',
            score: 0.6
        },
        'render-blocking-resources': {
            id: 'render-blocking-resources',
            title: 'Eliminate render-blocking resources',
            score: 0.4,
            details: {
                type: 'opportunity',
                overallSavingsMs: 500,
                items: [
                    {url: 'https://example.com/style.css', wastedMs: 300},
                    {url: 'https://example.com/script.js', wastedMs: 200}
                ]
            }
        },
        'unused-css-rules': {
            id: 'unused-css-rules',
            title: 'Reduce unused CSS',
            score: 0.5,
            details: {
                type: 'opportunity',
                overallSavingsBytes: 50000,
                items: []
            }
        },
        'document-title': {
            id: 'document-title',
            title: 'Document has a title element',
            score: 1,
            details: {
                items: [{title: 'Example Site - Home'}]
            }
        },
        'meta-description': {
            id: 'meta-description',
            title: 'Document has a meta description',
            score: 1,
            details: {
                items: [{content: 'Example site description'}]
            }
        },
        'is-crawlable': {
            id: 'is-crawlable',
            title: 'Page is not blocked from indexing',
            score: 1
        }
    },
    ...overrides
})

// Console warning suppression for known Vue warnings in tests
const originalWarn = console.warn
console.warn = (...args) => {
    if (args[0]?.includes?.('[Vue warn]')) return
    originalWarn.apply(console, args)
}
