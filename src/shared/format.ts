const shortDate = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' })
const longDate = new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const time = new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false })

const validDate = (value: string) => {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

export const formatShortDate = (value: string) => validDate(value) ? shortDate.format(validDate(value)!) : 'Not added'
export const formatLongDate = (value: string) => validDate(value) ? longDate.format(validDate(value)!) : 'Not added'
export const formatTime = (value: string) => validDate(value) ? time.format(validDate(value)!) : ''

export function nightsBetween(start: string, end: string): number {
  const startDate = validDate(start)
  const endDate = validDate(end)
  if (!startDate || !endDate) return 0
  return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000))
}

export function sourceLabel(url: string, supplied: string): string {
  if (supplied.trim()) return supplied.trim()
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return 'Booking source' }
}
