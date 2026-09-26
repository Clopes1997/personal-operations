import { expect, it } from "vitest";
import { emptySnapshot } from "./domain";
import { previewLegacy } from "./imports";
it("preserves partial progress and an hourly custom reward without awarding historical coins", () => {
  const raw = JSON.stringify({
    schedule: null, lastPlayedDate: "2026-09-24", wallet: 50,
    questsToday: [{id: "read", title: "Read", completed: false, durationHours: 1, coinReward: 10, progressRequired: 4, progressCurrent: 2}],
    shopItems: [], customReward: {id: "custom", title: "Break", cost: 5, cooldownDays: 0,
      cooldownHours: 2, lastPurchasedDate: "2026-09-24", lastPurchasedAt: "2026-09-24T12:00:00Z"},
  });
  const {next} = previewLegacy(emptySnapshot(), "life-rpg", "home", raw, "", "");
  expect(next.tasks[0]).toMatchObject({progressRequired: 4, progressCurrent: 2, completed: false});
  expect(next.shop[0]).toMatchObject({title: "Break", cooldownHours: 2, lastPurchasedAt: "2026-09-24T12:00:00Z"});
  expect(next.rewards.reduce((sum, r) => sum + r.coins, 0)).toBe(50);
  expect(next.settings.gamification).toBe(false);
});
it("preserves variable finance templates without inventing a monthly amount", () => {
  const raw = JSON.stringify({
    version: 1,
    tables: {
      Config: [],
      Eventos: [],
      Meses: [],
      MonthExpenses: [],
      ExpenseTemplates: [
        {
          id: 9,
          nome: "Utilities",
          categoria: "Home",
          valor_padrao: null,
          ativa: 1,
        },
      ],
    },
  });
  const result = previewLegacy(
    emptySnapshot(),
    "finance-tacker",
    "desktop",
    raw,
    "BRL",
    "",
  );
  expect(result.next.templates[0]).toMatchObject({
    title: "Utilities",
    variable: true,
    cents: 0,
    active: true,
  });
});
it("imports the actual Timebank signed-minute storage format", () => {
  const raw = JSON.stringify({
    entrada1: "08:00",
    saida1: "12:00",
    entrada2: "13:00",
    saida2: "17:00",
    saldoInicial: "-45",
  });
  expect(
    previewLegacy(emptySnapshot(), "timebank", "home", raw, "", "2026-09-24")
      .next.workdays[0].opening,
  ).toBe(-45);
});
it("imports plans idempotently without merging coincident source IDs", () => {
  const raw = JSON.stringify([
    { id: 1, name: "Plan", start: "2026-03-08", end: "2026-03-09" },
  ]);
  const a = previewLegacy(
    emptySnapshot(),
    "timeline",
    "first",
    raw,
    "",
    "",
  ).next;
  expect(
    previewLegacy(a, "timeline", "first", raw, "", "").alreadyImported,
  ).toBe(true);
  expect(
    previewLegacy(a, "timeline", "second", raw, "", "").next.plans,
  ).toHaveLength(2);
  expect(() =>
    previewLegacy(a, "timeline", "first", raw + " ", "", ""),
  ).toThrow("different data");
});
it("preserves finance snapshots and reports inconsistent totals", () => {
  const raw = JSON.stringify({
    version: 1,
    tables: {
      Config: [],
      Eventos: [],
      ExpenseTemplates: [],
      MonthExpenses: [],
      Meses: [
        {
          id: 1,
          mes: "2026-01",
          salario: "100.00",
          vr: "0.00",
          receita_total: "100.00",
          percentual_aporte: "50.00",
          valor_aporte: "50.00",
          gastos_obrigatorios: "1.00",
          dinheiro_livre: "49.00",
        },
      ],
    },
  });
  const result = previewLegacy(
    emptySnapshot(),
    "finance-tacker",
    "desktop",
    raw,
    "BRL",
    "",
  );
  expect(result.next.budgets[0].free).toBe(4900);
  expect(result.warnings.some((w) => w.includes("disagree"))).toBe(true);
  expect(JSON.parse(result.next.archives[0].raw).tables.Meses).toEqual(JSON.parse(raw).tables.Meses);
  expect(JSON.parse(result.next.archives[0].raw).tables).not.toHaveProperty("Config");
});
it("rejects orphan expenses and fractional cents without changing current data", () => {
  const current = emptySnapshot();
  const raw = JSON.stringify({
    version: 1,
    tables: {
      Config: [],
      Eventos: [],
      ExpenseTemplates: [],
      Meses: [],
      MonthExpenses: [{ id: 1, month_id: 99, valor: "1.001" }],
    },
  });
  expect(() =>
    previewLegacy(current, "finance-tacker", "desktop", raw, "BRL", ""),
  ).toThrow("Orphan");
  expect(current.archives).toHaveLength(0);
});

it("intentionally omits Config without affecting templates, stored months or explicit currency", () => {
  const tables = { Config: [{ percentual_aporte_padrao: "75.00" }], Eventos: [{id: 1, evidence: "retained"}],
    ExpenseTemplates: [{id: 1, nome: "Fixed", categoria: "Home", valor_padrao: "0.29", ativa: 1},
      {id: 2, nome: "Variable", categoria: "Home", valor_padrao: null, ativa: 1}],
    Meses: [{id: 1, mes: "2026-01", salario: "100.00", vr: "0.00", receita_total: "100.00",
      percentual_aporte: "50.00", valor_aporte: "50.00", gastos_obrigatorios: "0.00", dinheiro_livre: "50.00"}],
    MonthExpenses: [] };
  const raw = JSON.stringify({version: 1, rowCounts: {Config: 1, ExpenseTemplates: 2}, tables});
  const first = previewLegacy(emptySnapshot(), "finance-tacker", "desktop", raw, "BRL", "");
  const changed = JSON.stringify({version: 1, rowCounts: {Config: 1, ExpenseTemplates: 2},
    tables: {...tables, Config: [{percentual_aporte_padrao: "99.00"}]}});
  const second = previewLegacy(emptySnapshot(), "finance-tacker", "desktop", changed, "BRL", "");
  expect(first.next.templates).toEqual(second.next.templates);
  expect(first.next.budgets).toEqual(second.next.budgets);
  expect(first.next.budgets[0]).toMatchObject({currency: "BRL", rate: 5000});
  expect(first.next.templates.map(t => [t.cents, t.variable])).toEqual([[29,false],[0,true]]);
  const retained = JSON.parse(first.next.archives[0].raw);
  expect(retained.tables).not.toHaveProperty("Config");
  expect(retained.rowCounts).not.toHaveProperty("Config");
  expect(retained.tables.Eventos).toEqual(tables.Eventos);
  expect(first.next.archives[0].omissions?.[0]).toContain("owner decision");
  expect(previewLegacy(first.next,"finance-tacker","desktop",raw,"BRL","").alreadyImported).toBe(true);
  expect(previewLegacy(first.next,"finance-tacker","desktop",changed,"BRL","").alreadyImported).toBe(true);
  const without = {...tables} as Partial<typeof tables>; delete without.Config;
  expect(previewLegacy(emptySnapshot(),"finance-tacker","desktop",JSON.stringify({version:1,tables:without}),"BRL","").next.templates).toEqual(first.next.templates);
  expect(()=>previewLegacy(emptySnapshot(),"finance-tacker","desktop",raw,"","")).toThrow("currency");
  expect(()=>previewLegacy(first.next,"finance-tacker","desktop",raw.replace('"0.29"','"0.30"'),"BRL","")).toThrow("different data");
});
