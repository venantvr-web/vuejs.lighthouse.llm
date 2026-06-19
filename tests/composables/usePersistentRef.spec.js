import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {nextTick} from 'vue'
import {usePersistentRef} from '@/composables/usePersistentRef'

const PREFIX = 'lh:input:'

describe('usePersistentRef', () => {
    beforeEach(() => localStorage.clear())
    afterEach(() => localStorage.clear())

    it('uses the default value when nothing is stored', () => {
        const r = usePersistentRef('k.strategy', 'mobile')
        expect(r.value).toBe('mobile')
    })

    it('persists changes to localStorage', async () => {
        const r = usePersistentRef('k.strategy', 'mobile')
        r.value = 'desktop'
        await nextTick()
        expect(JSON.parse(localStorage.getItem(PREFIX + 'k.strategy'))).toBe('desktop')
    })

    it('restores a stored value on creation', () => {
        localStorage.setItem(PREFIX + 'k.days', JSON.stringify(7))
        const r = usePersistentRef('k.days', 28)
        expect(r.value).toBe(7)
    })

    it('round-trips numbers and booleans by type', async () => {
        const n = usePersistentRef('k.num', 28)
        const b = usePersistentRef('k.bool', false)
        n.value = 90
        b.value = true
        await nextTick()
        expect(usePersistentRef('k.num', 0).value).toBe(90)
        expect(usePersistentRef('k.bool', false).value).toBe(true)
    })

    it('removes the key when set back to null', async () => {
        const r = usePersistentRef('k.slug', null)
        r.value = 'home'
        await nextTick()
        expect(localStorage.getItem(PREFIX + 'k.slug')).not.toBeNull()
        r.value = null
        await nextTick()
        expect(localStorage.getItem(PREFIX + 'k.slug')).toBeNull()
    })

    it('persists objects with a deep watch', async () => {
        const r = usePersistentRef('k.obj', {a: 1})
        r.value.a = 2
        await nextTick()
        expect(JSON.parse(localStorage.getItem(PREFIX + 'k.obj'))).toEqual({a: 2})
    })

    it('falls back to default on corrupt stored JSON', () => {
        localStorage.setItem(PREFIX + 'k.bad', '{not json')
        const r = usePersistentRef('k.bad', 'safe')
        expect(r.value).toBe('safe')
    })
})
