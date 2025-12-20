/**
 * SEO Expert Prompts
 * Focus: Technical SEO, Meta tags, Schema.org, Indexation
 */

export const seoPrompts = {
    quickAnalysis: {
        name: 'Analyse Rapide SEO',
        description: 'Vérifications SEO fondamentales',
        category: 'seo',
        strategy: 'quick',
        variables: ['url', 'score', 'title', 'description', 'metaTags', 'headings', 'crawlable'],
        tags: ['seo', 'quick', 'meta', 'basics'],
        template: `# Analyse SEO - {{url}}

## Rôle
Tu es un Consultant SEO Technique spécialisé dans l'optimisation des applications Vue.js et Single Page Applications.

## Score SEO
{{formatScore:score}}

## Éléments Meta

### Title
{{#if title}}
✅ **Présent:** {{title}}
- Longueur: {{title.length}} caractères (optimal: 50-60)
{{/if}}
{{#if title}}{{/if}}{{#if noTitle}}
❌ **Absent:** Aucune balise title détectée
{{/if}}

### Meta Description
{{#if description}}
✅ **Présente:** {{description}}
- Longueur: {{description.length}} caractères (optimal: 150-160)
{{/if}}
{{#if noDescription}}
❌ **Absente:** Aucune meta description
{{/if}}

### Autres Meta Tags
{{#if metaTags}}
{{listItems:metaTags}}
{{/if}}

## Structure de Contenu

{{#if headings}}
### Hiérarchie des Titres
{{listItems:headings}}
{{/if}}

## Indexabilité

**Crawlable:** {{#if crawlable}}✅ Oui{{/if}}{{#if crawlable}}{{/if}}{{#if notCrawlable}}❌ Non{{/if}}

## Demande

En tant que consultant SEO technique, analyse:

### 1. Optimisation des Meta Tags
Fournis des recommandations concrètes:

\`\`\`html
<!-- Meta tags optimisés pour Vue.js -->
<head>
  <!-- Title, description, Open Graph, Twitter Cards -->
</head>
\`\`\`

### 2. Structure Sémantique
- Hiérarchie H1-H6 optimale
- Balises sémantiques HTML5
- Micro-données structurées

### 3. Problèmes SPA
Solutions pour les problèmes SEO spécifiques aux SPA Vue.js:
- Rendu côté serveur (SSR/Nuxt)
- Pre-rendering
- Hydratation SEO-friendly

### 4. Quick Wins SEO
3 améliorations rapides et à fort impact.

Fournis des exemples de code directement intégrables dans Vue.js 3.`
    },

    technicalSEO: {
        name: 'Analyse SEO Technique Avancée',
        description: 'Audit technique complet',
        category: 'seo',
        strategy: 'deep',
        variables: ['url', 'score', 'canonical', 'robots', 'sitemap', 'hreflang', 'structured'],
        tags: ['seo', 'technical', 'advanced', 'audit'],
        template: `# Audit SEO Technique Avancé - {{url}}

## Rôle
Tu es un Expert SEO Technique avec une spécialisation dans les applications JavaScript modernes (Vue.js, SPA).

## Score SEO Technique
{{formatScore:score}}

## Éléments Techniques

### 1. Canonical URL
{{#if canonical}}
✅ **Présent:** \`{{canonical}}\`
{{/if}}
{{#if noCanonical}}
⚠️ **Absent:** Risque de contenu dupliqué
{{/if}}

### 2. Robots.txt
{{#if robots}}
✅ **Présent et accessible**
{{/if}}
{{#if noRobots}}
❌ **Non détecté**
{{/if}}

### 3. Sitemap XML
{{#if sitemap}}
✅ **Présent:** {{sitemap}}
{{/if}}
{{#if noSitemap}}
❌ **Non détecté**
{{/if}}

### 4. Hreflang
{{#if hreflang}}
✅ **Implémenté** pour internationalisation
{{/if}}
{{#if noHreflang}}
⚠️ **Absent** (si site multilingue, à implémenter)
{{/if}}

### 5. Données Structurées (Schema.org)
{{#if structured}}
✅ **Présentes**
{{listItems:structured}}
{{/if}}
{{#if noStructured}}
⚠️ **Absentes:** Impact sur rich snippets Google
{{/if}}

## Demande

Audit technique complet avec solutions:

### 1. Configuration Robots & Sitemap

**robots.txt optimisé:**
\`\`\`txt
User-agent: *
Allow: /
Sitemap: https://{{url}}/sitemap.xml
\`\`\`

**Génération sitemap dynamique Vue.js:**
\`\`\`javascript
// Script de génération sitemap.xml
\`\`\`

### 2. Implémentation Schema.org

**Types de schémas recommandés:**
\`\`\`html
<!-- JSON-LD pour Organization, WebSite, BreadcrumbList -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  // ...
}
</script>
\`\`\`

**Intégration Vue.js:**
\`\`\`vue
<script setup>
// Composable pour injecter Schema.org
</script>
\`\`\`

### 3. Gestion Canonical et Alternate

\`\`\`vue
<!-- Composant SEO Head -->
<template>
  <Head>
    <link rel="canonical" :href="canonicalUrl" />
  </Head>
</template>
\`\`\`

### 4. SEO pour SPA

**Solutions SSR/SSG:**
- Configuration Nuxt 3 pour SSR
- Pre-rendering avec vite-plugin-ssr
- Dynamic rendering pour crawlers

**Code exemple:**
\`\`\`javascript
// nuxt.config.ts ou vite.config.js
\`\`\`

### 5. Monitoring SEO

- Outils de validation (Google Search Console)
- Tests de rendu pour crawlers
- Alertes sur problèmes d'indexation

Fournis des solutions techniques complètes et directement implémentables.`
    },

    contentSEO: {
        name: 'Analyse SEO du Contenu',
        description: 'Optimisation du contenu et des mots-clés',
        category: 'seo',
        strategy: 'specific',
        variables: ['url', 'title', 'description', 'headings', 'textContent', 'images', 'links'],
        tags: ['seo', 'content', 'keywords', 'optimization'],
        template: `# Analyse SEO du Contenu - {{url}}

## Rôle
Tu es un Expert en Rédaction et Optimisation SEO, spécialisé dans le contenu web et le référencement naturel.

## Analyse du Contenu

### Balise Title
{{#if title}}
**Contenu:** {{title}}
**Longueur:** {{title.length}} caractères
{{/if}}

### Meta Description
{{#if description}}
**Contenu:** {{description}}
**Longueur:** {{description.length}} caractères
{{/if}}

### Structure des Titres
{{#if headings}}
{{listItems:headings}}
{{/if}}

### Contenu Textuel
{{#if textContent}}
**Volume:** ~{{textContent}} mots
{{/if}}

### Images
{{#if images}}
**Nombre:** {{images}}
{{/if}}

### Liens
{{#if links}}
**Internes:** {{links.internal}}
**Externes:** {{links.external}}
{{/if}}

## Demande

Analyse le contenu SEO et fournis:

### 1. Optimisation Title & Description

**Recommandations:**
- Intégration des mots-clés principaux
- Formulation incitative (CTR)
- Respect des longueurs optimales

**Exemples optimisés:**
\`\`\`html
<title><!-- Titre optimisé --></title>
<meta name="description" content="<!-- Description optimisée -->" />
\`\`\`

### 2. Structure de Contenu SEO

**Hiérarchie recommandée:**
- 1 seul H1 (correspond au title)
- H2 pour sections principales
- H3-H6 pour sous-sections

**Exemple de structure:**
\`\`\`vue
<template>
  <article>
    <h1><!-- Titre principal --></h1>
    <section>
      <h2><!-- Section --></h2>
      <p><!-- Contenu optimisé --></p>
    </section>
  </article>
</template>
\`\`\`

### 3. Optimisation des Images

\`\`\`vue
<!-- Alt text descriptifs et pertinents -->
<img
  src="image.webp"
  alt="Description SEO-friendly"
  loading="lazy"
  width="800"
  height="600"
/>
\`\`\`

### 4. Stratégie de Liens

**Maillage interne:**
- Liens contextuels vers pages importantes
- Anchor text descriptifs
- Structure en silo

**Liens externes:**
- Ressources autoritaires
- Attribut rel="nofollow" si nécessaire

### 5. Rich Snippets

Types de rich snippets recommandés pour améliorer la visibilité SERP.

Fournis des recommandations actionnables pour améliorer le référencement du contenu.`
    },

    mobileSEO: {
        name: 'Analyse SEO Mobile',
        description: 'Optimisation Mobile-First',
        category: 'seo',
        strategy: 'specific',
        variables: ['url', 'score', 'viewport', 'mobileFriendly', 'tapTargets', 'fontSize'],
        tags: ['seo', 'mobile', 'responsive', 'mobile-first'],
        template: `# Audit SEO Mobile - {{url}}

## Rôle
Tu es un Expert SEO Mobile-First, spécialisé dans l'optimisation pour l'indexation mobile de Google.

## Score SEO Mobile
{{formatScore:score}}

## Éléments Mobile

### Viewport
{{#if viewport}}
✅ **Configuré:** \`{{viewport}}\`
{{/if}}
{{#if noViewport}}
❌ **Absent:** Essentiel pour le mobile
{{/if}}

### Mobile-Friendly
{{#if mobileFriendly}}
✅ **Compatible mobile**
{{/if}}
{{#if notMobileFriendly}}
❌ **Non optimisé mobile**
{{/if}}

### Tap Targets
{{#if tapTargets}}
⚠️ **Problèmes détectés:** Certains éléments tactiles sont trop proches
{{/if}}

### Taille de Police
{{#if fontSize}}
{{#if fontSizeOk}}
✅ **Lisible sur mobile**
{{/if}}
{{#if fontSizeTooSmall}}
⚠️ **Trop petite:** Difficulté de lecture mobile
{{/if}}
{{/if}}

## Demande

Optimise le site pour l'indexation mobile-first de Google:

### 1. Configuration Viewport

\`\`\`html
<!-- Meta viewport optimisé -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
\`\`\`

### 2. Design Responsive

\`\`\`vue
<style scoped>
/* Breakpoints mobile-first */
/* Touch-friendly tap targets (min 48x48px) */
</style>
\`\`\`

### 3. Performance Mobile

- Lazy-loading adaptatif
- Images responsive (srcset)
- Code splitting pour mobile

\`\`\`vue
<script setup>
// Détection mobile et chargement optimisé
</script>
\`\`\`

### 4. Tests Mobile SEO

- Google Mobile-Friendly Test
- Chrome DevTools mobile emulation
- Lighthouse mobile audit

Fournis des solutions pour un SEO mobile optimal compatible avec l'indexation mobile-first.`
    }
};

export default seoPrompts;
