/**
 * Build an oldest-first numeric series for a sparkline from newest-first
 * records. The accessor may return null for records to skip; the result keeps
 * only the most recent `limit` numeric points.
 *
 * @param {Array} records - Records ordered newest-first
 * @param {(record: any) => number|null} accessor - Extracts the metric value
 * @param {{limit?: number}} options - { limit } (default 12)
 * @returns {number[]} Oldest-first series
 */
export function toSeries(records = [], accessor, {limit = 12} = {}) {
    return [...records]
        .reverse()
        .map(accessor)
        .filter(v => typeof v === 'number' && !Number.isNaN(v))
        .slice(-limit)
}
