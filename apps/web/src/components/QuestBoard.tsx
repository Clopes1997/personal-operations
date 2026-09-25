import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import confetti from 'canvas-confetti'
import type { Quest, QuestWindow } from '../types'
import { QuestCard, type QuestStatus } from './QuestCard'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useGameStore } from '../store/gameStore'

function getTodayISO() {
  return new Date().toISOString().slice(0, 10)
}
import {
  getWindowBoundaries,
  getCurrentWindow,
  getMinutesUntilWindowEnd,
  isWindowExpired,
  formatMinutesRemaining,
  formatMinutesToTime,
} from '../utils/timeWindows'

const WINDOW_ORDER: QuestWindow[] = ['morning', 'afternoon', 'evening', 'flexible']
const WINDOW_LABELS: Record<QuestWindow, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  flexible: 'Anytime',
}
const WINDOW_EMOJI: Record<QuestWindow, string> = {
  morning: '🌅',
  afternoon: '☀',
  evening: '🌙',
  flexible: '📋',
}

interface QuestBoardProps {
  quests: Quest[]
  wakeTimeToday?: string | null
  sleepTarget?: string
  onProgress: (questId: string) => void
  onComplete: (questId: string) => void
  lastCompletedQuestId?: string | null
}

const COUNTDOWN_TICK_MS = 1000

export function QuestBoard({
  quests,
  wakeTimeToday,
  sleepTarget,
  onProgress,
  onComplete,
  lastCompletedQuestId,
}: QuestBoardProps) {
  const { rewardHistory, streak } = useGameStore()
  const today = getTodayISO()
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), COUNTDOWN_TICK_MS)
    return () => clearInterval(id)
  }, [])
  const coinsEarnedToday = rewardHistory
    .filter((r) => r.type === 'quest' && r.timestamp.startsWith(today))
    .reduce((sum, r) => sum + r.amount, 0)
  const purchasesToday = rewardHistory.filter(
    (r) => r.type === 'shop' && r.timestamp.startsWith(today)
  ).length

  if (quests.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">📋 Daily Quests</h2>
        <p className="text-[var(--text-muted)]">No quests for today. Start your day to see quests.</p>
      </section>
    )
  }

  const byWindow = new Map<QuestWindow, Quest[]>()
  for (const w of WINDOW_ORDER) byWindow.set(w, [])
  for (const q of quests) {
    const w = q.window ?? 'flexible'
    byWindow.get(w)!.push(q)
  }

  const hasTimeAnchors = wakeTimeToday != null && wakeTimeToday !== ''
  const bounds = hasTimeAnchors && wakeTimeToday
    ? getWindowBoundaries(wakeTimeToday, sleepTarget)
    : null
  const currentWindow = hasTimeAnchors && wakeTimeToday
    ? getCurrentWindow(wakeTimeToday, sleepTarget)
    : null

  const [collapsed, setCollapsed] = useState<Record<QuestWindow, boolean>>(() => ({
    morning: false,
    afternoon: false,
    evening: false,
    flexible: false,
  }))

  const completedCount = quests.filter((q) => q.completed).length
  const allDone = quests.length > 0 && completedCount === quests.length
  const [showDayCompleteBanner, setShowDayCompleteBanner] = useState(false)
  const dayCompleteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!allDone) {
      setShowDayCompleteBanner(false)
      return
    }
    const t = setTimeout(() => setShowDayCompleteBanner(true), 500)
    return () => clearTimeout(t)
  }, [allDone])

  const BANNER_ANIMATION_MS = 1200

  useEffect(() => {
    if (!showDayCompleteBanner) return
    const el = dayCompleteRef.current
    if (!el) return
    const scrollT = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    const focusT = setTimeout(() => el.focus(), 0)
    const confettiT = setTimeout(() => {
      const count = 120
      const defaults = { origin: { x: 0.5, y: 0.6 }, zIndex: 9999 }
      confetti({ ...defaults, particleCount: count, spread: 100, scalar: 1.1 })
      confetti({ ...defaults, particleCount: count * 0.6, angle: 60, spread: 80 })
      confetti({ ...defaults, particleCount: count * 0.6, angle: 120, spread: 80 })
    }, BANNER_ANIMATION_MS)
    return () => {
      clearTimeout(scrollT)
      clearTimeout(focusT)
      clearTimeout(confettiT)
    }
  }, [showDayCompleteBanner])

  const toggleCollapsed = (window: QuestWindow) => {
    setCollapsed((prev) => ({ ...prev, [window]: !prev[window] }))
  }

  return (
    <section className="flex flex-col gap-4 lg:gap-8">
      {hasTimeAnchors && bounds && wakeTimeToday && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 md:px-4 md:py-3 text-xs md:text-sm text-[var(--text-muted)] flex flex-wrap gap-x-1 gap-y-0.5 items-baseline">
          <span className="font-medium text-[var(--text)]">Today</span>
          <span className="hidden sm:inline">·</span>
          <span>Wake {wakeTimeToday}</span>
          <span className="hidden sm:inline">·</span>
          <span className="whitespace-nowrap">Morning → {formatMinutesToTime(bounds.morningEnd)}</span>
          <span className="hidden sm:inline">·</span>
          <span className="whitespace-nowrap">Afternoon → {formatMinutesToTime(bounds.afternoonEnd)}</span>
          <span className="hidden sm:inline">·</span>
          <span className="whitespace-nowrap">Evening → {formatMinutesToTime(bounds.eveningEnd)}</span>
        </div>
      )}

      <h2 className="text-lg font-bold flex items-center gap-2">📋 Daily Quests</h2>

      {showDayCompleteBanner && (
          <div
            ref={dayCompleteRef}
            tabIndex={-1}
            role="alert"
            aria-live="polite"
            className="day-complete-banner-reveal rounded-xl border border-[var(--green)]/50 bg-[var(--green)]/10 px-4 md:px-5 py-4 text-center outline-none focus:ring-2 focus:ring-[var(--green)] focus:ring-offset-2 focus:ring-offset-[var(--bg)] min-w-0"
          >
            <p className="text-lg font-bold text-[var(--green)]">🎉 Day complete!</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">You finished all {quests.length} quests. Great work.</p>
            <div className="mt-4 pt-4 border-t border-[var(--green)]/30 grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-x-6 gap-y-1 text-sm text-[var(--text-muted)]">
              <span>Quests completed: <strong className="text-[var(--text)]">{quests.length}</strong></span>
              <span>Coins earned today: <strong className="text-[var(--accent)]">+{coinsEarnedToday}</strong></span>
              <span>Rewards purchased: <strong className="text-[var(--text)]">{purchasesToday}</strong></span>
              <span>Streak: <strong className="text-[var(--text)]">{streak.current} days</strong></span>
            </div>
          </div>
        )}

      {WINDOW_ORDER.map((window) => {
        const list = byWindow.get(window)!
        if (list.length === 0) return null

        const expired = hasTimeAnchors && wakeTimeToday && isWindowExpired(window, wakeTimeToday, sleepTarget)
        const isActive = currentWindow === window
        const minsLeft = hasTimeAnchors && wakeTimeToday
          ? getMinutesUntilWindowEnd(window, wakeTimeToday, sleepTarget)
          : null
        const isCollapsed = collapsed[window]

        return (
          <div
            key={window}
            className={clsx(
              expired && 'opacity-70'
            )}
          >
            <button
              type="button"
              onClick={() => toggleCollapsed(window)}
              className="flex w-full items-center gap-2 py-2 text-left rounded-lg hover:bg-[var(--surface-raised)]/50 transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight size={18} className="text-[var(--text-muted)] shrink-0" aria-hidden />
              ) : (
                <ChevronDown size={18} className="text-[var(--text-muted)] shrink-0" aria-hidden />
              )}
              <span className="text-base" aria-hidden>{WINDOW_EMOJI[window]}</span>
              <span className="font-bold text-[var(--text)]">{WINDOW_LABELS[window]}</span>
              {expired && (
                <span className="text-xs font-medium text-[var(--text-muted)]">(Ended)</span>
              )}
              <span className="text-xs text-[var(--text-muted)]">
                ({list.filter((q) => q.completed).length}/{list.length})
              </span>
              {minsLeft != null && !isCollapsed && (
                <span className={clsx('text-xs font-medium', isActive && minsLeft > 0 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]')}>
                  · {minsLeft > 0 ? `Ends in ${formatMinutesRemaining(minsLeft)}` : formatMinutesRemaining(minsLeft)}
                </span>
              )}
              
            </button>
            {!isCollapsed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-2">
                {list.map((quest) => {
                  const status: QuestStatus =
                    !quest.completed && expired
                      ? 'missed'
                      : quest.completed && quest.completedInPhase === false
                        ? 'late'
                        : quest.completed
                          ? 'completed'
                          : 'pending'
                  return (
                    <QuestCard
                      key={quest.id}
                      quest={quest}
                      onProgress={() => onProgress(quest.id)}
                      onComplete={() => onComplete(quest.id)}
                      justCompleted={lastCompletedQuestId === quest.id}
                      windowLabel={window !== 'flexible' ? WINDOW_LABELS[window] : undefined}
                      status={status}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
