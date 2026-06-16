# Lighthouse AI Analyzer

Application web **Vue 3** d'analyse et de **suivi quotidien** de la santé de vos pages : elle exécute des audits **Lighthouse**, en extrait les scores et les Core Web Vitals, puis génère des recommandations d'optimisation grâce à un **modèle de langage (LLM)**.

L'application est **« local-first »** : aucune donnée n'est envoyée à un serveur applicatif. Les clés d'API restent chez vous, l'historique est stocké dans votre navigateur (IndexedDB / localStorage), et l'application est installable comme une **PWA** pour un usage hors-ligne au quotidien.

---

## ✨ Fonctionnalités

- **Trois sources d'audit** : API Google PageSpeed Insights, Chromium local (via un serveur Node), ou import d'un fichier JSON Lighthouse.
- **Analyse par IA** : recommandations générées via Gemini, OpenAI, Claude (Anthropic) ou Ollama, à partir de gabarits de prompts versionnés.
- **Mode Crawl** : analyse de plusieurs pages d'un site avec agrégation des scores par gabarit (template).
- **Historique & comparaison** : évolution des scores dans le temps, comparaison de sessions et de pages.
- **Watchlist** : tableau de bord de suivi quotidien des URLs surveillées, avec :
  - scores récents par catégorie et **détection de régression** (delta vs audit précédent) ;
  - **budgets de performance** par catégorie, avec alerte visuelle en cas de dépassement ;
  - **notifications navigateur** lors d'une régression ou d'un budget non atteint ;
  - **courbe de tendance** (sparkline) et ré-audit en un clic.
- **GEO Tracking** (*Generative Engine Optimization*) : suivi de la visibilité de votre marque dans les réponses des moteurs IA, avec :
  - **prompts cibles** + marque + concurrents, interrogés sur **plusieurs moteurs en parallèle** (OpenAI, Claude, Gemini, Ollama) ;
  - mesure par moteur : **marque citée**, **position** et **part de voix** face aux concurrents ;
  - **comparaison inter-moteurs**, courbe de tendance et **alertes** quand la visibilité change.
- **Export** : Markdown, PDF, et sauvegarde / restauration de l'historique au format JSON.
- **PWA** : installable sur le bureau ou le mobile, fonctionne hors-ligne sur les données déjà stockées.

---

## 🏗️ Architecture

L'application suit une séparation claire en couches : vues, gestion d'état (Pinia), logique réutilisable (composables) et services d'accès aux API externes.

```mermaid
graph TD
    subgraph UI["Interface (Vue 3)"]
        Views["Vues<br/>(Home, Watchlist, GEO, Analysis, History…)"]
        Components["Composants<br/>(Sparkline, ScoreGauge, charts…)"]
    end

    subgraph Logic["Logique applicative"]
        Composables["Composables<br/>(useWatchlist, useGeoTracking,<br/>useLighthouseParser, usePromptEngine…)"]
        Stores["Stores Pinia<br/>(watchlist, geo, scoreHistory,<br/>lighthouse, settings)"]
    end

    subgraph Services["Services"]
        PSI["PageSpeed Insights"]
        Local["Serveur Chromium local"]
        LLM["Fournisseurs LLM<br/>(Gemini / OpenAI / Claude / Ollama)"]
    end

    subgraph Storage["Stockage navigateur"]
        IDB[("IndexedDB<br/>historique + rapports + runs GEO")]
        LS[("localStorage<br/>réglages + watchlist + prompts GEO")]
    end

    Views --> Components
    Views --> Composables
    Views --> Stores
    Composables --> Stores
    Composables --> Services
    Stores --> Storage
    Services -.->|réseau| PSI
    Services -.->|HTTP localhost| Local
    Services -.->|réseau| LLM
```

### Flux d'un audit

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant V as Vue
    participant S as Service d'audit
    participant P as useLighthouseParser
    participant H as scoreHistoryStore
    participant DB as IndexedDB

    U->>V: Lance un audit (URL + stratégie)
    V->>S: analyzeUrl(url, options)
    S-->>V: Rapport Lighthouse (JSON)
    V->>P: Extraction scores + Core Web Vitals
    P-->>V: Données structurées
    V->>H: addScoreWithReport(...)
    H->>DB: Persistance (scores + rapport complet)
    DB-->>H: OK
    H-->>V: Entrée enregistrée
    V-->>U: Affichage du tableau de bord
```

### Cycle de la Watchlist

```mermaid
flowchart LR
    A["Ajout d'une URL<br/>à la watchlist"] --> B["Ré-audit<br/>(manuel ou « Tout ré-auditer »)"]
    B --> C{"Comparaison<br/>avec l'audit précédent"}
    C -->|"Chute de score"| D["Régression détectée"]
    C -->|"Score &lt; budget"| E["Budget dépassé"]
    C -->|"OK"| F["Aucune alerte"]
    D --> G["Notification navigateur<br/>+ delta affiché"]
    E --> G
    G --> H["Mise à jour de la sparkline<br/>et du résumé de santé"]
    F --> H
```

### Cycle du GEO Tracking

```mermaid
flowchart LR
    A["Prompt cible<br/>+ marque + concurrents"] --> B["Exécution en parallèle<br/>sur les moteurs sélectionnés"]
    B --> C["Analyse de chaque réponse<br/>(mention, position, part de voix)"]
    C --> D["Comparaison inter-moteurs<br/>+ historique IndexedDB"]
    D --> E{"Changement vs<br/>exécution précédente ?"}
    E -->|"Marque perdue / part de voix en baisse"| F["Notification navigateur"]
    E -->|"Stable"| G["Mise à jour des sparklines<br/>et du comparatif"]
    F --> G
```

---

## 🧰 Stack technique

[![Stack](https://skillicons.dev/icons?i=vue,js,py&theme=dark)](https://skillicons.dev)

- **Front-end** : Vue 3 (Composition API), Vite, Vue Router, Pinia
- **UI** : Tailwind CSS, Chart.js (`vue-chartjs`)
- **Rendu & export** : `marked`, `highlight.js`, `jspdf`, `html2canvas`
- **Serveur d'audit local** : Node, Express, Lighthouse, `chrome-launcher`
- **Tests** : Vitest, `@vue/test-utils`, `happy-dom`

---

## 🚀 Installation et démarrage

### Prérequis

- Node.js `^20.19.0` ou `>=22.12.0`
- (Optionnel) Chromium installé en local pour le serveur d'audit local

### Front-end

```sh
npm install
npm run dev        # serveur de développement avec rechargement à chaud
```

### Serveur Lighthouse local (optionnel)

Nécessaire uniquement pour la source « Chromium local ». Il pilote Chromium pour exécuter les audits sans dépendre de l'API PageSpeed.

```sh
npm run server:install   # installe les dépendances du serveur
npm run server           # démarre le serveur sur http://localhost:3001
```

### Build de production

```sh
npm run build
npm run preview          # prévisualise le build
```

---

## ☁️ Déploiement (Cloudflare Pages)

L'application est une SPA statique : elle se déploie directement sur Cloudflare Pages.

**Réglages de build à configurer dans le tableau de bord Cloudflare :**

| Paramètre | Valeur |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `20` ou plus (variable `NODE_VERSION`) |

> ⚠️ Le **répertoire de sortie doit être `dist`**. S'il pointe vers la racine du dépôt, Cloudflare sert le `index.html` source (qui référence `/src/main.js`, inexistant en production) et la page reste **blanche**.

**Fichiers fournis (copiés automatiquement à la racine de `dist/`) :**

- `public/_redirects` → `/*  /index.html  200` : repli SPA indispensable pour que les routes côté client (`/watchlist`, `/history`…) et les rechargements ne renvoient pas un 404.
- `public/_headers` : empêche la mise en cache longue du service worker (`/sw.js`) et fixe le type MIME du manifeste.

```mermaid
flowchart LR
    Git["Dépôt Git"] -->|"push"| CF["Cloudflare Pages"]
    CF -->|"npm run build"| Dist["dist/"]
    Dist -->|"_redirects (SPA)"| Edge["Réseau Edge"]
    Edge -->|"/* → index.html"| Browser["Navigateur"]
    Browser -->|"PWA + service worker"| Offline["Disponible hors-ligne"]
```

> Le serveur Chromium local (`server/`) n'est **pas** déployé sur Cloudflare : c'est un utilitaire optionnel exécuté sur le poste de l'utilisateur. En production, privilégiez la source PageSpeed Insights ou l'import de fichiers.

---

## 📜 Scripts disponibles

| Script | Description |
| --- | --- |
| `npm run dev` | Démarre le serveur de développement Vite |
| `npm run build` | Génère le build de production |
| `npm run preview` | Prévisualise le build de production |
| `npm run test` | Lance Vitest en mode interactif |
| `npm run test:run` | Exécute la suite de tests une fois |
| `npm run test:coverage` | Génère un rapport de couverture |
| `npm run server` | Démarre le serveur Lighthouse local |
| `npm run server:dev` | Serveur local en mode watch |
| `npm run server:stop` | Arrête le serveur local (port 3001) |

---

## 📱 PWA (Progressive Web App)

L'application est installable et fonctionne hors-ligne :

- **Manifeste** : `public/manifest.webmanifest`
- **Service worker** : `public/sw.js` (network-first pour la navigation, stale-while-revalidate pour les ressources statiques)
- **Enregistrement** : effectué dans `src/main.js`, **en production uniquement** (pour éviter toute mise en cache gênante en développement)

> ℹ️ Le service worker ne met jamais en cache les appels réseau externes (API PageSpeed, fournisseurs LLM, serveur local). Les données d'audit restent dans IndexedDB / localStorage et demeurent disponibles hors-ligne.

---

## 🗂️ Structure du projet

```mermaid
graph TD
    root["Racine du projet"]
    root --> src["src/ — code de l'application"]
    root --> server["server/ — serveur Express + Lighthouse local"]
    root --> tests["tests/ — tests Vitest (stores, composables, composants, services)"]
    root --> public["public/ — manifeste PWA, service worker, icônes"]

    src --> components["components/ — composants réutilisables (common, history, geo, dashboard…)"]
    src --> composables["composables/ — logique réutilisable (useWatchlist, useGeoTracking, useNotifications…)"]
    src --> prompts["prompts/ — moteur et gabarits de prompts (.j2)"]
    src --> router["router/ — définition des routes"]
    src --> services["services/ — accès API (PageSpeed, Chromium local, fournisseurs LLM)"]
    src --> stores["stores/ — état Pinia (watchlist, geo, scoreHistory, lighthouse, settings)"]
    src --> utils["utils/ — formatters et helpers (url…)"]
    src --> views["views/ — pages de l'application (dont WatchlistView, GeoView)"]
```

---

## 🧪 Tests

La suite de tests couvre les stores, composables, composants et services.

```sh
npm run test:run
```

---

## 🔒 Confidentialité

- Les **clés d'API** (LLM) sont stockées localement dans votre navigateur et envoyées directement au fournisseur choisi — elles ne transitent par aucun serveur tiers.
- L'**historique des audits** et la **watchlist** résident dans IndexedDB / localStorage de votre navigateur.
- La source « Chromium local » permet d'analyser des sites internes / privés sans les exposer à un service externe.

---

## 🧭 Configuration IDE recommandée

[VS Code](https://code.visualstudio.com/) + l'extension [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (désactiver Vetur).
