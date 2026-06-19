import {ref} from 'vue'
import {checkUrlStatus, extractSitemapLocs, fetchResource, parseSitemapUrls} from '@/services/resourceCheck'

/**
 * Run an async mapper over items with a bounded concurrency.
 * @param {Array} items - Items
 * @param {number} concurrency - Max parallel tasks
 * @param {(item: any, index: number) => Promise<any>} mapper - Async mapper
 * @returns {Promise<Array>} Results in input order
 */
export async function mapWithConcurrency(items, concurrency, mapper) {
    const results = new Array(items.length)
    let cursor = 0

    async function worker() {
        while (cursor < items.length) {
            const index = cursor++
            results[index] = await mapper(items[index], index)
        }
    }

    const workers = Array.from({length: Math.min(concurrency, items.length)}, worker)
    await Promise.all(workers)
    return results
}

/**
 * Composable that crawls a sitemap (resolving sitemap indexes) and checks each
 * page URL for broken responses (404s, errors). Uses the local server proxy.
 */
export function useSitemapCrawl() {
    const crawling = ref(false)
    const error = ref(null)
    const progress = ref({done: 0, total: 0})
    const pages = ref([])

    /**
     * Resolve a sitemap (and its children if it is an index) into page URLs.
     * @param {string} sitemapUrl - Sitemap URL
     * @param {number} maxChildren - Max child sitemaps to expand
     * @returns {Promise<string[]>} Page URLs
     */
    async function resolvePageUrls(sitemapUrl, maxChildren = 20) {
        const res = await fetchResource(sitemapUrl)
        if (!res.available) return []
        const {type} = parseSitemapUrls(res.content)
        const locs = extractSitemapLocs(res.content)

        if (type !== 'index') return locs

        // Sitemap index: expand child sitemaps (bounded) and merge their pages.
        const children = locs.slice(0, maxChildren)
        const nested = await mapWithConcurrency(children, 4, async (child) => {
            const childRes = await fetchResource(child)
            return childRes.available ? extractSitemapLocs(childRes.content) : []
        })
        return nested.flat()
    }

    /**
     * Crawl a sitemap and check each page URL.
     * @param {string} sitemapUrl - Sitemap URL
     * @param {object} options - { maxUrls, concurrency }
     */
    async function crawl(sitemapUrl, options = {}) {
        const {maxUrls = 100, concurrency = 5} = options
        crawling.value = true
        error.value = null
        pages.value = []
        progress.value = {done: 0, total: 0}

        try {
            const allUrls = await resolvePageUrls(sitemapUrl)
            const urls = allUrls.slice(0, maxUrls)
            progress.value = {done: 0, total: urls.length}

            pages.value = await mapWithConcurrency(urls, concurrency, async (url) => {
                const result = await checkUrlStatus(url)
                progress.value = {...progress.value, done: progress.value.done + 1}
                return result
            })
        } catch (err) {
            error.value = err.message || 'Échec du crawl'
        } finally {
            crawling.value = false
        }
    }

    return {crawling, error, progress, pages, crawl}
}

export default useSitemapCrawl
