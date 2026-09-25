import { Coins } from 'lucide-react'

export interface EndOfDayModalProps {
  questsCompleted: number
  coinsEarnedToday: number
  rewardsPurchasedToday: number
  streakDays: number
  onClose: () => void
}

export function EndOfDayModal({
  questsCompleted,
  coinsEarnedToday,
  rewardsPurchasedToday,
  streakDays,
  onClose,
}: EndOfDayModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-of-day-title"
    >
      <div
        className="rounded-xl border border-[var(--green)]/50 bg-[var(--surface)] p-4 md:p-6 w-full max-w-md shadow-xl my-auto max-h-[calc(100vh-2rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="end-of-day-title" className="text-xl font-bold text-[var(--green)] mb-1">
          Day complete
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Here’s your summary. Great work!
        </p>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--text-muted)]">Quests completed</dt>
            <dd className="font-semibold text-[var(--text)]">{questsCompleted}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-[var(--text-muted)]">Coins earned</dt>
            <dd className="font-semibold text-[var(--accent)] flex items-center gap-1">
              <Coins size={14} aria-hidden />
              +{coinsEarnedToday}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-muted)]">Rewards purchased</dt>
            <dd className="font-semibold text-[var(--text)]">{rewardsPurchasedToday}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-muted)]">Streak</dt>
            <dd className="font-semibold text-[var(--text)]">{streakDays} days</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-black hover:opacity-90"
        >
          Close
        </button>
      </div>
    </div>
  )
}
