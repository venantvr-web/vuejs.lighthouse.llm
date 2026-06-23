/**
 * Critical CSS helper texts (command generator).
 */
export default {
    criticalCss: {
        title: 'Critical CSS: command generator',
        intro: 'List pages: the app builds the commands to run in your terminal. Generation runs locally with Chromium (the "critical" tool) — no backend, no data sent.',
        urlsLabel: 'Pages to process (one URL per line):',
        urlsPlaceholder: 'https://www.example.tld/\nhttps://www.example.tld/blog/article/',
        viewport: 'Viewport:',
        desktop: 'Desktop (1300 × 900)',
        mobile: 'Mobile (360 × 640)',
        custom: 'Custom',
        width: 'Width:',
        height: 'Height:',
        inline: 'Inline the CSS into the HTML (otherwise .css file)',
        emptyHint: 'Enter at least one URL above.',
        advanced: 'Advanced options (protected site: WAF / authentication)',
        userAgent: 'User-Agent:',
        userAgentPlaceholder: 'Mozilla/5.0 (… real browser …)',
        cookie: 'Authentication cookie:',
        cookiePlaceholder: 'name=value; other=value',
        cookieNote: 'The cookie is not stored (sensitive data): it is only used to build the command here.',
        step1: '1. Install the tool:',
        step2: '2. Create the {name} file:',
        step3: '3. Run the generation:',
        copy: 'Copy',
        copied: 'Copied to clipboard',
        copyError: 'Copy failed',
        note: 'Everything runs on your machine. The extracted critical CSS is meant to be inlined in the <head> to speed up first render.'
    }
}
