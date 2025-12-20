import { ref } from 'vue'

/**
 * Composable for handling LLM streaming responses
 */
export function useStreamingResponse() {
  const content = ref('')
  const isComplete = ref(false)
  const tokens = ref(0)
  const buffer = ref('')

  /**
   * Process a chunk of streaming data
   * Handles both SSE (Server-Sent Events) and newline-delimited JSON formats
   * @param {string} chunk - Raw chunk data
   */
  function processChunk(chunk) {
    if (!chunk) return

    // Add to buffer
    buffer.value += chunk

    // Process complete lines
    const lines = buffer.value.split('\n')

    // Keep the last incomplete line in the buffer
    buffer.value = lines.pop() || ''

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // Handle SSE format (data: {...})
      if (trimmedLine.startsWith('data: ')) {
        const data = trimmedLine.slice(6).trim()

        // Check for completion signal
        if (data === '[DONE]' || data === 'DONE') {
          isComplete.value = true
          continue
        }

        try {
          const parsed = JSON.parse(data)
          processJsonData(parsed)
        } catch (err) {
          // If not JSON, treat as plain text
          content.value += data
          tokens.value++
        }
      }
      // Handle newline-delimited JSON
      else if (trimmedLine.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmedLine)
          processJsonData(parsed)
        } catch (err) {
          console.error('Failed to parse JSON chunk:', err)
        }
      }
      // Handle plain text
      else {
        content.value += trimmedLine + '\n'
        tokens.value++
      }
    }
  }

  /**
   * Process parsed JSON data from various LLM providers
   * @param {object} data - Parsed JSON data
   */
  function processJsonData(data) {
    if (!data) return

    // OpenAI format
    if (data.choices && data.choices[0]) {
      const choice = data.choices[0]

      // Chat completion format
      if (choice.delta?.content) {
        content.value += choice.delta.content
        tokens.value++
      }

      // Completion format
      if (choice.text !== undefined) {
        content.value += choice.text
        tokens.value++
      }

      // Check for finish reason
      if (choice.finish_reason === 'stop' || choice.finish_reason === 'length') {
        isComplete.value = true
      }
    }

    // Anthropic format
    else if (data.type === 'content_block_delta') {
      if (data.delta?.text) {
        content.value += data.delta.text
        tokens.value++
      }
    } else if (data.type === 'message_delta') {
      if (data.delta?.stop_reason) {
        isComplete.value = true
      }
    } else if (data.type === 'message_stop') {
      isComplete.value = true
    }

    // Ollama format
    else if (data.response !== undefined) {
      content.value += data.response
      tokens.value++

      if (data.done === true) {
        isComplete.value = true
      }
    }

    // Generic content field
    else if (data.content !== undefined) {
      content.value += data.content
      tokens.value++
    }

    // Generic text field
    else if (data.text !== undefined) {
      content.value += data.text
      tokens.value++
    }

    // Check for generic completion signals
    if (data.done === true || data.finished === true || data.complete === true) {
      isComplete.value = true
    }
  }

  /**
   * Process raw text content (non-streaming)
   * @param {string} text - Raw text content
   */
  function processText(text) {
    if (!text) return

    content.value += text
    tokens.value += text.split(/\s+/).length
  }

  /**
   * Set content directly (for non-streaming responses)
   * @param {string} text - Full response text
   */
  function setContent(text) {
    content.value = text || ''
    tokens.value = text ? text.split(/\s+/).length : 0
    isComplete.value = true
  }

  /**
   * Append content to existing content
   * @param {string} text - Text to append
   */
  function appendContent(text) {
    if (!text) return

    content.value += text
    const wordCount = text.split(/\s+/).length
    tokens.value += wordCount
  }

  /**
   * Mark streaming as complete
   */
  function complete() {
    isComplete.value = true

    // Process any remaining buffer
    if (buffer.value.trim()) {
      content.value += buffer.value
      buffer.value = ''
    }
  }

  /**
   * Reset all state
   */
  function reset() {
    content.value = ''
    isComplete.value = false
    tokens.value = 0
    buffer.value = ''
  }

  /**
   * Get current state snapshot
   * @returns {object} Current state
   */
  function getState() {
    return {
      content: content.value,
      isComplete: isComplete.value,
      tokens: tokens.value
    }
  }

  return {
    content,
    isComplete,
    tokens,
    processChunk,
    processText,
    setContent,
    appendContent,
    complete,
    reset,
    getState
  }
}
