import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { saveGameState } from '../systems/saveSystem'
import {
  STORE_CATALOG,
  groupItemsByCategory,
  getCategoryLabel,
  getCatalogEntry,
  validateCanPurchase,
  type StoreCategory,
} from '../systems/storeSystem'
import { PurchaseConfirmModal } from '../components/PurchaseConfirmModal'
import { PurchaseToast } from '../components/PurchaseToast'
import { StoreItemCard } from '../components/StoreItemCard'
import type { ShopItem } from '../types'
import { Coins } from 'lucide-react'

function formatPurchaseDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayISO = yesterday.toISOString().slice(0, 10)
  if (iso.startsWith(today)) return 'Today'
  if (iso.startsWith(yesterdayISO)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const DEFAULT_CUSTOM_COOLDOWN = 1

export function StorePage() {
  const {
    wallet,
    shopItems,
    customReward,
    rewardHistory,
    purchaseItem,
    purchaseToast,
    clearPurchaseToast,
    setCustomReward,
    getStateForSave,
  } = useGameStore()

  const [confirmingItem, setConfirmingItem] = useState<ShopItem | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  const [customCost, setCustomCost] = useState(20)
  const [customCooldown, setCustomCooldown] = useState(DEFAULT_CUSTOM_COOLDOWN)

  const grouped = groupItemsByCategory(shopItems, STORE_CATALOG)
  const categoryOrder: StoreCategory[] = ['fun', 'food', 'rest', 'luxury']

  const lastPurchases = rewardHistory
    .filter((r) => r.type === 'shop')
    .slice(0, 10)

  const handlePurchaseClick = (item: ShopItem) => {
    const result = validateCanPurchase(wallet, item)
    if (!result.ok) return
    setConfirmingItem(item)
  }

  const handleConfirmPurchase = () => {
    if (!confirmingItem) return
    const ok = purchaseItem(confirmingItem.id)
    if (ok) {
      saveGameState(getStateForSave())
      setConfirmingItem(null)
    }
  }

  return (
    <>
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span aria-hidden>🛒</span>
          Reward Shop
        </h2>

        {lastPurchases.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3">
              Last rewards
            </h3>
            <ul className="flex flex-wrap gap-2">
              {lastPurchases.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--surface-raised)] px-3 py-2 text-sm"
                >
                  <Coins size={14} className="text-[var(--accent)]" aria-hidden />
                  <span className="text-[var(--text)]">{r.label}</span>
                  <span className="text-[var(--text-muted)]">
                    {formatPurchaseDate(r.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-6 md:gap-8">
          {categoryOrder.map((cat) => {
            const items = grouped.get(cat)
            if (!items?.length) return null
            return (
              <div key={cat} className="min-w-0">
                <h3 className="text-base font-bold text-[var(--text)] mb-3">
                  {getCategoryLabel(cat)}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  {items.map((item) => (
                    <StoreItemCard
                      key={item.id}
                      item={item}
                      userCoins={wallet}
                      onPurchaseClick={handlePurchaseClick}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {customReward ? (
            <div>
              <h3 className="text-base font-bold text-[var(--text)] mb-3">Custom</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StoreItemCard
                  key="custom"
                  item={customReward}
                  userCoins={wallet}
                  onPurchaseClick={handlePurchaseClick}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomReward(null)
                  saveGameState(getStateForSave())
                }}
                className="mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Remove custom reward
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-raised)]/50 p-4 md:p-5">
              <h3 className="text-base font-bold text-[var(--text)] mb-3">Custom reward</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Create one reward with your own name, cost, and cooldown.
              </p>
              <div className="flex flex-wrap gap-3 items-end">
                <label className="flex flex-col gap-1 min-w-0 flex-1 sm:flex-initial">
                  <span className="text-xs text-[var(--text-muted)]">Title</span>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Coffee break"
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] w-full sm:w-40 min-w-0"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--text-muted)]">Cost (coins)</span>
                  <input
                    type="number"
                    min={1}
                    value={customCost}
                    onChange={(e) => setCustomCost(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] w-24"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--text-muted)]">Cooldown (days)</span>
                  <input
                    type="number"
                    min={0}
                    value={customCooldown}
                    onChange={(e) => setCustomCooldown(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] w-24"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const title = customTitle.trim() || 'Custom reward'
                    setCustomReward({
                      id: 'custom',
                      title,
                      cost: customCost,
                      cooldownDays: customCooldown,
                      lastPurchasedDate: null,
                    })
                    saveGameState(getStateForSave())
                    setCustomTitle('')
                    setCustomCost(20)
                    setCustomCooldown(DEFAULT_CUSTOM_COOLDOWN)
                  }}
                  disabled={!customTitle.trim()}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
                >
                  Create custom reward
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {confirmingItem && (() => {
        const entry = getCatalogEntry(confirmingItem.id)
        return (
          <PurchaseConfirmModal
            title={confirmingItem.title}
            cost={confirmingItem.cost}
            description={entry?.description ?? (confirmingItem.id === 'custom' ? 'Your custom reward.' : 'A reward you earned.')}
            icon={entry?.icon ?? '🎁'}
            onConfirm={handleConfirmPurchase}
            onCancel={() => setConfirmingItem(null)}
          />
        )
      })()}

      <div
        className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 box-border pointer-events-none"
        aria-hidden={!purchaseToast}
      >
        {purchaseToast && (
          <div onClick={(e) => e.stopPropagation()}>
            <PurchaseToast
              title={purchaseToast.title}
              cost={purchaseToast.cost}
              onDismiss={clearPurchaseToast}
              autoDismissMs={2500}
            />
          </div>
        )}
      </div>
    </>
  )
}
