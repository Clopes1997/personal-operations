import { useGameStore } from '../store/gameStore'
import { Coins, Target, Flame, ShoppingBag } from 'lucide-react'

export function StatsPage() {
  const { stats, streak } = useGameStore()

  const cards = [
    {
      label: 'Coins earned (total)',
      value: stats.coinsEarnedTotal,
      icon: Coins,
      color: 'text-[var(--accent)]',
    },
    {
      label: 'Coins spent (total)',
      value: stats.coinsSpentTotal,
      icon: ShoppingBag,
      color: 'text-[var(--text-muted)]',
    },
    {
      label: 'Quests completed (total)',
      value: stats.questsCompletedTotal,
      icon: Target,
      color: 'text-[var(--blue)]',
    },
    {
      label: 'Best streak',
      value: `${stats.bestStreak} days`,
      icon: Flame,
      color: 'text-orange-400',
    },
    {
      label: 'Current streak',
      value: `${streak.current} days`,
      icon: Flame,
      color: 'text-orange-400',
    },
  ]

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5 min-w-0">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span aria-hidden>📊</span>
        Stats
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 flex flex-col gap-2"
          >
            <div className={`flex items-center gap-2 ${color}`}>
              <Icon size={20} aria-hidden />
              <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${color}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
