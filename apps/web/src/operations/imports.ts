import { z } from "zod";
import { emptySnapshot, money, SnapshotSchema, type Snapshot } from "./domain";
import { parseScheduleJson } from "../utils/scheduleParser";

const row = z.record(z.string(), z.unknown());
const identifier = (v: unknown): string => {
  if ((typeof v !== "string" && !Number.isSafeInteger(v)) || !String(v))
    throw new Error("Missing or unsafe legacy ID");
  return String(v);
};
const value = (v: unknown): string => {
  if (typeof v !== "string" && typeof v !== "number")
    throw new Error("Missing numeric value");
  return String(v);
};
const integer = (v: unknown): number =>
  z.number().int().nonnegative().max(1_000_000_000).parse(v);
export type ImportPreview = {
  next: Snapshot;
  warnings: string[];
  alreadyImported: boolean;
};
// Owner decision 2026-09-26: the desktop-only default percentage is not an active setting.
// Retain every other exported field; original SQLite/export stays in operator custody.
function retainedFinanceEvidence(raw: string): string {
  const data = row.parse(JSON.parse(raw));
  const tables = { ...row.parse(data.tables) };
  delete tables.Config;
  const retained: Record<string, unknown> = { ...data, tables };
  if (data.rowCounts !== undefined) {
    const counts = { ...row.parse(data.rowCounts) };
    delete counts.Config;
    retained.rowCounts = counts;
  }
  return JSON.stringify(retained);
}
export function previewLegacy(
  current: Snapshot,
  source: string,
  installation: string,
  raw: string,
  currency: string,
  draftDate: string,
): ImportPreview {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(installation))
    throw new Error(
      "Installation ID: 1–64 letters, digits, underscores or hyphens",
    );
  if (raw.length > 10_000_000) throw new Error("Legacy file exceeds 10 MB");
  const retainedRaw = source === "finance-tacker" ? retainedFinanceEvidence(raw) : raw;
  const archiveId = source + ":" + installation;
  const previous = current.archives.find((a) => a.id === archiveId);
  if (previous) {
    if ((source === "finance-tacker" ? retainedFinanceEvidence(previous.raw) : previous.raw) !== retainedRaw)
      throw new Error(
        "This installation was already imported with different data. Review a new snapshot manually.",
      );
    return {
      next: current,
      warnings: ["Identical source snapshot already imported."],
      alreadyImported: true,
    };
  }
  const data: unknown = JSON.parse(raw),
    next = structuredClone(current),
    warnings: string[] = [];
  const key = (type: string, id: unknown) =>
    archiveId + ":" + type + ":" + identifier(id);
  if (source === "life-rpg") {
    const game = row.parse(data);
    if (
      next.settings.schedule ||
      next.tasks.length ||
      next.rewards.length ||
      next.shop.length
    )
      throw new Error(
        "Import Life RPG into an empty task/reward module to avoid ambiguous overlaps",
      );
    const parsed = game.schedule
      ? parseScheduleJson(JSON.stringify(game.schedule))
      : null;
    if (parsed && !parsed.success) throw new Error(parsed.error);
    next.settings.schedule = parsed?.success ? parsed.schedule : null;
    const date = z.string().parse(game.lastPlayedDate);
    for (const q of z.array(row).parse(game.questsToday)) {
      next.tasks.push({
        id: "schedule:" + date + ":" + identifier(q.id),
        ruleId: identifier(q.id),
        date,
        title: z.string().parse(q.title),
        completed: z.boolean().parse(q.completed),
        estimatedMinutes: Math.round(
          z
            .number()
            .nonnegative()
            .max(24)
            .parse(q.durationHours ?? 0) * 60,
        ),
        reward: integer(q.coinReward),
        progressRequired:
          q.progressRequired === undefined ? 1 : integer(q.progressRequired),
        progressCurrent:
          q.progressCurrent === undefined
            ? q.completed
              ? 1
              : 0
            : integer(q.progressCurrent),
      });
      if (q.completed)
        next.rewards.push({
          id: key("completed", q.id),
          taskId: "schedule:" + date + ":" + identifier(q.id),
          coins: 0,
          label: "Legacy completion already accounted for",
          date,
        });
    }
    next.rewards.push({
      id: key("wallet", "opening"),
      coins: integer(game.wallet),
      label: "Imported opening wallet (history retained in source archive)",
      date,
    });
    const shopItems = z.array(row).parse(game.shopItems);
    if (game.customReward) shopItems.push(row.parse(game.customReward));
    for (const item of shopItems) {
      next.shop.push({
        id: key("shop", item.id),
        title: z.string().parse(item.title),
        cost: integer(item.cost),
        cooldownDays: integer(item.cooldownDays),
        lastDate: z.string().nullable().parse(item.lastPurchasedDate),
        cooldownHours:
          item.cooldownHours === undefined
            ? undefined
            : z.number().parse(item.cooldownHours),
        lastPurchasedAt:
          item.lastPurchasedAt === undefined
            ? undefined
            : z.string().nullable().parse(item.lastPurchasedAt),
      });
    }
    warnings.push(
      "Gamification remains disabled. Partial quest progress and custom rewards are preserved. Streaks and truncated reward history remain in the complete source archive; they are not fabricated as new events.",
    );
  } else if (source === "timeline") {
    for (const p of z
      .array(row)
      .parse(Array.isArray(data) ? data : row.parse(data).items))
      next.plans.push({
        id: key("plan", p.id),
        title: z.string().parse(p.name),
        start: z.string().parse(p.start),
        end: z.string().parse(p.end),
      });
  } else if (source === "timebank") {
    const draft = row.parse(data);
    const a = value(draft.entrada1 ?? ""),
      b = value(draft.saida1 ?? ""),
      c = value(draft.entrada2 ?? ""),
      d = value(draft.saida2 ?? "");
    if (a && b && (!c || d)) {
      const openingText = value(draft.saldoInicial ?? "0");
      // useSaldoInicial persists signed integer minutes, despite the clock-formatted UI.
      if (!/^-?\d+$/.test(openingText))
        throw new Error(
          "Stored opening balance must be signed integer minutes",
        );
      const opening = Number(openingText);
      const intervals: [string, string][] = [[a, b]];
      if (c && d) intervals.push([c, d]);
      next.workdays.push({
        id: key("workday", "draft"),
        date: draftDate,
        intervals,
        target: 480,
        opening,
      });
    } else
      warnings.push(
        "Incomplete undated Timebank draft preserved in source archive only. Complete its intervals manually.",
      );
    warnings.push(
      "The supplied date is an operator assignment; the old draft had no historical date.",
    );
  } else if (source === "finance-tacker") {
    const dump = z
      .object({
        version: z.literal(1),
        tables: z.object({
          Meses: z.array(row),
          MonthExpenses: z.array(row),
          ExpenseTemplates: z.array(row),
          Config: z.array(row).optional(),
          Eventos: z.array(row),
        }),
      })
      .parse(data);
    if (!/^[A-Z]{3}$/.test(currency))
      throw new Error("Confirm the finance source currency code");
    const tables = dump.tables;
    const months = new Set(tables.Meses.map((m) => identifier(m.id)));
    if (tables.MonthExpenses.some((e) => !months.has(identifier(e.month_id))))
      throw new Error(
        "Orphan month expenses found; reconcile them before import",
      );
    for (const m of tables.Meses) {
      const expenses = tables.MonthExpenses.filter(
        (e) => identifier(e.month_id) === identifier(m.id),
      ).map((e) => ({
        id: key("expense", e.id),
        title: z.string().parse(e.nome),
        category: z.string().parse(e.categoria),
        cents: money(value(e.valor)),
      }));
      const salary = money(value(m.salario)),
        benefits = money(value(m.vr)),
        contribution = money(value(m.valor_aporte));
      const freeText = value(m.dinheiro_livre),
        free = freeText.startsWith("-")
          ? -money(freeText.slice(1))
          : money(freeText);
      if (
        salary + benefits !== money(value(m.receita_total)) ||
        expenses.reduce((n, e) => n + e.cents, 0) !==
          money(value(m.gastos_obrigatorios)) ||
        salary +
          benefits -
          contribution -
          expenses.reduce((n, e) => n + e.cents, 0) !==
          free
      )
        warnings.push(
          "Month " +
            String(m.mes) +
            ": stored totals disagree. Original values preserved; reconcile before retirement.",
        );
      next.budgets.push({
        id: key("month", m.id),
        month: z.string().parse(m.mes),
        currency,
        salary,
        benefits,
        rate: money(value(m.percentual_aporte)),
        contribution,
        free,
        expenses,
        legacy: true,
      });
    }
    for (const t of tables.ExpenseTemplates) {
      next.templates.push({
        id: key("template", t.id),
        title: z.string().parse(t.nome),
        category: z.string().parse(t.categoria),
        cents: t.valor_padrao === null ? 0 : money(value(t.valor_padrao)),
        variable: t.valor_padrao === null,
        active: t.ativa === 1,
      });
    }
    warnings.push(
      "Config intentionally omitted under owner decision 2026-09-26: unused desktop default percentage. Eventos and all other exported evidence retained. Imported monthly values are never recomputed.",
    );
  } else throw new Error("Unsupported source");
  next.archives.push({
    id: archiveId,
    source,
    importedAt: new Date().toISOString(),
    raw: retainedRaw,
    ...(source === "finance-tacker" ? { omissions: ["Config: unused desktop default percentage; owner decision 2026-09-26"] } : {}),
  });
  return { next: SnapshotSchema.parse(next), warnings, alreadyImported: false };
}
export function emptyImportTarget(): Snapshot {
  return emptySnapshot();
}
