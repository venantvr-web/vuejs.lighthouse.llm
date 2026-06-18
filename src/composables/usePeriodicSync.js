import {ref} from 'vue'

const TAG = 'morning-briefing'
const MIN_INTERVAL = 24 * 60 * 60 * 1000 // 1 day (the browser may run it less often)

/**
 * Best-effort daily reminder via the Periodic Background Sync API.
 *
 * This does NOT run audits in the background (a local-first SPA can't): when the
 * browser fires the sync, the service worker shows a reminder notification.
 * It only works on installed PWAs in production, and the browser decides the
 * actual frequency.
 */
export function usePeriodicSync() {
    const available = typeof window !== 'undefined'
        && 'serviceWorker' in navigator
        && 'PeriodicSyncManager' in window
        && import.meta.env.PROD

    const enabled = ref(false)
    const status = ref('')

    async function refresh() {
        if (!available) {
            status.value = 'Disponible sur l\'app installée (production).'
            return
        }
        try {
            const reg = await navigator.serviceWorker.ready
            if (!reg.periodicSync) {
                status.value = 'Non supporté par ce navigateur.'
                return
            }
            const tags = await reg.periodicSync.getTags()
            enabled.value = tags.includes(TAG)
        } catch (err) {
            status.value = err.message
        }
    }

    async function enable() {
        if (!available) return
        if ('Notification' in window && Notification.permission !== 'granted') {
            await Notification.requestPermission()
        }
        const perm = await navigator.permissions
            .query({name: 'periodic-background-sync'})
            .catch(() => ({state: 'denied'}))
        if (perm.state !== 'granted') {
            status.value = 'Permission refusée (réservée aux PWA installées).'
            return
        }
        try {
            const reg = await navigator.serviceWorker.ready
            await reg.periodicSync.register(TAG, {minInterval: MIN_INTERVAL})
            enabled.value = true
            status.value = 'Rappel quotidien activé (fréquence décidée par le navigateur).'
        } catch (err) {
            status.value = `Échec : ${err.message}`
        }
    }

    async function disable() {
        enabled.value = false
        status.value = ''
        if (!available) return
        try {
            const reg = await navigator.serviceWorker.ready
            if (reg.periodicSync) await reg.periodicSync.unregister(TAG)
        } catch {
            // ignore
        }
    }

    async function toggle() {
        return enabled.value ? disable() : enable()
    }

    return {available, enabled, status, refresh, enable, disable, toggle}
}

export default usePeriodicSync
