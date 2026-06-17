import {ref} from 'vue'
import {
    extractJsonLd,
    fetchResource,
    jsonLdTypes,
    originFromUrl,
    parseSitemapUrls,
    parseSitemapsFromRobots,
    standardResources,
    validateJsonLd
} from '@/services/resourceCheck'

/**
 * Composable that checks a site's SEO/GEO resources (robots.txt, sitemaps,
 * llms.txt…) through the local server proxy and inspects the sitemaps found.
 */
export function useResourceCheck() {
    const checking = ref(false)
    const error = ref(null)
    const origin = ref('')
    const resources = ref([])
    const sitemaps = ref([])
    const jsonLd = ref({present: false, types: [], issues: []})

    /**
     * Run all checks for a URL.
     * @param {string} url - Site URL or host
     */
    async function check(url) {
        const site = originFromUrl(url)
        if (!site) {
            error.value = 'URL invalide.'
            return
        }
        checking.value = true
        error.value = null
        origin.value = site
        resources.value = []
        sitemaps.value = []
        jsonLd.value = {present: false, types: [], issues: []}

        try {
            // Standard resources + homepage (for JSON-LD detection), in parallel
            const [checked, home] = await Promise.all([
                Promise.all(standardResources(site).map(async (r) => ({...r, ...(await fetchResource(r.url))}))),
                fetchResource(site)
            ])
            resources.value = checked

            // Structured data on the homepage
            if (home.available) {
                const blocks = extractJsonLd(home.content)
                const types = jsonLdTypes(blocks)
                jsonLd.value = {present: types.length > 0, types, issues: validateJsonLd(blocks)}
            }

            // Collect sitemap URLs: those declared in robots.txt + standard ones found
            const urls = new Set()
            const robots = checked.find(r => r.key === 'robots')
            if (robots?.available) {
                parseSitemapsFromRobots(robots.content).forEach(u => urls.add(u))
            }
            checked
                .filter(r => (r.key === 'sitemap' || r.key === 'sitemap_index') && r.available)
                .forEach(r => urls.add(r.url))

            // Fetch and inspect each sitemap
            sitemaps.value = await Promise.all([...urls].map(async (u) => {
                const res = await fetchResource(u)
                const parsed = res.available ? parseSitemapUrls(res.content) : {type: 'unknown', count: 0}
                return {url: u, available: res.available, status: res.status, ...parsed}
            }))
        } catch (err) {
            error.value = err.message || 'Échec des vérifications'
        } finally {
            checking.value = false
        }
    }

    return {checking, error, origin, resources, sitemaps, jsonLd, check}
}

export default useResourceCheck
