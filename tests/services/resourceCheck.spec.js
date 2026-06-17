import {describe, expect, it} from 'vitest'
import {
    originFromUrl,
    parseSitemapsFromRobots,
    parseSitemapUrls,
    standardResources
} from '@/services/resourceCheck'

describe('services/resourceCheck - pure helpers', () => {
    describe('originFromUrl', () => {
        it('adds https and returns the origin', () => {
            expect(originFromUrl('example.com/path')).toBe('https://example.com')
        })

        it('returns empty for invalid input', () => {
            expect(originFromUrl('   ')).toBe('')
        })
    })

    describe('standardResources', () => {
        it('builds the standard resource URLs for an origin', () => {
            const list = standardResources('https://example.com')
            const byKey = Object.fromEntries(list.map(r => [r.key, r.url]))
            expect(byKey.robots).toBe('https://example.com/robots.txt')
            expect(byKey.llms).toBe('https://example.com/llms.txt')
            expect(byKey.llms_full).toBe('https://example.com/llms-full.txt')
        })
    })

    describe('parseSitemapsFromRobots', () => {
        it('extracts Sitemap directives (case-insensitive) and dedupes', () => {
            const robots = [
                'User-agent: *',
                'Disallow: /private',
                'Sitemap: https://example.com/sitemap.xml',
                'sitemap:   https://example.com/news.xml',
                'Sitemap: https://example.com/sitemap.xml'
            ].join('\n')
            expect(parseSitemapsFromRobots(robots)).toEqual([
                'https://example.com/sitemap.xml',
                'https://example.com/news.xml'
            ])
        })

        it('returns empty when none declared', () => {
            expect(parseSitemapsFromRobots('User-agent: *')).toEqual([])
        })
    })

    describe('parseSitemapUrls', () => {
        it('counts <loc> entries in a urlset', () => {
            const xml = '<urlset><url><loc>a</loc></url><url><loc>b</loc></url></urlset>'
            expect(parseSitemapUrls(xml)).toEqual({type: 'urlset', count: 2})
        })

        it('detects a sitemap index', () => {
            const xml = '<sitemapindex><sitemap><loc>a</loc></sitemap></sitemapindex>'
            expect(parseSitemapUrls(xml)).toEqual({type: 'index', count: 1})
        })

        it('handles empty input', () => {
            expect(parseSitemapUrls('')).toEqual({type: 'unknown', count: 0})
        })
    })
})
