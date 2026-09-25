import { useState, useRef, type FormEvent } from "react";
import { today, assignLanes, dayNumber, shiftDate, type Plan } from "../domain";
import { Field, text, uid, type Props } from "../module-ui";
export default function Timeline({ state, update, safely }: Props) {
  const [editing, setEditing] = useState<Plan>();
  const dragStart = useRef<number | null>(null);
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
  const lanes = assignLanes(state.plans);
  const start = state.plans.length
    ? Math.min(...state.plans.map((p) => dayNumber(p.start)))
    : dayNumber(today());
  const span = state.plans.length
    ? Math.max(...state.plans.map((p) => dayNumber(p.end))) - start + 1
    : 1;
  const move = (p: Plan, days: number) =>
    safely(() =>
      update((s) => ({
        ...s,
        plans: s.plans.map((x) =>
          x.id === p.id
            ? {
                ...x,
                start: shiftDate(x.start, days),
                end: shiftDate(x.end, days),
              }
            : x,
        ),
      })),
    );
  return (
    <section>
      <h2>Timeline</h2>
      <p>
        Inclusive calendar dates. Drag a bar to move it; the arrow buttons
        provide the same action without dragging.
      </p>
      <form key={editing?.id ?? "new"} onSubmit={save}>
        <Field label="Plan title">
          <input name="title" required defaultValue={editing?.title} />
        </Field>
        <Field label="Start">
          <input
            name="start"
            type="date"
            required
            defaultValue={editing?.start ?? today()}
          />
        </Field>
        <Field label="End">
          <input
            name="end"
            type="date"
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
      <div className="ops-timeline">
        {lanes.map((lane, i) => (
          <div className="ops-lane" key={i}>
            {lane.map((p) => (
              <div
                className="ops-bar"
                key={p.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", p.id);
                  dragStart.current = e.clientX;
                }}
                onDragEnd={(e) => {
                  const width = e.currentTarget.parentElement?.clientWidth ?? 1;
                  const original = dragStart.current;
                  dragStart.current = null;
                  if (original !== null && e.clientX)
                    move(
                      p,
                      Math.round(((e.clientX - original) * span) / width),
                    );
                }}
                style={{
                  left: ((dayNumber(p.start) - start) / span) * 100 + "%",
                  width:
                    ((dayNumber(p.end) - dayNumber(p.start) + 1) / span) * 100 +
                    "%",
                }}
              >
                <button onClick={() => setEditing(p)}>{p.title}</button>
                <small>
                  {p.start} — {p.end}
                </small>
                <button
                  aria-label={"Move " + p.title + " back one day"}
                  onClick={() => move(p, -1)}
                >
                  ←
                </button>
                <button
                  aria-label={"Move " + p.title + " forward one day"}
                  onClick={() => move(p, 1)}
                >
                  →
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
      <ul>
        {state.plans.map((p) => (
          <li key={p.id}>
            {p.title}: {p.start} — {p.end}{" "}
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
