import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { clearGameState } from '../systems/saveSystem'
import { WalletDisplay } from './WalletDisplay'
import { Menu, X } from 'lucide-react'
import { clsx } from 'clsx'

export type AppTab = 'dashboard' | 'store' | 'history' | 'stats'

export interface AppLayoutProps {
  children: React.ReactNode
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
}

function formatLastRewardDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayISO = yesterday.toISOString().slice(0, 10)
  if (iso.startsWith(today)) return 'today'
  if (iso.startsWith(yesterdayISO)) return 'yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const TABS: { id: AppTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'store', label: 'Store' },
  { id: 'history', label: 'History' },
  { id: 'stats', label: 'Stats' },
]

function NavTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
  onNavClick,
  vertical,
}: {
  tabs: typeof TABS
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
  className?: string
  onNavClick?: () => void
  vertical?: boolean
}) {
  return (
    <nav className={clsx('flex gap-1', vertical && 'flex-col gap-0.5', className)} role="tablist" aria-label="Main navigation">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeTab === id}
          aria-controls={`panel-${id}`}
          id={`tab-${id}`}
          onClick={() => {
            onTabChange(id)
            onNavClick?.()
          }}
          className={clsx(
            'rounded-lg px-4 py-2 min-h-[44px] lg:min-h-0 text-sm font-semibold transition-colors text-left flex items-center',
            vertical && 'w-full',
            activeTab === id
              ? 'bg-[var(--accent)] text-black'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)]'
          )}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}

export function AppLayout({ children, activeTab, onTabChange }: AppLayoutProps) {
  const { wallet, streak, rewardHistory } = useGameStore()
  const lastPurchase = rewardHistory.find((r) => r.type === 'shop')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [menuOpen])

  return (
    <div className="max-w-[1100px] mx-auto flex flex-col gap-4 lg:gap-8 w-full min-w-0">
      <header className="flex flex-wrap items-center gap-3 lg:gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:p-5">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="text-[22px] font-extrabold tracking-tight">
            ⚔️ Life <span className="text-[var(--accent)]">RPG</span>
          </div>
          <NavTabs
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={onTabChange}
            className="hidden lg:flex gap-1"
          />
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="lg:hidden rounded-lg p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)]"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <div className="header-badge-group flex items-center gap-3 lg:gap-5 flex-wrap">
          <WalletDisplay coins={wallet} />
          {lastPurchase && (
            <div className="text-xs text-[var(--text-muted)] hidden sm:block truncate max-w-[180px] lg:max-w-none">
              Last reward: <span className="text-[var(--text)] font-medium truncate">{lastPurchase.label}</span>
              {' – '}{formatLastRewardDate(lastPurchase.timestamp)}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-semibold">
            <span className="text-base" aria-hidden>🔥</span>
            <span>{streak.current} day streak</span>
          </div>
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={() => {
                clearGameState()
                window.location.reload()
              }}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)]"
              title="Clear saved data and reload (temporary)"
            >
              Clear cache
            </button>
          )}
        </div>
      </header>

      {menuOpen && (
        <div
          className="lg:hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
          role="dialog"
          aria-label="Main navigation"
        >
          <div className="p-2">
            <NavTabs
              tabs={TABS}
              activeTab={activeTab}
              onTabChange={onTabChange}
              onNavClick={() => setMenuOpen(false)}
              vertical
            />
          </div>
        </div>
      )}

      <main className="flex flex-col gap-8">
        {children}
      </main>
    </div>
  )
}
