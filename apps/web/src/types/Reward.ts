/**
 * Reward — record of coins earned or spent for history/stats.
 */
export interface Reward {
  id: string
  type: 'quest' | 'streak' | 'random' | 'shop'
  amount: number
  label: string
  timestamp: string
}
