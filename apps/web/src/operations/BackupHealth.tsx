import { useEffect, useState } from "react";
import type { Snapshot } from "./domain";
import { healthEvent, healthLabel, readHealth, saveHealth, snapshotHash, verifySavedBackup } from "./backup-health";
export default function BackupHealth({ state, controls = false }: {state: Snapshot; controls?: boolean}) {
  const [health, setHealth] = useState(readHealth);
  const [hash, setHash] = useState("");
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const refresh = () => setHealth(readHealth());
    window.addEventListener(healthEvent, refresh);
    window.addEventListener("storage", refresh);
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => {window.removeEventListener(healthEvent, refresh); window.removeEventListener("storage", refresh); clearInterval(timer);};
  }, []);
  useEffect(() => {
    let active = true;
    setHash("");
    snapshotHash(state).then(value => {if (active) setHash(value);}).catch(() => {if (active) setMessage("Backup verification is unavailable in this browser context.");});
    return () => {active = false;};
  }, [state]);
  const label = hash ? healthLabel(health, state.revision, hash, now) : "Checking backup health";
  const persist = (next: typeof health) => {
    try {saveHealth(next); setMessage("");}
    catch {setMessage("Backup preferences could not be saved. Application data and export remain available.");}
  };
  return <aside aria-label={controls ? "Backup verification" : "Backup health"}>
    <p>{label}. Current revision: {state.revision}. Restore format: version 1.</p>
    {health.verified && <p>Saved file last verified: {health.verified.at}; backup revision: {health.verified.revision}. Keep this file outside browser storage.</p>}
    {!controls && health.reminders && label !== "Backed up — saved file verified" && now > health.dismissedUntil && <div>
      <p>Backup reminder: export and verify a saved file from Backups.</p>
      <button onClick={() => persist({...health, dismissedUntil: Date.now() + 86400000})}>Dismiss reminder for one day</button>
    </div>}
    {controls && <>
      <p>A download request does not prove the file was saved. Select your saved export to verify its contents against current data. Verification cannot detect a later deletion of that file.</p>
      {health.exportRequestedAt && <p>Latest export requested: {health.exportRequestedAt} (saving not confirmed).</p>}
      <label>Verify saved backup file<input type="file" accept=".json,application/json" onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        try {
          if (file.size > 20000000) throw new Error("Backup exceeds 20 MB");
          const verified = await verifySavedBackup(await file.text(), state);
          persist({...readHealth(), verified});
        } catch (error) {setMessage(String(error));}
      }}/></label>
      <label><input type="checkbox" checked={health.reminders} onChange={e => persist({...health, reminders: e.target.checked})}/>Enable optional backup reminders</label>
    </>}
    {message && <p>{message}</p>}
  </aside>;
}
