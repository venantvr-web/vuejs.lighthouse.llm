import { describe, it, expect } from 'vitest'
import { templateRegistry, categoryMeta } from '@/prompts/templates/j2/registry.js'

describe('templateRegistry', () => {
  describe('structure', () => {
    it('should have all five categories', () => {
      expect(templateRegistry).toHaveProperty('performance')
      expect(templateRegistry).toHaveProperty('seo')
      expect(templateRegistry).toHaveProperty('accessibility')
      expect(templateRegistry).toHaveProperty('best-practices')
      expect(templateRegistry).toHaveProperty('pwa')
    })

    it('should have quickAnalysis template for each category', () => {
      const categories = ['performance', 'seo', 'accessibility', 'best-practices', 'pwa']

      categories.forEach(category => {
        expect(templateRegistry[category]).toHaveProperty('quickAnalysis')
        expect(templateRegistry[category].quickAnalysis.id).toBe('quickAnalysis')
      })
    })
  })

  describe('performance templates', () => {
    it('should have quickAnalysis template', () => {
      const template = templateRegistry.performance.quickAnalysis

      expect(template.id).toBe('quickAnalysis')
      expect(template.name).toBe('Analyse Rapide Performance')
      expect(template.strategy).toBe('quick')
      expect(template.file).toBe('performance-quick.j2')
      expect(template.tags).toContain('performance')
    })

    it('should have deepDive template', () => {
      const template = templateRegistry.performance.deepDive

      expect(template.id).toBe('deepDive')
      expect(template.name).toBe('Analyse Approfondie Performance')
      expect(template.strategy).toBe('deep')
      expect(template.file).toBe('performance-deep.j2')
      expect(template.tags).toContain('optimization')
    })

    it('should have coreWebVitals template', () => {
      const template = templateRegistry.performance.coreWebVitals

      expect(template.id).toBe('coreWebVitals')
      expect(template.strategy).toBe('specific')
      expect(template.file).toBe('performance-cwv.j2')
      expect(template.tags).toContain('cwv')
    })
  })

  describe('seo templates', () => {
    it('should have quickAnalysis template', () => {
      const template = templateRegistry.seo.quickAnalysis

      expect(template.id).toBe('quickAnalysis')
      expect(template.file).toBe('seo-quick.j2')
      expect(template.tags).toContain('seo')
    })

    it('should have technicalSEO template', () => {
      const template = templateRegistry.seo.technicalSEO

      expect(template.id).toBe('technicalSEO')
      expect(template.strategy).toBe('deep')
      expect(template.file).toBe('seo-technical.j2')
      expect(template.tags).toContain('technical')
    })
  })

  describe('accessibility templates', () => {
    it('should have quickAnalysis template', () => {
      const template = templateRegistry.accessibility.quickAnalysis

      expect(template.file).toBe('accessibility-quick.j2')
      expect(template.tags).toContain('a11y')
      expect(template.tags).toContain('wcag')
    })

    it('should have wcagCompliance template', () => {
      const template = templateRegistry.accessibility.wcagCompliance

      expect(template.id).toBe('wcagCompliance')
      expect(template.strategy).toBe('deep')
      expect(template.file).toBe('accessibility-wcag.j2')
      expect(template.tags).toContain('compliance')
    })
  })

  describe('best-practices templates', () => {
    it('should have quickAnalysis template', () => {
      const template = templateRegistry['best-practices'].quickAnalysis

      expect(template.file).toBe('best-practices-quick.j2')
      expect(template.tags).toContain('security')
      expect(template.tags).toContain('standards')
    })
  })

  describe('pwa templates', () => {
    it('should have quickAnalysis template', () => {
      const template = templateRegistry.pwa.quickAnalysis

      expect(template.file).toBe('pwa-quick.j2')
      expect(template.tags).toContain('pwa')
      expect(template.tags).toContain('installable')
    })
  })

  describe('template metadata validation', () => {
    it('all templates should have required fields', () => {
      const requiredFields = ['id', 'name', 'description', 'strategy', 'file', 'tags']

      Object.entries(templateRegistry).forEach(([category, templates]) => {
        Object.entries(templates).forEach(([templateId, template]) => {
          requiredFields.forEach(field => {
            expect(template).toHaveProperty(field)
            expect(template[field]).toBeDefined()
          })
        })
      })
    })

    it('all templates should have .j2 file extension', () => {
      Object.entries(templateRegistry).forEach(([category, templates]) => {
        Object.entries(templates).forEach(([templateId, template]) => {
          expect(template.file).toMatch(/\.j2$/)
        })
      })
    })

    it('all templates should have non-empty tags array', () => {
      Object.entries(templateRegistry).forEach(([category, templates]) => {
        Object.entries(templates).forEach(([templateId, template]) => {
          expect(Array.isArray(template.tags)).toBe(true)
          expect(template.tags.length).toBeGreaterThan(0)
        })
      })
    })

    it('strategy should be one of quick, deep, or specific', () => {
      const validStrategies = ['quick', 'deep', 'specific']

      Object.entries(templateRegistry).forEach(([category, templates]) => {
        Object.entries(templates).forEach(([templateId, template]) => {
          expect(validStrategies).toContain(template.strategy)
        })
      })
    })
  })
})

describe('categoryMeta', () => {
  describe('structure', () => {
    it('should have all five categories', () => {
      expect(categoryMeta).toHaveProperty('performance')
      expect(categoryMeta).toHaveProperty('seo')
      expect(categoryMeta).toHaveProperty('accessibility')
      expect(categoryMeta).toHaveProperty('best-practices')
      expect(categoryMeta).toHaveProperty('pwa')
    })

    it('all categories should have required fields', () => {
      const requiredFields = ['id', 'name', 'icon', 'role', 'description']

      Object.entries(categoryMeta).forEach(([categoryId, meta]) => {
        requiredFields.forEach(field => {
          expect(meta).toHaveProperty(field)
          expect(meta[field]).toBeDefined()
          expect(meta[field].length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('performance category', () => {
    it('should have correct metadata', () => {
      const meta = categoryMeta.performance

      expect(meta.id).toBe('performance')
      expect(meta.name).toBe('Performance')
      expect(meta.icon).toBe('⚡')
      expect(meta.role).toContain('WPO')
      expect(meta.description).toContain('Core Web Vitals')
    })
  })

  describe('seo category', () => {
    it('should have correct metadata', () => {
      const meta = categoryMeta.seo

      expect(meta.id).toBe('seo')
      expect(meta.name).toBe('SEO')
      expect(meta.icon).toBe('🔍')
      expect(meta.role).toContain('SEO')
      expect(meta.description).toContain('Référencement')
    })
  })

  describe('accessibility category', () => {
    it('should have correct metadata', () => {
      const meta = categoryMeta.accessibility

      expect(meta.id).toBe('accessibility')
      expect(meta.name).toBe('Accessibilité')
      expect(meta.icon).toBe('♿')
      expect(meta.role).toContain('WCAG')
      expect(meta.description).toContain('WCAG')
    })
  })

  describe('best-practices category', () => {
    it('should have correct metadata', () => {
      const meta = categoryMeta['best-practices']

      expect(meta.id).toBe('best-practices')
      expect(meta.name).toBe('Bonnes Pratiques')
      expect(meta.icon).toBe('🛡️')
      expect(meta.role).toContain('Securite')
      expect(meta.description).toContain('Securite')
    })
  })

  describe('pwa category', () => {
    it('should have correct metadata', () => {
      const meta = categoryMeta.pwa

      expect(meta.id).toBe('pwa')
      expect(meta.name).toBe('PWA')
      expect(meta.icon).toBe('📱')
      expect(meta.role).toContain('Progressive Web Apps')
      expect(meta.description).toContain('Service Workers')
    })
  })

  describe('category id consistency', () => {
    it('category id should match the key', () => {
      Object.entries(categoryMeta).forEach(([key, meta]) => {
        expect(meta.id).toBe(key)
      })
    })

    it('templateRegistry and categoryMeta should have matching keys', () => {
      const registryKeys = Object.keys(templateRegistry).sort()
      const metaKeys = Object.keys(categoryMeta).sort()

      expect(registryKeys).toEqual(metaKeys)
    })
  })
})
