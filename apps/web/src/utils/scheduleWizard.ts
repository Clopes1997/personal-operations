import type { Schedule, WeekdayBlock, WeeklyEvent } from '../types'
import type { ScheduleWizardAnswers, WizardBlock } from '../types/ScheduleWizard'

/**
 * Parse user duration input to minutes. Accepts e.g. "30", "1h", "1.5h", "90m".
 * - Suffix m/min → minutes; h/hr → hours.
 * - No suffix: number ≤ 12 → hours (1, 1.5, 2); number > 12 → minutes (30, 45, 90).
 */
export function parseDurationToMinutes(input: string): number {
  const raw = (input ?? '').trim().toLowerCase()
  if (!raw) return 60
  const num = parseFloat(raw.replace(/[^\d.]/g, '').replace(/\.$/, '')) || 0
  if (Number.isNaN(num) || num < 0) return 60
  if (/[\d.]+\s*(m|min|minute|minutes)\s*$/.test(raw)) return Math.max(1, Math.round(num))
  if (/[\d.]+\s*(h|hr|hour|hours)\s*$/.test(raw)) return Math.max(15, Math.round(num * 60))
  if (num <= 12) return Math.max(15, Math.round(num * 60))
  return Math.max(1, Math.round(num))
}

/** Convert "Job Hunting" -> job_hunting */
function toId(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

/** Convert "job_hunting" -> "Job Hunting" */
function toTitle(id: string): string {
  return id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function defaultCategory(id: string): string {
  const lower = id.toLowerCase()
  if (lower.includes('job') || lower.includes('work') || lower.includes('career')) return 'Career'
  if (lower.includes('exercise') || lower.includes('workout') || lower.includes('health')) return 'Health'
  if (lower.includes('code') || lower.includes('study') || lower.includes('skill')) return 'Skills'
  if (lower.includes('music') || lower.includes('sing') || lower.includes('creative')) return 'Creative'
  return 'Daily'
}

function wizardBlockToWeekdayBlock(block: WizardBlock, index: number): WeekdayBlock {
  const id = toId(block.title) || `quest_${index}`
  const durationMinutes = parseDurationToMinutes(block.duration ?? '60')
  const durationHours = Math.max(0.25, durationMinutes / 60)
  return {
    id,
    title: block.title.trim() || toTitle(id),
    category: block.category ?? defaultCategory(id),
    duration: durationHours,
    coinReward: typeof block.coinReward === 'number' ? block.coinReward : 25,
    repeatable: block.repeatable !== false,
    timeOfDay: block.timeOfDay,
  }
}

/**
 * Build a valid Schedule from wizard answers.
 * Each quest keeps its own timeOfDay and duration from the wizard.
 */
export function buildScheduleFromWizardAnswers(answers: ScheduleWizardAnswers): Schedule {
  const blockIds = new Set<string>()
  const weekdayBlocks: WeekdayBlock[] = []
  const validBlocks = answers.blocks.filter((b) => b.title.trim().length > 0)

  for (let i = 0; i < validBlocks.length; i++) {
    const block = validBlocks[i]
    const wb = wizardBlockToWeekdayBlock(block, i)
    const id = wb.id
    if (!blockIds.has(id)) {
      blockIds.add(id)
      weekdayBlocks.push(wb)
    }
  }

  const priorityIds = answers.priorityIds.filter((id) => blockIds.has(id))
  const fallbackPriorities = weekdayBlocks.slice(0, 3).map((b) => b.id)

  const weeklyEvents: WeeklyEvent[] = answers.weeklyEvents.map((e, i) => ({
    id: toId(e.title) || `weekly_${i}`,
    title: e.title.trim() || `Weekly ${i + 1}`,
    day: e.day,
    duration: Math.max(0.25, parseDurationToMinutes(e.duration ?? '60') / 60),
    coinReward: typeof e.coinReward === 'number' ? e.coinReward : 25,
    timeOfDay: undefined,
  }))

  return {
    version: 1,
    profile: {
      wakeTime: answers.wakeTime || '08:00',
      sleepTarget: answers.sleepTarget || '23:00',
    },
    priorities: priorityIds.length ? priorityIds : fallbackPriorities,
    weekdayBlocks,
    weeklyEvents,
    weekendRules: {
      restFocused: true,
      minimumHabits: priorityIds.length ? priorityIds.slice(0, 3) : fallbackPriorities.slice(0, 2),
    },
    minimumDay: {
      tasks: priorityIds.length ? priorityIds : fallbackPriorities,
    },
  }
}
