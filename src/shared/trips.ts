import type { Stay, Trip, TripGroup } from './types'

const DAY = 86_400_000

const timestamp = (value: string) => {
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY
}

const sortStays = (stays: Stay[]) => [...stays].sort((a, b) => timestamp(a.checkIn) - timestamp(b.checkIn))

function toTrip(stays: Stay[], id: string, manualGroupId?: string): Trip {
  const sorted = sortStays(stays)
  return {
    id,
    stays: sorted,
    start: sorted[0]?.checkIn || '',
    end: sorted.at(-1)?.checkOut || sorted.at(-1)?.checkIn || '',
    manualGroupId,
  }
}

export function groupIntoTrips(stays: Stay[], tripGroups: TripGroup[] = []): Trip[] {
  const staysById = new Map(stays.map((stay) => [stay.id, stay]))
  const claimed = new Set<string>()
  const manualTrips: Trip[] = []

  for (const group of tripGroups) {
    const members = group.stayIds
      .filter((id) => !claimed.has(id))
      .map((id) => staysById.get(id))
      .filter((stay): stay is Stay => Boolean(stay))
    if (members.length < 2) continue
    members.forEach((stay) => claimed.add(stay.id))
    manualTrips.push(toTrip(members, group.id, group.id))
  }

  const sorted = sortStays(stays.filter((stay) => !claimed.has(stay.id)))
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

  const automaticTrips = groups.map((group) => toTrip(group, group.map((stay) => stay.id).join('-')))
  return [...manualTrips, ...automaticTrips].sort((a, b) => timestamp(a.start) - timestamp(b.start))
}

export function updateTripGroups(tripGroups: TripGroup[], groupId: string, stayIds: string[]): TripGroup[] {
  const selected = new Set(stayIds)
  const remaining = tripGroups
    .filter((group) => group.id !== groupId)
    .map((group) => ({ ...group, stayIds: group.stayIds.filter((id) => !selected.has(id)) }))
    .filter((group) => group.stayIds.length >= 2)

  return stayIds.length >= 2 ? [...remaining, { id: groupId, stayIds: [...selected] }] : remaining
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
