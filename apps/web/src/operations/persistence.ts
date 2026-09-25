import { emptySnapshot, SnapshotSchema, type Snapshot } from "./domain";

const collections = [
  "tasks",
  "plans",
  "workdays",
  "budgets",
  "templates",
  "rewards",
  "shop",
  "archives",
] as const;
const stores = [...collections, "meta"];
export function openDatabase(
  name = "personal-operations",
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      for (const store of stores)
        request.result.createObjectStore(store, { keyPath: "id" });
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Close other tabs before upgrading storage"));
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}
function readRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readSnapshot(db: IDBDatabase): Promise<Snapshot> {
  const tx = db.transaction(stores, "readonly");
  const pending = collections.map((name) =>
    readRequest(tx.objectStore(name).getAll()),
  );
  const metadata = readRequest(tx.objectStore("meta").get("state"));
  const [rows, meta] = await Promise.all([Promise.all(pending), metadata]);
  if (!meta) {
    if (rows.some((r) => r.length))
      throw new Error(
        "Storage metadata is missing; do not overwrite this database",
      );
    return emptySnapshot();
  }
  return SnapshotSchema.parse({
    ...meta,
    ...Object.fromEntries(collections.map((name, i) => [name, rows[i]])),
  });
}
// One read/write transaction serializes revision checks and every affected module. No await inside it.
export function writeSnapshot(
  db: IDBDatabase,
  input: Snapshot,
  expectedRevision: number,
): Promise<Snapshot> {
  const next = SnapshotSchema.parse({
    ...input,
    revision: expectedRevision + 1,
  });
  exportBackup(next); // Never commit a state that exceeds the supported restore-file limit.
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, "readwrite");
    let conflict: Error | undefined;
    tx.oncomplete = () => resolve(next);
    tx.onabort = () =>
      reject(
        conflict ??
          tx.error ??
          new Error("Storage write aborted; no changes saved"),
      );
    tx.onerror = () => {
      /* onabort provides the transaction result */
    };
    const check = tx.objectStore("meta").get("state");
    check.onsuccess = () => {
      if ((check.result?.revision ?? 0) !== expectedRevision) {
        conflict = new Error(
          "Another tab changed your data. Reload before saving.",
        );
        tx.abort();
        return;
      }
      try {
        for (const name of collections) {
          const store = tx.objectStore(name);
          store.clear();
          for (const row of next[name]) store.put(row);
        }
        tx.objectStore("meta").put({
          id: "state",
          version: next.version,
          revision: next.revision,
          settings: next.settings,
        });
      } catch (error) {
        conflict = error instanceof Error ? error : new Error(String(error));
        tx.abort();
      }
    };
  });
}
export function parseBackup(text: string): Snapshot {
  if (text.length > 20_000_000) throw new Error("Backup exceeds 20 MB");
  return SnapshotSchema.parse(JSON.parse(text));
}
export function exportBackup(state: Snapshot): string {
  const text = JSON.stringify(SnapshotSchema.parse(state), null, 2);
  if (new TextEncoder().encode(text).byteLength > 20_000_000)
    throw new Error("Data exceeds the 20 MB backup/restore limit");
  return text;
}
