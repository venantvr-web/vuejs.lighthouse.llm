import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import Sparkline from '@/components/common/Sparkline.vue'

describe('Sparkline', () => {
    it('renders a polyline with one point per value', () => {
        const w = mount(Sparkline, {props: {values: [10, 50, 90]}})
        const polyline = w.find('polyline')
        expect(polyline.exists()).toBe(true)
        expect(polyline.attributes('points').trim().split(/\s+/)).toHaveLength(3)
    })

    it('marks the last data point with a circle', () => {
        const w = mount(Sparkline, {props: {values: [10, 90]}})
        expect(w.find('circle').exists()).toBe(true)
    })

    it('renders a dashed baseline when there is no data', () => {
        const w = mount(Sparkline, {props: {values: []}})
        expect(w.find('polyline').exists()).toBe(false)
        expect(w.find('line').exists()).toBe(true)
    })

    it('ignores non-numeric values', () => {
        const w = mount(Sparkline, {props: {values: [10, null, NaN, 80]}})
        const polyline = w.find('polyline')
        expect(polyline.attributes('points').trim().split(/\s+/)).toHaveLength(2)
    })

    it('applies the provided color', () => {
        const w = mount(Sparkline, {props: {values: [10, 20], color: '#ff0000'}})
        expect(w.find('polyline').attributes('stroke')).toBe('#ff0000')
    })
})
