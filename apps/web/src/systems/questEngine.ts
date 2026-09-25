import type { Schedule, Quest, QuestWindow } from '../types'

const DEFAULT_WINDOW: QuestWindow = 'flexible'

function normalizeTimeOfDay(v: unknown): QuestWindow {
  if (v === 'morning' || v === 'afternoon' || v === 'evening' || v === 'flexible') return v
  return DEFAULT_WINDOW
}

/**
 * Generates today's quests from schedule. Uses weekday blocks; applies weekly events by day;
 * weekend uses weekendRules.minimumHabits if restFocused.
 * When thpModeActive and schedule has thpOverride, replaces listed blocks with THP.
 * Assigns each quest a window from block timeOfDay (or 'flexible').
 */
export function generateDailyQuests(
  schedule: Schedule,
  dateISO: string,
  _isNewDay?: boolean,
  thpModeActive?: boolean,
  _wakeTimeToday?: string | null
): Quest[] {
  const date = new Date(dateISO + 'T12:00:00')
  const day = date.getDay()
  const isWeekend = day === 0 || day === 6

  const quests: Quest[] = []
  let weekdayBlocks = schedule.weekdayBlocks
  if (schedule.thpOverride) {
    if (thpModeActive) {
      const replaceIds = new Set(schedule.thpOverride.replaceBlockIds)
      weekdayBlocks = weekdayBlocks.filter((b) => !replaceIds.has(b.id))
    } else {
      weekdayBlocks = weekdayBlocks.filter((b) => b.id !== 'THP')
    }
  }

  if (isWeekend && schedule.weekendRules.restFocused) {
    for (const habitId of schedule.weekendRules.minimumHabits) {
      const block = weekdayBlocks.find((b) => b.id === habitId)
      if (block) {
        quests.push(blockToQuest(block, schedule.priorities.includes(block.id)))
      }
    }
  } else {
    for (const block of weekdayBlocks) {
      quests.push(blockToQuest(block, schedule.priorities.includes(block.id)))
    }
  }

  for (const event of schedule.weeklyEvents) {
    if (event.day === day) {
      quests.push({
        id: event.id,
        title: event.title,
        category: 'Weekly',
        progressRequired: 1,
        progressCurrent: 0,
        coinReward: event.coinReward,
        required: false,
        completed: false,
        durationHours: event.duration,
        window: normalizeTimeOfDay(event.timeOfDay),
      })
    }
  }

  return quests
}

function blockToQuest(
  block: Schedule['weekdayBlocks'][0],
  isPriority: boolean
): Quest {
  const progressRequired = Math.max(1, Math.round(block.duration))
  return {
    id: block.id,
    title: block.title,
    category: block.category,
    progressRequired,
    progressCurrent: 0,
    coinReward: block.coinReward,
    required: isPriority,
    completed: false,
    durationHours: block.duration,
    window: normalizeTimeOfDay(block.timeOfDay),
  }
}
