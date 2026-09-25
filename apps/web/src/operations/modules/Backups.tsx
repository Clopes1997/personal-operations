import { useState } from "react";
import { today, type Snapshot } from "../domain";
import { parseBackup, exportBackup } from "../persistence";
import { previewLegacy, type ImportPreview } from "../imports";
import { Field, download, type Props } from "../module-ui";
import BackupHealth from "../BackupHealth";
import { readHealth, saveHealth } from "../backup-health";
export default function Backups({ state, update, safely }: Props) {
  const [preview, setPreview] = useState<Snapshot>();
  const [ack, setAck] = useState(false);
  return (
    <section>
      <h2>Backup and restore</h2>
      <p>
        Exports contain your personal and financial information. Keep a copy
        outside this browser. Restoring replaces all modules atomically; export
        current data first.
      </p>
      <button
        onClick={() => safely(() => {
          download(
            "personal-operations-" + today() + ".json",
            exportBackup(state),
          );
          saveHealth({...readHealth(), exportRequestedAt: new Date().toISOString()});
        })}
      >
        Export all data
      </button>
      <BackupHealth state={state} controls />
      <Field label="Restore backup file">
        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            setPreview(undefined);
            setAck(false);
            const file = e.target.files?.[0];
            if (file)
              safely(async () => {
                if (file.size > 20_000_000)
                  throw new Error("Backup exceeds 20 MB");
                setPreview(parseBackup(await file.text()));
              });
          }}
        />
      </Field>
      {preview && (
        <div>
          <p>
            Validated backup: {preview.tasks.length} tasks,{" "}
            {preview.plans.length} plans, {preview.workdays.length} workdays,{" "}
            {preview.budgets.length} months, {preview.archives.length} source
            archives.
          </p>
          <label>
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            I exported current data and intend to replace it.
          </label>
          <button
            disabled={!ack}
            onClick={() =>
              safely(async () => {
                await update(() => preview);
                setPreview(undefined);
                setAck(false);
              })
            }
          >
            Restore reviewed backup
          </button>
        </div>
      )}
      <LegacyImport state={state} update={update} safely={safely} />
      <h3>Preserved source archives</h3>
      <ul>
        {state.archives.map((a) => (
          <li key={a.id}>
            {a.id}{" "}
            <button
              onClick={() => download(a.id.replace(/:/g, "-") + ".json", a.raw)}
            >
              Export original source
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
function LegacyImport({ state, update, safely }: Props) {
  const [source, setSource] = useState("life-rpg");
  const [installation, setInstallation] = useState("");
  const [currency, setCurrency] = useState("");
  const [date, setDate] = useState(today());
  const [preview, setPreview] = useState<ImportPreview>();
  const [accepted, setAccepted] = useState(false);
  return (
    <div>
      <h3>Import an old application</h3>
      <p>
        Import an exported JSON snapshot. Review all warnings before applying.
        Original source values are retained in the backup.
      </p>
      <Field label="Source application">
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPreview(undefined);
          }}
        >
          {["life-rpg", "timeline", "timebank", "finance-tacker"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Source installation ID">
        <input
          value={installation}
          onChange={(e) => {
            setInstallation(e.target.value);
            setPreview(undefined);
          }}
          placeholder="e.g. home-laptop"
        />
      </Field>
      {source === "finance-tacker" && (
        <Field label="Confirmed finance currency">
          <input
            value={currency}
            maxLength={3}
            onChange={(e) => {
              setCurrency(e.target.value.toUpperCase());
              setPreview(undefined);
            }}
          />
        </Field>
      )}
      {source === "timebank" && (
        <Field label="Assign a date to the undated draft">
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPreview(undefined);
            }}
          />
        </Field>
      )}
      <Field label="Legacy JSON export">
        <input
          type="file"
          accept=".json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(undefined);
            setAccepted(false);
            if (f)
              safely(async () => {
                if (f.size > 10_000_000) throw new Error("File exceeds 10 MB");
                setPreview(
                  previewLegacy(
                    state,
                    source,
                    installation,
                    await f.text(),
                    currency,
                    date,
                  ),
                );
              });
          }}
        />
      </Field>
      {preview && (
        <div>
          <p>
            After import: {preview.next.tasks.length} tasks,{" "}
            {preview.next.plans.length} plans, {preview.next.workdays.length}{" "}
            workdays, {preview.next.budgets.length} budget months.
          </p>
          <ul>
            {preview.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <label>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            I reviewed the mappings and warnings.
          </label>
          <button
            disabled={!accepted || preview.alreadyImported}
            onClick={() =>
              safely(async () => {
                await update((s) => {
                  if (s.revision !== preview.next.revision)
                    throw new Error(
                      "Data changed after preview. Preview the source again.",
                    );
                  return preview.next;
                });
                setPreview(undefined);
              })
            }
          >
            Apply reviewed legacy import
          </button>
        </div>
      )}
    </div>
  );
}
