import { ref } from 'vue'

/**
 * Composable for handling drag and drop file operations
 */
export function useDragDrop() {
  const isDragging = ref(false)
  const isValidFile = ref(false)

  /**
   * Validate if file is a valid JSON Lighthouse report
   * @param {File} file - File object to validate
   * @returns {Promise<boolean>} True if valid Lighthouse report
   */
  async function validateFile(file) {
    if (!file) {
      return false
    }

    // Check file type
    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
      return false
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      console.error('File too large')
      return false
    }

    try {
      // Read and parse file to validate structure
      const text = await file.text()
      const json = JSON.parse(text)

      // Check for Lighthouse report markers
      if (!json.lighthouseVersion || !json.categories || !json.audits) {
        return false
      }

      return true
    } catch (error) {
      console.error('File validation error:', error)
      return false
    }
  }

  /**
   * Handle drag enter event
   * @param {DragEvent} event
   */
  function onDragEnter(event) {
    event.preventDefault()
    event.stopPropagation()

    isDragging.value = true

    // Check if dragged items contain files
    if (event.dataTransfer?.items) {
      const hasFiles = Array.from(event.dataTransfer.items).some(
        item => item.kind === 'file'
      )
      isValidFile.value = hasFiles
    }
  }

  /**
   * Handle drag over event (required to allow drop)
   * @param {DragEvent} event
   */
  function onDragOver(event) {
    event.preventDefault()
    event.stopPropagation()
  }

  /**
   * Handle drag leave event
   * @param {DragEvent} event
   */
  function onDragLeave(event) {
    event.preventDefault()
    event.stopPropagation()

    // Only reset if leaving the drop zone entirely
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX
    const y = event.clientY

    if (
      x <= rect.left ||
      x >= rect.right ||
      y <= rect.top ||
      y >= rect.bottom
    ) {
      isDragging.value = false
      isValidFile.value = false
    }
  }

  /**
   * Handle drop event
   * @param {DragEvent} event
   * @param {Function} onFileDropped - Callback function to handle the dropped file
   * @returns {Promise<void>}
   */
  async function onDrop(event, onFileDropped) {
    event.preventDefault()
    event.stopPropagation()

    isDragging.value = false
    isValidFile.value = false

    const files = event.dataTransfer?.files
    if (!files || files.length === 0) {
      return
    }

    // Only handle the first file
    const file = files[0]

    // Validate the file
    const valid = await validateFile(file)
    if (!valid) {
      console.error('Invalid file dropped')
      if (onFileDropped) {
        onFileDropped(null, new Error('Invalid Lighthouse report file'))
      }
      return
    }

    // Pass the file to the callback
    if (onFileDropped) {
      try {
        const text = await file.text()
        const json = JSON.parse(text)
        onFileDropped(json, null, file)
      } catch (error) {
        onFileDropped(null, error)
      }
    }
  }

  /**
   * Handle file input change event
   * @param {Event} event
   * @param {Function} onFileSelected - Callback function to handle the selected file
   * @returns {Promise<void>}
   */
  async function onFileSelect(event, onFileSelected) {
    const files = event.target?.files
    if (!files || files.length === 0) {
      return
    }

    const file = files[0]

    // Validate the file
    const valid = await validateFile(file)
    if (!valid) {
      console.error('Invalid file selected')
      if (onFileSelected) {
        onFileSelected(null, new Error('Invalid Lighthouse report file'))
      }
      return
    }

    // Pass the file to the callback
    if (onFileSelected) {
      try {
        const text = await file.text()
        const json = JSON.parse(text)
        onFileSelected(json, null, file)
      } catch (error) {
        onFileSelected(null, error)
      }
    }
  }

  /**
   * Reset drag state
   */
  function reset() {
    isDragging.value = false
    isValidFile.value = false
  }

  return {
    isDragging,
    isValidFile,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    onFileSelect,
    validateFile,
    reset
  }
}
