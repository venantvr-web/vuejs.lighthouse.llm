/**
 * Registry of all J2 templates
 * Maps template IDs to file paths and metadata
 */

export const templateRegistry = {
    performance: {
        quickAnalysis: {
            id: 'quickAnalysis',
            name: 'Analyse Rapide Performance',
            description: 'Vue d\'ensemble avec Core Web Vitals',
            strategy: 'quick',
            file: 'performance-quick.j2',
            tags: ['performance', 'cwv', 'quick', 'overview']
        },
        deepDive: {
            id: 'deepDive',
            name: 'Analyse Approfondie Performance',
            description: 'Analyse detaillee avec solutions de code',
            strategy: 'deep',
            file: 'performance-deep.j2',
            tags: ['performance', 'deep', 'optimization', 'code']
        },
        coreWebVitals: {
            id: 'coreWebVitals',
            name: 'Analyse Core Web Vitals',
            description: 'Focus sur LCP, CLS, INP/TBT',
            strategy: 'specific',
            file: 'performance-cwv.j2',
            tags: ['performance', 'cwv', 'google', 'vitals']
        },
        budgetAnalysis: {
            id: 'budgetAnalysis',
            name: 'Analyse Budget Performance',
            description: 'Optimisation des ressources et budgets',
            strategy: 'specific',
            file: 'performance-budget.j2',
            tags: ['performance', 'budget', 'resources', 'optimization']
        }
    },

    seo: {
        quickAnalysis: {
            id: 'quickAnalysis',
            name: 'Analyse Rapide SEO',
            description: 'Verifications SEO fondamentales',
            strategy: 'quick',
            file: 'seo-quick.j2',
            tags: ['seo', 'quick', 'meta', 'basics']
        },
        technicalSEO: {
            id: 'technicalSEO',
            name: 'Analyse SEO Technique Avancee',
            description: 'Audit technique complet',
            strategy: 'deep',
            file: 'seo-technical.j2',
            tags: ['seo', 'technical', 'advanced', 'audit']
        }
    },

    accessibility: {
        quickAnalysis: {
            id: 'quickAnalysis',
            name: 'Analyse Rapide Accessibilité',
            description: 'Violations WCAG principales',
            strategy: 'quick',
            file: 'accessibility-quick.j2',
            tags: ['accessibility', 'a11y', 'wcag', 'quick']
        },
        wcagCompliance: {
            id: 'wcagCompliance',
            name: 'Audit Conformite WCAG 2.1 AA',
            description: 'Audit complet WCAG 2.1 niveau AA',
            strategy: 'deep',
            file: 'accessibility-wcag.j2',
            tags: ['accessibility', 'wcag', 'compliance', 'audit']
        }
    },

    'best-practices': {
        quickAnalysis: {
            id: 'quickAnalysis',
            name: 'Analyse Rapide Bonnes Pratiques',
            description: 'Verifications essentielles securite et standards',
            strategy: 'quick',
            file: 'best-practices-quick.j2',
            tags: ['best-practices', 'security', 'standards', 'quick']
        }
    },

    pwa: {
        quickAnalysis: {
            id: 'quickAnalysis',
            name: 'Analyse Rapide PWA',
            description: 'Conformite PWA et installabilite',
            strategy: 'quick',
            file: 'pwa-quick.j2',
            tags: ['pwa', 'quick', 'installable', 'offline']
        }
    },

    comparison: {
        evolution: {
            id: 'evolution',
            name: 'Analyse Evolution',
            description: 'Comparaison temporelle entre deux analyses',
            strategy: 'specific',
            file: 'comparison-evolution.j2',
            tags: ['comparison', 'evolution', 'tracking', 'trends']
        },
        budget: {
            id: 'budget',
            name: 'Conformite Budget',
            description: 'Verification du respect des budgets performance',
            strategy: 'specific',
            file: 'comparison-budget.j2',
            tags: ['comparison', 'budget', 'compliance', 'monitoring']
        },
        competitor: {
            id: 'competitor',
            name: 'Benchmarking Concurrentiel',
            description: 'Analyse comparative vs concurrents',
            strategy: 'specific',
            file: 'comparison-competitor.j2',
            tags: ['comparison', 'competitor', 'benchmark', 'analysis']
        }
    }
}

export const categoryMeta = {
    performance: {
        id: 'performance',
        name: 'Performance',
        icon: '⚡',
        role: 'Expert Senior WPO Vue.js/Vite',
        description: 'Optimisation Core Web Vitals, LCP, CLS, TBT'
    },
    seo: {
        id: 'seo',
        name: 'SEO',
        icon: '🔍',
        role: 'Consultant SEO Technique',
        description: 'Référencement, Meta tags, Schema.org'
    },
    accessibility: {
        id: 'accessibility',
        name: 'Accessibilité',
        icon: '♿',
        role: 'Expert WCAG/RGAA',
        description: 'WCAG 2.1 AA, ARIA, lecteurs d\'écran'
    },
    'best-practices': {
        id: 'best-practices',
        name: 'Bonnes Pratiques',
        icon: '🛡️',
        role: 'Expert Securite Web',
        description: 'Securite, CSP, OWASP, Standards'
    },
    pwa: {
        id: 'pwa',
        name: 'PWA',
        icon: '📱',
        role: 'Expert Progressive Web Apps',
        description: 'Service Workers, Offline, Installation'
    },
    comparison: {
        id: 'comparison',
        name: 'Comparaison',
        icon: '📊',
        role: 'Expert Analyse Comparative',
        description: 'Evolution, Budgets, Benchmarking concurrentiel'
    }
}

export default templateRegistry
