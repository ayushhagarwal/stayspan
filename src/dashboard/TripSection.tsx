import { CalendarDays, ExternalLink, MapPin, Pencil, Phone, Trash2, TriangleAlert, UsersRound } from 'lucide-react'
import { formatLongDate, formatShortDate, formatTime, nightsBetween, sourceLabel } from '../shared/format'
import { destinationFromAddress, tripTitle } from '../shared/trips'
import type { Stay, Trip } from '../shared/types'

type Props = {
  trip: Trip
  heading: string
  onEdit: (stay: Stay) => void
  onDelete: (id: string) => void
  onGroup: (trip: Trip) => void
}

export function TripSection({ trip, heading, onEdit, onDelete, onGroup }: Props) {
  const nights = nightsBetween(trip.start, trip.end)
  const tripDates = nights ? `${formatShortDate(trip.start)} – ${formatShortDate(trip.end)} · ${nights} nights` : 'Dates not added yet'
  return (
    <section className="trip-section">
      <h2 className="section-label">{heading}</h2>
      <div className="trip-panel">
        <div className="trip-panel-header">
          <div className="trip-summary">
            <CalendarDays size={24} />
            <div>
              <h2>{tripTitle(trip)}</h2>
              <p>{tripDates}</p>
            </div>
          </div>
          <button className="group-button" onClick={() => onGroup(trip)} aria-label={`Group stays in ${tripTitle(trip)}`}>
            <UsersRound size={16} /> Group stays
          </button>
        </div>

        <div className="route" aria-label="Trip route">
          {trip.stays.map((stay) => (
            <div className="route-stop" key={stay.id}>
              <strong>{destinationFromAddress(stay.address)}</strong>
              <span>{stay.checkIn || stay.checkOut ? `${formatShortDate(stay.checkIn)} – ${formatShortDate(stay.checkOut)}` : 'Dates not added'}</span>
              <i aria-hidden="true" />
            </div>
          ))}
        </div>

        <div className="stay-stack">
          {trip.stays.map((stay, index) => (
            <StayCard key={stay.id} stay={stay} index={index + 1} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StayCard({ stay, index, onEdit, onDelete }: { stay: Stay; index: number; onEdit: (stay: Stay) => void; onDelete: (id: string) => void }) {
  return (
    <article className="stay-card">
      <div className="stay-number">{index}</div>
      <div className="stay-card-top">
        <div className="property-block"><h3>{stay.propertyName || 'Untitled stay'}</h3><p>{destinationFromAddress(stay.address)}</p></div>
        <DateBlock label="Check-in" value={stay.checkIn} />
        <DateBlock label="Check-out" value={stay.checkOut} />
        <div className="deadline-block">
          <span>Cancellation deadline</span>
          <strong><TriangleAlert size={16} /> {formatLongDate(stay.cancellationDeadline)}</strong>
          <small>{formatTime(stay.cancellationDeadline)}</small>
        </div>
      </div>
      <div className="stay-card-bottom">
        <div><span><MapPin size={16} /> Address</span><p>{stay.address || 'Not added'}</p></div>
        <div><span><Phone size={16} /> Phone</span>{stay.phone ? <a href={`tel:${stay.phone}`}>{stay.phone}</a> : <p>Not added</p>}</div>
        <div><span><ExternalLink size={16} /> Source</span><a href={stay.sourceUrl || '#'} target="_blank" rel="noreferrer">{sourceLabel(stay.sourceUrl, stay.sourceName)}</a></div>
        <div className="card-actions">
          <button aria-label={`Edit ${stay.propertyName}`} onClick={() => onEdit(stay)}><Pencil size={17} /></button>
          <button className="delete-action" aria-label={`Delete ${stay.propertyName}`} onClick={() => { if (window.confirm(`Delete ${stay.propertyName}?`)) onDelete(stay.id) }}><Trash2 size={17} /></button>
        </div>
      </div>
      {stay.cancellationPolicy ? <p className="policy-line">{stay.cancellationPolicy}</p> : null}
    </article>
  )
}

function DateBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="date-block">
      <span>{label}</span>
      <strong><CalendarDays size={15} /> {formatLongDate(value)}</strong>
      <small>{formatTime(value)}</small>
    </div>
  )
}
