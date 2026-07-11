import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { formatShortDate } from '../shared/format'
import { destinationFromAddress } from '../shared/trips'
import type { Stay } from '../shared/types'

type Props = {
  stays: Stay[]
  initialStayIds: string[]
  manualGroup?: boolean
  onClose: () => void
  onSave: (stayIds: string[]) => Promise<void>
}

export function GroupStaysDialog({ stays, initialStayIds, manualGroup = false, onClose, onSave }: Props) {
  const [selected, setSelected] = useState(() => new Set(initialStayIds))
  const [saving, setSaving] = useState(false)
  const closeButton = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLElement>(null)
  const sortedStays = useMemo(
    () => [...stays].sort((a, b) => (a.checkIn || '9999').localeCompare(b.checkIn || '9999')),
    [stays],
  )

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButton.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const focusable = dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const save = async () => {
    if (selected.size < 2) return
    setSaving(true)
    await onSave([...selected])
  }

  return (
    <div className="group-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <section ref={dialog} className="group-dialog" role="dialog" aria-modal="true" aria-labelledby="group-dialog-title" aria-describedby="group-dialog-help">
        <header className="group-dialog-header">
          <div>
            <h2 id="group-dialog-title">Group stays</h2>
            <p id="group-dialog-help">Choose at least two stays that belong to this trip.</p>
          </div>
          <button ref={closeButton} className="icon-button" onClick={onClose} aria-label="Close grouping dialog"><X size={21} /></button>
        </header>

        <fieldset className="stay-checklist">
          <legend className="sr-only">Saved stays</legend>
          {sortedStays.map((stay) => (
            <label className="stay-check" key={stay.id}>
              <input type="checkbox" checked={selected.has(stay.id)} onChange={() => toggle(stay.id)} />
              <span>
                <strong>{stay.propertyName || 'Untitled stay'}</strong>
                <small>{destinationFromAddress(stay.address)} · {stay.checkIn ? formatShortDate(stay.checkIn) : 'Dates not added'}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <p className="group-selection-status" aria-live="polite">
          {selected.size < 2 ? 'Select at least two stays.' : `${selected.size} stays selected.`}
        </p>
        {manualGroup ? (
          <button type="button" className="automatic-group-button" disabled={saving} onClick={async () => { setSaving(true); await onSave([]) }}>
            Return this trip to automatic grouping
          </button>
        ) : null}
        <footer className="group-dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-button" disabled={selected.size < 2 || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save group'}
          </button>
        </footer>
      </section>
    </div>
  )
}
