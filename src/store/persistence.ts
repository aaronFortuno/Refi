import type { AppState } from '@/types'
import { sampleData } from './sampleData'

const STORAGE_KEY = 'refi-app-state'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return sampleData // Primera visita: dades de mostra
    return JSON.parse(raw) as AppState
  } catch {
    return sampleData
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function exportStateAsJson(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function importStateFromJson(json: string): AppState {
  const parsed = JSON.parse(json) as AppState
  if (!Array.isArray(parsed.prestecs) || !Array.isArray(parsed.escenaris)) {
    throw new Error('Format JSON invàlid')
  }
  return parsed
}

export function downloadJson(state: AppState): void {
  const blob = new Blob([exportStateAsJson(state)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `refi-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
