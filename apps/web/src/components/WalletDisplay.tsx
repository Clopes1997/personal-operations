import { Coins } from 'lucide-react'

interface WalletDisplayProps {
  coins: number
}

export function WalletDisplay({ coins }: WalletDisplayProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-semibold">
      <Coins size={16} aria-hidden />
      <span>{coins} coins</span>
    </div>
  )
}
