/**
 * Studio LLM : génération de llms.txt / llms-full.txt et veille.
 */
export default {
    llmStudio: {
        headerTitle: 'Studio LLM',
        headerSubtitle: 'llms.txt, llms-full.txt et veille IA',

        urlPlaceholder: 'https://votre-domaine.com',
        analyze: 'Analyser le domaine',
        analyzing: 'Analyse…',
        keywordsLabel: 'Mots-clés / domaine métier (optionnel, améliore le résultat)',
        keywordsPlaceholder: 'Ex. : audit SEO, performance web, agence, e-commerce mode…',

        configurePrefix: 'La génération par IA nécessite un fournisseur LLM. ',
        configureLink: 'Configurer',
        configureSuffix: ' dans les paramètres.',

        bestPracticesTitle: 'Bonnes pratiques llms.txt',
        bestPractices: [
            'Un fichier Markdown à la racine : /llms.txt (et /llms-full.txt pour la version complète).',
            'Commencez par un titre H1 (nom du site), puis une citation « > » qui résume en une phrase l\'activité et le public visé.',
            'Organisez en quelques sections « ## » thématiques, avec des listes de liens « [Titre](URL) : description courte ».',
            'Sélectionnez les pages essentielles — ne recopiez pas tout le sitemap.',
            'Phrases courtes, sans jargon ; une ligne de description par lien.',
            'Placez le secondaire (mentions légales, etc.) sous une section « ## Optional » que les agents peuvent ignorer.',
            'URLs absolues et contenu maintenu à jour.',
            'llms-full.txt : version étendue, avec descriptions complètes pour donner tout le contexte aux IA.'
        ],

        contextTitle: 'Domaine compris par l\'IA',
        ctxTitle: 'Titre',
        ctxDescription: 'Description',
        ctxHeaderLinks: 'Liens d\'en-tête',
        ctxFooterLinks: 'Liens de pied de page',
        ctxSitemap: 'Sections du sitemap ({count} URL)',

        liveStatus: 'Fichiers publiés :',
        present: 'présent',
        absent: 'absent',
        viewLive: 'Voir',

        generateLlms: 'Générer llms.txt',
        generateLlmsFull: 'Générer llms-full.txt',
        continue: 'Continuer la génération',

        veilleTitle: 'Historique',
        veilleHint: 'Historique des fichiers générés. Relancez régulièrement pour suivre l\'évolution de votre domaine et garder vos fichiers à jour.',

        watchTitle: 'Veille automatique',
        watchHint: 'Les domaines surveillés sont revérifiés à l\'ouverture de l\'app quand l\'intervalle est écoulé. En cas de changement (structure du domaine, fichier llms.txt retiré ou publié), vous recevez une alerte.',
        watchInterval: 'Intervalle',
        watchThis: 'Surveiller ce domaine',
        unwatch: 'Ne plus surveiller',
        checkNow: 'Vérifier maintenant',
        checking: 'Vérification…',
        enableAlerts: 'Activer les notifications',
        lastChecked: 'Vérifié',
        watchAlert: 'Veille LLM',

        errorInvalidUrl: 'URL invalide.',
        errorFetchHome: 'Impossible de récupérer la page d\'accueil (relais requis ou site inaccessible).',
        errorAnalyze: 'Échec de l\'analyse du domaine.',
        errorNoProvider: 'Configurez un fournisseur LLM dans les paramètres.',
        errorGenerate: 'Échec de la génération'
    }
}
