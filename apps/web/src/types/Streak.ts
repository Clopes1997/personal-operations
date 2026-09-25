/**
 * Streak — global streak state. Shield allows one missed day without breaking.
 */
export interface Streak {
  current: number
  longest: number
  shieldUsed: boolean
  lastCompletedDate: string | null
}
