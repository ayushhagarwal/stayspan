import { describe, expect, it } from 'vitest'
import { groupIntoTrips } from './trips'
import { formatLongDate, nightsBetween } from './format'
import type { Stay } from './types'

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
    const makeStay = (id: string): Stay => ({
      id, propertyName: '', checkIn: '', checkOut: '', cancellationDeadline: '', cancellationPolicy: '',
      address: '', phone: '', sourceName: '', sourceUrl: '', createdAt: new Date().toISOString(),
    })
    expect(groupIntoTrips([makeStay('one'), makeStay('two')])).toHaveLength(2)
  })
})
