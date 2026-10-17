/** Date ranges for lists. Times are stored in UTC; the browser sends real instants, so local days and UTC agree. */
export type RangeKey = '24h' | '7d' | '30d' | 'all'

export const RANGES: Array<{ value: RangeKey; label: string }> = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
]

const HOURS: Record<RangeKey, number> = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30, all: 0 }

export function rangeSince(key: RangeKey): string | undefined {
  return HOURS[key] ? new Date(Date.now() - HOURS[key] * 3600_000).toISOString() : undefined
}

/** A date picked in a date field (YYYY-MM-DD) as the start of that day, local time. */
export function dayStart(value: string): string | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d, 0, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/** The same date as the very end of that day, local time. */
export function dayEnd(value: string): string | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d, 23, 59, 59, 999)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}
