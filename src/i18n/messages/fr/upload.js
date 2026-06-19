/**
 * Textes de l'écran « Importer un rapport » (UploadView).
 */
export default {
    upload: {
        headerTitle: 'Importer un rapport',
        headerSubtitle: "Import d'un rapport Lighthouse JSON",

        title: 'Importez votre rapport Lighthouse',
        subtitle: 'Glissez-déposez ou sélectionnez un fichier JSON exporté depuis Chrome DevTools',

        errorTitle: "Erreur d'import",
        loadError: 'Erreur lors du chargement du rapport',

        helpTitle: 'Comment obtenir un rapport Lighthouse ?',
        helpStep1: 'Ouvrez Chrome DevTools (F12)',
        helpStep2: 'Allez dans l\'onglet "Lighthouse"',
        helpStep3: 'Lancez une analyse',
        helpStep4: 'Cliquez sur "Save as JSON" dans le menu',

        altQuestion: 'Vous préférez une analyse en temps réel ?',
        altLink: 'Analysez votre URL directement',

        // DropZone
        dropTitle: 'Importez un rapport Lighthouse',
        dropSubtitle: 'Glissez-déposez un fichier JSON ou cliquez pour sélectionner',
        dropOverlay: 'Déposez votre fichier JSON Lighthouse',
        dropHint: 'Export depuis Chrome DevTools > Lighthouse > Save as JSON',
        errorNotJson: 'Veuillez sélectionner un fichier JSON',
        errorInvalidReport: "Ce fichier n'est pas un rapport Lighthouse valide",
        errorReadJson: 'Erreur lors de la lecture du fichier JSON : {message}'
    }
}
