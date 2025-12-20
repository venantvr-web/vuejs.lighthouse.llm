import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DropZone from '@/components/upload/DropZone.vue'

describe('DropZone', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(DropZone)
  })

  describe('rendering', () => {
    it('should render the dropzone', () => {
      expect(wrapper.find('.rounded-2xl').exists()).toBe(true)
    })

    it('should have hidden file input', () => {
      const input = wrapper.find('input[type="file"]')
      expect(input.exists()).toBe(true)
      expect(input.classes()).toContain('hidden')
    })

    it('should accept .json files only', () => {
      const input = wrapper.find('input[type="file"]')
      expect(input.attributes('accept')).toBe('.json')
    })

    it('should show import instructions initially', () => {
      expect(wrapper.text()).toContain('Importez un rapport Lighthouse')
      expect(wrapper.text()).toContain('Glissez-déposez')
    })
  })

  describe('drag and drop behavior', () => {
    it('should update isDragging on dragenter', async () => {
      const dropzone = wrapper.find('.rounded-2xl')
      await dropzone.trigger('dragenter')

      // When dragging, the scale transform class is applied
      expect(dropzone.classes().join(' ')).toContain('scale-')
    })

    it('should reset isDragging on dragleave when counter reaches 0', async () => {
      const dropzone = wrapper.find('.rounded-2xl')

      await dropzone.trigger('dragenter')
      await dropzone.trigger('dragenter')
      await dropzone.trigger('dragleave')
      // Still dragging (counter = 1) - scale class is still applied
      expect(dropzone.classes().join(' ')).toContain('scale-')

      await dropzone.trigger('dragleave')
      // No longer dragging (counter = 0) - border-gray-300 class appears when not dragging
      expect(dropzone.classes().join(' ')).toContain('border-gray-300')
      expect(dropzone.classes().join(' ')).not.toContain('scale-')
    })

    it('should handle dragover event', async () => {
      const dropzone = wrapper.find('.rounded-2xl')
      // Just verify the event can be triggered without errors
      await dropzone.trigger('dragover')
      // Component should still be mounted and functional
      expect(dropzone.exists()).toBe(true)
    })
  })

  describe('file selection via input', () => {
    it('should emit events on valid Lighthouse file selection', async () => {
      const validReport = {
        lighthouseVersion: '12.0.0',
        categories: { performance: { score: 0.85 } }
      }

      const file = new File(
        [JSON.stringify(validReport)],
        'lighthouse-report.json',
        { type: 'application/json' }
      )

      const input = wrapper.find('input[type="file"]')

      Object.defineProperty(input.element, 'files', {
        value: [file],
        writable: false
      })

      await input.trigger('change')

      // Wait for async file processing
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.emitted('file-selected')).toBeTruthy()
      expect(wrapper.emitted('report-loaded')).toBeTruthy()
      expect(wrapper.emitted('report-loaded')[0][0]).toEqual(validReport)
    })

    it('should show error for non-JSON files', async () => {
      const file = new File(
        ['not json'],
        'report.txt',
        { type: 'text/plain' }
      )

      const input = wrapper.find('input[type="file"]')

      Object.defineProperty(input.element, 'files', {
        value: [file],
        writable: false
      })

      await input.trigger('change')
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('Veuillez sélectionner un fichier JSON')
      expect(wrapper.emitted('file-selected')).toBeFalsy()
    })

    it('should show error for invalid Lighthouse report', async () => {
      const invalidReport = { notLighthouse: true }

      const file = new File(
        [JSON.stringify(invalidReport)],
        'report.json',
        { type: 'application/json' }
      )

      const input = wrapper.find('input[type="file"]')

      Object.defineProperty(input.element, 'files', {
        value: [file],
        writable: false
      })

      await input.trigger('change')
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('ne semble pas etre un rapport Lighthouse valide')
      expect(wrapper.emitted('report-loaded')).toBeFalsy()
    })

    it('should show error for malformed JSON', async () => {
      const file = new File(
        ['{ invalid json'],
        'report.json',
        { type: 'application/json' }
      )

      const input = wrapper.find('input[type="file"]')

      Object.defineProperty(input.element, 'files', {
        value: [file],
        writable: false
      })

      await input.trigger('change')
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('Erreur lors de la lecture')
    })
  })

  describe('file loaded state', () => {
    it('should display filename when file is loaded', async () => {
      const validReport = {
        lighthouseVersion: '12.0.0',
        categories: { performance: { score: 0.85 } }
      }

      const file = new File(
        [JSON.stringify(validReport)],
        'my-lighthouse-report.json',
        { type: 'application/json' }
      )

      const input = wrapper.find('input[type="file"]')

      Object.defineProperty(input.element, 'files', {
        value: [file],
        writable: false
      })

      await input.trigger('change')
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('my-lighthouse-report.json')
    })

    it('should have a clear button when file is loaded', async () => {
      const validReport = {
        lighthouseVersion: '12.0.0',
        categories: { performance: { score: 0.85 } }
      }

      const file = new File(
        [JSON.stringify(validReport)],
        'report.json',
        { type: 'application/json' }
      )

      const input = wrapper.find('input[type="file"]')

      Object.defineProperty(input.element, 'files', {
        value: [file],
        writable: false
      })

      await input.trigger('change')
      await new Promise(resolve => setTimeout(resolve, 100))

      const clearButton = wrapper.find('button')
      expect(clearButton.exists()).toBe(true)

      await clearButton.trigger('click')

      // Should return to initial state
      expect(wrapper.text()).toContain('Importez un rapport Lighthouse')
    })
  })

  describe('drop handler', () => {
    it('should reset drag state on drop', async () => {
      const dropzone = wrapper.find('.rounded-2xl')

      await dropzone.trigger('dragenter')
      // When dragging, scale class is applied
      expect(dropzone.classes().join(' ')).toContain('scale-')

      const validReport = {
        lighthouseVersion: '12.0.0',
        categories: { performance: { score: 0.85 } }
      }

      const file = new File(
        [JSON.stringify(validReport)],
        'report.json',
        { type: 'application/json' }
      )

      await dropzone.trigger('drop', {
        dataTransfer: { files: [file] }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      // After drop, isDragging should be false - check for the non-dragging state
      // The border-gray-300 class is present when not dragging
      expect(dropzone.classes().join(' ')).toContain('border-gray-300')
    })
  })
})
