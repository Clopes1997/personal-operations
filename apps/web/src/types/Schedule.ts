/**
 * Schedule — canonical schema (version 1). Defines life structure; never holds game progress.
 * See .cursor/rules/schedule_schema.mdc
 */
export interface ScheduleProfile {
  wakeTime: string
  sleepTarget: string
}

/** When to do this block: morning, afternoon, evening, or flexible (any time). */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'flexible'

export interface WeekdayBlock {
  id: string
  title: string
  category: string
  duration: number
  coinReward: number
  repeatable: boolean
  /** Optional. When to do this quest; default 'flexible'. */
  timeOfDay?: TimeOfDay
}

export interface WeeklyEvent {
  id: string
  title: string
  day: number
  duration: number
  coinReward: number
  /** Optional. When to do this event; default 'flexible'. */
  timeOfDay?: TimeOfDay
}

export interface WeekendRules {
  restFocused: boolean
  minimumHabits: string[]
}

export interface MinimumDay {
  tasks: string[]
}

/** When THP mode is active, these block IDs are replaced by the THP block. */
export interface ThpOverride {
  replaceBlockIds: string[]
}

export interface Schedule {
  version: number
  profile: ScheduleProfile
  priorities: string[]
  weekdayBlocks: WeekdayBlock[]
  weeklyEvents: WeeklyEvent[]
  weekendRules: WeekendRules
  minimumDay: MinimumDay
  /** Optional. When set, THP mode replaces listed blocks with the THP block. */
  thpOverride?: ThpOverride
}
