export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="StaySpan">
      <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 4a12 12 0 1 1-8.5 3.5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M5 5v8h8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="2.5" fill="currentColor" />
      </svg>
      {compact ? null : <span>StaySpan</span>}
    </div>
  )
}
