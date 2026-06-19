import './assets/main.css'

import {createApp} from 'vue'
import {pinia} from './stores'
import router from './router'
import i18n from './i18n'
import App from './App.vue'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(i18n)

app.mount('#app')

// Register the PWA service worker (production only to avoid dev caching).
if ('serviceWorker' in navigator) {
    if (import.meta.env.PROD) {
        // Reload once when a new worker takes control, so a tab that was
        // serving a stale/blank shell recovers automatically.
        let refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return
            refreshing = true
            window.location.reload()
        })

        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch((err) => {
                console.error('Service worker registration failed:', err)
            })
        })
    } else {
        // In dev, make sure no previously-installed worker keeps serving a
        // cached production build (a common cause of a blank dev page).
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => registration.unregister())
        })
    }
}
