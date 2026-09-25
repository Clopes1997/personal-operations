import type { ShopItem } from '../types'
import { ShopItemCard } from './ShopItemCard'

const ITEM_ICONS: Record<string, string> = {
  early_gaming: '🎮',
  order_food: '🍕',
  movie_night: '🎬',
  buy_game: '🎮',
}

export interface ShopProps {
  items: ShopItem[]
  userCoins: number
  onPurchase: (itemId: string) => void
}

export function Shop({ items, userCoins, onPurchase }: ShopProps) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span aria-hidden>🛒</span>
        Reward Shop
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <ShopItemCard
            key={item.id}
            item={item}
            userCoins={userCoins}
            icon={ITEM_ICONS[item.id]}
            onPurchase={onPurchase}
          />
        ))}
      </div>
    </section>
  )
}
