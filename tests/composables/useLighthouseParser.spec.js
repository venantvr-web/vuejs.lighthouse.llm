import {beforeEach, describe, expect, it, vi} from 'vitest'
import {useLighthouseParser} from '@/composables/useLighthouseParser.js'

describe('useLighthouseParser', () => {
    let parser

    beforeEach(() => {
        parser = useLighthouseParser()
    })

    describe('parseReport', () => {
        it('should parse a valid Lighthouse report object', () => {
            const report = createMockLighthouseReport()
            const result = parser.parseReport(report)

            expect(result).not.toBeNull()
            expect(result.lighthouseVersion).toBe('12.0.0')
            expect(parser.error.value).toBeNull()
        })

        it('should parse a valid Lighthouse report JSON string', () => {
            const report = createMockLighthouseReport()
            const result = parser.parseReport(JSON.stringify(report))

            expect(result).not.toBeNull()
            expect(result.lighthouseVersion).toBe('12.0.0')
        })

        it('should reject report without lighthouseVersion', () => {
            const report = {categories: {}, audits: {}, requestedUrl: 'https://example.com'}
            const result = parser.parseReport(report)

            expect(result).toBeNull()
            expect(parser.error.value).toContain('missing lighthouseVersion')
        })

        it('should reject report without categories', () => {
            const report = {lighthouseVersion: '12.0.0', audits: {}, requestedUrl: 'https://example.com'}
            const result = parser.parseReport(report)

            expect(result).toBeNull()
            expect(parser.error.value).toContain('missing categories or audits')
        })

        it('should reject report without audits', () => {
            const report = {lighthouseVersion: '12.0.0', categories: {}, requestedUrl: 'https://example.com'}
            const result = parser.parseReport(report)

            expect(result).toBeNull()
            expect(parser.error.value).toContain('missing categories or audits')
        })

        it('should reject report without URL information', () => {
            const report = {lighthouseVersion: '12.0.0', categories: {}, audits: {}}
            const result = parser.parseReport(report)

            expect(result).toBeNull()
            expect(parser.error.value).toContain('missing URL information')
        })

        it('should accept report with finalDisplayedUrl', () => {
            const report = {
                lighthouseVersion: '12.0.0',
                categories: {},
                audits: {},
                finalDisplayedUrl: 'https://example.com'
            }
            const result = parser.parseReport(report)
            expect(result).not.toBeNull()
        })

        it('should accept report with finalUrl', () => {
            const report = {
                lighthouseVersion: '12.0.0',
                categories: {},
                audits: {},
                finalUrl: 'https://example.com'
            }
            const result = parser.parseReport(report)
            expect(result).not.toBeNull()
        })

        it('should accept report with requestedUrl', () => {
            const report = {
                lighthouseVersion: '12.0.0',
                categories: {},
                audits: {},
                requestedUrl: 'https://example.com'
            }
            const result = parser.parseReport(report)
            expect(result).not.toBeNull()
        })

        it('should handle invalid JSON string', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
            })
            const result = parser.parseReport('not valid json')

            expect(result).toBeNull()
            expect(parser.error.value).toBeDefined()
            consoleSpy.mockRestore()
        })

        it('should reset error on new parse', () => {
            parser.parseReport('invalid')
            expect(parser.error.value).toBeDefined()

            const report = createMockLighthouseReport()
            parser.parseReport(report)
            expect(parser.error.value).toBeNull()
        })
    })

    describe('extractCategoryData', () => {
        it('should return null for null category', () => {
            const result = parser.extractCategoryData(null)
            expect(result).toBeNull()
        })

        it('should return null for undefined category', () => {
            const result = parser.extractCategoryData(undefined)
            expect(result).toBeNull()
        })

        it('should extract category data correctly', () => {
            const category = {
                id: 'performance',
                title: 'Performance',
                description: 'Performance audit',
                score: 0.85,
                manualDescription: 'Manual checks',
                auditRefs: [
                    {id: 'lcp', weight: 25, group: 'metrics', acronym: 'LCP'},
                    {id: 'cls', weight: 15, group: 'metrics', acronym: 'CLS'}
                ]
            }

            const result = parser.extractCategoryData(category)

            expect(result.id).toBe('performance')
            expect(result.title).toBe('Performance')
            expect(result.description).toBe('Performance audit')
            expect(result.score).toBe(0.85)
            expect(result.manualDescription).toBe('Manual checks')
            expect(result.auditRefs).toHaveLength(2)
            expect(result.auditRefs[0]).toEqual({
                id: 'lcp',
                weight: 25,
                group: 'metrics',
                acronym: 'LCP'
            })
        })

        it('should handle category without auditRefs', () => {
            const category = {
                id: 'test',
                title: 'Test',
                score: 0.5
            }

            const result = parser.extractCategoryData(category)
            expect(result.auditRefs).toEqual([])
        })
    })

    describe('getCoreWebVitals', () => {
        it('should return null for null report', () => {
            const result = parser.getCoreWebVitals(null)
            expect(result).toBeNull()
        })

        it('should return null for report without audits', () => {
            const result = parser.getCoreWebVitals({categories: {}})
            expect(result).toBeNull()
        })

        it('should extract Core Web Vitals correctly', () => {
            const report = createMockLighthouseReport()
            const result = parser.getCoreWebVitals(report)

            expect(result.lcp).toBeDefined()
            expect(result.lcp.value).toBe(2500)
            expect(result.lcp.displayValue).toBe('2.5 s')
            expect(result.lcp.score).toBe(0.75)
            expect(result.lcp.rating).toBe('needs-improvement')

            expect(result.cls).toBeDefined()
            expect(result.cls.value).toBe(0.05)
            expect(result.cls.rating).toBe('good')

            expect(result.tbt).toBeDefined()
            expect(result.tbt.value).toBe(150)
            expect(result.tbt.rating).toBe('good')

            expect(result.fcp).toBeDefined()
            expect(result.si).toBeDefined()
            expect(result.tti).toBeDefined()
        })

        it('should assign correct ratings based on score', () => {
            const report = {
                audits: {
                    'largest-contentful-paint': {numericValue: 1000, score: 0.95},
                    'cumulative-layout-shift': {numericValue: 0.1, score: 0.7},
                    'total-blocking-time': {numericValue: 500, score: 0.3}
                }
            }

            const result = parser.getCoreWebVitals(report)

            expect(result.lcp.rating).toBe('good')
            expect(result.cls.rating).toBe('needs-improvement')
            expect(result.tbt.rating).toBe('poor')
        })

        it('should handle null score as unknown rating', () => {
            const report = {
                audits: {
                    'largest-contentful-paint': {numericValue: 1000, score: null}
                }
            }

            const result = parser.getCoreWebVitals(report)
            expect(result.lcp.rating).toBe('unknown')
        })

        it('should handle missing audits gracefully', () => {
            const report = {
                audits: {}
            }

            const result = parser.getCoreWebVitals(report)

            expect(result.lcp).toBeNull()
            expect(result.cls).toBeNull()
            expect(result.tbt).toBeNull()
        })
    })

    describe('getOpportunities', () => {
        it('should return empty array for null report', () => {
            const result = parser.getOpportunities(null)
            expect(result).toEqual([])
        })

        it('should return empty array for report without audits', () => {
            const result = parser.getOpportunities({categories: {}})
            expect(result).toEqual([])
        })

        it('should extract opportunities correctly', () => {
            const report = createMockLighthouseReport()
            const result = parser.getOpportunities(report)

            expect(result.length).toBeGreaterThan(0)

            const renderBlockingOpp = result.find(o => o.id === 'render-blocking-resources')
            expect(renderBlockingOpp).toBeDefined()
            expect(renderBlockingOpp.title).toBe('Eliminate render-blocking resources')
            expect(renderBlockingOpp.savings.ms).toBe(500)
        })

        it('should sort opportunities by savings (ms first, then bytes)', () => {
            const report = {
                audits: {
                    'opportunity-1': {
                        title: 'Low savings',
                        score: 0.5,
                        details: {type: 'opportunity', overallSavingsMs: 100}
                    },
                    'opportunity-2': {
                        title: 'High savings',
                        score: 0.5,
                        details: {type: 'opportunity', overallSavingsMs: 500}
                    },
                    'opportunity-3': {
                        title: 'Medium savings',
                        score: 0.5,
                        details: {type: 'opportunity', overallSavingsMs: 300}
                    }
                }
            }

            const result = parser.getOpportunities(report)

            expect(result[0].id).toBe('opportunity-2')
            expect(result[1].id).toBe('opportunity-3')
            expect(result[2].id).toBe('opportunity-1')
        })

        it('should sort by bytes when ms savings are equal', () => {
            const report = {
                audits: {
                    'opportunity-1': {
                        title: 'Small bytes',
                        score: 0.5,
                        details: {type: 'opportunity', overallSavingsMs: 100, overallSavingsBytes: 1000}
                    },
                    'opportunity-2': {
                        title: 'Large bytes',
                        score: 0.5,
                        details: {type: 'opportunity', overallSavingsMs: 100, overallSavingsBytes: 5000}
                    }
                }
            }

            const result = parser.getOpportunities(report)

            expect(result[0].id).toBe('opportunity-2')
            expect(result[1].id).toBe('opportunity-1')
        })

        it('should include audits with overallSavingsMs', () => {
            const report = {
                audits: {
                    'some-audit': {
                        title: 'Some Audit',
                        score: 0.5,
                        details: {overallSavingsMs: 200}
                    }
                }
            }

            const result = parser.getOpportunities(report)
            expect(result).toHaveLength(1)
        })

        it('should include numeric audits with score < 1', () => {
            const report = {
                audits: {
                    'numeric-audit': {
                        title: 'Numeric Audit',
                        score: 0.8,
                        scoreDisplayMode: 'numeric',
                        numericValue: 500
                    }
                }
            }

            const result = parser.getOpportunities(report)
            expect(result.length).toBeGreaterThanOrEqual(1)
        })
    })

    describe('getDiagnostics', () => {
        it('should return empty array for null report', () => {
            const result = parser.getDiagnostics(null)
            expect(result).toEqual([])
        })

        it('should return empty array for report without audits', () => {
            const result = parser.getDiagnostics({categories: {}})
            expect(result).toEqual([])
        })

        it('should extract diagnostics correctly', () => {
            const report = {
                audits: {
                    'diagnostic-audit': {
                        title: 'Diagnostic Test',
                        description: 'Test description',
                        score: 0.5,
                        scoreDisplayMode: 'binary',
                        displayValue: '5 issues',
                        details: {type: 'table', items: []}
                    },
                    'passing-audit': {
                        title: 'Passing',
                        score: 1,
                        details: {type: 'table', items: []}
                    },
                    'not-applicable-audit': {
                        title: 'N/A',
                        score: null,
                        scoreDisplayMode: 'notApplicable',
                        details: {type: 'table'}
                    }
                }
            }

            const result = parser.getDiagnostics(report)

            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('diagnostic-audit')
            expect(result[0].title).toBe('Diagnostic Test')
        })

        it('should exclude opportunities', () => {
            const report = {
                audits: {
                    'opportunity': {
                        title: 'Opportunity',
                        score: 0.5,
                        details: {type: 'opportunity'}
                    },
                    'diagnostic': {
                        title: 'Diagnostic',
                        score: 0.5,
                        details: {type: 'table'}
                    }
                }
            }

            const result = parser.getDiagnostics(report)

            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('diagnostic')
        })

        it('should include audits with null score', () => {
            const report = {
                audits: {
                    'informative': {
                        title: 'Informative',
                        score: null,
                        scoreDisplayMode: 'informative',
                        details: {type: 'table'}
                    }
                }
            }

            const result = parser.getDiagnostics(report)
            expect(result).toHaveLength(1)
        })
    })

    describe('getFailedAudits', () => {
        it('should return empty array for null report', () => {
            const result = parser.getFailedAudits(null, 'performance')
            expect(result).toEqual([])
        })

        it('should return empty array for report without categories', () => {
            const result = parser.getFailedAudits({audits: {}}, 'performance')
            expect(result).toEqual([])
        })

        it('should return empty array for non-existent category', () => {
            const report = createMockLighthouseReport()
            const result = parser.getFailedAudits(report, 'non-existent')
            expect(result).toEqual([])
        })

        it('should extract failed audits for a category', () => {
            const report = {
                categories: {
                    performance: {
                        auditRefs: [
                            {id: 'audit-1', weight: 10},
                            {id: 'audit-2', weight: 5},
                            {id: 'audit-3', weight: 15}
                        ]
                    }
                },
                audits: {
                    'audit-1': {title: 'Audit 1', score: 0.5, description: 'Desc 1'},
                    'audit-2': {title: 'Audit 2', score: 0.95, description: 'Desc 2'},
                    'audit-3': {title: 'Audit 3', score: 0.3, description: 'Desc 3'}
                }
            }

            const result = parser.getFailedAudits(report, 'performance')

            expect(result).toHaveLength(2)
            expect(result.find(a => a.id === 'audit-2')).toBeUndefined()
        })

        it('should sort by score then by weight', () => {
            const report = {
                categories: {
                    performance: {
                        auditRefs: [
                            {id: 'audit-1', weight: 10},
                            {id: 'audit-2', weight: 20},
                            {id: 'audit-3', weight: 15}
                        ]
                    }
                },
                audits: {
                    'audit-1': {title: 'Audit 1', score: 0.5},
                    'audit-2': {title: 'Audit 2', score: 0.3},
                    'audit-3': {title: 'Audit 3', score: 0.5}
                }
            }

            const result = parser.getFailedAudits(report, 'performance')

            // audit-2 has lowest score, so it's first
            expect(result[0].id).toBe('audit-2')
            // audit-3 has same score as audit-1 but higher weight
            expect(result[1].id).toBe('audit-3')
            expect(result[2].id).toBe('audit-1')
        })

        it('should exclude audits with null score', () => {
            const report = {
                categories: {
                    performance: {
                        auditRefs: [
                            {id: 'audit-1', weight: 10},
                            {id: 'audit-2', weight: 5}
                        ]
                    }
                },
                audits: {
                    'audit-1': {title: 'Audit 1', score: null},
                    'audit-2': {title: 'Audit 2', score: 0.5}
                }
            }

            const result = parser.getFailedAudits(report, 'performance')

            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('audit-2')
        })

        it('should include audit details and explanation', () => {
            const report = {
                categories: {
                    performance: {
                        auditRefs: [{id: 'audit-1', weight: 10, group: 'metrics'}]
                    }
                },
                audits: {
                    'audit-1': {
                        title: 'Audit 1',
                        score: 0.5,
                        description: 'Description',
                        scoreDisplayMode: 'numeric',
                        displayValue: '2.5 s',
                        details: {type: 'table'},
                        explanation: 'Explanation text',
                        warnings: ['Warning 1']
                    }
                }
            }

            const result = parser.getFailedAudits(report, 'performance')

            expect(result[0].weight).toBe(10)
            expect(result[0].group).toBe('metrics')
            expect(result[0].details).toEqual({type: 'table'})
            expect(result[0].explanation).toBe('Explanation text')
            expect(result[0].warnings).toEqual(['Warning 1'])
        })

        it('should handle missing audit gracefully', () => {
            const report = {
                categories: {
                    performance: {
                        auditRefs: [
                            {id: 'existing', weight: 10},
                            {id: 'missing', weight: 5}
                        ]
                    }
                },
                audits: {
                    'existing': {title: 'Existing', score: 0.5}
                }
            }

            const result = parser.getFailedAudits(report, 'performance')

            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('existing')
        })
    })
})
