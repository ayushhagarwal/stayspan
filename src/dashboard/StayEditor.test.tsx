// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StayEditor } from './StayEditor'
import type { StayDraft } from '../shared/types'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const draft: StayDraft = {
  propertyName: 'Possible Hotel',
  checkIn: '2027-10-08T15:00',
  checkOut: '2027-10-11T11:00',
  cancellationDeadline: '2027-10-05T23:00',
  cancellationPolicy: 'Free cancellation until 5 October.',
  address: '12 Bay Road, Central District, Sydney, Australia',
  phone: '',
  sourceName: 'travel.example',
  sourceUrl: 'https://travel.example/booking',
}

describe('StayEditor extraction review', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('removes a confidence warning after the user edits that field', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => root.render(
      <StayEditor
        initial={draft}
        mode="add"
        reviewFields={{
          propertyName: {
            value: draft.propertyName,
            confidence: 0.64,
            needsReview: true,
            evidence: { source: 'heading-context', reason: 'Prominent booking heading' },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn(async () => undefined)}
      />,
    ))

    expect(container.querySelector('.review-flag')?.textContent).toContain('Please verify')
    expect(container.querySelectorAll('[required]')).toHaveLength(0)
    const input = container.querySelector('input')!
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      valueSetter.call(input, 'Confirmed Hotel')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(container.querySelector('.review-flag')).toBeNull()
    await act(async () => root.unmount())
  })
})
