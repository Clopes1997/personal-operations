import { useState, type FormEvent } from "react";
import { Field, text } from "../module-ui";
import { calculateDuration, durationMinutes, formatDuration } from "../time";
export default function TimeCalculator() {
  const [result, setResult] = useState<ReturnType<typeof calculateDuration>>();
  const [error, setError] = useState("");
  function calculate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setResult(undefined);
    const d = new FormData(e.currentTarget);
    try { setResult(calculateDuration(text(d, "start"), text(d, "end"), durationMinutes(text(d, "pause")))); }
    catch (e) { setError(String((e as Error).message)); }
  }
  return <section><h2>Time Calculator</h2><p>Calculate elapsed time and subtract a break. An end before the start means the next day. This calculator does not change Timebank records.</p>
    <form onSubmit={calculate} onChange={() => setResult(undefined)}>
      <Field label="Start time"><input name="start" type="time" required /></Field>
      <Field label="End time"><input name="end" type="time" required /></Field>
      <Field label="Break (minutes or HH:MM)"><input name="pause" defaultValue="0" required /></Field>
      <button>Calculate duration</button><button type="reset" onClick={() => { setResult(undefined); setError(""); }}>Clear</button>
    </form>{error && <p role="alert">{error}</p>}
    {result && <div role="status" className="ops-stats"><div><span>Elapsed</span><strong>{formatDuration(result.gross)}</strong></div><div><span>Break</span><strong>{formatDuration(result.pause)}</strong></div><div><span>Net duration</span><strong>{formatDuration(result.net)}</strong></div></div>}
  </section>;
}
