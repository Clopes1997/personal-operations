import { create } from 'zustand'
import type { GameState, GameStats, Quest, Schedule, ShopItem } from '../types'
import { generateDailyQuests } from '../systems/questEngine'
import { recordQuestReward } from '../systems/rewardSystem'
import { getCurrentWindow } from '../utils/timeWindows'
import type { RewardPopupPayload } from '../systems/rewardSystem'

const DAILY_UPKEEP = 20
/** Bonus coins when a quest is completed within its time window. */
const ON_TIME_BONUS = 5
/** Bonus when all quests in a phase (window) are completed and the last one was on time. */
const PHASE_CLEARED_BONUS = 10
/** Streak milestone rewards: [days] -> coins */
const STREAK_MILESTONES: Record<number, number> = { 3: 20, 7: 60, 30: 100 }
const LUCKY_DROP_CHANCE = 0.01
const LUCKY_DROP_COINS = 5

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function getDefaultStreak(): GameState['streak'] {
  return {
    current: 0,
    longest: 0,
    shieldUsed: false,
    lastCompletedDate: null,
  }
}

function getDefaultShopItems(): ShopItem[] {
  return [
    { id: 'early_gaming', title: 'Early Gaming', cost: 40, cooldownDays: 1, lastPurchasedDate: null },
    { id: 'order_food', title: 'Order Food', cost: 80, cooldownDays: 1, lastPurchasedDate: null },
    { id: 'movie_night', title: 'Movie Night', cost: 60, cooldownDays: 2, lastPurchasedDate: null },
    { id: 'buy_game', title: 'Buy a Game', cost: 200, cooldownDays: 7, lastPurchasedDate: null },
  ]
}

function getDefaultStats(): GameStats {
  return {
    coinsEarnedTotal: 0,
    coinsSpentTotal: 0,
    questsCompletedTotal: 0,
    bestStreak: 0,
  }
}

const initialState: GameState = {
  wallet: 0,
  questsToday: [],
  streak: getDefaultStreak(),
  shopItems: getDefaultShopItems(),
  rewardHistory: [],
  schedule: null,
  lastPlayedDate: getTodayISO(),
  thpModeActive: false,
  wakeTimeToday: null,
  dayStartedDate: '',
  stats: getDefaultStats(),
  customReward: null,
  streakMilestonesClaimed: [],
}

export interface PurchaseToastPayload {
  title: string
  cost: number
}

interface GameStore extends GameState {
  /** UI-only: single accumulating reward toast (not persisted). */
  activeRewardToast: RewardPopupPayload | null
  /** UI-only: shown after a successful purchase (not persisted). */
  purchaseToast: PurchaseToastPayload | null
  setSchedule: (schedule: Schedule | null) => void
  clearPurchaseToast: () => void
  setQuestsToday: (quests: Quest[]) => void
  setThpModeActive: (active: boolean) => void
  addRewardToToast: (amount: number, labels: string[]) => void
  clearActiveRewardToast: () => void
  /** Call once per day: sets wake time, day started date, then regenerates quests. */
  startDay: (wakeTime: string) => void
  generateAndSetQuests: () => void
  setFromLoadedState: (state: GameState) => void
  addCoins: (amount: number, label: string, type: 'quest' | 'streak' | 'random' | 'shop') => void
  completeQuestProgress: (questId: string, delta?: number) => void
  completeQuest: (questId: string) => void
  purchaseItem: (itemId: string) => boolean
  setCustomReward: (item: ShopItem | null) => void
  getStateForSave: () => GameState
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  activeRewardToast: null,
  purchaseToast: null,

  addRewardToToast(amount, labels) {
    set((state) => {
      const current = state.activeRewardToast
      if (!current) {
        return { activeRewardToast: { totalCoins: amount, labels: [...labels] } }
      }
      return {
        activeRewardToast: {
          totalCoins: current.totalCoins + amount,
          labels: [...current.labels, ...labels],
        },
      }
    })
  },

  clearActiveRewardToast() {
    set({ activeRewardToast: null })
  },

  clearPurchaseToast() {
    set({ purchaseToast: null })
  },

  setSchedule(schedule) {
    set({ schedule })
  },

  setQuestsToday(quests) {
    set({ questsToday: quests })
  },

  setThpModeActive(active) {
    set({ thpModeActive: active })
  },

  startDay(wakeTime) {
    const { schedule, wallet } = get()
    const today = getTodayISO()
    if (!schedule) return
    const isNewDay = true
    const quests = generateDailyQuests(schedule, today, isNewDay, get().thpModeActive)
    const afterUpkeep = Math.max(0, wallet - DAILY_UPKEEP)
    set({
      wakeTimeToday: wakeTime,
      dayStartedDate: today,
      questsToday: quests,
      lastPlayedDate: today,
      wallet: afterUpkeep,
    })
  },

  generateAndSetQuests() {
    const { schedule, lastPlayedDate, wallet, thpModeActive } = get()
    if (!schedule) return
    const today = getTodayISO()
    const isNewDay = lastPlayedDate !== today
    const quests = generateDailyQuests(schedule, today, isNewDay, thpModeActive)
    const afterUpkeep = isNewDay ? Math.max(0, wallet - DAILY_UPKEEP) : wallet
    set({
      questsToday: quests,
      lastPlayedDate: today,
      ...(isNewDay && { wallet: afterUpkeep }),
    })
  },

  setFromLoadedState(state) {
    const quests = (state.questsToday ?? []).map((q) => ({
      ...q,
      window: q.window ?? 'flexible',
    }))
    const shopItems = (state.shopItems?.length ?? 0) > 0 ? state.shopItems : getDefaultShopItems()
    let stats = state.stats ?? getDefaultStats()
    const streakMilestonesClaimed = state.streakMilestonesClaimed ?? []
    if (!state.stats && (state.rewardHistory?.length ?? 0) > 0) {
      const earned = (state.rewardHistory ?? []).reduce(
        (sum, r) => sum + (r.type !== 'shop' && r.amount > 0 ? r.amount : 0),
        0
      )
      const spent = (state.rewardHistory ?? []).reduce(
        (sum, r) => sum + (r.type === 'shop' ? Math.abs(r.amount) : 0),
        0
      )
      const quests = (state.rewardHistory ?? []).filter((r) => r.type === 'quest').length
      stats = {
        coinsEarnedTotal: earned,
        coinsSpentTotal: spent,
        questsCompletedTotal: quests,
        bestStreak: state.streak?.longest ?? 0,
      }
    }
    set({
      wallet: state.wallet,
      questsToday: quests,
      streak: state.streak,
      shopItems,
      rewardHistory: state.rewardHistory,
      schedule: state.schedule,
      lastPlayedDate: state.lastPlayedDate,
      thpModeActive: state.thpModeActive ?? false,
      wakeTimeToday: state.wakeTimeToday ?? null,
      dayStartedDate: state.dayStartedDate ?? '',
      stats,
      customReward: state.customReward ?? null,
      streakMilestonesClaimed,
    })
  },

  setCustomReward(item) {
    set({ customReward: item })
  },

  addCoins(amount, label, type) {
    const { wallet, rewardHistory } = get()
    const newWallet = Math.max(0, wallet + amount)
    const reward: GameState['rewardHistory'][0] = {
      id: crypto.randomUUID(),
      type,
      amount,
      label,
      timestamp: new Date().toISOString(),
    }
    const isEarned = (type === 'quest' || type === 'streak' || type === 'random') && amount > 0
    const currentStats = get().stats
    const isSpent = type === 'shop' && amount < 0
    set({
      wallet: newWallet,
      rewardHistory: [reward, ...rewardHistory].slice(0, 100),
      stats: {
        ...currentStats,
        ...(isEarned && { coinsEarnedTotal: currentStats.coinsEarnedTotal + amount }),
        ...(isSpent && { coinsSpentTotal: currentStats.coinsSpentTotal + Math.abs(amount) }),
      },
    })
  },

  completeQuestProgress(questId, delta = 1) {
    set((state) => ({
      questsToday: state.questsToday.map((q) =>
        q.id === questId
          ? {
              ...q,
              progressCurrent: Math.min(q.progressRequired, q.progressCurrent + delta),
            }
          : q
      ),
    }))
  },

  completeQuest(questId) {
    const state = get()
    const quest = state.questsToday.find((q) => q.id === questId)
    if (!quest || quest.completed) return

    const isOnTime =
      quest.window !== 'flexible' &&
      state.wakeTimeToday != null &&
      getCurrentWindow(state.wakeTimeToday, state.schedule?.profile?.sleepTarget) === quest.window

    const newQuests = state.questsToday.map((q) =>
      q.id === questId
        ? { ...q, completed: true, progressCurrent: q.progressRequired, completedInPhase: isOnTime }
        : q
    )

    const totalReward = quest.coinReward + (isOnTime ? ON_TIME_BONUS : 0)
    const sameWindowQuests = newQuests.filter((q) => q.window === quest.window)
    const phaseCleared =
      isOnTime &&
      quest.window !== 'flexible' &&
      sameWindowQuests.every((q) => q.completed)
    const windowLabel =
      quest.window === 'morning'
        ? 'Morning'
        : quest.window === 'afternoon'
          ? 'Afternoon'
          : quest.window === 'evening'
            ? 'Evening'
            : ''

    const today = getTodayISO()
    const priorities = state.schedule?.priorities ?? []
    const isPriority = priorities.includes(questId)

    const applyRewards = (streakCurrent?: number) => {
      // Apply coins synchronously so wallet updates immediately (reward popup still buffered).
      get().addCoins(totalReward, quest.title, 'quest')
      if (phaseCleared && windowLabel) {
        get().addCoins(PHASE_CLEARED_BONUS, `${windowLabel} cleared`, 'quest')
      }
      const gotLucky = Math.random() < LUCKY_DROP_CHANCE
      if (gotLucky) {
        get().addCoins(LUCKY_DROP_COINS, 'Lucky Drop!', 'random')
      }
      recordQuestReward(quest.title, totalReward, () => ({
        addCoins: get().addCoins,
        addRewardToToast: get().addRewardToToast,
      }))
      if (phaseCleared && windowLabel) {
        recordQuestReward(`${windowLabel} cleared`, PHASE_CLEARED_BONUS, () => ({
          addCoins: get().addCoins,
          addRewardToToast: get().addRewardToToast,
        }))
      }
      if (gotLucky) {
        recordQuestReward('Lucky Drop!', LUCKY_DROP_COINS, () => ({
          addCoins: get().addCoins,
          addRewardToToast: get().addRewardToToast,
        }))
      }
      if (streakCurrent != null) {
        const claimed = get().streakMilestonesClaimed
        const toClaim = (Object.keys(STREAK_MILESTONES).map(Number) as number[]).filter(
          (d) => streakCurrent >= d && !claimed.includes(d)
        )
        toClaim.forEach((days) => {
          const coins = STREAK_MILESTONES[days]
          if (coins != null) {
            get().addCoins(coins, `${days} day streak!`, 'streak')
            get().addRewardToToast(coins, [`${days} day streak!`])
          }
        })
        if (toClaim.length > 0) {
          set((s) => ({ streakMilestonesClaimed: [...s.streakMilestonesClaimed, ...toClaim] }))
        }
      }
    }

    if (!isPriority) {
      set((s) => ({
        questsToday: newQuests,
        stats: { ...s.stats, questsCompletedTotal: s.stats.questsCompletedTotal + 1 },
      }))
      applyRewards()
      return
    }

    const prevLast = state.streak.lastCompletedDate
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString().slice(0, 10)
    let newCurrent = state.streak.current
    if (prevLast !== today) {
      newCurrent = prevLast === yesterdayISO ? state.streak.current + 1 : 1
    }
    const newStreak = {
      ...state.streak,
      lastCompletedDate: today,
      current: newCurrent,
      longest: Math.max(state.streak.longest, newCurrent),
    }

    set((s) => ({
      questsToday: newQuests,
      streak: newStreak,
      stats: {
        ...s.stats,
        questsCompletedTotal: s.stats.questsCompletedTotal + 1,
        bestStreak: Math.max(s.stats.bestStreak, newStreak.longest),
      },
    }))
    applyRewards(newCurrent)
  },

  purchaseItem(itemId) {
    const state = get()
    const item =
      itemId === 'custom'
        ? state.customReward
        : state.shopItems.find((i) => i.id === itemId)
    if (!item || state.wallet < item.cost) return false
    const now = new Date()
    const nowISO = now.toISOString()
    if (item.cooldownHours != null && item.cooldownHours > 0) {
      const lastAt = item.lastPurchasedAt ? new Date(item.lastPurchasedAt).getTime() : 0
      const elapsedHours = (now.getTime() - lastAt) / (60 * 60 * 1000)
      if (elapsedHours < item.cooldownHours) return false
    } else if (item.lastPurchasedDate != null) {
      const last = new Date(item.lastPurchasedDate)
      const daysSince = Math.floor((now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000))
      if (daysSince < item.cooldownDays) return false
    }
    get().addCoins(-item.cost, item.title, 'shop')
    const update: Partial<ShopItem> = item.cooldownHours != null
      ? { lastPurchasedAt: nowISO }
      : { lastPurchasedDate: getTodayISO() }
    if (itemId === 'custom' && state.customReward) {
      set({
        customReward: { ...state.customReward, ...update },
        purchaseToast: { title: item.title, cost: item.cost },
      })
    } else {
      set((s) => ({
        shopItems: s.shopItems.map((i) =>
          i.id === itemId ? { ...i, ...update } : i
        ),
        purchaseToast: { title: item.title, cost: item.cost },
      }))
    }
    return true
  },

  getStateForSave(): GameState {
    const s = get()
    return {
      wallet: s.wallet,
      questsToday: s.questsToday,
      streak: s.streak,
      shopItems: s.shopItems,
      rewardHistory: s.rewardHistory,
      schedule: s.schedule,
      lastPlayedDate: s.lastPlayedDate,
      thpModeActive: s.thpModeActive,
      wakeTimeToday: s.wakeTimeToday,
      dayStartedDate: s.dayStartedDate,
      stats: s.stats,
      customReward: s.customReward,
      streakMilestonesClaimed: s.streakMilestonesClaimed,
    }
  },
}))
