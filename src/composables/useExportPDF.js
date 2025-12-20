import {ref} from 'vue'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Composable for exporting history data to PDF
 */
export function useExportPDF() {
    const loading = ref(false)
    const error = ref(null)

    const categoryLabels = {
        performance: 'Performance',
        accessibility: 'Accessibilite',
        'best-practices': 'Bonnes Pratiques',
        seo: 'SEO',
        pwa: 'PWA'
    }

    const categoryColors = {
        performance: '#ef4444',
        accessibility: '#8b5cf6',
        'best-practices': '#3b82f6',
        seo: '#10b981',
        pwa: '#f59e0b'
    }

    /**
     * Format score as percentage
     */
    function formatScore(score) {
        if (score === null || score === undefined) return '-'
        return Math.round(score * 100) + '%'
    }

    /**
     * Format timestamp to French date
     */
    function formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    /**
     * Get score color based on value
     */
    function getScoreColor(score) {
        if (score === null || score === undefined) return '#9ca3af'
        if (score >= 0.9) return '#10b981'
        if (score >= 0.5) return '#f59e0b'
        return '#ef4444'
    }

    /**
     * Generate PDF report for a domain
     * @param {string} domain - Domain name
     * @param {Array} scores - Score history
     * @param {HTMLElement} chartElement - Optional chart element to capture
     * @returns {Promise<void>}
     */
    async function generatePDF(domain, scores, chartElement = null) {
        loading.value = true
        error.value = null

        try {
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const margin = 15
            let yPos = margin

            // Header
            pdf.setFontSize(20)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Rapport Lighthouse', margin, yPos)
            yPos += 10

            pdf.setFontSize(14)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(100)
            pdf.text(domain, margin, yPos)
            yPos += 8

            pdf.setFontSize(10)
            pdf.text(`Genere le ${formatDate(Date.now())}`, margin, yPos)
            pdf.setTextColor(0)
            yPos += 15

            // Summary section
            if (scores.length > 0) {
                const latestScore = [...scores].sort((a, b) => b.timestamp - a.timestamp)[0]

                pdf.setFontSize(12)
                pdf.setFont('helvetica', 'bold')
                pdf.text('Derniers Scores', margin, yPos)
                yPos += 8

                // Score boxes
                const boxWidth = (pageWidth - 2 * margin - 4 * 5) / 5
                const boxHeight = 25
                let xPos = margin

                const categories = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa']

                for (const cat of categories) {
                    const score = latestScore.scores?.[cat]
                    const color = getScoreColor(score)

                    // Box background
                    pdf.setFillColor(245, 245, 245)
                    pdf.roundedRect(xPos, yPos, boxWidth, boxHeight, 2, 2, 'F')

                    // Score value
                    pdf.setFontSize(16)
                    pdf.setFont('helvetica', 'bold')
                    const hexToRgb = (hex) => {
                        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
                        return result ? {
                            r: parseInt(result[1], 16),
                            g: parseInt(result[2], 16),
                            b: parseInt(result[3], 16)
                        } : {r: 0, g: 0, b: 0}
                    }
                    const rgb = hexToRgb(color)
                    pdf.setTextColor(rgb.r, rgb.g, rgb.b)
                    pdf.text(formatScore(score), xPos + boxWidth / 2, yPos + 12, {align: 'center'})

                    // Category label
                    pdf.setFontSize(7)
                    pdf.setFont('helvetica', 'normal')
                    pdf.setTextColor(100)
                    pdf.text(categoryLabels[cat], xPos + boxWidth / 2, yPos + 20, {align: 'center'})

                    xPos += boxWidth + 5
                }

                pdf.setTextColor(0)
                yPos += boxHeight + 15
            }

            // Capture chart if provided
            if (chartElement) {
                try {
                    const canvas = await html2canvas(chartElement, {
                        backgroundColor: '#ffffff',
                        scale: 2
                    })

                    const imgData = canvas.toDataURL('image/png')
                    const imgWidth = pageWidth - 2 * margin
                    const imgHeight = (canvas.height * imgWidth) / canvas.width

                    // Check if we need a new page
                    if (yPos + imgHeight > pageHeight - margin) {
                        pdf.addPage()
                        yPos = margin
                    }

                    pdf.setFontSize(12)
                    pdf.setFont('helvetica', 'bold')
                    pdf.text('Evolution des Scores', margin, yPos)
                    yPos += 8

                    pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight)
                    yPos += imgHeight + 15
                } catch (err) {
                    console.warn('Failed to capture chart:', err)
                }
            }

            // History table
            if (yPos + 50 > pageHeight - margin) {
                pdf.addPage()
                yPos = margin
            }

            pdf.setFontSize(12)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Historique des Analyses', margin, yPos)
            yPos += 8

            // Table header
            const colWidths = [35, 25, 20, 20, 20, 20, 20, 20]
            const headers = ['Date', 'Source', 'Mode', 'Perf', 'A11y', 'BP', 'SEO', 'PWA']

            pdf.setFillColor(240, 240, 240)
            pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F')

            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'bold')
            let headerX = margin + 2

            for (let i = 0; i < headers.length; i++) {
                pdf.text(headers[i], headerX, yPos + 5.5)
                headerX += colWidths[i]
            }

            yPos += 10

            // Table rows
            const sortedScores = [...scores].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20)

            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(7)

            for (const score of sortedScores) {
                if (yPos + 8 > pageHeight - margin) {
                    pdf.addPage()
                    yPos = margin

                    // Repeat header on new page
                    pdf.setFillColor(240, 240, 240)
                    pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F')
                    pdf.setFont('helvetica', 'bold')
                    pdf.setFontSize(8)
                    headerX = margin + 2
                    for (let i = 0; i < headers.length; i++) {
                        pdf.text(headers[i], headerX, yPos + 5.5)
                        headerX += colWidths[i]
                    }
                    yPos += 10
                    pdf.setFont('helvetica', 'normal')
                    pdf.setFontSize(7)
                }

                let cellX = margin + 2
                const rowData = [
                    formatDate(score.timestamp),
                    score.source || '-',
                    score.strategy || '-',
                    formatScore(score.scores?.performance),
                    formatScore(score.scores?.accessibility),
                    formatScore(score.scores?.['best-practices']),
                    formatScore(score.scores?.seo),
                    formatScore(score.scores?.pwa)
                ]

                for (let i = 0; i < rowData.length; i++) {
                    pdf.text(rowData[i], cellX, yPos + 4)
                    cellX += colWidths[i]
                }

                // Draw row border
                pdf.setDrawColor(230)
                pdf.line(margin, yPos + 6, pageWidth - margin, yPos + 6)

                yPos += 8
            }

            // Footer
            const totalPages = pdf.internal.getNumberOfPages()
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i)
                pdf.setFontSize(8)
                pdf.setTextColor(150)
                pdf.text(
                    `Page ${i} / ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    {align: 'center'}
                )
                pdf.text(
                    'Lighthouse Analyzer',
                    pageWidth - margin,
                    pageHeight - 10,
                    {align: 'right'}
                )
            }

            // Download
            pdf.save(`lighthouse-report-${domain}-${Date.now()}.pdf`)
        } catch (err) {
            error.value = err.message
            console.error('PDF generation failed:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    return {
        loading,
        error,
        generatePDF
    }
}

export default useExportPDF
