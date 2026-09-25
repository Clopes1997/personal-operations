/**
 * ShopItem — purchasable reward. Cooldown prevents repeated use.
 * Use cooldownDays for day-based cooldown, or cooldownHours + lastPurchasedAt for sub-day.
 */
export interface ShopItem {
  id: string
  title: string
  cost: number
  cooldownDays: number
  lastPurchasedDate: string | null
  /** Optional: cooldown in hours. When set, lastPurchasedAt is used for "next available in Xh". */
  cooldownHours?: number
  /** ISO timestamp of last purchase; used when cooldownHours is set. */
  lastPurchasedAt?: string | null
}
