import type { StayDraft } from '../shared/types'

export type RectSnapshot = { x: number; y: number; width: number; height: number }

export type ElementSnapshot = {
  order: number
  text: string
  context: string
  tag: string
  role: string
  ariaLabel: string
  itemProp: string
  href: string
  headingLevel: number | null
  rect: RectSnapshot
}

export type StructuredSnapshot = Record<string, unknown>

export type PageSnapshot = {
  url: string
  hostname: string
  title: string
  description: string
  elements: ElementSnapshot[]
  structured: StructuredSnapshot[]
}

export type ExtractionEvidence = {
  source: 'structured-data' | 'semantic-label' | 'heading-context' | 'link' | 'metadata'
  reason: string
}

export type ExtractionField<T = string> = {
  value: T
  confidence: number
  evidence: ExtractionEvidence
  needsReview: boolean
}

export type ExtractionFieldMap = Partial<Record<keyof StayDraft, ExtractionField<string>>>

export type ExtractionResult = {
  draft: StayDraft
  fields: ExtractionFieldMap
  missingFields: Array<keyof StayDraft>
  status: 'complete' | 'partial' | 'none'
}

export type DraftEnvelope = {
  draft: StayDraft
  fields?: ExtractionFieldMap
}
