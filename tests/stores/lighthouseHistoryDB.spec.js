import {describe, expect, it} from 'vitest'
import {
    CRAWL_SESSIONS_STORE,
    LH_DB_NAME,
    LH_DB_VERSION,
    REPORTS_STORE,
    SCORES_STORE,
    upgradeLighthouseHistory
} from '@/stores/lighthouseHistoryDB'

// Faux IDBDatabase minimal pour observer les créations de stores
function fakeDb(existing = []) {
    const stores = new Set(existing)
    const created = []
    return {
        objectStoreNames: {contains: (n) => stores.has(n)},
        createObjectStore: (name) => {
            stores.add(name)
            created.push(name)
            return {createIndex: () => {}}
        },
        _created: created
    }
}

describe('lighthouseHistoryDB', () => {
    it('shares a single name/version for both stores', () => {
        expect(LH_DB_NAME).toBe('lighthouse-history')
        expect(typeof LH_DB_VERSION).toBe('number')
    })

    it('creates all three stores on a fresh database', () => {
        const db = fakeDb()
        upgradeLighthouseHistory(db)
        expect(db._created).toEqual(expect.arrayContaining([SCORES_STORE, CRAWL_SESSIONS_STORE, REPORTS_STORE]))
        expect(db._created).toHaveLength(3)
    })

    it('is idempotent: only creates the missing stores', () => {
        const db = fakeDb([SCORES_STORE])
        upgradeLighthouseHistory(db)
        expect(db._created).toEqual([CRAWL_SESSIONS_STORE, REPORTS_STORE])
    })

    it('creates nothing when everything already exists', () => {
        const db = fakeDb([SCORES_STORE, CRAWL_SESSIONS_STORE, REPORTS_STORE])
        upgradeLighthouseHistory(db)
        expect(db._created).toEqual([])
    })
})
