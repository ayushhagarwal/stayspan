import * as chrono from 'chrono-node'
import type { StayDraft } from '../shared/types'
import type { ElementSnapshot, ExtractionEvidence, ExtractionField, ExtractionFieldMap, ExtractionResult, PageSnapshot } from './types'

const HIGH_CONFIDENCE = 0.8
const MIN_CONFIDENCE = 0.55
const ESSENTIAL_FIELDS: Array<keyof StayDraft> = ['propertyName', 'checkIn', 'checkOut', 'cancellationDeadline', 'address', 'phone']
const GENERIC_HEADINGS = /^(booking|booking details|manage booking|your booking|confirmed|confirmation|hotels?|accommodation|reservation|trip|my bookings?)$/i
const GENERIC_CONFIRMATION_HEADING = /\b(?:booking|reservation)\b.*\b(?:confirmed|confirmation|details)\b|\b(?:confirmed|confirmation)\b.*\b(?:booking|reservation)\b/i
const DATE_BOUNDARY = /\b(check[- ]?in|arrival|check[- ]?out|departure|cancell?ation|address|phone|contact|booking (?:id|number)|reservation)\b/i
const LABELS = {
  checkIn: ['check-in', 'check in', 'arrival', 'arrival date'],
  checkOut: ['check-out', 'check out', 'departure', 'departure date'],
  address: ['address', 'property address', 'location'],
  phone: ['phone', 'telephone', 'contact number', 'property contact', 'hotel contact'],
  cancellation: ['cancellation', 'cancellation policy', 'cancel for free', 'free cancellation'],
}

type Candidate = { value: string; confidence: number; evidence: ExtractionEvidence }

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()
const clampConfidence = (value: number) => Math.max(0, Math.min(1, Math.round(value * 100) / 100))
const field = (candidate?: Candidate): ExtractionField<string> | undefined => candidate && candidate.confidence >= MIN_CONFIDENCE ? {
  value: candidate.value,
  confidence: clampConfidence(candidate.confidence),
  evidence: candidate.evidence,
  needsReview: candidate.confidence < HIGH_CONFIDENCE,
} : undefined
const best = (candidates: Candidate[]) => candidates.filter((candidate) => candidate.value.trim()).sort((a, b) => b.confidence - a.confidence)[0]

function structuredLodgings(snapshot: PageSnapshot): Record<string, unknown>[] {
  return snapshot.structured.filter((item) => {
    const type = item['@type']
    const types = Array.isArray(type) ? type : [type]
    return types.some((value) => ['Hotel', 'LodgingBusiness', 'Resort', 'Hostel', 'BedAndBreakfast', 'Accommodation'].includes(String(value)))
  })
}

function labelMatches(element: ElementSnapshot, labels: string[]) {
  const text = normalize(`${element.text} ${element.ariaLabel}`).toLowerCase()
  return labels.some((label) => text === label || text.startsWith(`${label}:`) || text.startsWith(`${label} `))
}

function nearbyElements(snapshot: PageSnapshot, label: ElementSnapshot, limit = 8) {
  return snapshot.elements.filter((element) => {
    if (element.order === label.order) return false
    const orderDistance = element.order - label.order
    const sameContext = element.context === label.context
    const verticalDistance = Math.abs(element.rect.y - label.rect.y)
    const nearbyLayout = verticalDistance < 180 && element.rect.x >= label.rect.x - 30
    return (orderDistance > 0 && orderDistance <= limit) || sameContext || nearbyLayout
  })
}

function segmentAfterLabel(context: string, labels: string[]) {
  const lower = context.toLowerCase()
  const match = labels.map((label) => ({ label, index: lower.indexOf(label) })).filter((entry) => entry.index >= 0).sort((a, b) => a.index - b.index)[0]
  if (!match) return context
  const start = match.index + match.label.length
  const remainder = context.slice(start).replace(/^\s*[:\-–|]?\s*/, '')
  const boundary = remainder.search(DATE_BOUNDARY)
  return normalize((boundary > 0 ? remainder.slice(0, boundary) : remainder).slice(0, 240))
}

export function parseDateValue(text: string, fallbackHour: number): { value: string; hasTime: boolean } | undefined {
  const separatedText = text.replace(/(\d{4})(?=(?:[01]?\d|2[0-3]):[0-5]\d)/g, '$1 ')
  const timeRange = separatedText.match(/\b((?:[01]?\d|2[0-3]):[0-5]\d)\s*[-–]\s*(?:[01]?\d|2[0-3]):[0-5]\d\b/)
  const parseableText = timeRange ? separatedText.replace(timeRange[0], timeRange[1]) : separatedText
  const parsed = chrono.parse(parseableText, new Date(), { forwardDate: true })[0]
  if (!parsed) return undefined
  const date = parsed.start.date()
  let hasTime = parsed.start.isCertain('hour')
  const explicitTime = parseableText.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)
  if (!hasTime && explicitTime && !/\b[ap]\.?m\.?\b/i.test(parseableText)) {
    date.setHours(Number(explicitTime[1]), Number(explicitTime[2]), 0, 0)
    hasTime = true
  }
  if (!hasTime) date.setHours(fallbackHour, 0, 0, 0)
  const pad = (value: number) => String(value).padStart(2, '0')
  return {
    value: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`,
    hasTime,
  }
}

function extractDate(snapshot: PageSnapshot, labels: string[], fallbackHour: number, reason: string): Candidate | undefined {
  const candidates: Candidate[] = []
  for (const label of snapshot.elements.filter((element) => labelMatches(element, labels))) {
    const contexts = [segmentAfterLabel(label.context, labels), ...nearbyElements(snapshot, label).map((element) => element.text)]
    for (const [index, text] of contexts.entries()) {
      const parsed = parseDateValue(text, fallbackHour)
      if (!parsed) continue
      const confidence = (index === 0 ? 0.86 : 0.72) - (parsed.hasTime ? 0 : 0.12)
      candidates.push({ value: parsed.value, confidence, evidence: { source: 'semantic-label', reason } })
    }
  }
  return best(candidates)
}

function extractPropertyName(snapshot: PageSnapshot, lodging: Record<string, unknown>[]): Candidate | undefined {
  const candidates: Candidate[] = []
  const pageHasBookingLanguage = snapshot.elements.some((element) => /check[- ]?in|check[- ]?out|cancell?ation|reservation|booking id|room type/i.test(element.text))
  for (const item of lodging) {
    const name = normalize(String(item.name || ''))
    if (name.length >= 3) candidates.push({ value: name, confidence: 0.98, evidence: { source: 'structured-data', reason: 'Lodging name in structured metadata' } })
  }
  for (const element of snapshot.elements) {
    const value = normalize(element.text)
    if (!element.headingLevel || value.length < 3 || value.length > 120 || GENERIC_HEADINGS.test(value) || GENERIC_CONFIRMATION_HEADING.test(value)) continue
    const context = element.context.toLowerCase()
    const bookingContext = /check[- ]?in|check[- ]?out|address|room|guest|stay/.test(context)
    const levelBoost = element.headingLevel === 1 ? 0.05 : 0
    if (!bookingContext && !pageHasBookingLanguage) continue
    candidates.push({
      value,
      confidence: (bookingContext ? 0.82 : 0.58) + levelBoost,
      evidence: { source: 'heading-context', reason: bookingContext ? 'Heading grouped with booking details' : 'Prominent page heading' },
    })
  }
  const titlePart = normalize(snapshot.title.split(/[|–-]/)[0])
  if (pageHasBookingLanguage && titlePart.length >= 3 && !GENERIC_HEADINGS.test(titlePart)) candidates.push({ value: titlePart, confidence: 0.56, evidence: { source: 'metadata', reason: 'Page title on a booking page' } })
  return best(candidates)
}

function addressFromStructured(item: Record<string, unknown>): string {
  const address = item.address
  if (typeof address === 'string') return normalize(address)
  if (!address || typeof address !== 'object') return ''
  const value = address as Record<string, unknown>
  return [value.streetAddress, value.addressLocality, value.addressRegion, value.postalCode, value.addressCountry].filter(Boolean).join(', ')
}

function looksLikeAddress(value: string) {
  return value.length >= 12 && /[A-Za-z]{3}/.test(value) && (/\d/.test(value) || value.split(',').length >= 3)
}

function looksLikeStandaloneAddress(value: string) {
  const commas = value.split(',').length - 1
  return looksLikeAddress(value) && commas >= 2 && !/check[- ]?in|check[- ]?out|cancell?ation|booking|reservation|guest|night|room/i.test(value)
}

function extractAddress(snapshot: PageSnapshot, lodging: Record<string, unknown>[]): Candidate | undefined {
  const candidates: Candidate[] = []
  for (const item of lodging) {
    const value = addressFromStructured(item)
    if (value) candidates.push({ value, confidence: 0.98, evidence: { source: 'structured-data', reason: 'Lodging address in structured metadata' } })
  }
  for (const element of snapshot.elements) {
    if ((element.tag === 'address' || /address/i.test(element.itemProp)) && looksLikeAddress(element.text)) {
      candidates.push({ value: element.text, confidence: 0.92, evidence: { source: 'semantic-label', reason: 'Semantic address element' } })
    }
    if (labelMatches(element, LABELS.address)) {
      for (const nearby of nearbyElements(snapshot, element, 6)) {
        if (looksLikeAddress(nearby.text) && !DATE_BOUNDARY.test(nearby.text)) candidates.push({ value: nearby.text, confidence: 0.82, evidence: { source: 'semantic-label', reason: 'Address value near its label' } })
      }
      const segment = segmentAfterLabel(element.context, LABELS.address)
      if (looksLikeAddress(segment)) candidates.push({ value: segment, confidence: 0.86, evidence: { source: 'semantic-label', reason: 'Address in labelled booking section' } })
    }
    if (/maps?|directions?/i.test(element.href) && looksLikeAddress(element.text)) candidates.push({ value: element.text, confidence: 0.88, evidence: { source: 'link', reason: 'Address attached to a map link' } })
    if (['p', 'address', 'a'].includes(element.tag) && looksLikeStandaloneAddress(element.text)) {
      candidates.push({ value: element.text, confidence: 0.64, evidence: { source: 'semantic-label', reason: 'Postal-looking text in booking content' } })
    }
  }
  return best(candidates)
}

function validPhone(value: string, context = '') {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return false
  if (/booking|reservation|confirmation|reference|pin|id/i.test(context)) return false
  return value.trim().startsWith('+') || /[() -]/.test(value)
}

function extractPhone(snapshot: PageSnapshot, lodging: Record<string, unknown>[]): Candidate | undefined {
  const candidates: Candidate[] = []
  for (const item of lodging) {
    const value = normalize(String(item.telephone || ''))
    if (validPhone(value)) candidates.push({ value, confidence: 0.98, evidence: { source: 'structured-data', reason: 'Lodging phone in structured metadata' } })
  }
  for (const element of snapshot.elements) {
    if (element.href.startsWith('tel:')) {
      const value = decodeURIComponent(element.href.slice(4)).trim()
      if (validPhone(value)) candidates.push({ value, confidence: 0.98, evidence: { source: 'link', reason: 'Telephone link' } })
    }
    if (!labelMatches(element, LABELS.phone)) continue
    const values = [segmentAfterLabel(element.context, LABELS.phone), ...nearbyElements(snapshot, element, 5).map((nearby) => nearby.text)]
    for (const text of values) {
      const matches = text.match(/\+?\d[\d ()-]{5,}\d/g) || []
      for (const value of matches) if (validPhone(value, text)) candidates.push({ value: normalize(value), confidence: 0.82, evidence: { source: 'semantic-label', reason: 'Phone number near a contact label' } })
    }
  }
  return best(candidates)
}

function extractCancellationPolicy(snapshot: PageSnapshot): Candidate | undefined {
  const candidates: Candidate[] = []
  for (const element of snapshot.elements) {
    const ownText = normalize(element.text)
    const context = normalize(element.context || ownText)
    const ownHasPolicy = LABELS.cancellation.some((label) => ownText.toLowerCase().includes(label)) && ownText.length >= 15
    const lowerContext = context.toLowerCase()
    const start = LABELS.cancellation.map((label) => lowerContext.indexOf(label)).filter((index) => index >= 0).sort((a, b) => a - b)[0]
    if (!ownHasPolicy && start === undefined) continue
    const text = ownHasPolicy ? ownText : context.slice(start, start + 500)
    if (text.length < 15 || text.length > 900) continue
    const hasFreeCancellation = /free cancellation|cancel for free/i.test(text)
    const hasDeadlineLanguage = /\buntil\b|\bbefore\b|\bby\b/i.test(text)
    const hasDate = chrono.parse(text, new Date(), { forwardDate: true }).length > 0
    const interactivePenalty = ['a', 'button'].includes(element.tag) ? 0.12 : 0
    const shortPenalty = text.length < 40 ? 0.12 : 0
    const confidence = 0.68 + (hasFreeCancellation ? 0.08 : 0) + (hasDeadlineLanguage ? 0.08 : 0) + (hasDate ? 0.1 : 0) - interactivePenalty - shortPenalty
    candidates.push({ value: text.slice(0, 200), confidence, evidence: { source: 'semantic-label', reason: hasDate ? 'Detailed cancellation policy with a date' : 'Cancellation language in booking details' } })
  }
  return best(candidates)
}

function extractCancellationDeadline(policy?: Candidate): Candidate | undefined {
  if (!policy) return undefined
  const parsed = parseDateValue(policy.value, 23)
  if (!parsed) return undefined
  return { value: parsed.value, confidence: parsed.hasTime ? 0.84 : 0.7, evidence: { source: 'semantic-label', reason: 'Date parsed from cancellation policy' } }
}

function emptyDraft(snapshot: PageSnapshot): StayDraft {
  return { propertyName: '', checkIn: '', checkOut: '', cancellationDeadline: '', cancellationPolicy: '', address: '', phone: '', sourceName: snapshot.hostname, sourceUrl: snapshot.url }
}

export function extractStay(snapshot: PageSnapshot): ExtractionResult {
  const lodging = structuredLodgings(snapshot)
  const policyCandidate = extractCancellationPolicy(snapshot)
  const candidates: Partial<Record<keyof StayDraft, Candidate | undefined>> = {
    propertyName: extractPropertyName(snapshot, lodging),
    checkIn: extractDate(snapshot, LABELS.checkIn, 15, 'Date and time near a check-in label'),
    checkOut: extractDate(snapshot, LABELS.checkOut, 11, 'Date and time near a check-out label'),
    cancellationDeadline: extractCancellationDeadline(policyCandidate),
    cancellationPolicy: policyCandidate,
    address: extractAddress(snapshot, lodging),
    phone: extractPhone(snapshot, lodging),
    sourceName: { value: snapshot.hostname, confidence: 1, evidence: { source: 'metadata', reason: 'Current page hostname' } },
    sourceUrl: { value: snapshot.url, confidence: 1, evidence: { source: 'metadata', reason: 'Current page URL' } },
  }

  const checkIn = candidates.checkIn?.value ? new Date(candidates.checkIn.value) : undefined
  const checkOut = candidates.checkOut?.value ? new Date(candidates.checkOut.value) : undefined
  if (checkIn && checkOut && checkOut <= checkIn) candidates.checkOut = undefined
  const deadline = candidates.cancellationDeadline?.value ? new Date(candidates.cancellationDeadline.value) : undefined
  if (deadline && checkIn && deadline > checkIn) candidates.cancellationDeadline = undefined

  const fields: ExtractionFieldMap = {}
  const draft = emptyDraft(snapshot)
  for (const key of Object.keys(candidates) as Array<keyof StayDraft>) {
    const extracted = field(candidates[key])
    if (!extracted) continue
    fields[key] = extracted
    draft[key] = extracted.value
  }
  const missingFields = ESSENTIAL_FIELDS.filter((key) => !draft[key])
  const coreCount = (['propertyName', 'checkIn', 'checkOut'] as Array<keyof StayDraft>).filter((key) => Boolean(draft[key])).length
  return { draft, fields, missingFields, status: coreCount === 0 ? 'none' : missingFields.length === 0 ? 'complete' : 'partial' }
}
