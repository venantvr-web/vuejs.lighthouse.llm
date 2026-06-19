import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {describeError, useToast} from '@/composables/useToast'

function clearAll() {
    const {toasts, dismiss} = useToast()
    while (toasts.length) dismiss(toasts[0].id)
}

describe('describeError', () => {
    it('passes a string through', () => {
        expect(describeError('boom')).toBe('boom')
    })
    it('combines name, message, status, url', () => {
        const err = Object.assign(new TypeError('failed'), {status: 503, url: 'https://x.io'})
        const out = describeError(err)
        expect(out).toContain('TypeError')
        expect(out).toContain('failed')
        expect(out).toContain('HTTP 503')
        expect(out).toContain('https://x.io')
    })
    it('includes a cause message', () => {
        expect(describeError({message: 'a', cause: {message: 'root'}})).toContain('root')
    })
    it('returns empty for nullish', () => {
        expect(describeError(null)).toBe('')
    })
})

describe('useToast', () => {
    beforeEach(() => {
        clearAll()
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
        clearAll()
    })

    it('pushes a toast and returns an incrementing id', () => {
        const {success, toasts} = useToast()
        const id1 = success('a')
        const id2 = success('b')
        expect(id2).toBeGreaterThan(id1)
        expect(toasts.length).toBe(2)
        expect(toasts[0]).toMatchObject({type: 'success', message: 'a'})
    })

    it('dismiss removes the toast', () => {
        const {info, dismiss, toasts} = useToast()
        const id = info('x')
        dismiss(id)
        expect(toasts.find(t => t.id === id)).toBeUndefined()
    })

    it('fromError builds a verbose details string', () => {
        const {fromError, toasts} = useToast()
        const id = fromError('Échec', Object.assign(new Error('nope'), {status: 500}))
        const toast = toasts.find(t => t.id === id)
        expect(toast.type).toBe('error')
        expect(toast.message).toBe('Échec')
        expect(toast.details).toContain('nope')
        expect(toast.details).toContain('HTTP 500')
    })

    it('auto-dismisses success after its duration', () => {
        const {success, toasts} = useToast()
        const id = success('bye')
        expect(toasts.find(t => t.id === id)).toBeDefined()
        vi.advanceTimersByTime(4000)
        expect(toasts.find(t => t.id === id)).toBeUndefined()
    })

    it('keeps error toasts sticky (no auto-dismiss)', () => {
        const {error, toasts} = useToast()
        const id = error('stay')
        vi.advanceTimersByTime(60000)
        expect(toasts.find(t => t.id === id)).toBeDefined()
    })

    it('caps the stack at 6 toasts', () => {
        const {info, toasts} = useToast()
        for (let i = 0; i < 9; i++) info(`t${i}`)
        expect(toasts.length).toBe(6)
        // oldest dropped, newest kept
        expect(toasts[toasts.length - 1].message).toBe('t8')
    })
})
