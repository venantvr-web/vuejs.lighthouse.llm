import {describe, expect, it} from 'vitest'
import {useConfirm} from '@/composables/useConfirm'

describe('useConfirm', () => {
    it('ouvre le dialogue et expose les options passées', () => {
        const {state, confirm, settle} = useConfirm()
        confirm({message: 'Supprimer ?', confirmLabel: 'Supprimer', danger: true})
        expect(state.open).toBe(true)
        expect(state.message).toBe('Supprimer ?')
        expect(state.confirmLabel).toBe('Supprimer')
        expect(state.danger).toBe(true)
        settle(false) // referme pour ne pas fuiter l'état entre tests
    })

    it('résout la promesse à true puis ferme', async () => {
        const {state, confirm, settle} = useConfirm()
        const p = confirm({message: 'ok ?'})
        settle(true)
        await expect(p).resolves.toBe(true)
        expect(state.open).toBe(false)
    })

    it('résout à false sur annulation', async () => {
        const {confirm, settle} = useConfirm()
        const p = confirm({message: 'ok ?'})
        settle(false)
        await expect(p).resolves.toBe(false)
    })

    it('danger vaut true par défaut, false si demandé', () => {
        const {state, confirm, settle} = useConfirm()
        confirm({message: 'x'})
        expect(state.danger).toBe(true)
        confirm({message: 'x', danger: false})
        expect(state.danger).toBe(false)
        settle(false)
    })
})
