/**
 * Textes de l'écran Ressources SEO/GEO (disponibilité robots.txt, sitemaps,
 * llms.txt, score GEO-readiness, diagnostic IA d'indexabilité, crawl).
 */
export default {
    resources: {
        // En-tête
        headerSubtitle: 'Disponibilité de robots.txt, sitemaps, llms.txt…',
        headerTitle: 'Ressources SEO/GEO',
        enableAlerts: 'Activer les alertes',
        enableAlertsTitle: 'Être alerté en cas de baisse du score ou de nouvelles URL cassées',
        notifyTitle: 'Ressources — {origin}',

        // Avis serveur local
        localServerPrefix: 'Ces vérifications passent par le serveur local (port 3001) pour contourner le CORS. Lancez',
        localServerSuffix: "si ce n'est pas déjà fait.",

        // Saisie
        urlPlaceholder: 'https://exemple.com',
        check: 'Vérifier',
        checking: 'Vérification…',

        // Score GEO-readiness
        readinessScore: 'Score GEO-readiness',
        jsonLdTypes: 'Types JSON-LD détectés (accueil)',
        jsonLdMissing: 'champ(s) manquant(s) —',
        indexingDirectives: "Directives d'indexation (accueil)",
        metaRobots: 'meta robots :',
        xRobotsTag: 'X-Robots-Tag :',
        metaGooglebot: 'meta googlebot :',
        canonical: 'canonical :',
        noindexWarning: "⚠️ noindex détecté sur la page d'accueil",

        // Diagnostic IA d'indexabilité
        diagnosisTitle: "Diagnostic IA d'indexabilité",
        diagnoseWithAi: "Diagnostiquer avec l'IA",
        rerunDiagnosis: 'Relancer le diagnostic',
        diagnoseDisabledTitle: 'Configurez un fournisseur LLM dans les paramètres',
        configurePrefix: 'Configurez un fournisseur LLM dans les',
        configureLink: 'paramètres',
        configureSuffix: 'pour activer le diagnostic.',
        inconsistencies: 'Incohérences détectées',
        noInconsistencies: "Aucune incohérence évidente détectée. Lancez le diagnostic IA pour l'analyse qualitative détaillée.",
        responseTruncated: 'Réponse coupée par la limite de tokens.',
        continueButton: 'Continuer',

        // Ressources
        available: 'Disponible',
        absent: 'Absent',

        // Sitemaps
        sitemapsDetected: 'Sitemaps détectés',
        tableUrl: 'URL',
        tableType: 'Type',
        tableEntries: 'Entrées',
        typeIndex: 'Index',
        typeUrls: 'URLs',
        crawl: 'Crawler',
        crawling: 'Crawl…',

        // Résultats de crawl
        crawlProgress: 'Vérification {done} / {total} URL…',
        urlsChecked: 'URL vérifiées',
        ok: 'OK',
        broken: 'Cassées (404…)',
        brokenUrls: 'URL cassées',
        exportCsv: 'Export CSV',
        errorLabel: 'Erreur',
        noBrokenUrls: 'Aucune URL cassée détectée 🎉'
    }
}
