import { useState, type FormEvent } from "react";
import { today, assignLanes, dayNumber, type Plan } from "../domain";
import { DateInput } from "../DateInput";
import { formatDate } from "../calendar";
import { timelineEntries, moveTimelineEntry, type TimelineEntry } from "../timeline";
import { Field, text, uid, type Props } from "../module-ui";
export default function Timeline({ state, update, safely }: Props) {
  const [editing, setEditing] = useState<Plan>();
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      d = new FormData(form);
    const plan = {
      id: editing?.id ?? uid(),
      title: text(d, "title"),
      start: text(d, "start"),
      end: text(d, "end"),
    };
    safely(async () => {
      await update((s) => ({
        ...s,
        plans: [...s.plans.filter((p) => p.id !== plan.id), plan],
      }));
      setEditing(undefined);
      form.reset();
    });
  }
  const entries = timelineEntries(state);
  const lanes = assignLanes(entries);
  const start = entries.length
    ? Math.min(...entries.map((p) => dayNumber(p.start)))
    : dayNumber(today());
  const span = entries.length
    ? Math.max(...entries.map((p) => dayNumber(p.end))) - start + 1
    : 1;
  const dayWidth = 160;
  const canvasWidth = Math.max(800, span * dayWidth);
  const tickStep = Math.max(1, Math.ceil(span / 500));
  const move = (p: TimelineEntry, days: number) => safely(() => update(s => moveTimelineEntry(s, p, days)));
  return (
    <section>
      <h2>Timeline</h2>
      <p>
        Dated tasks appear automatically, including completed and scheduled tasks. Undated tasks stay in Tasks. Use the arrow buttons to move an item by one day; edit task details in Tasks.
      </p>
      <form key={editing?.id ?? "new"} onSubmit={save}>
        <Field label="Plan title">
          <input name="title" required defaultValue={editing?.title} />
        </Field>
        <Field label="Start">
          <DateInput
            name="start"
            required
            defaultValue={editing?.start ?? today()}
          />
        </Field>
        <Field label="End">
          <DateInput
            name="end"
            required
            defaultValue={editing?.end ?? today()}
          />
        </Field>
        <button>{editing ? "Save plan" : "Add plan"}</button>
        {editing && (
          <button type="button" onClick={() => setEditing(undefined)}>
            Cancel edit
          </button>
        )}
      </form>
      {!entries.length && <p>No plans yet. Add a plan to start your timeline.</p>}
      <div className="ops-timeline" role="region" aria-label="Plan calendar" tabIndex={0}>
        <div style={{ width: canvasWidth }}>
        <div className="ops-axis">
          {Array.from({ length: Math.ceil(span / tickStep) }, (_, i) => i * tickStep).map(day =>
            <span key={day} style={{ left: day * dayWidth }}>{formatDate(new Date((start + day) * 86400000).toISOString().slice(0, 10))}</span>
          )}
        </div>
        {lanes.map((lane, i) => (
          <div className="ops-lane" key={i}>
            {(lane as TimelineEntry[]).map((p) => (
              <div
                className="ops-bar"
                key={p.id}
                style={{
                  left: (dayNumber(p.start) - start) * dayWidth,
                  width: (dayNumber(p.end) - dayNumber(p.start) + 1) * dayWidth - 8,
                }}
              >
                {p.kind === "plan" ? <button className="ops-plan-title" title={p.title} onClick={() => setEditing({ ...p, id: p.sourceId })}>{p.title}</button> : <span className="ops-plan-title" title={p.title}>Task: {p.title}{p.completed ? " ✓" : ""}</span>}
                <small>
                  {formatDate(p.start)} — {formatDate(p.end)}
                </small>
                <button
                  aria-label={"Move " + (p.kind === "task" ? "task " : "") + p.title + " back one day"}
                  onClick={() => move(p, -1)}
                >
                  ←
                </button>
                <button
                  aria-label={"Move " + (p.kind === "task" ? "task " : "") + p.title + " forward one day"}
                  onClick={() => move(p, 1)}
                >
                  →
                </button>
              </div>
            ))}
          </div>
        ))}
        </div>
      </div>
      <ul>
        {entries.filter(p => p.kind === "task").map(p => <li key={p.id}>Task: {p.title} · {formatDate(p.start)} · {p.minutes} min · {p.completed ? "Completed" : "Open"}</li>)}
        {state.plans.map((p) => (
          <li key={p.id}>
            {p.title}: {formatDate(p.start)} — {formatDate(p.end)}{" "}
            <button onClick={() => setEditing(p)}>Edit</button>
            <button
              onClick={() =>
                safely(() =>
                  update((s) => ({
                    ...s,
                    plans: s.plans.filter((x) => x.id !== p.id),
                  })),
                )
              }
            >
              Delete {p.title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
