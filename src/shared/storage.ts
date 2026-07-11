import { sampleStays } from './sample'
import type { Stay, StayDraft } from './types'
import type { DraftEnvelope, ExtractionFieldMap } from '../extraction/types'

const DATA_KEY = 'stayspan_data_v1'
const DRAFT_KEY = 'stayspan_draft_v1'

type StoredData = { version: 1; stays: Stay[]; hasSeenDemo: boolean }

const hasChromeStorage = () => typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)

async function readRaw<T>(key: string): Promise<T | undefined> {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(key)
    return result[key] as T | undefined
  }
  const value = localStorage.getItem(key)
  return value ? (JSON.parse(value) as T) : undefined
}

async function writeRaw<T>(key: string, value: T): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [key]: value })
    return
  }
  localStorage.setItem(key, JSON.stringify(value))
}

export async function getStays(): Promise<Stay[]> {
  const stored = await readRaw<StoredData>(DATA_KEY)
  if (stored?.version === 1) return stored.stays

  const initial: StoredData = { version: 1, stays: sampleStays, hasSeenDemo: false }
  await writeRaw(DATA_KEY, initial)
  return initial.stays
}

export async function saveStays(stays: Stay[]): Promise<void> {
  await writeRaw<StoredData>(DATA_KEY, { version: 1, stays, hasSeenDemo: true })
}

export async function saveDraft(draft: StayDraft, fields?: ExtractionFieldMap): Promise<void> {
  await writeRaw<DraftEnvelope>(DRAFT_KEY, { draft, fields })
}

export async function takeDraft(): Promise<DraftEnvelope | undefined> {
  const stored = await readRaw<DraftEnvelope | StayDraft>(DRAFT_KEY)
  if (!stored) return undefined
  if (hasChromeStorage()) await chrome.storage.local.remove(DRAFT_KEY)
  else localStorage.removeItem(DRAFT_KEY)
  return 'draft' in stored ? stored : { draft: stored }
}
