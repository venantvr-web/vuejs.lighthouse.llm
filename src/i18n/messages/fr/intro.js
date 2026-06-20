/**
 * Phrases d'introduction affichées en haut de chaque page (composant PageIntro).
 */
export default {
    intro: {
        home: "Cet outil audite la performance et le SEO de vos pages avec Lighthouse, puis exploite un LLM pour expliquer les résultats et proposer un plan d'action. Toutes vos données restent dans votre navigateur. Choisissez ci-dessous comment démarrer une analyse.",
        lighthouse: 'Lancez un audit Lighthouse en ligne sur une URL publique. Le rapport mesure la performance, l\'accessibilité, les bonnes pratiques et le SEO de la page. Les résultats sont conservés localement pour être analysés ensuite.',
        upload: "Importez un rapport Lighthouse au format JSON déjà généré ailleurs. Il sera chargé dans l'application pour être visualisé et analysé par le LLM. Aucune donnée n'est envoyée à un serveur.",
        local: 'Lancez Lighthouse via un serveur Chromium local, utile pour les sites internes ou non publics. Renseignez l\'URL puis suivez l\'avancement de l\'audit. Le serveur local est optionnel et se configure à part.',
        dashboard: "Vue d'ensemble du dernier rapport chargé : scores par catégorie et accès rapide aux analyses détaillées. Servez-vous des raccourcis pour comparer, suivre ou approfondir un audit. Les données proviennent du rapport actuellement en mémoire.",
        analysis: "Analyse détaillée d'une catégorie du rapport, enrichie par le LLM. Vous y trouverez le diagnostic, les opportunités d'amélioration et un plan d'action priorisé. Sélectionnez une catégorie pour afficher son détail.",
        comparison: 'Comparez deux rapports Lighthouse pour mesurer l\'évolution des scores dans le temps. Les écarts par catégorie et par métrique sont mis en évidence. Choisissez les rapports à confronter ci-dessous.',
        settings: 'Configurez vos fournisseurs LLM et leurs clés API, ainsi que les préférences de l\'application. Vos clés restent stockées dans votre navigateur et ne transitent jamais par un serveur tiers. Pensez à enregistrer après modification.',
        history: 'Retrouvez l\'historique de vos audits Lighthouse, de vos crawls et de vos analyses IA. Vous pouvez y rouvrir, comparer ou exporter d\'anciens résultats. Utilisez les onglets pour naviguer entre les types d\'historique.',
        briefing: 'Le briefing matinal résume les changements importants détectés sur vos sites suivis. Il met en avant les régressions, les progrès et les points à surveiller. Ajoutez des URL à la Watchlist pour alimenter ce résumé.',
        watchlist: 'La Watchlist suit quotidiennement les URL importantes et vous alerte en cas de régression. Chaque entrée affiche l\'évolution de ses scores Lighthouse. Ajoutez les pages que vous souhaitez surveiller.',
        geo: 'Le GEO (Generative Engine Optimization) mesure si votre marque est citée par les moteurs de réponse IA (ChatGPT, Gemini, Claude…). Définissez des prompts représentatifs de vos clients et suivez votre visibilité dans le temps. Configurez d\'abord les clés API des fournisseurs.',
        searchConsole: 'Connectez Google Search Console pour croiser vos données de recherche avec les audits. Vous visualisez impressions, clics et positions des pages suivies. L\'accès se fait en lecture seule depuis votre navigateur.',
        resources: 'Diagnostiquez l\'indexabilité d\'un domaine : robots.txt, sitemap, balises et autres signaux SEO techniques. Le LLM résume les incohérences et propose des correctifs. Saisissez une URL pour lancer le diagnostic.',
        llmStudio: 'Générez de meilleurs fichiers llms.txt et llms-full.txt pour rendre votre site lisible par les IA. L\'analyse comprend votre domaine métier à partir de l\'en-tête, du pied de page et du sitemap, puis l\'IA rédige les fichiers. Suivez aussi l\'évolution de ces aspects dans le temps.',
        crawl: 'Crawlez un site pour collecter ses pages, puis lancez des audits Lighthouse en lot. Vous obtenez une vue agrégée des scores sur l\'ensemble du domaine. Renseignez l\'URL de départ et les options de crawl.',
        crawlResults: 'Résultats d\'un crawl : scores Lighthouse page par page, agrégats du domaine et regroupement par type de page. Repérez les modèles de pages les plus faibles à corriger en priorité. Vous pouvez générer des données structurées ou comparer avec d\'autres crawls.'
    }
}
