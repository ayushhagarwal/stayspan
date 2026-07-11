import { describe, expect, it } from 'vitest'
import { groupIntoTrips, updateTripGroups } from './trips'
import { formatLongDate, nightsBetween } from './format'
import type { Stay } from './types'

function makeStay(id: string, checkIn = '', checkOut = ''): Stay {
  return {
    id, propertyName: `Stay ${id}`, checkIn, checkOut, cancellationDeadline: '', cancellationPolicy: '',
    address: `${id} Road, City ${id}, Country`, phone: '', sourceName: '', sourceUrl: '', createdAt: new Date().toISOString(),
  }
}

it('keeps an incomplete stay renderable without dates', () => {
  const stay: Stay = {
    id: 'incomplete', propertyName: '', checkIn: '', checkOut: '', cancellationDeadline: '',
    cancellationPolicy: '', address: '', phone: '', sourceName: '', sourceUrl: '', createdAt: new Date().toISOString(),
  }
  const trips = groupIntoTrips([stay])
  expect(trips).toHaveLength(1)
  expect(trips[0].start).toBe('')
  expect(nightsBetween('', '')).toBe(0)
  expect(formatLongDate('')).toBe('Not added')
})

describe('optional stay fields', () => {
  it('does not merge multiple undated stays into a fabricated trip', () => {
    expect(groupIntoTrips([makeStay('one'), makeStay('two')])).toHaveLength(2)
  })

  it('continues to group consecutive stays automatically', () => {
    const stays = [
      makeStay('one', '2027-03-01T15:00', '2027-03-03T11:00'),
      makeStay('two', '2027-03-03T15:00', '2027-03-05T11:00'),
    ]
    expect(groupIntoTrips(stays)[0].stays.map((stay) => stay.id)).toEqual(['one', 'two'])
  })

  it('groups distant and undated stays with a manual override', () => {
    const stays = [makeStay('one'), makeStay('two', '2028-09-10T15:00', '2028-09-12T11:00')]
    const trips = groupIntoTrips(stays, [{ id: 'manual', stayIds: ['one', 'two'] }])
    expect(trips).toHaveLength(1)
    expect(trips[0].manualGroupId).toBe('manual')
    expect(trips[0].stays.map((stay) => stay.id)).toEqual(['two', 'one'])
  })

  it('moves selected stays between groups and removes groups left with one stay', () => {
    const groups = [
      { id: 'first', stayIds: ['one', 'two'] },
      { id: 'second', stayIds: ['three', 'four'] },
    ]
    expect(updateTripGroups(groups, 'first', ['one', 'three'])).toEqual([
      { id: 'first', stayIds: ['one', 'three'] },
    ])
  })

  it('returns a removed manual member to automatic grouping', () => {
    const stays = [makeStay('one'), makeStay('two'), makeStay('three')]
    const groups = updateTripGroups([{ id: 'manual', stayIds: ['one', 'two', 'three'] }], 'manual', ['one', 'two'])
    const trips = groupIntoTrips(stays, groups)
    expect(trips).toHaveLength(2)
    expect(trips.find((trip) => trip.manualGroupId)?.stays.map((stay) => stay.id)).toEqual(['one', 'two'])
    expect(trips.find((trip) => !trip.manualGroupId)?.stays.map((stay) => stay.id)).toEqual(['three'])
  })
})
