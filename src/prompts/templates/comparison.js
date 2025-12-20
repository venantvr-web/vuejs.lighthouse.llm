/**
 * Comparison & Evolution Analysis Prompts
 * Focus: Compare reports, track improvements, identify regressions
 */

export const comparisonPrompts = {
  evolutionAnalysis: {
    name: 'Analyse d\'Évolution',
    description: 'Comparaison de deux rapports Lighthouse',
    category: 'comparison',
    strategy: 'deep',
    variables: [
      'url',
      'beforeDate',
      'afterDate',
      'beforeScores',
      'afterScores',
      'improvements',
      'regressions',
      'metrics'
    ],
    tags: ['comparison', 'evolution', 'diff', 'history'],
    template: `# Analyse d'Évolution - {{url}}

## Rôle
Tu es un Expert en Analyse de Performance Web, spécialisé dans le suivi d'évolution et l'analyse comparative.

## Période Analysée

**Avant:** {{beforeDate}}
**Après:** {{afterDate}}

## Évolution des Scores

### Performance
- Avant: {{formatScore:beforeScores.performance}}
- Après: {{formatScore:afterScores.performance}}
- **Évolution:** {{#if performanceImproved}}✅ +{{performanceDiff}}%{{/if}}{{#if performanceRegressed}}❌ {{performanceDiff}}%{{/if}}{{#if performanceStable}}→ Stable{{/if}}

### Accessibilité
- Avant: {{formatScore:beforeScores.accessibility}}
- Après: {{formatScore:afterScores.accessibility}}
- **Évolution:** {{#if accessibilityImproved}}✅ +{{accessibilityDiff}}%{{/if}}{{#if accessibilityRegressed}}❌ {{accessibilityDiff}}%{{/if}}{{#if accessibilityStable}}→ Stable{{/if}}

### Bonnes Pratiques
- Avant: {{formatScore:beforeScores.bestPractices}}
- Après: {{formatScore:afterScores.bestPractices}}
- **Évolution:** {{#if bestPracticesImproved}}✅ +{{bestPracticesDiff}}%{{/if}}{{#if bestPracticesRegressed}}❌ {{bestPracticesDiff}}%{{/if}}{{#if bestPracticesStable}}→ Stable{{/if}}

### SEO
- Avant: {{formatScore:beforeScores.seo}}
- Après: {{formatScore:afterScores.seo}}
- **Évolution:** {{#if seoImproved}}✅ +{{seoDiff}}%{{/if}}{{#if seoRegressed}}❌ {{seoDiff}}%{{/if}}{{#if seoStable}}→ Stable{{/if}}

### PWA
- Avant: {{formatScore:beforeScores.pwa}}
- Après: {{formatScore:afterScores.pwa}}
- **Évolution:** {{#if pwaImproved}}✅ +{{pwaDiff}}%{{/if}}{{#if pwaRegressed}}❌ {{pwaDiff}}%{{/if}}{{#if pwaStable}}→ Stable{{/if}}

## Améliorations Détectées

{{#if improvements}}
{{prioritize:improvements}}
{{/if}}
{{#if improvements}}{{/if}}{{#if noImprovements}}
Aucune amélioration significative détectée.
{{/if}}

## Régressions Détectées

{{#if regressions}}
⚠️ **Attention - Régressions à corriger:**
{{prioritize:regressions}}
{{/if}}
{{#if regressions}}{{/if}}{{#if noRegressions}}
✅ Aucune régression détectée.
{{/if}}

## Métriques Détaillées

{{#if metrics}}
| Métrique | Avant | Après | Évolution |
|----------|-------|-------|-----------|
| LCP | {{formatMetric:metrics.before.lcp}} | {{formatMetric:metrics.after.lcp}} | {{metrics.lcp.diff}} |
| FCP | {{formatMetric:metrics.before.fcp}} | {{formatMetric:metrics.after.fcp}} | {{metrics.fcp.diff}} |
| TBT | {{formatMetric:metrics.before.tbt}} | {{formatMetric:metrics.after.tbt}} | {{metrics.tbt.diff}} |
| CLS | {{metrics.before.cls}} | {{metrics.after.cls}} | {{metrics.cls.diff}} |
| SI | {{formatMetric:metrics.before.si}} | {{formatMetric:metrics.after.si}} | {{metrics.si.diff}} |
{{/if}}

## Demande

Analyse comparative approfondie:

### 1. Synthèse de l'Évolution

Analyse l'évolution globale:
- Points forts: Quelles sont les principales améliorations?
- Points faibles: Quelles sont les régressions critiques?
- Tendance générale: Le site s'améliore-t-il globalement?

### 2. Analyse des Améliorations

Pour chaque amélioration significative:
- Quelle optimisation a probablement causé cette amélioration?
- Impact utilisateur concret
- Recommandation pour maintenir/amplifier cette amélioration

**Exemple d'analyse:**
\`\`\`
Amélioration: LCP réduit de 4.2s à 2.1s (-50%)

Causes probables:
- Optimisation des images (format WebP, lazy-loading)
- Amélioration du code splitting
- Utilisation d'un CDN

Impact utilisateur:
- Contenu principal visible 2x plus rapidement
- Amélioration de l'expérience utilisateur
- Meilleur ranking Google (Core Web Vitals)

Recommandations:
- Maintenir l'optimisation images
- Monitorer régulièrement le LCP
- Continuer à optimiser les ressources critiques
\`\`\`

### 3. Analyse des Régressions

{{#if regressions}}
Pour chaque régression:
- Identifier la cause probable
- Estimer l'impact utilisateur
- Proposer une solution de correction

**Plan de correction:**
\`\`\`vue
// Code pour corriger les régressions identifiées
\`\`\`
{{/if}}

### 4. Recommandations Priorisées

**Quick Wins (< 1h):**
1. [Action rapide à fort impact]
2. [Correction simple]
3. [Ajustement mineur]

**Optimisations Moyennes (1-3h):**
1. [Amélioration substantielle]
2. [Refactoring ciblé]

**Optimisations Avancées (> 3h):**
1. [Changement architectural]
2. [Optimisation complexe]

### 5. Suivi et Monitoring

**KPIs à suivre:**
- Core Web Vitals (LCP, CLS, INP)
- Scores Lighthouse
- Métriques business (taux de conversion, engagement)

**Outils de monitoring:**
\`\`\`javascript
// Configuration monitoring continu
// Google Analytics 4 + Web Vitals
import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals'

const sendToAnalytics = ({ name, value, id }) => {
  gtag('event', name, {
    event_category: 'Web Vitals',
    event_label: id,
    value: Math.round(name === 'CLS' ? value * 1000 : value),
    non_interaction: true
  })
}

onCLS(sendToAnalytics)
onFCP(sendToAnalytics)
onLCP(sendToAnalytics)
onTTFB(sendToAnalytics)
onINP(sendToAnalytics)
\`\`\`

**Alertes automatiques:**
\`\`\`yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI

on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://example.com
          uploadArtifacts: true
          temporaryPublicStorage: true
          runs: 3
          # Alerter si régression
          budgetPath: ./budget.json
\`\`\`

### 6. Rapport Exécutif

Résumé pour management (non-technique):
- Score global: Évolution de X% à Y%
- Impact business: [Estimation impact conversion/engagement]
- Investissement: [Temps/ressources nécessaires pour améliorations]
- ROI: [Retour attendu des optimisations]

Fournis une analyse comparative complète avec recommandations actionnables.`
  },

  budgetCompliance: {
    name: 'Conformité aux Budgets',
    description: 'Vérification respect des budgets définis',
    category: 'comparison',
    strategy: 'specific',
    variables: ['url', 'budgets', 'actual', 'violations'],
    tags: ['comparison', 'budget', 'compliance', 'monitoring'],
    template: `# Conformité aux Budgets Performance - {{url}}

## Rôle
Tu es un Expert en Performance Budgets et monitoring continu des performances web.

## Budgets vs Réalité

{{#if budgets}}
### Métriques

| Métrique | Budget | Actuel | Statut | Écart |
|----------|--------|--------|--------|-------|
| Performance Score | {{budgets.performance}}% | {{actual.performance}}% | {{#if performanceBudgetOk}}✅{{/if}}{{#if performanceBudgetWarning}}⚠️{{/if}}{{#if performanceBudgetDanger}}❌{{/if}} | {{performanceEcart}}% |
| LCP | {{formatMetric:budgets.lcp}} | {{formatMetric:actual.lcp}} | {{#if lcpBudgetOk}}✅{{/if}}{{#if lcpBudgetWarning}}⚠️{{/if}}{{#if lcpBudgetDanger}}❌{{/if}} | {{lcpEcart}} |
| TBT | {{formatMetric:budgets.tbt}} | {{formatMetric:actual.tbt}} | {{#if tbtBudgetOk}}✅{{/if}}{{#if tbtBudgetWarning}}⚠️{{/if}}{{#if tbtBudgetDanger}}❌{{/if}} | {{tbtEcart}} |
| CLS | {{budgets.cls}} | {{actual.cls}} | {{#if clsBudgetOk}}✅{{/if}}{{#if clsBudgetWarning}}⚠️{{/if}}{{#if clsBudgetDanger}}❌{{/if}} | {{clsEcart}} |

### Tailles de Ressources

| Type | Budget | Actuel | Statut | Écart |
|------|--------|--------|--------|-------|
| JavaScript | {{formatSize:budgets.js}} | {{formatSize:actual.js}} | {{#if jsBudgetOk}}✅{{/if}}{{#if jsBudgetWarning}}⚠️{{/if}}{{#if jsBudgetDanger}}❌{{/if}} | {{jsEcart}} |
| CSS | {{formatSize:budgets.css}} | {{formatSize:actual.css}} | {{#if cssBudgetOk}}✅{{/if}}{{#if cssBudgetWarning}}⚠️{{/if}}{{#if cssBudgetDanger}}❌{{/if}} | {{cssEcart}} |
| Images | {{formatSize:budgets.images}} | {{formatSize:actual.images}} | {{#if imagesBudgetOk}}✅{{/if}}{{#if imagesBudgetWarning}}⚠️{{/if}}{{#if imagesBudgetDanger}}❌{{/if}} | {{imagesEcart}} |
| Total | {{formatSize:budgets.total}} | {{formatSize:actual.total}} | {{#if totalBudgetOk}}✅{{/if}}{{#if totalBudgetWarning}}⚠️{{/if}}{{#if totalBudgetDanger}}❌{{/if}} | {{totalEcart}} |
{{/if}}

## Violations

{{#if violations}}
**Budgets dépassés:**
{{prioritize:violations}}
{{/if}}
{{#if violations}}{{/if}}{{#if noViolations}}
✅ Tous les budgets sont respectés!
{{/if}}

## Demande

Analyse de conformité aux budgets:

### 1. Configuration Budget Lighthouse CI

\`\`\`json
// budget.json
{
  "path": "/*",
  "timings": [
    {
      "metric": "interactive",
      "budget": 3800
    },
    {
      "metric": "first-contentful-paint",
      "budget": 1800
    },
    {
      "metric": "largest-contentful-paint",
      "budget": 2500
    },
    {
      "metric": "cumulative-layout-shift",
      "budget": 0.1
    },
    {
      "metric": "total-blocking-time",
      "budget": 200
    }
  ],
  "resourceSizes": [
    {
      "resourceType": "script",
      "budget": 200
    },
    {
      "resourceType": "stylesheet",
      "budget": 50
    },
    {
      "resourceType": "image",
      "budget": 500
    },
    {
      "resourceType": "total",
      "budget": 1000
    }
  ],
  "resourceCounts": [
    {
      "resourceType": "script",
      "budget": 10
    },
    {
      "resourceType": "stylesheet",
      "budget": 5
    },
    {
      "resourceType": "third-party",
      "budget": 5
    }
  ]
}
\`\`\`

### 2. Actions Correctives

{{#if violations}}
Pour chaque violation de budget, fournis:

**Plan de réduction:**
\`\`\`javascript
// Exemple: Réduction taille JavaScript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Séparer les gros vendors
            if (id.includes('lodash')) return 'lodash'
            if (id.includes('moment')) return 'moment'
            return 'vendor'
          }
        }
      }
    }
  }
}
\`\`\`

**Optimisations spécifiques:**
- Tree-shaking agressif
- Lazy-loading des composants lourds
- Compression Brotli/Gzip
- Minification avancée
{{/if}}

### 3. Monitoring Continu

**GitHub Actions:**
\`\`\`yaml
name: Performance Budget

on:
  pull_request:
  push:
    branches: [main]

jobs:
  budget-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build
        run: npm run build
      - name: Check budgets
        uses: treosh/lighthouse-ci-action@v9
        with:
          budgetPath: ./budget.json
          uploadArtifacts: true
      - name: Fail if budget exceeded
        if: failure()
        run: echo "Performance budget exceeded!" && exit 1
\`\`\`

**Bundle analyzer:**
\`\`\`javascript
// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer'

export default {
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ]
}
\`\`\`

### 4. Ajustement des Budgets

Si les budgets sont trop stricts ou trop laxistes:

**Budgets recommandés par type de site:**

**Site vitrine:**
- JS: < 150KB
- CSS: < 30KB
- Images: < 300KB
- LCP: < 2.0s

**Application SPA:**
- JS: < 250KB (initial bundle)
- CSS: < 50KB
- Images: < 500KB
- LCP: < 2.5s

**E-commerce:**
- JS: < 200KB
- CSS: < 40KB
- Images: < 400KB
- LCP: < 2.0s (critique pour conversion)

Propose des ajustements de budgets réalistes et ambitieux.`
  },

  competitorComparison: {
    name: 'Comparaison Concurrentielle',
    description: 'Benchmarking vs concurrents',
    category: 'comparison',
    strategy: 'specific',
    variables: ['url', 'competitors', 'scores', 'metrics', 'features'],
    tags: ['comparison', 'competitor', 'benchmark', 'analysis'],
    template: `# Benchmarking Concurrentiel - {{url}}

## Rôle
Tu es un Expert en Analyse Concurrentielle et Benchmarking Performance Web.

## Comparaison des Scores

{{#if competitors}}
| Site | Performance | Accessibilité | SEO | PWA | Bonnes Pratiques |
|------|-------------|---------------|-----|-----|------------------|
| **Votre site** | {{formatScore:scores.own.performance}} | {{formatScore:scores.own.accessibility}} | {{formatScore:scores.own.seo}} | {{formatScore:scores.own.pwa}} | {{formatScore:scores.own.bestPractices}} |
{{#each competitors}}
| {{this.name}} | {{formatScore:this.scores.performance}} | {{formatScore:this.scores.accessibility}} | {{formatScore:this.scores.seo}} | {{formatScore:this.scores.pwa}} | {{formatScore:this.scores.bestPractices}} |
{{/each}}
{{/if}}

## Métriques Détaillées

{{#if metrics}}
| Site | LCP | FCP | TBT | CLS | SI |
|------|-----|-----|-----|-----|-----|
| **Votre site** | {{formatMetric:metrics.own.lcp}} | {{formatMetric:metrics.own.fcp}} | {{formatMetric:metrics.own.tbt}} | {{metrics.own.cls}} | {{formatMetric:metrics.own.si}} |
{{#each competitors}}
| {{this.name}} | {{formatMetric:this.metrics.lcp}} | {{formatMetric:this.metrics.fcp}} | {{formatMetric:this.metrics.tbt}} | {{this.metrics.cls}} | {{formatMetric:this.metrics.si}} |
{{/each}}
{{/if}}

## Fonctionnalités Comparées

{{#if features}}
| Fonctionnalité | Votre site | {{#each competitors}}{{this.name}}{{#if last}}{{/if}}{{#if last}}{{/if}}{{#if @last}}{{/if}} | {{/each}}
|----------------|------------|{{#each competitors}}:---:|{{/each}}
{{#each features}}
| {{this.name}} | {{#if this.own}}✅{{/if}}{{#if this.own}}{{/if}}{{#if noOwn}}❌{{/if}} | {{#each this.competitors}}{{#if this.value}}✅{{/if}}{{#if this.value}}{{/if}}{{#if noValue}}❌{{/if}} | {{/each}}
{{/each}}
{{/if}}

## Demande

Analyse concurrentielle approfondie:

### 1. Position Relative

Classe les sites du meilleur au moins bon pour chaque catégorie:
- Performance
- Accessibilité
- SEO
- Expérience utilisateur

Identifie votre position dans chaque classement.

### 2. Analyse des Écarts

Pour chaque concurrent mieux classé:

**Points forts à étudier:**
- Quelles techniques utilisent-ils?
- Quelles optimisations peut-on reproduire?
- Quelle est leur stack technique?

**Exemple d'analyse:**
\`\`\`
Concurrent A: Performance 95% (vs notre 78%)

Avantages identifiés:
1. CDN global (Cloudflare) vs notre hébergement unique
   → Action: Migrer vers CDN
   → Impact estimé: +10% performance

2. Images au format AVIF vs notre JPEG
   → Action: Implémenter formats modernes
   → Impact estimé: +5% performance

3. Service Worker agressif vs notre cache basique
   → Action: Améliorer stratégie cache
   → Impact estimé: +7% performance
\`\`\`

### 3. Avantages Compétitifs

Identifie vos points forts:
- Domaines où vous surpassez la concurrence
- Fonctionnalités uniques
- Opportunités de différenciation

### 4. Roadmap Concurrentielle

Plan pour rattraper et dépasser les concurrents:

**Phase 1: Parité (0-3 mois)**
Objectif: Atteindre le niveau moyen des concurrents
- [Actions prioritaires]
- [Quick wins]

**Phase 2: Excellence (3-6 mois)**
Objectif: Dépasser les meilleurs concurrents
- [Optimisations avancées]
- [Innovations]

**Phase 3: Leadership (6-12 mois)**
Objectif: Devenir la référence du secteur
- [Fonctionnalités différenciantes]
- [Excellence technique]

### 5. Veille Concurrentielle

**Monitoring automatisé:**
\`\`\`javascript
// Script de surveillance concurrents
// scripts/competitor-monitor.js
import lighthouse from 'lighthouse'
import chromeLauncher from 'chrome-launcher'

const competitors = [
  'https://competitor-a.com',
  'https://competitor-b.com',
  'https://competitor-c.com'
]

const runLighthouse = async (url) => {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })
  const options = {
    logLevel: 'info',
    output: 'json',
    port: chrome.port
  }

  const runnerResult = await lighthouse(url, options)
  await chrome.kill()

  return {
    url,
    scores: runnerResult.lhr.categories,
    metrics: runnerResult.lhr.audits
  }
}

const compareAll = async () => {
  const results = await Promise.all(
    competitors.map(url => runLighthouse(url))
  )

  // Analyser et alerter si concurrent s'améliore
  console.log('Competitor analysis:', results)
}

// Lancer hebdomadairement
compareAll()
\`\`\`

**Dashboard de suivi:**
Utiliser Google Sheets/Data Studio pour tracker l'évolution vs concurrents.

Fournis une analyse concurrentielle stratégique avec plan d'action.`
  }
};

export default comparisonPrompts;
