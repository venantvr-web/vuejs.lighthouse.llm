import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import StreamingOutput from '@/components/analysis/StreamingOutput.vue'
import MarkdownViewer from '@/components/analysis/MarkdownViewer.vue'

// Mock clipboard API globally
const mockWriteText = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText
  },
  writable: true,
  configurable: true
})

describe('StreamingOutput', () => {
  beforeEach(() => {
    mockWriteText.mockClear()
  })

  describe('rendering', () => {
    it('should render the card container', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: '' }
      })

      expect(wrapper.find('.card').exists()).toBe(true)
    })

    it('should show empty state when no content and not streaming', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: '', isStreaming: false }
      })

      expect(wrapper.text()).toContain('Sélectionnez une catégorie')
    })

    it('should show MarkdownViewer when content is present', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: '# Hello' },
        global: {
          components: { MarkdownViewer }
        }
      })

      expect(wrapper.findComponent(MarkdownViewer).exists()).toBe(true)
    })
  })

  describe('streaming state', () => {
    it('should show streaming indicator when isStreaming is true', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: 'test', isStreaming: true }
      })

      expect(wrapper.text()).toContain('Generation en cours')
      expect(wrapper.find('.animate-ping').exists()).toBe(true)
    })

    it('should show cancel button during streaming', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: 'test', isStreaming: true }
      })

      const cancelButton = wrapper.findAll('button').find(btn => btn.text().includes('Arreter'))
      expect(cancelButton).toBeDefined()
    })

    it('should emit cancel event when cancel button clicked', async () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: 'test', isStreaming: true }
      })

      const cancelButton = wrapper.findAll('button').find(btn => btn.text().includes('Arreter'))
      await cancelButton.trigger('click')

      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('should show progress bar during streaming', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: 'test', isStreaming: true }
      })

      expect(wrapper.find('.animate-shimmer').exists()).toBe(true)
    })

    it('should hide progress bar when not streaming', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: 'test', isStreaming: false }
      })

      expect(wrapper.find('.animate-shimmer').exists()).toBe(false)
    })
  })

  describe('token count', () => {
    it('should display token count when content exists and not streaming', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: 'test', isStreaming: false, tokenCount: 150 }
      })

      expect(wrapper.text()).toContain('150 tokens')
    })

    it('should not display token count when streaming', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: 'test', isStreaming: true, tokenCount: 150 }
      })

      expect(wrapper.text()).not.toContain('150 tokens')
    })
  })

  describe('action buttons', () => {
    describe('copy button', () => {
      it('should show copy button when content exists and not streaming', () => {
        const wrapper = mount(StreamingOutput, {
          props: { content: 'test', isStreaming: false }
        })

        const copyButton = wrapper.findAll('button').find(btn => btn.text().includes('Copier'))
        expect(copyButton).toBeDefined()
      })

      it('should not show copy button during streaming', () => {
        const wrapper = mount(StreamingOutput, {
          props: { content: 'test', isStreaming: true }
        })

        const copyButton = wrapper.findAll('button').find(btn => btn.text().includes('Copier'))
        expect(copyButton).toBeUndefined()
      })

      it('should copy content to clipboard and emit event', async () => {
        vi.useFakeTimers()

        const wrapper = mount(StreamingOutput, {
          props: { content: 'test content', isStreaming: false }
        })

        const copyButton = wrapper.findAll('button').find(btn => btn.text().includes('Copier'))
        await copyButton.trigger('click')
        await flushPromises()

        expect(mockWriteText).toHaveBeenCalledWith('test content')
        expect(wrapper.emitted('copy')).toBeTruthy()
        expect(wrapper.text()).toContain('Copie!')

        vi.useRealTimers()
      })

      it('should reset copy state after 2 seconds', async () => {
        vi.useFakeTimers()

        const wrapper = mount(StreamingOutput, {
          props: { content: 'test', isStreaming: false }
        })

        const copyButton = wrapper.findAll('button').find(btn => btn.text().includes('Copier'))
        await copyButton.trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('Copie!')

        await vi.advanceTimersByTimeAsync(2000)

        expect(wrapper.text()).toContain('Copier')

        vi.useRealTimers()
      })
    })

    describe('export button', () => {
      it('should show export button when content exists and not streaming', () => {
        const wrapper = mount(StreamingOutput, {
          props: { content: 'test', isStreaming: false }
        })

        const exportButton = wrapper.findAll('button').find(btn => btn.text().includes('Exporter'))
        expect(exportButton).toBeDefined()
      })

      it('should not show export button during streaming', () => {
        const wrapper = mount(StreamingOutput, {
          props: { content: 'test', isStreaming: true }
        })

        const exportButton = wrapper.findAll('button').find(btn => btn.text().includes('Exporter'))
        expect(exportButton).toBeUndefined()
      })

      it('should emit export event when clicked', async () => {
        const wrapper = mount(StreamingOutput, {
          props: { content: 'test', isStreaming: false }
        })

        const exportButton = wrapper.findAll('button').find(btn => btn.text().includes('Exporter'))
        await exportButton.trigger('click')

        expect(wrapper.emitted('export')).toBeTruthy()
      })
    })
  })

  describe('props', () => {
    it('should default content to empty string', () => {
      const wrapper = mount(StreamingOutput)
      expect(wrapper.text()).toContain('Sélectionnez une catégorie')
    })

    it('should default isStreaming to false', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: '' }
      })

      expect(wrapper.find('.animate-ping').exists()).toBe(false)
    })

    it('should default tokenCount to 0', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: 'test', isStreaming: false }
      })

      expect(wrapper.text()).toContain('0 tokens')
    })
  })

  describe('auto-scroll', () => {
    it('should have overflow-auto class for scrolling', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: 'test' }
      })

      expect(wrapper.find('.overflow-auto').exists()).toBe(true)
    })

    it('should have max-height limit', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: 'test' }
      })

      expect(wrapper.find('.max-h-\\[600px\\]').exists()).toBe(true)
    })
  })

  describe('MarkdownViewer integration', () => {
    it('should pass content to MarkdownViewer', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: '# Title', isStreaming: false },
        global: {
          components: { MarkdownViewer }
        }
      })

      const markdownViewer = wrapper.findComponent(MarkdownViewer)
      expect(markdownViewer.props('content')).toBe('# Title')
    })

    it('should pass streaming state to MarkdownViewer', () => {
      const wrapper = mount(StreamingOutput, {
        props: { content: 'test', isStreaming: true },
        global: {
          components: { MarkdownViewer }
        }
      })

      const markdownViewer = wrapper.findComponent(MarkdownViewer)
      expect(markdownViewer.props('streaming')).toBe(true)
    })
  })
})
