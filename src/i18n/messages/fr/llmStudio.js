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

        veilleTitle: 'Veille',
        veilleHint: 'Historique des fichiers générés. Relancez régulièrement pour suivre l\'évolution de votre domaine et garder vos fichiers à jour.',

        errorInvalidUrl: 'URL invalide.',
        errorFetchHome: 'Impossible de récupérer la page d\'accueil (relais requis ou site inaccessible).',
        errorAnalyze: 'Échec de l\'analyse du domaine.',
        errorNoProvider: 'Configurez un fournisseur LLM dans les paramètres.',
        errorGenerate: 'Échec de la génération'
    }
}
