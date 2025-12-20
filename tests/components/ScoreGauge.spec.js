import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import ScoreGauge from '@/components/dashboard/ScoreGauge.vue'

describe('ScoreGauge', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('rendering', () => {
        it('should render the gauge', () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 85}
            })

            expect(wrapper.find('svg').exists()).toBe(true)
            expect(wrapper.findAll('circle').length).toBe(2)
        })

        it('should display the label if provided', () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 85, label: 'Performance'}
            })

            expect(wrapper.text()).toContain('Performance')
        })

        it('should not display label if not provided', () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 85}
            })

            // Only score should be visible, no label
            expect(wrapper.findAll('span').length).toBe(1) // Only score span
        })
    })

    describe('size variants', () => {
        it('should apply sm size classes', () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 85, size: 'sm'}
            })

            expect(wrapper.find('.w-20').exists()).toBe(true)
            expect(wrapper.find('.h-20').exists()).toBe(true)
        })

        it('should apply md size classes by default', () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 85}
            })

            expect(wrapper.find('.w-32').exists()).toBe(true)
            expect(wrapper.find('.h-32').exists()).toBe(true)
        })

        it('should apply lg size classes', () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 85, size: 'lg'}
            })

            expect(wrapper.find('.w-40').exists()).toBe(true)
            expect(wrapper.find('.h-40').exists()).toBe(true)
        })
    })

    describe('score colors', () => {
        it('should use green color for score >= 90', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 95, animated: false}
            })

            await vi.advanceTimersByTimeAsync(200)

            const scoreCircle = wrapper.findAll('circle')[1]
            expect(scoreCircle.attributes('stroke')).toBe('#0cce6b')
        })

        it('should use orange color for score 50-89', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 75, animated: false}
            })

            await vi.advanceTimersByTimeAsync(200)

            const scoreCircle = wrapper.findAll('circle')[1]
            expect(scoreCircle.attributes('stroke')).toBe('#ffa400')
        })

        it('should use red color for score < 50', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 30, animated: false}
            })

            await vi.advanceTimersByTimeAsync(200)

            const scoreCircle = wrapper.findAll('circle')[1]
            expect(scoreCircle.attributes('stroke')).toBe('#ff4e42')
        })
    })

    describe('score text classes', () => {
        it('should apply green text class for high scores', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 92, animated: false}
            })

            await vi.advanceTimersByTimeAsync(200)

            expect(wrapper.find('.text-lighthouse-green').exists()).toBe(true)
        })

        it('should apply orange text class for medium scores', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 65, animated: false}
            })

            await vi.advanceTimersByTimeAsync(200)

            expect(wrapper.find('.text-lighthouse-orange').exists()).toBe(true)
        })

        it('should apply red text class for low scores', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 25, animated: false}
            })

            await vi.advanceTimersByTimeAsync(200)

            expect(wrapper.find('.text-lighthouse-red').exists()).toBe(true)
        })
    })

    describe('score background classes', () => {
        it('should apply green bg class for high scores', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 95, animated: false}
            })

            await vi.advanceTimersByTimeAsync(200)

            expect(wrapper.find('.bg-lighthouse-green\\/10').exists()).toBe(true)
        })

        it('should apply orange bg class for medium scores', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 70, animated: false}
            })

            await vi.advanceTimersByTimeAsync(200)

            expect(wrapper.find('.bg-lighthouse-orange\\/10').exists()).toBe(true)
        })

        it('should apply red bg class for low scores', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 20, animated: false}
            })

            await vi.advanceTimersByTimeAsync(200)

            expect(wrapper.find('.bg-lighthouse-red\\/10').exists()).toBe(true)
        })
    })

    describe('animation', () => {
        it('should animate score when animated prop is true', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 100, animated: true}
            })

            // Initially score should be 0
            expect(wrapper.text()).toContain('0')

            // After timeout and animation start
            await vi.advanceTimersByTimeAsync(200)

            // During animation
            await vi.advanceTimersByTimeAsync(500)

            // Score should be progressing (not 0 anymore)
            const currentScore = parseInt(wrapper.find('.tabular-nums').text())
            expect(currentScore).toBeGreaterThan(0)
        })

        it('should set score immediately when animated is false', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 85, animated: false}
            })

            await vi.advanceTimersByTimeAsync(200)

            expect(wrapper.text()).toContain('85')
        })
    })

    describe('stroke calculations', () => {
        it('should have correct circumference', () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 50, animated: false}
            })

            // circumference = 2 * PI * 45 ≈ 282.74
            const expectedCircumference = 2 * Math.PI * 45

            const circle = wrapper.findAll('circle')[1]
            expect(circle.attributes('stroke-dasharray')).toBe(String(expectedCircumference))
        })

        it('should have correct stroke offset for 50% score', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 50, animated: false}
            })

            await vi.advanceTimersByTimeAsync(200)

            const circumference = 2 * Math.PI * 45
            const expectedOffset = circumference * 0.5 // 50% = 0.5 offset

            const circle = wrapper.findAll('circle')[1]
            expect(parseFloat(circle.attributes('stroke-dashoffset'))).toBeCloseTo(expectedOffset, 0)
        })

        it('should have 0 offset for 100% score', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 100, animated: false}
            })

            await vi.advanceTimersByTimeAsync(200)

            const circle = wrapper.findAll('circle')[1]
            expect(parseFloat(circle.attributes('stroke-dashoffset'))).toBeCloseTo(0, 0)
        })
    })

    describe('score prop changes', () => {
        it('should update when score prop changes', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 50, animated: false}
            })

            await vi.advanceTimersByTimeAsync(200)
            expect(wrapper.text()).toContain('50')

            await wrapper.setProps({score: 90})
            await vi.advanceTimersByTimeAsync(200)

            expect(wrapper.text()).toContain('90')
        })
    })

    describe('default props', () => {
        it('should default to 0 score', () => {
            const wrapper = mount(ScoreGauge, {
                props: {}
            })

            // Component should render without errors
            expect(wrapper.find('svg').exists()).toBe(true)
        })

        it('should default to md size', () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 50}
            })

            expect(wrapper.find('.w-32').exists()).toBe(true)
        })

        it('should default to animated true', async () => {
            const wrapper = mount(ScoreGauge, {
                props: {score: 100}
            })

            // Initially should be 0 (animation not started)
            expect(wrapper.text()).toContain('0')
        })
    })
})
