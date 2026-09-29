import { clockMinutes, workBalance } from "./domain";
export function durationMinutes(value: string): number {
  const raw = value.trim();
  if (/^[+-]?\d+$/.test(raw)) {
    const minutes = Number(raw);
    if (!Number.isSafeInteger(minutes)) throw new Error("Duration is too large");
    return minutes;
  }
  const match = /^([+-]?)(\d+):([0-5]\d)$/.exec(raw);
  if (!match) throw new Error("Use signed minutes or HH:MM (for example -30 or -00:30)");
  const result = Number(match[2]) * 60 + Number(match[3]);
  if (!Number.isSafeInteger(result)) throw new Error("Duration is too large");
  return match[1] === "-" ? -result : result;
}
export function formatDuration(minutes: number): string {
  return `${minutes < 0 ? "-" : ""}${String(Math.floor(Math.abs(minutes) / 60)).padStart(2, "0")}:${String(Math.abs(minutes) % 60).padStart(2, "0")}`;
}
export function clockLabel(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  return `${formatDuration(minutes % 1440)}${days ? ` (+${days} day)` : ""}`;
}
export function calculateDuration(start: string, end: string, pause: number) {
  const a = clockMinutes(start), b = clockMinutes(end);
  const gross = b - a + (b < a ? 1440 : 0);
  if (!Number.isSafeInteger(pause) || pause < 0 || pause > gross) throw new Error("Break must be between zero and the elapsed duration");
  return { gross, pause, net: gross - pause };
}
export function calculateTimebank(times: string[], target: number, opening: number, asOf: string) {
  const [start1, end1, start2, end2] = times;
  const start = clockMinutes(start1);
  // Reuse persisted-workday validation even for an unfinished day.
  if (!Number.isInteger(target) || target < 0 || target > 1440 || !Number.isSafeInteger(opening) || Math.abs(opening) > 1_000_000) throw new Error("Invalid target or opening balance");
  if ((start2 || end2) && !end1) throw new Error("Finish the first period before starting the second");
  if (end2 && !start2) throw new Error("Enter the second arrival");
  const intervals: [string, string][] = [];
  if (end1) intervals.push([start1, end1]);
  if (end2) intervals.push([start2, end2]);
  let worked = intervals.length ? workBalance(intervals, target, opening).worked : 0;
  if (start2 && clockMinutes(start2) < clockMinutes(end1)) throw new Error("Second period overlaps the first");
  const activeStart = !end1 ? start1 : start2 && !end2 ? start2 : "";
  let exit: string | undefined;
  if (activeStart) {
    const current = clockMinutes(asOf), active = clockMinutes(activeStart);
    if (current < active) throw new Error("As-of time must be after the current arrival; split overnight work into dated records");
    worked += current - active;
    exit = clockLabel(current + Math.max(0, target - opening - worked));
  }
  return { worked, remaining: Math.max(0, target - opening - worked), balance: opening + worked - target,
    exit, intervals, complete: !!end1 && (!start2 || !!end2),
    lunch: `${clockLabel(start + 240)}–${clockLabel(start + 300)}` };
}
export function extractClockTimes(text: string): string[] {
  const matches = [...text.matchAll(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/g)];
  if (matches.length < 1 || matches.length > 4) throw new Error("Paste one to four clock times");
  return matches.map(m => `${m[1].padStart(2, "0")}:${m[2]}`);
}
