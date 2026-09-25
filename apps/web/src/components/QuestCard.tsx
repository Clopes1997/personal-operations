import type { Quest } from '../types'
import { clsx } from 'clsx'
import { Coins } from 'lucide-react'

function getCategoryClass(category: string): string {
  const k = category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '')
  if (k.includes('career') || k.includes('job')) return 'category-career'
  if (k.includes('health') || k.includes('exercise')) return 'category-health'
  if (k.includes('skill') || k.includes('study')) return 'category-skills'
  if (k.includes('creative') || k.includes('music') || k.includes('sing')) return 'category-creative'
  if (k.includes('adulting')) return 'category-adulting'
  if (k.includes('weekly')) return 'category-weekly'
  return 'category-daily'
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours === 1) return '1 h'
  return `${hours} h`
}

export type QuestStatus = 'pending' | 'completed' | 'late' | 'missed'

interface QuestCardProps {
  quest: Quest
  onProgress: () => void
  onComplete: () => void
  /** True briefly after completing, triggers coin badge animation */
  justCompleted?: boolean
  /** e.g. "Morning" for time-window label on card */
  windowLabel?: string
  /** Pending = in phase not done; completed = done in phase; late = done after phase; missed = phase ended, not done */
  status?: QuestStatus
}

export function QuestCard({ quest, onProgress, onComplete, justCompleted, windowLabel, status = 'pending' }: QuestCardProps) {
  const canComplete = quest.progressCurrent >= quest.progressRequired && !quest.completed
  const progressPct = quest.progressRequired > 0 ? (quest.progressCurrent / quest.progressRequired) * 100 : 0
  const isMissed = status === 'missed'
  const isLate = status === 'late'
  const gotPhaseBonus = quest.completed && quest.completedInPhase === true

  return (
    <div
      className={clsx(
        'flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5 transition-colors min-w-0',
        'hover:border-[var(--accent)]',
        quest.completed && 'border-[var(--green)]/40',
        isMissed && 'opacity-60 border-[var(--text-muted)]/30'
      )}
    >
      <div className="flex justify-between items-start gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-base truncate" title={quest.title}>{quest.title}</div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={clsx('inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded', getCategoryClass(quest.category))}>
              {quest.category}
            </span>
            {quest.durationHours != null && quest.durationHours > 0 && (
              <span className="text-[11px] text-[var(--text-muted)]">{formatDuration(quest.durationHours)}</span>
            )}
            {windowLabel && (
              <span className="text-[10px] text-[var(--text-muted)]">🕘 {windowLabel}</span>
            )}
            {isMissed && (
              <span className="text-[10px] font-medium text-[var(--text-muted)]">Missed</span>
            )}
            {isLate && (
              <span className="text-[10px] font-medium text-amber-500/90">Late completion</span>
            )}
            {gotPhaseBonus && (
              <span className="text-[10px] font-medium text-[var(--green)]">+5 phase bonus</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div
            className={clsx(
              'flex items-center gap-1.5 rounded-xl bg-[var(--accent-glow)] px-3 py-1.5 text-sm font-bold text-[var(--accent)] whitespace-nowrap border border-[var(--accent)]/30 transition-transform',
              justCompleted && 'quest-coin-pop'
            )}
          >
            <Coins size={16} aria-hidden />
            <span>+{quest.coinReward}</span>
          </div>
          {quest.window !== 'flexible' && !quest.completed && !isMissed && (
            <span className="text-[10px] text-[var(--text-muted)]">+5 on time</span>
          )}
          {isLate && (
            <span className="text-[10px] text-amber-500/90">(no phase bonus)</span>
          )}
        </div>
      </div>
      <div className="w-full h-2.5 rounded-full bg-[var(--surface-raised)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-500 ease-out"
          style={{ width: `${quest.completed ? 100 : progressPct}%` }}
        />
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        {quest.completed
          ? 'Done'
          : `${quest.progressCurrent} / ${quest.progressRequired}`}
      </div>
      <div className="flex gap-2 mt-auto flex-wrap">
        {!quest.completed && (
          <button
            type="button"
            onClick={onProgress}
            className="rounded-lg border border-[var(--border)] bg-transparent px-4 py-2.5 min-h-[44px] md:min-h-0 text-sm font-semibold text-[var(--text)] hover:opacity-85"
          >
            + Progress
          </button>
        )}
        <button
          type="button"
          onClick={onComplete}
          disabled={!canComplete}
          className={clsx(
            'rounded-lg px-4 py-2.5 min-h-[44px] md:min-h-0 text-sm font-semibold',
            canComplete
              ? 'bg-[var(--accent)] text-black hover:opacity-90'
              : 'bg-[var(--surface-raised)] text-[var(--text-muted)] cursor-not-allowed opacity-60'
          )}
        >
          Complete
        </button>
      </div>
    </div>
  )
}
