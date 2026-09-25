import { useEffect, useRef, useState } from 'react'
import { Coins } from 'lucide-react'
import { clsx } from 'clsx'

export interface RewardToastProps {
  totalCoins: number
  labels: string[]
  onDismiss: () => void
  autoDismissMs: number
}

/**
 * Single accumulating toast: updates in place (+10 → +20 → +30).
 * Resets 2s timer when totalCoins/labels change. Dismiss on click or when timer ends.
 * pointer-events-auto on the toast so it's clickable; container stays pointer-events-none.
 */
export function RewardToast({
  totalCoins,
  labels,
  onDismiss,
  autoDismissMs,
}: RewardToastProps) {
  const [pulse, setPulse] = useState(false)
  const prevTotalRef = useRef(totalCoins)

  useEffect(() => {
    if (prevTotalRef.current !== totalCoins) {
      prevTotalRef.current = totalCoins
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 300)
      return () => clearTimeout(t)
    }
  }, [totalCoins])

  useEffect(() => {
    const timer = setTimeout(onDismiss, autoDismissMs)
    return () => clearTimeout(timer)
  }, [totalCoins, labels.length, onDismiss, autoDismissMs])

  const summary =
    labels.length === 1
      ? labels[0]
      : `${labels.length} quest combo`

  return (
    <button
      type="button"
      role="status"
      aria-live="polite"
      aria-label={`Reward: +${totalCoins} coins. Click to dismiss.`}
      className={clsx(
        'reward-toast pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-[var(--accent)] bg-[var(--surface)] px-4 py-3 shadow-lg text-left transition-transform',
        pulse && 'reward-toast-pulse'
      )}
      onClick={onDismiss}
    >
      <Coins size={20} className="text-[var(--accent)] shrink-0" aria-hidden />
      <div className="flex flex-col gap-0.5 min-w-0 flex-1 overflow-hidden">
        <span className="font-semibold text-[var(--accent)]">
          +{totalCoins} coins
        </span>
        <span className="text-xs text-[var(--text-muted)] truncate">
          {summary}
        </span>
      </div>
    </button>
  )
}
