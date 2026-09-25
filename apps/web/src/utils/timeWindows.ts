import type { QuestWindow } from '../types'

/** Parse "HH:MM" or "H:MM" to minutes since midnight. */
export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.trim().split(':').map((x) => parseInt(x, 10) || 0)
  return h * 60 + m
}

/** Format minutes since midnight to "HH:MM". */
export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/** Window offsets from wake (minutes): morning 0–180, afternoon 180–540, evening 540–end. */
const MORNING_END_OFFSET = 3 * 60
const AFTERNOON_END_OFFSET = 9 * 60
const EVENING_END_OFFSET = 14 * 60

export interface WindowBoundaries {
  morningEnd: number
  afternoonEnd: number
  eveningEnd: number
}

/** Sleep target in minutes for capping evening. "00:00" is handled in getWindowBoundaries. */
function sleepCapMinutes(sleepTarget: string | undefined): number | null {
  if (sleepTarget == null) return null
  const m = parseTimeToMinutes(sleepTarget)
  if (m === 0) return null
  return m
}

/** Get window end times (minutes since midnight) from wake time and optional sleep target. */
export function getWindowBoundaries(wakeTime: string, sleepTarget?: string): WindowBoundaries {
  const wakeM = parseTimeToMinutes(wakeTime)
  const eveningEndRaw = wakeM + EVENING_END_OFFSET
  let eveningEnd: number
  if (sleepTarget != null && parseTimeToMinutes(sleepTarget) === 0) {
    eveningEnd = 23 * 60 // Sleep 00:00 = bed at midnight → evening ends at 23:00
  } else {
    const sleepCap = sleepCapMinutes(sleepTarget)
    eveningEnd = sleepCap != null ? Math.min(eveningEndRaw, sleepCap) : eveningEndRaw
  }
  return {
    morningEnd: wakeM + MORNING_END_OFFSET,
    afternoonEnd: wakeM + AFTERNOON_END_OFFSET,
    eveningEnd,
  }
}

/** Current time in minutes since midnight (local). */
export function getCurrentMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** Which window is currently active based on wake time. */
export function getCurrentWindow(wakeTime: string, sleepTarget?: string): QuestWindow | null {
  const bounds = getWindowBoundaries(wakeTime, sleepTarget)
  const now = getCurrentMinutes()
  const wakeMinutes = parseTimeToMinutes(wakeTime)
  if (now < wakeMinutes) return null
  if (now < bounds.morningEnd) return 'morning'
  if (now < bounds.afternoonEnd) return 'afternoon'
  if (now < bounds.eveningEnd) return 'evening'
  return null
}

/** Minutes until the given window ends; 0 if already past. */
export function getMinutesUntilWindowEnd(
  window: QuestWindow,
  wakeTime: string,
  sleepTarget?: string
): number | null {
  if (window === 'flexible') return null
  const bounds = getWindowBoundaries(wakeTime, sleepTarget)
  const now = getCurrentMinutes()
  let endM: number
  if (window === 'morning') endM = bounds.morningEnd
  else if (window === 'afternoon') endM = bounds.afternoonEnd
  else endM = bounds.eveningEnd
  if (now >= endM) return 0
  return endM - now
}

/** Is this window in the past (expired)? */
export function isWindowExpired(
  window: QuestWindow,
  wakeTime: string,
  sleepTarget?: string
): boolean {
  if (window === 'flexible') return false
  const mins = getMinutesUntilWindowEnd(window, wakeTime, sleepTarget)
  return mins !== null && mins <= 0
}

/** Format minutes as "Xh Ym" or "Ym" or "Ended". */
export function formatMinutesRemaining(minutes: number): string {
  if (minutes <= 0) return 'Ended'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
