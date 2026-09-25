import type { ShopItem } from '../types'
import { Coins } from 'lucide-react'

function getDaysUntilAvailable(item: ShopItem): number | null {
  if (item.lastPurchasedDate == null) return null
  const last = new Date(item.lastPurchasedDate)
  const today = new Date()
  const daysSince = Math.floor((today.getTime() - last.getTime()) / (24 * 60 * 60 * 1000))
  const daysLeft = item.cooldownDays - daysSince
  return daysLeft > 0 ? daysLeft : null
}

export interface ShopItemCardProps {
  item: ShopItem
  userCoins: number
  icon?: string
  onPurchase: (itemId: string) => void
}

export function ShopItemCard({ item, userCoins, icon, onPurchase }: ShopItemCardProps) {
  const daysLeft = getDaysUntilAvailable(item)
  const canAfford = userCoins >= item.cost
  const onCooldown = daysLeft != null && daysLeft > 0
  const disabled = !canAfford || onCooldown

  const cooldownLabel =
    daysLeft != null && daysLeft > 0
      ? `Available in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
      : item.cooldownDays > 0
        ? `Cooldown: ${item.cooldownDays}d`
        : null

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-2xl" aria-hidden>
        {icon ?? '🎁'}
      </div>
      <div className="font-semibold text-[var(--text)]">{item.title}</div>
      <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
        <Coins size={14} className="text-[var(--accent)]" aria-hidden />
        <span className={!canAfford ? 'text-red-400' : ''}>{item.cost}</span>
      </div>
      {cooldownLabel && (
        <div className="text-xs text-[var(--text-muted)]">{cooldownLabel}</div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onPurchase(item.id)}
        className="mt-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        Purchase
      </button>
    </div>
  )
}
