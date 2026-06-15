import './assets/main.css'

import {createApp} from 'vue'
import {pinia} from './stores'
import router from './router'
import App from './App.vue'

const app = createApp(App)

app.use(pinia)
app.use(router)

app.mount('#app')

// Register the PWA service worker (production only to avoid dev caching).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.error('Service worker registration failed:', err)
        })
    })
}
