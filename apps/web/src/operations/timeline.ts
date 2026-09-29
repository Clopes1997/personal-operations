import { dayNumber, shiftDate, type Snapshot, type Plan } from "./domain";
export type TimelineEntry = Plan & { kind: "plan" | "task"; sourceId: string; completed?: boolean; minutes?: number };
export function timelineEntries(state: Snapshot): TimelineEntry[] {
  return [
    ...state.plans.map(p => ({ ...p, id: `plan:${p.id}`, sourceId: p.id, kind: "plan" as const })),
    ...state.tasks.filter(t => t.date).map(t => ({ id: `task:${t.id}`, sourceId: t.id, kind: "task" as const, title: t.title, start: t.date, end: t.date, completed: t.completed, minutes: t.estimatedMinutes })),
  ];
}
export function moveTimelineEntry(state: Snapshot, entry: TimelineEntry, days: number): Snapshot {
  const shifted = shiftDate(entry.start, days); dayNumber(shifted);
  if (entry.kind === "task") return { ...state, tasks: state.tasks.map(t => t.id === entry.sourceId ? { ...t, date: shifted } : t) };
  const end = shiftDate(entry.end, days); dayNumber(end);
  return { ...state, plans: state.plans.map(p => p.id === entry.sourceId ? { ...p, start: shifted, end } : p) };
}
