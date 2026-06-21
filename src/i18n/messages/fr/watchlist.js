/**
 * Textes de l'écran Watchlist (suivi quotidien de la santé des pages).
 */
export default {
    watchlist: {
        // En-tête
        title: 'Watchlist',
        subtitle: 'Suivi quotidien de la santé de vos pages',
        enableAlertsTitle: 'Recevoir une alerte navigateur en cas de régression ou de budget dépassé',
        enableAlerts: 'Activer les alertes',
        alertsActiveTitle: 'Les alertes navigateur sont activées',
        alertsActive: 'Alertes actives',
        exportCsvTitle: 'Exporter en CSV',
        refreshAll: 'Tout ré-auditer',
        refreshingAll: 'Analyse en cours…',
        // Formulaire d'ajout
        fieldUrl: 'URL à surveiller :',
        fieldLabel: 'Libellé (optionnel) :',
        fieldStrategy: 'Appareil :',
        fieldSource: 'Moteur d\'analyse :',
        addFormHelp: 'Ajoutez une page à suivre quotidiennement : choisissez l\'appareil (mobile/desktop) et le moteur d\'analyse.',
        urlPlaceholder: 'https://exemple.com/page',
        labelPlaceholder: 'Nom (optionnel)',
        sourcePagespeed: 'PageSpeed',
        sourceLocal: 'Chromium local',
        add: 'Ajouter',
        // Résumé
        pagesTracked: 'Pages suivies',
        avgPerf: 'Perf. moyenne',
        regressions: 'Régressions',
        budgetBreaches: 'Budgets dépassés',
        neverAudited: 'Jamais audité',
        // État vide
        emptyTitle: 'Aucune page suivie',
        emptyText: 'Ajoutez les URLs que vous voulez surveiller au quotidien. Chaque ré-audit est comparé au précédent pour détecter les régressions.',
        // Catégories
        categoryPerformance: 'Performance',
        categoryAccessibility: 'Accessibilité',
        categoryBestPractices: 'Bonnes pratiques',
        categorySeo: 'SEO',
        // Messages (JS)
        errorUrlRequired: 'Veuillez saisir une URL.',
        errorUrlExists: 'Cette URL est déjà suivie.',
        errorUrlInvalid: 'URL invalide.',
        confirmRemove: 'Retirer « {label} » de la watchlist ?',
        notifyRegression: '{category} : {from} → {to} ({delta})',
        notifyBreach: '{category} sous le budget ({score} < {budget})',
        // WatchlistCard
        catPerfShort: 'Perf.',
        catA11yShort: 'A11y',
        catPracticesShort: 'Pratiques',
        catSeoShort: 'SEO',
        sourceLocalShort: 'Chromium',
        budgetsTitle: 'Budgets de performance',
        removeTitle: 'Retirer',
        budgetsLabel: 'Budgets (score minimum) :',
        budgetNotMet: 'Budget {value} non atteint',
        perfTrend: 'Tendance performance',
        audited: 'Vérifié {time}',
        reaudit: 'Ré-auditer'
    }
}
