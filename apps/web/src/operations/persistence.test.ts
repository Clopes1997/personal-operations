import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { emptySnapshot, SnapshotSchema } from "./domain";
import {
  openDatabase,
  readSnapshot,
  writeSnapshot,
} from "./persistence";
describe("transactional personal storage", () => {
  it("aborts all changes on a quota or synchronous write failure", async () => {
    const db = await openDatabase(crypto.randomUUID());
    const initial = emptySnapshot();
    initial.tasks.push({
      id: "keep",
      title: "Keep",
      date: "2026-09-24",
      completed: false,
      reward: 0,
      estimatedMinutes: 0,
    });
    const saved = await writeSnapshot(db, initial, 0);
    const spy = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(() => {
        throw new DOMException("Storage full", "QuotaExceededError");
      });
    await expect(writeSnapshot(db, saved, 1)).rejects.toThrow("Storage full");
    spy.mockRestore();
    expect(await readSnapshot(db)).toEqual(saved);
    db.close();
  });
  it("persists module records across database connections", async () => {
    const db = await openDatabase(crypto.randomUUID());
    const initial = emptySnapshot();
    initial.archives.push({ id: "existing", source: "old-app", importedAt: "2026-01-01T00:00:00.000Z", raw: "{}" });
    initial.tasks.push({
      id: "task",
      title: "Saved",
      date: "2026-09-24",
      completed: false,
      reward: 0,
      estimatedMinutes: 10,
    });
    const saved = await writeSnapshot(db, initial, 0);
    expect(await readSnapshot(db)).toEqual(saved);
    const name = db.name;
    db.close();
    const reopened = await openDatabase(name);
    expect(await readSnapshot(reopened)).toEqual(saved);
    reopened.close();
  });
  it("rejects stale tabs and leaves the winning transaction intact", async () => {
    const db = await openDatabase(crypto.randomUUID());
    const a = emptySnapshot(),
      b = emptySnapshot();
    a.settings.gamification = true;
    const winner = await writeSnapshot(db, a, 0);
    await expect(writeSnapshot(db, b, 0)).rejects.toThrow("Another tab");
    expect(await readSnapshot(db)).toEqual(winner);
    db.close();
  });
  it("rejects invalid snapshots before writing", async () => {
    const db = await openDatabase(crypto.randomUUID());
    await writeSnapshot(db, emptySnapshot(), 0);
    expect(() => SnapshotSchema.parse({ version: 99 })).toThrow();
    const duplicate = emptySnapshot();
    duplicate.tasks = [
      {
        id: "x",
        title: "X",
        date: "2026-09-24",
        completed: false,
        reward: 0,
        estimatedMinutes: 0,
      },
    ];
    duplicate.tasks.push({ ...duplicate.tasks[0] });
    expect(() => writeSnapshot(db, duplicate, 1)).toThrow("Duplicate");
    expect((await readSnapshot(db)).revision).toBe(1);
    db.close();
  });
});
