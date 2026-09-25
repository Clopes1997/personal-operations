import "fake-indexeddb/auto";
import sourceText from "../../../../tools/migration/fixtures/personal-source.json?raw";
import {expect, it} from "vitest";
import {emptySnapshot} from "./domain";
import {openDatabase, writeSnapshot, readSnapshot, exportBackup, parseBackup} from "./persistence";
import {healthLabel, snapshotHash, verifySavedBackup} from "./backup-health";
import {previewLegacy} from "./imports";
const fixture = () => parseBackup(sourceText);
it("retirement acceptance: destructive replacement, restore, every module and stale tabs", async () => {
  const db = await openDatabase(crypto.randomUUID());
  const saved = await writeSnapshot(db, fixture(), 0);
  const backup = exportBackup(saved);
  const verified = await verifySavedBackup(backup, saved);
  expect(healthLabel({reminders:false,dismissedUntil:0,verified}, saved.revision, await snapshotHash(saved))).toContain("Backed up");
  const empty = await writeSnapshot(db, emptySnapshot(), saved.revision);
  expect((await readSnapshot(db)).tasks).toHaveLength(0);
  expect(healthLabel({reminders:false,dismissedUntil:0,verified}, empty.revision, await snapshotHash(empty))).toBe("Changed since backup");
  const restored = await writeSnapshot(db, parseBackup(backup), empty.revision);
  expect(restored.revision).toBe(3);
  expect({...await readSnapshot(db), revision:saved.revision}).toEqual(saved);
  expect(restored.tasks[0]).toMatchObject({ruleId:"read",progressCurrent:2,progressRequired:4});
  expect(restored.budgets[0].expenses[0].cents).toBe(29);
  expect(restored.templates[0].variable).toBe(true);
  expect(restored.shop[0].cooldownHours).toBe(2);
  expect(restored.rewards.reduce((n,r)=>n+r.coins,0)).toBe(50);
  await expect(writeSnapshot(db, saved, saved.revision)).rejects.toThrow("Another tab");
  const clean = await openDatabase(crypto.randomUUID());
  const cleanRestored = await writeSnapshot(clean, parseBackup(backup), 0);
  expect(cleanRestored).toEqual(saved);
  db.close(); clean.close();
});
it("retirement acceptance: corrupted, unsupported, duplicate backups cannot alter storage", async () => {
  const db = await openDatabase(crypto.randomUUID());
  const saved = await writeSnapshot(db, fixture(), 0);
  for (const text of ["{", JSON.stringify({...saved,version:99}), JSON.stringify({...saved,tasks:[saved.tasks[0],saved.tasks[0]]})])
    expect(()=>parseBackup(text)).toThrow();
  await expect(verifySavedBackup(exportBackup(emptySnapshot()),saved)).rejects.toThrow("does not represent");
  expect(await readSnapshot(db)).toEqual(saved);
  db.close();
});
it("retirement acceptance: legacy history stays archival, partial progress and custom rewards stay active", () => {
  const source = fixture().archives[0].raw;
  const imported = previewLegacy(emptySnapshot(),"life-rpg","synthetic",source,"","");
  expect(imported.next.tasks[0].progressCurrent).toBe(2);
  expect(imported.next.shop[0].title).toBe("Synthetic break");
  expect(imported.next.rewards).toHaveLength(1);
  expect(imported.next.rewards[0].coins).toBe(50);
  expect(imported.next.archives[0].raw).toBe(source);
  expect(previewLegacy(imported.next,"life-rpg","synthetic",source,"","").alreadyImported).toBe(true);
});
it("retirement acceptance: backup identity includes data, reminders remain advisory", async () => {
  const a=fixture(), b=fixture(); b.tasks[0].title="Different data, same revision";
  const verified=await verifySavedBackup(exportBackup(a),a);
  expect(healthLabel({reminders:false,dismissedUntil:0},a.revision,await snapshotHash(a))).toBe("No known backup");
  expect(healthLabel({reminders:false,dismissedUntil:0,verified},b.revision,await snapshotHash(b))).toBe("Changed since backup");
  expect(healthLabel({reminders:true,dismissedUntil:0,verified},a.revision,await snapshotHash(a),Date.parse(verified.at)+8*86400000)).toBe("Backup recommended");
});
