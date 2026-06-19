/**
 * Centralized prompt catalog for Lighthouse analysis
 * Manages registration, retrieval, and search of prompts
 */
export class PromptRegistry {
    constructor() {
        this.prompts = new Map();
        this.categories = new Set();
    }

    /**
     * Register a prompt with configuration
     * @param {string} id - Unique prompt identifier
     * @param {Object} config - Prompt configuration
     * @param {string} config.name - Display name
     * @param {string} config.description - Prompt description
     * @param {string} config.category - Category (performance, seo, accessibility, etc.)
     * @param {string} config.strategy - Analysis strategy (quick, deep, specific)
     * @param {string} config.template - Template string
     * @param {Array<string>} config.variables - Required variables
     * @param {Array<string>} config.tags - Searchable tags
     */
    register(id, config) {
        if (!id || typeof id !== 'string') {
            throw new Error('Prompt ID must be a non-empty string');
        }

        if (this.prompts.has(id)) {
            throw new Error(`Prompt with ID '${id}' already registered`);
        }

        const requiredFields = ['name', 'description', 'category', 'strategy', 'template'];
        for (const field of requiredFields) {
            if (!config[field]) {
                throw new Error(`Missing required field '${field}' for prompt '${id}'`);
            }
        }

        const prompt = {
            id,
            name: config.name,
            description: config.description,
            category: config.category,
            strategy: config.strategy,
            template: config.template,
            variables: config.variables || [],
            tags: config.tags || [],
            createdAt: new Date().toISOString()
        };

        this.prompts.set(id, prompt);
        this.categories.add(config.category);

        return prompt;
    }

    /**
     * Retrieve a prompt by ID
     * @param {string} id - Prompt ID
     * @returns {Object|null} Prompt configuration or null
     */
    get(id) {
        return this.prompts.get(id) || null;
    }

    /**
     * Get all prompts in a category
     * @param {string} category - Category name
     * @returns {Array<Object>} Array of prompts
     */
    getByCategory(category) {
        return Array.from(this.prompts.values())
            .filter(prompt => prompt.category === category);
    }

    /**
     * Get all prompts with a specific strategy
     * @param {string} strategy - Strategy type
     * @returns {Array<Object>} Array of prompts
     */
    getByStrategy(strategy) {
        return Array.from(this.prompts.values())
            .filter(prompt => prompt.strategy === strategy);
    }

    /**
     * Search prompts by name, description, or tags
     * @param {string} query - Search query
     * @returns {Array<Object>} Matching prompts
     */
    search(query) {
        if (!query || typeof query !== 'string') {
            return [];
        }

        const lowerQuery = query.toLowerCase();
        return Array.from(this.prompts.values()).filter(prompt => {
            return (
                prompt.name.toLowerCase().includes(lowerQuery) ||
                prompt.description.toLowerCase().includes(lowerQuery) ||
                prompt.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
                prompt.category.toLowerCase().includes(lowerQuery)
            );
        });
    }

    /**
     * Get all registered categories
     * @returns {Array<string>} Category names
     */
    getCategories() {
        return Array.from(this.categories);
    }

    /**
     * Get all registered prompts
     * @returns {Array<Object>} All prompts
     */
    getAll() {
        return Array.from(this.prompts.values());
    }

    /**
     * Check if a prompt exists
     * @param {string} id - Prompt ID
     * @returns {boolean}
     */
    has(id) {
        return this.prompts.has(id);
    }

    /**
     * Remove a prompt
     * @param {string} id - Prompt ID
     * @returns {boolean} True if removed, false if not found
     */
    remove(id) {
        return this.prompts.delete(id);
    }

    /**
     * Clear all prompts
     */
    clear() {
        this.prompts.clear();
        this.categories.clear();
    }

    /**
     * Get statistics about registered prompts
     * @returns {Object} Stats
     */
    getStats() {
        const prompts = this.getAll();
        const categoryCounts = {};

        for (const prompt of prompts) {
            categoryCounts[prompt.category] = (categoryCounts[prompt.category] || 0) + 1;
        }

        return {
            total: prompts.length,
            categories: this.categories.size,
            byCategory: categoryCounts
        };
    }
}

export default PromptRegistry;
