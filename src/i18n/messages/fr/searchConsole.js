/**
 * Textes de l'écran Search Console.
 */
export default {
    searchConsole: {
        headerSubtitle: 'Données de recherche réelles (requêtes, clics, impressions, position)',
        headerTitle: 'Search Console',
        connectTitle: 'Connexion à Google Search Console',
        connectIntro: 'Renseignez un Client ID OAuth 2.0 (type « Application Web ») dont l\'origine autorisée est celle de ce site. L\'API Search Console doit être activée. Le jeton d\'accès reste en mémoire, rien n\'est stocké côté serveur.',
        connecting: 'Connexion…',
        connect: 'Se connecter',
        methodOAuth: 'OAuth (popup)',
        methodServiceAccount: 'Compte de service (clé JSON)',
        serviceAccountIntro: 'Collez la clé JSON d\'un compte de service Google. Aucune popup : la connexion est automatique.',
        serviceStep1: 'Google Cloud → Identifiants → Créer des identifiants → Compte de service, puis créer une clé JSON.',
        serviceStep2: 'Activer l\'API Search Console pour le projet.',
        serviceStep3: 'Dans Search Console, ajouter l\'e-mail du compte de service (…iam.gserviceaccount.com) comme utilisateur de la propriété.',
        serviceAccountWarning: 'La clé contient une clé privée et reste stockée dans ce navigateur. Ne l\'utilisez que sur un poste de confiance.',
        site: 'Site :',
        period: 'Période :',
        days7: '7 jours',
        days28: '28 jours',
        days90: '90 jours',
        dimension: 'Dimension :',
        queries: 'Requêtes',
        pages: 'Pages',
        analyze: 'Analyser',
        disconnect: 'Déconnexion',
        clicks: 'Clics',
        impressions: 'Impressions',
        avgCtr: 'CTR moyen',
        avgPosition: 'Position moy.',
        clicksTrend: 'Tendance des clics (analyses enregistrées)',
        page: 'Page',
        query: 'Requête',
        impr: 'Impr.',
        ctr: 'CTR',
        position: 'Position',
        emptyHint: 'Choisissez un site et cliquez sur « Analyser ».'
    }
}
