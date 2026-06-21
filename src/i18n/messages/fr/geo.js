/**
 * Textes de l'écran GEO Tracking (visibilité de la marque dans les moteurs IA).
 */
export default {
    geo: {
        // En-tête
        title: 'GEO Tracking',
        subtitle: 'Visibilité de votre marque dans les réponses des moteurs IA',
        apiKeys: 'Clés API',
        enableAlerts: 'Activer les alertes',
        exportCsvTitle: 'Exporter le comparatif en CSV',
        exportMarkdownTitle: 'Exporter le comparatif en Markdown',
        runAll: 'Tout exécuter',
        runningAll: 'Analyse en cours…',
        // Éditeur de clés
        keysTitle: 'Clés API par moteur',
        keysHelp: 'Stockées localement dans votre navigateur. Renseignez les moteurs que vous voulez interroger.',
        keyPlaceholder: 'clé API…',
        ollamaHint: 'Ollama se configure dans les Paramètres.',
        // Aucun moteur prêt (deux fragments, le bouton « Clés API » s'insère entre les deux)
        noProviderBefore: 'Aucun moteur configuré. Cliquez sur ',
        noProviderAfter: ' pour renseigner au moins une clé (OpenAI, Claude ou Gemini).',
        // Sélection des moteurs
        engines: 'Moteurs :',
        advancedTitle: 'Un appel LLM supplémentaire par moteur : concurrents cités + sentiment de la mention',
        advancedAnalysis: 'Analyse avancée (concurrents + sentiment)',
        // Formulaire d'ajout
        promptLabel: 'Prompt à suivre',
        promptPlaceholder: 'Prompt à suivre (ex. : Quels sont les meilleurs outils d\'audit SEO ?)',
        brandLabel: 'Votre marque',
        brandPlaceholder: 'Votre marque',
        competitorsLabel: 'Concurrents à comparer (optionnel)',
        competitorsPlaceholder: 'Concurrents (séparés par des virgules)',
        brandCompetitorsHelp: 'Indiquez la marque dont vous mesurez la présence dans les réponses IA, et éventuellement des concurrents pour comparer leur visibilité.',
        add: 'Ajouter',
        // Présets de prompts (remplacez les crochets par votre contexte)
        presetsLabel: 'Présets :',
        fillTokens: 'Renseignez les champs du préset :',
        presets: [
            'Quelles sont les meilleures solutions de [secteur] en 2026 ?',
            'Quel outil recommandez-vous pour [besoin] ?',
            'Quelles sont les meilleures alternatives à [concurrent] ?',
            'Comparez les principaux acteurs du marché [secteur].',
            'Quelle entreprise choisir pour [produit/service] ?',
            'Quels sont les leaders du [secteur] en France ?',
            'Quels prestataires de [service] recommandez-vous à [ville/région] ?',
            'Quels sont les avantages et inconvénients de [marque] ?'
        ],
        // Résumé
        promptsTracked: 'Prompts suivis',
        avgShareOfVoice: 'Part de voix moy.',
        brandAbsent: 'Marque absente partout',
        neverRun: 'Jamais exécuté',
        // État vide
        emptyTitle: 'Aucun prompt suivi',
        emptyText: 'Ajoutez des prompts représentatifs des recherches de vos clients, indiquez votre marque et vos concurrents, puis comparez votre visibilité selon les moteurs IA.',
        // Messages (JS)
        errorPromptBrandRequired: 'Le prompt et la marque sont requis.',
        errorInvalidEntry: 'Entrée invalide.',
        confirmRemove: 'Retirer ce prompt suivi ?',
        // Carte de prompt (GeoCard)
        competitorsCount: '{count} concurrent',
        competitorsCountPlural: '{count} concurrents',
        removeTitle: 'Retirer',
        enginesCiting: 'Moteurs citant',
        avgShareOfVoiceShort: 'Part de voix moy.',
        mentioned: 'Oui',
        notMentioned: 'Non',
        emergingCompetitors: 'Concurrents émergents',
        citedBy: 'Cité par {count} moteur(s)',
        showResponses: 'Voir les réponses',
        hideResponses: 'Masquer les réponses',
        executedAt: 'Exécuté {time}',
        run: 'Exécuter',
        // Sentiment
        sentimentPositive: 'Positif',
        sentimentNeutral: 'Neutre',
        sentimentNegative: 'Négatif'
    }
}
