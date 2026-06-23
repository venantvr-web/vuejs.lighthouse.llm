/**
 * Textes du helper « CSS critique » (générateur de commandes).
 */
export default {
    criticalCss: {
        title: 'CSS critique : générateur de commandes',
        intro: 'Indiquez des pages : l\'application fabrique les commandes à lancer dans votre terminal. La génération tourne localement avec Chromium (outil « critical ») — aucun backend, aucun envoi de données.',
        urlsLabel: 'Pages à traiter (une URL par ligne) :',
        urlsPlaceholder: 'https://www.exemple.tld/\nhttps://www.exemple.tld/blog/article/',
        viewport: 'Fenêtre :',
        desktop: 'Bureau (1300 × 900)',
        mobile: 'Mobile (360 × 640)',
        custom: 'Personnalisée',
        width: 'Largeur :',
        height: 'Hauteur :',
        inline: 'Inliner le CSS dans le HTML (sinon fichier .css)',
        emptyHint: 'Indiquez au moins une URL ci-dessus.',
        advanced: 'Options avancées (site protégé : WAF / authentification)',
        userAgent: 'User-Agent :',
        userAgentPlaceholder: 'Mozilla/5.0 (… navigateur réel …)',
        cookie: 'Cookie d\'authentification :',
        cookiePlaceholder: 'nom=valeur; autre=valeur',
        cookieNote: 'Le cookie n\'est pas mémorisé (donnée sensible) : il sert seulement à générer la commande ici.',
        step1: '1. Installer l\'outil :',
        step2: '2. Créer le fichier {name} :',
        step3: '3. Lancer la génération :',
        copy: 'Copier',
        copied: 'Copié dans le presse-papiers',
        copyError: 'Échec de la copie',
        note: 'Tout s\'exécute sur votre machine. Le CSS critique extrait sert à être inliné dans le <head> des pages pour accélérer le premier rendu.'
    }
}
