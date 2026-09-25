import type { GameState } from '../types'
import { normalizeScheduleCategories } from '../utils/scheduleParser'

const STORAGE_KEY = 'life-rpg-save'

function normalizeLoadedState(state: GameState): GameState {
  if (state.schedule) normalizeScheduleCategories(state.schedule)
  return state
}

export function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameState
    if (!parsed || typeof parsed.wallet !== 'number') return null
    return normalizeLoadedState(parsed)
  } catch {
    return null
  }
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function exportSaveFile(state: GameState): string {
  return JSON.stringify(state, null, 2)
}

export function importSaveFile(json: string): GameState | null {
  try {
    const parsed = JSON.parse(json) as GameState
    if (!parsed || typeof parsed.wallet !== 'number') return null
    return normalizeLoadedState(parsed)
  } catch {
    return null
  }
}

/** Temporary: clear saved game state from localStorage. Reload after to reset in-memory state. */
export function clearGameState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
