import { useState, type FormEvent } from 'react'
import { CircleAlert, X } from 'lucide-react'
import type { StayDraft } from '../shared/types'
import type { ExtractionFieldMap } from '../extraction/types'

type Props = {
  initial: StayDraft
  mode: 'add' | 'edit'
  reviewFields?: ExtractionFieldMap
  onClose: () => void
  onSave: (draft: StayDraft) => Promise<void>
}

export function StayEditor({ initial, mode, reviewFields, onClose, onSave }: Props) {
  const [values, setValues] = useState(initial)
  const [verified, setVerified] = useState<Partial<Record<keyof StayDraft, boolean>>>({})
  const [saving, setSaving] = useState(false)

  const update = (field: keyof StayDraft, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setVerified((current) => ({ ...current, [field]: true }))
  }
  const needsReview = (field: keyof StayDraft) => Boolean(reviewFields?.[field]?.needsReview && !verified[field])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    await onSave(values)
  }

  return (
    <div className="editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <aside className="editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <header className="editor-header">
          <h2 id="editor-title">{mode === 'edit' ? 'Edit stay' : 'Add stay'}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close editor"><X size={22} /></button>
        </header>
        <form onSubmit={submit}>
          <Field label="Property name" review={needsReview('propertyName')} value={values.propertyName} onChange={(value) => update('propertyName', value)} placeholder="e.g., Shinjuku Granbell Hotel" />
          <div className="field-grid">
            <Field label="Check-in" review={needsReview('checkIn')} type="datetime-local" value={values.checkIn} onChange={(value) => update('checkIn', value)} />
            <Field label="Check-out" review={needsReview('checkOut')} type="datetime-local" value={values.checkOut} min={values.checkIn} onChange={(value) => update('checkOut', value)} />
          </div>
          <Field label="Cancellation deadline" review={needsReview('cancellationDeadline')} type="datetime-local" value={values.cancellationDeadline} onChange={(value) => update('cancellationDeadline', value)} />
          <label className="field">
            <span>Cancellation policy summary {needsReview('cancellationPolicy') ? <ReviewFlag /> : null}</span>
            <textarea maxLength={200} rows={3} value={values.cancellationPolicy} onChange={(event) => update('cancellationPolicy', event.target.value)} placeholder="Free cancellation until…" />
            <small>{values.cancellationPolicy.length}/200</small>
          </label>
          <Field label="Address" review={needsReview('address')} value={values.address} onChange={(value) => update('address', value)} placeholder="Street, city, country" />
          <Field label="Phone" review={needsReview('phone')} type="tel" value={values.phone} onChange={(value) => update('phone', value)} placeholder="+81 3-5155-2666" />
          <div className="field-grid">
            <Field label="Source name" value={values.sourceName} onChange={(value) => update('sourceName', value)} placeholder="Booking.com" />
            <Field label="Source URL" type="url" value={values.sourceUrl} onChange={(value) => update('sourceUrl', value)} placeholder="https://…" />
          </div>
          <div className="editor-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save stay'}</button>
          </div>
        </form>
      </aside>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, min, review }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; min?: string; review?: boolean }) {
  return (
    <label className="field">
      <span>{label} {review ? <ReviewFlag /> : null}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} min={min} />
    </label>
  )
}

function ReviewFlag() {
  return <em className="review-flag"><CircleAlert size={12} /> Please verify</em>
}
