/**
 * Textes de l'écran Paramètres (fournisseurs LLM, PageSpeed, requêtes
 * sortantes, données locales, User-Agent).
 */
export default {
    settings: {
        // En-tête
        headerSubtitle: "Fournisseurs LLM, clés API et préférences",
        headerTitle: 'Paramètres',

        // Identité (marques et domaines)
        identityTitle: 'Marques et domaines',
        identityIntro: 'Gérez vos marques et vos domaines. La marque active est affichée dans l\'en-tête et utilisée pour le suivi GEO ; le domaine actif préremplit les écrans.',
        brandsLabel: 'Marques :',
        brandPlaceholder: 'Ajouter une marque…',
        domainsLabel: 'Domaines :',
        domainPlaceholder: 'https://exemple.com',
        addBtn: 'Ajouter',
        identityHint: 'Cliquez sur une puce pour la rendre active, sur ✕ pour la supprimer.',

        // Configuration LLM
        llmTitle: 'Configuration LLM',
        llmIntro: "Configurez le fournisseur d'IA pour l'analyse de vos rapports Lighthouse.",
        providerLabel: 'Fournisseur :',
        providerLocal: 'Gratuit, local',
        providerCloud: 'API Cloud',
        apiKeyLabel: 'Clé API :',
        apiKeyHint: 'Votre clé API est stockée localement dans votre navigateur.',
        ollamaUrlLabel: 'URL Ollama :',
        modelLabel: 'Modèle :',
        loadModels: 'Charger les modèles disponibles',
        maxTokensLabel: 'Longueur max. de réponse (tokens) :',
        maxTokensHint: 'Augmentez cette valeur si les analyses IA sont coupées. Plafonnée automatiquement selon le modèle (OpenAI 16384, Anthropic 8192, Gemini 32768).',
        savedConfirm: 'Enregistré !',
        testConnection: 'Tester la connexion',

        // Messages de chargement des modèles
        errKeyFirst: "Renseignez une clé API d'abord.",
        errDynamicUnavailable: 'Liste dynamique non disponible pour ce fournisseur.',
        errNoModel: 'Aucun modèle retourné.',
        errLoadFailed: 'Échec du chargement : {message}',

        // Test de connexion
        testTodo: 'Test de connexion : fonctionnalité à venir',

        // Réinitialisation des données locales
        confirmResetDb: 'Réinitialiser toutes les données locales (historiques, crawls, artefacts IA…) ? Cette action est irréversible et la page sera rechargée.',

        // PageSpeed
        pageSpeedTitle: 'Analyse PageSpeed',
        pageSpeedIntro: "L'API PageSpeed Insights fonctionne sans clé, mais avec un quota très limité. Une clé est recommandée pour la Watchlist et les analyses répétées.",
        pageSpeedKeyLabel: 'Clé API PageSpeed (optionnelle) :',
        pageSpeedStored: 'Stockée localement.',
        pageSpeedGetKey: 'Obtenir une clé',

        // Requêtes sortantes
        outboundTitle: 'Requêtes sortantes',
        outboundIntro: 'User-Agent utilisé par le serveur local pour récupérer robots.txt, sitemaps, llms.txt et vérifier les URLs (Ressources et Crawl). Laissez vide pour la valeur par défaut.',
        userAgentLabel: 'User-Agent (optionnel) :',
        userAgentHintPrefix: 'Par défaut :',
        userAgentHintSuffix: "Un User-Agent transparent et identifiable est recommandé ; n'utilisez un User-Agent de navigateur que si un site bloque le robot.",
        proxyBaseLabel: 'Base du relais HTTP (optionnel) :',
        proxyBasePlaceholder: '(même origine)',
        proxyBaseHintPrefix: 'Relais utilisé pour contourner le CORS (récupération de robots.txt, sitemaps, pages…). En production, laissez vide : le relais intégré de Cloudflare Pages (',
        proxyBaseHintMiddle: ') est utilisé. En local,',
        proxyBaseHintSuffix: '(serveur Node), ou indiquez un relais CORS de votre choix.',
        directModeLabel: 'Mode direct (sans relais)',
        directModeHint: "Récupère les ressources directement depuis le navigateur, sans relais. À activer si l'app et le site analysé sont sur la même origine (ton site de prod) ou si la cible autorise le CORS. Pas besoin de serveur ni de Pages Function.",

        // Données locales
        localDataTitle: 'Données locales',
        localDataIntro: "Historiques, sessions de crawl et artefacts IA sont stockés dans ton navigateur (IndexedDB). En cas d'erreur d'ouverture après une mise à jour, réinitialise les bases.",
        resetDbButton: 'Réinitialiser les données locales',
        resettingDb: 'Réinitialisation…',
        localDataNote: "Supprime toutes les bases IndexedDB de l'application puis recharge la page. Les réglages (clés API, préférences) ne sont pas affectés.",

        // Cartes d'information
        geminiTitle: 'Gemini (Recommandé)',
        geminiDesc: 'Contexte de 1M tokens, tier gratuit généreux, excellent en français.',
        geminiLink: 'Obtenir une clé API',
        ollamaCardTitle: 'Ollama (100% Local)',
        ollamaCardDesc: 'Exécutez des modèles IA localement sans envoyer vos données.',
        ollamaLink: 'Installer Ollama',
        perplexityCardTitle: 'Perplexity (GEO)',
        perplexityCardDesc: 'Moteur de réponse ancré sur le web : ses réponses citent de vraies sources, idéal pour le suivi GEO.',
        perplexityLink: 'Obtenir une clé API'
    }
}
