import { useEffect } from 'react'

export interface PurchaseToastProps {
  title: string
  cost: number
  onDismiss: () => void
  autoDismissMs?: number
}

export function PurchaseToast({
  title,
  cost,
  onDismiss,
  autoDismissMs = 2500,
}: PurchaseToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, autoDismissMs)
    return () => clearTimeout(t)
  }, [onDismiss, autoDismissMs])

  return (
    <button
      type="button"
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      className="purchase-toast pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-[var(--green)]/50 bg-[var(--surface)] px-4 py-3 shadow-lg text-left min-w-0"
    >
      <span className="text-2xl shrink-0" aria-hidden>✨</span>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1 overflow-hidden">
        <span className="font-semibold text-[var(--text)] truncate">
          {title} unlocked!
        </span>
        <span className="text-sm text-[var(--text-muted)]">
          Enjoy it. <span className="text-[var(--accent)]">-{cost} coins</span>
        </span>
      </div>
    </button>
  )
}
