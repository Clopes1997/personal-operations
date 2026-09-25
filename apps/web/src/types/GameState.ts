import type { Quest } from './Quest'
import type { ShopItem } from './ShopItem'
import type { Reward } from './Reward'
import type { Streak } from './Streak'
import type { Schedule } from './Schedule'

export interface GameStats {
  coinsEarnedTotal: number
  coinsSpentTotal: number
  questsCompletedTotal: number
  bestStreak: number
}

/**
 * GameState — full persistent state. All save/load operates on this shape.
 */
export interface GameState {
  wallet: number
  questsToday: Quest[]
  streak: Streak
  shopItems: ShopItem[]
  rewardHistory: Reward[]
  schedule: Schedule | null
  lastPlayedDate: string
  /** When true, deep work blocks are replaced by Take Home Project (if schedule has thpOverride). */
  thpModeActive: boolean
  /** Wake time today (e.g. "08:15"); set when user clicks Start Day. Null until day started. */
  wakeTimeToday: string | null
  /** ISO date (YYYY-MM-DD) when user last clicked Start Day. Used to show Start Day again next day. */
  dayStartedDate: string
  /** Aggregated stats for Stats page and summaries. */
  stats: GameStats
  /** User-defined single custom reward (optional). */
  customReward: ShopItem | null
  /** Streak milestones already rewarded (e.g. [3, 7, 30]) so we don't double-grant. */
  streakMilestonesClaimed: number[]
}
