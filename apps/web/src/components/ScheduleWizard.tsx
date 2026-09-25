import { useState } from 'react'
import type { ScheduleWizardAnswers, WizardBlock } from '../types/ScheduleWizard'
import { QUEST_CATEGORIES } from '../types/ScheduleWizard'
import type { Schedule, TimeOfDay } from '../types'
import { buildScheduleFromWizardAnswers } from '../utils/scheduleWizard'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TIME_OF_DAY_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'flexible', label: 'Anytime' },
]

function toId(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

const defaultBlock: WizardBlock = {
  title: '',
  duration: '1h',
  timeOfDay: 'flexible',
  coinReward: 25,
  repeatable: true,
}

const defaultAnswers: ScheduleWizardAnswers = {
  wakeTime: '08:00',
  sleepTarget: '23:00',
  blocks: [
    { ...defaultBlock, title: 'Coding practice', duration: '1h', timeOfDay: 'flexible', category: 'Skills' },
    { ...defaultBlock, title: 'Exercise', duration: '30', timeOfDay: 'morning', category: 'Health' },
  ],
  priorityIds: [],
  weeklyEvents: [],
}

const TOTAL_STEPS = 5

interface ScheduleWizardProps {
  onComplete: (schedule: Schedule) => void
  onCancel?: () => void
}

export function ScheduleWizard({ onComplete, onCancel }: ScheduleWizardProps) {
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState<ScheduleWizardAnswers>(defaultAnswers)

  const update = (patch: Partial<ScheduleWizardAnswers>) => {
    setAnswers((a) => ({ ...a, ...patch }))
  }

  const schedule = buildScheduleFromWizardAnswers(answers)

  const handleDownload = () => {
    const json = JSON.stringify(schedule, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'life-rpg-schedule.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleUseSchedule = () => {
    onComplete(schedule)
  }

  const setBlock = (index: number, patch: Partial<WizardBlock>) => {
    const next = [...answers.blocks]
    next[index] = { ...next[index], ...patch }
    update({ blocks: next })
  }

  const addBlock = () => {
    update({ blocks: [...answers.blocks, { ...defaultBlock }] })
  }

  const removeBlock = (index: number) => {
    const next = answers.blocks.filter((_, i) => i !== index)
    const blockId = toId(answers.blocks[index]?.title ?? '')
    const priorityIds = blockId
      ? answers.priorityIds.filter((id) => id !== blockId)
      : answers.priorityIds
    update({ blocks: next, priorityIds })
  }

  const togglePriority = (blockId: string) => {
    const next = answers.priorityIds.includes(blockId)
      ? answers.priorityIds.filter((id) => id !== blockId)
      : [...answers.priorityIds, blockId]
    update({ priorityIds: next })
  }

  const validBlocks = answers.blocks.filter((b) => b.title.trim().length > 0)
  const canProceedFromQuests = validBlocks.length > 0

  const stepLabel = `Step ${step} of ${TOTAL_STEPS}`

  // —— Step 1: Profile ——
  if (step === 1) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 min-w-0">
        <p className="text-xs text-[var(--text-muted)] mb-2">{stepLabel}</p>
        <h2 className="text-lg font-bold mb-4">Create your schedule</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">Set your day boundaries. You can change these later.</p>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">What time do you wake up?</label>
            <input
              type="time"
              value={answers.wakeTime}
              onChange={(e) => update({ wakeTime: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-[var(--text)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">What time do you aim to sleep?</label>
            <input
              type="time"
              value={answers.sleepTarget}
              onChange={(e) => update({ sleepTarget: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-[var(--text)]"
            />
          </div>
        </div>
        <div className="flex justify-between mt-6">
          {onCancel && (
            <button type="button" onClick={onCancel} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
              Cancel
            </button>
          )}
          <button type="button" onClick={() => setStep(2)} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 ml-auto">
            Next
          </button>
        </div>
      </section>
    )
  }

  // —— Step 2: Daily quests (per-quest time + duration) ——
  if (step === 2) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 min-w-0">
        <p className="text-xs text-[var(--text-muted)] mb-2">{stepLabel}</p>
        <h2 className="text-lg font-bold mb-4">Daily quests</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Add the tasks you want as daily quests. For each one, choose <strong>when</strong> you do it and <strong>how long</strong>.
        </p>
        <div className="space-y-3 mb-4">
          {answers.blocks.map((block, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] p-3 bg-[var(--surface-raised)]">
              <input
                type="text"
                value={block.title}
                onChange={(e) => setBlock(i, { title: e.target.value })}
                placeholder="Quest name (e.g. Job hunting, Exercise)"
                className="flex-1 min-w-[140px] rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]"
              />
              <select
                value={block.category ?? ''}
                onChange={(e) => setBlock(i, { category: e.target.value || undefined })}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)] min-w-[110px]"
                title="Category tag"
              >
                <option value="">Auto</option>
                {QUEST_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input
                type="text"
                value={block.duration}
                onChange={(e) => setBlock(i, { duration: e.target.value })}
                placeholder="e.g. 30, 1h, 90m"
                className="w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]"
                title="Duration: number (30 = 30 min, 2 = 2h) or 1h, 90m"
              />
              <select
                value={block.timeOfDay}
                onChange={(e) => setBlock(i, { timeOfDay: e.target.value as TimeOfDay })}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)]"
              >
                {TIME_OF_DAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeBlock(i)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded"
                aria-label="Remove quest"
                title="Remove quest"
              >
                ❌
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addBlock}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4"
        >
          + Add quest
        </button>
        {!canProceedFromQuests && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">Add at least one quest with a name to continue.</p>
        )}
        <div className="flex justify-between">
          <button type="button" onClick={() => setStep(1)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            disabled={!canProceedFromQuests}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </section>
    )
  }

  // —— Step 3: Priorities (which quests keep streak) ——
  if (step === 3) {
    const blockIds = validBlocks.map((b) => toId(b.title)).filter(Boolean)
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 min-w-0">
        <p className="text-xs text-[var(--text-muted)] mb-2">{stepLabel}</p>
        <h2 className="text-lg font-bold mb-4">Streak priorities</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Which quests keep your streak alive if you complete at least one of them? Select all that apply.
        </p>
        <div className="space-y-2 mb-6">
          {blockIds.map((id) => {
            const block = answers.blocks.find((b) => toId(b.title) === id)
            const label = block?.title?.trim() || id
            const checked = answers.priorityIds.includes(id)
            return (
              <label key={id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePriority(id)}
                  className="rounded border-[var(--border)]"
                />
                <span className="text-[var(--text)]">{label}</span>
              </label>
            )
          })}
        </div>
        <div className="flex justify-between">
          <button type="button" onClick={() => setStep(2)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            Back
          </button>
          <button type="button" onClick={() => setStep(4)} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
            Next
          </button>
        </div>
      </section>
    )
  }

  // —— Step 4: Weekly events ——
  if (step === 4) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 min-w-0">
        <p className="text-xs text-[var(--text-muted)] mb-2">{stepLabel}</p>
        <h2 className="text-lg font-bold mb-4">Weekly events</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">Any events on fixed days? (e.g. voice acting lesson, therapy). Optional.</p>
        <div className="space-y-3 mb-4">
          {answers.weeklyEvents.map((ev, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] p-3">
              <input
                type="text"
                value={ev.title}
                onChange={(e) => {
                  const next = [...answers.weeklyEvents]
                  next[i] = { ...next[i], title: e.target.value }
                  update({ weeklyEvents: next })
                }}
                placeholder="Event name"
                className="flex-1 min-w-[120px] rounded border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1.5 text-sm text-[var(--text)]"
              />
              <select
                value={ev.day}
                onChange={(e) => {
                  const next = [...answers.weeklyEvents]
                  next[i] = { ...next[i], day: parseInt(e.target.value, 10) }
                  update({ weeklyEvents: next })
                }}
                className="rounded border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1.5 text-sm text-[var(--text)]"
              >
                {DAY_NAMES.map((name, d) => (
                  <option key={d} value={d}>{name}</option>
                ))}
              </select>
              <input
                type="text"
                value={ev.duration}
                onChange={(e) => {
                  const next = [...answers.weeklyEvents]
                  next[i] = { ...next[i], duration: e.target.value }
                  update({ weeklyEvents: next })
                }}
                placeholder="e.g. 1h, 60"
                className="w-20 rounded border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]"
                title="Duration: 30, 1h, 90m"
              />
              <input
                type="number"
                min={0}
                placeholder="Coins"
                value={ev.coinReward ?? 25}
                onChange={(e) => {
                  const next = [...answers.weeklyEvents]
                  next[i] = { ...next[i], coinReward: parseInt(e.target.value, 10) || 25 }
                  update({ weeklyEvents: next })
                }}
                className="w-14 rounded border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1.5 text-sm text-right text-[var(--text)]"
              />
              <span className="text-sm text-[var(--text-muted)]">coins</span>
              <button
                type="button"
                onClick={() => update({ weeklyEvents: answers.weeklyEvents.filter((_, j) => j !== i) })}
                className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded"
                aria-label="Remove event"
                title="Remove event"
              >
                ❌
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => update({ weeklyEvents: [...answers.weeklyEvents, { title: '', day: 1, duration: '1h', coinReward: 25 }] })}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6"
        >
          + Add weekly event
        </button>
        <div className="flex justify-between">
          <button type="button" onClick={() => setStep(3)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            Back
          </button>
          <button type="button" onClick={() => setStep(TOTAL_STEPS)} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
            Generate schedule
          </button>
        </div>
      </section>
    )
  }

  // —— Step 5: Done — download + use ——
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 min-w-0">
      <p className="text-xs text-[var(--text-muted)] mb-2">{stepLabel}</p>
      <h2 className="text-lg font-bold mb-2">Your schedule is ready</h2>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        You can download the JSON file to keep a backup or edit it later. Then apply it to start your daily quests.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-raised)]"
        >
          Download schedule JSON
        </button>
        <button
          type="button"
          onClick={handleUseSchedule}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
        >
          Use this schedule
        </button>
      </div>
      <div className="mt-4">
        <button type="button" onClick={() => setStep(4)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
          ← Back to weekly events
        </button>
      </div>
    </section>
  )
}
