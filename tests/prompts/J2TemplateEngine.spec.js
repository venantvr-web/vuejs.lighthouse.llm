import { describe, it, expect, beforeEach, vi } from 'vitest'
import { J2TemplateEngine } from '@/prompts/J2TemplateEngine.js'

describe('J2TemplateEngine', () => {
  let engine

  beforeEach(() => {
    engine = new J2TemplateEngine()
  })

  describe('constructor', () => {
    it('should initialize with built-in filters', () => {
      expect(engine.filters.size).toBeGreaterThan(0)
      expect(engine.filters.has('score')).toBe(true)
      expect(engine.filters.has('metric')).toBe(true)
      expect(engine.filters.has('size')).toBe(true)
    })
  })

  describe('registerFilter', () => {
    it('should register a custom filter', () => {
      engine.registerFilter('double', (value) => value * 2)
      expect(engine.filters.has('double')).toBe(true)
    })

    it('should throw error for non-function filter', () => {
      expect(() => engine.registerFilter('invalid', 'not a function'))
        .toThrow("Filter 'invalid' must be a function")
    })
  })

  describe('compile', () => {
    it('should throw error for non-string template', () => {
      expect(() => engine.compile(123)).toThrow('Template must be a string')
      expect(() => engine.compile(null)).toThrow('Template must be a string')
    })

    it('should return trimmed result', () => {
      const result = engine.compile('  Hello World  ', {})
      expect(result).toBe('Hello World')
    })

    it('should allow maximum 1 empty line', () => {
      // 5 newlines -> 2 newlines (1 empty line max)
      const result = engine.compile('Line1\n\n\n\n\nLine2', {})
      expect(result).toBe('Line1\n\nLine2')
    })

    it('should collapse 3+ newlines to 2', () => {
      // 3 newlines -> 2 newlines
      const result = engine.compile('Line1\n\n\nLine2', {})
      expect(result).toBe('Line1\n\nLine2')
    })

    it('should remove trailing whitespace on lines', () => {
      const result = engine.compile('Line1   \nLine2\t\t\nLine3', {})
      expect(result).toBe('Line1\nLine2\nLine3')
    })

    it('should remove lines with only whitespace', () => {
      const result = engine.compile('Line1\n   \nLine2', {})
      expect(result).toBe('Line1\n\nLine2')
    })
  })

  describe('variable interpolation', () => {
    it('should interpolate simple variables', () => {
      const result = engine.compile('Hello {{ name }}!', { name: 'World' })
      expect(result).toBe('Hello World!')
    })

    it('should handle multiple variables', () => {
      const result = engine.compile('{{ greeting }} {{ name }}!', {
        greeting: 'Hello',
        name: 'World'
      })
      expect(result).toBe('Hello World!')
    })

    it('should handle nested variables with dot notation', () => {
      const result = engine.compile('Score: {{ metrics.lcp }}', {
        metrics: { lcp: 2500 }
      })
      expect(result).toBe('Score: 2500')
    })

    it('should handle deeply nested variables', () => {
      const result = engine.compile('{{ a.b.c.d }}', {
        a: { b: { c: { d: 'deep' } } }
      })
      expect(result).toBe('deep')
    })

    it('should return empty string for undefined variables', () => {
      const result = engine.compile('Value: {{ undefined_var }}', {})
      expect(result).toBe('Value:')
    })

    it('should return empty string for null values', () => {
      const result = engine.compile('Value: {{ value }}', { value: null })
      expect(result).toBe('Value:')
    })

    it('should handle numeric values', () => {
      const result = engine.compile('Count: {{ count }}', { count: 42 })
      expect(result).toBe('Count: 42')
    })

    it('should handle boolean values', () => {
      const result = engine.compile('Active: {{ active }}', { active: true })
      expect(result).toBe('Active: true')
    })
  })

  describe('built-in filters', () => {
    describe('score filter', () => {
      it('should format good score (>=90)', () => {
        const result = engine.compile('{{ value | score }}', { value: 0.95 })
        expect(result).toBe('95% ✅ Bon')
      })

      it('should format medium score (50-89)', () => {
        const result = engine.compile('{{ value | score }}', { value: 0.75 })
        expect(result).toBe('75% ⚠️ Moyen')
      })

      it('should format low score (<50)', () => {
        const result = engine.compile('{{ value | score }}', { value: 0.30 })
        expect(result).toBe('30% ❌ Faible')
      })

      it('should return N/A for null value', () => {
        const result = engine.compile('{{ value | score }}', { value: null })
        expect(result).toBe('N/A')
      })

      it('should handle already percentage values', () => {
        const result = engine.compile('{{ value | score }}', { value: 95 })
        expect(result).toBe('95% ✅ Bon')
      })
    })

    describe('metric filter', () => {
      it('should format milliseconds', () => {
        const result = engine.compile('{{ value | metric }}', { value: 150 })
        expect(result).toBe('150ms')
      })

      it('should format seconds for values >= 1000', () => {
        const result = engine.compile('{{ value | metric }}', { value: 2500 })
        expect(result).toBe('2.50s')
      })

      it('should return string values as-is', () => {
        const result = engine.compile('{{ value | metric }}', { value: '2.5 s' })
        expect(result).toBe('2.5 s')
      })

      it('should return N/A for null', () => {
        const result = engine.compile('{{ value | metric }}', { value: null })
        expect(result).toBe('N/A')
      })
    })

    describe('size filter', () => {
      it('should format bytes', () => {
        const result = engine.compile('{{ value | size }}', { value: 500 })
        expect(result).toBe('500B')
      })

      it('should format kilobytes', () => {
        const result = engine.compile('{{ value | size }}', { value: 2048 })
        expect(result).toBe('2.0KB')
      })

      it('should format megabytes', () => {
        const result = engine.compile('{{ value | size }}', { value: 1500000 })
        expect(result).toBe('1.43MB')
      })

      it('should return N/A for null', () => {
        const result = engine.compile('{{ value | size }}', { value: null })
        expect(result).toBe('N/A')
      })
    })

    describe('list filter', () => {
      it('should format array as bullet list', () => {
        const result = engine.compile('{{ items | list }}', {
          items: ['Item 1', 'Item 2', 'Item 3']
        })
        expect(result).toBe('- Item 1\n- Item 2\n- Item 3')
      })

      it('should handle objects with title property', () => {
        const result = engine.compile('{{ items | list }}', {
          items: [{ title: 'First' }, { title: 'Second' }]
        })
        expect(result).toBe('- First\n- Second')
      })

      it('should handle objects with name property', () => {
        const result = engine.compile('{{ items | list }}', {
          items: [{ name: 'Alpha' }, { name: 'Beta' }]
        })
        expect(result).toBe('- Alpha\n- Beta')
      })

      it('should return message for empty array', () => {
        const result = engine.compile('{{ items | list }}', { items: [] })
        expect(result).toBe('Aucun élément')
      })

      it('should return message for non-array', () => {
        const result = engine.compile('{{ items | list }}', { items: 'string' })
        expect(result).toBe('Aucun élément')
      })
    })

    describe('prioritize filter', () => {
      it('should sort by score and add icons', () => {
        const result = engine.compile('{{ items | prioritize }}', {
          items: [
            { title: 'Good', score: 0.95 },
            { title: 'Bad', score: 0.30 },
            { title: 'Medium', score: 0.70 }
          ]
        })
        expect(result).toContain('1. ❌ **Bad**')
        expect(result).toContain('2. ⚠️ **Medium**')
        expect(result).toContain('3. ✅ **Good**')
      })

      it('should return message for empty array', () => {
        const result = engine.compile('{{ items | prioritize }}', { items: [] })
        expect(result).toBe('Aucun élément')
      })
    })

    describe('json filter', () => {
      it('should stringify object', () => {
        const result = engine.compile('{{ data | json }}', {
          data: { key: 'value' }
        })
        expect(result).toContain('"key": "value"')
      })
    })

    describe('upper and lower filters', () => {
      it('should convert to uppercase', () => {
        const result = engine.compile('{{ text | upper }}', { text: 'hello' })
        expect(result).toBe('HELLO')
      })

      it('should convert to lowercase', () => {
        const result = engine.compile('{{ text | lower }}', { text: 'HELLO' })
        expect(result).toBe('hello')
      })
    })

    describe('default filter', () => {
      it('should use default value for undefined', () => {
        const result = engine.compile('{{ value | default }}', {})
        expect(result).toBe('N/A')
      })

      it('should keep existing value', () => {
        const result = engine.compile('{{ value | default }}', { value: 'exists' })
        expect(result).toBe('exists')
      })
    })

    describe('length filter', () => {
      it('should return array length', () => {
        const result = engine.compile('{{ items | length }}', {
          items: [1, 2, 3]
        })
        expect(result).toBe('3')
      })

      it('should return string length', () => {
        const result = engine.compile('{{ text | length }}', { text: 'hello' })
        expect(result).toBe('5')
      })

      it('should return 0 for non-array/string', () => {
        const result = engine.compile('{{ value | length }}', { value: 123 })
        expect(result).toBe('0')
      })
    })

    describe('first and last filters', () => {
      it('should return first item', () => {
        const result = engine.compile('{{ items | first }}', {
          items: ['a', 'b', 'c']
        })
        expect(result).toBe('a')
      })

      it('should return last item', () => {
        const result = engine.compile('{{ items | last }}', {
          items: ['a', 'b', 'c']
        })
        expect(result).toBe('c')
      })
    })

    describe('join filter', () => {
      it('should join array with default separator', () => {
        const result = engine.compile('{{ items | join }}', {
          items: ['a', 'b', 'c']
        })
        expect(result).toBe('a, b, c')
      })

      it('should return non-array values as-is', () => {
        const result = engine.compile('{{ value | join }}', { value: 'string' })
        expect(result).toBe('string')
      })
    })

    describe('truncate filter', () => {
      it('should truncate long strings', () => {
        const result = engine.compile('{{ text | truncate(10) }}', {
          text: 'This is a very long string'
        })
        expect(result).toBe('This is a ...')
      })

      it('should not truncate short strings', () => {
        const result = engine.compile('{{ text | truncate(100) }}', {
          text: 'Short'
        })
        expect(result).toBe('Short')
      })
    })

    describe('round filter', () => {
      it('should round to integer by default', () => {
        const result = engine.compile('{{ value | round }}', { value: 3.7 })
        expect(result).toBe('4')
      })

      it('should round to specified decimals', () => {
        const result = engine.compile('{{ value | round(2) }}', { value: 3.14159 })
        expect(result).toBe('3.14')
      })

      it('should return non-numbers as-is', () => {
        const result = engine.compile('{{ value | round }}', { value: 'text' })
        expect(result).toBe('text')
      })
    })

    describe('chained filters', () => {
      it('should apply multiple filters in sequence', () => {
        const result = engine.compile('{{ text | upper | truncate(5) }}', {
          text: 'hello world'
        })
        expect(result).toBe('HELLO...')
      })
    })
  })

  describe('conditionals', () => {
    describe('simple if statements', () => {
      it('should render content when condition is true', () => {
        const result = engine.compile(
          '{% if show %}Visible{% endif %}',
          { show: true }
        )
        expect(result).toBe('Visible')
      })

      it('should not render content when condition is false', () => {
        const result = engine.compile(
          '{% if show %}Visible{% endif %}',
          { show: false }
        )
        expect(result).toBe('')
      })

      it('should handle truthy values', () => {
        const result = engine.compile(
          '{% if items %}Has items{% endif %}',
          { items: [1, 2, 3] }
        )
        expect(result).toBe('Has items')
      })

      it('should handle falsy empty arrays', () => {
        const result = engine.compile(
          '{% if items %}Has items{% endif %}',
          { items: [] }
        )
        expect(result).toBe('')
      })
    })

    describe('if-else statements', () => {
      it('should render else content when condition is false', () => {
        const result = engine.compile(
          '{% if show %}Yes{% else %}No{% endif %}',
          { show: false }
        )
        expect(result).toBe('No')
      })

      it('should render if content when condition is true', () => {
        const result = engine.compile(
          '{% if show %}Yes{% else %}No{% endif %}',
          { show: true }
        )
        expect(result).toBe('Yes')
      })
    })

    describe('if-elif-else statements', () => {
      it('should handle elif conditions', () => {
        const template = `{% if score > 90 %}Excellent{% elif score > 50 %}Good{% else %}Poor{% endif %}`

        expect(engine.compile(template, { score: 95 })).toBe('Excellent')
        expect(engine.compile(template, { score: 75 })).toBe('Good')
        expect(engine.compile(template, { score: 30 })).toBe('Poor')
      })
    })

    describe('comparison operators', () => {
      it('should handle equality ==', () => {
        const result = engine.compile(
          '{% if status == "active" %}Active{% endif %}',
          { status: 'active' }
        )
        expect(result).toBe('Active')
      })

      it('should handle inequality !=', () => {
        const result = engine.compile(
          '{% if status != "inactive" %}Not inactive{% endif %}',
          { status: 'active' }
        )
        expect(result).toBe('Not inactive')
      })

      it('should handle greater than >', () => {
        const result = engine.compile(
          '{% if value > 50 %}High{% endif %}',
          { value: 75 }
        )
        expect(result).toBe('High')
      })

      it('should handle less than <', () => {
        const result = engine.compile(
          '{% if value < 50 %}Low{% endif %}',
          { value: 25 }
        )
        expect(result).toBe('Low')
      })

      it('should handle greater than or equal >=', () => {
        const result = engine.compile(
          '{% if value >= 50 %}OK{% endif %}',
          { value: 50 }
        )
        expect(result).toBe('OK')
      })

      it('should handle less than or equal <=', () => {
        const result = engine.compile(
          '{% if value <= 50 %}OK{% endif %}',
          { value: 50 }
        )
        expect(result).toBe('OK')
      })
    })

    describe('logical operators', () => {
      it('should handle "not" prefix', () => {
        const result = engine.compile(
          '{% if not hidden %}Visible{% endif %}',
          { hidden: false }
        )
        expect(result).toBe('Visible')
      })

      it('should handle "and" operator', () => {
        const result = engine.compile(
          '{% if a and b %}Both{% endif %}',
          { a: true, b: true }
        )
        expect(result).toBe('Both')

        const result2 = engine.compile(
          '{% if a and b %}Both{% endif %}',
          { a: true, b: false }
        )
        expect(result2).toBe('')
      })

      it('should handle "or" operator', () => {
        const result = engine.compile(
          '{% if a or b %}One{% endif %}',
          { a: false, b: true }
        )
        expect(result).toBe('One')

        const result2 = engine.compile(
          '{% if a or b %}One{% endif %}',
          { a: false, b: false }
        )
        expect(result2).toBe('')
      })
    })

    describe('special value comparisons', () => {
      it('should compare with true', () => {
        const result = engine.compile(
          '{% if active == true %}Active{% endif %}',
          { active: true }
        )
        expect(result).toBe('Active')
      })

      it('should compare with false', () => {
        const result = engine.compile(
          '{% if active == false %}Inactive{% endif %}',
          { active: false }
        )
        expect(result).toBe('Inactive')
      })

      it('should compare with null/none', () => {
        const result = engine.compile(
          '{% if value == null %}Empty{% endif %}',
          { value: null }
        )
        expect(result).toBe('Empty')
      })
    })
  })

  describe('loops', () => {
    it('should iterate over arrays', () => {
      const result = engine.compile(
        '{% for item in items %}{{ item }}{% endfor %}',
        { items: ['a', 'b', 'c'] }
      )
      expect(result).toBe('abc')
    })

    it('should provide loop.index (1-based)', () => {
      const result = engine.compile(
        '{% for item in items %}{{ loop.index }}.{{ item }} {% endfor %}',
        { items: ['a', 'b', 'c'] }
      )
      expect(result).toBe('1.a 2.b 3.c')
    })

    it('should provide loop.index0 (0-based)', () => {
      const result = engine.compile(
        '{% for item in items %}{{ loop.index0 }}{% endfor %}',
        { items: ['a', 'b', 'c'] }
      )
      expect(result).toBe('012')
    })

    it('should provide loop.first', () => {
      // Note: Conditionals using loop vars inside loops require the conditional
      // to not be processed at the outer level. Use loop.first as a variable instead.
      const result = engine.compile(
        '{% for item in items %}{{ loop.first }} {% endfor %}',
        { items: ['a', 'b', 'c'] }
      )
      expect(result).toBe('true false false')
    })

    it('should provide loop.last', () => {
      // Note: Using loop.last as a variable to verify it's available
      const result = engine.compile(
        '{% for item in items %}{{ item }}:{{ loop.last }} {% endfor %}',
        { items: ['a', 'b', 'c'] }
      )
      expect(result).toBe('a:false b:false c:true')
    })

    it('should provide loop.length', () => {
      const result = engine.compile(
        '{% for item in items %}{{ loop.length }}{% endfor %}',
        { items: ['a', 'b', 'c'] }
      )
      expect(result).toBe('333')
    })

    it('should access object properties in loop', () => {
      const result = engine.compile(
        '{% for audit in audits %}{{ audit.title }}: {{ audit.score }} {% endfor %}',
        {
          audits: [
            { title: 'LCP', score: 0.8 },
            { title: 'CLS', score: 0.95 }
          ]
        }
      )
      expect(result).toBe('LCP: 0.8 CLS: 0.95')
    })

    it('should handle nested path for array', () => {
      const result = engine.compile(
        '{% for item in data.items %}{{ item }}{% endfor %}',
        { data: { items: ['x', 'y'] } }
      )
      expect(result).toBe('xy')
    })

    it('should return empty string for non-existent array', () => {
      const result = engine.compile(
        '{% for item in missing %}{{ item }}{% endfor %}',
        {}
      )
      expect(result).toBe('')
    })

    it('should return empty string for empty array', () => {
      const result = engine.compile(
        '{% for item in items %}{{ item }}{% endfor %}',
        { items: [] }
      )
      expect(result).toBe('')
    })
  })

  describe('isTruthy', () => {
    it('should return false for null', () => {
      expect(engine.isTruthy(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(engine.isTruthy(undefined)).toBe(false)
    })

    it('should return false for empty array', () => {
      expect(engine.isTruthy([])).toBe(false)
    })

    it('should return true for non-empty array', () => {
      expect(engine.isTruthy([1])).toBe(true)
    })

    it('should return false for empty object', () => {
      expect(engine.isTruthy({})).toBe(false)
    })

    it('should return true for non-empty object', () => {
      expect(engine.isTruthy({ key: 'value' })).toBe(true)
    })

    it('should return false for empty string', () => {
      expect(engine.isTruthy('')).toBe(false)
    })

    it('should return true for non-empty string', () => {
      expect(engine.isTruthy('hello')).toBe(true)
    })

    it('should return false for 0', () => {
      expect(engine.isTruthy(0)).toBe(false)
    })

    it('should return true for non-zero numbers', () => {
      expect(engine.isTruthy(42)).toBe(true)
      expect(engine.isTruthy(-1)).toBe(true)
    })
  })

  describe('resolveValue', () => {
    it('should return undefined for empty path', () => {
      expect(engine.resolveValue('', { key: 'value' })).toBe(undefined)
    })

    it('should resolve simple path', () => {
      expect(engine.resolveValue('key', { key: 'value' })).toBe('value')
    })

    it('should resolve nested path', () => {
      expect(engine.resolveValue('a.b.c', { a: { b: { c: 'deep' } } })).toBe('deep')
    })

    it('should return undefined for missing nested path', () => {
      expect(engine.resolveValue('a.b.missing', { a: { b: {} } })).toBe(undefined)
    })

    it('should handle null in path', () => {
      expect(engine.resolveValue('a.b', { a: null })).toBe(undefined)
    })
  })

  describe('complex templates', () => {
    it('should handle Lighthouse-style template', () => {
      const template = `# Analyse Performance - {{ url }}

## Score: {{ score | score }}

### Core Web Vitals
- LCP: {{ lcp | metric }}
- CLS: {{ cls }}
- TBT: {{ tbt | metric }}

{% if failedAudits %}
### Audits Échoués
{% for audit in failedAudits %}
{{ loop.index }}. **{{ audit.title }}** (Score: {{ audit.score | score }})
{% endfor %}
{% endif %}`

      const data = {
        url: 'https://example.com',
        score: 0.85,
        lcp: 2500,
        cls: 0.05,
        tbt: 150,
        failedAudits: [
          { title: 'Render Blocking', score: 0.4 },
          { title: 'Unused CSS', score: 0.5 }
        ]
      }

      const result = engine.compile(template, data)

      expect(result).toContain('# Analyse Performance - https://example.com')
      expect(result).toContain('## Score: 85% ⚠️ Moyen')
      expect(result).toContain('- LCP: 2.50s')
      expect(result).toContain('- CLS: 0.05')
      expect(result).toContain('- TBT: 150ms')
      expect(result).toContain('1. **Render Blocking** (Score: 40% ❌ Faible)')
      expect(result).toContain('2. **Unused CSS** (Score: 50% ⚠️ Moyen)')
    })

    it('should handle template without failed audits', () => {
      const template = `{% if failedAudits %}Has audits{% else %}No issues{% endif %}`
      const result = engine.compile(template, { failedAudits: [] })
      expect(result).toBe('No issues')
    })
  })

  describe('error handling', () => {
    it('should handle missing filter gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const result = engine.compile('{{ value | unknownfilter }}', { value: 'test' })
      expect(consoleSpy).toHaveBeenCalledWith("Filter 'unknownfilter' not found")
      consoleSpy.mockRestore()
    })

    it('should handle filter errors gracefully', () => {
      engine.registerFilter('throwing', () => { throw new Error('Filter error') })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = engine.compile('{{ value | throwing }}', { value: 'test' })
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
