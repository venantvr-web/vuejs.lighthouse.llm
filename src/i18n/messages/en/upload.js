/**
 * "Import a report" screen texts (UploadView).
 */
export default {
    upload: {
        headerTitle: 'Import a report',
        headerSubtitle: 'Import a Lighthouse JSON report',

        title: 'Import your Lighthouse report',
        subtitle: 'Drag and drop or select a JSON file exported from Chrome DevTools',

        errorTitle: 'Import error',
        loadError: 'Error while loading the report',

        helpTitle: 'How to get a Lighthouse report?',
        helpStep1: 'Open Chrome DevTools (F12)',
        helpStep2: 'Go to the "Lighthouse" tab',
        helpStep3: 'Run an analysis',
        helpStep4: 'Click "Save as JSON" in the menu',

        altQuestion: 'Prefer a real-time analysis?',
        altLink: 'Analyze your URL directly',

        // DropZone
        dropTitle: 'Import a Lighthouse report',
        dropSubtitle: 'Drag and drop a JSON file or click to select',
        dropOverlay: 'Drop your Lighthouse JSON file',
        dropHint: 'Export from Chrome DevTools > Lighthouse > Save as JSON',
        errorNotJson: 'Please select a JSON file',
        errorInvalidReport: 'This file is not a valid Lighthouse report',
        errorReadJson: 'Error while reading the JSON file: {message}'
    }
}
