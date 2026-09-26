import { z } from "zod";
import { parseScheduleJson } from "../utils/scheduleParser";
import { generateDailyQuests } from "../systems/questEngine";
import type { Schedule } from "../types";

// Calendar dates are labels, never instants. UTC is used only for ordinal arithmetic.
export function dayNumber(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Use YYYY-MM-DD");
  const [y, m, d] = value.split("-").map(Number);
  if (y < 1900 || y > 2100)
    throw new Error("Date must be between 1900 and 2100");
  const result = new Date(Date.UTC(y, m - 1, d));
  if (result.toISOString().slice(0, 10) !== value)
    throw new Error("Invalid calendar date");
  return result.getTime() / 86400000;
}
export function today(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
export function shiftDate(date: string, days: number): string {
  if (!Number.isSafeInteger(days)) throw new Error("Whole days required");
  return new Date((dayNumber(date) + days) * 86400000)
    .toISOString()
    .slice(0, 10);
}
const date = z.string().refine((v) => {
  try {
    dayNumber(v);
    return true;
  } catch {
    return false;
  }
}, "Invalid local date");
const id = z.string().min(1).max(200);
const title = z.string().trim().min(1).max(500);
const integer = z.number().int().min(0).max(1_000_000_000_000);
export const TaskSchema = z.object({
  id,
  title,
  date,
  completed: z.boolean(),
  estimatedMinutes: z.number().int().min(0).max(1440),
  reward: z.number().int().min(0).max(100000),
  ruleId: id.optional(),
  progressRequired: z.number().int().min(1).max(100000).optional(),
  progressCurrent: z.number().int().min(0).max(100000).optional(),
});
export const PlanSchema = z
  .object({ id, title, start: date, end: date })
  .refine((v) => v.start <= v.end, "End must not precede start");
export const WorkdaySchema = z
  .object({
    id,
    date,
    intervals: z
      .array(z.tuple([z.string(), z.string()]))
      .min(1)
      .max(2),
    target: z.number().int().min(0).max(1440),
    opening: z.number().int().min(-1_000_000).max(1_000_000),
  })
  .superRefine((v, ctx) => {
    try {
      workBalance(v.intervals, v.target, v.opening);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: String(e) });
    }
  });
export const ExpenseSchema = z.object({
  id,
  title,
  category: z.string().max(200),
  cents: integer,
});
export const BudgetSchema = z.object({
  id,
  month: z.string().regex(/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/),
  currency: z.string().regex(/^[A-Z]{3}$/),
  salary: integer,
  benefits: integer,
  rate: z.number().int().min(3333).max(10000),
  expenses: z.array(ExpenseSchema).max(1000),
  contribution: integer,
  free: z.number().int().min(-1_000_000_000_000).max(1_000_000_000_000),
  legacy: z.boolean().default(false),
});
export const TemplateSchema = ExpenseSchema.extend({
  active: z.boolean(),
  variable: z.boolean().optional(),
});
export const RewardSchema = z.object({
  id,
  taskId: id.optional(),
  coins: z.number().int().min(-1_000_000_000).max(1_000_000_000),
  label: title,
  date,
});
export const ShopSchema = z.object({
  id,
  title,
  cost: z.number().int().min(1).max(1_000_000),
  cooldownDays: z.number().int().min(0).max(3650),
  lastDate: date.nullable(),
  cooldownHours: z.number().finite().min(0).max(87600).optional(),
  lastPurchasedAt: z.string().datetime({ offset: true }).nullable().optional(),
});
const ScheduleValidated = z.custom<Schedule>((v) => {
  const result = parseScheduleJson(JSON.stringify(v));
  if (!result.success) return false;
  const s = result.schedule;
  const rules = [...s.weekdayBlocks, ...s.weeklyEvents];
  return (
    s.version === 1 &&
    new Set(rules.map((r) => r.id)).size === rules.length &&
    rules.every(
      (r) =>
        r.id &&
        r.title.trim() &&
        Number.isFinite(r.duration) &&
        r.duration > 0 &&
        r.duration <= 24 &&
        Number.isSafeInteger(r.coinReward) &&
        r.coinReward >= 0 &&
        r.coinReward <= 100000,
    ) &&
    s.weeklyEvents.every((e) => Number.isInteger(e.day)) &&
    s.weekendRules.minimumHabits.every((key) =>
      s.weekdayBlocks.some((b) => b.id === key),
    )
  );
}, "Invalid schedule, duplicate IDs, duration or rewards");
export const SnapshotSchema = z
  .object({
    version: z.literal(1),
    revision: integer,
    tasks: z.array(TaskSchema).max(100000),
    plans: z.array(PlanSchema).max(10000),
    workdays: z.array(WorkdaySchema).max(100000),
    budgets: z.array(BudgetSchema).max(2400),
    templates: z.array(TemplateSchema).max(1000),
    rewards: z.array(RewardSchema).max(100000),
    shop: z.array(ShopSchema).max(1000),
    settings: z.object({
      gamification: z.boolean(),
      schedule: ScheduleValidated.nullable(),
    }),
    archives: z
      .array(
        z.object({
          id,
          source: title,
          importedAt: z.string().datetime(),
          raw: z.string().max(10_000_000),
          omissions: z.array(z.string().max(500)).max(20).optional(),
        }),
      )
      .max(100),
  })
  .superRefine((v, ctx) => {
    for (const name of [
      "tasks",
      "plans",
      "workdays",
      "budgets",
      "templates",
      "rewards",
      "shop",
      "archives",
    ] as const) {
      if (new Set(v[name].map((r) => r.id)).size !== v[name].length)
        ctx.addIssue({ code: "custom", message: "Duplicate IDs in " + name });
    }
    if (new Set(v.budgets.map((b) => b.month)).size !== v.budgets.length)
      ctx.addIssue({ code: "custom", message: "Duplicate budget month" });
    if (new Set(v.workdays.map((b) => b.date)).size !== v.workdays.length)
      ctx.addIssue({ code: "custom", message: "Duplicate workday date" });
    const rewarded = v.rewards.filter((r) => r.taskId).map((r) => r.taskId);
    if (new Set(rewarded).size !== rewarded.length)
      ctx.addIssue({ code: "custom", message: "Duplicate task reward" });
    if (Math.abs(v.rewards.reduce((n, r) => n + r.coins, 0)) > 1_000_000_000)
      ctx.addIssue({ code: "custom", message: "Wallet limit exceeded" });
  });
export type Snapshot = z.infer<typeof SnapshotSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type Budget = z.infer<typeof BudgetSchema>;
export function emptySnapshot(): Snapshot {
  return {
    version: 1,
    revision: 0,
    tasks: [],
    plans: [],
    workdays: [],
    budgets: [],
    templates: [],
    rewards: [],
    shop: [],
    archives: [],
    settings: { gamification: false, schedule: null },
  };
}
export function money(text: string): number {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(text))
    throw new Error("Use a nonnegative decimal with at most two places");
  const [whole, fraction = ""] = text.split(".");
  return integer.parse(Number(whole) * 100 + Number(fraction.padEnd(2, "0")));
}
export function displayMoney(cents: number): string {
  return (cents / 100).toFixed(2);
}
export function budgetCalculation(
  salary: number,
  benefits: number,
  rate: number,
  expenses: number[],
) {
  integer.parse(salary);
  integer.parse(benefits);
  expenses.forEach((v) => integer.parse(v));
  if (!Number.isInteger(rate) || rate < 3333 || rate > 10000)
    throw new Error("Contribution must be 33.33% to 100%");
  const revenue = integer.parse(salary + benefits);
  const contribution = Number(
    (BigInt(revenue) * BigInt(rate) + 5000n) / 10000n,
  );
  const total = integer.parse(expenses.reduce((a, b) => a + b, 0));
  const free = revenue - contribution - total;
  if (free < 0) throw new Error("Expenses and contribution exceed income");
  return { contribution, free };
}
export function clockMinutes(value: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    throw new Error("Use HH:MM (00:00–23:59)");
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
export function workBalance(
  intervals: [string, string][],
  target = 480,
  opening = 0,
) {
  if (
    !Number.isInteger(target) ||
    target < 0 ||
    target > 1440 ||
    !Number.isSafeInteger(opening) ||
    Math.abs(opening) > 1_000_000
  )
    throw new Error("Invalid target or opening balance");
  if (intervals.length < 1 || intervals.length > 2)
    throw new Error("One or two periods required");
  let last = -1,
    worked = 0;
  for (const [start, end] of intervals) {
    const a = clockMinutes(start),
      b = clockMinutes(end);
    if (a < last || b <= a)
      throw new Error(
        "Periods must be ordered, non-overlapping and within one day",
      );
    worked += b - a;
    last = b;
  }
  return { worked, daily: worked - target, balance: opening + worked - target };
}
export function suggestedExit(
  first: [string, string],
  secondStart: string,
  target = 480,
  opening = 0,
): string {
  const worked = workBalance([first], target, opening).worked;
  const start = clockMinutes(secondStart);
  if (start < clockMinutes(first[1]))
    throw new Error("Second period overlaps the first");
  const end = start + Math.max(0, target - opening - worked);
  if (end >= 1440) throw new Error("Suggested exit falls on another day");
  return (
    String(Math.floor(end / 60)).padStart(2, "0") +
    ":" +
    String(end % 60).padStart(2, "0")
  );
}
// Retains Timeline's sorted first-fit lane allocation; inclusive date ordinals replace DST-sensitive milliseconds.
export function assignLanes(plans: Plan[]): Plan[][] {
  const lanes: Plan[][] = [];
  for (const p of [...plans].sort(
    (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end),
  )) {
    PlanSchema.parse(p);
    const lane = lanes.find((l) => l[l.length - 1].end < p.start);
    if (lane) lane.push(p);
    else lanes.push([p]);
  }
  return lanes;
}
export function generateOccurrences(
  state: Snapshot,
  localDate: string,
): Snapshot {
  dayNumber(localDate);
  if (!state.settings.schedule)
    throw new Error("Create or import a schedule first");
  const tasks = [...state.tasks];
  for (const q of generateDailyQuests(state.settings.schedule, localDate)) {
    const key = "schedule:" + localDate + ":" + q.id;
    if (!tasks.some((t) => t.id === key))
      tasks.push({
        id: key,
        ruleId: q.id,
        date: localDate,
        title: q.title,
        estimatedMinutes: Math.round((q.durationHours ?? 0) * 60),
        completed: false,
        reward: q.coinReward,
        progressRequired: q.progressRequired,
        progressCurrent: 0,
      });
  }
  return SnapshotSchema.parse({ ...state, tasks });
}
export function completeTask(state: Snapshot, taskId: string): Snapshot {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error("Task not found");
  const rewards = [...state.rewards];
  // Completing an already-completed task never retroactively awards coins.
  if (
    !task.completed &&
    state.settings.gamification &&
    !rewards.some((r) => r.taskId === taskId)
  ) {
    rewards.push({
      id: "task:" + taskId,
      taskId,
      coins: task.reward,
      label: task.title,
      date: today(),
    });
  }
  return SnapshotSchema.parse({
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === taskId
        ? { ...t, completed: true, progressCurrent: t.progressRequired ?? 1 }
        : t,
    ),
    rewards,
  });
}
export function buyReward(
  state: Snapshot,
  itemId: string,
  localDate = today(),
  now = new Date(),
): Snapshot {
  dayNumber(localDate);
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid purchase time");
  if (!state.settings.gamification) throw new Error("Rewards are disabled");
  const item = state.shop.find((i) => i.id === itemId);
  if (!item) throw new Error("Reward not found");
  if (
    item.cooldownHours &&
    item.lastPurchasedAt &&
    now.getTime() - Date.parse(item.lastPurchasedAt) <
      item.cooldownHours * 3600000
  )
    throw new Error("Reward is cooling down");
  if (
    !item.cooldownHours &&
    item.lastDate &&
    dayNumber(localDate) - dayNumber(item.lastDate) < item.cooldownDays
  )
    throw new Error("Reward is cooling down");
  if (state.rewards.reduce((n, r) => n + r.coins, 0) < item.cost)
    throw new Error("Not enough coins");
  return SnapshotSchema.parse({
    ...state,
    shop: state.shop.map((i) =>
      i.id === itemId
        ? { ...i, lastDate: localDate, lastPurchasedAt: now.toISOString() }
        : i,
    ),
    rewards: [
      ...state.rewards,
      {
        id: "purchase:" + crypto.randomUUID(),
        coins: -item.cost,
        label: item.title,
        date: localDate,
      },
    ],
  });
}
