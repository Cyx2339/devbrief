import { isBrief, validateInput } from './domain.ts'
import { HISTORY_LIMIT } from './types.ts'
import type { HistoryEntry } from './types.ts'

const KEY = 'devbrief.history.v1'
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export function readHistory(storage: StorageLike = localStorage): HistoryEntry[] {
  const raw = storage.getItem(KEY)
  if (!raw) return []
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error('历史记录格式异常。')
  return parsed.filter((value): value is HistoryEntry => {
    if (!value || typeof value !== 'object') return false
    const entry = value as HistoryEntry
    return typeof entry.id === 'string' && typeof entry.createdAt === 'string'
      && typeof entry.updatedAt === 'string' && ['demo', 'service'].includes(entry.mode)
      && entry.input && typeof entry.input.source === 'string'
      && typeof entry.input.environment === 'string'
      && !validateInput(entry.input) && isBrief(entry.brief)
  }).slice(0, HISTORY_LIMIT)
}

export function writeHistory(entries: HistoryEntry[], storage: StorageLike = localStorage): void {
  storage.setItem(KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)))
}
