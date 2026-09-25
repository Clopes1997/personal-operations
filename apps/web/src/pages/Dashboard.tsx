import { useRef, useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { saveGameState, exportSaveFile, importSaveFile } from '../systems/saveSystem'
import { parseScheduleJson } from '../utils/scheduleParser'
import { QuestBoard } from '../components/QuestBoard'
import { RewardToast } from '../components/RewardPopup'
import { ScheduleWizard } from '../components/ScheduleWizard'
import { NextGoalWidget } from '../components/NextGoalWidget'
import { EndOfDayModal } from '../components/EndOfDayModal'
import { Accordion } from '../components/Accordion'
import { Coins } from 'lucide-react'

function getTodayISO() {
  return new Date().toISOString().slice(0, 10)
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getTodayLabel() {
  const d = new Date()
  const dayName = WEEKDAY_NAMES[d.getDay()]
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${dayName}, ${dateStr}`
}

export function Dashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadSaveInputRef = useRef<HTMLInputElement>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [lastCompletedQuestId, setLastCompletedQuestId] = useState<string | null>(null)
  const [showEndOfDaySummary, setShowEndOfDaySummary] = useState(false)
  const today = getTodayISO()
  const {
    questsToday,
    schedule,
    wallet,
    shopItems,
    rewardHistory,
    customReward,
    streak,
    activeRewardToast,
    thpModeActive,
    wakeTimeToday,
    dayStartedDate,
    setSchedule,
    setThpModeActive,
    startDay,
    completeQuestProgress,
    completeQuest,
    clearActiveRewardToast,
    getStateForSave,
    setFromLoadedState,
    generateAndSetQuests,
  } = useGameStore()

  const dayStarted = schedule && dayStartedDate === today && wakeTimeToday != null

  const coinsEarnedToday = rewardHistory
    .filter((r) => r.type !== 'shop' && r.amount > 0 && r.timestamp.startsWith(today))
    .reduce((sum, r) => sum + r.amount, 0)
  const purchasesToday = rewardHistory.filter(
    (r) => r.type === 'shop' && r.timestamp.startsWith(today)
  ).length

  useEffect(() => {
    if (!lastCompletedQuestId) return
    const t = setTimeout(() => setLastCompletedQuestId(null), 600)
    return () => clearTimeout(t)
  }, [lastCompletedQuestId])

  const handleLoadSave = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const loaded = importSaveFile(text)
      if (loaded) {
        setFromLoadedState(loaded)
        saveGameState(loaded)
      } else {
        alert('Invalid save file. Ensure it is a valid Life RPG save JSON.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExportSave = () => {
    const json = exportSaveFile(getStateForSave())
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `life-rpg-save-${getTodayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportSchedule = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const result = parseScheduleJson(text)
      if (result.success) {
        setSchedule(result.schedule)
        saveGameState(getStateForSave())
      } else {
        alert(`Invalid schedule: ${result.error}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleWizardComplete = (generatedSchedule: Parameters<typeof setSchedule>[0]) => {
    if (!generatedSchedule) return
    setSchedule(generatedSchedule)
    saveGameState(getStateForSave())
    setShowWizard(false)
  }

  const [startDayWakeTime, setStartDayWakeTime] = useState('08:00')
  useEffect(() => {
    if (schedule && !dayStarted) setStartDayWakeTime(schedule.profile.wakeTime ?? '08:00')
  }, [schedule, dayStarted])

  const handleStartDay = () => {
    startDay(startDayWakeTime)
    saveGameState(getStateForSave())
  }

  const completedCount = questsToday.filter((q) => q.completed).length
  const totalQuests = questsToday.length
  const progressPct = totalQuests > 0 ? (completedCount / totalQuests) * 100 : 0

  const allRewardItems = [...shopItems, ...(customReward ? [customReward] : [])]
  const nextGoal = allRewardItems
    .filter((i) => i.cost > wallet)
    .sort((a, b) => a.cost - b.cost)[0]

  return (
    <div className="flex flex-col gap-4 lg:gap-8 min-w-0">
      {schedule && (
        <Accordion
          title={getTodayLabel()}
          summary={`${completedCount} / ${totalQuests} quests · +${coinsEarnedToday} coins today`}
          defaultOpen={true}
        >
          <div className="pt-3">
            <div className="flex items-center gap-2 mb-2 text-xs text-[var(--text-muted)]">
              <Coins size={12} aria-hidden />
              <span>Coins today: +{coinsEarnedToday}</span>
            </div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
              <span>Daily progress</span>
              <span>{completedCount} / {totalQuests} quests</span>
            </div>
            <div className="h-4 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-orange-500 transition-all duration-500 ease-out progress-bar-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {dayStarted && !nextGoal && allRewardItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs font-medium text-[var(--green)]">
                You can afford all rewards!
              </div>
            )}
          </div>
        </Accordion>
      )}

      <div
        className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 box-border pointer-events-none"
        aria-hidden={!activeRewardToast}
      >
        {activeRewardToast && (
          <RewardToast
            totalCoins={activeRewardToast.totalCoins}
            labels={activeRewardToast.labels}
            onDismiss={clearActiveRewardToast}
            autoDismissMs={2000}
          />
        )}
      </div>

      {!schedule && !showWizard && (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 text-center">
          <p className="text-[var(--text-muted)] mb-4">Import your schedule JSON or create one with the wizard.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportSchedule}
          />
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-[var(--border)] bg-transparent px-4 py-2.5 min-h-[44px] md:min-h-0 text-sm font-semibold text-[var(--text)] hover:opacity-85"
            >
              Import schedule JSON
            </button>
            <button
              type="button"
              onClick={() => setShowWizard(true)}
              className="rounded-lg bg-[var(--accent)] px-4 py-2.5 min-h-[44px] md:min-h-0 text-sm font-semibold text-black hover:opacity-90"
            >
              Create with wizard
            </button>
          </div>
        </section>
      )}

      {!schedule && showWizard && (
        <ScheduleWizard
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      )}

      {schedule && !dayStarted && (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-8 text-center max-w-md mx-auto w-full min-w-0">
          <h2 className="text-xl font-bold mb-2">Good morning.</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">When did you wake up today?</p>
          <input
            type="time"
            value={startDayWakeTime}
            onChange={(e) => setStartDayWakeTime(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-lg text-[var(--text)] mb-4 w-full max-w-[160px] inline-block"
          />
          <div>
            <button
              type="button"
              onClick={handleStartDay}
              className="rounded-lg bg-[var(--accent)] px-6 py-3 min-h-[44px] text-base font-semibold text-black hover:opacity-90"
            >
              Start Day
            </button>
          </div>
        </section>
      )}

      {schedule && dayStarted && (
        <>
          <Accordion title="Actions" summary="Schedule, export, end day" defaultOpen={false}>
            <div className="pt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-[var(--border)] bg-transparent px-4 py-2.5 min-h-[44px] md:min-h-0 text-sm font-semibold text-[var(--text)] hover:opacity-85"
              >
                Change schedule
              </button>
              <button
                type="button"
                onClick={() => loadSaveInputRef.current?.click()}
                className="rounded-lg border border-[var(--border)] px-4 py-2.5 min-h-[44px] md:min-h-0 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-raised)]"
              >
                Load save
              </button>
              <button
                type="button"
                onClick={handleExportSave}
                className="rounded-lg border border-[var(--border)] px-4 py-2.5 min-h-[44px] md:min-h-0 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-raised)]"
              >
                Export save
              </button>
              <button
                type="button"
                onClick={() => setShowEndOfDaySummary(true)}
                className="rounded-lg border border-[var(--border)] px-4 py-2.5 min-h-[44px] md:min-h-0 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-raised)]"
              >
                End day
              </button>
              {schedule.thpOverride && (
                <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm cursor-pointer hover:border-[var(--accent)]">
                  <input
                    type="checkbox"
                    checked={thpModeActive}
                    onChange={(e) => {
                      setThpModeActive(e.target.checked)
                      generateAndSetQuests()
                      saveGameState(getStateForSave())
                    }}
                    className="rounded border-[var(--border)]"
                  />
                  <span className="font-medium">THP mode</span>
                  <span className="text-xs text-[var(--text-muted)]">(Take Home Project replaces deep work)</span>
                </label>
              )}
            </div>
          </Accordion>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportSchedule}
          />
          <input
            ref={loadSaveInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleLoadSave}
          />
          <QuestBoard
            quests={questsToday}
            wakeTimeToday={wakeTimeToday}
            sleepTarget={schedule.profile.sleepTarget}
            onProgress={(id) => completeQuestProgress(id)}
            onComplete={(id) => {
              setLastCompletedQuestId(id)
              completeQuest(id)
              saveGameState(getStateForSave())
            }}
            lastCompletedQuestId={lastCompletedQuestId}
          />

          {dayStarted && nextGoal && (
            <NextGoalWidget item={nextGoal} userCoins={wallet} />
          )}

          {showEndOfDaySummary && (
            <EndOfDayModal
              questsCompleted={completedCount}
              coinsEarnedToday={coinsEarnedToday}
              rewardsPurchasedToday={purchasesToday}
              streakDays={streak.current}
              onClose={() => setShowEndOfDaySummary(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
