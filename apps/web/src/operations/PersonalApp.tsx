import { useEffect, useRef, useState } from "react";
import { SnapshotSchema, type Snapshot } from "./domain";
import { openDatabase, readSnapshot, writeSnapshot } from "./persistence";
import type { Update } from "./module-ui";
import "./operations.css";
import Tasks from "./modules/Tasks";
import Timeline from "./modules/Timeline";
import TimeBalance from "./modules/TimeBalance";
import Budgets from "./modules/Budgets";
import TimeCalculator from "./modules/TimeCalculator";
const tabs = [
  "Tasks",
  "Timeline",
  "Timebank",
  "Budget",
  "Time Calculator",
] as const;
type Tab = (typeof tabs)[number];
export default function PersonalApp() {
  const [state, setState] = useState<Snapshot>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("Tasks");
  const database = useRef<IDBDatabase | null>(null);
  const stateRef = useRef<Snapshot | undefined>(undefined);
  const writing = useRef(false);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (writing.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);
  useEffect(() => {
    let active = true;
    openDatabase()
      .then(async (db) => {
        if (!active) {
          db.close();
          return;
        }
        database.current = db;
        const loaded = await readSnapshot(db);
        if (active) {
          stateRef.current = loaded;
          setState(loaded);
        }
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
      database.current?.close();
    };
  }, []);
  const update: Update = async (transform) => {
    if (!database.current || !stateRef.current || writing.current) return;
    writing.current = true;
    setBusy(true);
    setError("");
    try {
      const previous = stateRef.current;
      const next = SnapshotSchema.parse(transform(structuredClone(previous)));
      const saved = await writeSnapshot(
        database.current,
        next,
        previous.revision,
      );
      stateRef.current = saved;
      setState(saved);
    } catch (e) {
      setError(String(e));
      throw e;
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };
  const safely = (action: () => Promise<void> | void) => {
    Promise.resolve()
      .then(action)
      .catch((e) => setError(String(e)));
  };
  return (
    <div className="operations">
      <aside className="ops-sidebar">
        <div className="ops-brand"><span>PO</span>Personal operations</div>
        <p className="ops-menu-label">Workspace</p>
        <nav aria-label="Modules">
          {tabs.map((t) => <button key={t} aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}>{t}</button>)}
        </nav>
      </aside>
      <main className="ops-main">
      <header>
        <h1>Personal operations</h1>
        <p>Tasks, plans, time and budgets in this browser.</p>
      </header>
      {state && <div className="ops-stats" aria-label="Workspace overview">
        <div><span>Open tasks</span><strong>{state.tasks.filter(t => !t.completed).length}</strong></div>
        <div><span>Scheduled plans</span><strong>{state.plans.length}</strong></div>
        <div><span>Completed tasks</span><strong>{state.tasks.filter(t => t.completed).length}</strong></div>
      </div>}
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => location.reload()}>Reload saved data</button>
        </p>
      )}
      {!state ? (
        <p>
          {error
            ? "Storage could not be opened. No data was overwritten."
            : "Opening local storage…"}
        </p>
      ) : (
        <fieldset disabled={busy} className="ops-content">
          <legend className="sr-only">{tab}</legend>
          {tab === "Tasks" && (
            <Tasks state={state} update={update} safely={safely} />
          )}
          {tab === "Timeline" && (
            <Timeline state={state} update={update} safely={safely} />
          )}
          {tab === "Timebank" && (
            <TimeBalance state={state} update={update} safely={safely} />
          )}
          {tab === "Budget" && (
            <Budgets state={state} update={update} safely={safely} />
          )}
          {tab === "Time Calculator" && (
            <TimeCalculator />
          )}
        </fieldset>
      )}
      <footer aria-live="polite">
        {busy ? "Saving…" : state ? "Saved revision " + state.revision : ""}
      </footer>
      </main>
    </div>
  );
}
