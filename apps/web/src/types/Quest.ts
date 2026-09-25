/** Time-of-day window for quest grouping and soft urgency. */
export type QuestWindow = 'morning' | 'afternoon' | 'evening' | 'flexible'

/**
 * Quest — a single daily task generated from schedule or minimum-day rules.
 * progressRequired/progressCurrent support partial completion (e.g. 3 applications).
 * durationHours is optional, for display (e.g. "15 min").
 * window is set from schedule block timeOfDay; used for grouping and "active window" UI.
 */
export interface Quest {
  id: string
  title: string
  category: string
  progressRequired: number
  progressCurrent: number
  coinReward: number
  required: boolean
  completed: boolean
  /** Optional, in hours; used to show time value on card (e.g. 0.25 → "15 min"). */
  durationHours?: number
  /** Time window for this quest (from schedule block or 'flexible'). */
  window: QuestWindow
  /** True if completed while the quest's time window was still active (for phase bonus display). */
  completedInPhase?: boolean
}
