import type { ShopItem } from '../types'
import { Coins } from 'lucide-react'
import { clsx } from 'clsx'
import {
  getCatalogEntry,
  getCooldownLabel,
  getDaysUntilAvailable,
  getHoursUntilAvailable,
  type StoreTier,
} from '../systems/storeSystem'

const TIER_BADGE_CLASS: Record<StoreTier, string> = {
  small: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-[var(--accent-glow)] text-[var(--accent)] border-[var(--accent)]/30',
  large: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const TIER_LABEL: Record<StoreTier, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  epic: 'Epic',
}

export interface StoreItemCardProps {
  item: ShopItem
  userCoins: number
  onPurchaseClick: (item: ShopItem) => void
}

export function StoreItemCard({ item, userCoins, onPurchaseClick }: StoreItemCardProps) {
  const entry = getCatalogEntry(item.id)
  const icon = entry?.icon ?? '🎁'
  const tier = entry?.tier ?? 'medium'
  const daysLeft = getDaysUntilAvailable(item)
  const hoursLeft = getHoursUntilAvailable(item)
  const canAfford = userCoins >= item.cost
  const onCooldown =
    (daysLeft != null && daysLeft > 0) || (hoursLeft != null && hoursLeft > 0)
  const disabled = !canAfford || onCooldown
  const affordableAndReady = canAfford && !onCooldown
  const progressPct = Math.min(100, (userCoins / item.cost) * 100)
  const cooldownLabel = getCooldownLabel(item)

  return (
    <div
      className={clsx(
        'flex flex-col gap-3 rounded-xl border p-4 md:p-5 transition-shadow min-w-0',
        affordableAndReady
          ? 'border-[var(--accent)]/50 bg-[var(--surface)] shadow-[0_0_20px_rgba(245,158,11,0.15)]'
          : 'border-[var(--border)] bg-[var(--surface)]'
      )}
    >
      <div className="flex items-start gap-4 min-w-0">
        <span className="text-4xl shrink-0" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[var(--text)] break-words">{item.title}</span>
            <span
              className={clsx(
                'rounded border px-2 py-0.5 text-[10px] font-semibold uppercase',
                TIER_BADGE_CLASS[tier]
              )}
            >
              {TIER_LABEL[tier]}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[var(--accent)] font-medium">
            <Coins size={16} aria-hidden />
            <span>{item.cost} coins</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-[var(--text-muted)]">
          <span>You have: {userCoins} coins</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-orange-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {cooldownLabel && (
        <div className="text-xs text-[var(--text-muted)]">{cooldownLabel}</div>
      )}

      {affordableAndReady && (
        <div className="text-xs font-medium text-[var(--green)]">✓ You can buy this</div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onPurchaseClick(item)}
        className="rounded-lg bg-[var(--accent)] px-4 py-2.5 min-h-[44px] md:min-h-0 text-sm font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        Purchase
      </button>
    </div>
  )
}
