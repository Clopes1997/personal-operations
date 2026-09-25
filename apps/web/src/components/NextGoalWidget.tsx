import type { ShopItem } from '../types'
import { Coins } from 'lucide-react'
import { getCatalogEntry } from '../systems/storeSystem'

export interface NextGoalWidgetProps {
  item: ShopItem
  userCoins: number
}

export function NextGoalWidget({ item, userCoins }: NextGoalWidgetProps) {
  const entry = getCatalogEntry(item.id)
  const icon = entry?.icon ?? '🎁'
  const needed = item.cost - userCoins
  const progressPct = Math.min(100, (userCoins / item.cost) * 100)

  return (
    <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--surface)] p-4">
      <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
        Next goal
      </div>
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[var(--text)] truncate">{item.title}</div>
          <div className="flex items-center gap-1.5 text-sm text-[var(--accent)] font-medium mt-0.5">
            <Coins size={14} aria-hidden />
            <span>{needed} coins needed</span>
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-xs text-[var(--text-muted)]">
          <span>Progress</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-orange-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
