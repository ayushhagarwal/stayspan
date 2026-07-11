import { sampleStays } from './sample'
import type { Stay, StayDraft, TripGroup } from './types'
import type { DraftEnvelope, ExtractionFieldMap } from '../extraction/types'

const DATA_KEY = 'stayspan_data_v1'
const DRAFT_KEY = 'stayspan_draft_v1'

type StoredDataV1 = { version: 1; stays: Stay[]; hasSeenDemo: boolean }
export type StoredData = { version: 2; stays: Stay[]; tripGroups: TripGroup[]; hasSeenDemo: boolean }

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

export async function getData(): Promise<StoredData> {
  const stored = await readRaw<StoredData | StoredDataV1>(DATA_KEY)
  if (stored?.version === 2) return stored
  if (stored?.version === 1) {
    const migrated: StoredData = { version: 2, stays: stored.stays, tripGroups: [], hasSeenDemo: stored.hasSeenDemo }
    await writeRaw(DATA_KEY, migrated)
    return migrated
  }

  const initial: StoredData = { version: 2, stays: sampleStays, tripGroups: [], hasSeenDemo: false }
  await writeRaw(DATA_KEY, initial)
  return initial
}

export async function saveData(stays: Stay[], tripGroups: TripGroup[]): Promise<void> {
  await writeRaw<StoredData>(DATA_KEY, { version: 2, stays, tripGroups, hasSeenDemo: true })
}

export function serializeDataExport(stays: Stay[], tripGroups: TripGroup[]): string {
  return JSON.stringify({ version: 2, stays, tripGroups }, null, 2)
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
