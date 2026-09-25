import { useState, type FormEvent } from "react";
import { today, workBalance, suggestedExit } from "../domain";
import { Field, text, uid, type Props } from "../module-ui";
export default function TimeBalance({ state, update, safely }: Props) {
  const [result, setResult] = useState("");
  const [editing, setEditing] = useState<string>();
  const selected = state.workdays.find((w) => w.id === editing);
  function calculate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    safely(async () => {
      const target = Number(text(d, "target")),
        opening = Number(text(d, "opening"));
      const first: [string, string] = [text(d, "start1"), text(d, "end1")];
      if (text(d, "start2") && !text(d, "end2")) {
        setResult(
          "Suggested exit: " +
            suggestedExit(first, text(d, "start2"), target, opening),
        );
        return;
      }
      const intervals: [string, string][] = [first];
      if (text(d, "start2") || text(d, "end2"))
        intervals.push([text(d, "start2"), text(d, "end2")]);
      const r = workBalance(intervals, target, opening),
        date = text(d, "date");
      await update((s) => ({
        ...s,
        workdays: [
          ...s.workdays.filter((w) => w.date !== date && w.id !== editing),
          { id: editing ?? uid(), date, intervals, target, opening },
        ],
      }));
      setResult(
        "Worked " +
          r.worked +
          " min; daily " +
          r.daily +
          " min; balance " +
          r.balance +
          " min",
      );
    });
  }
  return (
    <section>
      <h2>Time balance</h2>
      <p>
        Each record includes its own opening balance. Overnight periods require
        manual splitting into dated records. Leave the second exit empty to
        calculate a suggested exit without saving.
      </p>
      <form key={editing ?? "new"} onSubmit={calculate}>
        <Field label="Work date">
          <input
            name="date"
            type="date"
            required
            defaultValue={selected?.date ?? today()}
          />
        </Field>
        {["start1", "end1", "start2", "end2"].map((key, i) => (
          <Field
            key={key}
            label={
              ["First arrival", "First exit", "Second arrival", "Second exit"][
                i
              ]
            }
          >
            <input
              name={key}
              type="time"
              required={i < 2}
              defaultValue={selected?.intervals[Math.floor(i / 2)]?.[i % 2]}
            />
          </Field>
        ))}
        <Field label="Daily target (minutes)">
          <input
            name="target"
            type="number"
            min="0"
            max="1440"
            defaultValue={selected?.target ?? 480}
          />
        </Field>
        <Field label="Opening balance (signed minutes)">
          <input
            name="opening"
            type="number"
            defaultValue={selected?.opening ?? 0}
          />
        </Field>
        <button>Calculate / save completed day</button>
        {editing && (
          <button type="button" onClick={() => setEditing(undefined)}>
            New day
          </button>
        )}
      </form>
      <p role="status">{result}</p>
      <ul>
        {state.workdays.map((w) => (
          <li key={w.id}>
            {w.date}: {workBalance(w.intervals, w.target, w.opening).balance}{" "}
            min <button onClick={() => setEditing(w.id)}>Edit</button>
            <button
              onClick={() =>
                safely(() =>
                  update((s) => ({
                    ...s,
                    workdays: s.workdays.filter((x) => x.id !== w.id),
                  })),
                )
              }
            >
              Delete {w.date}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
