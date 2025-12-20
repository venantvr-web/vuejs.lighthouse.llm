# Prompt Template Engine & Registry

Système de templates et de gestion de prompts pour l'analyseur Lighthouse avec LLM.

## Architecture

```
src/prompts/
├── PromptTemplateEngine.js    # Moteur d'interpolation de templates
├── PromptRegistry.js           # Catalogue centralisé de prompts
├── templates/                  # Templates par catégorie
│   ├── performance.js         # Prompts WPO
│   ├── seo.js                 # Prompts SEO
│   ├── accessibility.js       # Prompts A11y
│   ├── bestPractices.js       # Prompts Sécurité
│   ├── pwa.js                 # Prompts PWA
│   ├── comparison.js          # Prompts Comparaison
│   └── index.js               # Export des templates
├── index.js                    # Export principal
└── README.md                   # Documentation
```

## PromptTemplateEngine

Moteur d'interpolation supportant:
- Variables simples: `{{variable}}`
- Helpers: `{{helper:variable}}`
- Conditionnels: `{{#if condition}}...{{/if}}`
- Boucles: `{{#each items}}...{{/each}}`

### Helpers Intégrés

- `formatScore(value)` - Formate un score en pourcentage avec indicateur
- `listItems(array)` - Liste à puces
- `prioritize(array)` - Tri par sévérité
- `formatMetric(value, unit)` - Formate métrique avec unité
- `formatSize(bytes)` - Formate taille de fichier

### Utilisation

```javascript
import { PromptTemplateEngine } from './prompts'

const engine = new PromptTemplateEngine()

// Enregistrer un helper custom
engine.registerHelper('capitalize', (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
})

// Compiler un template
const template = `
# Analyse - {{url}}
Score: {{formatScore:score}}

{{#if issues}}
Problèmes:
{{prioritize:issues}}
{{/if}}
`

const result = engine.compile(template, {
  url: 'example.com',
  score: 0.85,
  issues: [
    { title: 'Images non optimisées', severity: 'high' },
    { title: 'Cache manquant', severity: 'medium' }
  ]
})

console.log(result)
```

## PromptRegistry

Catalogue centralisé pour gérer les prompts.

### Configuration Prompt

```javascript
{
  name: 'Nom du prompt',
  description: 'Description',
  category: 'performance|seo|accessibility|best-practices|pwa|comparison',
  strategy: 'quick|deep|specific',
  template: 'Template string avec {{variables}}',
  variables: ['url', 'score', 'metrics'],
  tags: ['tag1', 'tag2']
}
```

### Utilisation

```javascript
import { PromptRegistry } from './prompts'

const registry = new PromptRegistry()

// Enregistrer un prompt
registry.register('performance.quickAnalysis', {
  name: 'Analyse Rapide Performance',
  description: 'Vue d\'ensemble des performances',
  category: 'performance',
  strategy: 'quick',
  template: '...',
  variables: ['url', 'score'],
  tags: ['performance', 'quick']
})

// Récupérer un prompt
const prompt = registry.get('performance.quickAnalysis')

// Rechercher
const results = registry.search('performance')

// Par catégorie
const perfPrompts = registry.getByCategory('performance')
```

## Templates Disponibles

### Performance (WPO)

**Rôle:** Expert Senior en Web Performance Optimization (WPO), spécialisé Vue.js 3/Vite

- `quickAnalysis` - Vue d'ensemble avec Core Web Vitals
- `deepDive` - Analyse approfondie avec solutions
- `coreWebVitals` - Focus LCP, CLS, INP
- `budgetAnalysis` - Analyse budgets JS/CSS/Images

**Variables:** url, score, lcp, cls, tbt, inp, fcp, si, tti, opportunities, diagnostics

### SEO

**Rôle:** Consultant SEO Technique spécialisé Vue.js/SPA

- `quickAnalysis` - Vérifications SEO fondamentales
- `technicalSEO` - Audit technique complet
- `contentSEO` - Optimisation contenu
- `mobileSEO` - SEO Mobile-First

**Variables:** url, score, title, description, canonical, robots, sitemap, structured

### Accessibilité

**Rôle:** Expert Accessibilité (RGAA/WCAG 2.1 AA)

- `quickAnalysis` - Violations WCAG principales
- `wcagCompliance` - Audit conformité WCAG 2.1 AA
- `screenReaderOptimization` - Optimisation lecteurs d'écran

**Variables:** url, score, violations, ariaIssues, colorContrast, perceivable, operable

### Bonnes Pratiques

**Rôle:** Expert Sécurité Web (OWASP)

- `quickAnalysis` - Vérifications sécurité/standards
- `securityAudit` - Audit sécurité approfondi
- `performanceSecurityBalance` - Équilibre performance/sécurité

**Variables:** url, score, https, csp, cors, headers, vulnerabilities

### PWA

**Rôle:** Expert Progressive Web Apps

- `quickAnalysis` - Conformité PWA
- `offlineStrategy` - Stratégie hors ligne avancée

**Variables:** url, score, manifest, serviceWorker, offline, installable

### Comparaison

**Rôle:** Expert Analyse Comparative

- `evolutionAnalysis` - Comparaison deux rapports
- `budgetCompliance` - Conformité budgets
- `competitorComparison` - Benchmarking concurrentiel

**Variables:** beforeDate, afterDate, beforeScores, afterScores, improvements, regressions

## Exemple Complet

```javascript
import {
  PromptTemplateEngine,
  PromptRegistry,
  performancePrompts
} from './prompts'

// Initialiser
const engine = new PromptTemplateEngine()
const registry = new PromptRegistry()

// Enregistrer les prompts performance
Object.entries(performancePrompts).forEach(([key, config]) => {
  registry.register(`performance.${key}`, config)
})

// Récupérer et compiler un prompt
const promptConfig = registry.get('performance.quickAnalysis')
const compiled = engine.compile(promptConfig.template, {
  url: 'https://example.com',
  score: 0.78,
  lcp: 4200,
  cls: 0.15,
  tbt: 350,
  inp: 180,
  fcp: 2100,
  si: 3800,
  tti: 4500
})

// Envoyer au LLM
console.log(compiled)
```

## Helper Customisé

```javascript
import { createTemplateEngine } from './prompts'

const engine = createTemplateEngine({
  // Helper personnalisé
  formatDate: (timestamp) => {
    return new Date(timestamp).toLocaleDateString('fr-FR')
  },

  percentChange: (before, after) => {
    const change = ((after - before) / before) * 100
    const sign = change > 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }
})

const template = `
Date: {{formatDate:timestamp}}
Évolution: {{percentChange:scoreBefore:scoreAfter}}
`

const result = engine.compile(template, {
  timestamp: Date.now(),
  scoreBefore: 75,
  scoreAfter: 82
})
```

## Registry Pré-Populé

```javascript
import { createPopulatedRegistry } from './prompts'

// Registry avec tous les prompts déjà enregistrés
const registry = createPopulatedRegistry()

// Utiliser directement
const prompt = registry.get('performance.deepDive')
const seoPrompts = registry.getByCategory('seo')
```

## Intégration avec LLM

```javascript
import { Anthropic } from '@anthropic-ai/sdk'
import {
  PromptTemplateEngine,
  PromptRegistry,
  performancePrompts
} from './prompts'

const anthropic = new Anthropic()
const engine = new PromptTemplateEngine()
const registry = new PromptRegistry()

// Enregistrer prompts
registry.register('performance.quickAnalysis',
  performancePrompts.quickAnalysis
)

async function analyzeLighthouse(lighthouseData) {
  // Récupérer le prompt
  const promptConfig = registry.get('performance.quickAnalysis')

  // Compiler avec les données Lighthouse
  const prompt = engine.compile(promptConfig.template, {
    url: lighthouseData.finalUrl,
    score: lighthouseData.categories.performance.score,
    lcp: lighthouseData.audits['largest-contentful-paint'].numericValue,
    cls: lighthouseData.audits['cumulative-layout-shift'].numericValue,
    tbt: lighthouseData.audits['total-blocking-time'].numericValue,
    fcp: lighthouseData.audits['first-contentful-paint'].numericValue,
    si: lighthouseData.audits['speed-index'].numericValue,
    tti: lighthouseData.audits['interactive'].numericValue
  })

  // Envoyer au LLM
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: prompt
    }]
  })

  return message.content[0].text
}
```

## Tests

```javascript
// Test du moteur de template
import { PromptTemplateEngine } from './prompts'

const engine = new PromptTemplateEngine()

// Test variables simples
console.assert(
  engine.compile('Hello {{name}}', { name: 'World' }) === 'Hello World'
)

// Test conditionnels
const template = '{{#if show}}Visible{{/if}}'
console.assert(
  engine.compile(template, { show: true }) === 'Visible'
)
console.assert(
  engine.compile(template, { show: false }) === ''
)

// Test helpers
console.assert(
  engine.compile('Score: {{formatScore:score}}', { score: 0.85 })
    .includes('85%')
)
```

## Bonnes Pratiques

1. **Toujours utiliser le Registry** pour gérer les prompts
2. **Enregistrer des helpers** pour la logique de formatage réutilisable
3. **Documenter les variables** requises dans la config
4. **Tester les templates** avant production
5. **Versionner les prompts** pour tracking des changements
6. **Utiliser des tags** pour faciliter la recherche
7. **Séparer la logique** (engine) de la configuration (templates)

## Extension

### Ajouter un Nouveau Template

1. Créer le fichier dans `templates/`
2. Définir les prompts avec la structure de config
3. Exporter depuis `templates/index.js`
4. Mettre à jour `createPopulatedRegistry()` dans `index.js`

```javascript
// templates/custom.js
export const customPrompts = {
  myAnalysis: {
    name: 'Mon Analyse',
    description: 'Description',
    category: 'custom',
    strategy: 'quick',
    template: 'Template avec {{variables}}',
    variables: ['url', 'data'],
    tags: ['custom']
  }
}

// templates/index.js
export { customPrompts } from './custom.js'

// index.js
import('./templates/custom.js').then(({ customPrompts }) => {
  Object.entries(customPrompts).forEach(([key, config]) => {
    registry.register(`custom.${key}`, config)
  })
})
```

## Licence

MIT
