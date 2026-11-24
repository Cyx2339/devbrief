export type TemplateId = 'incident' | 'requirement' | 'meeting'
export type RunState = 'idle' | 'generating' | 'completed' | 'stopped' | 'failed'

export interface BriefInput {
  template: TemplateId
  source: string
  environment: string
}

export interface Brief {
  title: string
  summary: string
  facts: string[]
  missing: string[]
  actions: string[]
  acceptance: string[]
}

export interface HistoryEntry {
  id: string
  createdAt: string
  updatedAt: string
  mode: 'demo' | 'service'
  input: BriefInput
  brief: Brief
}

export type BriefEvent =
  | { type: 'status'; message: string }
  | { type: 'delta'; content: string }
  | { type: 'result'; brief: Brief; mode?: 'live' | 'mock' }
  | { type: 'error'; message: string }

export const SOURCE_LIMIT = 12000
export const HISTORY_LIMIT = 30
