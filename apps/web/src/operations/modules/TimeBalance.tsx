import { useState, type FormEvent } from "react";
import { today, workBalance } from "../domain";
import { Field, text, uid, type Props } from "../module-ui";
import { DateInput } from "../DateInput";
import { formatDate } from "../calendar";
import { calculateTimebank, durationMinutes, extractClockTimes, formatDuration } from "../time";
export default function TimeBalance({ state, update, safely }: Props) {
  const [editing, setEditing] = useState<string>();
  const selected = state.workdays.find(w => w.id === editing);
  const [times, setTimes] = useState(["", "", "", ""]);
  const [paste, setPaste] = useState("");
  const [result, setResult] = useState<ReturnType<typeof calculateTimebank>>();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  function calculate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setResult(undefined); setSaved(false);
    const d = new FormData(e.currentTarget);
    const action = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
    safely(async () => {
      try {
        const target = durationMinutes(text(d, "target")), opening = durationMinutes(text(d, "opening"));
        const r = calculateTimebank(times, target, opening, text(d, "asOf"));
        setResult(r);
        if (action === "save") {
          if (!r.complete) throw new Error("Enter the exit for every started period before saving");
          const date = text(d, "date");
          await update(s => ({ ...s, workdays: [...s.workdays.filter(w => w.date !== date && w.id !== editing), { id: editing ?? uid(), date, intervals: r.intervals, target, opening }] }));
          setSaved(true);
        }
      } catch (e) { setError((e as Error).message); }
    });
  }
  return <section><h2>Timebank</h2><p>See how much longer you need to work today. Positive opening balance reduces today's required work; negative balance adds to it. Leave your current exit blank for a suggested finish time.</p>
    <form key={editing ?? "new"} onSubmit={calculate} onChange={() => { setResult(undefined); setSaved(false); }}>
      <Field label="Work date"><DateInput name="date" defaultValue={selected?.date ?? today()} required /></Field>
      {["First arrival", "First exit", "Second arrival", "Second exit"].map((label, i) => <Field key={label} label={label}><input type="time" value={times[i]} required={i === 0} onChange={e => setTimes(t => t.map((v, j) => j === i ? e.target.value : v))} /></Field>)}
      <Field label="As-of time"><input name="asOf" type="time" defaultValue={new Date().toTimeString().slice(0,5)} required /></Field>
      <Field label="Daily target (minutes or HH:MM)"><input name="target" defaultValue={selected?.target ?? 480} required /></Field>
      <Field label="Opening balance (signed minutes or HH:MM)"><input name="opening" defaultValue={selected?.opening ?? 0} required /></Field>
      <button value="calculate">Calculate remaining time</button><button value="save">Save completed day</button>
      <button type="reset" onClick={() => { setEditing(undefined); setTimes(["", "", "", ""]); setResult(undefined); setError(""); setSaved(false); }}>Clear / new day</button>
    </form>
    <details><summary>Fill times from text</summary><Field label="Clock times"><textarea value={paste} onChange={e => setPaste(e.target.value)} placeholder="08:00 12:00 13:00" /></Field><button type="button" onClick={() => { try { const t = extractClockTimes(paste); setTimes([0,1,2,3].map(i => t[i] ?? "")); setError(""); setResult(undefined); } catch (e) { setError((e as Error).message); } }}>Use clock times</button></details>
    {error && <p role="alert">{error}</p>}
    {result && <div role="status"><div className="ops-stats"><div><span>Still to work</span><strong>{formatDuration(result.remaining)}</strong></div><div><span>Worked so far</span><strong>{formatDuration(result.worked)}</strong></div><div><span>{result.exit ? "Suggested finish" : "Closing balance"}</span><strong>{result.exit ?? formatDuration(result.balance)}</strong></div></div><p>Lunch planning window: {result.lunch} (4–5 hours after arrival).</p>{saved && <p>Completed day saved.</p>}</div>}
    <ul>{state.workdays.map(w => <li key={w.id}>{formatDate(w.date)}: {formatDuration(workBalance(w.intervals, w.target, w.opening).balance)} <button onClick={() => { setEditing(w.id); setTimes([w.intervals[0][0], w.intervals[0][1], w.intervals[1]?.[0] ?? "", w.intervals[1]?.[1] ?? ""]); setResult(undefined); }}>Edit</button><button onClick={() => safely(() => update(s => ({ ...s, workdays: s.workdays.filter(x => x.id !== w.id) })))}>Delete {formatDate(w.date)}</button></li>)}</ul>
  </section>;
}
