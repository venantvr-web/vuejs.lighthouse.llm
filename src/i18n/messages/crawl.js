/**
 * Textes de l'écran « Mode Crawl » (CrawlView).
 */
export default {
    crawl: {
        // En-tête
        headerTitle: 'Mode Crawl',
        headerSubtitle: 'Analyse multi-pages par templates',
        guide: 'Guide',
        guideTooltip: "Guide d'utilisation",
        history: 'Historique',
        historyTooltip: 'Historique des crawls',

        // Indicateur de relais HTTP
        relayDirect: 'Mode direct (sans relais) — requêtes navigateur',
        relayOkIntegrated: 'Relais HTTP OK (intégré)',
        relayOkWith: 'Relais HTTP OK ({base})',
        relayDown: 'Relais HTTP indisponible — modes Auto/Sitemap désactivés (Paramètres → Requêtes sortantes, ou mode direct)',
        relayChecking: 'Vérification du relais…',

        // Statuts de progression
        statusDiscovering: 'Découverte des URLs... ({count})',
        statusAnalyzing: 'Analyse en cours... ({done}/{total})',
        statusCompleted: 'Analyse terminée !',
        statusPartial: 'Analyse partielle terminée',
        statusCancelled: 'Analyse annulée',
        statusFailed: "Échec de l'analyse",

        // Étapes
        stepDiscovery: 'Découverte',
        stepAnalysis: 'Analyse',
        discoveredUrls: 'URLs découvertes ({count})',

        // Formulaire
        formTitle: 'Crawler de site multi-pages',
        formSubtitle: 'Analysez plusieurs pages et obtenez des scores agrégés par template',
        errorTitle: 'Erreur de crawl',

        baseUrlLabel: 'URL de base',
        discoveryModeLabel: 'Mode de découverte des URLs',
        modeAuto: 'Auto',
        modeAutoDesc: 'Suit les liens internes',
        modeSitemap: 'Sitemap',
        modeSitemapDesc: 'Parse sitemap.xml',
        modeManual: 'Manuel',
        modeManualDesc: "Liste d'URLs",

        manualUrlsLabel: 'Liste des URLs (une par ligne)',
        manualUrlsHint: 'Maximum {count} URLs. Une URL de sitemap (.xml) est dépliée en pages (serveur local requis). Les lignes commençant par # sont ignorées.',

        serviceLabel: "Service d'analyse",
        pageSpeedName: 'PageSpeed Insights',
        pageSpeedDesc: 'API Google, pas de serveur local requis',
        localName: 'Local Lighthouse',
        localDesc: 'Serveur local, plus rapide',
        serverUnavailable: 'Serveur non disponible',
        serverOnline: 'En ligne',

        strategyLabel: 'Stratégie',

        maxPagesLabel: 'Nombre maximum de pages',
        onePage: '1 page',
        twentyPages: '20 pages',

        submit: 'Lancer le crawl',

        aboutTitle: 'A propos du mode Crawl',
        aboutText: "Le crawl analyse plusieurs pages de votre site et détecte automatiquement les types de templates (page d'accueil, fiche produit, listing...). Les scores sont agrégés par template et par domaine.",

        execTimeTitle: "Temps d'exécution",
        execTimeText: "L'analyse de {count} pages peut prendre environ {min}-{max} minutes en raison des limitations de débit de l'API.",

        // Erreurs
        errorRelayRequired: 'Le relais HTTP est requis pour la découverte automatique des URLs (les requêtes vers des sites tiers sont bloquées par le CORS du navigateur). En production (Cloudflare Pages), il est intégré ; en local, lancez "npm run server" ou indiquez un relais dans Paramètres → Requêtes sortantes. Sinon, utilisez le mode Manuel.',
        errorGeneric: 'Une erreur est survenue lors du crawl',

        // Modale guide
        guideModalTitle: 'Guide du Mode Crawl',
        guideModalSubtitle: 'Comprendre les options disponibles',
        guideDiscoveryTitle: 'Modes de découverte des URLs',
        guideServerRequired: 'Serveur requis',
        guideNoServer: 'Sans serveur',
        guideAutoDesc: 'Crawle automatiquement les liens internes du site. Nécessite le serveur proxy local pour contourner les restrictions CORS du navigateur.',
        guideSitemapDesc: 'Parse le fichier sitemap.xml du site. Nécessite également le serveur proxy pour accéder au sitemap.',
        guideManualDesc: 'Saisissez vous-même la liste des URLs à analyser. Aucun serveur requis, les URLs sont traitées localement.',

        guideServicesTitle: "Services d'analyse",
        guidePageSpeedDesc: "Utilise l'API Google PageSpeed. Gratuit, sans installation, mais avec des quotas limités (environ 25 requêtes/jour sans clé API).",
        guideLocalDesc: 'Analyse via Chromium local. Plus rapide, sans limite, confidentiel. Nécessite le serveur avec Chromium installé.',

        guideCompatTitle: 'Tableau de compatibilité',
        guideColDiscovery: 'Découverte',
        guideColService: 'Service',
        guideColServer: 'Serveur',
        guideAutoSitemap: 'Auto / Sitemap',
        guideNotRequired: 'Non requis',
        guideRequired: 'Requis',

        guideServerTitle: 'Démarrer le serveur',
        guideFirstInstall: 'Première installation :',
        guideStart: 'Démarrage :',

        guideUnderstood: 'Compris !'
    }
}
