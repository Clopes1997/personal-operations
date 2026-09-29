import { useState, type FormEvent } from "react";
import { ScheduleWizard } from "../../components/ScheduleWizard";
import { today, generateOccurrences, completeTask } from "../domain";
import { DateInput } from "../DateInput";
import { Field, text, uid, type Props } from "../module-ui";
export default function Tasks({ state, update, safely }: Props) {
  const [wizard, setWizard] = useState(false);
  const [date, setDate] = useState(today());
  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      data = new FormData(form);
    safely(async () => {
      await update((s) => ({
        ...s,
        tasks: [
          ...s.tasks,
          {
            id: uid(),
            title: text(data, "title"),
            date,
            completed: false,
            estimatedMinutes: Number(text(data, "minutes")),
          },
        ],
      }));
      form.reset();
    });
  }
  return (
    <section>
      <h2>Tasks and schedules</h2>
      <Field label="Task date">
        <DateInput
          form="task-form"
          value={date}
          onChange={setDate}
        />
      </Field>
      <form id="task-form" onSubmit={add}>
        <Field label="Task title">
          <input name="title" required maxLength={500} />
        </Field>
        <Field label="Estimated minutes">
          <input
            name="minutes"
            type="number"
            min="0"
            max="1440"
            defaultValue="30"
            required
          />
        </Field>
        <button>Add task</button>
      </form>
      <button onClick={() => setWizard(!wizard)}>Schedule wizard</button>
      <button
        disabled={!state.settings.schedule}
        onClick={() =>
          safely(() => update((s) => generateOccurrences(s, date)))
        }
      >
        Generate scheduled tasks
      </button>
      {wizard && (
        <ScheduleWizard
          onCancel={() => setWizard(false)}
          onComplete={(schedule) =>
            safely(async () => {
              await update((s) => ({
                ...s,
                settings: { ...s.settings, schedule },
              }));
              setWizard(false);
            })
          }
        />
      )}
      <ul>
        {state.tasks
          .filter((t) => t.date === date)
          .map((t) => (
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
                        tasks: s.tasks.map((x) =>
                          x.id === t.id
                            ? {
                                ...x,
                                title: text(d, "title"),
                                date: text(d, "date"),
                                estimatedMinutes: Number(text(d, "minutes")),
                              }
                            : x,
                        ),
                      })),
                    );
                  }}
                >
                  <Field label="Revised task title">
                    <input name="title" defaultValue={t.title} required />
                  </Field>
                  <Field label="Revised task date">
                    <DateInput
                      name="date"
                      defaultValue={t.date}
                    />
                  </Field>
                  <Field label="Revised estimated minutes">
                    <input
                      name="minutes"
                      type="number"
                      min="0"
                      max="1440"
                      defaultValue={t.estimatedMinutes}
                      required
                    />
                  </Field>
                  <button>Save task</button>
                </form>
              </details>
              <label>
                <input
                  type="checkbox"
                  checked={t.completed}
                  onChange={() =>
                    safely(() =>
                      update((s) =>
                        t.completed
                          ? {
                              ...s,
                              tasks: s.tasks.map((x) =>
                                x.id === t.id
                                  ? {
                                      ...x,
                                      completed: false,
                                      progressCurrent: 0,
                                    }
                                  : x,
                              ),
                            }
                          : completeTask(s, t.id),
                      ),
                    )
                  }
                />
                {t.title} ({t.estimatedMinutes} min)
              </label>
              {(t.progressRequired ?? 1) > 1 && (
                <button
                  disabled={t.completed}
                  onClick={() =>
                    safely(() =>
                      update((s) => {
                        const current = s.tasks.find((x) => x.id === t.id);
                        if (!current) throw new Error("Task no longer exists");
                        const progress = (current.progressCurrent ?? 0) + 1;
                        if (progress >= (current.progressRequired ?? 1))
                          return completeTask(s, t.id);
                        return {
                          ...s,
                          tasks: s.tasks.map((x) =>
                            x.id === t.id
                              ? { ...x, progressCurrent: progress }
                              : x,
                          ),
                        };
                      }),
                    )
                  }
                >
                  Add progress ({t.progressCurrent ?? 0}/{t.progressRequired})
                </button>
              )}
              <button
                onClick={() =>
                  safely(() =>
                    update((s) => ({
                      ...s,
                      tasks: s.tasks.filter((x) => x.id !== t.id),
                    })),
                  )
                }
              >
                Delete {t.title}
              </button>
            </li>
          ))}
      </ul>
      {!state.tasks.some((t) => t.date === date) && (
        <p>No tasks for this date.</p>
      )}
    </section>
  );
}
