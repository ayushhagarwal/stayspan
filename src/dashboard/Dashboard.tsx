import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, FolderGit2, Plus, Settings } from 'lucide-react'
import { Logo } from '../shared/Logo'
import { getData, saveData, serializeDataExport, takeDraft } from '../shared/storage'
import { groupIntoTrips, updateTripGroups } from '../shared/trips'
import type { Stay, StayDraft, Trip, TripGroup } from '../shared/types'
import type { ExtractionFieldMap } from '../extraction/types'
import { StayEditor } from './StayEditor'
import { TripSection } from './TripSection'
import { GroupStaysDialog } from './GroupStaysDialog'

const EMPTY_DRAFT: StayDraft = {
  propertyName: '',
  checkIn: '',
  checkOut: '',
  cancellationDeadline: '',
  cancellationPolicy: '',
  address: '',
  phone: '',
  sourceName: '',
  sourceUrl: '',
}

export function Dashboard() {
  const [stays, setStays] = useState<Stay[]>([])
  const [tripGroups, setTripGroups] = useState<TripGroup[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState<Stay | null>(null)
  const [draft, setDraft] = useState<StayDraft | null>(null)
  const [reviewFields, setReviewFields] = useState<ExtractionFieldMap | undefined>()
  const [view, setView] = useState<'trips' | 'settings'>('trips')
  const [groupingTrip, setGroupingTrip] = useState<Trip | null>(null)

  useEffect(() => {
    Promise.all([getData(), takeDraft()]).then(([saved, captured]) => {
      setStays(saved.stays)
      setTripGroups(saved.tripGroups)
      if (captured) {
        setDraft(captured.draft)
        setReviewFields(captured.fields)
      }
      setLoaded(true)
    })
  }, [])

  const trips = useMemo(() => groupIntoTrips(stays, tripGroups), [stays, tripGroups])

  const commit = async (nextStays: Stay[], nextGroups = tripGroups) => {
    setStays(nextStays)
    setTripGroups(nextGroups)
    await saveData(nextStays, nextGroups)
  }

  const handleSave = async (values: StayDraft) => {
    const stay: Stay = editing
      ? { ...editing, ...values }
      : { ...values, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    await commit(editing ? stays.map((item) => item.id === editing.id ? stay : item) : [...stays, stay])
    setEditing(null)
    setDraft(null)
    setReviewFields(undefined)
  }

  const handleDelete = async (id: string) => {
    const nextGroups = tripGroups
      .map((group) => ({ ...group, stayIds: group.stayIds.filter((stayId) => stayId !== id) }))
      .filter((group) => group.stayIds.length >= 2)
    await commit(stays.filter((stay) => stay.id !== id), nextGroups)
  }

  const handleGroup = async (stayIds: string[]) => {
    if (!groupingTrip) return
    const groupId = groupingTrip.manualGroupId ?? crypto.randomUUID()
    const nextGroups = updateTripGroups(tripGroups, groupId, stayIds)
    await commit(stays, nextGroups)
    setGroupingTrip(null)
  }

  const openEditor = (stay?: Stay) => {
    setEditing(stay ?? null)
    setDraft(stay ? { ...stay } : EMPTY_DRAFT)
    setReviewFields(undefined)
  }

  const closeEditor = () => {
    setEditing(null)
    setDraft(null)
    setReviewFields(undefined)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav className="nav-list" aria-label="Primary navigation">
          <button className={view === 'trips' ? 'nav-item active' : 'nav-item'} onClick={() => setView('trips')}>
            <BriefcaseBusiness size={19} /> Trips
          </button>
          <button className={view === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => setView('settings')}>
            <Settings size={19} /> Settings
          </button>
        </nav>
        <a
          className="sidebar-link"
          href="https://github.com/ayushhagarwal/stayspan"
          target="_blank"
          rel="noreferrer"
        >
          <FolderGit2 size={18} /> View on GitHub
        </a>
        <p className="privacy-note">Local-first. Your stays never leave this browser.</p>
      </aside>

      <main className="main-content">
        {view === 'trips' ? (
          <>
            <header className="page-header">
              <div>
                <h1>Your stays</h1>
                <p>Every booking and deadline, in one clear timeline.</p>
              </div>
              <button className="primary-button" onClick={() => openEditor()}>
                <Plus size={19} /> Add stay
              </button>
            </header>

            {!loaded ? <div className="loading-state">Loading your stays…</div> : null}
            {loaded && trips.length === 0 ? (
              <section className="empty-state">
                <div className="empty-icon"><BriefcaseBusiness size={27} /></div>
                <h2>Your next stay starts here</h2>
                <p>Add a hotel booking and StaySpan will organize it into a trip automatically.</p>
                <button className="primary-button" onClick={() => openEditor()}><Plus size={18} /> Add your first stay</button>
              </section>
            ) : null}
            <div className="trip-list">
              {trips.map((trip, index) => (
                <TripSection
                  key={trip.id}
                  trip={trip}
                  heading={index === 0 ? 'Upcoming trip' : 'Later trip'}
                  onEdit={openEditor}
                  onDelete={handleDelete}
                  onGroup={setGroupingTrip}
                />
              ))}
            </div>
          </>
        ) : (
          <SettingsView stays={stays} tripGroups={tripGroups} onClear={() => commit([], [])} />
        )}
      </main>

      {draft ? (
        <StayEditor
          initial={draft}
          mode={editing ? 'edit' : 'add'}
          reviewFields={reviewFields}
          onClose={closeEditor}
          onSave={handleSave}
        />
      ) : null}
      {groupingTrip ? (
        <GroupStaysDialog
          key={groupingTrip.id}
          stays={stays}
          initialStayIds={groupingTrip.stays.map((stay) => stay.id)}
          manualGroup={Boolean(groupingTrip.manualGroupId)}
          onClose={() => setGroupingTrip(null)}
          onSave={handleGroup}
        />
      ) : null}
    </div>
  )
}

function SettingsView({ stays, tripGroups, onClear }: { stays: Stay[]; tripGroups: TripGroup[]; onClear: () => void }) {
  const exportData = () => {
    const blob = new Blob([serializeDataExport(stays, tripGroups)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'stayspan-export.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="settings-page">
      <header className="page-header"><div><h1>Settings</h1><p>StaySpan is local-first. Nothing is sent to a server.</p></div></header>
      <div className="settings-row">
        <div><h2>Export your data</h2><p>Download a portable JSON copy of all {stays.length} saved stays.</p></div>
        <button className="secondary-button" onClick={exportData}>Export JSON</button>
      </div>
      <div className="settings-row danger-row">
        <div><h2>Delete local data</h2><p>Remove every saved stay from this browser.</p></div>
        <button className="danger-button" onClick={() => { if (window.confirm('Delete every saved stay?')) onClear() }}>Delete all</button>
      </div>
    </section>
  )
}
