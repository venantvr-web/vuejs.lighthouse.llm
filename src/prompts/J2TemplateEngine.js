/**
 * Jinja2-style Template Engine for Lighthouse prompts
 * Supports: {{ variable }}, {% if %}, {% for %}, {{ value | filter }}
 */
export class J2TemplateEngine {
    constructor() {
        this.filters = new Map()
        this.registerBuiltInFilters()
    }

    /**
     * Register a custom filter function
     * @param {string} name - Filter name
     * @param {Function} fn - Filter function
     */
    registerFilter(name, fn) {
        if (typeof fn !== 'function') {
            throw new Error(`Filter '${name}' must be a function`)
        }
        this.filters.set(name, fn)
    }

    /**
     * Register built-in Jinja2-style filters
     */
    registerBuiltInFilters() {
        // Format score as percentage with status
        this.registerFilter('score', (value) => {
            if (value == null) return 'N/A'
            const score = typeof value === 'number' && value <= 1 ? Math.round(value * 100) : value
            if (score >= 90) return `${score}% ✅ Bon`
            if (score >= 50) return `${score}% ⚠️ Moyen`
            return `${score}% ❌ Faible`
        })

        // Format metric value with unit
        this.registerFilter('metric', (value) => {
            if (value == null) return 'N/A'
            if (typeof value === 'string') return value
            if (value >= 1000) return `${(value / 1000).toFixed(2)}s`
            return `${value.toFixed(0)}ms`
        })

        // Format file size
        this.registerFilter('size', (bytes) => {
            if (bytes == null) return 'N/A'
            if (bytes < 1024) return `${bytes}B`
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
            return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
        })

        // List items with bullet points
        this.registerFilter('list', (items) => {
            if (!Array.isArray(items) || items.length === 0) return 'Aucun élément'
            return items.map(item => `- ${typeof item === 'object' ? item.title || item.name || JSON.stringify(item) : item}`).join('\n')
        })

        // Prioritize and number items
        this.registerFilter('prioritize', (items) => {
            if (!Array.isArray(items) || items.length === 0) return 'Aucun élément'
            return items
                .sort((a, b) => (a.score || 0) - (b.score || 0))
                .map((item, idx) => {
                    const severity = item.score < 0.5 ? '❌' : item.score < 0.9 ? '⚠️' : '✅'
                    return `${idx + 1}. ${severity} **${item.title || item.name}**`
                })
                .join('\n')
        })

        // JSON stringify
        this.registerFilter('json', (value) => {
            return JSON.stringify(value, null, 2)
        })

        // Uppercase
        this.registerFilter('upper', (value) => {
            return String(value).toUpperCase()
        })

        // Lowercase
        this.registerFilter('lower', (value) => {
            return String(value).toLowerCase()
        })

        // Default value
        this.registerFilter('default', (value, defaultVal = 'N/A') => {
            return value ?? defaultVal
        })

        // Length
        this.registerFilter('length', (value) => {
            if (Array.isArray(value)) return value.length
            if (typeof value === 'string') return value.length
            return 0
        })

        // First item
        this.registerFilter('first', (value) => {
            if (Array.isArray(value)) return value[0]
            return value
        })

        // Last item
        this.registerFilter('last', (value) => {
            if (Array.isArray(value)) return value[value.length - 1]
            return value
        })

        // Join array
        this.registerFilter('join', (value, separator = ', ') => {
            if (Array.isArray(value)) return value.join(separator)
            return value
        })

        // Truncate text
        this.registerFilter('truncate', (value, length = 100) => {
            if (typeof value !== 'string') return value
            if (value.length <= length) return value
            return value.substring(0, length) + '...'
        })

        // Round number
        this.registerFilter('round', (value, decimals = 0) => {
            if (typeof value !== 'number') return value
            return Number(value.toFixed(decimals))
        })

        // Format number with thousand separators
        this.registerFilter('number', (value, decimals = 0) => {
            if (value == null) return 'N/A'
            if (typeof value !== 'number') return value
            return value.toLocaleString('fr-FR', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            })
        })

        // Format as percentage
        this.registerFilter('percent', (value, decimals = 0) => {
            if (value == null) return 'N/A'
            if (typeof value !== 'number') return value
            return `${value.toFixed(decimals)}%`
        })

        // Alias for size filter
        this.registerFilter('filesize', (bytes) => {
            return this.filters.get('size')(bytes)
        })

        // Format date
        this.registerFilter('date', (timestamp, format = 'short') => {
            if (!timestamp) return 'N/A'
            const date = new Date(timestamp)
            if (format === 'short') {
                return date.toLocaleDateString('fr-FR')
            }
            if (format === 'long') {
                return date.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                })
            }
            return date.toLocaleString('fr-FR')
        })

        // Absolute value
        this.registerFilter('abs', (value) => {
            if (typeof value !== 'number') return value
            return Math.abs(value)
        })
    }

    /**
     * Compile and process a Jinja2-style template with data
     * @param {string} template - Template string
     * @param {Object} data - Data for interpolation
     * @returns {string} Processed template
     */
    compile(template, data = {}) {
        if (typeof template !== 'string') {
            throw new Error('Template must be a string')
        }

        let result = template
        let iterations = 0
        const maxIterations = 20 // Prevent infinite loops

        // Process iteratively until no more template tags remain
        while (iterations < maxIterations) {
            const before = result

            // Process loops first (they may contain conditionals)
            result = this.processLoops(result, data)

            // Process conditionals
            result = this.processConditionals(result, data)

            // Process filtered variables: {{ variable | filter }}
            result = this.processFilters(result, data)

            // Process simple variables: {{ variable }}
            result = this.processVariables(result, data)

            // If nothing changed, we're done
            if (result === before) break
            iterations++
        }

        // Sanitize output
        result = this.sanitizeOutput(result)

        return result.trim()
    }

    /**
     * Sanitize the output to clean up template artifacts and excessive whitespace
     * @param {string} output - Raw template output
     * @returns {string} Sanitized output
     */
    sanitizeOutput(output) {
        let result = output

        // Remove stray template tags that weren't processed
        result = result.replace(/\{%\s*endif\s*%\}/g, '')
        result = result.replace(/\{%\s*endfor\s*%\}/g, '')
        result = result.replace(/\{%\s*else\s*%\}/g, '')

        // Remove trailing whitespace on each line (spaces and tabs only, not newlines)
        result = result.replace(/[ \t]+$/gm, '')

        // Convert lines with only spaces/tabs to empty lines (not \s which includes \n)
        result = result.replace(/^[ \t]+$/gm, '')

        // Never more than 1 consecutive empty line (max 2 newlines)
        result = result.replace(/\n{3,}/g, '\n\n')

        return result
    }

    /**
     * Process if/elif/else conditional blocks (handles nesting)
     */
    processConditionals(template, data) {
        let result = template
        let safetyCounter = 0
        const maxIterations = 100

        // Process conditionals one at a time
        while (safetyCounter < maxIterations) {
            safetyCounter++

            // Find the first conditional block
            const condMatch = this.findFirstConditional(result)
            if (!condMatch) break

            const {startIdx, endIdx, condition, content} = condMatch

            // Split by elif and else
            const parts = this.splitConditionalParts(content)

            // Determine which part to use
            let replacement = ''

            // Check the main if condition
            if (this.evaluateCondition(condition, data)) {
                replacement = parts[0].content || ''
            } else {
                // Check elif conditions
                let found = false
                for (let i = 1; i < parts.length; i++) {
                    if (parts[i].type === 'elif' && this.evaluateCondition(parts[i].condition, data)) {
                        replacement = parts[i].content || ''
                        found = true
                        break
                    } else if (parts[i].type === 'else') {
                        replacement = parts[i].content || ''
                        found = true
                        break
                    }
                }
            }

            // Recursively process nested conditionals in the replacement
            replacement = this.processConditionals(replacement, data)

            // Replace this conditional block
            result = result.slice(0, startIdx) + replacement + result.slice(endIdx)
        }

        return result
    }

    /**
     * Find the first if conditional block
     */
    findFirstConditional(template) {
        const ifRegex = /\{%\s*if\s+(.+?)\s*%\}/
        const match = ifRegex.exec(template)

        if (!match) return null

        const startIdx = match.index
        const contentStartIdx = match.index + match[0].length
        const condition = match[1]

        // Find the matching endif
        const endInfo = this.findMatchingEndif(template, contentStartIdx)
        if (!endInfo) return null

        const content = template.slice(contentStartIdx, endInfo.contentEndIdx)

        return {
            startIdx,
            endIdx: endInfo.tagEndIdx,
            condition,
            content
        }
    }

    /**
     * Find the matching {% endif %} handling nesting
     */
    findMatchingEndif(template, contentStartIdx) {
        let depth = 1
        let i = contentStartIdx

        while (i < template.length && depth > 0) {
            const remaining = template.slice(i)

            const ifMatch = remaining.match(/^\{%\s*if\s+/)
            if (ifMatch) {
                depth++
                i += ifMatch[0].length
                continue
            }

            const endMatch = remaining.match(/^\{%\s*endif\s*%\}/)
            if (endMatch) {
                depth--
                if (depth === 0) {
                    return {
                        contentEndIdx: i,
                        tagEndIdx: i + endMatch[0].length
                    }
                }
                i += endMatch[0].length
                continue
            }

            i++
        }

        return null
    }

    /**
     * Split conditional content into parts (if/elif/else)
     */
    splitConditionalParts(content) {
        const parts = []
        let current = {type: 'if', content: '', condition: ''}
        let i = 0
        let depth = 0

        while (i < content.length) {
            const remaining = content.slice(i)

            // Track nesting depth
            const ifMatch = remaining.match(/^\{%\s*if\s+/)
            if (ifMatch) {
                depth++
                current.content += ifMatch[0]
                i += ifMatch[0].length
                continue
            }

            const endifMatch = remaining.match(/^\{%\s*endif\s*%\}/)
            if (endifMatch) {
                depth--
                current.content += endifMatch[0]
                i += endifMatch[0].length
                continue
            }

            // Only match elif/else at depth 0
            if (depth === 0) {
                const elifMatch = remaining.match(/^\{%\s*elif\s+(.+?)\s*%\}/)
                if (elifMatch) {
                    parts.push(current)
                    current = {type: 'elif', content: '', condition: elifMatch[1]}
                    i += elifMatch[0].length
                    continue
                }

                const elseMatch = remaining.match(/^\{%\s*else\s*%\}/)
                if (elseMatch) {
                    parts.push(current)
                    current = {type: 'else', content: '', condition: ''}
                    i += elseMatch[0].length
                    continue
                }
            }

            current.content += content[i]
            i++
        }

        parts.push(current)
        return parts
    }

    /**
     * Evaluate a condition expression
     */
    evaluateCondition(condition, data) {
        // Handle 'not' prefix
        if (condition.startsWith('not ')) {
            return !this.evaluateCondition(condition.slice(4), data)
        }

        // Handle 'and' / 'or'
        if (condition.includes(' and ')) {
            return condition.split(' and ').every(c => this.evaluateCondition(c.trim(), data))
        }
        if (condition.includes(' or ')) {
            return condition.split(' or ').some(c => this.evaluateCondition(c.trim(), data))
        }

        // Handle comparisons
        const comparisonMatch = condition.match(/(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)/)
        if (comparisonMatch) {
            const [, left, op, right] = comparisonMatch
            const leftVal = this.resolveValue(left.trim(), data)
            let rightVal = right.trim()

            // Parse right value
            if (rightVal === 'true') rightVal = true
            else if (rightVal === 'false') rightVal = false
            else if (rightVal === 'none' || rightVal === 'null') rightVal = null
            else if (/^['"].*['"]$/.test(rightVal)) rightVal = rightVal.slice(1, -1)
            else if (!isNaN(rightVal)) rightVal = Number(rightVal)
            else rightVal = this.resolveValue(rightVal, data)

            switch (op) {
                case '==':
                    return leftVal == rightVal
                case '!=':
                    return leftVal != rightVal
                case '>=':
                    return leftVal >= rightVal
                case '<=':
                    return leftVal <= rightVal
                case '>':
                    return leftVal > rightVal
                case '<':
                    return leftVal < rightVal
            }
        }

        // Simple truthiness check
        const value = this.resolveValue(condition.trim(), data)
        return this.isTruthy(value)
    }

    /**
     * Process for loops (handles nested loops via recursion with context)
     */
    processLoops(template, data) {
        let result = template
        let safetyCounter = 0
        const maxIterations = 50

        // Process loops one at a time, always from the beginning
        while (safetyCounter < maxIterations) {
            safetyCounter++

            // Find the first outermost loop
            const loopMatch = this.findFirstLoop(result)
            if (!loopMatch) break

            const {startIdx, endIdx, itemName, arrayPath, content} = loopMatch
            const array = this.resolveValue(arrayPath, data)

            let replacement = ''
            if (Array.isArray(array) && array.length > 0) {
                replacement = array.map((item, index) => {
                    const loopData = {
                        ...data,
                        [itemName]: item,
                        loop: {
                            index: index + 1,
                            index0: index,
                            first: index === 0,
                            last: index === array.length - 1,
                            length: array.length
                        }
                    }

                    // Recursively process nested loops with updated data context
                    let itemResult = this.processLoops(content, loopData)
                    // Then process conditionals, filters, variables
                    itemResult = this.processConditionals(itemResult, loopData)
                    itemResult = this.processFilters(itemResult, loopData)
                    itemResult = this.processVariables(itemResult, loopData)

                    return itemResult
                }).join('')
            }

            // Replace this loop block
            result = result.slice(0, startIdx) + replacement + result.slice(endIdx)
        }

        return result
    }

    /**
     * Find the first for loop in the template
     */
    findFirstLoop(template) {
        const forRegex = /\{%\s*for\s+(\w+)\s+in\s+([\w.]+)\s*%\}/
        const match = forRegex.exec(template)

        if (!match) return null

        const startIdx = match.index
        const contentStartIdx = match.index + match[0].length
        const itemName = match[1]
        const arrayPath = match[2]

        // Find the matching endfor
        const endInfo = this.findMatchingEndfor(template, contentStartIdx)
        if (!endInfo) return null

        const content = template.slice(contentStartIdx, endInfo.contentEndIdx)

        return {
            startIdx,
            endIdx: endInfo.tagEndIdx,
            itemName,
            arrayPath,
            content
        }
    }

    /**
     * Find the matching {% endfor %} for a loop starting at contentStartIdx
     */
    findMatchingEndfor(template, contentStartIdx) {
        let depth = 1
        let i = contentStartIdx

        while (i < template.length && depth > 0) {
            const remaining = template.slice(i)

            const forMatch = remaining.match(/^\{%\s*for\s+/)
            if (forMatch) {
                depth++
                i += forMatch[0].length
                continue
            }

            const endMatch = remaining.match(/^\{%\s*endfor\s*%\}/)
            if (endMatch) {
                depth--
                if (depth === 0) {
                    return {
                        contentEndIdx: i,
                        tagEndIdx: i + endMatch[0].length
                    }
                }
                i += endMatch[0].length
                continue
            }

            i++
        }

        return null
    }

    /**
     * Process filtered variables: {{ value | filter1 | filter2 }}
     */
    processFilters(template, data) {
        // Match {{ variable | filter }} but handle nested parentheses and pipes carefully
        const filterRegex = /\{\{\s*([^}|]+?)\s*\|((?:[^}]|\}(?!\}))+)\}\}/g

        return template.replace(filterRegex, (match, variable, filterChain) => {
            let value = this.resolveValue(variable.trim(), data)

            // Split filter chain by | but not inside parentheses
            const filters = this.splitFilters(filterChain)

            for (const filterExpr of filters) {
                const parsed = this.parseFilterExpression(filterExpr.trim())
                if (!parsed) continue

                const filter = this.filters.get(parsed.name)

                if (filter) {
                    try {
                        value = filter(value, ...parsed.args)
                    } catch (error) {
                        console.error(`Error applying filter '${parsed.name}':`, error)
                    }
                } else {
                    console.warn(`Filter '${parsed.name}' not found`)
                }
            }

            return value != null ? String(value) : ''
        })
    }

    /**
     * Split filter chain by | but respect parentheses
     */
    splitFilters(chain) {
        const filters = []
        let current = ''
        let parenDepth = 0

        for (const char of chain) {
            if (char === '(') parenDepth++
            else if (char === ')') parenDepth--
            else if (char === '|' && parenDepth === 0) {
                if (current.trim()) filters.push(current.trim())
                current = ''
                continue
            }
            current += char
        }

        if (current.trim()) filters.push(current.trim())
        return filters
    }

    /**
     * Parse a filter expression like "truncate(100)" or "default('N/A')"
     */
    parseFilterExpression(expr) {
        // Match filter name and optional arguments
        const match = expr.match(/^(\w+)(?:\((.+)\))?$/)
        if (!match) return null

        const name = match[1]
        const argsStr = match[2]

        if (!argsStr) {
            return {name, args: []}
        }

        // Parse arguments
        const args = []
        let current = ''
        let inString = false
        let stringChar = ''

        for (let i = 0; i < argsStr.length; i++) {
            const char = argsStr[i]

            if ((char === '"' || char === "'") && !inString) {
                inString = true
                stringChar = char
            } else if (char === stringChar && inString) {
                inString = false
                stringChar = ''
            } else if (char === ',' && !inString) {
                args.push(this.parseArgValue(current.trim()))
                current = ''
                continue
            }

            current += char
        }

        if (current.trim()) {
            args.push(this.parseArgValue(current.trim()))
        }

        return {name, args}
    }

    /**
     * Parse a single argument value
     */
    parseArgValue(val) {
        // String literal
        if (/^['"].*['"]$/.test(val)) return val.slice(1, -1)
        // Number
        if (!isNaN(val) && val !== '') return Number(val)
        // Boolean/null
        if (val === 'true') return true
        if (val === 'false') return false
        if (val === 'null' || val === 'none') return null
        // Return as-is
        return val
    }

    /**
     * Process simple variable interpolation: {{ variable }}
     */
    processVariables(template, data) {
        const variableRegex = /\{\{\s*([^}|]+?)\s*\}\}/g

        return template.replace(variableRegex, (match, variable) => {
            const value = this.resolveValue(variable.trim(), data)
            return value != null ? String(value) : ''
        })
    }

    /**
     * Resolve nested variable path (e.g., "metrics.lcp" or "item.title")
     */
    resolveValue(path, data) {
        if (!path) return undefined

        const parts = path.split('.')
        let value = data

        for (const part of parts) {
            if (value == null) return undefined
            value = value[part]
        }

        return value
    }

    /**
     * Check if value is truthy (Jinja2 style)
     */
    isTruthy(value) {
        if (value == null) return false
        if (Array.isArray(value)) return value.length > 0
        if (typeof value === 'object') return Object.keys(value).length > 0
        if (typeof value === 'string') return value.length > 0
        return Boolean(value)
    }
}

export default J2TemplateEngine
