/**
 * Textes de l'écran « Comparaison » (ComparisonView).
 */
export default {
    comparison: {
        // Titres de page selon le mode
        titleSession: 'Comparer les sessions de crawl',
        titleHistory: 'Comparer les analyses',
        titleFile: 'Comparer les rapports',

        // Catégories
        categoryPerformance: 'Performance',
        categoryAccessibility: 'Accessibilité',
        categorySeo: 'SEO',
        categoryBestPractices: 'Bonnes Pratiques',

        // Mode fichier
        reportABefore: 'Rapport A (Avant)',
        reportBAfter: 'Rapport B (Après)',
        scoreEvolution: 'Évolution des scores',
        summary: 'Résumé',
        summaryAllImproved: 'Excellente évolution ! Tous les scores se sont améliorés ou sont restés stables.',
        summaryAllDeclined: 'Attention, des régressions ont été détectées sur plusieurs catégories.',
        summaryMixed: "Évolution mitigée : certaines catégories se sont améliorées, d'autres ont régressé.",
        points: 'points',
        stable: 'stable',

        // Mode session / historique
        noComparisonTitle: 'Aucune comparaison sélectionnée',
        selectTwoSessions: 'Sélectionnez deux sessions pour les comparer.',
        selectTwoAnalyses: 'Sélectionnez deux analyses pour les comparer.',
        backToList: 'Retour à la liste',

        reference: 'Référence',
        comparisonLabel: 'Comparaison',
        before: 'Avant: {score}',
        templateComparison: 'Comparaison par template',

        improvementOne: 'Amélioration',
        improvementMany: 'Améliorations',
        stableOne: 'Stable',
        stableMany: 'Stables',
        regressionOne: 'Régression',
        regressionMany: 'Régressions',

        unknownUrl: 'URL inconnue',

        // Tableau de comparaison par template (TemplateComparisonTable)
        templateHeader: 'Template',
        evolution: 'Évolution',
        statusNew: 'Nouveau',
        statusRemoved: 'Supprimé',
        pages: 'pages',
        noTemplates: 'Aucun template à comparer',

        // Carte de session (SessionComparisonCard)
        unknownDomain: 'Domaine inconnu',
        pagesLabel: 'Pages :',
        averageLabel: 'Moyenne :'
    }
}
