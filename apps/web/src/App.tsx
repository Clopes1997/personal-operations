import { useEffect, useRef, useState } from 'react'
import { loadGameState, saveGameState } from './systems/saveSystem'
import { useGameStore } from './store/gameStore'
import { AppLayout, type AppTab } from './components/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { StorePage } from './pages/StorePage'
import { HistoryPage } from './pages/HistoryPage'
import { StatsPage } from './pages/StatsPage'

const AUTO_SAVE_DEBOUNCE_MS = 1500

function App() {
  const { setFromLoadedState } = useGameStore()
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const loaded = loadGameState()
    if (loaded) {
      setFromLoadedState(loaded)
    }
  }, [setFromLoadedState])

  useEffect(() => {
    const unsub = useGameStore.subscribe(() => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        const state = useGameStore.getState()
        saveGameState(state.getStateForSave())
        saveTimeoutRef.current = null
      }, AUTO_SAVE_DEBOUNCE_MS)
    })
    return () => {
      unsub()
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const tabContent =
    activeTab === 'dashboard' ? (
      <Dashboard />
    ) : activeTab === 'store' ? (
      <StorePage />
    ) : activeTab === 'stats' ? (
      <StatsPage />
    ) : (
      <HistoryPage />
    )

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 lg:p-6 overflow-x-hidden min-w-0">
      <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {tabContent}
      </AppLayout>
    </div>
  )
}

export default App
