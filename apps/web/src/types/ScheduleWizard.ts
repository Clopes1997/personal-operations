import type { TimeOfDay } from './Schedule'

/** Explicit category options. "Auto" in the UI infers from title (often results in Daily). */
export const QUEST_CATEGORIES = ['Adulting', 'Career', 'Creative', 'Health', 'Skills'] as const
export type QuestCategory = (typeof QUEST_CATEGORIES)[number]

/**
 * One daily quest as configured in the wizard (before we have schedule IDs).
 */
export interface WizardBlock {
  /** User-facing title; id is derived when building schedule. */
  title: string
  /** User-facing duration: e.g. "30", "1h", "1.5h", "90m". Parsed to minutes when building schedule. */
  duration: string
  /** When to do this quest: morning, afternoon, evening, or flexible. */
  timeOfDay: TimeOfDay
  /** Category tag (e.g. Career, Health). Default derived from title if not set. */
  category?: QuestCategory | string
  /** Coin reward on completion; default 25. */
  coinReward?: number
  /** Whether progress can be split (e.g. 2h job hunting in chunks). Default true. */
  repeatable?: boolean
}

/**
 * One weekly event as configured in the wizard.
 */
export interface WizardWeeklyEvent {
  title: string
  day: number
  /** User-facing duration: e.g. "60", "1h", "90m". Parsed when building schedule. */
  duration: string
  coinReward: number
}

/**
 * Answers collected from the schedule wizard.
 * Quest-centric: each daily quest has its own time of day and duration.
 */
export interface ScheduleWizardAnswers {
  wakeTime: string
  sleepTarget: string
  /** Daily quests; each has its own timeOfDay and duration. */
  blocks: WizardBlock[]
  /** Block IDs (derived from block titles) that keep streak alive. */
  priorityIds: string[]
  weeklyEvents: WizardWeeklyEvent[]
}
