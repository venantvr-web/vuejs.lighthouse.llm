import {ref, watch} from 'vue'
import {compareSnapshots, fetchSiteSnapshot, liteContext} from '@/services/llmSnapshot'
import {useNotifications} from '@/composables/useNotifications'
import {useToast} from '@/composables/useToast'
import {useI18n} from '@/i18n'

/**
 * Veille automatique des aspects LLM (llms.txt / structure du domaine).
 *
 * Local-first : aucune tâche de fond serveur. La vérification s'exécute quand
 * l'utilisateur ouvre l'app/la page, pour les domaines dont l'intervalle est
 * écoulé. Les changements détectés déclenchent un toast et une notification.
 *
 * L'état est un singleton de module, persisté en localStorage et partagé.
 */
const STORAGE_KEY = 'lh:llm-watch'

function loadItems() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

const items = ref(loadItems())

watch(items, (value) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
        // best-effort (quota, mode privé…)
    }
}, {deep: true})

export function useLlmWatch() {
    const {notify} = useNotifications()
    const toast = useToast()
    const {t} = useI18n()

    const checking = ref(false)

    function find(origin) {
        return items.value.find((i) => i.origin === origin)
    }

    function isWatched(origin) {
        return !!find(origin)
    }

    /**
     * Ajoute un domaine à la veille à partir d'un instantané déjà analysé.
     * @param {string} origin
     * @param {{context: object, llmsPresent: boolean, llmsFullPresent: boolean}} snapshotInput
     */
    function watchDomain(origin, snapshotInput) {
        if (!origin || find(origin)) return
        items.value.push({
            origin,
            addedAt: Date.now(),
            lastCheckedAt: Date.now(),
            snapshot: {
                context: liteContext(snapshotInput.context),
                llmsPresent: !!snapshotInput.llmsPresent,
                llmsFullPresent: !!snapshotInput.llmsFullPresent
            },
            lastChanges: []
        })
    }

    function unwatch(origin) {
        items.value = items.value.filter((i) => i.origin !== origin)
    }

    /** Vérifie un domaine, met à jour son instantané et alerte si changements. */
    async function checkOne(item, {silent = false} = {}) {
        const snap = await fetchSiteSnapshot(item.origin)
        const next = {
            context: liteContext(snap.context),
            llmsPresent: snap.liveLlms.present,
            llmsFullPresent: snap.liveLlmsFull.present
        }
        const changes = compareSnapshots(item.snapshot, next)
        item.snapshot = next
        item.lastCheckedAt = Date.now()
        item.lastChanges = changes

        if (changes.length && !silent) {
            const body = changes.join('\n')
            toast.warning(`${t('llmStudio.watchAlert')} — ${item.origin}`, {details: body})
            notify(`${t('llmStudio.watchAlert')} — ${item.origin}`, {body, tag: `llmwatch-${item.origin}`})
        }
        return changes
    }

    /** Vérifie tous les domaines surveillés (action manuelle). */
    async function checkAll() {
        if (checking.value) return
        checking.value = true
        try {
            for (const item of items.value) {
                try {
                    await checkOne(item)
                } catch {
                    // domaine injoignable : on n'interrompt pas la veille
                }
            }
        } finally {
            checking.value = false
        }
    }

    /**
     * Vérifie les domaines dont l'intervalle est écoulé (au chargement de page).
     * @param {number} intervalMs
     */
    async function checkDue(intervalMs) {
        if (checking.value) return
        const now = Date.now()
        const due = items.value.filter((i) => now - (i.lastCheckedAt || 0) >= intervalMs)
        if (!due.length) return
        checking.value = true
        try {
            for (const item of due) {
                try {
                    await checkOne(item)
                } catch {
                    // ignore
                }
            }
        } finally {
            checking.value = false
        }
    }

    return {items, checking, isWatched, watchDomain, unwatch, checkOne, checkAll, checkDue}
}

export default useLlmWatch
