import type { ShopItem } from '../types'

export type StoreCategory = 'fun' | 'food' | 'rest' | 'luxury'
export type StoreTier = 'small' | 'medium' | 'large' | 'epic'

export interface StoreCatalogEntry {
  category: StoreCategory
  tier: StoreTier
  description: string
  icon: string
}

export const STORE_CATALOG: Record<string, StoreCatalogEntry> = {
  early_gaming: {
    category: 'fun',
    tier: 'medium',
    description: 'Unlock early gaming time guilt-free.',
    icon: '🎮',
  },
  order_food: {
    category: 'food',
    tier: 'large',
    description: 'Order takeout guilt-free.',
    icon: '🍕',
  },
  movie_night: {
    category: 'fun',
    tier: 'medium',
    description: 'A movie night you earned.',
    icon: '🎬',
  },
  buy_game: {
    category: 'luxury',
    tier: 'epic',
    description: 'Buy a game you\'ve been wanting.',
    icon: '🎮',
  },
  custom: {
    category: 'fun',
    tier: 'medium',
    description: 'Your custom reward.',
    icon: '🎁',
  },
}

const CATEGORY_LABELS: Record<StoreCategory, string> = {
  fun: 'Fun',
  food: 'Food',
  rest: 'Rest',
  luxury: 'Big Rewards',
}

const TIER_ORDER: StoreTier[] = ['small', 'medium', 'large', 'epic']

export function getCatalogEntry(itemId: string): StoreCatalogEntry | null {
  return STORE_CATALOG[itemId] ?? null
}

export function getCategoryLabel(category: StoreCategory): string {
  return CATEGORY_LABELS[category]
}

export function getTierOrder(tier: StoreTier): number {
  return TIER_ORDER.indexOf(tier)
}

export function getHoursUntilAvailable(item: ShopItem): number | null {
  if (item.cooldownHours == null || item.cooldownHours <= 0) return null
  const lastAt = item.lastPurchasedAt ? new Date(item.lastPurchasedAt).getTime() : 0
  if (lastAt === 0) return null
  const now = Date.now()
  const elapsedHours = (now - lastAt) / (60 * 60 * 1000)
  const hoursLeft = item.cooldownHours - elapsedHours
  return hoursLeft > 0 ? hoursLeft : null
}

export function getDaysUntilAvailable(item: ShopItem): number | null {
  if (item.cooldownHours != null && item.cooldownHours > 0) return null
  if (item.lastPurchasedDate == null) return null
  const last = new Date(item.lastPurchasedDate)
  const today = new Date()
  const daysSince = Math.floor((today.getTime() - last.getTime()) / (24 * 60 * 60 * 1000))
  const daysLeft = item.cooldownDays - daysSince
  return daysLeft > 0 ? daysLeft : null
}

export function validateCanPurchase(wallet: number, item: ShopItem): { ok: boolean; reason?: string } {
  if (wallet < item.cost) {
    return { ok: false, reason: 'Not enough coins' }
  }
  const hoursLeft = getHoursUntilAvailable(item)
  if (hoursLeft != null && hoursLeft > 0) {
    const h = Math.floor(hoursLeft)
    const m = Math.round((hoursLeft - h) * 60)
    const str = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
    return { ok: false, reason: `Available in ${str}` }
  }
  const daysLeft = getDaysUntilAvailable(item)
  if (daysLeft != null && daysLeft > 0) {
    return { ok: false, reason: `Available in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` }
  }
  return { ok: true }
}

export function getCooldownLabel(item: ShopItem): string {
  const hoursLeft = getHoursUntilAvailable(item)
  if (hoursLeft != null && hoursLeft > 0) {
    const h = Math.floor(hoursLeft)
    const m = Math.round((hoursLeft - h) * 60)
    if (h >= 24) {
      const d = Math.floor(h / 24)
      const rest = h % 24
      return `Next available in ${d}d${rest > 0 ? ` ${rest}h` : ''}`
    }
    return `Next available in ${h}h${m > 0 ? ` ${m}m` : ''}`
  }
  const daysLeft = getDaysUntilAvailable(item)
  if (daysLeft != null && daysLeft > 0) {
    return `Next available in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
  }
  if (item.cooldownHours != null && item.cooldownHours > 0) {
    return `Cooldown: ${item.cooldownHours}h`
  }
  if (item.cooldownDays > 0) {
    return `Cooldown: ${item.cooldownDays} day${item.cooldownDays === 1 ? '' : 's'}`
  }
  return ''
}

export function groupItemsByCategory(
  items: ShopItem[],
  catalog: Record<string, StoreCatalogEntry>
): Map<StoreCategory, ShopItem[]> {
  const map = new Map<StoreCategory, ShopItem[]>()
  const order: StoreCategory[] = ['fun', 'food', 'rest', 'luxury']
  order.forEach((c) => map.set(c, []))
  items.forEach((item) => {
    const entry = catalog[item.id]
    const cat = entry?.category ?? 'fun'
    map.get(cat)!.push(item)
  })
  order.forEach((c) => {
    const list = map.get(c)!
    if (list.length === 0) map.delete(c)
  })
  return map
}
