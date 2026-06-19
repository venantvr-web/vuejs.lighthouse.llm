/**
 * Textes du panneau « Données structurées (JSON-LD) » (StructuredDataPanel).
 */
export default {
    structuredData: {
        title: 'Données structurées (JSON-LD)',
        autoGeneration: 'Génération auto',
        reanalyze: 'Réanalyser',
        analyze: 'Analyser',
        generateProgress: 'Génération {done}/{total}…',
        generateAllMissing: 'Générer tout le manquant',
        intro: "Détecte le JSON-LD manquant ou incomplet sur chaque page, puis génère le balisage avec l'IA.",
        autoHint: "La génération du manquant se lance automatiquement à l'ouverture des résultats.",
        missingPages: '{count} page(s) avec données structurées manquantes ou incomplètes.',
        allValid: 'Toutes les pages analysées disposent de données structurées valides 🎉',
        configurePrefixed: 'Configurez un fournisseur LLM dans les',
        settingsLink: 'paramètres',
        configureSuffix: 'pour générer le JSON-LD.',

        // Statuts par page
        statusMissing: 'Manquant',
        statusIncomplete: 'Incomplet',
        statusOk: 'OK',
        historized: 'Historisé',
        historizedTooltip: "JSON-LD déjà généré, restauré depuis l'historique IA",

        generating: 'Génération…',
        regenerate: 'Régénérer',
        generateJsonLd: 'Générer le JSON-LD',

        types: 'Types : {types}',
        copyTag: 'Copier la balise',
        download: 'Télécharger'
    }
}
