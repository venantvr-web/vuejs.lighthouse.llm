/**
 * Best Practices & Security Expert Prompts
 * Focus: HTTPS, CSP, Security headers, Standards
 */

export const bestPracticesPrompts = {
    quickAnalysis: {
        name: 'Analyse Rapide Bonnes Pratiques',
        description: 'Vérifications sécurité et standards',
        category: 'best-practices',
        strategy: 'quick',
        variables: ['url', 'score', 'https', 'mixedContent', 'csp', 'deprecatedAPIs', 'vulnerabilities'],
        tags: ['security', 'best-practices', 'https', 'standards'],
        template: `# Analyse Bonnes Pratiques - {{url}}

## Rôle
Tu es un Expert Sécurité Web et Bonnes Pratiques, spécialisé dans les standards modernes et la sécurisation des applications JavaScript.

## Score Bonnes Pratiques
{{formatScore:score}}

## Analyse de Sécurité

### HTTPS
{{#if https}}
✅ **Actif:** Le site utilise HTTPS
{{/if}}
{{#if noHttps}}
❌ **Absent:** Le site n'utilise pas HTTPS - CRITIQUE
{{/if}}

### Contenu Mixte
{{#if mixedContent}}
⚠️ **Détecté:** {{mixedContent}} ressources HTTP sur page HTTPS
{{/if}}
{{#if noMixedContent}}
✅ **Aucun:** Pas de contenu mixte détecté
{{/if}}

### Content Security Policy (CSP)
{{#if csp}}
✅ **Présent:** CSP configuré
{{/if}}
{{#if noCsp}}
⚠️ **Absent:** Aucune politique CSP détectée
{{/if}}

### APIs Dépréciées
{{#if deprecatedAPIs}}
⚠️ **APIs obsolètes utilisées:**
{{listItems:deprecatedAPIs}}
{{/if}}

### Vulnérabilités
{{#if vulnerabilities}}
❌ **Vulnérabilités détectées:**
{{prioritize:vulnerabilities}}
{{/if}}

## Demande

En tant qu'expert sécurité web, analyse:

### 1. Configuration HTTPS et Sécurité Transport

**Headers de sécurité recommandés:**
\`\`\`nginx
# Configuration Nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
\`\`\`

**Configuration Vite pour production:**
\`\`\`javascript
// vite.config.js
export default {
  server: {
    https: true
  },
  build: {
    // Sécurisation du build
  }
}
\`\`\`

### 2. Content Security Policy (CSP)

**CSP strict pour Vue.js:**
\`\`\`html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'nonce-{{nonce}}';
  style-src 'self' 'nonce-{{nonce}}';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
\`\`\`

**Configuration serveur:**
\`\`\`javascript
// Express middleware
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; ..."
  );
  next();
});
\`\`\`

### 3. Correction des Vulnérabilités

**Protection XSS:**
\`\`\`vue
<script setup>
// Utiliser v-text au lieu de v-html quand possible
// Sanitizer le contenu HTML si nécessaire
import DOMPurify from 'dompurify'

const sanitizedHtml = computed(() => {
  return DOMPurify.sanitize(userContent.value)
})
</script>

<template>
  <!-- Éviter v-html avec contenu utilisateur -->
  <div v-text="userText"></div>

  <!-- Si v-html nécessaire, sanitizer -->
  <div v-html="sanitizedHtml"></div>
</template>
\`\`\`

**Protection CSRF:**
\`\`\`javascript
// Configuration axios avec CSRF token
import axios from 'axios'

axios.defaults.xsrfCookieName = 'XSRF-TOKEN'
axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN'
\`\`\`

### 4. Remplacement APIs Dépréciées

Fournis des alternatives modernes pour chaque API obsolète détectée.

### 5. Audit Dépendances

\`\`\`bash
# Audit npm
npm audit

# Fix automatique
npm audit fix

# Audit détaillé
npm audit --json
\`\`\`

### 6. Quick Wins Sécurité

3 améliorations rapides pour renforcer la sécurité:
1. Headers HTTP de sécurité
2. CSP basique
3. Mise à jour dépendances vulnérables

Fournis des solutions de sécurisation concrètes et applicables immédiatement.`
    },

    securityAudit: {
        name: 'Audit Sécurité Approfondi',
        description: 'Audit de sécurité complet',
        category: 'best-practices',
        strategy: 'deep',
        variables: ['url', 'score', 'headers', 'csp', 'cors', 'cookies', 'dependencies'],
        tags: ['security', 'audit', 'headers', 'vulnerabilities'],
        template: `# Audit Sécurité Approfondi - {{url}}

## Rôle
Tu es un Expert en Sécurité des Applications Web (OWASP), spécialisé dans la sécurisation des applications JavaScript modernes.

## Score Sécurité
{{formatScore:score}}

## Analyse des Headers de Sécurité

{{#if headers}}
### Headers Présents
{{listItems:headers.present}}

### Headers Manquants
{{listItems:headers.missing}}
{{/if}}

## Content Security Policy

{{#if csp}}
**Politique actuelle:**
\`\`\`
{{csp}}
\`\`\`
{{/if}}
{{#if noCsp}}
❌ **Aucune CSP configurée**
{{/if}}

## CORS Configuration

{{#if cors}}
{{listItems:cors}}
{{/if}}

## Cookies

{{#if cookies}}
**Analyse des cookies:**
{{listItems:cookies}}
{{/if}}

## Dépendances

{{#if dependencies}}
**Vulnérabilités dans les dépendances:**
{{prioritize:dependencies}}
{{/if}}

## Demande

Audit de sécurité complet selon OWASP Top 10:

### 1. Headers de Sécurité Complets

**Configuration Nginx complète:**
\`\`\`nginx
# HTTPS et HSTS
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Prévention clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# Prévention MIME sniffing
add_header X-Content-Type-Options "nosniff" always;

# XSS Protection (legacy browsers)
add_header X-XSS-Protection "1; mode=block" always;

# Referrer Policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Permissions Policy
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
\`\`\`

### 2. Content Security Policy Stricte

**CSP Production-Ready:**
\`\`\`javascript
// Meta tag ou header
const csp = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'nonce-{{nonce}}'"],
  'style-src': ["'self'", "'nonce-{{nonce}}'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'https://api.example.com'],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
}

// Génération header
const cspHeader = Object.entries(csp)
  .map(([key, values]) => \`\${key} \${values.join(' ')}\`)
  .join('; ')
\`\`\`

**Implémentation Vue.js avec nonces:**
\`\`\`javascript
// vite.config.js
import { defineConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'
import crypto from 'crypto'

export default defineConfig({
  plugins: [
    createHtmlPlugin({
      inject: {
        data: {
          nonce: crypto.randomBytes(16).toString('base64')
        }
      }
    })
  ]
})
\`\`\`

### 3. Configuration CORS Sécurisée

\`\`\`javascript
// Express
import cors from 'cors'

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24h
}))
\`\`\`

### 4. Cookies Sécurisés

\`\`\`javascript
// Configuration cookies sécurisés
const cookieOptions = {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  maxAge: 3600000, // 1 hour
  path: '/',
  domain: '.example.com'
}

// Express
res.cookie('session', token, cookieOptions)
\`\`\`

**Vue.js - Gestion tokens:**
\`\`\`javascript
// Utiliser HTTP-only cookies pour tokens sensibles
// Éviter localStorage pour JWT

// api.js
import axios from 'axios'

axios.defaults.withCredentials = true // Envoyer cookies
\`\`\`

### 5. Protection Injection et XSS

**Sanitization:**
\`\`\`vue
<script setup>
import DOMPurify from 'dompurify'

// Sanitizer configuration stricte
const sanitizeConfig = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
  ALLOWED_ATTR: ['href'],
  ALLOW_DATA_ATTR: false
}

const cleanHtml = (dirty) => {
  return DOMPurify.sanitize(dirty, sanitizeConfig)
}
</script>
\`\`\`

**Validation inputs:**
\`\`\`javascript
// Validation stricte côté client ET serveur
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().min(18).max(120)
})

// Validation
try {
  const validated = userSchema.parse(userData)
} catch (error) {
  // Handle validation errors
}
\`\`\`

### 6. Audit et Monitoring Dépendances

\`\`\`json
// package.json - scripts de sécurité
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "audit:check": "npm audit --audit-level=moderate"
  }
}
\`\`\`

**CI/CD Integration:**
\`\`\`yaml
# .github/workflows/security.yml
name: Security Audit

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm audit --audit-level=high
      - run: npm outdated
\`\`\`

### 7. Subresource Integrity (SRI)

\`\`\`html
<!-- CDN avec SRI -->
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
\`\`\`

### 8. Plan de Sécurité

**Priorités:**
1. **P0 - Critique:** HTTPS, CSP basique, Headers essentiels
2. **P1 - Haute:** Audit dépendances, Cookies sécurisés, CORS
3. **P2 - Moyenne:** CSP stricte, SRI, Monitoring

**Monitoring continu:**
- Alertes vulnérabilités (Snyk, Dependabot)
- Logs d'erreurs CSP
- Scans réguliers (OWASP ZAP)

Fournis un plan de sécurisation complet et des solutions production-ready.`
    },

    performanceSecurityBalance: {
        name: 'Équilibre Performance-Sécurité',
        description: 'Optimiser sans compromettre la sécurité',
        category: 'best-practices',
        strategy: 'specific',
        variables: ['url', 'performanceScore', 'securityScore', 'conflicts'],
        tags: ['security', 'performance', 'optimization', 'balance'],
        template: `# Équilibre Performance-Sécurité - {{url}}

## Rôle
Tu es un Expert en Architecture Web, spécialisé dans l'équilibre entre performance et sécurité.

## Scores

- **Performance:** {{formatScore:performanceScore}}
- **Sécurité:** {{formatScore:securityScore}}

## Conflits Détectés

{{#if conflicts}}
{{listItems:conflicts}}
{{/if}}

## Demande

Trouve l'équilibre optimal entre performance et sécurité:

### 1. Optimisations Sans Impact Sécurité

**Compression et Minification:**
\`\`\`javascript
// vite.config.js
export default {
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router'],
          'ui': ['component-library']
        }
      }
    }
  }
}
\`\`\`

**Compression Brotli/Gzip:**
\`\`\`nginx
# Nginx - Compression sécurisée
gzip on;
gzip_vary on;
gzip_types text/plain text/css application/json application/javascript text/xml;

# Brotli
brotli on;
brotli_types text/plain text/css application/json application/javascript;
\`\`\`

### 2. CSP Compatible Performance

**Nonces pour inline styles/scripts:**
\`\`\`vue
<script setup>
// Générer nonce côté serveur
const nonce = inject('cspNonce')
</script>

<template>
  <style :nonce="nonce">
    /* Critical CSS inline avec nonce */
  </style>
</template>
\`\`\`

### 3. CDN avec Sécurité

\`\`\`javascript
// Utiliser CDN avec SRI et fallback
const loadFromCDN = (url, integrity) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.integrity = integrity
    script.crossOrigin = 'anonymous'
    script.onload = resolve
    script.onerror = () => {
      // Fallback vers copie locale
      loadFromLocal().then(resolve).catch(reject)
    }
    document.head.appendChild(script)
  })
}
\`\`\`

### 4. Lazy Loading Sécurisé

\`\`\`vue
<script setup>
// Dynamic imports sécurisés
const loadComponent = async (componentName) => {
  try {
    const component = await import(
      \`./components/\${componentName}.vue\`
    )
    return component.default
  } catch (error) {
    console.error('Failed to load component:', error)
    return ErrorComponent
  }
}
</script>
\`\`\`

### 5. Caching Sécurisé

\`\`\`nginx
# Cache headers sécurisés
location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
  add_header X-Content-Type-Options "nosniff" always;
}

# Pas de cache pour HTML
location ~* \\.html$ {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
  add_header Pragma "no-cache";
  add_header Expires "0";
}
\`\`\`

### 6. Recommandations

**Checklist Performance-Sécurité:**
- ✅ Compression activée (Brotli/Gzip)
- ✅ CSP avec nonces pour inline code
- ✅ SRI pour ressources externes
- ✅ Headers de sécurité configurés
- ✅ HTTPS avec HSTS
- ✅ Code splitting sans vulnérabilités
- ✅ Lazy loading avec validation
- ✅ Cache strategy sécurisée

Fournis des solutions permettant d'atteindre de hauts scores en performance ET sécurité.`
    }
};

export default bestPracticesPrompts;
