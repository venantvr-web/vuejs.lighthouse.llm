/**
 * Template interpolation engine for Lighthouse prompts
 * Supports variables, helpers, conditionals, and loops
 */
export class PromptTemplateEngine {
    constructor() {
        this.helpers = new Map();
        this.registerBuiltInHelpers();
    }

    /**
     * Register a custom helper function
     * @param {string} name - Helper name
     * @param {Function} fn - Helper function
     */
    registerHelper(name, fn) {
        if (typeof fn !== 'function') {
            throw new Error(`Helper '${name}' must be a function`);
        }
        this.helpers.set(name, fn);
    }

    /**
     * Register built-in helper functions
     */
    registerBuiltInHelpers() {
        // Format score as percentage with color indicator
        this.registerHelper('formatScore', (value) => {
            if (value == null) return 'N/A';
            const score = Math.round(value * 100);
            if (score >= 90) return `${score}% (Bon)`;
            if (score >= 50) return `${score}% (Moyen)`;
            return `${score}% (Faible)`;
        });

        // List items with bullet points
        this.registerHelper('listItems', (items) => {
            if (!Array.isArray(items) || items.length === 0) return 'Aucun élément';
            return items.map(item => `- ${item}`).join('\n');
        });

        // Prioritize items by score/severity
        this.registerHelper('prioritize', (items) => {
            if (!Array.isArray(items) || items.length === 0) return 'Aucun élément';
            const sorted = [...items].sort((a, b) => {
                const severityOrder = {high: 0, medium: 1, low: 2};
                const aSeverity = severityOrder[a.severity] ?? 3;
                const bSeverity = severityOrder[b.severity] ?? 3;
                return aSeverity - bSeverity;
            });
            return sorted.map((item, idx) =>
                `${idx + 1}. [${item.severity?.toUpperCase() || 'INFO'}] ${item.title || item.name || item}`
            ).join('\n');
        });

        // Format metric value with unit
        this.registerHelper('formatMetric', (value, unit = 'ms') => {
            if (value == null) return 'N/A';
            if (unit === 'ms' && value >= 1000) {
                return `${(value / 1000).toFixed(2)}s`;
            }
            return `${typeof value === 'number' ? value.toFixed(2) : value}${unit}`;
        });

        // Format file size
        this.registerHelper('formatSize', (bytes) => {
            if (bytes == null) return 'N/A';
            if (bytes < 1024) return `${bytes}B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
            return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
        });
    }

    /**
     * Compile and process a template with data
     * @param {string} template - Template string
     * @param {Object} data - Data for interpolation
     * @returns {string} Processed template
     */
    compile(template, data = {}) {
        if (typeof template !== 'string') {
            throw new Error('Template must be a string');
        }

        let result = template;

        // Process conditionals: {{#if condition}}...{{/if}}
        result = this.processConditionals(result, data);

        // Process loops: {{#each items}}...{{/each}}
        result = this.processLoops(result, data);

        // Process helpers: {{helper:variable}}
        result = this.processHelpers(result, data);

        // Process simple variables: {{variable}}
        result = this.processVariables(result, data);

        return result.trim();
    }

    /**
     * Process conditional blocks
     */
    processConditionals(template, data) {
        const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
        return template.replace(conditionalRegex, (match, condition, content) => {
            const value = this.resolveValue(condition, data);
            return this.isTruthy(value) ? content : '';
        });
    }

    /**
     * Process loop blocks
     */
    processLoops(template, data) {
        const loopRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
        return template.replace(loopRegex, (match, arrayName, content) => {
            const array = this.resolveValue(arrayName, data);
            if (!Array.isArray(array) || array.length === 0) {
                return '';
            }
            return array.map((item, index) => {
                const itemData = {
                    ...data,
                    this: item,
                    index: index,
                    first: index === 0,
                    last: index === array.length - 1
                };
                return this.processVariables(content, itemData);
            }).join('\n');
        });
    }

    /**
     * Process helper functions
     */
    processHelpers(template, data) {
        const helperRegex = /\{\{(\w+):([^}]+)\}\}/g;
        return template.replace(helperRegex, (match, helperName, variable) => {
            const helper = this.helpers.get(helperName);
            if (!helper) {
                console.warn(`Helper '${helperName}' not found`);
                return match;
            }
            const value = this.resolveValue(variable.trim(), data);
            try {
                return helper(value);
            } catch (error) {
                console.error(`Error executing helper '${helperName}':`, error);
                return match;
            }
        });
    }

    /**
     * Process simple variable interpolation
     */
    processVariables(template, data) {
        const variableRegex = /\{\{([^#/][^}]*?)\}\}/g;
        return template.replace(variableRegex, (match, variable) => {
            // Skip if it's a helper (contains colon)
            if (variable.includes(':')) return match;

            const value = this.resolveValue(variable.trim(), data);
            return value != null ? String(value) : '';
        });
    }

    /**
     * Resolve nested variable path
     */
    resolveValue(path, data) {
        const parts = path.split('.');
        let value = data;
        for (const part of parts) {
            if (value == null) return undefined;
            value = value[part];
        }
        return value;
    }

    /**
     * Check if value is truthy
     */
    isTruthy(value) {
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
        return Boolean(value);
    }
}

export default PromptTemplateEngine;
