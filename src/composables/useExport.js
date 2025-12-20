import {ref} from 'vue'

/**
 * Composable for exporting and copying analysis data
 */
export function useExport() {
    const error = ref(null)
    const success = ref(false)

    /**
     * Copy content to clipboard using Clipboard API
     * @param {string} content - Content to copy
     * @returns {Promise<boolean>} True if successful
     */
    async function copyToClipboard(content) {
        error.value = null
        success.value = false

        if (!content) {
            error.value = 'No content to copy'
            return false
        }

        try {
            // Try modern Clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(content)
                success.value = true
                return true
            }

            // Fallback for older browsers
            const textarea = document.createElement('textarea')
            textarea.value = content
            textarea.style.position = 'fixed'
            textarea.style.left = '-999999px'
            textarea.style.top = '-999999px'
            document.body.appendChild(textarea)
            textarea.focus()
            textarea.select()

            const successful = document.execCommand('copy')
            document.body.removeChild(textarea)

            if (successful) {
                success.value = true
                return true
            } else {
                throw new Error('Copy command failed')
            }
        } catch (err) {
            error.value = err.message || 'Failed to copy to clipboard'
            console.error('Copy to clipboard failed:', err)
            return false
        }
    }

    /**
     * Format data for export
     * @param {object} data - Data to format
     * @returns {string} Formatted string
     */
    function formatForExport(data) {
        if (!data) return ''

        // If it's already a string, return it
        if (typeof data === 'string') {
            return data.trim()
        }

        // If it's an object, try to format it nicely
        if (typeof data === 'object') {
            // If it has a specific format method, use it
            if (data.markdown) {
                return data.markdown
            }

            // Otherwise, create a readable format
            let output = ''

            if (data.url) {
                output += `URL: ${data.url}\n\n`
            }

            if (data.timestamp) {
                output += `Date: ${new Date(data.timestamp).toLocaleString()}\n\n`
            }

            if (data.analysis) {
                output += `${data.analysis}\n\n`
            }

            if (data.scores) {
                output += 'Scores:\n'
                Object.entries(data.scores).forEach(([key, value]) => {
                    const percentage = Math.round(value * 100)
                    output += `- ${key}: ${percentage}%\n`
                })
                output += '\n'
            }

            if (data.coreWebVitals) {
                output += 'Core Web Vitals:\n'
                Object.entries(data.coreWebVitals).forEach(([key, metric]) => {
                    if (metric && metric.displayValue) {
                        output += `- ${key.toUpperCase()}: ${metric.displayValue} (${metric.rating})\n`
                    }
                })
                output += '\n'
            }

            return output.trim()
        }

        return String(data)
    }

    /**
     * Export analysis to Markdown file
     * @param {object} analysis - Analysis data to export
     * @param {string} filename - Optional filename (without extension)
     * @returns {boolean} True if successful
     */
    function exportToMarkdown(analysis, filename = null) {
        error.value = null
        success.value = false

        try {
            if (!analysis) {
                throw new Error('No analysis data to export')
            }

            // Generate markdown content
            let markdown = '# Lighthouse Analysis Report\n\n'

            // Add metadata
            if (analysis.url) {
                markdown += `**URL:** ${analysis.url}\n\n`
            }

            if (analysis.timestamp) {
                const date = new Date(analysis.timestamp).toLocaleString()
                markdown += `**Date:** ${date}\n\n`
            }

            // Add scores
            if (analysis.scores) {
                markdown += '## Scores\n\n'
                Object.entries(analysis.scores).forEach(([category, score]) => {
                    const percentage = Math.round(score * 100)
                    const emoji = score >= 0.9 ? '✅' : score >= 0.5 ? '⚠️' : '❌'
                    markdown += `- ${emoji} **${category}**: ${percentage}%\n`
                })
                markdown += '\n'
            }

            // Add Core Web Vitals
            if (analysis.coreWebVitals) {
                markdown += '## Core Web Vitals\n\n'
                markdown += '| Metric | Value | Rating |\n'
                markdown += '|--------|-------|--------|\n'

                Object.entries(analysis.coreWebVitals).forEach(([key, metric]) => {
                    if (metric && metric.displayValue) {
                        const ratingEmoji = metric.rating === 'good' ? '✅' :
                            metric.rating === 'needs-improvement' ? '⚠️' : '❌'
                        markdown += `| ${key.toUpperCase()} | ${metric.displayValue} | ${ratingEmoji} ${metric.rating} |\n`
                    }
                })
                markdown += '\n'
            }

            // Add analysis text
            if (analysis.analysis) {
                markdown += '## Analysis\n\n'
                markdown += analysis.analysis + '\n\n'
            }

            // Add opportunities
            if (analysis.opportunities && analysis.opportunities.length > 0) {
                markdown += '## Opportunities\n\n'
                analysis.opportunities.slice(0, 10).forEach((opp, index) => {
                    markdown += `${index + 1}. **${opp.title}**\n`
                    if (opp.displayValue) {
                        markdown += `   - Potential savings: ${opp.displayValue}\n`
                    }
                    if (opp.description) {
                        markdown += `   - ${opp.description}\n`
                    }
                    markdown += '\n'
                })
            }

            // Add failed audits
            if (analysis.failedAudits && analysis.failedAudits.length > 0) {
                markdown += '## Failed Audits\n\n'
                analysis.failedAudits.slice(0, 10).forEach((audit, index) => {
                    const percentage = Math.round((audit.score || 0) * 100)
                    markdown += `${index + 1}. **${audit.title}** (Score: ${percentage}%)\n`
                    if (audit.description) {
                        markdown += `   - ${audit.description}\n`
                    }
                    markdown += '\n'
                })
            }

            // Add footer
            markdown += '---\n\n'
            markdown += `*Generated by Lighthouse Analyzer on ${new Date().toLocaleString()}*\n`

            // Create blob and download
            const blob = new Blob([markdown], {type: 'text/markdown'})
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')

            // Generate filename
            const timestamp = new Date().toISOString().split('T')[0]
            const urlSlug = analysis.url
                ? new URL(analysis.url).hostname.replace(/[^a-z0-9]/gi, '-')
                : 'report'
            const defaultFilename = `lighthouse-${urlSlug}-${timestamp}.md`

            link.href = url
            link.download = filename ? `${filename}.md` : defaultFilename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 100)

            success.value = true
            return true
        } catch (err) {
            error.value = err.message || 'Failed to export markdown'
            console.error('Export to markdown failed:', err)
            return false
        }
    }

    /**
     * Download content as a file
     * @param {string} content - Content to download
     * @param {string} filename - Filename with extension
     * @param {string} mimeType - MIME type
     * @returns {boolean} True if successful
     */
    function downloadFile(content, filename, mimeType = 'text/plain') {
        error.value = null
        success.value = false

        try {
            const blob = new Blob([content], {type: mimeType})
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')

            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            setTimeout(() => URL.revokeObjectURL(url), 100)

            success.value = true
            return true
        } catch (err) {
            error.value = err.message || 'Failed to download file'
            console.error('Download file failed:', err)
            return false
        }
    }

    /**
     * Reset state
     */
    function reset() {
        error.value = null
        success.value = false
    }

    return {
        error,
        success,
        copyToClipboard,
        exportToMarkdown,
        formatForExport,
        downloadFile,
        reset
    }
}
