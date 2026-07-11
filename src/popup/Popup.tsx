import { useState } from 'react'
import { ArrowRight, Check, ScanSearch } from 'lucide-react'
import { Logo } from '../shared/Logo'
import { saveDraft } from '../shared/storage'
import type { StayDraft } from '../shared/types'
import { collectPageSnapshot } from '../extraction/collector'
import { extractStay } from '../extraction/engine'
import type { ExtractionResult } from '../extraction/types'

type Status = 'idle' | 'scanning' | 'complete' | 'partial' | 'not-found' | 'error'

const emptyDraft = (url = ''): StayDraft => ({
  propertyName: '', checkIn: '', checkOut: '', cancellationDeadline: '', cancellationPolicy: '',
  address: '', phone: '', sourceName: '', sourceUrl: url,
})

export function Popup() {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ExtractionResult | null>(null)

  const openDashboard = async (withDraft?: StayDraft, extraction?: ExtractionResult) => {
    if (withDraft) await saveDraft(withDraft, extraction?.fields)
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      await chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') })
      window.close()
    } else {
      window.open('/dashboard.html', '_blank')
    }
  }

  const scanPage = async () => {
    setStatus('scanning')
    try {
      if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
        setStatus('not-found')
        return
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab.id) throw new Error('No active tab')
      const [{ result: pageSnapshot }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collectPageSnapshot })
      if (!pageSnapshot) throw new Error('No page snapshot returned')
      const extracted = extractStay(pageSnapshot)
      setResult(extracted)
      setStatus(extracted.status === 'none' ? 'not-found' : extracted.status)
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="popup-shell">
      <header><Logo /><span className="local-dot">Local only</span></header>
      <section className="popup-body">
        {(status === 'complete' || status === 'partial') && result ? (
          <>
            <div className="success-icon"><Check size={22} /></div>
            <h1>{status === 'complete' ? 'Booking details found' : 'Partial details found'}</h1>
            <p className="property-preview">{result.draft.propertyName || 'Untitled stay'}</p>
            <p>{status === 'complete' ? 'Review the extracted details before saving them to your timeline.' : 'We found some useful details. Add or correct anything you want before saving.'}</p>
            <button className="popup-primary" onClick={() => openDashboard(result.draft, result)}>Review & save <ArrowRight size={18} /></button>
          </>
        ) : (
          <>
            <div className="scan-icon"><ScanSearch size={27} /></div>
            <h1>Save this stay</h1>
            <p>{status === 'not-found' ? 'We could not confidently read this page. You can still add the booking manually.' : status === 'error' ? 'This page cannot be inspected. Add the booking manually instead.' : 'Open a hotel confirmation page and let StaySpan collect the essentials.'}</p>
            <button className="popup-primary" onClick={scanPage} disabled={status === 'scanning'}>{status === 'scanning' ? 'Looking for details…' : 'Scan this page'}</button>
            <button className="popup-secondary" onClick={() => openDashboard(emptyDraft())}>Add manually</button>
          </>
        )}
      </section>
      <button className="open-dashboard" onClick={() => openDashboard()}>Open all trips <ArrowRight size={16} /></button>
    </main>
  )
}
