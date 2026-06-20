import {fileURLToPath, URL} from 'node:url'
import {execSync} from 'node:child_process'

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

/**
 * Date et hash du dernier commit, résolus au build (repli : date du build).
 * Injectés via `define` pour le footer discret.
 */
function buildStamp() {
    try {
        return {
            date: execSync('git log -1 --format=%cI').toString().trim(),
            sha: execSync('git log -1 --format=%h').toString().trim()
        }
    } catch {
        return {date: new Date().toISOString(), sha: ''}
    }
}

const stamp = buildStamp()

/**
 * Emit a 404.html identical to index.html so Cloudflare Pages serves the SPA
 * shell for deep links (e.g. /watchlist, page reloads) without a _redirects
 * rule — the standard `/* /index.html 200` rule is rejected by Pages as a loop.
 */
function spaFallback() {
    return {
        name: 'spa-404-fallback',
        enforce: 'post',
        generateBundle(_options, bundle) {
            const index = bundle['index.html']
            if (index && index.type === 'asset') {
                this.emitFile({type: 'asset', fileName: '404.html', source: index.source})
            }
        }
    }
}

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        vueDevTools(),
        spaFallback(),
    ],
    define: {
        __COMMIT_DATE__: JSON.stringify(stamp.date),
        __COMMIT_SHA__: JSON.stringify(stamp.sha)
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        },
    },
})
