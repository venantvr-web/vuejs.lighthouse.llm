/**
 * Performance (WPO) Expert Prompts
 * Focus: Web Performance Optimization with Vue.js/Vite
 */

export const performancePrompts = {
    quickAnalysis: {
        name: 'Analyse Rapide Performance',
        description: 'Vue d\'ensemble avec Core Web Vitals',
        category: 'performance',
        strategy: 'quick',
        variables: ['url', 'score', 'lcp', 'cls', 'tbt', 'inp', 'fcp', 'si', 'tti'],
        tags: ['performance', 'cwv', 'quick', 'overview'],
        template: `# Analyse Performance - {{url}}

## Rôle
Tu es un Expert Senior en Web Performance Optimization (WPO), spécialisé dans Vue.js 3 et Vite.

## Score Global
Performance: {{formatScore:score}}

## Core Web Vitals

### Largest Contentful Paint (LCP)
**Valeur:** {{formatMetric:lcp}}
**Cible:** < 2.5s

### Cumulative Layout Shift (CLS)
**Valeur:** {{cls}}
**Cible:** < 0.1

### Total Blocking Time (TBT)
**Valeur:** {{formatMetric:tbt}}
**Cible:** < 200ms

{{#if inp}}
### Interaction to Next Paint (INP)
**Valeur:** {{formatMetric:inp}}
**Cible:** < 200ms
{{/if}}

## Autres Métriques

- **First Contentful Paint (FCP):** {{formatMetric:fcp}} (cible < 1.8s)
- **Speed Index (SI):** {{formatMetric:si}} (cible < 3.4s)
- **Time to Interactive (TTI):** {{formatMetric:tti}} (cible < 3.8s)

## Demande

Analyse ces métriques et fournis:

1. **Diagnostic:** Identifie les 3 problèmes prioritaires impactant les Core Web Vitals
2. **Solutions Concrètes:** Pour chaque problème, fournis:
   - Code Vue.js 3 (Composition API) optimisé
   - Configuration Vite spécifique
   - Techniques de lazy-loading et code-splitting
3. **Quick Wins:** 3 optimisations rapides à implémenter immédiatement

Réponds en Markdown avec des exemples de code concrets.`
    },

    deepDive: {
        name: 'Analyse Approfondie Performance',
        description: 'Analyse détaillée avec solutions de code',
        category: 'performance',
        strategy: 'deep',
        variables: ['url', 'score', 'opportunities', 'diagnostics', 'metrics'],
        tags: ['performance', 'deep', 'optimization', 'code'],
        template: `# Analyse Approfondie Performance - {{url}}

## Rôle
Tu es un Expert Senior en Web Performance Optimization (WPO), spécialisé dans Vue.js 3, Vite, et les optimisations avancées.

## Score Performance
{{formatScore:score}}

## Opportunités d'Optimisation

{{#if opportunities}}
{{#each opportunities}}
- **{{this.title}}**
  - Impact: {{formatMetric:this.numericValue}} économisés
  - Score: {{formatScore:this.score}}
{{/each}}
{{/if}}

## Diagnostics

{{#if diagnostics}}
{{#each diagnostics}}
- {{this.title}}: {{this.displayValue}}
{{/each}}
{{/if}}

## Métriques Détaillées

{{#if metrics}}
- LCP: {{formatMetric:metrics.lcp}}
- FCP: {{formatMetric:metrics.fcp}}
- TBT: {{formatMetric:metrics.tbt}}
- CLS: {{metrics.cls}}
- Speed Index: {{formatMetric:metrics.si}}
{{/if}}

## Demande

En tant qu'expert WPO Vue.js/Vite, analyse en profondeur:

### 1. Analyse des Opportunités
Pour chaque opportunité majeure:
- Explication technique du problème
- Impact précis sur les Core Web Vitals
- Priorité d'implémentation (P0/P1/P2)

### 2. Solutions de Code
Fournis des exemples concrets:

**a) Optimisations Vue.js 3:**
\`\`\`vue
// Composant optimisé avec lazy-loading
// Code Composition API
\`\`\`

**b) Configuration Vite:**
\`\`\`javascript
// vite.config.js optimisé
// Code-splitting, compression, etc.
\`\`\`

**c) Techniques Avancées:**
- Resource hints (preload, prefetch, preconnect)
- Dynamic imports stratégiques
- Optimisation des images (formats modernes)

### 3. Plan d'Action
Roadmap priorisée avec:
- Quick wins (< 1h d'implémentation)
- Optimisations moyennes (1-3h)
- Optimisations avancées (> 3h)

### 4. Validation
Méthodes de test et KPIs pour valider les améliorations.

Réponds en Markdown avec des blocs de code détaillés et commentés.`
    },

    coreWebVitals: {
        name: 'Analyse Core Web Vitals',
        description: 'Focus sur LCP, CLS, INP/TBT',
        category: 'performance',
        strategy: 'specific',
        variables: ['url', 'lcp', 'cls', 'tbt', 'inp', 'lcpElement', 'clsElements'],
        tags: ['performance', 'cwv', 'google', 'vitals'],
        template: `# Analyse Core Web Vitals - {{url}}

## Rôle
Tu es un Expert Google Core Web Vitals, spécialisé dans l'optimisation LCP, CLS et INP pour Vue.js 3.

## Métriques Core Web Vitals

### 1. Largest Contentful Paint (LCP)
**Valeur actuelle:** {{formatMetric:lcp}}
**Statut:** {{#if lcpGood}}✅ Bon{{/if}}{{#if lcpMedium}}⚠️ À améliorer{{/if}}{{#if lcpPoor}}❌ Faible{{/if}}
**Cible Google:** < 2.5s

{{#if lcpElement}}
**Élément LCP:** {{lcpElement}}
{{/if}}

### 2. Cumulative Layout Shift (CLS)
**Valeur actuelle:** {{cls}}
**Statut:** {{#if clsGood}}✅ Bon{{/if}}{{#if clsMedium}}⚠️ À améliorer{{/if}}{{#if clsPoor}}❌ Faible{{/if}}
**Cible Google:** < 0.1

{{#if clsElements}}
**Éléments causant le shift:**
{{listItems:clsElements}}
{{/if}}

### 3. Interaction to Next Paint (INP) / Total Blocking Time (TBT)
**INP:** {{formatMetric:inp}}
**TBT:** {{formatMetric:tbt}}
**Cible INP:** < 200ms
**Cible TBT:** < 200ms

## Demande

Analyse approfondie de chaque Core Web Vital:

### Pour LCP (Largest Contentful Paint)
1. **Causes identifiées:**
   - Temps de réponse serveur
   - Ressources bloquant le rendu
   - Temps de chargement des ressources
   - Rendu côté client

2. **Solutions Vue.js/Vite:**
\`\`\`vue
// Optimisations pour réduire le LCP
\`\`\`

### Pour CLS (Cumulative Layout Shift)
1. **Causes identifiées:**
   - Images sans dimensions
   - Fonts chargées dynamiquement
   - Injections DOM asynchrones

2. **Solutions concrètes:**
\`\`\`vue
// Réservation d'espace et stabilité visuelle
\`\`\`

### Pour INP/TBT
1. **Causes identifiées:**
   - JavaScript bloquant
   - Tâches longues
   - Hydratation lourde

2. **Solutions d'optimisation:**
\`\`\`javascript
// Code-splitting et lazy-loading optimisés
\`\`\`

### Plan d'Action CWV
Roadmap priorisée pour passer tous les CWV en "Bon" (vert).

Fournis des exemples de code concrets et directement implémentables.`
    },

    budgetAnalysis: {
        name: 'Analyse Budget Performance',
        description: 'Analyse des budgets JS/CSS/Images',
        category: 'performance',
        strategy: 'specific',
        variables: ['url', 'totalSize', 'jsSize', 'cssSize', 'imageSize', 'requests'],
        tags: ['performance', 'budget', 'size', 'resources'],
        template: `# Analyse Budget Performance - {{url}}

## Rôle
Tu es un Expert en Performance Budgets et optimisation des ressources pour applications Vue.js.

## Tailles des Ressources

- **Total:** {{formatSize:totalSize}}
- **JavaScript:** {{formatSize:jsSize}}
- **CSS:** {{formatSize:cssSize}}
- **Images:** {{formatSize:imageSize}}
- **Nombre de requêtes:** {{requests}}

## Budgets Recommandés

| Type | Actuel | Budget Idéal | Statut |
|------|--------|-------------|--------|
| JS | {{formatSize:jsSize}} | < 200KB | {{#if jsBudgetOk}}✅{{/if}}{{#if jsBudgetWarning}}⚠️{{/if}}{{#if jsBudgetDanger}}❌{{/if}} |
| CSS | {{formatSize:cssSize}} | < 50KB | {{#if cssBudgetOk}}✅{{/if}}{{#if cssBudgetWarning}}⚠️{{/if}}{{#if cssBudgetDanger}}❌{{/if}} |
| Images | {{formatSize:imageSize}} | < 500KB | {{#if imageBudgetOk}}✅{{/if}}{{#if imageBudgetWarning}}⚠️{{/if}}{{#if imageBudgetDanger}}❌{{/if}} |

## Demande

Analyse les budgets et fournis:

### 1. Audit des Dépassements
Identifie les ressources problématiques et leur impact.

### 2. Stratégies de Réduction

**JavaScript:**
\`\`\`javascript
// vite.config.js - Code splitting optimisé
// Tree-shaking et élimination du code mort
\`\`\`

**CSS:**
\`\`\`javascript
// PurgeCSS et Critical CSS
\`\`\`

**Images:**
\`\`\`vue
// Formats modernes (WebP, AVIF)
// Lazy-loading et responsive images
\`\`\`

### 3. Configuration Budget CI/CD
\`\`\`javascript
// Lighthouse CI budget.json
\`\`\`

Fournis des solutions pour respecter les budgets recommandés.`
    }
};

export default performancePrompts;
