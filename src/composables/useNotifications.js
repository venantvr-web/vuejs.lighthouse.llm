import {ref} from 'vue'

/**
 * Browser notifications composable (local-first, no backend / push server).
 * Used to alert on performance regressions or budget breaches after a re-audit.
 */
export function useNotifications() {
    const isSupported = typeof window !== 'undefined' && 'Notification' in window
    const permission = ref(isSupported ? Notification.permission : 'denied')

    /**
     * Request notification permission from the user.
     * @returns {Promise<string>} The resulting permission state
     */
    async function requestPermission() {
        if (!isSupported) return 'denied'
        try {
            permission.value = await Notification.requestPermission()
        } catch {
            // Older browsers use a callback signature; ignore failures silently
        }
        return permission.value
    }

    /**
     * Show a notification if permission has been granted.
     * @param {string} title - Notification title
     * @param {object} options - Standard Notification options (body, icon, tag…)
     * @returns {Notification|null}
     */
    function notify(title, options = {}) {
        if (!isSupported || permission.value !== 'granted') return null
        try {
            return new Notification(title, {
                icon: '/icon.svg',
                badge: '/icon.svg',
                ...options
            })
        } catch {
            return null
        }
    }

    return {
        isSupported,
        permission,
        requestPermission,
        notify
    }
}

export default useNotifications
