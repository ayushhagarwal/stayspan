import type { Stay, Trip } from './types'

const DAY = 86_400_000

export function groupIntoTrips(stays: Stay[]): Trip[] {
  const timestamp = (value: string) => {
    const time = new Date(value).getTime()
    return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY
  }
  const sorted = [...stays].sort((a, b) => timestamp(a.checkIn) - timestamp(b.checkIn))
  const groups: Stay[][] = []

  for (const stay of sorted) {
    const group = groups.at(-1)
    const nextStart = timestamp(stay.checkIn)
    if (!group || !Number.isFinite(nextStart)) {
      groups.push([stay])
      continue
    }
    const previous = group.at(-1)!
    const previousEnd = Number.isFinite(timestamp(previous.checkOut)) ? timestamp(previous.checkOut) : timestamp(previous.checkIn)
    if (nextStart - previousEnd <= DAY && nextStart - previousEnd >= -DAY) group.push(stay)
    else groups.push([stay])
  }

  return groups.map((group) => ({
    id: group.map((stay) => stay.id).join('-'),
    stays: group,
    start: group[0].checkIn || '',
    end: group.at(-1)!.checkOut || group.at(-1)!.checkIn || '',
  }))
}

export function destinationFromAddress(address: string): string {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean)
  return parts.length > 1 ? parts.at(-2)! : parts[0] || 'Your destination'
}

export function tripTitle(trip: Trip): string {
  const destinations = [...new Set(trip.stays.map((stay) => destinationFromAddress(stay.address)))]
  if (destinations.length === 1) return `${destinations[0]} trip`
  if (destinations.length === 2) return `${destinations[0]} & ${destinations[1]}`
  return `${destinations[0]} + ${destinations.length - 1} more stops`
}
