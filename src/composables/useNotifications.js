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

    /**
     * Notifie la fin d'une tâche longue, uniquement si l'onglet n'est pas au
     * premier plan (sinon le toast in-app suffit) et si la permission est
     * accordée. Évite le bruit quand l'utilisateur regarde déjà l'écran.
     * @param {string} title
     * @param {string} body
     * @param {string} [tag]
     * @returns {Notification|null}
     */
    function notifyDone(title, body = '', tag = undefined) {
        const hidden = typeof document !== 'undefined' && document.hidden
        if (!hidden) return null
        return notify(title, {body, tag})
    }

    return {
        isSupported,
        permission,
        requestPermission,
        notify,
        notifyDone
    }
}

export default useNotifications
