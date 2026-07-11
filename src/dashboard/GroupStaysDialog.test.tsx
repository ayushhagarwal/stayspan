// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GroupStaysDialog } from './GroupStaysDialog'
import type { Stay } from '../shared/types'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const stays: Stay[] = ['one', 'two', 'three'].map((id, index) => ({
  id, propertyName: `Stay ${id}`, checkIn: `2027-03-0${index + 1}T15:00`, checkOut: '', cancellationDeadline: '',
  cancellationPolicy: '', address: `${index + 1} Road, City ${id}, Country`, phone: '', sourceName: '', sourceUrl: '', createdAt: '',
}))

describe('GroupStaysDialog', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('requires two stays, saves the selected IDs, and supports Escape', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const onClose = vi.fn()
    const onSave = vi.fn(async () => undefined)
    await act(async () => root.render(
      <GroupStaysDialog stays={stays} initialStayIds={['one']} onClose={onClose} onSave={onSave} />,
    ))

    const save = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Save group')!
    expect(save.disabled).toBe(true)
    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    await act(async () => checkboxes[1].click())
    expect(save.disabled).toBe(false)
    await act(async () => save.click())
    expect(onSave).toHaveBeenCalledWith(['one', 'two'])

    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(onClose).toHaveBeenCalledOnce()
    await act(async () => root.unmount())
  })

  it('can dissolve a manual group back to automatic grouping', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const onSave = vi.fn(async () => undefined)
    await act(async () => root.render(
      <GroupStaysDialog stays={stays} initialStayIds={['one', 'two']} manualGroup onClose={vi.fn()} onSave={onSave} />,
    ))
    const automatic = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('automatic grouping'))!
    await act(async () => automatic.click())
    expect(onSave).toHaveBeenCalledWith([])
    await act(async () => root.unmount())
  })
})
