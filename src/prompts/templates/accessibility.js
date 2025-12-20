/**
 * Accessibility (A11y) Expert Prompts
 * Focus: WCAG 2.1 AA, RGAA, ARIA, Screen readers
 */

export const accessibilityPrompts = {
    quickAnalysis: {
        name: 'Analyse Rapide Accessibilité',
        description: 'Violations WCAG principales',
        category: 'accessibility',
        strategy: 'quick',
        variables: ['url', 'score', 'violations', 'ariaIssues', 'colorContrast'],
        tags: ['accessibility', 'a11y', 'wcag', 'quick'],
        template: `# Analyse Accessibilité - {{url}}

## Rôle
Tu es un Expert Accessibilité Numérique, spécialisé RGAA (Référentiel Général d'Amélioration de l'Accessibilité) et WCAG 2.1 niveau AA.

## Score Accessibilité
{{formatScore:score}}

## Violations Détectées

{{#if violations}}
### Problèmes Prioritaires
{{prioritize:violations}}
{{/if}}

{{#if ariaIssues}}
### Problèmes ARIA
{{listItems:ariaIssues}}
{{/if}}

{{#if colorContrast}}
### Contraste des Couleurs
{{listItems:colorContrast}}
{{/if}}

## Demande

En tant qu'expert accessibilité, analyse:

### 1. Violations WCAG 2.1 AA

Pour chaque violation:
- Critère WCAG concerné
- Impact utilisateur (lecteurs d'écran, navigation clavier, etc.)
- Niveau de conformité (A, AA, AAA)

### 2. Solutions de Code

**HTML Sémantique:**
\`\`\`vue
<template>
  <!-- Structure accessible avec landmarks ARIA -->
  <header role="banner">
    <nav role="navigation" aria-label="Navigation principale">
      <!-- Navigation accessible -->
    </nav>
  </header>

  <main role="main">
    <!-- Contenu principal -->
  </main>

  <footer role="contentinfo">
    <!-- Pied de page -->
  </footer>
</template>
\`\`\`

**ARIA Attributes:**
\`\`\`vue
<template>
  <!-- Boutons et contrôles accessibles -->
  <button
    :aria-label="buttonLabel"
    :aria-pressed="isPressed"
    :aria-expanded="isExpanded"
  >
    Action
  </button>

  <!-- Messages live pour screen readers -->
  <div role="alert" aria-live="polite">
    {{ statusMessage }}
  </div>
</template>
\`\`\`

**Navigation Clavier:**
\`\`\`vue
<script setup>
// Gestion focus et tabindex
const handleKeyboard = (event) => {
  // Contrôles au clavier
}
</script>
\`\`\`

### 3. Contraste et Lisibilité

\`\`\`css
/* Contrastes WCAG AA: 4.5:1 pour texte normal, 3:1 pour grands textes */
.text-primary {
  color: #000000; /* Sur fond blanc: 21:1 ✅ */
}
\`\`\`

### 4. Tests et Validation

- Outils: axe DevTools, WAVE, Pa11y
- Tests manuels au lecteur d'écran (NVDA, JAWS, VoiceOver)
- Navigation clavier exclusive (sans souris)

### 5. Quick Wins A11y

3 corrections rapides et à fort impact pour améliorer immédiatement l'accessibilité.

Fournis des solutions conformes WCAG 2.1 AA et RGAA.`
    },

    wcagCompliance: {
        name: 'Audit Conformité WCAG 2.1 AA',
        description: 'Audit complet WCAG 2.1 niveau AA',
        category: 'accessibility',
        strategy: 'deep',
        variables: ['url', 'score', 'perceivable', 'operable', 'understandable', 'robust'],
        tags: ['accessibility', 'wcag', 'compliance', 'audit'],
        template: `# Audit Conformité WCAG 2.1 AA - {{url}}

## Rôle
Tu es un Auditeur Expert en Accessibilité Numérique, certifié WCAG 2.1 et RGAA.

## Score Accessibilité Globale
{{formatScore:score}}

## Principes WCAG 2.1

### 1. Perceptible (Perceivable)

{{#if perceivable}}
**Conformité:** {{formatScore:perceivable.score}}

**Problèmes identifiés:**
{{listItems:perceivable.issues}}
{{/if}}

**Critères concernés:**
- 1.1 Alternatives textuelles
- 1.2 Médias temporels
- 1.3 Adaptable
- 1.4 Distinguable

### 2. Utilisable (Operable)

{{#if operable}}
**Conformité:** {{formatScore:operable.score}}

**Problèmes identifiés:**
{{listItems:operable.issues}}
{{/if}}

**Critères concernés:**
- 2.1 Accessibilité au clavier
- 2.2 Délai suffisant
- 2.3 Crises et réactions physiques
- 2.4 Navigable
- 2.5 Modalités d'entrée

### 3. Compréhensible (Understandable)

{{#if understandable}}
**Conformité:** {{formatScore:understandable.score}}

**Problèmes identifiés:**
{{listItems:understandable.issues}}
{{/if}}

**Critères concernés:**
- 3.1 Lisible
- 3.2 Prévisible
- 3.3 Assistance à la saisie

### 4. Robuste (Robust)

{{#if robust}}
**Conformité:** {{formatScore:robust.score}}

**Problèmes identifiés:**
{{listItems:robust.issues}}
{{/if}}

**Critères concernés:**
- 4.1 Compatible

## Demande

Audit approfondi de conformité WCAG 2.1 AA:

### 1. Analyse par Principe

Pour chaque principe WCAG, détaille:
- Critères non conformes
- Niveau de gravité
- Impact utilisateur spécifique

### 2. Corrections par Catégorie

#### A. Perceptible

**Alternatives textuelles:**
\`\`\`vue
<template>
  <!-- Images avec alt descriptifs -->
  <img :src="image" :alt="description" />

  <!-- SVG accessibles -->
  <svg role="img" :aria-label="iconLabel">
    <title>{{ iconTitle }}</title>
    <!-- SVG content -->
  </svg>

  <!-- Vidéos avec sous-titres et audiodescription -->
  <video controls>
    <track kind="captions" :src="captionsUrl" />
    <track kind="descriptions" :src="descriptionsUrl" />
  </video>
</template>
\`\`\`

**Contraste et distinction:**
\`\`\`css
/* Ratios de contraste WCAG AA */
:root {
  --text-color: #1a1a1a; /* 21:1 sur blanc */
  --link-color: #0066cc; /* 7:1 sur blanc */
}

/* Focus visible */
:focus-visible {
  outline: 3px solid #0066cc;
  outline-offset: 2px;
}
\`\`\`

#### B. Utilisable

**Navigation clavier:**
\`\`\`vue
<script setup>
import { ref, onMounted } from 'vue'

const focusableElements = ref([])

const trapFocus = (event) => {
  // Piège de focus pour modales
}

const skipToMain = () => {
  // Lien d'évitement
}
</script>

<template>
  <!-- Lien d'évitement -->
  <a href="#main-content" class="skip-link">
    Aller au contenu principal
  </a>

  <!-- Ordre de tabulation logique -->
  <nav>
    <a href="#" tabindex="0">Lien 1</a>
    <a href="#" tabindex="0">Lien 2</a>
  </nav>
</template>
\`\`\`

#### C. Compréhensible

**Langue et labels:**
\`\`\`vue
<template>
  <html :lang="currentLang">
    <head>
      <title>{{ pageTitle }}</title>
    </head>
    <body>
      <!-- Labels explicites pour formulaires -->
      <form>
        <label for="email">
          Adresse e-mail <span aria-label="requis">*</span>
        </label>
        <input
          id="email"
          type="email"
          :aria-required="true"
          :aria-invalid="emailError ? 'true' : 'false'"
          :aria-describedby="emailError ? 'email-error' : undefined"
        />
        <span id="email-error" role="alert" v-if="emailError">
          {{ emailError }}
        </span>
      </form>
    </body>
  </html>
</template>
\`\`\`

#### D. Robuste

**Validation HTML et ARIA:**
\`\`\`vue
<template>
  <!-- HTML5 sémantique valide -->
  <article>
    <header>
      <h1>Titre de l'article</h1>
    </header>

    <!-- ARIA landmarks -->
    <section aria-labelledby="section-title">
      <h2 id="section-title">Section</h2>
    </section>
  </article>

  <!-- Composants ARIA -->
  <div
    role="tablist"
    :aria-label="tabsLabel"
  >
    <button
      v-for="(tab, index) in tabs"
      :key="tab.id"
      role="tab"
      :aria-selected="currentTab === index"
      :aria-controls="\`panel-\${tab.id}\`"
      :tabindex="currentTab === index ? 0 : -1"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
\`\`\`

### 3. Composants Accessibles Vue.js

Librairies et patterns recommandés:
- Headless UI
- Radix Vue
- Vue A11y utilities

### 4. Tests et Validation

**Tests automatisés:**
\`\`\`javascript
// Jest + jest-axe
import { axe } from 'jest-axe'

test('Pas de violations a11y', async () => {
  const { container } = render(Component)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
\`\`\`

**Tests manuels:**
- Lecteurs d'écran (NVDA, JAWS, VoiceOver)
- Navigation clavier exclusive
- Zoom 200%
- Contraste en mode sombre

### 5. Plan de Mise en Conformité

Roadmap priorisée:
- P0: Bloqueurs critiques (navigation clavier, alternatives textuelles)
- P1: Violations AA majeures
- P2: Améliorations et niveau AAA

Fournis un plan d'action détaillé pour atteindre la conformité WCAG 2.1 AA complète.`
    },

    screenReaderOptimization: {
        name: 'Optimisation Lecteurs d\'Écran',
        description: 'Optimisation pour NVDA, JAWS, VoiceOver',
        category: 'accessibility',
        strategy: 'specific',
        variables: ['url', 'ariaLabels', 'landmarks', 'liveRegions', 'focusManagement'],
        tags: ['accessibility', 'screen-reader', 'aria', 'nvda', 'jaws'],
        template: `# Optimisation Lecteurs d'Écran - {{url}}

## Rôle
Tu es un Expert en Technologies d'Assistance, spécialisé dans l'optimisation pour lecteurs d'écran (NVDA, JAWS, VoiceOver, TalkBack).

## Analyse Lecteurs d'Écran

### Labels ARIA
{{#if ariaLabels}}
{{listItems:ariaLabels}}
{{/if}}

### Landmarks
{{#if landmarks}}
{{listItems:landmarks}}
{{/if}}

### Live Regions
{{#if liveRegions}}
{{listItems:liveRegions}}
{{/if}}

### Gestion du Focus
{{#if focusManagement}}
{{listItems:focusManagement}}
{{/if}}

## Demande

Optimise l'expérience pour lecteurs d'écran:

### 1. Structure de Page pour Screen Readers

\`\`\`vue
<template>
  <!-- Landmarks ARIA -->
  <div id="app">
    <a href="#main-content" class="sr-only sr-only-focusable">
      Aller au contenu principal
    </a>

    <header role="banner">
      <nav role="navigation" aria-label="Navigation principale">
        <!-- Navigation -->
      </nav>
    </header>

    <aside role="complementary" aria-label="Barre latérale">
      <!-- Contenu complémentaire -->
    </aside>

    <main id="main-content" role="main">
      <h1>Titre principal</h1>
      <!-- Contenu principal -->
    </main>

    <footer role="contentinfo">
      <!-- Pied de page -->
    </footer>
  </div>
</template>

<style scoped>
/* Classes pour lecteurs d'écran */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
</style>
\`\`\`

### 2. ARIA Live Regions

\`\`\`vue
<script setup>
import { ref } from 'vue'

const notification = ref('')
const loading = ref(false)

const showNotification = (message) => {
  notification.value = message
}
</script>

<template>
  <!-- Notifications importantes -->
  <div
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    v-if="notification"
  >
    {{ notification }}
  </div>

  <!-- Mises à jour non critiques -->
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <span v-if="loading">Chargement en cours...</span>
  </div>

  <!-- Messages d'erreur -->
  <div
    role="alert"
    aria-live="assertive"
    class="error-message"
  >
    <!-- Erreurs de formulaire -->
  </div>
</template>
\`\`\`

### 3. Composants Interactifs Accessibles

**Modal Dialog:**
\`\`\`vue
<script setup>
import { ref, watch, nextTick } from 'vue'

const isOpen = ref(false)
const modalRef = ref(null)
const triggerRef = ref(null)

watch(isOpen, async (value) => {
  if (value) {
    await nextTick()
    modalRef.value?.focus()
  } else {
    triggerRef.value?.focus()
  }
})
</script>

<template>
  <button
    ref="triggerRef"
    @click="isOpen = true"
    aria-haspopup="dialog"
  >
    Ouvrir la modale
  </button>

  <Teleport to="body">
    <div
      v-if="isOpen"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="descId"
      ref="modalRef"
      tabindex="-1"
    >
      <h2 :id="titleId">Titre de la modale</h2>
      <p :id="descId">Description</p>

      <button @click="isOpen = false" aria-label="Fermer">
        ×
      </button>
    </div>
  </Teleport>
</template>
\`\`\`

**Tabs Accessibles:**
\`\`\`vue
<script setup>
import { ref } from 'vue'

const tabs = ref([
  { id: 'tab1', label: 'Onglet 1', content: 'Contenu 1' },
  { id: 'tab2', label: 'Onglet 2', content: 'Contenu 2' }
])
const activeTab = ref(0)

const handleKeydown = (event, index) => {
  // Arrow navigation
  if (event.key === 'ArrowRight') {
    activeTab.value = (index + 1) % tabs.value.length
  } else if (event.key === 'ArrowLeft') {
    activeTab.value = index === 0 ? tabs.value.length - 1 : index - 1
  }
}
</script>

<template>
  <div>
    <div role="tablist" aria-label="Onglets d'exemple">
      <button
        v-for="(tab, index) in tabs"
        :key="tab.id"
        role="tab"
        :id="\`tab-\${tab.id}\`"
        :aria-selected="activeTab === index"
        :aria-controls="\`panel-\${tab.id}\`"
        :tabindex="activeTab === index ? 0 : -1"
        @click="activeTab = index"
        @keydown="handleKeydown($event, index)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-for="(tab, index) in tabs"
      :key="\`panel-\${tab.id}\`"
      role="tabpanel"
      :id="\`panel-\${tab.id}\`"
      :aria-labelledby="\`tab-\${tab.id}\`"
      :hidden="activeTab !== index"
      tabindex="0"
    >
      {{ tab.content }}
    </div>
  </div>
</template>
\`\`\`

### 4. Formulaires Accessibles

\`\`\`vue
<script setup>
import { ref } from 'vue'

const email = ref('')
const emailError = ref('')

const validateEmail = () => {
  if (!email.value.includes('@')) {
    emailError.value = 'Veuillez entrer une adresse e-mail valide'
  } else {
    emailError.value = ''
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <fieldset>
      <legend>Informations de contact</legend>

      <div>
        <label for="email">
          Adresse e-mail
          <span aria-label="requis">*</span>
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          aria-required="true"
          :aria-invalid="emailError ? 'true' : 'false'"
          :aria-describedby="emailError ? 'email-error' : 'email-hint'"
          @blur="validateEmail"
        />
        <span id="email-hint" class="hint">
          Format: nom@exemple.com
        </span>
        <span id="email-error" role="alert" v-if="emailError">
          {{ emailError }}
        </span>
      </div>
    </fieldset>
  </form>
</template>
\`\`\`

### 5. Tests avec Lecteurs d'Écran

**Checklist de test:**
- Navigation par landmarks (NVDA+D, JAWS+;)
- Navigation par titres (H)
- Navigation par formulaires (F)
- Lecture du contenu dynamique
- Annonces des live regions
- Gestion du focus dans les composants

**Outils:**
- NVDA (gratuit, Windows)
- JAWS (payant, Windows)
- VoiceOver (macOS, iOS)
- TalkBack (Android)

Fournis des solutions testées avec les principaux lecteurs d'écran.`
    }
};

export default accessibilityPrompts;
