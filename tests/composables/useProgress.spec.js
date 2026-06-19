import {afterEach, describe, expect, it} from 'vitest'
import {doneProgress, startProgress, useProgress, withProgress} from '@/composables/useProgress'

function reset() {
    const {state} = useProgress()
    while (state.active > 0) doneProgress()
}

describe('useProgress', () => {
    afterEach(reset)

    it('start increments and done decrements the active count', () => {
        const {state} = useProgress()
        expect(state.active).toBe(0)
        startProgress()
        startProgress()
        expect(state.active).toBe(2)
        doneProgress()
        expect(state.active).toBe(1)
    })

    it('done is floored at 0', () => {
        const {state} = useProgress()
        doneProgress()
        doneProgress()
        expect(state.active).toBe(0)
    })

    it('withProgress brackets a promise and always decrements', async () => {
        const {state} = useProgress()
        const p = withProgress(Promise.resolve('x'))
        expect(state.active).toBe(1)
        await expect(p).resolves.toBe('x')
        expect(state.active).toBe(0)
    })

    it('withProgress decrements even on rejection', async () => {
        const {state} = useProgress()
        await expect(withProgress(Promise.reject(new Error('boom')))).rejects.toThrow('boom')
        expect(state.active).toBe(0)
    })
})
