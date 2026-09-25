import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { emptySnapshot } from "./domain";
import {
  exportBackup,
  openDatabase,
  parseBackup,
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
  it("restores all module records into a clean database", async () => {
    const db = await openDatabase(crypto.randomUUID());
    const initial = emptySnapshot();
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
    const clean = await openDatabase(crypto.randomUUID());
    await writeSnapshot(clean, parseBackup(exportBackup(saved)), 0);
    expect((await readSnapshot(clean)).tasks).toEqual(saved.tasks);
    db.close();
    clean.close();
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
  it("rejects corrupt backups before writing", async () => {
    const db = await openDatabase(crypto.randomUUID());
    await writeSnapshot(db, emptySnapshot(), 0);
    expect(() => parseBackup('{"version":99}')).toThrow();
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
    expect(() => parseBackup(JSON.stringify(duplicate))).toThrow("Duplicate");
    expect((await readSnapshot(db)).revision).toBe(1);
    db.close();
  });
});
