import { useState, type FormEvent } from "react";
import {
  today,
  money,
  displayMoney,
  budgetCalculation,
  type Budget,
} from "../domain";
import { MonthInput } from "../MonthInput";
import { Field, text, uid, download, type Props } from "../module-ui";
export default function Budgets({ state, update, safely }: Props) {
  const [variable, setVariable] = useState(false);
  const [variableEdits, setVariableEdits] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<Budget>();
  const [selected, setSelected] = useState<Budget>();
  function calculate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    safely(() => {
      const expenses = state.templates
        .filter((t) => t.active)
        .map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          cents: t.variable ? money(text(d, "variable:" + t.id)) : t.cents,
        }));
      if (text(d, "extra"))
        expenses.push({
          id: uid(),
          title: "Additional expenses",
          category: "Other",
          cents: money(text(d, "extra")),
        });
      const salary = money(text(d, "salary")),
        benefits = money(text(d, "benefits")),
        rate = money(text(d, "rate"));
      const result = budgetCalculation(
        salary,
        benefits,
        rate,
        expenses.map((x) => x.cents),
      );
      setPreview({
        id: uid(),
        month: text(d, "month"),
        currency: text(d, "currency").toUpperCase(),
        salary,
        benefits,
        rate,
        expenses,
        ...result,
        legacy: false,
      });
    });
  }
  return (
    <section>
      <h2>Monthly budget</h2>
      <p>
        Benefits count as income, matching the desktop calculator. Contribution
        is 33.33%–100%. Saved months are snapshots; changing a template does not
        change history.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = e.currentTarget,
            d = new FormData(f);
          safely(async () => {
            await update((s) => ({
              ...s,
              templates: [
                ...s.templates,
                {
                  id: uid(),
                  title: text(d, "title"),
                  category: text(d, "category"),
                  cents: d.has("variable") ? 0 : money(text(d, "value")),
                  variable: d.has("variable"),
                  active: true,
                },
              ],
            }));
            f.reset();
            setVariable(false);
          });
        }}
      >
        <Field label="Expense template">
          <input name="title" required />
        </Field>
        <Field label="Category">
          <input name="category" defaultValue="General" />
        </Field>
        <Field label="Default amount">
          <input name="value" inputMode="decimal" defaultValue="0" disabled={variable} required={!variable} />
        </Field>
        <label>
          <input name="variable" type="checkbox" checked={variable} onChange={e => setVariable(e.target.checked)} />
          Enter amount each month
        </label>
        <button>Add template</button>
      </form>
      <ul>
        {state.templates.map((t) => (
          <li key={t.id}>
            <details>
              <summary>Edit {t.title}</summary>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  safely(() =>
                    update((s) => ({
                      ...s,
                      templates: s.templates.map((x) =>
                        x.id === t.id
                          ? {
                              ...x,
                              title: text(d, "title"),
                              category: text(d, "category"),
                              variable: d.has("variable"),
                              cents: d.has("variable")
                                ? 0
                                : money(text(d, "value")),
                            }
                          : x,
                      ),
                    })),
                  );
                }}
              >
                <Field label="Template name">
                  <input name="title" defaultValue={t.title} required />
                </Field>
                <Field label="Template category">
                  <input name="category" defaultValue={t.category} />
                </Field>
                <Field label="Template amount">
                  <input
                    name="value"
                    defaultValue={displayMoney(t.cents)}
                    disabled={variableEdits[t.id] ?? !!t.variable}
                    required={!(variableEdits[t.id] ?? t.variable)}
                  />
                </Field>
                <label>
                  <input
                    name="variable"
                    type="checkbox"
                    checked={variableEdits[t.id] ?? !!t.variable}
                    onChange={e => setVariableEdits(v => ({ ...v, [t.id]: e.target.checked }))}
                  />
                  Variable amount
                </label>
                <button>Save template</button>
              </form>
            </details>
            <label>
              <input
                type="checkbox"
                checked={t.active}
                onChange={() =>
                  safely(() =>
                    update((s) => ({
                      ...s,
                      templates: s.templates.map((x) =>
                        x.id === t.id ? { ...x, active: !x.active } : x,
                      ),
                    })),
                  )
                }
              />
              {t.title}:{" "}
              {t.variable ? "variable monthly amount" : displayMoney(t.cents)}
            </label>
          </li>
        ))}
      </ul>
      <form onSubmit={calculate} onChange={() => setPreview(undefined)}>
        {state.templates
          .filter((t) => t.active && t.variable)
          .map((t) => (
            <Field key={t.id} label={t.title + " monthly amount"}>
              <input name={"variable:" + t.id} inputMode="decimal" required />
            </Field>
          ))}
        <Field label="Month">
          <MonthInput
            name="month"
            required
            defaultValue={today().slice(0, 7)}
          />
        </Field>
        <Field label="Currency code">
          <input
            name="currency"
            placeholder="e.g. BRL"
            pattern="[A-Za-z]{3}"
            required
            maxLength={3}
          />
        </Field>
        <Field label="Salary">
          <input name="salary" inputMode="decimal" required />
        </Field>
        <Field label="Benefits">
          <input
            name="benefits"
            defaultValue="0"
            inputMode="decimal"
            required
          />
        </Field>
        <Field label="Contribution percent">
          <input name="rate" defaultValue="50" inputMode="decimal" required />
        </Field>
        <Field label="Additional expenses">
          <input name="extra" defaultValue="0" inputMode="decimal" />
        </Field>
        <button>Preview month</button>
      </form>
      {preview && (
        <div role="status">
          <p>
            {preview.month.replace("-", "/")}: contribution {displayMoney(preview.contribution)},
            free {displayMoney(preview.free)} {preview.currency}
          </p>
          <button
            onClick={() =>
              safely(async () => {
                await update((s) => {
                  if (s.budgets.some((b) => b.month === preview.month))
                    throw new Error(
                      "This month already exists. Preserve it or export and explicitly delete it first.",
                    );
                  return { ...s, budgets: [...s.budgets, preview] };
                });
                setPreview(undefined);
              })
            }
          >
            Save reviewed month
          </button>
        </div>
      )}
      <ul>
        {state.budgets.map((b) => (
          <li key={b.id}>
            <button onClick={() => setSelected(b)}>{b.month.replace("-", "/")}</button>: free{" "}
            {displayMoney(b.free)} {b.currency}
          </li>
        ))}
      </ul>
      {selected && (
        <div>
          <h3>{selected.month.replace("-", "/")}</h3>
          <details key={selected.id}>
            <summary>Edit saved month</summary>
            <p>
              Review a recalculated replacement. Templates do not alter this
              saved month's expenses.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                safely(async () => {
                  const salary = money(text(d, "salary")),
                    benefits = money(text(d, "benefits")),
                    rate = money(text(d, "rate"));
                  const expenses = selected.expenses.map((x) => ({
                    ...x,
                    cents: money(text(d, "expense:" + x.id)),
                  }));
                  const replacement = {
                    ...selected,
                    salary,
                    benefits,
                    rate,
                    expenses,
                    ...budgetCalculation(
                      salary,
                      benefits,
                      rate,
                      expenses.map((x) => x.cents),
                    ),
                    legacy: false,
                  };
                  if (!d.has("confirm"))
                    throw new Error(
                      "Confirm replacement after reviewing the inputs",
                    );
                  await update((s) => {
                    const current = s.budgets.find((b) => b.id === selected.id);
                    if (JSON.stringify(current) !== JSON.stringify(selected))
                      throw new Error("Month changed; select it again");
                    return {
                      ...s,
                      budgets: s.budgets.map((b) =>
                        b.id === selected.id ? replacement : b,
                      ),
                    };
                  });
                  setSelected(replacement);
                });
              }}
            >
              <Field label="Revised salary">
                <input
                  name="salary"
                  defaultValue={displayMoney(selected.salary)}
                  required
                />
              </Field>
              <Field label="Revised benefits">
                <input
                  name="benefits"
                  defaultValue={displayMoney(selected.benefits)}
                  required
                />
              </Field>
              <Field label="Revised contribution percent">
                <input
                  name="rate"
                  defaultValue={displayMoney(selected.rate)}
                  required
                />
              </Field>
              {selected.expenses.map((x) => (
                <Field key={x.id} label={"Revised " + x.title}>
                  <input
                    name={"expense:" + x.id}
                    defaultValue={displayMoney(x.cents)}
                    required
                  />
                </Field>
              ))}
              <label>
                <input name="confirm" type="checkbox" required />
                Replace this month's saved values with these inputs
              </label>
              <button>Save revised month</button>
            </form>
          </details>
          <p>
            Income {displayMoney(selected.salary + selected.benefits)};
            contribution {displayMoney(selected.contribution)}; free{" "}
            {displayMoney(selected.free)} {selected.currency}
          </p>
          <ul>
            {selected.expenses.map((e) => (
              <li key={e.id}>
                {e.title}: {displayMoney(e.cents)}
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              download(
                "budget-" + selected.month + ".json",
                JSON.stringify(selected, null, 2),
              );
            }}
          >
            Export month
          </button>
        </div>
      )}
    </section>
  );
}
