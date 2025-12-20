import {ref} from 'vue'
import {J2TemplateEngine} from '@/prompts/J2TemplateEngine.js'
import {categoryMeta, templateRegistry} from '@/prompts/templates/j2/registry.js'
import {useLighthouseParser} from './useLighthouseParser.js'

/**
 * Composable for generating AI prompts from Lighthouse reports
 * Uses Jinja2-style templates with dynamic data interpolation
 */
export function usePromptEngine() {
    const engine = new J2TemplateEngine()
    const parser = useLighthouseParser()

    const currentTemplate = ref(null)
    const currentCategory = ref('performance')
    const currentStrategy = ref('quick')
    const generatedPrompt = ref('')
    const error = ref(null)

    // Template content cache
    const templateCache = new Map()

    /**
     * Load a .j2 template file content
     * @param {string} filename - Template filename
     * @returns {Promise<string>} Template content
     */
    async function loadTemplateFile(filename) {
        if (templateCache.has(filename)) {
            return templateCache.get(filename)
        }

        try {
            // Use Vite's import.meta.glob to load .j2 files as raw text
            const templates = import.meta.glob('/src/prompts/templates/j2/*.j2', {
                query: '?raw',
                import: 'default'
            })

            const path = `/src/prompts/templates/j2/${filename}`

            if (templates[path]) {
                const content = await templates[path]()
                templateCache.set(filename, content)
                return content
            }

            throw new Error(`Template file not found: ${filename}`)
        } catch (err) {
            console.error(`Failed to load template ${filename}:`, err)
            throw err
        }
    }

    /**
     * Get available templates for a category
     * @param {string} category - Category ID
     * @returns {array} Array of template metadata
     */
    function getAvailableTemplates(category) {
        const categoryTemplates = templateRegistry[category]
        if (!categoryTemplates) return []

        return Object.values(categoryTemplates).map(template => ({
            id: template.id,
            name: template.name,
            description: template.description,
            strategy: template.strategy,
            tags: template.tags
        }))
    }

    /**
     * Extract detailed item data from audit items
     * Handles source-location, node, and standard item types
     * @param {object} item - Audit item
     * @returns {object} Extracted item data
     */
    function extractItemDetails(item) {
        const details = {
            // URL and resource info
            url: item.url || item.source?.url || item.sourceLocation?.url,
            resourceType: item.resourceType,
            mimeType: item.mimeType,
            protocol: item.protocol,

            // Size and timing metrics
            wastedMs: item.wastedMs,
            wastedBytes: item.wastedBytes,
            totalBytes: item.totalBytes,
            transferSize: item.transferSize,
            resourceSize: item.resourceSize,
            startTime: item.startTime,
            endTime: item.endTime,

            // Display values
            label: item.label,
            value: item.value || item.displayValue,

            // Source location (file:line:column)
            sourceLocation: null,

            // Node details (HTML elements)
            node: null,

            // Script/resource specific
            scriptParseCompile: item.scriptParseCompile,
            scripting: item.scripting,
            total: item.total,

            // Third-party info
            entity: item.entity?.text || item.entity,
            subItems: null
        }

        // Extract source-location data (file, line, column)
        if (item.source || item.sourceLocation) {
            const src = item.source || item.sourceLocation
            details.sourceLocation = {
                url: src.url,
                urlProvider: src.urlProvider,
                line: src.line, // Zero-indexed
                column: src.column,
                // Original source map location if available
                original: src.original ? {
                    file: src.original.file,
                    line: src.original.line,
                    column: src.original.column
                } : null
            }
            // Create a formatted location string for templates
            if (src.url && typeof src.line === 'number') {
                details.location = `${src.url}:${src.line + 1}${typeof src.column === 'number' ? ':' + src.column : ''}`
                if (src.original?.file) {
                    details.originalLocation = `${src.original.file}:${src.original.line + 1}:${src.original.column}`
                }
            }
        }

        // Extract node details (HTML element info)
        if (item.node) {
            details.node = {
                selector: item.node.selector,
                snippet: item.node.snippet,
                nodeLabel: item.node.nodeLabel,
                path: item.node.path,
                lhId: item.node.lhId,
                boundingRect: item.node.boundingRect,
                explanation: item.node.explanation
            }
            // Create a human-readable element reference
            details.element = item.node.nodeLabel || item.node.snippet?.slice(0, 80) || item.node.selector
        }

        // Handle sub-items (nested data)
        if (item.subItems?.items?.length) {
            details.subItems = item.subItems.items.slice(0, 3).map(sub => ({
                url: sub.url,
                signal: sub.signal,
                location: sub.location,
                source: sub.source
            }))
        }

        // Filter out empty fields
        return Object.fromEntries(
            Object.entries(details).filter(([, v]) => v !== null && v !== undefined && v !== '')
        )
    }

    /**
     * Extract template data from Lighthouse report
     * @param {object} report - Lighthouse report
     * @param {string} category - Category ID
     * @returns {object} Extracted data for template interpolation
     */
    function extractTemplateData(report, category) {
        if (!report) return {}

        const cwv = parser.getCoreWebVitals(report)
        const failedAudits = parser.getFailedAudits(report, category)
        const opportunities = parser.getOpportunities(report)
        const diagnostics = parser.getDiagnostics(report)

        // Extract detailed items from failed audits with full Lighthouse detail structure
        const failedAuditsWithDetails = failedAudits.slice(0, 15).map(audit => ({
            id: audit.id,
            title: audit.title,
            description: audit.description?.split('[Learn more]')[0]?.trim() || '',
            score: audit.score,
            scoreDisplayMode: audit.scoreDisplayMode,
            displayValue: audit.displayValue,
            weight: audit.weight,
            numericValue: audit.numericValue,
            numericUnit: audit.numericUnit,
            savings: {
                ms: audit.details?.overallSavingsMs || 0,
                bytes: audit.details?.overallSavingsBytes || 0
            },
            // Extract items with full details (source location, node info, etc.)
            items: (audit.details?.items || []).slice(0, 8).map(extractItemDetails),
            // Table headings for context
            headings: audit.details?.headings?.map(h => ({
                key: h.key,
                label: h.label,
                valueType: h.valueType
            })),
            explanation: audit.explanation,
            warnings: audit.warnings
        }))

        // Base data available for all categories
        const baseData = {
            url: report.finalDisplayedUrl || report.finalUrl || report.requestedUrl,
            lighthouseVersion: report.lighthouseVersion,
            fetchTime: report.fetchTime,
            userAgent: report.userAgent,
            environment: {
                networkThrottle: report.configSettings?.throttling?.rttMs ? `RTT ${report.configSettings.throttling.rttMs}ms` : 'Non limité',
                cpuSlowdown: report.configSettings?.throttling?.cpuSlowdownMultiplier || 1,
                formFactor: report.configSettings?.formFactor || 'desktop'
            },
            failedAudits: failedAuditsWithDetails,
            totalFailedAudits: failedAudits.length
        }

        // Extract opportunities with detailed items using full extraction
        const opportunitiesWithDetails = opportunities.slice(0, 10).map(opp => ({
            id: opp.id,
            title: opp.title,
            description: opp.description?.split('[Learn more]')[0]?.trim() || '',
            score: opp.score,
            displayValue: opp.displayValue,
            savingsMs: opp.details?.overallSavingsMs || opp.savings?.ms || 0,
            savingsBytes: opp.details?.overallSavingsBytes || opp.savings?.bytes || 0,
            // Use full item extraction for opportunities
            items: (opp.details?.items || []).slice(0, 8).map(extractItemDetails),
            headings: opp.details?.headings?.map(h => ({
                key: h.key,
                label: h.label,
                valueType: h.valueType
            }))
        }))

        // Extract detailed LCP element info
        const lcpElementAudit = report.audits?.['largest-contentful-paint-element']
        const lcpElementItem = lcpElementAudit?.details?.items?.[0]
        const lcpElement = lcpElementItem ? {
            snippet: lcpElementItem.node?.snippet,
            selector: lcpElementItem.node?.selector,
            nodeLabel: lcpElementItem.node?.nodeLabel,
            boundingRect: lcpElementItem.node?.boundingRect,
            // Additional LCP details
            phases: lcpElementItem.phases ? {
                ttfb: lcpElementItem.phases.ttfb,
                loadDelay: lcpElementItem.phases.loadDelay,
                loadTime: lcpElementItem.phases.loadTime,
                renderDelay: lcpElementItem.phases.renderDelay
            } : null
        } : null

        // Extract CLS elements with full details
        const clsAudit = report.audits?.['layout-shift-elements']
        const clsElements = (clsAudit?.details?.items || []).slice(0, 5).map(item => ({
            snippet: item.node?.snippet,
            selector: item.node?.selector,
            nodeLabel: item.node?.nodeLabel,
            score: item.score,
            // Element dimensions for context
            boundingRect: item.node?.boundingRect
        }))

        // Extract render-blocking resources with file details
        const renderBlockingAudit = report.audits?.['render-blocking-resources']
        const renderBlockingResources = (renderBlockingAudit?.details?.items || []).slice(0, 10).map(extractItemDetails)

        // Extract unused JavaScript with source locations
        const unusedJsAudit = report.audits?.['unused-javascript']
        const unusedJsResources = (unusedJsAudit?.details?.items || []).slice(0, 10).map(extractItemDetails)

        // Extract unused CSS with source locations
        const unusedCssAudit = report.audits?.['unused-css-rules']
        const unusedCssResources = (unusedCssAudit?.details?.items || []).slice(0, 10).map(extractItemDetails)

        // Extract main thread work breakdown
        const mainThreadAudit = report.audits?.['mainthread-work-breakdown']
        const mainThreadBreakdown = (mainThreadAudit?.details?.items || []).slice(0, 10).map(item => ({
            group: item.group || item.groupLabel,
            duration: item.duration,
            // Some items have URL info
            url: item.url
        }))

        // Extract bootup time (JS execution time by script)
        const bootupAudit = report.audits?.['bootup-time']
        const bootupBreakdown = (bootupAudit?.details?.items || []).slice(0, 10).map(item => ({
            url: item.url,
            total: item.total,
            scripting: item.scripting,
            scriptParseCompile: item.scriptParseCompile
        }))

        // Extract third-party summary
        const thirdPartyAudit = report.audits?.['third-party-summary']
        const thirdPartyResources = (thirdPartyAudit?.details?.items || []).slice(0, 10).map(item => ({
            entity: item.entity?.text || item.entity,
            mainThreadTime: item.mainThreadTime,
            blockingTime: item.blockingTime,
            transferSize: item.transferSize,
            subItems: item.subItems?.items?.slice(0, 3).map(sub => ({
                url: sub.url,
                blockingTime: sub.blockingTime,
                transferSize: sub.transferSize
            }))
        }))

        // Extract long tasks
        const longTasksAudit = report.audits?.['long-tasks']
        const longTasks = (longTasksAudit?.details?.items || []).slice(0, 5).map(item => ({
            url: item.url,
            duration: item.duration,
            startTime: item.startTime
        }))

        // Category-specific data extraction
        const categoryData = {
            performance: {
                score: report.categories?.performance?.score,
                lcp: cwv?.lcp?.value,
                lcpDisplay: cwv?.lcp?.displayValue,
                lcpStatus: cwv?.lcp?.rating,
                lcpElement,
                lcpElementSnippet: lcpElement?.snippet, // For backward compat
                cls: cwv?.cls?.displayValue || cwv?.cls?.value,
                clsStatus: cwv?.cls?.rating,
                clsElements,
                tbt: cwv?.tbt?.value,
                tbtDisplay: cwv?.tbt?.displayValue,
                inp: cwv?.inp?.value,
                fcp: cwv?.fcp?.value,
                fcpDisplay: cwv?.fcp?.displayValue,
                si: cwv?.si?.value,
                siDisplay: cwv?.si?.displayValue,
                tti: cwv?.tti?.value,
                ttiDisplay: cwv?.tti?.displayValue,
                metrics: {
                    lcp: {value: cwv?.lcp?.value, display: cwv?.lcp?.displayValue, rating: cwv?.lcp?.rating},
                    cls: {value: cwv?.cls?.value, display: cwv?.cls?.displayValue, rating: cwv?.cls?.rating},
                    tbt: {value: cwv?.tbt?.value, display: cwv?.tbt?.displayValue, rating: cwv?.tbt?.rating},
                    fcp: {value: cwv?.fcp?.value, display: cwv?.fcp?.displayValue, rating: cwv?.fcp?.rating},
                    si: {value: cwv?.si?.value, display: cwv?.si?.displayValue, rating: cwv?.si?.rating}
                },
                opportunities: opportunitiesWithDetails,
                diagnostics: diagnostics.slice(0, 10),
                totalSize: report.audits?.['total-byte-weight']?.numericValue,
                totalSizeDisplay: report.audits?.['total-byte-weight']?.displayValue,
                requests: report.audits?.['network-requests']?.details?.items?.length || 0,
                mainThreadWork: report.audits?.['mainthread-work-breakdown']?.displayValue,
                mainThreadBreakdown,
                bootupTime: report.audits?.['bootup-time']?.displayValue,
                bootupBreakdown,
                // Detailed resource breakdowns
                renderBlocking: renderBlockingAudit?.details?.items?.length || 0,
                renderBlockingResources,
                renderBlockingSavings: renderBlockingAudit?.details?.overallSavingsMs,
                unusedCss: unusedCssAudit?.details?.overallSavingsBytes,
                unusedCssResources,
                unusedJs: unusedJsAudit?.details?.overallSavingsBytes,
                unusedJsResources,
                thirdParty: thirdPartyAudit?.details?.items?.length || 0,
                thirdPartyResources,
                longTasks,
                // Network info
                serverResponseTime: report.audits?.['server-response-time']?.numericValue,
                serverResponseTimeDisplay: report.audits?.['server-response-time']?.displayValue
            },

            seo: {
                score: report.categories?.seo?.score,
                title: report.audits?.['document-title']?.details?.items?.[0]?.title,
                description: report.audits?.['meta-description']?.details?.items?.[0]?.content,
                crawlable: report.audits?.['is-crawlable']?.score === 1,
                canonical: report.audits?.['canonical']?.details?.items?.[0]?.href,
                robots: report.audits?.['robots-txt']?.score === 1,
                headings: extractHeadings(report)
            },

            accessibility: {
                score: report.categories?.accessibility?.score,
                violations: failedAudits.filter(a => a.score < 0.5),
                ariaIssues: failedAudits.filter(a => a.id?.includes('aria')),
                colorContrast: failedAudits.filter(a => a.id?.includes('contrast'))
            },

            'best-practices': {
                score: report.categories?.['best-practices']?.score,
                https: report.audits?.['is-on-https']?.score === 1,
                csp: report.audits?.['csp-xss']?.score === 1,
                vulnerabilities: extractVulnerabilities(report),
                deprecations: report.audits?.['deprecations']?.details?.items?.map(i => i.value) || []
            },

            pwa: {
                score: report.categories?.pwa?.score,
                installable: report.audits?.['installable-manifest']?.score === 1,
                manifest: report.audits?.['installable-manifest']?.score === 1,
                serviceWorker: report.audits?.['service-worker']?.score === 1,
                offline: report.audits?.['works-offline']?.score === 1
            }
        }

        return {
            ...baseData,
            ...(categoryData[category] || {})
        }
    }

    /**
     * Extract headings structure from report
     */
    function extractHeadings(report) {
        const headingAudit = report.audits?.['heading-order']
        if (!headingAudit?.details?.items) return []

        return headingAudit.details.items.map(item => `${item.headingLevel}: ${item.text}`)
    }

    /**
     * Extract vulnerabilities from report
     */
    function extractVulnerabilities(report) {
        const vulnAudit = report.audits?.['no-vulnerable-libraries']
        if (!vulnAudit?.details?.items) return []

        return vulnAudit.details.items.map(item => ({
            name: item.detectedLib?.text,
            severity: item.vulnCount > 3 ? 'high' : item.vulnCount > 1 ? 'medium' : 'low',
            title: `${item.detectedLib?.text} - ${item.vulnCount} vulnerabilite(s)`
        }))
    }

    /**
     * Generate a prompt from a template and report data
     * @param {object} report - Lighthouse report
     * @param {string} category - Category ID (performance, seo, etc.)
     * @param {string} templateId - Template ID (quickAnalysis, deepDive, etc.)
     * @returns {Promise<string>} Generated prompt
     */
    async function generatePrompt(report, category, templateId = 'quickAnalysis') {
        error.value = null

        try {
            // Get template metadata from registry
            const categoryTemplates = templateRegistry[category]
            if (!categoryTemplates) {
                throw new Error(`No templates found for category: ${category}`)
            }

            const templateMeta = categoryTemplates[templateId]
            if (!templateMeta) {
                throw new Error(`Template '${templateId}' not found in category '${category}'`)
            }

            // Load the .j2 template file
            const templateContent = await loadTemplateFile(templateMeta.file)

            // Extract data from report
            const data = extractTemplateData(report, category)

            // Compile template with data
            const prompt = engine.compile(templateContent, data)

            // Update state
            currentTemplate.value = templateMeta
            currentCategory.value = category
            generatedPrompt.value = prompt

            return prompt
        } catch (err) {
            error.value = err.message
            console.error('Failed to generate prompt:', err)
            return null
        }
    }

    /**
     * Get metadata for a category
     * @param {string} category - Category ID
     * @returns {object} Category metadata
     */
    function getCategoryMeta(category) {
        return categoryMeta[category] || null
    }

    /**
     * Get all available categories
     * @returns {array} Array of category metadata
     */
    function getAllCategories() {
        return Object.values(categoryMeta)
    }

    /**
     * Register a custom filter for the template engine
     * @param {string} name - Filter name
     * @param {Function} fn - Filter function
     */
    function registerFilter(name, fn) {
        engine.registerFilter(name, fn)
    }

    /**
     * Build the default prompt (quick analysis for category)
     * @param {object} report - Lighthouse report
     * @param {string} category - Category ID
     * @returns {Promise<string>} Generated prompt
     */
    async function buildDefaultPrompt(report, category) {
        return generatePrompt(report, category, 'quickAnalysis')
    }

    return {
        // State
        currentTemplate,
        currentCategory,
        currentStrategy,
        generatedPrompt,
        error,

        // Methods
        getAvailableTemplates,
        extractTemplateData,
        generatePrompt,
        buildDefaultPrompt,
        getCategoryMeta,
        getAllCategories,
        registerFilter,

        // Engine access for advanced usage
        engine
    }
}

export default usePromptEngine
