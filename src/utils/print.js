/**
 * Open a print-friendly window for a Markdown document and trigger the browser
 * print dialog (which lets the user save as PDF). Local-first, no backend.
 * The Markdown is rendered with marked and sanitized with DOMPurify before
 * being written, so LLM-derived substrings can't inject markup.
 * @module utils/print
 */
import {marked} from 'marked'
import DOMPurify from 'dompurify'

/**
 * Escape text for safe insertion into an HTML attribute/title.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => (
        {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]
    ))
}

// Minimal, print-oriented stylesheet (always light, A4-friendly margins).
const PRINT_CSS = `
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;line-height:1.55;max-width:760px;margin:2rem auto;padding:0 1.5rem}
  h1{font-size:1.7rem;margin:0 0 .25rem;border-bottom:2px solid #e5e7eb;padding-bottom:.4rem}
  h2{font-size:1.25rem;margin:1.6rem 0 .6rem;color:#1f2937}
  h3{font-size:1.05rem;margin:1.2rem 0 .4rem}
  p,li{font-size:.92rem}
  em{color:#6b7280}
  table{width:100%;border-collapse:collapse;margin:.8rem 0;font-size:.82rem}
  th,td{border:1px solid #d1d5db;padding:.35rem .55rem;text-align:left}
  th{background:#f3f4f6;font-weight:600}
  blockquote{border-left:4px solid #6366f1;margin:.8rem 0;padding:.4rem .9rem;color:#4b5563;background:#f9fafb;font-size:.85rem}
  code{background:#f3f4f6;padding:.1rem .3rem;border-radius:.2rem;font-size:.85em}
  a{color:#4338ca;text-decoration:none}
  @page{margin:1.5cm}
`

/**
 * Render Markdown and open it in a new window for printing / saving to PDF.
 * @param {string} title - Document title (shown in the print header / tab)
 * @param {string} markdown - Markdown content to render
 * @returns {boolean} False if the window could not be opened (pop-up blocked)
 */
export function printMarkdown(title, markdown) {
    const bodyHtml = DOMPurify.sanitize(marked(markdown || ''), {ADD_ATTR: ['target', 'rel']})
    const win = window.open('', '_blank')
    if (!win) return false

    win.document.write(
        `<!doctype html><html lang="fr"><head><meta charset="utf-8">` +
        `<title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head>` +
        `<body>${bodyHtml}</body></html>`
    )
    win.document.close()
    win.focus()
    // Let the new document lay out before invoking print.
    win.onload = () => {
        win.print()
    }
    // Fallback when onload doesn't fire (some browsers with document.write).
    setTimeout(() => {
        try {
            win.print()
        } catch {
            // window may already be closed by the user
        }
    }, 400)
    return true
}

export default printMarkdown
