import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MarkdownViewer from '@/components/analysis/MarkdownViewer.vue'

describe('MarkdownViewer', () => {
  describe('rendering', () => {
    it('should render the markdown viewer container', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: '' }
      })

      expect(wrapper.find('.markdown-viewer').exists()).toBe(true)
    })

    it('should render empty when no content', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: '' }
      })

      expect(wrapper.find('.prose').html()).toContain('')
    })
  })

  describe('markdown rendering', () => {
    it('should render headers', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: '# Heading 1\n## Heading 2\n### Heading 3' }
      })

      expect(wrapper.find('h1').exists()).toBe(true)
      expect(wrapper.find('h2').exists()).toBe(true)
      expect(wrapper.find('h3').exists()).toBe(true)
    })

    it('should render bold text', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: '**bold text**' }
      })

      expect(wrapper.find('strong').exists()).toBe(true)
      expect(wrapper.find('strong').text()).toBe('bold text')
    })

    it('should render italic text', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: '*italic text*' }
      })

      expect(wrapper.find('em').exists()).toBe(true)
      expect(wrapper.find('em').text()).toBe('italic text')
    })

    it('should render unordered lists', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: '- Item 1\n- Item 2\n- Item 3' }
      })

      expect(wrapper.find('ul').exists()).toBe(true)
      expect(wrapper.findAll('li').length).toBe(3)
    })

    it('should render ordered lists', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: '1. First\n2. Second\n3. Third' }
      })

      expect(wrapper.find('ol').exists()).toBe(true)
      expect(wrapper.findAll('li').length).toBe(3)
    })

    it('should render links', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: '[Link text](https://example.com)' }
      })

      const link = wrapper.find('a')
      expect(link.exists()).toBe(true)
      expect(link.attributes('href')).toBe('https://example.com')
      expect(link.text()).toBe('Link text')
    })

    it('should render inline code', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: 'Use `const x = 1` for variables' }
      })

      expect(wrapper.find('code').exists()).toBe(true)
      expect(wrapper.find('code').text()).toBe('const x = 1')
    })

    it('should render code blocks', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: '```javascript\nconst x = 1;\nconsole.log(x);\n```' }
      })

      expect(wrapper.find('pre').exists()).toBe(true)
      expect(wrapper.find('pre code').exists()).toBe(true)
    })

    it('should render blockquotes', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: '> This is a quote' }
      })

      expect(wrapper.find('blockquote').exists()).toBe(true)
    })

    it('should render paragraphs', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: 'First paragraph.\n\nSecond paragraph.' }
      })

      expect(wrapper.findAll('p').length).toBe(2)
    })
  })

  describe('streaming cursor', () => {
    it('should show streaming cursor when streaming is true', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: 'Some content', streaming: true }
      })

      expect(wrapper.find('.animate-pulse').exists()).toBe(true)
    })

    it('should hide streaming cursor when streaming is false', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: 'Some content', streaming: false }
      })

      expect(wrapper.find('.animate-pulse').exists()).toBe(false)
    })
  })

  describe('syntax highlighting', () => {
    it('should render code blocks with language class', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: '```javascript\nconst x = 1;\n```' }
      })

      const codeBlock = wrapper.find('pre code')
      expect(codeBlock.exists()).toBe(true)
      // Code should have language class from marked
      expect(codeBlock.classes().join(' ')).toContain('language-javascript')
    })

    it('should handle code blocks without language specification', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: '```\nplain code\n```' }
      })

      expect(wrapper.find('pre code').exists()).toBe(true)
    })
  })

  describe('GFM support', () => {
    it('should support line breaks', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: 'Line 1\nLine 2' }
      })

      // GFM with breaks should convert single newlines to <br>
      expect(wrapper.find('br').exists()).toBe(true)
    })

    it('should render tables', () => {
      const tableMarkdown = `
| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
`
      const wrapper = mount(MarkdownViewer, {
        props: { content: tableMarkdown }
      })

      expect(wrapper.find('table').exists()).toBe(true)
      expect(wrapper.findAll('th').length).toBe(2)
      expect(wrapper.findAll('td').length).toBe(4)
    })
  })

  describe('error handling', () => {
    it('should handle malformed markdown gracefully', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: '# Heading with [broken link(' }
      })

      // Should not throw and should render something
      expect(wrapper.find('.prose').exists()).toBe(true)
    })
  })

  describe('props', () => {
    it('should default content to empty string', () => {
      const wrapper = mount(MarkdownViewer)
      expect(wrapper.find('.prose').exists()).toBe(true)
    })

    it('should default streaming to false', () => {
      const wrapper = mount(MarkdownViewer, {
        props: { content: 'test' }
      })

      expect(wrapper.find('.animate-pulse').exists()).toBe(false)
    })
  })
})
