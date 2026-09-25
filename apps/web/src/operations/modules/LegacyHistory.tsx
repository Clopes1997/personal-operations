import type { Snapshot } from "../domain";
import { download } from "../module-ui";
export default function LegacyHistory({state}: {state: Snapshot}) {
  return <section><h2>Legacy History</h2>
    <p>Imported legacy/archive data is read-only evidence, separate from active application data. These records do not change current tasks, streaks, rewards, balances or analytics.</p>
    {!state.archives.length && <p>No imported archives.</p>}
    {state.archives.map(archive => {
      let evidence: Record<string, unknown> | undefined;
      try {const raw = JSON.parse(archive.raw); if (raw && typeof raw === "object" && !Array.isArray(raw)) evidence = raw; } catch { /* Raw evidence remains exportable. */ }
      return <article key={archive.id}>
        <h3>{archive.id}</h3><p>Source: {archive.source}; imported: {archive.importedAt}</p>
        {archive.source === "life-rpg" && <>
          <h4>Historical streak summaries and reward information</h4>
          <p>Summaries and potentially truncated reward history cannot establish a complete event ledger. No missing events have been invented.</p>
          {["streak", "stats", "streakMilestonesClaimed", "rewardHistory"].map(key => <details key={key}><summary>{key}</summary><pre>{evidence && key in evidence ? JSON.stringify(evidence[key], null, 2) : "Not present in source; unknown."}</pre></details>)}
        </>}
        <details><summary>Original raw evidence</summary><pre>{archive.raw}</pre></details>
        <button onClick={() => download(archive.id.replace(/:/g, "-") + ".json", archive.raw)}>Download original evidence</button>
      </article>;
    })}
  </section>;
}
