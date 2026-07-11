// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { getData, serializeDataExport } from './storage'
import type { Stay } from './types'

const stay: Stay = {
  id: 'legacy', propertyName: 'Legacy Inn', checkIn: '', checkOut: '', cancellationDeadline: '',
  cancellationPolicy: '', address: '', phone: '', sourceName: '', sourceUrl: '', createdAt: '2027-01-01T00:00:00.000Z',
}

describe('versioned StaySpan storage', () => {
  beforeEach(() => localStorage.clear())

  it('migrates version-one data without losing stays', async () => {
    localStorage.setItem('stayspan_data_v1', JSON.stringify({ version: 1, stays: [stay], hasSeenDemo: true }))
    const data = await getData()
    expect(data).toEqual({ version: 2, stays: [stay], tripGroups: [], hasSeenDemo: true })
    expect(JSON.parse(localStorage.getItem('stayspan_data_v1')!)).toEqual(data)
  })

  it('includes manual groups in the version-two export', () => {
    const exported = JSON.parse(serializeDataExport([stay], [{ id: 'trip', stayIds: ['legacy', 'other'] }]))
    expect(exported.version).toBe(2)
    expect(exported.tripGroups).toEqual([{ id: 'trip', stayIds: ['legacy', 'other'] }])
  })
})
